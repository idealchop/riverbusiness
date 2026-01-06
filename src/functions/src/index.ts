

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
    if (!event.data) return;

    const deliveryRef = event.data.ref;
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    const delivery = event.data.data() as Delivery;

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Handle consumption for different account types
    if (userData?.accountType === 'Branch' && userData.parentId) {
        const parentRef = db.collection('users').doc(userData.parentId);
        const parentDeliveryRef = parentRef.collection('deliveries').doc(deliveryId);

        // Calculate the cost of the delivery based on the branch's plan
        const litersDelivered = containerToLiter(delivery.volumeContainers);
        const pricePerLiter = userData.plan?.price || 0;
        const deliveryCost = litersDelivered * pricePerLiter;
        
        const batch = db.batch();

        // 1. Tag the original delivery with parentId for potential queries
        batch.update(deliveryRef, { parentId: userData.parentId });
        
        // 2. Create a copy of the delivery record in the parent's subcollection
        const deliveryCopyToParent: Delivery = {
            ...delivery,
            id: deliveryId,
            userId: userId, // Keep original userId to know which branch it was for
            parentId: userData.parentId
        };
        batch.set(parentDeliveryRef, deliveryCopyToParent);

        if (deliveryCost > 0) {
            // 3. Debit the parent account's credit balance
            batch.update(parentRef, { topUpBalanceCredits: increment(-deliveryCost) });

            // 4. Create a transaction log on the parent account
            const transactionRef = db.collection('users').doc(userData.parentId).collection('transactions').doc();
            const transactionData = {
                date: delivery.date,
                type: 'Debit',
                amountCredits: deliveryCost,
                description: `Delivery to ${userData.businessName} (${litersDelivered.toFixed(1)}L)`,
                branchId: userId,
                branchName: userData.businessName
            };
            batch.set(transactionRef, transactionData);
        }

        await batch.commit();

        // 5. Notify the Parent account of the deduction
        if (deliveryCost > 0) {
            await createNotification(userData.parentId, {
                type: 'delivery',
                title: 'Branch Consumption',
                description: `₱${deliveryCost.toFixed(2)} deducted for delivery to ${userData.businessName}.`,
                data: { deliveryId: event.params.deliveryId, branchUserId: userId }
            });
        }

    } else if (userData?.plan?.isPrepaid) {
        // For Prepaid plans, deduct from their own liter balance
        const litersToDeduct = containerToLiter(delivery.volumeContainers);
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            totalConsumptionLiters: increment(-litersToDeduct)
        });
    }

    // Always notify the user receiving the delivery
    const notification = {
        type: 'delivery',
        title: 'Delivery Scheduled',
        description: `Delivery of ${delivery.volumeContainers} containers is scheduled.`,
        data: { deliveryId: event.params.deliveryId }
    };
    
    await createNotification(userId, notification);
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

    // If it's a branch delivery, update the copy in the parent's collection as well
    if (after.parentId) {
        const parentDeliveryRef = db.collection('users').doc(after.parentId).collection('deliveries').doc(event.params.deliveryId);
        await parentDeliveryRef.update({ status: after.status }).catch(err => {
            logger.error(`Failed to update delivery copy for parent ${after.parentId}:`, err);
        });
    }

    const notification = {
        type: 'delivery',
        title: `Delivery ${after.status}`,
        description: `Delivery of ${after.volumeContainers} containers is now ${after.status}.`,
        data: { deliveryId: event.params.deliveryId }
    };
    
    await createNotification(userId, notification);
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

    let notification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> | null = null;
    let adminNotification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'> | null = null;


    if (payment.status === 'Paid') {
        notification = {
            type: 'payment',
            title: 'Payment Confirmed',
            description: `Your payment for invoice ${payment.id} has been confirmed. Thank you!`,
            data: { paymentId: payment.id }
        };
    } else if (before.status === 'Pending Review' && payment.status === 'Upcoming') {
        // This logic specifically targets the rejection flow
        notification = {
            type: 'payment',
            title: 'Payment Action Required',
            description: `Your payment for invoice ${payment.id} requires attention. Reason: ${payment.rejectionReason || 'Please contact support.'}`,
            data: { paymentId: payment.id }
        };
    } else if (before.status === 'Upcoming' && payment.status === 'Pending Review' && adminId && userData) {
         adminNotification = {
            type: 'payment',
            title: 'Payment for Review',
            description: `${userData.businessName} (ID: ${userData.clientId}) has submitted a proof of payment.`,
            data: { userId: userId, paymentId: payment.id }
        };
    }
    
    if (notification) {
        await createNotification(userId, notification);
    }
    if (adminNotification && adminId) {
        await createNotification(adminId, adminNotification);
    }
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
 * Cloud Function to send notifications for sanitation visit creations.
 */
export const onsanitationvisitcreate = onDocumentCreated("users/{userId}/sanitationVisits/{visitId}", async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const visit = event.data.data();

    const scheduledDate = new Date(visit.scheduledDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });

    const notification = {
        type: 'sanitation',
        title: 'Sanitation Visit Scheduled',
        description: `A sanitation visit is scheduled for your office on ${scheduledDate}.`,
        data: { visitId: event.params.visitId }
    };

    await createNotification(userId, notification);
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

    const scheduledDate = new Date(after.scheduledDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });

    const notification = {
        type: 'sanitation',
        title: `Sanitation Visit: ${after.status}`,
        description: `Your sanitation visit for ${scheduledDate} is now ${after.status}.`,
        data: { visitId: event.params.visitId }
    };
    
    await createNotification(userId, notification);
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
    if (filePath.startsWith("users/") && filePath.includes("/profile/")) {
        const parts = filePath.split("/");
        const userId = parts[1];
        const url = await getPublicUrl();
        await db.collection("users").doc(userId).update({ photoURL: url });
        logger.log(`Updated profile photo for user: ${userId}`);
        return;
    }

    if (filePath.startsWith("userContracts/")) {
        const parts = filePath.split("/");
        const userId = parts[1];
        const url = await getPublicUrl();
        await db.collection("users").doc(userId).update({
            currentContractUrl: url,
            contractUploadedDate: FieldValue.serverTimestamp(),
            contractStatus: "Active",
        });
        logger.log(`Updated contract for user: ${userId}`);
        return;
    }
    
    // Handle admin-uploaded proofs
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


    if (filePath.startsWith("users/") && filePath.includes("/payments/")) {
        const parts = filePath.split("/");
        const userId = parts[1];
        const paymentId = path.basename(filePath).split('-')[0];
        const url = await getPublicUrl();
        const paymentRef = db.collection("users").doc(userId).collection("payments").doc(paymentId);
        
        await paymentRef.set({
            proofOfPaymentUrl: url,
            status: "Pending Review",
        }, { merge: true });

        logger.log(`Updated proof for payment: ${paymentId} for user: ${userId}`);
        
        await createNotification(userId, {
            type: 'payment',
            title: 'Payment Under Review',
            description: `Your payment proof for invoice ${paymentId} is under review.`,
            data: { paymentId: paymentId }
        });

        // Also notify the admin
        const adminId = await getAdminId();
        if (adminId) {
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            if (userData) {
                 await createNotification(adminId, {
                    type: 'payment',
                    title: 'Payment for Review',
                    description: `${userData.businessName} (ID: ${userData.clientId}) submitted payment proof.`,
                    data: { userId: userId, paymentId: paymentId }
                });
            }
        }
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
