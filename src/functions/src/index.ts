'use server';
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentUpdated, onDocumentCreated, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue, Timestamp, increment } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import * as path from 'path';
import type { Notification, Delivery, RefillRequest } from './types';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';


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
  try {
    const notificationWithMeta = {
        ...notificationData,
        userId: userId,
        date: FieldValue.serverTimestamp(),
        isRead: false,
    };
    await db.collection('users').doc(userId).collection('notifications').add(notificationWithMeta);
    logger.info(`Notification created for user ${userId}: ${notificationData.title}`);
  } catch (error) {
      logger.error(`Failed to create notification for user ${userId}`, error);
  }
}

// --- DEDICATED HELPER FOR BRANCH DELIVERIES ---
async function handleBranchDeliveryCreate(event: functions.firestore.FirestoreEvent<QueryDocumentSnapshot | undefined>, branchUserData: admin.firestore.DocumentData) {
    if (!event.data) return;
    const branchUserId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    const deliveryData = event.data.data() as Delivery;
    const parentId = branchUserData.parentId;

    logger.info(`[handleBranchDeliveryCreate] Branch delivery detected. User: ${branchUserId}, Parent: ${parentId}`);

    const parentRef = db.collection('users').doc(parentId);
    
    // Step 1: COPY THE DELIVERY RECORD to the parent's subcollection.
    try {
        const parentDeliveryRef = parentRef.collection('branchDeliveries').doc(deliveryId);
        const deliveryDataForParent = { ...deliveryData, parentId: parentId }; 
        await parentDeliveryRef.set(deliveryDataForParent);
        logger.info(`[handleBranchDeliveryCreate] SUCCESS: Copied delivery ${deliveryId} to parent ${parentId}'s branchDeliveries.`);
    } catch (error) {
         logger.error(`[handleBranchDeliveryCreate] CRITICAL: Failed to copy delivery record to parent ${parentId}. Error:`, error);
         return; // Stop if copy fails
    }

    // Step 2: PROCESS BILLING.
    try {
        const parentDoc = await parentRef.get();
        if (!parentDoc.exists()) {
            logger.error(`[handleBranchDeliveryCreate] Parent user ${parentId} not found during billing step.`);
            return;
        }
        const parentData = parentDoc.data()!;
        const litersDelivered = containerToLiter(deliveryData.volumeContainers);
        const pricePerLiter = parentData.plan?.price || 0;
        const deliveryCost = litersDelivered * pricePerLiter;

        if (deliveryCost > 0) {
            const billingBatch = db.batch();
            billingBatch.update(parentRef, { topUpBalanceCredits: increment(-deliveryCost) });
            const transactionRef = parentRef.collection('transactions').doc();
            billingBatch.set(transactionRef, {
                id: transactionRef.id,
                date: deliveryData.date,
                type: 'Debit',
                amountCredits: deliveryCost,
                description: `Delivery to ${branchUserData.businessName}`,
                branchId: branchUserId,
                branchName: branchUserData.businessName,
            });
            await billingBatch.commit();
            logger.info(`[handleBranchDeliveryCreate] SUCCESS: Processed billing for parent ${parentId}. Cost: ${deliveryCost}`);

             // 3. NOTIFY PARENT about the deduction and delivery.
            await createNotification(parentId, {
                type: 'delivery',
                title: 'Branch Consumption',
                description: `₱${deliveryCost.toFixed(2)} deducted for delivery to ${branchUserData.businessName}.`,
                data: { deliveryId: deliveryId, branchUserId: branchUserId },
            });
        }
    } catch (billingError) {
        logger.error(`[handleBranchDeliveryCreate] CRITICAL: Billing/notification logic failed for parent ${parentId}. Error:`, billingError);
    }
}

