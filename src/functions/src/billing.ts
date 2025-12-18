import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const db = admin.firestore();

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

/**
 * A scheduled Cloud Function that runs on the 1st of every month
 * to generate invoices for all users based on the previous month's consumption.
 */
export const generateMonthlyInvoices = functions.pubsub.schedule('0 0 1 * *').onRun(async (context) => {
    console.log('Starting monthly invoice generation job.');

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
        const user = userDoc.data();
        
        // Skip admins or users without a plan
        if (user.role === 'Admin' || !user.plan) {
            continue;
        }

        const paymentsRef = userDoc.ref.collection('payments');
        let amount = 0;
        let description = '';

        if (user.plan.isConsumptionBased) {
            // Consumption-based billing: Calculate consumption from the previous month
            const deliveriesSnapshot = await userDoc.ref.collection('deliveries')
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
            
            // Only create an invoice if there was consumption
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
            const invoiceId = `INV-${userDoc.id.substring(0, 5)}-${format(previousMonth, 'yyyyMM')}`;
            const newInvoice = {
                id: invoiceId,
                date: admin.firestore.Timestamp.fromDate(startOfMonth(now)), // Invoice date is 1st of current month
                description: description,
                amount: amount,
                status: 'Upcoming',
            };
            // Use set with merge to avoid creating duplicate invoices if the function runs more than once.
            promises.push(paymentsRef.doc(invoiceId).set(newInvoice, { merge: true }));
            console.log(`Generated invoice ${invoiceId} for user ${userDoc.id} for amount ${amount}.`);
        }
    }

    await Promise.all(promises);
    console.log(`Invoice generation job completed. Processed ${promises.length} invoices.`);
    return null;
});
