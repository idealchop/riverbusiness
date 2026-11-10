import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail, getNewInvoiceTemplate } from './email';
import * as logger from 'firebase-functions/logger';
import type { ManualCharge, Delivery } from './types';
import {
    BILLING_CRON,
    MANILA_TIME_ZONE,
    FeeSnapshot,
    InvoiceForReconcile,
    ReconcileResult,
    ChargeLike,
    applyPendingCharges,
    billingSignature,
    billingWindowForRun,
    candidateInvoiceIds,
    consumptionCharge,
    deliveryInstant,
    deliveryLiters,
    equipmentMonthly,
    invoiceDocId,
    isSameManilaDay,
    manilaParts,
    oneTimeEquipment,
    reconcileMonthInvoice,
    roundMoney,
    sumCharges,
    windowForInvoice,
} from '../../lib/billing-period';

/**
 * Not deployed. firebase.json publishes the `functions/` package.
 * This copy stays on the same Manila-month rules as functions/src/billing.ts.
 * The shared decision logic lives in src/lib/billing-period.ts (identical to functions/src/billing-period.ts).
 */
export const generateMonthlyInvoices = functions.pubsub
    .schedule(BILLING_CRON)
    .timeZone(MANILA_TIME_ZONE)
    .onRun(async () => {
        logger.info('Starting monthly invoice generation job (Asia/Manila).');
        const db = admin.firestore();

        const now = new Date();
        const window = billingWindowForRun(now);
        if (window.skip) {
            logger.info('Skipping invoice generation for Jan 1, 2026.');
            return null;
        }

        const usersSnapshot = await db.collection('users').get();
        if (usersSnapshot.empty) return null;

        const promises: Promise<unknown>[] = [];

        for (const userDoc of usersSnapshot.docs) {
            const userRef = userDoc.ref;
            const user = userDoc.data();
            if (user.role === 'Admin' || user.isPrepaid) continue;

            const isFirstInvoice = !user.lastBilledDate;
            if (user.pendingPlan && user.planChangeEffectiveDate && user.accountType !== 'Branch') {
                const effectiveDate = user.planChangeEffectiveDate.toDate();
                if (isSameManilaDay(effectiveDate, now)) {
                    promises.push(generateInvoiceForUser(user, userRef, window.billingPeriod, window.start, window.end, window.monthsToBill, isFirstInvoice)
                        .then(() => userRef.update({
                            plan: user.pendingPlan,
                            isPrepaid: user.pendingPlan.isPrepaid || false,
                            pendingPlan: admin.firestore.FieldValue.delete(),
                            planChangeEffectiveDate: admin.firestore.FieldValue.delete(),
                        })));
                    continue;
                }
            }

            promises.push(generateInvoiceForUser(user, userRef, window.billingPeriod, window.start, window.end, window.monthsToBill, isFirstInvoice));
        }

        await Promise.all(promises);
        return null;
    });

