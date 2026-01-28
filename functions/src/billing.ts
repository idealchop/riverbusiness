
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format, subMonths, startOfMonth, endOfMonth, isToday, getYear, getMonth, startOfYear } from 'date-fns';
import { createNotification } from './index';
import type { Notification } from './types'; 

const db = admin.firestore();

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

  

/**
 * A scheduled Cloud Function that runs on the 1st of every month
 * to generate invoices and handle plan changes.
 */
export const generateMonthlyInvoices = functions.pubsub.schedule('0 0 1 * *').onRun(async (context) => {
    console.log('Starting monthly invoice generation and plan update job.');
    
    const now = new Date();
    const currentYear = getYear(now);
    const currentMonth = getMonth(now);

    // Special Case: On Jan 1, 2026, do nothing for fixed-plan users.
    if (currentYear === 2026 && currentMonth === 0) {
        console.log('Skipping invoice generation for Jan 1, 2026. Combined invoice will be handled in February.');
        return null;
    }

    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty) {
        console.log('No users found. Exiting job.');
        return null;
    }

    const promises: Promise<any>[] = [];

    for (const userDoc of usersSnapshot.docs) {
        const userRef = userDoc.ref;
        let user = userDoc.data();
        
        // Skip admins
        if (user.role === 'Admin') continue;

        let billingPeriod: string;
        let billingCycleStart: Date;
        let billingCycleEnd: Date;
        let monthsToBill = 1;
        let isFirstInvoice = !user.lastBilledDate; // Check if this is the user's first invoice

        // Special Case: On Feb 1, 2026, handle combined/separate logic.
        if (currentYear === 2026 && currentMonth === 1) { // February 2026
            if (user.plan?.isConsumptionBased) {
                // Consumption users get a combined bill for Dec & Jan.
                console.log(`Running special combined invoice for consumption user ${userDoc.id}.`);
                billingCycleStart = new Date(2025, 11, 1); // Dec 1, 2025
                billingCycleEnd = new Date(2026, 0, 31, 23, 59, 59); // Jan 31, 2026
                billingPeriod = 'December 2025 - January 2026';
                monthsToBill = 2;
            } else {
                // Fixed-plan users get a bill for ONLY December 2025. January is skipped.
                console.log(`Running standard Dec 2025 invoice for fixed-plan user ${userDoc.id}.`);
                const dec2025 = new Date(2025, 11, 1);
                billingPeriod = format(dec2025, 'MMMM yyyy');
                billingCycleStart = startOfMonth(dec2025);
                billingCycleEnd = endOfMonth(dec2025);
                monthsToBill = 1; 
            }
        } else {
            // Standard logic for all other months
            const previousMonth = subMonths(now, 1);
            billingPeriod = format(previousMonth, 'MMMM yyyy');
            billingCycleStart = startOfMonth(previousMonth);
            billingCycleEnd = endOfMonth(previousMonth);
        }

        // --- Handle Pending Plan Change ---
        if (user.pendingPlan && user.planChangeEffectiveDate) {
            const effectiveDate = user.planChangeEffectiveDate.toDate();
            // Check if the effective date is today (the 1st of the month)
            if (isToday(effectiveDate)) {
                console.log(`Activating new plan for user ${userDoc.id}.`);
                
                // Always generate the invoice for the PREVIOUS period using the OLD plan
                promises.push(generateInvoiceForUser(user, userRef, billingPeriod, billingCycleStart, billingCycleEnd, monthsToBill, isFirstInvoice));
                
                // Then, update the user's plan
                const planUpdatePromise = userRef.update({
                    plan: user.pendingPlan,
                    customPlanDetails: user.pendingPlan.isConsumptionBased ? { autoRefillEnabled: true } : user.customPlanDetails,
                    pendingPlan: admin.firestore.FieldValue.delete(),
                    planChangeEffectiveDate: admin.firestore.FieldValue.delete(),
                }).then(() => {
                     // Send notification *after* plan has been successfully updated
                    return createNotification(userDoc.id, {
                        type: 'general',
                        title: 'Plan Updated',
                        description: `Your new plan, ${user.pendingPlan.name}, is now active.`,
                        data: { newPlan: user.pendingPlan.name }
                    });
                });

                promises.push(planUpdatePromise);
                console.log(`Plan for user ${userDoc.id} updated to ${user.pendingPlan.name}.`);
                continue; 
            }
        }
        
        // --- Generate Invoice for users without a plan change ---
        promises.push(generateInvoiceForUser(user, userRef, billingPeriod, billingCycleStart, billingCycleEnd, monthsToBill, isFirstInvoice));
    }

    await Promise.all(promises);
    console.log(`Invoice generation and plan update job completed.`);
    return null;
});

/**
 * Generates an invoice for a single user and creates a notification.
 */
