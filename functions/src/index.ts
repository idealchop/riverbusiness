
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue, Timestamp, increment } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import * as path from 'path';
import type { Notification, Delivery } from './types';


// Import all exports from billing.ts
import * as billing from './billing';

// Export all billing functions so they are deployed
export * from './billing';

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();
const storage = getStorage();

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

/**
 * Retrieves the admin user's UID.
 */
async function getAdminId(): Promise<string | null> {
    try {
        const adminQuery = await db.collection('users').where('email', '==', 'admin@riverph.com').limit(1).get();
        if (!adminQuery.empty) {
            return adminQuery.docs[0].id;
        }
        logger.warn("Admin user 'admin@riverph.com' not found.");
        return null;
    } catch (error) {
        logger.error("Error fetching admin user:", error);
        return null;
    }
}


/**
 * Creates a notification document in a user's notification subcollection.
 */
export async function createNotification(userId: string, notificationData: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'>) {
  if (!userId) {
    logger.warn("User ID is missing, cannot create notification.");
    return;
  }
  const notificationWithMeta = {
    ...notificationData,
    userId: userId,
    date: FieldValue.serverTimestamp(),
    isRead: false,
  };
  await db.collection('users').doc(userId).collection('notifications').add(notificationWithMeta);
}


/**
 * Cloud Function to create a notification when a delivery is first created.
 */
export const ondeliverycreate = onDocumentCreated("users/{userId}/deliveries/{deliveryId}", async (event) => {
  try {
    if (!event.data) {
      logger.info("No data in event, exiting function.");
      return;
    }

    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    const delivery = event.data.data() as Delivery;
    logger.info(`Processing delivery ${deliveryId} for user ${userId}.`);

    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      logger.error(`User document not found for userId: ${userId}. Cannot process delivery notifications.`);
      return;
    }

    const adminId = await getAdminId();
    let adminNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> | null = null;
    const notificationsToSend: Promise<void>[] = [];

    // Always create notification for the user receiving the delivery
    notificationsToSend.push(createNotification(userId, {
      type: 'delivery',
      title: 'Delivery Scheduled',
      description: `A new delivery of ${delivery.volumeContainers} containers has been scheduled.`,
      data: { deliveryId },
    }));

    // Logic for different account types
    if (userData.accountType === 'Branch' && userData.parentId) {
      const parentRef = db.collection('users').doc(userData.parentId);
      const parentDoc = await parentRef.get();
      const parentData = parentDoc.data();

      if (parentData) {
        const litersDelivered = containerToLiter(delivery.volumeContainers);
        const pricePerLiter = parentData.plan?.price || 0;
        const deliveryCost = litersDelivered * pricePerLiter;

        // Create a batch to perform multiple writes atomically
        const batch = db.batch();
        
        // 1. Copy delivery to parent's subcollection
        const parentDeliveryRef = parentRef.collection('deliveries').doc(deliveryId);
        batch.set(parentDeliveryRef, { ...delivery, parentId: userData.parentId });

        if (deliveryCost > 0) {
            // 2. Debit parent's credit balance
            batch.update(parentRef, { topUpBalanceCredits: increment(-deliveryCost) });
            
            // 3. Log the transaction on the parent account
            const transactionRef = parentRef.collection('transactions').doc();
            batch.set(transactionRef, {
                id: transactionRef.id,
                date: delivery.date,
                type: 'Debit',
                amountCredits: deliveryCost,
                description: `Delivery to ${userData.businessName} (${litersDelivered.toFixed(1)}L)`,
                branchId: userId,
                branchName: userData.businessName
            });
        }
        
        // Commit the batch
        await batch.commit();

        // Schedule Parent Notification
        if (deliveryCost > 0) {
          notificationsToSend.push(createNotification(userData.parentId, {
            type: 'delivery',
            title: 'Branch Consumption',
            description: `₱${deliveryCost.toFixed(2)} deducted for delivery to ${userData.businessName}.`,
            data: { deliveryId, branchUserId: userId },
          }));
        }
        
        // Prepare Admin Notification for Branch Delivery
        adminNotification = {
          type: 'delivery',
          title: 'Branch Delivery Created',
          description: `Delivery for ${userData.businessName} (Branch) scheduled, covered by ${parentData.businessName}.`,
          data: { deliveryId, userId },
        };
      } else {
         logger.error(`Parent user ${userData.parentId} not found for branch ${userId}.`);
      }
    } else { // Single or Parent account delivery
      if (userData.accountType === 'Single' && !userData.plan?.isConsumptionBased) {
        // Decrement liter balance for fixed-plan single users
        const litersDelivered = containerToLiter(delivery.volumeContainers);
        await db.collection('users').doc(userId).update({
          totalConsumptionLiters: increment(-litersDelivered)
        });
      }
      
      // Prepare Admin Notification for Single/Parent Delivery
      adminNotification = {
        type: 'delivery',
        title: `Delivery Created`,
        description: `A delivery for ${userData.businessName} (${userData.accountType || 'Single'}) has been scheduled.`,
        data: { deliveryId, userId },
      };
    }
    
    // Schedule admin notification if it was prepared
    if (adminId && adminNotification) {
      notificationsToSend.push(createNotification(adminId, adminNotification));
    }
    
    // Await all scheduled notifications
    await Promise.all(notificationsToSend);
    logger.info(`Successfully processed notifications for delivery ${deliveryId}.`);

  } catch (error) {
    logger.error(`Error in ondeliverycreate for event ID ${event.id}:`, error);
  }
});