async function generateInvoiceForUser(
    user: admin.firestore.DocumentData,
    userRef: admin.firestore.DocumentReference,
    billingPeriod: string,
    billingCycleStart: Date,
    billingCycleEnd: Date,
    monthsToBill: number = 1,
    isFirstInvoice: boolean,
) {
    if (!user.plan) return;
    const db = admin.firestore();

    const paymentsRef = userRef.collection('payments');
    const batch = db.batch();
    const userUpdatePayload: {[key: string]: admin.firestore.FieldValue | string | number | boolean} = {};

    const deliveriesSnapshot = await userRef.collection('deliveries')
        .where('date', '>=', billingCycleStart.toISOString())
        .where('date', '<=', billingCycleEnd.toISOString())
        .get();
    const deliveries = deliveriesSnapshot.docs.map(d => d.data() as Delivery);
    const consumedLiters = deliveries.reduce((sum, d) => sum + deliveryLiters(d), 0);

    const equipmentCost = roundMoney(equipmentMonthly(user.customPlanDetails) * monthsToBill);
    let oneTimeFee = 0;
    if (isFirstInvoice) oneTimeFee = roundMoney(oneTimeEquipment(user.customPlanDetails));

    let amount = 0;
    let description = '';
    let consumptionAmount = 0;

    if (user.plan.isConsumptionBased) {
        consumptionAmount = consumptionCharge(deliveries, user.plan.price || 0);
        amount = roundMoney(consumptionAmount + equipmentCost + oneTimeFee);
        description = `Bill for ${billingPeriod}`;
    } else {
        amount = roundMoney((user.plan.price * monthsToBill) + equipmentCost + oneTimeFee);
        description = `Monthly Subscription for ${billingPeriod}`;
        if (user.accountType !== 'Branch') {
            const monthlyAllocation = (user.customPlanDetails?.litersPerMonth || 0) + (user.customPlanDetails?.bonusLiters || 0);
            const totalAllocation = (monthlyAllocation * monthsToBill) + (user.customPlanDetails?.lastMonthRollover || 0);
            const newRollover = Math.max(0, totalAllocation - consumedLiters);
            userUpdatePayload.totalConsumptionLiters = monthlyAllocation + newRollover;
            userUpdatePayload['customPlanDetails.lastMonthRollover'] = newRollover;
        }
    }

    if (oneTimeFee > 0) description += ' + One-Time Fees';

    const pendingCharges: ManualCharge[] = user.pendingCharges || [];
    const applied = applyPendingCharges(amount, description, pendingCharges);
    amount = applied.amount;
    description = applied.description;

    if (applied.clearPending) {
        userUpdatePayload.pendingCharges = admin.firestore.FieldValue.delete();
        for (const charge of pendingCharges) {
            const carry = charge as ManualCharge & { kind?: string; invoiceId?: string };
            if (carry.kind === 'carryover' && carry.invoiceId) {
                batch.set(paymentsRef.doc(carry.invoiceId), { carryOverConsumed: true }, { merge: true });
            }
        }
    }

    if (amount > 0) {
        const invoiceId = invoiceDocId(userRef.id, billingPeriod);
        const nonConsumptionAmount = roundMoney(
            (user.plan.isConsumptionBased ? 0 : (user.plan.price * monthsToBill)) + equipmentCost + oneTimeFee + sumCharges(pendingCharges),
        );
        const newInvoice = {
            id: invoiceId,
            date: admin.firestore.FieldValue.serverTimestamp(),
            description,
            amount,
            status: user.accountType === 'Branch' ? 'Covered by Parent Account' : 'Upcoming',
            ...(applied.manualCharges.length > 0 ? { manualCharges: applied.manualCharges } : {}),
            billingPeriod,
            billingTimeZone: MANILA_TIME_ZONE,
            consumptionAmount: user.plan.isConsumptionBased ? consumptionAmount : 0,
            nonConsumptionAmount,
            equipmentAmount: equipmentCost,
            oneTimeFees: oneTimeFee,
            adjustmentsTotal: sumCharges(pendingCharges),
        };

        if (user.accountType !== 'Branch' && user.email) {
            const template = getNewInvoiceTemplate(user.businessName, invoiceId, amount, billingPeriod);
            sendEmail({
                to: user.email,
                subject: template.subject,
                text: `Invoice for ${billingPeriod} is available for ₱${amount.toFixed(2)}.`,
                html: template.html,
            }).catch(e => logger.error('Email failed', e));
        }

        batch.set(paymentsRef.doc(invoiceId), newInvoice, { merge: true });
        userUpdatePayload.lastBilledDate = admin.firestore.FieldValue.serverTimestamp();
    }

    if (Object.keys(userUpdatePayload).length > 0) batch.update(userRef, userUpdatePayload);
    return batch.commit();
}

function feesForInvoice(user: admin.firestore.DocumentData, monthsToBill: number): FeeSnapshot {
    return {
        equipment: roundMoney(equipmentMonthly(user.customPlanDetails) * monthsToBill),
        oneTime: roundMoney(oneTimeEquipment(user.customPlanDetails)),
    };
}

