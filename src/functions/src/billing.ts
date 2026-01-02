
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
    const currentMonth = getMonth(now); // 0-indexed (Jan=0, Feb=1, etc.)

    // Special Case: On Jan 1, 2026, do nothing. The invoice for Dec 2025 will be combined with Jan 2026's.
    if (currentYear === 2026 && currentMonth === 0) { // currentMonth is 0 for January
        console.log('Skipping invoice generation for Jan 1, 2026, to create a combined Dec-Jan invoice in February.');
        return null;
    }

    let billingPeriod: string;
    let billingCycleStart: Date;
    let billingCycleEnd: Date;
    let monthsToBill = 1;

    // Special Case: On Feb 1, 2026, generate a combined invoice for Dec 2025 and Jan 2026.
    if (currentYear === 2026 && currentMonth === 1) { // currentMonth is 1 for February
        console.log('Running special combined invoice generation for Dec 2025 - Jan 2026.');
        billingCycleStart = new Date(2025, 11, 1); // Dec 1, 2025
        billingCycleEnd = new Date(2026, 0, 31, 23, 59, 59); // Jan 31, 2026
        billingPeriod = 'December 2025 - January 2026';
        monthsToBill = 2;
    } else {
        // Standard logic for all other months
        const previousMonth = subMonths(now, 1);
        billingPeriod = format(previousMonth, 'MMMM yyyy');
        billingCycleStart = startOfMonth(previousMonth);
        billingCycleEnd = endOfMonth(previousMonth);
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
        
        // --- Step 1: Handle Pending Plan Change ---
        if (user.pendingPlan && user.planChangeEffectiveDate) {
            const effectiveDate = user.planChangeEffectiveDate.toDate();
            // Check if the effective date is today (the 1st of the month)
            if (isToday(effectiveDate)) {
                console.log(`Activating new plan for user ${userDoc.id}.`);
                
                // Always generate the invoice for the PREVIOUS period using the OLD plan
                // This will correctly handle the special Feb 1 case by billing for Dec/Jan on the old plan
                promises.push(generateInvoiceForUser(user, userRef, billingPeriod, billingCycleStart, billingCycleEnd, monthsToBill));
                
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
                
                // Continue to the next user as billing and plan update are handled.
                continue;
            }
        }
        
        // --- Step 2: Generate Invoice for users without a plan change ---
        promises.push(generateInvoiceForUser(user, userRef, billingPeriod, billingCycleStart, billingCycleEnd, monthsToBill));
    }

    await Promise.all(promises);
    console.log(`Invoice generation and plan update job completed for period: ${billingPeriod}.`);
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
    monthsToBill: number = 1
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

    const monthlyEquipmentCost = (user.customPlanDetails?.gallonPrice || 0) + (user.customPlanDetails?.dispenserPrice || 0);
    const equipmentCostForPeriod = monthlyEquipmentCost * monthsToBill;

    if (user.plan.isConsumptionBased) {
        // Consumption-based billing (Flow Plans)
        const consumptionCost = consumedLitersInPeriod * (user.plan.price || 0);
        amount = consumptionCost + equipmentCostForPeriod;
        description = `Bill for ${billingPeriod}`;
    } else {
        // Fixed-plan billing
        const planCost = (user.plan.price || 0) * monthsToBill;
        amount = planCost + equipmentCostForPeriod;
        description = `Monthly Subscription for ${billingPeriod}`;

        // Rollover logic needs to consider the standard monthly allocation, even in a 2-month billing period.
        const monthlyAllocation = (user.customPlanDetails?.litersPerMonth || 0) + (user.customPlanDetails?.bonusLiters || 0);
        if (monthlyAllocation > 0) {
            const totalAllocationForPeriod = monthlyAllocation * monthsToBill;
            const rolloverLiters = Math.max(0, totalAllocationForPeriod - consumedLitersInPeriod);

            if (rolloverLiters > 0) {
                const rolloverNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> = {
                    type: 'general',
                    title: 'Liters Rolled Over!',
                    description: `You've saved ${rolloverLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })} liters from ${billingPeriod}. They've been added to your current balance.`,
                    data: { rolloverLiters, period: billingPeriod }
                };
                const notificationWithMeta = { ...rolloverNotification, date: admin.firestore.FieldValue.serverTimestamp(), isRead: false, userId: userRef.id };
                batch.set(notificationsRef.doc(), notificationWithMeta);
                console.log(`Generated rollover notification for user ${userRef.id} for ${rolloverLiters} liters.`);
            }
        }
    }

    if (amount > 0) {
        const invoiceIdSuffix = monthsToBill > 1 ? '202512-202601' : format(billingCycleStart, 'yyyyMM');
        const invoiceId = `INV-${userRef.id.substring(0, 5)}-${invoiceIdSuffix}`;

        const newInvoice = {
            id: invoiceId,
            date: admin.firestore.Timestamp.fromDate(startOfMonth(new Date())),
            description: description,
            amount: amount,
            status: 'Upcoming',
        };
        console.log(`Generating invoice ${invoiceId} for user ${userRef.id} for amount ${amount}.`);

        // Create notification for the new invoice
        const invoiceNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> = {
            type: 'payment',
            title: 'New Invoice',
            description: `Your invoice for ${billingPeriod} (₱${amount.toFixed(2)}) is available.`,
            data: { paymentId: invoiceId }
        };

        const notificationWithMeta = { ...invoiceNotification, date: admin.firestore.FieldValue.serverTimestamp(), isRead: false, userId: userRef.id };
        batch.set(notificationsRef.doc(), notificationWithMeta);
        batch.set(paymentsRef.doc(invoiceId), newInvoice, { merge: true });
    }
    
    return batch.commit();
}