async function generateInvoiceForUser(
    user: admin.firestore.DocumentData,
    userRef: admin.firestore.DocumentReference,
    billingPeriod: string,
    billingCycleStart: Date,
    billingCycleEnd: Date,
    monthsToBill: number = 1,
    isFirstInvoice: boolean
) {
    // Skip admins or users without a plan
    if (user.role === 'Admin' || !user.plan) {
        return;
    }

    const paymentsRef = userRef.collection('payments');
    const notificationsRef = userRef.collection('notifications');
    const deliveriesRef = userRef.collection('deliveries');
    const batch = db.batch();

    let amount = 0;
    let description = '';

    const deliveriesSnapshot = await deliveriesRef
        .where('date', '>=', billingCycleStart)
        .where('date', '<=', billingCycleEnd)
        .get();

    const consumedLitersInPeriod = deliveriesSnapshot.docs.reduce((sum, doc) => {
        const delivery = doc.data();
        return sum + containerToLiter(delivery.volumeContainers);
    }, 0);
    
    let monthlyEquipmentCost = 0;
    if (user.customPlanDetails?.gallonPaymentType === 'Monthly') {
        monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
    }
    if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') {
        monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);
    }
    
    const equipmentCostForPeriod = monthlyEquipmentCost * monthsToBill;

    if (user.plan.isConsumptionBased) {
        // Consumption-based billing (Flow Plans)
        const consumptionCost = consumedLitersInPeriod * (user.plan.price || 0);
        amount = consumptionCost + equipmentCostForPeriod;
        description = `Bill for ${billingPeriod}`;
    } else {
        // Fixed-plan billing
        const planCost = user.plan.price || 0;
        amount = planCost + equipmentCostForPeriod;
        description = `Monthly Subscription for ${billingPeriod}`;

        const monthlyAllocation = (user.customPlanDetails?.litersPerMonth || 0) + (user.customPlanDetails?.bonusLiters || 0);
        
        // This is the new rollover, calculated from the period that just ended.
        const totalAllocationForPeriod = monthlyAllocation * monthsToBill;
        const newRollover = Math.max(0, totalAllocationForPeriod - consumedLitersInPeriod);

        if (newRollover > 0) {
            const rolloverNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> = {
                type: 'general',
                title: 'Liters Rolled Over!',
                description: `You've saved ${newRollover.toLocaleString(undefined, { maximumFractionDigits: 0 })} liters from ${billingPeriod}. They've been added to your balance for this month.`,
                data: { rolloverLiters: newRollover, period: billingPeriod }
            };
            const notificationWithMeta = { ...rolloverNotification, date: admin.firestore.FieldValue.serverTimestamp(), isRead: false, userId: userRef.id };
            batch.set(notificationsRef.doc(), notificationWithMeta);
            console.log(`Generated rollover notification for user ${userRef.id} for ${newRollover} liters.`);
        }
        
        // This is the starting balance for the NEW month, which begins today.
        // It's an increment to add to any existing balance from manual adjustments.
        const creditsForNewMonth = monthlyAllocation + newRollover;

        batch.update(userRef, {
            totalConsumptionLiters: admin.firestore.FieldValue.increment(creditsForNewMonth),
            'customPlanDetails.lastMonthRollover': newRollover,
        });
    }
    
    // Add one-time fees to the very first invoice
    if (isFirstInvoice && user.customPlanDetails) {
        let oneTimeFee = 0;
        if (user.customPlanDetails.gallonPaymentType === 'One-Time') {
            oneTimeFee += user.customPlanDetails.gallonPrice || 0;
        }
        if (user.customPlanDetails.dispenserPaymentType === 'One-Time') {
            oneTimeFee += user.customPlanDetails.dispenserPrice || 0;
        }

        if (oneTimeFee > 0) {
            amount += oneTimeFee;
            description += ` + One-Time Fees`;
        }
    }


    if (amount > 0) {
        const invoiceIdSuffix = billingPeriod.replace(/\s/g, '-');
        const invoiceId = `INV-${userRef.id.substring(0, 5)}-${invoiceIdSuffix}`;

        const newInvoice = {
            id: invoiceId,
            date: admin.firestore.Timestamp.fromDate(startOfMonth(new Date())),
            description: description,
            amount: amount,
            status: 'Upcoming',
        };
        console.log(`Generating invoice ${invoiceId} for user ${userRef.id} for amount ${amount}.`);

        const invoiceNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> = {
            type: 'payment',
            title: 'New Invoice',
            description: `Your invoice for ${billingPeriod} (₱${amount.toFixed(2)}) is available.`,
            data: { paymentId: invoiceId }
        };

        const notificationWithMeta = { ...invoiceNotification, date: admin.firestore.FieldValue.serverTimestamp(), isRead: false, userId: userRef.id };
        batch.set(notificationsRef.doc(), notificationWithMeta);
        batch.set(paymentsRef.doc(invoiceId), newInvoice, { merge: true });
        
        // Mark that the user has been billed
        batch.update(userRef, { lastBilledDate: admin.firestore.FieldValue.serverTimestamp() });
    }
    
    return batch.commit();
}