// --- DEDICATED HELPER FOR SINGLE/PREPAID DELIVERIES ---
async function handleSingleUserDeliveryCreate(event: functions.firestore.FirestoreEvent<QueryDocumentSnapshot | undefined>, userData: admin.firestore.DocumentData) {
    if (!event.data) return;
    const userId = event.params.userId;
    const deliveryData = event.data.data() as Delivery;

    logger.info(`[handleSingleUserDeliveryCreate] Delivery for a non-branch user ${userId}.`);

    if (userData.accountType === 'Single' && !userData.isPrepaid && !userData.plan?.isConsumptionBased) {
        try {
            const litersDelivered = containerToLiter(deliveryData.volumeContainers);
            await db.collection('users').doc(userId).update({
                totalConsumptionLiters: increment(-litersDelivered)
            });
            logger.info(`[handleSingleUserDeliveryCreate] Decremented liter balance for fixed-plan user ${userId}.`);
        } catch (e) {
            logger.error(`[handleSingleUserDeliveryCreate] Failed to decrement liters for fixed-plan user ${userId}`, e);
        }
    }
}


/**
 * Main trigger function for delivery creation. Dispatches to dedicated handlers.
 */
export const ondeliverycreate = onDocumentCreated("users/{userId}/deliveries/{deliveryId}", async (event) => {
    logger.info(`[ondeliverycreate] Triggered for: ${event.data?.ref.path}`);
    if (!event.data) return;

    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    const deliveryData = event.data.data() as Delivery;
    
    // Always notify the user who received the delivery first, regardless of account type.
    try {
        await createNotification(userId, {
            type: 'delivery',
            title: 'Delivery Scheduled',
            description: `A new delivery of ${deliveryData.volumeContainers} containers has been scheduled.`,
            data: { deliveryId: deliveryId },
        });
    } catch (e) {
         logger.error(`[ondeliverycreate] Failed to create initial notification for user ${userId}`, e);
    }
    
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
        logger.error(`[ondeliverycreate] User document ${userId} not found.`);
        return;
    }
    const userData = userDoc.data()!;

    // === DISPATCH TO THE CORRECT DEDICATED FUNCTION ===
    if (userData.accountType === 'Branch' && userData.parentId) {
        await handleBranchDeliveryCreate(event, userData);
    } else {
        await handleSingleUserDeliveryCreate(event, userData);
    }
});


// --- DEDICATED HELPER FOR BRANCH DELIVERY UPDATES ---
async function handleBranchDeliveryUpdate(event: functions.firestore.Change<QueryDocumentSnapshot>) {
    const after = event.after.data() as Delivery;
    const branchUserId = event.params.userId;
    const deliveryId = event.params.deliveryId;

    const branchUserDoc = await db.collection('users').doc(branchUserId).get();
    if (!branchUserDoc.exists()) {
        logger.error(`[handleBranchDeliveryUpdate] Branch user document not found for userId: ${branchUserId}.`);
        return;
    }
    const branchUserData = branchUserDoc.data()!;
    
    if (branchUserData.accountType === 'Branch' && branchUserData.parentId) {
        const parentId = branchUserData.parentId;
        logger.info(`[handleBranchDeliveryUpdate] Updating status for branch delivery. User: ${branchUserId}, Parent: ${parentId}.`);
        const parentDeliveryRef = db.collection('users').doc(parentId).collection('branchDeliveries').doc(deliveryId);
        await parentDeliveryRef.update({ status: after.status });
        logger.info(`[handleBranchDeliveryUpdate] SUCCESS: Updated status to "${after.status}" on parent's copy of delivery ${deliveryId}.`);
    }
}

/**
 * Main trigger function for delivery updates. Dispatches to dedicated handlers.
 */
export const ondeliveryupdate = onDocumentUpdated("users/{userId}/deliveries/{deliveryId}", async (event) => {
    if (!event.data) return;

    const before = event.data.before.data();
    const after = event.data.after.data() as Delivery;

    if (before.status === after.status) return; // No change, do nothing.
    
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;

    // Always notify the primary user of the status change.
    try {
        await createNotification(userId, {
            type: 'delivery',
            title: `Delivery ${after.status}`,
            description: `Your delivery of ${after.volumeContainers} containers is now ${after.status}.`,
            data: { deliveryId: deliveryId }
        });
    } catch(e) {
        logger.error(`[ondeliveryupdate] Failed to create status update notification for user ${userId}`, e);
    }

    // Call the dedicated handler for branch logic. This will check if it's a branch user inside.
    await handleBranchDeliveryUpdate(event.data);
});


