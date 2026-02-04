
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK first
initializeApp();

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import type { Delivery, RefillRequest, SanitationVisit } from './types';
import { 
    sendEmail, 
    getDeliveryStatusTemplate, 
    getPaymentStatusTemplate, 
    getTopUpConfirmationTemplate,
    getRefillRequestTemplate,
    getWelcomeUnclaimedTemplate,
    getSanitationScheduledTemplate,
    getSanitationReportTemplate,
    getPaymentReminderTemplate
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

/**
 * Triggered when an admin clicks the "Send Reminder" button.
 */
export const onpaymentremindercreate = onDocumentCreated({
    document: "users/{userId}/reminders/{reminderId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const db = getFirestore();
    
    const userDoc = await db.collection('users').doc(userId).get();
    const user = userDoc.data();
    
    if (!user || !user.email) return;

    // Find the latest unpaid payment or use estimated info
    const paymentsSnap = await db.collection('users').doc(userId).collection('payments').orderBy('date', 'desc').limit(1).get();
    let amount = "0.00";
    let period = "Current Period";

    if (!paymentsSnap.empty) {
        const p = paymentsSnap.docs[0].data();
        amount = p.amount.toFixed(2);
        period = p.description.replace('Bill for ', '').replace('Monthly Subscription for ', '');
    }

    const template = getPaymentReminderTemplate(user.businessName, amount, period);
    
    try {
        await sendEmail({
            to: user.email,
            subject: template.subject,
            text: `Reminder: Your statement for ${period} is ₱${amount}.`,
            html: template.html
        });
        logger.info(`Follow-up email sent to ${user.email}`);
    } catch (error) {
        logger.error(`Failed to send follow-up to ${user.email}`, error);
    }
});

/**
 * Triggered when a new unclaimed profile is created by an admin.
 */
export const onunclaimedprofilecreate = onDocumentCreated({
    document: "unclaimedProfiles/{clientId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const profile = event.data.data();
    
    if (!profile.businessEmail) return;

    const planName = `${profile.clientType || ''} - ${profile.plan?.name || ''}`;
    const schedule = `${profile.customPlanDetails?.deliveryDay || 'TBD'} / ${profile.customPlanDetails?.deliveryFrequency || 'TBD'}`;

    const template = getWelcomeUnclaimedTemplate(
        profile.businessName || profile.name || 'Valued Client',
        profile.clientId,
        planName,
        profile.address || 'N/A',
        schedule
    );

    try {
        await sendEmail({
            to: profile.businessEmail,
            subject: template.subject,
            text: `Welcome to River Philippines! Your Client ID is ${profile.clientId}.`,
            html: template.html
        });
    } catch (error) {
        logger.error(`Failed welcome email`, error);
    }
});

export const ondeliverycreate = onDocumentCreated({
    document: "users/{userId}/deliveries/{deliveryId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    const delivery = event.data.data() as Delivery;
    
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    await createNotification(userId, { 
        type: 'delivery', 
        title: 'Delivery Scheduled', 
        description: `Delivery of ${delivery.volumeContainers} containers scheduled.`, 
        data: { deliveryId } 
    });

    if (userData?.email && delivery.status === 'Delivered') {
        const template = getDeliveryStatusTemplate(userData.businessName, 'Delivered', deliveryId, delivery.volumeContainers);
        await sendEmail({ to: userData.email, subject: template.subject, text: `Delivery complete`, html: template.html });
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

    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    await createNotification(userId, { type: 'delivery', title: `Delivery ${after.status}`, description: `Your delivery is now ${after.status}.`, data: { deliveryId } });

    if (userData?.email && after.status === 'Delivered') {
        const template = getDeliveryStatusTemplate(userData.businessName, 'Delivered', deliveryId, after.volumeContainers);
        await sendEmail({ to: userData.email, subject: template.subject, text: `Delivery complete`, html: template.html });
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

    if (before.status === after.status) return;

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (before.status === 'Pending Review' && after.status === 'Paid') {
        await createNotification(userId, { type: 'payment', title: 'Payment Confirmed', description: `Payment for invoice ${after.id} confirmed.`, data: { paymentId: after.id } });
        if (userData?.email) {
            const template = getPaymentStatusTemplate(userData.businessName, after.id, after.amount, 'Paid');
            await sendEmail({ to: userData.email, subject: template.subject, text: `Payment confirmed`, html: template.html });
        }
    }
});

export const ontopuprequestupdate = onDocumentUpdated({
    document: "users/{userId}/topUpRequests/{requestId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;

    if (before.status === after.status || after.status !== 'Approved') return;

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.email) {
        const template = getTopUpConfirmationTemplate(userData.businessName, after.amount);
        await sendEmail({ to: userData.email, subject: template.subject, text: `Top-up approved`, html: template.html });
    }
});

export const onrefillrequestcreate = onDocumentCreated({
    document: "users/{userId}/refillRequests/{requestId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const requestId = event.params.requestId;
    const request = event.data.data() as RefillRequest;

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.email) {
        const template = getRefillRequestTemplate(userData.businessName, 'Requested', requestId, request.requestedDate);
        await sendEmail({ to: userData.email, subject: template.subject, text: `Refill request received`, html: template.html });
    }
});

export const onsanitationcreate = onDocumentCreated({
    document: "users/{userId}/sanitationVisits/{visitId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const visit = event.data.data() as SanitationVisit;
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.email && visit.status === 'Scheduled') {
        const dateStr = new Date(visit.scheduledDate as any).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const template = getSanitationScheduledTemplate(userData.businessName, visit.assignedTo, dateStr);
        await sendEmail({ to: userData.email, subject: template.subject, text: `Visit scheduled`, html: template.html });
    }
});

export const onsanitationupdate = onDocumentUpdated({
    document: "users/{userId}/sanitationVisits/{visitId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const before = event.data.before.data() as SanitationVisit;
    const after = event.data.after.data() as SanitationVisit;
    const userId = event.params.userId;

    if (before.status !== 'Completed' && after.status === 'Completed') {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (userData?.email) {
            const dateStr = new Date(after.scheduledDate as any).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const template = getSanitationReportTemplate(userData.businessName, after.assignedTo, dateStr);
            await sendEmail({ to: userData.email, subject: template.subject, text: `Report ready`, html: template.html });
        }
    }
});

export const onfileupload = onObjectFinalized({ memory: "256MiB" }, async (event) => {
  const filePath = event.data.name;
  if (!filePath || event.data.contentType?.startsWith('application/x-directory')) return;

  const storage = getStorage();
  const db = getFirestore();
  const bucket = storage.bucket(event.data.bucket);
  const file = bucket.file(filePath);
  
  const [url] = await file.getSignedUrl({ action: "read", expires: "01-01-2500" });

  if (filePath.startsWith("users/") && filePath.includes("/profile/")) {
      const userId = filePath.split("/")[1];
      await db.collection("users").doc(userId).update({ photoURL: url });
  } else if (filePath.startsWith("users/") && filePath.includes("/payments/")) {
      const customMetadata = event.data.metadata;
      if (customMetadata?.paymentId && customMetadata?.userId) {
          await db.collection("users").doc(customMetadata.userId).collection("payments").doc(customMetadata.paymentId).update({ proofOfPaymentUrl: url, status: "Pending Review" });
      }
  }
});