/**
 * Cloud Function to create a notification when a delivery is updated.
 */
export const ondeliveryupdate = onDocumentUpdated("users/{userId}/deliveries/{deliveryId}", async (event) => {
    if (!event.data) return;

    const before = event.data.before.data();
    const after = event.data.after.data() as Delivery;

    // Only notify if the status has changed.
    if (before.status === after.status) {
        return;
    }
    
    const userId = event.params.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // If it's a branch delivery, update the copy in the parent's collection as well
    if (after.parentId) {
        const parentDeliveryRef = db.collection('users').doc(after.parentId).collection('deliveries').doc(event.params.deliveryId);
        await parentDeliveryRef.update({ status: after.status }).catch(err => {
            logger.error(`Failed to update delivery copy for parent ${after.parentId}:`, err);
        });
    }

    // Notify User
    await createNotification(userId, {
        type: 'delivery',
        title: `Delivery ${after.status}`,
        description: `Your delivery of ${after.volumeContainers} containers is now ${after.status}.`,
        data: { deliveryId: event.params.deliveryId }
    });
    
    // Notify Admin
    const adminId = await getAdminId();
    if (adminId && userData) {
        await createNotification(adminId, {
            type: 'delivery',
            title: 'Delivery Status Updated',
            description: `Delivery for ${userData.businessName} is now ${after.status}.`,
            data: { userId, deliveryId: event.params.deliveryId }
        });
    }
});

/**
 * Cloud Function to create notifications when a new payment document is created.
 */
export const onpaymentcreate = onDocumentCreated("users/{userId}/payments/{paymentId}", async (event) => {
    if (!event.data) return;

    const userId = event.params.userId;
    const payment = event.data.data();

    // We only care about notifying the admin when a user submits a payment for review.
    if (payment.status !== 'Pending Review') {
        return;
    }

    const adminId = await getAdminId();
    if (!adminId) return;

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (userData) {
        const adminNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> = {
            type: 'payment',
            title: 'Payment for Review',
            description: `${userData.businessName} (ID: ${userData.clientId}) has submitted a proof of payment.`,
            data: { userId: userId, paymentId: event.params.paymentId }
        };
        await createNotification(adminId, adminNotification);
    }
});


/**
 * Cloud Function to create notifications when a payment status is updated by an admin.
 */
