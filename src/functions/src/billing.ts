import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format, subMonths, startOfMonth, endOfMonth, isToday } from 'date-fns';

const db = admin.firestore();

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

/**
 * A scheduled Cloud Function that runs on the 1st of every month
 * to generate invoices and handle plan changes.
 */
export const generateMonthlyInvoices = functions.pubsub.schedule('0 0 1 * *').onRun(async (context) => {
    console.log('Starting monthly invoice generation and plan update job.');

    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty) {
        console.log('No users found. Exiting job.');
        return null;
    }

    const now = new Date();
    const previousMonth = subMonths(now, 1);
    const billingPeriod = format(previousMonth, 'MMMM yyyy');
    const billingCycleStart = startOfMonth(previousMonth);
    const billingCycleEnd = endOfMonth(previousMonth);

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
                
                // First, generate the invoice for the PREVIOUS month using the OLD plan
                promises.push(generateInvoiceForUser(user, userRef, billingPeriod, billingCycleStart, billingCycleEnd));
                
                // Then, update the user's plan
                const planUpdatePromise = userRef.update({
                    plan: user.pendingPlan,
                    customPlanDetails: user.pendingPlan.isConsumptionBased ? { autoRefillEnabled: true } : user.customPlanDetails,
                    pendingPlan: admin.firestore.FieldValue.delete(),
                    planChangeEffectiveDate: admin.firestore.FieldValue.delete(),
                });
                promises.push(planUpdatePromise);

                console.log(`Plan for user ${userDoc.id} updated to ${user.pendingPlan.name}.`);
                
                // Continue to the next user as billing and plan update are handled.
                continue;
            }
        }
        
        // --- Step 2: Generate Invoice for users without a plan change ---
        promises.push(generateInvoiceForUser(user, userRef, billingPeriod, billingCycleStart, billingCycleEnd));
    }

    await Promise.all(promises);
    console.log(`Invoice generation and plan update job completed.`);
    return null;
});

/**
 * Generates an invoice for a single user for the specified billing period.
 */
async function generateInvoiceForUser(
    user: admin.firestore.DocumentData,
    userRef: admin.firestore.DocumentReference,
    billingPeriod: string,
    billingCycleStart: Date,
    billingCycleEnd: Date
) {
    // Skip admins or users without a plan
    if (user.role === 'Admin' || !user.plan) {
        return;
    }

    const paymentsRef = userRef.collection('payments');
    let amount = 0;
    let description = '';

    if (user.plan.isConsumptionBased) {
        // Consumption-based billing
        const deliveriesSnapshot = await userRef.collection('deliveries')
            .where('date', '>=', billingCycleStart.toISOString())
            .where('date', '<=', billingCycleEnd.toISOString())
            .get();

        let totalLitersConsumed = 0;
        if (!deliveriesSnapshot.empty) {
            totalLitersConsumed = deliveriesSnapshot.docs.reduce((sum, doc) => {
                const delivery = doc.data();
                return sum + containerToLiter(delivery.volumeContainers);
            }, 0);
        }
        
        if (totalLitersConsumed > 0) {
            amount = totalLitersConsumed * (user.plan.price || 0);
            description = `Water Consumption for ${billingPeriod}`;
        }

    } else {
        // Fixed-plan billing
        amount = user.plan.price || 0;
        description = `Monthly Subscription for ${billingPeriod}`;
    }

    if (amount > 0) {
        const invoiceId = `INV-${userRef.id.substring(0, 5)}-${format(billingCycleStart, 'yyyyMM')}`;
        const newInvoice = {
            id: invoiceId,
            date: admin.firestore.Timestamp.fromDate(startOfMonth(new Date())),
            description: description,
            amount: amount,
            status: 'Upcoming',
        };
        console.log(`Generating invoice ${invoiceId} for user ${userRef.id} for amount ${amount}.`);
        return paymentsRef.doc(invoiceId).set(newInvoice, { merge: true });
    }
}
