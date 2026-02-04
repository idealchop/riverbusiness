import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format, subMonths, startOfMonth, endOfMonth, isToday, getYear, getMonth } from 'date-fns';
import { sendEmail, getNewInvoiceTemplate } from './email';
import * as logger from 'firebase-functions/logger';
import type { ManualCharge, Delivery, SanitationVisit, ComplianceReport } from './types'; 
import { generatePasswordProtectedSOA } from './index';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

/**
 * A scheduled Cloud Function that runs on the 1st of every month
 * to generate invoices and handle plan changes.
 */
export const generateMonthlyInvoices = functions.pubsub.schedule('0 0 1 * *').onRun(async (context) => {
    logger.info('Starting monthly invoice generation job.');
    const db = admin.firestore();
    
    const now = new Date();
    const currentYear = getYear(now);
    const currentMonth = getMonth(now);

    // Special Case: On Jan 1, 2026, do nothing for fixed-plan users.
    if (currentYear === 2026 && currentMonth === 0) {
        logger.info('Skipping invoice generation for Jan 1, 2026.');
        return null;
    }

    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty) return null;

    const promises: Promise<any>[] = [];

    for (const userDoc of usersSnapshot.docs) {
        const userRef = userDoc.ref;
        let user = userDoc.data();
        
        if (user.role === 'Admin' || user.isPrepaid) continue;

        let billingPeriod: string;
        let billingCycleStart: Date;
        let billingCycleEnd: Date;
        let monthsToBill = 1;
        let isFirstInvoice = !user.lastBilledDate;

        if (currentYear === 2026 && currentMonth === 1) { // February 2026
            if (user.plan?.isConsumptionBased) {
                billingCycleStart = new Date(2025, 11, 1);
                billingCycleEnd = new Date(2026, 0, 31, 23, 59, 59);
                billingPeriod = 'December 2025 - January 2026';
                monthsToBill = 2;
            } else {
                const dec2025 = new Date(2025, 11, 1);
                billingPeriod = format(dec2025, 'MMMM yyyy');
                billingCycleStart = startOfMonth(dec2025);
                billingCycleEnd = endOfMonth(dec2025);
                monthsToBill = 1; 
            }
        } else {
            const previousMonth = subMonths(now, 1);
            billingPeriod = format(previousMonth, 'MMMM yyyy');
            billingCycleStart = startOfMonth(previousMonth);
            billingCycleEnd = endOfMonth(previousMonth);
        }

        // Handle Pending Plan Activation
        if (user.pendingPlan && user.planChangeEffectiveDate && user.accountType !== 'Branch') {
            const effectiveDate = user.planChangeEffectiveDate.toDate();
            if (isToday(effectiveDate)) {
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
    isFirstInvoice: boolean
) {
    if (!user.plan) return;
    const db = admin.firestore();

    const paymentsRef = userRef.collection('payments');
    const batch = db.batch();
    const userUpdatePayload: {[key: string]: any} = {};

    let amount = 0;
    let description = '';

    const deliveriesSnapshot = await userRef.collection('deliveries')
        .where('date', '>=', billingCycleStart.toISOString())
        .where('date', '<=', billingCycleEnd.toISOString())
        .get();
    const deliveries = deliveriesSnapshot.docs.map(d => d.data() as Delivery);

    const consumedLiters = deliveries.reduce((sum, d) => sum + (d.liters || containerToLiter(d.volumeContainers)), 0);
    
    let monthlyEquipmentCost = 0;
    if (user.customPlanDetails?.gallonPaymentType === 'Monthly') monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
    if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);
    
    const equipmentCost = monthlyEquipmentCost * monthsToBill;

    if (user.plan.isConsumptionBased) {
        amount = (consumedLiters * user.plan.price) + equipmentCost;
        description = `Bill for ${billingPeriod}`;
    } else {
        amount = user.plan.price + equipmentCost;
        description = `Monthly Subscription for ${billingPeriod}`;
        
        if (user.accountType !== 'Branch') {
            const monthlyAllocation = (user.customPlanDetails?.litersPerMonth || 0) + (user.customPlanDetails?.bonusLiters || 0);
            const totalAllocation = (monthlyAllocation * monthsToBill) + (user.customPlanDetails?.lastMonthRollover || 0);
            const newRollover = Math.max(0, totalAllocation - consumedLiters);
            userUpdatePayload.totalConsumptionLiters = monthlyAllocation + newRollover;
            userUpdatePayload['customPlanDetails.lastMonthRollover'] = newRollover;
        }
    }
    
    if (isFirstInvoice && user.customPlanDetails) {
        let oneTimeFee = 0;
        if (user.customPlanDetails.gallonPaymentType === 'One-Time') oneTimeFee += user.customPlanDetails.gallonPrice || 0;
        if (user.customPlanDetails.dispenserPaymentType === 'One-Time') oneTimeFee += user.customPlanDetails.dispenserPrice || 0;
        if (oneTimeFee > 0) {
            amount += oneTimeFee;
            description += ` + One-Time Fees`;
        }
    }
    
    const pendingCharges: ManualCharge[] = user.pendingCharges || [];
    const pendingTotal = pendingCharges.reduce((sum, c) => sum + c.amount, 0);
    if (pendingTotal !== 0) {
        amount += pendingTotal;
        description += pendingTotal > 0 ? ` + Adjustments` : ` + Deductions`;
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
            // Fetch additional data for SOA
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

            const pdfBuffer = await generatePasswordProtectedSOA(user, billingPeriod, deliveries, sanitation, compliance);
            const template = getNewInvoiceTemplate(user.businessName, invoiceId, amount, billingPeriod);
            
            const ccList = user.clientId === 'SC2500000001' ? ['support@riverph.com', 'cavatan.jheck@gmail.com'] : 'support@riverph.com';

            sendEmail({
                to: user.email,
                cc: ccList,
                subject: template.subject,
                text: `Invoice for ${billingPeriod} is available for ₱${amount.toFixed(2)}.`,
                html: template.html,
                attachments: [{
                    filename: `SOA_${user.businessName.replace(/\s/g, '_')}_${billingPeriod.replace(/\s/g, '-')}.pdf`,
                    content: pdfBuffer
                }]
            }).catch(e => logger.error("Email failed", e));
        }

        batch.set(paymentsRef.doc(invoiceId), newInvoice, { merge: true });
        userUpdatePayload.lastBilledDate = admin.firestore.FieldValue.serverTimestamp();
    }
    
    if (Object.keys(userUpdatePayload).length > 0) batch.update(userRef, userUpdatePayload);
    return batch.commit();
}
