import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { sendEmail, getNewInvoiceTemplate } from './email';
import * as logger from 'firebase-functions/logger';
import type { ManualCharge, Delivery, SanitationVisit, ComplianceReport } from './types';
import { generateSOAPDF } from './index';
import { getDb, withDatabase } from './function-runtime';
import {
    BILLING_CRON,
    MANILA_TIME_ZONE,
    InvoiceForReconcile,
    ReconcileResult,
    ChargeLike,
    applyPendingCharges,
    billingSignature,
    billingWindowForRun,
    consumptionCharge,
    DEFAULT_CARRYOVER_CUTOFF,
    deliveryInstant,
    deliveryLiters,
    equipmentMonthly,
    groupInvoicesByPeriod,
    invoiceCoversMonth,
    invoiceDocId,
    isSameManilaDay,
    labelForPeriodKey,
    manilaParts,
    oneTimeEquipment,
    periodStartsOnOrAfter,
    rangeForPeriodKey,
    reconcileInvoiceGroup,
    roundMoney,
    sumCharges,
} from './billing-period';

/**
 * Determines the CC list based on the client ID.
 * Client SC2500000001 (NEW BIG 4 J) gets specialized CC.
 */
function getCCList(clientId?: string): string | string[] {
    if (clientId === 'SC2500000001') {
        return ['cavatan.jheck@gmail.com'];
    }
    return [];
}

/**
 * Determines the BCC list. Admin team is always BCC'd for privacy.
 */
function getBCCList(): string[] {
    return ['support@riverph.com', 'jayvee@riverph.com', 'jimboy@riverph.com'];
}

/**
 * Scheduled on the 1st of each month at 00:00 Asia/Manila.
 * Cloud Functions would otherwise treat the cron as America/Los_Angeles,
 * and a Manila midnight on the 1st is still the previous UTC day.
 */
export const generateMonthlyInvoices = functions.runWith({
    secrets: ['BREVO_API_KEY'],
}).pubsub.schedule(BILLING_CRON).timeZone(MANILA_TIME_ZONE).onRun(async () => {
    logger.info('Starting monthly invoice generation job (Asia/Manila).');
    const db = getDb();

    const now = new Date();
    const window = billingWindowForRun(now);

    // Special Case: On Jan 1, 2026, do nothing for fixed-plan users.
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

        const billingPeriod = window.billingPeriod;
        const billingCycleStart = window.start;
        const billingCycleEnd = window.end;
        const monthsToBill = window.monthsToBill;
        const isFirstInvoice = !user.lastBilledDate;

        // Handle Pending Plan Activation on the Manila calendar day the job runs.
        if (user.pendingPlan && user.planChangeEffectiveDate && user.accountType !== 'Branch') {
            const effectiveDate = user.planChangeEffectiveDate.toDate();
            if (isSameManilaDay(effectiveDate, now)) {
                promises.push(generateInvoiceForUser(user, userRef, billingPeriod, billingCycleStart, billingCycleEnd, monthsToBill, isFirstInvoice)
                    .then(() => userRef.update({
                        plan: user.pendingPlan,
                        isPrepaid: user.pendingPlan.isPrepaid || false,
                        pendingPlan: admin.firestore.FieldValue.delete(),
                        planChangeEffectiveDate: admin.firestore.FieldValue.delete(),
                    })));
                continue;
            }
        }

        promises.push(generateInvoiceForUser(user, userRef, billingPeriod, billingCycleStart, billingCycleEnd, monthsToBill, isFirstInvoice));
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
    const db = getDb();

    const paymentsRef = userRef.collection('payments');
    const batch = db.batch();
    const userUpdatePayload: {[key: string]: admin.firestore.FieldValue | string | number | boolean} = {};

    // One Manila month (or the Dec 2025–Jan 2026 combined window). Not the customer's full history.
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
        consumptionAmount = 0;
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
            description: description,
            amount: amount,
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

        const targetEmails = user.notificationEmails?.length > 0 ? user.notificationEmails : [user.email];

        if (user.accountType !== 'Branch' && targetEmails.length > 0) {
            const sanitationSnap = await userRef.collection('sanitationVisits')
                .where('scheduledDate', '>=', billingCycleStart.toISOString())
                .where('scheduledDate', '<=', billingCycleEnd.toISOString())
                .get();
            const sanitation = sanitationSnap.docs.map(d => d.data() as SanitationVisit);

            let compliance: ComplianceReport[] = [];
            if (user.assignedWaterStationId) {
                const compSnap = await db.collection('waterStations').doc(user.assignedWaterStationId).collection('complianceReports').limit(5).get();
                compliance = compSnap.docs.map(d => d.data() as ComplianceReport);
            }

            const pdfBuffer = await generateSOAPDF(user, billingPeriod, deliveries, sanitation, compliance);
            const template = getNewInvoiceTemplate(user.businessName, invoiceId, amount, billingPeriod);

            const ccList = getCCList(user.clientId);
            const bccList = getBCCList();

            sendEmail({
                to: targetEmails,
                cc: ccList,
                bcc: bccList,
                subject: template.subject,
                text: `Invoice for ${billingPeriod} is available for ₱${amount.toFixed(2)}.`,
                html: template.html,
                attachments: [{
                    filename: `SOA_${user.businessName.replace(/\s/g, '_')}_${billingPeriod.replace(/\s/g, '-')}.pdf`,
                    content: pdfBuffer,
                }],
            }).catch(e => logger.error('Email failed', e));
        }

        batch.set(paymentsRef.doc(invoiceId), newInvoice, { merge: true });
        userUpdatePayload.lastBilledDate = admin.firestore.FieldValue.serverTimestamp();
    }

    if (Object.keys(userUpdatePayload).length > 0) batch.update(userRef, userUpdatePayload);
    return batch.commit();
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
        logger.info(`Updated unpaid invoice ${invoiceRef.id} to ${result.amount} after a late delivery.`);
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
    if (result.removePendingChargeId) {
        next = next.filter((charge) => charge.id !== result.removePendingChargeId);
    }
    if (result.pendingCharge) {
        next = next.filter((charge) => charge.id !== result.pendingCharge?.id);
        next.push({ ...result.pendingCharge, dateAdded: new Date().toISOString() });
    }
    const same = JSON.stringify(existing) === JSON.stringify(next);
    if (!same) {
        if (next.length === 0) {
            tx.update(userRef, { pendingCharges: admin.firestore.FieldValue.delete() });
        } else {
            tx.update(userRef, { pendingCharges: next });
        }
        logger.info(`Recorded carry-over on paid invoice ${invoiceRef.id}; amount left unchanged.`);
    }
}

