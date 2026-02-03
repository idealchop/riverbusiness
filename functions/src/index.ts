import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK first
initializeApp();

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import type { Delivery } from './types';
import { 
    sendEmail, 
    getDeliveryStatusTemplate, 
    getPaymentStatusTemplate, 
    getTopUpConfirmationTemplate,
    getRefillRequestTemplate
} from './email';

// Export all billing functions
export * from './billing';

/**
 * Creates a notification document in a user's notification subcollection.
 */
async function createNotification(userId: string, notificationData: any) {
  if (!userId) return;
  const db = getFirestore();
  const notification = { 
    ...notificationData, 
    userId, 
    date: FieldValue.serverTimestamp(), 
    isRead: false 
  };
  try {
    await db.collection('users').doc(userId).collection('notifications').add(notification);
    logger.info(`Notification created for user ${userId}: ${notificationData.title}`);
  } catch (error) {
    logger.error(`Failed to create notification for user ${userId}`, error);
  }
}

// --- TRIGGERS ---

export const ondeliverycreate = onDocumentCreated("users/{userId}/deliveries/{deliveryId}", async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    const delivery = event.data.data() as Delivery;
    
    logger.info(`Triggered ondeliverycreate for user: ${userId}, delivery: ${deliveryId}`);

    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    await createNotification(userId, { 
        type: 'delivery', 
        title: 'Delivery Scheduled', 
        description: `Delivery of ${delivery.volumeContainers} containers scheduled.`, 
        data: { deliveryId } 
    });

    if (userData?.email) {
        logger.info(`Attempting to send delivery email to ${userData.email}`);
        const template = getDeliveryStatusTemplate(userData.businessName, 'Scheduled', deliveryId, delivery.volumeContainers);
        await sendEmail({ 
            to: userData.email, 
            subject: template.subject, 
            text: `Delivery ${deliveryId} scheduled.`, 
            html: template.html 
        });
    } else {
        logger.warn(`No email found for user ${userId}, skipping email.`);
    }
});

export const ondeliveryupdate = onDocumentUpdated("users/{userId}/deliveries/{deliveryId}", async (event) => {
    if (!event.data) return;
    const before = event.data.before.data();
    const after = event.data.after.data() as Delivery;
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;

    if (before.status === after.status) return;

    logger.info(`Triggered ondeliveryupdate for user: ${userId}, delivery: ${deliveryId}. Status: ${before.status} -> ${after.status}`);

    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    await createNotification(userId, { 
        type: 'delivery', 
        title: `Delivery ${after.status}`, 
        description: `Your delivery is now ${after.status}.`, 
        data: { deliveryId } 
    });

    if (userData?.email) {
        logger.info(`Attempting to send delivery update email to ${userData.email}`);
        const template = getDeliveryStatusTemplate(userData.businessName, after.status, deliveryId, after.volumeContainers);
        await sendEmail({ 
            to: userData.email, 
            subject: template.subject, 
            text: `Delivery ${after.status}.`, 
            html: template.html 
        });
    }
});

export const onpaymentupdate = onDocumentUpdated("users/{userId}/payments/{paymentId}", async (event) => {
    if (!event.data) return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    const paymentId = event.params.paymentId;

    if (before.status === after.status) return;

    logger.info(`Triggered onpaymentupdate for user: ${userId}, payment: ${paymentId}. Status: ${before.status} -> ${after.status}`);

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (before.status === 'Pending Review' && after.status === 'Paid') {
        await createNotification(userId, { 
            type: 'payment', 
            title: 'Payment Confirmed', 
            description: `Payment for invoice ${after.id} confirmed.`, 
            data: { paymentId: after.id }
        });
        if (userData?.email) {
            logger.info(`Attempting to send payment confirmation email to ${userData.email}`);
            const template = getPaymentStatusTemplate(userData.businessName, after.id, after.amount, 'Paid');
            await sendEmail({ 
                to: userData.email, 
                subject: template.subject, 
                text: `Payment confirmed.`, 
                html: template.html 
            });
        }
    }
});

export const onfileupload = onObjectFinalized({ memory: "256MiB" }, async (event) => {
  const filePath = event.data.name;
  if (!filePath || event.data.contentType?.startsWith('application/x-directory')) return;

  logger.info(`File uploaded: ${filePath}`);

  const storage = getStorage();
  const db = getFirestore();
  const bucket = storage.bucket(event.data.bucket);
  const file = bucket.file(filePath);
  
  // Create a long-lived signed URL
  const [url] = await file.getSignedUrl({ action: "read", expires: "01-01-2500" });

  if (filePath.startsWith("users/") && filePath.includes("/profile/")) {
      const userId = filePath.split("/")[1];
      logger.info(`Updating profile photo for user: ${userId}`);
      await db.collection("users").doc(userId).update({ photoURL: url });
  } else if (filePath.startsWith("users/") && filePath.includes("/payments/")) {
      const customMetadata = event.data.metadata;
      if (customMetadata?.paymentId && customMetadata?.userId) {
          logger.info(`Updating payment proof for user: ${customMetadata.userId}, invoice: ${customMetadata.paymentId}`);
          await db.collection("users").doc(customMetadata.userId).collection("payments").doc(customMetadata.paymentId).update({ 
              proofOfPaymentUrl: url, 
              status: "Pending Review" 
          });
      }
  }
});
