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
exports.generateMonthlyInvoices = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const date_fns_1 = require("date-fns");
const email_1 = require("./email");
const logger = __importStar(require("firebase-functions/logger"));
const containerToLiter = (containers) => (containers || 0) * 19.5;
/**
 * A scheduled Cloud Function that runs on the 1st of every month
 * to generate invoices and handle plan changes.
 */
exports.generateMonthlyInvoices = functions.pubsub.schedule('0 0 1 * *').onRun(async (context) => {
    var _a;
    logger.info('Starting monthly invoice generation job.');
    const db = admin.firestore();
    const now = new Date();
    const currentYear = (0, date_fns_1.getYear)(now);
    const currentMonth = (0, date_fns_1.getMonth)(now);
    // Special Case: On Jan 1, 2026, do nothing for fixed-plan users.
    if (currentYear === 2026 && currentMonth === 0) {
        logger.info('Skipping invoice generation for Jan 1, 2026.');
        return null;
    }
    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty)
        return null;
    const promises = [];
    for (const userDoc of usersSnapshot.docs) {
        const userRef = userDoc.ref;
        let user = userDoc.data();
        if (user.role === 'Admin' || user.isPrepaid)
            continue;
        let billingPeriod;
        let billingCycleStart;
        let billingCycleEnd;
        let monthsToBill = 1;
        let isFirstInvoice = !user.lastBilledDate;
        if (currentYear === 2026 && currentMonth === 1) { // February 2026
            if ((_a = user.plan) === null || _a === void 0 ? void 0 : _a.isConsumptionBased) {
                billingCycleStart = new Date(2025, 11, 1);
                billingCycleEnd = new Date(2026, 0, 31, 23, 59, 59);
                billingPeriod = 'December 2025 - January 2026';
                monthsToBill = 2;
            }
            else {
                const dec2025 = new Date(2025, 11, 1);
                billingPeriod = (0, date_fns_1.format)(dec2025, 'MMMM yyyy');
                billingCycleStart = (0, date_fns_1.startOfMonth)(dec2025);
                billingCycleEnd = (0, date_fns_1.endOfMonth)(dec2025);
                monthsToBill = 1;
            }
        }
        else {
            const previousMonth = (0, date_fns_1.subMonths)(now, 1);
            billingPeriod = (0, date_fns_1.format)(previousMonth, 'MMMM yyyy');
            billingCycleStart = (0, date_fns_1.startOfMonth)(previousMonth);
            billingCycleEnd = (0, date_fns_1.endOfMonth)(previousMonth);
        }
        // Handle Pending Plan Activation
        if (user.pendingPlan && user.planChangeEffectiveDate && user.accountType !== 'Branch') {
            const effectiveDate = user.planChangeEffectiveDate.toDate();
            if ((0, date_fns_1.isToday)(effectiveDate)) {
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
    var _a, _b, _c, _d, _e, _f, _g;
    if (!user.plan)
        return;
    const db = admin.firestore();
    const paymentsRef = userRef.collection('payments');
    const batch = db.batch();
    const userUpdatePayload = {};
    let amount = 0;
    let description = '';
    const deliveriesSnapshot = await userRef.collection('deliveries')
        .where('date', '>=', billingCycleStart.toISOString())
        .where('date', '<=', billingCycleEnd.toISOString())
        .get();
    const consumedLiters = deliveriesSnapshot.docs.reduce((sum, doc) => sum + containerToLiter(doc.data().volumeContainers), 0);
    let monthlyEquipmentCost = 0;
    if (((_a = user.customPlanDetails) === null || _a === void 0 ? void 0 : _a.gallonPaymentType) === 'Monthly')
        monthlyEquipmentCost += (((_b = user.customPlanDetails) === null || _b === void 0 ? void 0 : _b.gallonPrice) || 0);
    if (((_c = user.customPlanDetails) === null || _c === void 0 ? void 0 : _c.dispenserPaymentType) === 'Monthly')
        monthlyEquipmentCost += (((_d = user.customPlanDetails) === null || _d === void 0 ? void 0 : _d.dispenserPrice) || 0);
    const equipmentCost = monthlyEquipmentCost * monthsToBill;
    if (user.plan.isConsumptionBased) {
        amount = (consumedLiters * user.plan.price) + equipmentCost;
        description = `Bill for ${billingPeriod}`;
    }
    else {
        amount = user.plan.price + equipmentCost;
        description = `Monthly Subscription for ${billingPeriod}`;
        if (user.accountType !== 'Branch') {
            const monthlyAllocation = (((_e = user.customPlanDetails) === null || _e === void 0 ? void 0 : _e.litersPerMonth) || 0) + (((_f = user.customPlanDetails) === null || _f === void 0 ? void 0 : _f.bonusLiters) || 0);
            const totalAllocation = (monthlyAllocation * monthsToBill) + (((_g = user.customPlanDetails) === null || _g === void 0 ? void 0 : _g.lastMonthRollover) || 0);
            const newRollover = Math.max(0, totalAllocation - consumedLiters);
            userUpdatePayload.totalConsumptionLiters = monthlyAllocation + newRollover;
            userUpdatePayload['customPlanDetails.lastMonthRollover'] = newRollover;
        }
    }
    if (isFirstInvoice && user.customPlanDetails) {
        let oneTimeFee = 0;
        if (user.customPlanDetails.gallonPaymentType === 'One-Time')
            oneTimeFee += user.customPlanDetails.gallonPrice || 0;
        if (user.customPlanDetails.dispenserPaymentType === 'One-Time')
            oneTimeFee += user.customPlanDetails.dispenserPrice || 0;
        if (oneTimeFee > 0) {
            amount += oneTimeFee;
            description += ` + One-Time Fees`;
        }
    }
    const pendingCharges = user.pendingCharges || [];
    const pendingTotal = pendingCharges.reduce((sum, c) => sum + c.amount, 0);
    if (pendingTotal > 0) {
        amount += pendingTotal;
        description += ` + Manual Charges`;
        userUpdatePayload.pendingCharges = admin.firestore.FieldValue.delete();
    }
    if (amount > 0) {
        const invoiceId = `INV-${userRef.id.substring(0, 5)}-${billingPeriod.replace(/\s/g, '-')}`;
        const newInvoice = {
            id: invoiceId,
            date: admin.firestore.FieldValue.serverTimestamp(),
            description: description,
            amount: amount,
            status: user.accountType === 'Branch' ? 'Covered by Parent Account' : 'Upcoming',
            manualCharges: pendingCharges,
        };
        if (user.accountType !== 'Branch' && user.email) {
            const template = (0, email_1.getNewInvoiceTemplate)(user.businessName, invoiceId, amount, billingPeriod);
            (0, email_1.sendEmail)({
                to: user.email,
                subject: template.subject,
                text: `Invoice for ${billingPeriod} is available for ₱${amount.toFixed(2)}.`,
                html: template.html
            }).catch(e => logger.error("Email failed", e));
        }
        batch.set(paymentsRef.doc(invoiceId), newInvoice, { merge: true });
        userUpdatePayload.lastBilledDate = admin.firestore.FieldValue.serverTimestamp();
    }
    if (Object.keys(userUpdatePayload).length > 0)
        batch.update(userRef, userUpdatePayload);
    return batch.commit();
}
//# sourceMappingURL=billing.js.map