/**
 * Late deliveries: recompute only the Manila month on the delivery that was saved.
 * Several invoices for that period (early payment, ₱0 stub, the real bill) are one comparison.
 * Carry-overs are not created for periods before BILLING_CARRYOVER_CUTOFF (default 2026-06).
 * The backfill script is the explicit path for older months.
 */
async function reconcileDeliveryMonth(userId: string, year: number, monthIndex: number): Promise<void> {
    const nowParts = manilaParts(new Date());
    const isCurrentOrFuture = year > nowParts.year || (year === nowParts.year && monthIndex >= nowParts.monthIndex);
    if (isCurrentOrFuture) return;

    const cutoff = (process.env.BILLING_CARRYOVER_CUTOFF || DEFAULT_CARRYOVER_CUTOFF).trim() || DEFAULT_CARRYOVER_CUTOFF;
    const db = getDb();
    const userRef = db.collection('users').doc(userId);

    await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const user = userSnap.data();
        if (!user?.plan?.isConsumptionBased || user.isPrepaid || user.role === 'Admin') return;

        const paymentsSnap = await tx.get(userRef.collection('payments'));
        const invoices = paymentsSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as InvoiceForReconcile))
            .filter((invoice) => invoice.id.startsWith('INV-') && !invoice.id.startsWith('INV-EST') && invoiceCoversMonth(invoice, year, monthIndex));
        const groups = groupInvoicesByPeriod(invoices);
        const plans: { invoiceId: string; result: ReconcileResult }[] = [];

        for (const group of groups) {
            const range = rangeForPeriodKey(group.periodKey);
            if (!range) continue;
            const deliveriesSnap = await tx.get(userRef.collection('deliveries')
                .where('date', '>=', range.start.toISOString())
                .where('date', '<=', range.end.toISOString()));
            const plan = reconcileInvoiceGroup({
                invoices: group.invoices,
                deliveries: deliveriesSnap.docs.map((doc) => doc.data() as Delivery),
                billingPeriod: labelForPeriodKey(group.periodKey),
                allowCarryOver: periodStartsOnOrAfter(group.periodKey, cutoff),
            });
            if (plan.action === 'skip' || plan.result.type === 'skip' || !plan.targetInvoiceId) continue;
            plans.push({ invoiceId: plan.targetInvoiceId, result: plan.result });
        }

        for (const plan of plans) {
            applyReconcileResult(tx, userRef.collection('payments').doc(plan.invoiceId), userRef, user, plan.result);
        }
    });
}

export const syncDeliveryBilling = onDocumentWritten(withDatabase({
    document: 'users/{userId}/deliveries/{deliveryId}',
}), async (event) => {
    const beforeRaw = event.data?.before.exists ? event.data.before.data() as Delivery : undefined;
    const afterRaw = event.data?.after.exists ? event.data.after.data() as Delivery : undefined;
    if (billingSignature(beforeRaw) === billingSignature(afterRaw)) return;

    const months = new Set<string>();
    for (const delivery of [beforeRaw, afterRaw]) {
        const instant = deliveryInstant(delivery?.date);
        if (!instant) continue;
        const parts = manilaParts(instant);
        months.add(`${parts.year}-${parts.monthIndex}`);
    }

    const userId = event.params.userId;
    for (const key of months) {
        const [year, monthIndex] = key.split('-').map(Number);
        await reconcileDeliveryMonth(userId, year, monthIndex);
    }
});
