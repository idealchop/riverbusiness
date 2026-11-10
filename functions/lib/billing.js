"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDeliveryBilling = exports.generateMonthlyInvoices = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const email_1 = require("./email");
const logger = __importStar(require("firebase-functions/logger"));
const index_1 = require("./index");
const function_runtime_1 = require("./function-runtime");
const billing_period_1 = require("./billing-period");
/**
 * Determines the CC list based on the client ID.
 * Client SC2500000001 (NEW BIG 4 J) gets specialized CC.
 */
function getCCList(clientId) {
    if (clientId === 'SC2500000001') {
        return ['cavatan.jheck@gmail.com'];
    }
    return [];
}
/**
 * Determines the BCC list. Admin team is always BCC'd for privacy.
 */
function getBCCList() {
    return ['support@riverph.com', 'jayvee@riverph.com', 'jimboy@riverph.com'];
}
/**
 * Scheduled on the 1st of each month at 00:00 Asia/Manila.
 * Cloud Functions would otherwise treat the cron as America/Los_Angeles,
 * and a Manila midnight on the 1st is still the previous UTC day.
 */
exports.generateMonthlyInvoices = functions.runWith({
    secrets: ['BREVO_API_KEY'],
}).pubsub.schedule(billing_period_1.BILLING_CRON).timeZone(billing_period_1.MANILA_TIME_ZONE).onRun(async () => {
    logger.info('Starting monthly invoice generation job (Asia/Manila).');
    const db = (0, function_runtime_1.getDb)();
    const now = new Date();
    const window = (0, billing_period_1.billingWindowForRun)(now);
    // Special Case: On Jan 1, 2026, do nothing for fixed-plan users.
    if (window.skip) {
        logger.info('Skipping invoice generation for Jan 1, 2026.');
        return null;
    }
    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty)
        return null;
    const promises = [];
    for (const userDoc of usersSnapshot.docs) {
        const userRef = userDoc.ref;
        const user = userDoc.data();
        if (user.role === 'Admin' || user.isPrepaid)
            continue;
        const billingPeriod = window.billingPeriod;
        const billingCycleStart = window.start;
        const billingCycleEnd = window.end;
        const monthsToBill = window.monthsToBill;
        const isFirstInvoice = !user.lastBilledDate;
        // Handle Pending Plan Activation on the Manila calendar day the job runs.
        if (user.pendingPlan && user.planChangeEffectiveDate && user.accountType !== 'Branch') {
            const effectiveDate = user.planChangeEffectiveDate.toDate();
            if ((0, billing_period_1.isSameManilaDay)(effectiveDate, now)) {
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
async function generateInvoiceForUser(user, userRef, billingPeriod, billingCycleStart, billingCycleEnd, monthsToBill = 1, isFirstInvoice) {
    var _a, _b, _c, _d;
    if (!user.plan)
        return;
    const db = (0, function_runtime_1.getDb)();
    const paymentsRef = userRef.collection('payments');
    const batch = db.batch();
    const userUpdatePayload = {};
    // One Manila month (or the Dec 2025–Jan 2026 combined window). Not the customer's full history.
    const deliveriesSnapshot = await userRef.collection('deliveries')
        .where('date', '>=', billingCycleStart.toISOString())
        .where('date', '<=', billingCycleEnd.toISOString())
        .get();
    const deliveries = deliveriesSnapshot.docs.map(d => d.data());
    const consumedLiters = deliveries.reduce((sum, d) => sum + (0, billing_period_1.deliveryLiters)(d), 0);
    const equipmentCost = (0, billing_period_1.roundMoney)((0, billing_period_1.equipmentMonthly)(user.customPlanDetails) * monthsToBill);
    let oneTimeFee = 0;
    if (isFirstInvoice)
        oneTimeFee = (0, billing_period_1.roundMoney)((0, billing_period_1.oneTimeEquipment)(user.customPlanDetails));
    let amount = 0;
    let description = '';
    let consumptionAmount = 0;
    if (user.plan.isConsumptionBased) {
        consumptionAmount = (0, billing_period_1.consumptionCharge)(deliveries, user.plan.price || 0);
        amount = (0, billing_period_1.roundMoney)(consumptionAmount + equipmentCost + oneTimeFee);
        description = `Bill for ${billingPeriod}`;
    }
    else {
        consumptionAmount = 0;
        amount = (0, billing_period_1.roundMoney)((user.plan.price * monthsToBill) + equipmentCost + oneTimeFee);
        description = `Monthly Subscription for ${billingPeriod}`;
        if (user.accountType !== 'Branch') {
            const monthlyAllocation = (((_a = user.customPlanDetails) === null || _a === void 0 ? void 0 : _a.litersPerMonth) || 0) + (((_b = user.customPlanDetails) === null || _b === void 0 ? void 0 : _b.bonusLiters) || 0);
            const totalAllocation = (monthlyAllocation * monthsToBill) + (((_c = user.customPlanDetails) === null || _c === void 0 ? void 0 : _c.lastMonthRollover) || 0);
            const newRollover = Math.max(0, totalAllocation - consumedLiters);
            userUpdatePayload.totalConsumptionLiters = monthlyAllocation + newRollover;
            userUpdatePayload['customPlanDetails.lastMonthRollover'] = newRollover;
        }
    }
    if (oneTimeFee > 0)
        description += ' + One-Time Fees';
    const pendingCharges = user.pendingCharges || [];
    const applied = (0, billing_period_1.applyPendingCharges)(amount, description, pendingCharges);
    amount = applied.amount;
    description = applied.description;
    if (applied.clearPending) {
        userUpdatePayload.pendingCharges = admin.firestore.FieldValue.delete();
        for (const charge of pendingCharges) {
            const carry = charge;
            if (carry.kind === 'carryover' && carry.invoiceId) {
                batch.set(paymentsRef.doc(carry.invoiceId), { carryOverConsumed: true }, { merge: true });
            }
        }
    }
    if (amount > 0) {
        const invoiceId = (0, billing_period_1.invoiceDocId)(userRef.id, billingPeriod);
        const nonConsumptionAmount = (0, billing_period_1.roundMoney)((user.plan.isConsumptionBased ? 0 : (user.plan.price * monthsToBill)) + equipmentCost + oneTimeFee + (0, billing_period_1.sumCharges)(pendingCharges));
        const newInvoice = Object.assign(Object.assign({ id: invoiceId, date: admin.firestore.FieldValue.serverTimestamp(), description: description, amount: amount, status: user.accountType === 'Branch' ? 'Covered by Parent Account' : 'Upcoming' }, (applied.manualCharges.length > 0 ? { manualCharges: applied.manualCharges } : {})), { billingPeriod, billingTimeZone: billing_period_1.MANILA_TIME_ZONE, consumptionAmount: user.plan.isConsumptionBased ? consumptionAmount : 0, nonConsumptionAmount, equipmentAmount: equipmentCost, oneTimeFees: oneTimeFee, adjustmentsTotal: (0, billing_period_1.sumCharges)(pendingCharges) });
        const targetEmails = ((_d = user.notificationEmails) === null || _d === void 0 ? void 0 : _d.length) > 0 ? user.notificationEmails : [user.email];
        if (user.accountType !== 'Branch' && targetEmails.length > 0) {
            const sanitationSnap = await userRef.collection('sanitationVisits')
                .where('scheduledDate', '>=', billingCycleStart.toISOString())
                .where('scheduledDate', '<=', billingCycleEnd.toISOString())
                .get();
            const sanitation = sanitationSnap.docs.map(d => d.data());
            let compliance = [];
            if (user.assignedWaterStationId) {
                const compSnap = await db.collection('waterStations').doc(user.assignedWaterStationId).collection('complianceReports').limit(5).get();
                compliance = compSnap.docs.map(d => d.data());
            }
            const pdfBuffer = await (0, index_1.generateSOAPDF)(user, billingPeriod, deliveries, sanitation, compliance);
            const template = (0, email_1.getNewInvoiceTemplate)(user.businessName, invoiceId, amount, billingPeriod);
            const ccList = getCCList(user.clientId);
            const bccList = getBCCList();
            (0, email_1.sendEmail)({
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
    if (Object.keys(userUpdatePayload).length > 0)
        batch.update(userRef, userUpdatePayload);
    return batch.commit();
}
function applyReconcileResult(tx, invoiceRef, userRef, user, result) {
    if (result.type === 'skip')
        return;
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
    const existing = Array.isArray(user.pendingCharges) ? user.pendingCharges : [];
    let next = existing.slice();
    if (result.removePendingChargeId) {
        next = next.filter((charge) => charge.id !== result.removePendingChargeId);
    }
    if (result.pendingCharge) {
        next = next.filter((charge) => { var _a; return charge.id !== ((_a = result.pendingCharge) === null || _a === void 0 ? void 0 : _a.id); });
        next.push(Object.assign(Object.assign({}, result.pendingCharge), { dateAdded: new Date().toISOString() }));
    }
    const same = JSON.stringify(existing) === JSON.stringify(next);
    if (!same) {
        if (next.length === 0) {
            tx.update(userRef, { pendingCharges: admin.firestore.FieldValue.delete() });
        }
        else {
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
async function reconcileDeliveryMonth(userId, year, monthIndex) {
    const nowParts = (0, billing_period_1.manilaParts)(new Date());
    const isCurrentOrFuture = year > nowParts.year || (year === nowParts.year && monthIndex >= nowParts.monthIndex);
    if (isCurrentOrFuture)
        return;
    const cutoff = (process.env.BILLING_CARRYOVER_CUTOFF || billing_period_1.DEFAULT_CARRYOVER_CUTOFF).trim() || billing_period_1.DEFAULT_CARRYOVER_CUTOFF;
    const db = (0, function_runtime_1.getDb)();
    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async (tx) => {
        var _a;
        const userSnap = await tx.get(userRef);
        const user = userSnap.data();
        if (!((_a = user === null || user === void 0 ? void 0 : user.plan) === null || _a === void 0 ? void 0 : _a.isConsumptionBased) || user.isPrepaid || user.role === 'Admin')
            return;
        const paymentsSnap = await tx.get(userRef.collection('payments'));
        const invoices = paymentsSnap.docs
            .map((doc) => (Object.assign({ id: doc.id }, doc.data())))
            .filter((invoice) => invoice.id.startsWith('INV-') && !invoice.id.startsWith('INV-EST') && (0, billing_period_1.invoiceCoversMonth)(invoice, year, monthIndex));
        const groups = (0, billing_period_1.groupInvoicesByPeriod)(invoices);
        const plans = [];
        for (const group of groups) {
            const range = (0, billing_period_1.rangeForPeriodKey)(group.periodKey);
            if (!range)
                continue;
            const deliveriesSnap = await tx.get(userRef.collection('deliveries')
                .where('date', '>=', range.start.toISOString())
                .where('date', '<=', range.end.toISOString()));
            const plan = (0, billing_period_1.reconcileInvoiceGroup)({
                invoices: group.invoices,
                deliveries: deliveriesSnap.docs.map((doc) => doc.data()),
                billingPeriod: (0, billing_period_1.labelForPeriodKey)(group.periodKey),
                allowCarryOver: (0, billing_period_1.periodStartsOnOrAfter)(group.periodKey, cutoff),
            });
            if (plan.action === 'skip' || plan.result.type === 'skip' || !plan.targetInvoiceId)
                continue;
            plans.push({ invoiceId: plan.targetInvoiceId, result: plan.result });
        }
        for (const plan of plans) {
            applyReconcileResult(tx, userRef.collection('payments').doc(plan.invoiceId), userRef, user, plan.result);
        }
    });
}
exports.syncDeliveryBilling = (0, firestore_1.onDocumentWritten)((0, function_runtime_1.withDatabase)({
    document: 'users/{userId}/deliveries/{deliveryId}',
}), async (event) => {
    var _a, _b;
    const beforeRaw = ((_a = event.data) === null || _a === void 0 ? void 0 : _a.before.exists) ? event.data.before.data() : undefined;
    const afterRaw = ((_b = event.data) === null || _b === void 0 ? void 0 : _b.after.exists) ? event.data.after.data() : undefined;
    if ((0, billing_period_1.billingSignature)(beforeRaw) === (0, billing_period_1.billingSignature)(afterRaw))
        return;
    const months = new Set();
    for (const delivery of [beforeRaw, afterRaw]) {
        const instant = (0, billing_period_1.deliveryInstant)(delivery === null || delivery === void 0 ? void 0 : delivery.date);
        if (!instant)
            continue;
        const parts = (0, billing_period_1.manilaParts)(instant);
        months.add(`${parts.year}-${parts.monthIndex}`);
    }
    const userId = event.params.userId;
    for (const key of months) {
        const [year, monthIndex] = key.split('-').map(Number);
        await reconcileDeliveryMonth(userId, year, monthIndex);
    }
});
//# sourceMappingURL=billing.js.map