export const onpaymentupdate = onDocumentUpdated("users/{userId}/payments/{paymentId}", async (event) => {
    if (!event.data) return;

    const before = event.data.before.data();
    const after = event.data.after.data();

    // Only notify if the status has changed.
    if (before.status === after.status) {
        return;
    }

    const userId = event.params.userId;
    const payment = after;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const adminId = await getAdminId();

    let userNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> | null = null;
    let adminNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> | null = null;
    
    if (!userData) {
        logger.error(`User data not found for ${userId} in onpaymentupdate.`);
        return;
    }

    // Admin approves payment
    if (before.status === 'Pending Review' && after.status === 'Paid') {
        userNotification = {
            type: 'payment',
            title: 'Payment Confirmed',
            description: `Your payment for invoice ${payment.id} has been confirmed. Thank you!`,
            data: { paymentId: payment.id }
        };
        adminNotification = {
            type: 'payment',
            title: 'Payment Approved',
            description: `You approved a payment of ₱${payment.amount.toFixed(2)} from ${userData.businessName}.`,
            data: { userId, paymentId: payment.id }
        };
    } 
    // Admin rejects payment
    else if (before.status === 'Pending Review' && after.status === 'Upcoming') {
        userNotification = {
            type: 'payment',
            title: 'Payment Action Required',
            description: `Your payment for invoice ${payment.id} requires attention. Reason: ${payment.rejectionReason || 'Please contact support.'}`,
            data: { paymentId: payment.id }
        };
         adminNotification = {
            type: 'payment',
            title: 'Payment Rejected',
            description: `You rejected a payment from ${userData.businessName}. Reason: ${payment.rejectionReason || 'Not specified'}.`,
            data: { userId, paymentId: payment.id }
        };
    }
    // User submits payment for review
    else if ((before.status === 'Upcoming' || before.status === 'Overdue') && after.status === 'Pending Review') {
         adminNotification = {
            type: 'payment',
            title: 'Payment for Review',
            description: `${userData.businessName} has submitted a proof of payment.`,
            data: { userId, paymentId: payment.id }
        };
    }
    
    const promises = [];
    if (userNotification) {
        promises.push(createNotification(userId, userNotification));
    }
    if (adminNotification && adminId) {
        promises.push(createNotification(adminId, adminNotification));
    }
    await Promise.all(promises);
});


/**
 * Cloud Function to handle user-submitted top-up requests.
 */
export const ontopuprequestcreate = onDocumentCreated("users/{userId}/topUpRequests/{requestId}", async (event) => {
    if (!event.data) return;

    const userId = event.params.userId;
    const requestId = event.params.requestId;
    const requestData = event.data.data();

    const adminId = await getAdminId();
    if (!adminId) return;

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData) {
        await createNotification(adminId, {
            type: 'top-up',
            title: 'Top-Up Request',
            description: `${userData.businessName} requested a top-up of ₱${requestData.amount.toLocaleString()}.`,
            data: { userId, requestId }
        });
    }
});


/**
 * Cloud Function to handle admin updates to top-up requests.
 */
export const ontopuprequestupdate = onDocumentUpdated("users/{userId}/topUpRequests/{requestId}", async (event) => {
    if (!event.data) return;

    const before = event.data.before.data();
    const after = event.data.after.data();

    // Only notify if the status has changed from 'Pending Review'.
    if (before.status !== 'Pending Review' || before.status === after.status) {
        return;
    }

    const userId = event.params.userId;
    const requestData = after;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const adminId = await getAdminId();

    if (!userData) {
        logger.error(`User data not found for ${userId} in ontopuprequestupdate.`);
        return;
    }

    let userNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> | null = null;
    let adminNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> | null = null;

    if (after.status === 'Approved') {
        userNotification = {
            type: 'top-up',
            title: 'Top-Up Successful',
            description: `Your top-up of ₱${requestData.amount.toLocaleString()} has been approved and added to your balance.`,
            data: { requestId: event.params.requestId }
        };
        adminNotification = {
            type: 'top-up',
            title: 'Top-Up Approved',
            description: `You approved a ₱${requestData.amount.toLocaleString()} top-up for ${userData.businessName}.`,
            data: { userId, requestId: event.params.requestId }
        };
        
        // Also increment the parent's balance
        await db.collection('users').doc(userId).update({
            topUpBalanceCredits: increment(requestData.amount)
        });

    } else if (after.status === 'Rejected') {
        userNotification = {
            type: 'top-up',
            title: 'Top-Up Rejected',
            description: `Your top-up request was rejected. Reason: ${requestData.rejectionReason || 'Not specified'}.`,
            data: { requestId: event.params.requestId }
        };
         adminNotification = {
            type: 'top-up',
            title: 'Top-Up Rejected',
            description: `You rejected a top-up request from ${userData.businessName}.`,
            data: { userId, requestId: event.params.requestId }
        };
    }

    const promises = [];
    if (userNotification) {
        promises.push(createNotification(userId, userNotification));
    }
    if (adminNotification && adminId) {
        promises.push(createNotification(adminId, adminNotification));
    }
    await Promise.all(promises);
});