/**
 * Cloud Function to notify admin when a user submits a payment for review.
 */
export const onpaymentcreate = onDocumentCreated("users/{userId}/payments/{paymentId}", async (event) => {
  try {
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
  } catch (error) {
      logger.error(`Error in onpaymentcreate for event ID ${event.id}:`, error);
  }
});


/**
 * Cloud Function to notify users and admin when a payment status is updated.
 */
export const onpaymentupdate = onDocumentUpdated("users/{userId}/payments/{paymentId}", async (event) => {
  try {
    if (!event.data) return;

    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.status === after.status) return;

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

    if (before.status === 'Pending Review' && after.status === 'Paid') {
        userNotification = { type: 'payment', title: 'Payment Confirmed', description: `Your payment for invoice ${payment.id} has been confirmed. Thank you!`, data: { paymentId: payment.id }};
        adminNotification = { type: 'payment', title: 'Payment Approved', description: `You approved a payment of ₱${payment.amount.toFixed(2)} from ${userData.businessName}.`, data: { userId, paymentId: payment.id }};
    } 
    else if (before.status === 'Pending Review' && after.status === 'Upcoming') {
        userNotification = { type: 'payment', title: 'Payment Action Required', description: `Your payment for invoice ${payment.id} requires attention. Reason: ${payment.rejectionReason || 'Please contact support.'}`, data: { paymentId: payment.id }};
        adminNotification = { type: 'payment', title: 'Payment Rejected', description: `You rejected a payment from ${userData.businessName}. Reason: ${payment.rejectionReason || 'Not specified'}.`, data: { userId, paymentId: payment.id }};
    }
    else if ((before.status === 'Upcoming' || before.status === 'Overdue') && after.status === 'Pending Review') {
         adminNotification = { type: 'payment', title: 'Payment for Review', description: `${userData.businessName} has submitted a proof of payment.`, data: { userId, paymentId: payment.id }};
    }
    
    const promises = [];
    if (userNotification) promises.push(createNotification(userId, userNotification));
    if (adminNotification && adminId) promises.push(createNotification(adminId, adminNotification));
    await Promise.all(promises);

  } catch(error) {
     logger.error(`Error in onpaymentupdate for event ID ${event.id}:`, error);
  }
});

/**
 * Cloud Function to notify admin on user-submitted top-up requests.
 */
export const ontopuprequestcreate = onDocumentCreated("users/{userId}/topUpRequests/{requestId}", async (event) => {
  try {
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
  } catch (error) {
     logger.error(`Error in ontopuprequestcreate for event ID ${event.id}:`, error);
  }
});


/**
 * Cloud Function to handle admin updates to top-up requests and notify users.
 */
export const ontopuprequestupdate = onDocumentUpdated("users/{userId}/topUpRequests/{requestId}", async (event) => {
  try {
    if (!event.data) return;

    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.status !== 'Pending Review' || before.status === after.status) return;

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
    const promises: Promise<any>[] = [];

    if (after.status === 'Approved') {
        userNotification = { type: 'top-up', title: 'Top-Up Successful', description: `Your top-up of ₱${requestData.amount.toLocaleString()} has been approved.`, data: { requestId: event.params.requestId }};
        adminNotification = { type: 'top-up', title: 'Top-Up Approved', description: `You approved a ₱${requestData.amount.toLocaleString()} top-up for ${userData.businessName}.`, data: { userId, requestId: event.params.requestId }};
        
        promises.push(db.collection('users').doc(userId).update({
            topUpBalanceCredits: increment(requestData.amount)
        }));

    } else if (after.status === 'Rejected') {
        userNotification = { type: 'top-up', title: 'Top-Up Rejected', description: `Your top-up request was rejected. Reason: ${requestData.rejectionReason || 'Not specified'}.`, data: { requestId: event.params.requestId }};
        adminNotification = { type: 'top-up', title: 'Top-Up Rejected', description: `You rejected a top-up request from ${userData.businessName}.`, data: { userId, requestId: event.params.requestId }};
    }

    if (userNotification) promises.push(createNotification(userId, userNotification));
    if (adminNotification && adminId) promises.push(createNotification(adminId, adminNotification));
    await Promise.all(promises);

  } catch(error) {
     logger.error(`Error in ontopuprequestupdate for event ID ${event.id}:`, error);
  }
});


