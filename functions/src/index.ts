import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK first
initializeApp();

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import type { Delivery, RefillRequest, SanitationVisit, ComplianceReport } from './types';
import { 
    sendEmail, 
    getDeliveryStatusTemplate, 
    getPaymentStatusTemplate, 
    getTopUpConfirmationTemplate,
    getRefillRequestTemplate,
    getInternalRefillAlertTemplate,
    getSanitationReportTemplate,
    getComplianceAlertTemplate
} from './email';

// Export all billing functions (this includes generateMonthlyInvoices)
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

export const ondeliverycreate = onDocumentCreated({
    document: "users/{userId}/deliveries/{deliveryId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    const delivery = event.data.data() as Delivery;
    
    logger.info(`Triggered ondeliverycreate for user: ${userId}, delivery: ${deliveryId}`);

    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    // Always create in-app notification
    await createNotification(userId, { 
        type: 'delivery', 
        title: 'Delivery Scheduled', 
        description: `Delivery of ${delivery.volumeContainers} containers scheduled.`, 
        data: { deliveryId } 
    });

    // ONLY send email if status is 'Delivered' (Completed)
    if (userData?.email && delivery.status === 'Delivered') {
        const template = getDeliveryStatusTemplate(userData.businessName, 'Delivered', deliveryId, delivery.volumeContainers);
        await sendEmail({ 
            to: userData.email, 
            subject: template.subject, 
            text: `Delivery ${deliveryId} is complete.`, 
            html: template.html 
        });
    }
});

export const ondeliveryupdate = onDocumentUpdated({
    document: "users/{userId}/deliveries/{deliveryId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const before = event.data.before.data() as Delivery;
    const after = event.data.after.data() as Delivery;
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;

    if (before.status === after.status) return;

    logger.info(`Triggered ondeliveryupdate for user: ${userId}, delivery: ${deliveryId}. Status: ${before.status} -> ${after.status}`);

    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    // Always create in-app notification
    await createNotification(userId, { 
        type: 'delivery', 
        title: `Delivery ${after.status}`, 
        description: `Your delivery is now ${after.status}.`, 
        data: { deliveryId } 
    });

    // ONLY send email if status is now 'Delivered' (Completed)
    if (userData?.email && after.status === 'Delivered') {
        const template = getDeliveryStatusTemplate(userData.businessName, 'Delivered', deliveryId, after.volumeContainers);
        await sendEmail({ 
            to: userData.email, 
            subject: template.subject, 
            text: `Delivery ${deliveryId} is complete.`, 
            html: template.html 
        });
    }
});

export const onpaymentupdate = onDocumentUpdated({
    document: "users/{userId}/payments/{paymentId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
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

/**
 * Triggered when a top-up request status is updated (e.g., Approved).
 */
export const ontopuprequestupdate = onDocumentUpdated({
    document: "users/{userId}/topUpRequests/{requestId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;

    if (before.status === after.status || after.status !== 'Approved') return;

    logger.info(`Triggered ontopuprequestupdate for user: ${userId}. Status: Approved`);

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.email) {
        const template = getTopUpConfirmationTemplate(userData.businessName, after.amount);
        await sendEmail({ 
            to: userData.email, 
            subject: template.subject, 
            text: `Your top-up of ₱${after.amount} has been approved.`, 
            html: template.html 
        });
    }
});

/**
 * Triggered when a client creates a new one-time refill request.
 */
export const onrefillrequestcreate = onDocumentCreated({
    document: "users/{userId}/refillRequests/{requestId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const requestId = event.params.requestId;
    const request = event.data.data() as RefillRequest;

    logger.info(`Triggered onrefillrequestcreate for user: ${userId}, request: ${requestId}`);

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // 1. Notify the Client
    if (userData?.email) {
        const template = getRefillRequestTemplate(userData.businessName, 'Requested', requestId, request.requestedDate);
        await sendEmail({ 
            to: userData.email, 
            subject: template.subject, 
            text: `Refill request ${requestId} received.`, 
            html: template.html 
        }).catch(e => logger.error("Client refill email failed", e));
    }

    // 2. Notify the Internal Team (Jimbs and Jayvee)
    if (userData?.businessName) {
        const admins = [
            { name: 'Jimbs', email: 'jimbs.work@gmail.com' },
            { name: 'Jayvee', email: 'jayvee@riverph.com' }
        ];

        for (const admin of admins) {
            const adminTemplate = getInternalRefillAlertTemplate(admin.name, userData.businessName, requestId, request.requestedDate);
            await sendEmail({
                to: admin.email,
                subject: adminTemplate.subject,
                text: `${userData.businessName} requested a refill.`,
                html: adminTemplate.html
            }).catch(e => logger.error(`Internal admin alert failed for ${admin.name}`, e));
        }
    }
});

/**
 * Triggered when a sanitation visit is marked as Completed.
 */
export const onsanitationupdate = onDocumentUpdated({
    document: "users/{userId}/sanitationVisits/{visitId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const before = event.data.before.data() as SanitationVisit;
    const after = event.data.after.data() as SanitationVisit;
    const userId = event.params.userId;

    if (before.status !== 'Completed' && after.status === 'Completed') {
        logger.info(`Triggered onsanitationupdate for user: ${userId}. Status: Completed`);
        
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (userData?.email) {
            const dateStr = new Date(after.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const template = getSanitationReportTemplate(userData.businessName, after.assignedTo, dateStr);
            await sendEmail({
                to: userData.email,
                subject: template.subject,
                text: `Your sanitation report for ${dateStr} is ready.`,
                html: template.html
            });
        }
    }
});

/**
 * Triggered when a new compliance report is added to a station.
 * Notifies all users assigned to that station.
 */
export const oncompliancecreate = onDocumentCreated({
    document: "waterStations/{stationId}/complianceReports/{reportId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const stationId = event.params.stationId;
    const report = event.data.data() as ComplianceReport;

    logger.info(`Triggered oncompliancecreate for station: ${stationId}`);

    const db = getFirestore();
    const stationDoc = await db.collection("waterStations").doc(stationId).get();
    const stationData = stationDoc.data();

    // Find all users assigned to this station
    const usersSnapshot = await db.collection("users").where("assignedWaterStationId", "==", stationId).get();
    
    if (usersSnapshot.empty || !stationData) return;

    const emailPromises = usersSnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        if (userData.email) {
            const template = getComplianceAlertTemplate(userData.businessName, stationData.name, report.name);
            return sendEmail({
                to: userData.email,
                subject: template.subject,
                text: `New safety report available for ${stationData.name}.`,
                html: template.html
            }).catch(e => logger.error(`Compliance email failed for ${userData.businessName}`, e));
        }
        return null;
    });

    await Promise.all(emailPromises);
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
      await db.collection("users").doc(userId).update({ photoURL: url });
  } else if (filePath.startsWith("users/") && filePath.includes("/payments/")) {
      const customMetadata = event.data.metadata;
      if (customMetadata?.paymentId && customMetadata?.userId) {
          await db.collection("users").doc(customMetadata.userId).collection("payments").doc(customMetadata.paymentId).update({ 
              proofOfPaymentUrl: url, 
              status: "Pending Review" 
          });
      }
  }
});