/**
 * Cloud Function to send notifications for sanitation visit creations.
 */
export const onsanitationvisitcreate = onDocumentCreated("users/{userId}/sanitationVisits/{visitId}", async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const visit = event.data.data();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const scheduledDate = new Date(visit.scheduledDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });

    // Notify User
    await createNotification(userId, {
        type: 'sanitation',
        title: 'Sanitation Visit Scheduled',
        description: `A sanitation visit is scheduled for your office on ${scheduledDate}.`,
        data: { visitId: event.params.visitId }
    });

    // Notify Admin
    const adminId = await getAdminId();
    if (adminId && userData) {
         await createNotification(adminId, {
            type: 'sanitation',
            title: 'Sanitation Visit Scheduled',
            description: `A visit for ${userData.businessName} has been scheduled for ${scheduledDate}.`,
            data: { userId, visitId: event.params.visitId }
        });
    }
});

/**
 * Cloud Function to send notifications for sanitation visit updates.
 */
export const onsanitationvisitupdate = onDocumentUpdated("users/{userId}/sanitationVisits/{visitId}", async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.status === after.status) return; // No change, no notification

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const scheduledDate = new Date(after.scheduledDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });

    // Notify user
    await createNotification(userId, {
        type: 'sanitation',
        title: `Sanitation Visit: ${after.status}`,
        description: `Your sanitation visit for ${scheduledDate} is now ${after.status}.`,
        data: { visitId: event.params.visitId }
    });
    
    // Notify admin
    const adminId = await getAdminId();
    if(adminId && userData) {
        await createNotification(adminId, {
            type: 'sanitation',
            title: 'Sanitation Visit Updated',
            description: `The visit for ${userData.businessName} on ${scheduledDate} is now ${after.status}.`,
            data: { userId, visitId: event.params.visitId }
        });
    }
});

/**
 * Cloud Function to notify admin on user profile changes.
 */
export const onuserupdate = onDocumentUpdated("users/{userId}", async (event) => {
    if (!event.data) return;

    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    const adminId = await getAdminId();
    
    if (!adminId || userId === adminId) return; // Don't notify admin about their own changes.

    // Notify on plan change request
    if (!before.pendingPlan && after.pendingPlan) {
        await createNotification(adminId, {
            type: 'general',
            title: 'Plan Change Request',
            description: `${after.businessName} has requested to change their plan to ${after.pendingPlan.name}.`,
            data: { userId: userId }
        });
    }

    // You can add more checks here for other fields like auto-refill, account info, etc.
    if (before.customPlanDetails?.autoRefillEnabled !== after.customPlanDetails?.autoRefillEnabled) {
         await createNotification(adminId, {
            type: 'general',
            title: 'Auto-Refill Changed',
            description: `${after.businessName} has ${after.customPlanDetails.autoRefillEnabled ? 'enabled' : 'disabled'} auto-refill.`,
            data: { userId: userId }
        });
    }
});


/**
 * Generic Cloud Function for file uploads.
 */
