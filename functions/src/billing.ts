
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format, subMonths, startOfMonth, endOfMonth, isToday, getYear, getMonth, startOfYear } from 'date-fns';
import { createNotification } from './index';
import type { Notification, ManualCharge } from './types'; 

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
        
        // Skip admins and prepaid accounts. Process Branch accounts to generate invoices.
        if (user.role === 'Admin' || user.isPrepaid) continue;

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
        if (user.pendingPlan && user.planChangeEffectiveDate && user.accountType !== 'Branch') {
            const effectiveDate = user.planChangeEffectiveDate.toDate();
            // Check if the effective date is today (the 1st of the month)
            if (isToday(effectiveDate)) {
                console.log(`Activating new plan for user ${userDoc.id}.`);
                
                // Chain the promises to ensure sequential execution for this user
                const processPlanChange = generateInvoiceForUser(user, userRef, billingPeriod, billingCycleStart, billingCycleEnd, monthsToBill, isFirstInvoice)
                    .then(() => userRef.get()) // Re-fetch the user document to get fresh data
                    .then((updatedUserSnap) => {
                        if (!updatedUserSnap.exists()) throw new Error(`User ${userDoc.id} not found after invoice generation.`);
                        const updatedUser = updatedUserSnap.data()!;
                        const pendingPlan = updatedUser.pendingPlan; // use fresh pending plan
                        
                        console.log(`Invoice for old plan generated for ${userDoc.id}. Now updating to new plan: ${pendingPlan.name}.`);
                        
                        const newPlanIsConsumption = pendingPlan.isConsumptionBased || false;

                        // Preserve existing custom details, especially delivery schedule, but allow pending plan to override
                        const newCustomDetails = { ...updatedUser.customPlanDetails, ...(pendingPlan.customPlanDetails || {}) };
                        
                        const updateData: any = {
                            plan: pendingPlan,
                            isPrepaid: pendingPlan.isPrepaid || false,
                            pendingPlan: admin.firestore.FieldValue.delete(),
                            planChangeEffectiveDate: admin.firestore.FieldValue.delete(),
                        };

                        if (newPlanIsConsumption) {
                            // When switching to a consumption plan, the running liter balance is forfeited and reset.
                            updateData.totalConsumptionLiters = 0;
                            // Also clear out fixed-plan specific fields from custom details
                            delete newCustomDetails.litersPerMonth;
                            delete newCustomDetails.bonusLiters;
                            newCustomDetails.lastMonthRollover = 0;
                        } else {
                            // When switching TO a fixed plan, reset rollover to 0 but set new monthly balance
                            const newLiters = newCustomDetails.litersPerMonth || 0;
                            const newBonus = newCustomDetails.bonusLiters || 0;
                            updateData.totalConsumptionLiters = newLiters + newBonus;
                            newCustomDetails.lastMonthRollover = 0;
                        }
                        updateData.customPlanDetails = newCustomDetails;

                        return userRef.update(updateData).then(() => pendingPlan); // Pass pendingPlan to the next .then
                    })
                    .then((activatedPlan) => {
                        console.log(`Plan for user ${userDoc.id} updated to ${activatedPlan.name}.`);
                        return createNotification(userDoc.id, {
                            type: 'general',
                            title: 'Plan Updated',
                            description: `Your new plan, '${activatedPlan.name}', is now active.`,
                            data: { newPlan: activatedPlan.name }
                        });
                    })
                    .catch(error => {
                        console.error(`Failed to process plan change for user ${userDoc.id}:`, error);
                        // Optionally, notify admin of failure
                    });

                promises.push(processPlanChange);
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
    // The main loop filters out admins and prepaid accounts.
    if (!user.plan) {
        return;
    }

    const paymentsRef = userRef.collection('payments');
    const notificationsRef = userRef.collection('notifications');
    const deliveriesRef = userRef.collection('deliveries');
    const batch = db.batch();
    const userUpdatePayload: {[key: string]: any} = {};

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

    // --- Billing Logic ---
    // Calculate amount based on the user's plan, regardless of account type.
    // The status of the invoice will be adjusted later if it's a branch account.
    if (user.plan.isConsumptionBased) {
        const consumptionCost = consumedLitersInPeriod * (user.plan.price || 0);
        amount = consumptionCost + equipmentCostForPeriod;
        description = `Bill for ${billingPeriod}`;
    } else { // Fixed-plan billing (for Single or Branch accounts)
        const planCost = user.plan.price || 0;
        amount = planCost + equipmentCostForPeriod;
        description = `Monthly Subscription for ${billingPeriod}`;

        // Only do rollover/credit logic for non-branch accounts
        if (user.accountType !== 'Branch') {
            const monthlyAllocation = (user.customPlanDetails?.litersPerMonth || 0) + (user.customPlanDetails?.bonusLiters || 0);
            
            const totalAllocationForPeriod = (monthlyAllocation * monthsToBill) + (user.customPlanDetails?.lastMonthRollover || 0);
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
            
            const creditsForNewMonth = monthlyAllocation + newRollover;

            userUpdatePayload.totalConsumptionLiters = creditsForNewMonth;
            userUpdatePayload['customPlanDetails.lastMonthRollover'] = newRollover;

            const creditRefreshNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> = {
                type: 'general',
                title: 'Monthly Credits Refreshed',
                description: `Your monthly balance has been updated with ${creditsForNewMonth.toLocaleString()} liters.`,
                data: { newBalance: creditsForNewMonth }
            };
            const creditRefreshMeta = { ...creditRefreshNotification, date: admin.firestore.FieldValue.serverTimestamp(), isRead: false, userId: userRef.id };
            batch.set(notificationsRef.doc(), creditRefreshMeta);
        }
    }
    
    // Add one-time fees to the very first invoice
    if (isFirstInvoice && user.customPlanDetails) {
        let oneTimeFee = 0;
        if (user.customPlanDetails.gallonPaymentType === 'One-Time') oneTimeFee += user.customPlanDetails.gallonPrice || 0;
        if (user.customPlanDetails.dispenserPaymentType === 'One-Time') oneTimeFee += user.customPlanDetails.dispenserPrice || 0;
        if (oneTimeFee > 0) {
            amount += oneTimeFee;
            description += ` + One-Time Fees`;
        }
    }
    
    // Add pending manual charges to the invoice
    const pendingCharges: ManualCharge[] = user.pendingCharges || [];
    const pendingChargesTotal = pendingCharges.reduce((sum: number, charge: ManualCharge) => sum + charge.amount, 0);
    if (pendingChargesTotal > 0) {
        amount += pendingChargesTotal;
        description += ` + Manual Charges`;
        userUpdatePayload.pendingCharges = admin.firestore.FieldValue.delete();
    }


    if (amount > 0) {
        const invoiceIdSuffix = billingPeriod.replace(/\s/g, '-');
        const invoiceId = `INV-${userRef.id.substring(0, 5)}-${invoiceIdSuffix}`;

        const newInvoice = {
            id: invoiceId,
            date: admin.firestore.Timestamp.fromDate(startOfMonth(new Date())),
            description: description,
            amount: amount,
            status: user.accountType === 'Branch' ? 'Covered by Parent Account' : 'Upcoming',
            manualCharges: pendingCharges, // Store the included charges
        };
        console.log(`Generating invoice ${invoiceId} for user ${userRef.id} for amount ${amount}.`);

        const invoiceNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> = {
            type: 'payment',
            title: 'New Invoice',
            description: `Your invoice for ${billingPeriod} (₱${amount.toFixed(2)}) is available.`,
            data: { paymentId: invoiceId }
        };
        
        // Don't send a notification to a branch account for an invoice they don't pay.
        if (user.accountType !== 'Branch') {
            const notificationWithMeta = { ...invoiceNotification, date: admin.firestore.FieldValue.serverTimestamp(), isRead: false, userId: userRef.id };
            batch.set(notificationsRef.doc(), notificationWithMeta);
        }

        batch.set(paymentsRef.doc(invoiceId), newInvoice, { merge: true });
        
        userUpdatePayload.lastBilledDate = admin.firestore.FieldValue.serverTimestamp();
    }
    
    // Commit all updates for the user at once
    if (Object.keys(userUpdatePayload).length > 0) {
        batch.update(userRef, userUpdatePayload);
    }
    
    return batch.commit();
}
