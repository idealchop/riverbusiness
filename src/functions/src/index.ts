

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import * as path from 'path';
import type { Notification } from './types';


// Import all exports from billing.ts
import * as billing from './billing';

// Export all billing functions so they are deployed
export * from './billing';

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();
const storage = getStorage();

/**
 * Creates a notification document in a user's notification subcollection.
 */
async function createNotification(userId: string, notificationData: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'>) {
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

    const userId = event.params.userId;
    const delivery = event.data.data();

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
    const after = event.data.after.data();

    // Only notify if the status has changed.
    if (before.status === after.status) {
        return;
    }
    
    const userId = event.params.userId;
    const delivery = after;

    const notification = {
        type: 'delivery',
        title: `Delivery ${delivery.status}`,
        description: `Delivery of ${delivery.volumeContainers} containers is now ${delivery.status}.`,
        data: { deliveryId: event.params.deliveryId }
    };
    
    await createNotification(userId, notification);
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

    if (filePath.startsWith("users/") && filePath.includes("/deliveries/")) {
        const parts = filePath.split("/");
        const userId = parts[1];
        const deliveryId = path.basename(filePath).split('-')[0];
        const url = await getPublicUrl();
        await db.collection("users").doc(userId).collection("deliveries").doc(deliveryId).update({
            proofOfDeliveryUrl: url,
        });
        logger.log(`Updated proof for delivery: ${deliveryId} for user: ${userId}`);
        return;
    }

    if (filePath.startsWith("users/") && filePath.includes("/payments/")) {
        const parts = filePath.split("/");
        const userId = parts[1];
        const paymentId = path.basename(filePath).split('-')[0];
        const url = await getPublicUrl();
        const paymentRef = db.collection("users").doc(userId).collection("payments").doc(paymentId);
        await paymentRef.update({
            proofOfPaymentUrl: url,
            status: "Pending Review",
        });
        logger.log(`Updated proof for payment: ${paymentId} for user: ${userId}`);
        
        await createNotification(userId, {
            type: 'payment',
            title: 'Payment Under Review',
            description: `Your payment proof for invoice ${paymentId} is under review.`,
            data: { paymentId: paymentId }
        });
        return;
    }
    
    if (filePath.startsWith("users/") && filePath.includes("/sanitationVisits/")) {
        const parts = filePath.split("/");
        const userId = parts[1];
        const visitId = parts[3];
        const url = await getPublicUrl();
        await db.collection("users").doc(userId).collection("sanitationVisits").doc(visitId).update({
            reportUrl: url,
        });
        logger.log(`Updated report URL for sanitation visit: ${visitId} for user: ${userId}`);
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