export const onfileupload = onObjectFinalized({ cpu: "memory" }, async (event) => {
  const fileBucket = event.data.bucket;
  const filePath = event.data.name;
  const contentType = event.data.contentType;
  const customMetadata = event.data.metadata?.customMetadata;

  if (!filePath || contentType?.startsWith('application/x-directory')) {
    logger.log(`Ignoring event for folder: ${filePath}`);
    return;
  }

  const bucket = storage.bucket(fileBucket);
  const file = bucket.file(filePath);

  const getPublicUrl = async () => {
    const [downloadURL] = await file.getSignedUrl({
      action: "read",
      expires: "01-01-2500",
    });
    return downloadURL;
  };

  try {
    // Handle user profile photo uploads
    if (filePath.startsWith("users/") && filePath.includes("/profile/")) {
        const parts = filePath.split("/");
        const userId = parts[1];
        const url = await getPublicUrl();
        await db.collection("users").doc(userId).update({ photoURL: url });
        logger.log(`Updated profile photo for user: ${userId}`);
        return;
    }

    // Handle user contract uploads by admin
    if (filePath.startsWith("userContracts/")) {
        const parts = filePath.split("/");
        const userId = parts[1];
        logger.log(`Contract received for user: ${userId}. Client will handle database update.`);
        return;
    }
    
    // Handle admin-uploaded proofs of delivery
    if (filePath.startsWith("admin_uploads/") && filePath.includes("/proofs_for/")) {
        const parts = filePath.split('/');
        const userId = parts[3]; // admin_uploads/{adminId}/proofs_for/{userId}/{filename}
        const deliveryId = path.basename(filePath).split('-')[0];
        const url = await getPublicUrl();
        await db.collection("users").doc(userId).collection("deliveries").doc(deliveryId).update({
            proofOfDeliveryUrl: url,
        });
        logger.log(`Updated proof for delivery: ${deliveryId} for user: ${userId} by admin.`);
        return;
    }
    
    // Handle admin-uploaded sanitation reports
    if (filePath.startsWith("admin_uploads/") && filePath.includes("/sanitation_for/")) {
        const parts = filePath.split('/');
        const userId = parts[3]; // admin_uploads/{adminId}/sanitation_for/{userId}/{filename}
        const visitId = path.basename(filePath).split('-')[0];
        const url = await getPublicUrl();
        await db.collection("users").doc(userId).collection("sanitationVisits").doc(visitId).update({
            reportUrl: url,
        });
        logger.log(`Updated report for sanitation visit: ${visitId} for user: ${userId} by admin.`);
        return;
    }

    // Handle user-uploaded proofs of payment
    if (filePath.startsWith("users/") && filePath.includes("/payments/") && customMetadata?.paymentId) {
        const { userId, paymentId } = customMetadata;

        if (!userId || !paymentId) {
            logger.error(`Missing userId or paymentId in metadata for file: ${filePath}`);
            return;
        }

        const url = await getPublicUrl();
        const paymentRef = db.collection("users").doc(userId).collection("payments").doc(paymentId);
        
        await paymentRef.set({
            proofOfPaymentUrl: url,
            status: "Pending Review",
        }, { merge: true });

        logger.log(`Updated proof for payment: ${paymentId} for user: ${userId}`);
        
        // This will trigger onpaymentcreate or onpaymentupdate which handles notifications
        return;
    }
    
    if (filePath.startsWith("stations/")) {
        const parts = filePath.split("/");
        const stationId = parts[1];
        const docType = parts[2];
        const url = await getPublicUrl();

        if (docType === "agreement") {
            await db.collection("waterStations").doc(stationId).update({
                partnershipAgreementUrl: url,
            });
            logger.log(`Updated partnership agreement for station: ${stationId}`);
        } else if (docType === "compliance") {
            const reportKey = path.basename(filePath).split('-')[0];
            
            const reportRef = db.collection("waterStations").doc(stationId).collection("complianceReports").doc(reportKey);

            await reportRef.update({ reportUrl: url });
            logger.log(`Updated compliance report URL for report '${reportKey}' for station: ${stationId}`);
        }
        return;
    }

    logger.log(`File path ${filePath} did not match any handler.`);

  } catch (error) {
    logger.error(`Failed to process upload for ${filePath}.`, error);
  }
});