/**
 * Cloud Function to notify user/admin on refill request creation.
 */
export const onrefillrequestcreate = onDocumentCreated("users/{userId}/refillRequests/{requestId}", async (event) => {
  try {
    if (!event.data) return;

    const userId = event.params.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) return;

    // Notify user
    await createNotification(userId, {
        type: 'delivery',
        title: 'Refill Request Received',
        description: 'We have received your refill request and will process it shortly.',
        data: { requestId: event.params.requestId },
    });

    // Notify admin
    const adminId = await getAdminId();
    if (adminId) {
        await createNotification(adminId, {
            type: 'delivery',
            title: 'New Refill Request',
            description: `${userData.businessName} has submitted a new refill request.`,
            data: { userId, requestId: event.params.requestId },
        });
    }
  } catch (error) {
      logger.error(`Error in onrefillrequestcreate for event ID ${event.id}:`, error);
  }
});


/**
 * Cloud Function to notify user/admin on refill request status updates.
 */
export const onrefillrequestupdate = onDocumentUpdated("users/{userId}/refillRequests/{requestId}", async (event) => {
  try {
    if (!event.data) return;
    const before = event.data.before.data() as RefillRequest;
    const after = event.data.after.data() as RefillRequest;

    if (before.status === after.status) return;

    const userId = event.params.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData) return;

    // Notify user
    await createNotification(userId, {
        type: 'delivery',
        title: `Refill Status: ${after.status}`,
        description: `Your refill request is now ${after.status}.`,
        data: { requestId: event.params.requestId },
    });
    
    // Notify admin
    const adminId = await getAdminId();
    if (adminId) {
        await createNotification(adminId, {
            type: 'delivery',
            title: 'Refill Status Updated',
            description: `Request for ${userData.businessName} is now ${after.status}.`,
            data: { userId, requestId: event.params.requestId },
        });
    }

  } catch (error) {
      logger.error(`Error in onrefillrequestupdate for event ID ${event.id}:`, error);
  }
});


/**
 * Cloud Function to send notifications for sanitation visit creations.
 */
export const onsanitationvisitcreate = onDocumentCreated("users/{userId}/sanitationVisits/{visitId}", async (event) => {
  try {
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
  } catch (error) {
    logger.error(`Error in onsanitationvisitcreate for event ID ${event.id}:`, error);
  }
});

/**
 * Cloud Function to send notifications for sanitation visit updates.
 */