function applyReconcileResult(
    tx: admin.firestore.Transaction,
    invoiceRef: admin.firestore.DocumentReference,
    userRef: admin.firestore.DocumentReference,
    user: admin.firestore.DocumentData,
    result: ReconcileResult,
) {
    if (result.type === 'skip') return;

    if (result.type === 'update-unpaid') {
        tx.update(invoiceRef, {
            amount: result.amount,
            consumptionAmount: result.consumptionAmount,
            nonConsumptionAmount: result.nonConsumptionAmount,
            lateDeliveryAdjustedAt: admin.firestore.FieldValue.serverTimestamp(),
            billingFlag: result.billingFlag ? result.billingFlag : admin.firestore.FieldValue.delete(),
        });
        return;
    }

    tx.update(invoiceRef, {
        unbilledAmount: result.unbilledAmount,
        carryOverAmount: result.carryOverAmount,
        lateDeliveryAdjustedAt: admin.firestore.FieldValue.serverTimestamp(),
        billingFlag: result.billingFlag ? result.billingFlag : admin.firestore.FieldValue.delete(),
        carryOverChargeId: result.carryOverChargeId ? result.carryOverChargeId : admin.firestore.FieldValue.delete(),
    });

    const existing: ChargeLike[] = Array.isArray(user.pendingCharges) ? user.pendingCharges : [];
    let next = existing.slice();
    if (result.removePendingChargeId) next = next.filter((charge) => charge.id !== result.removePendingChargeId);
    if (result.pendingCharge) {
        next = next.filter((charge) => charge.id !== result.pendingCharge?.id);
        next.push({ ...result.pendingCharge, dateAdded: new Date().toISOString() });
    }
    if (JSON.stringify(existing) !== JSON.stringify(next)) {
        tx.update(userRef, next.length === 0
            ? { pendingCharges: admin.firestore.FieldValue.delete() }
            : { pendingCharges: next });
    }
}

async function reconcileDeliveryMonth(userId: string, year: number, monthIndex: number): Promise<void> {
    const nowParts = manilaParts(new Date());
    const isCurrentOrFuture = year > nowParts.year || (year === nowParts.year && monthIndex >= nowParts.monthIndex);
    if (isCurrentOrFuture) return;

    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);

    for (const invoiceId of candidateInvoiceIds(userId, year, monthIndex)) {
        const invoiceRef = userRef.collection('payments').doc(invoiceId);
        await db.runTransaction(async (tx) => {
            const invoiceSnap = await tx.get(invoiceRef);
            if (!invoiceSnap.exists) return;
            const userSnap = await tx.get(userRef);
            const user = userSnap.data();
            if (!user?.plan?.isConsumptionBased || user.isPrepaid || user.role === 'Admin') return;

            const invoice = { id: invoiceId, ...invoiceSnap.data() } as InvoiceForReconcile;
            const window = windowForInvoice(invoice, year, monthIndex);
            const deliveriesSnap = await tx.get(userRef.collection('deliveries')
                .where('date', '>=', window.start.toISOString())
                .where('date', '<=', window.end.toISOString()));
            const result = reconcileMonthInvoice({
                invoice,
                deliveries: deliveriesSnap.docs.map((doc) => doc.data() as Delivery),
                pricePerLiter: user.plan.price || 0,
                billingPeriod: window.billingPeriod,
                fees: feesForInvoice(user, window.monthsToBill),
            });
            applyReconcileResult(tx, invoiceRef, userRef, user, result);
        });
    }
}

export const syncDeliveryBilling = functions.firestore
    .document('users/{userId}/deliveries/{deliveryId}')
    .onWrite(async (change, context) => {
        const beforeRaw = change.before.exists ? change.before.data() as Delivery : undefined;
        const afterRaw = change.after.exists ? change.after.data() as Delivery : undefined;
        if (billingSignature(beforeRaw) === billingSignature(afterRaw)) return;

        const months = new Set<string>();
        for (const delivery of [beforeRaw, afterRaw]) {
            const instant = deliveryInstant(delivery?.date);
            if (!instant) continue;
            const parts = manilaParts(instant);
            months.add(`${parts.year}-${parts.monthIndex}`);
        }
        for (const key of months) {
            const [year, monthIndex] = key.split('-').map(Number);
            await reconcileDeliveryMonth(context.params.userId, year, monthIndex);
        }
    });