export const onsanitationvisitupdate = onDocumentUpdated("users/{userId}/sanitationVisits/{visitId}", async (event) => {
  try {
    if (!event.data) return;
    const userId = event.params.userId;
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.status === after.status) return;

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData) {
      logger.error(`User data not found for ${userId} in onsanitationvisitupdate.`);
      return;
    }

    const scheduledDate = new Date(after.scheduledDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });
    
    // --- User Notification ---
    let userTitle: string;
    let userDescription: string;

    if (after.status === 'Completed') {
        userTitle = 'Sanitation Visit Completed';
        userDescription = `Your sanitation report for ${scheduledDate} is complete. You can view the results now.`;
    } else if (after.status === 'Cancelled') {
        userTitle = 'Sanitation Visit Cancelled';
        userDescription = `Your sanitation visit for ${scheduledDate} has been cancelled. Please contact us if you have questions.`;
    } else { // Scheduled
        userTitle = `Sanitation Visit: ${after.status}`;
        userDescription = `Your sanitation visit for ${scheduledDate} has been updated to ${after.status}.`;
    }

    // Notify User
    await createNotification(userId, {
        type: 'sanitation',
        title: userTitle,
        description: userDescription,
        data: { visitId: event.params.visitId }
    });
    
    // Notify Admin
    const adminId = await getAdminId();
    if(adminId) {
        await createNotification(adminId, {
            type: 'sanitation',
            title: `Visit for ${userData.businessName}: ${after.status}`,
            description: `The sanitation visit on ${scheduledDate} is now ${after.status}.`,
            data: { userId, visitId: event.params.visitId }
        });
    }
  } catch(error) {
     logger.error(`Error in onsanitationvisitupdate for event ID ${event.id}:`, error);
  }
});


/**
 * Cloud Function to notify admin on user profile changes.
 */
export const onuserupdate = onDocumentUpdated("users/{userId}", async (event) => {
  try {
    if (!event.data) return;

    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    const adminId = await getAdminId();
    
    if (!adminId || userId === adminId) return; 

    if (!before.pendingPlan && after.pendingPlan) {
        await createNotification(adminId, {
            type: 'general',
            title: 'Plan Change Request',
            description: `${after.businessName} has requested to change their plan to ${after.pendingPlan.name}.`,
            data: { userId: userId }
        });
    }

    if (before.customPlanDetails?.autoRefillEnabled !== after.customPlanDetails?.autoRefillEnabled) {
         await createNotification(adminId, {
            type: 'general',
            title: 'Auto-Refill Changed',
            description: `${after.businessName} has ${after.customPlanDetails.autoRefillEnabled ? 'enabled' : 'disabled'} auto-refill.`,
            data: { userId: userId }
        });
    }

    if (before.currentContractUrl !== after.currentContractUrl && after.currentContractUrl) {
        await createNotification(userId, {
            type: 'general',
            title: 'New Contract Uploaded',
            description: 'A new contract has been added to your account by an admin.',
            data: { userId: userId }
        });
        await createNotification(adminId, {
            type: 'general',
            title: 'Contract Added',
            description: `You have successfully added a contract for ${after.businessName}.`,
            data: { userId: userId }
        });
    }
  } catch(error) {
      logger.error(`Error in onuserupdate for event ID ${event.id}:`, error);
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

        // This will trigger onpaymentupdate, which handles notifications
        return;
    }
    
    // Handle compliance report uploads
    if (filePath.startsWith("stations/") && filePath.includes("/compliance/")) {
        const parts = filePath.split("/");
        const stationId = parts[1];
        const reportKey = path.basename(filePath).split('-')[0];
        const url = await getPublicUrl();

        const reportRef = db.collection("waterStations").doc(stationId).collection("complianceReports").doc(reportKey);
        await reportRef.update({ reportUrl: url });
        logger.log(`Updated compliance report URL for report '${reportKey}' for station: ${stationId}`);

        // Notify all users assigned to this station
        const usersSnapshot = await db.collection('users').where('assignedWaterStationId', '==', stationId).get();
        if (!usersSnapshot.empty) {
            const stationDoc = await db.collection('waterStations').doc(stationId).get();
            const stationName = stationDoc.data()?.name || 'your assigned station';
            const notificationPromises = usersSnapshot.docs.map(userDoc => 
                createNotification(userDoc.id, {
                    type: 'compliance',
                    title: 'New Compliance Report',
                    description: `A new water quality report is available for ${stationName}.`,
                    data: { stationId }
                })
            );
            await Promise.all(notificationPromises);
            logger.log(`Sent compliance notifications to ${usersSnapshot.size} users for station ${stationId}.`);
        }
        return;
    }


    logger.log(`File path ${filePath} did not match any handler.`);

  } catch (error) {
    logger.error(`Failed to process upload for ${filePath}.`, error);
  }
});
