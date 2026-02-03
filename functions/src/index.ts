
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentUpdated, onDocumentCreated, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue, increment } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import * as path from 'path';
import type { Notification, Delivery, RefillRequest, Transaction } from './types';
import { 
    sendEmail, 
    getDeliveryStatusTemplate, 
    getPaymentStatusTemplate, 
    getTopUpConfirmationTemplate,
    getRefillRequestTemplate
} from './email';

export * from './billing';

initializeApp();
const db = getFirestore();
const storage = getStorage();

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

async function getAdminId(): Promise<string | null> {
    const adminQuery = await db.collection('users').where('email', '==', 'admin@riverph.com').limit(1).get();
    return !adminQuery.empty ? adminQuery.docs[0].id : null;
}

export async function createNotification(userId: string, notificationData: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'>) {
  if (!userId) return;
  const notification = { ...notificationData, userId, date: FieldValue.serverTimestamp(), isRead: false };
  await db.collection('users').doc(userId).collection('notifications').add(notification);
}

// --- TRIGGERS ---

export const ondeliverycreate = onDocumentCreated("users/{userId}/deliveries/{deliveryId}", async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const delivery = event.data.data() as Delivery;
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    await createNotification(userId, { type: 'delivery', title: 'Delivery Scheduled', description: `Delivery of ${delivery.volumeContainers} containers scheduled.`, data: { deliveryId: event.params.deliveryId } });

    if (userData?.email) {
        const template = getDeliveryStatusTemplate(userData.businessName, 'Scheduled', event.params.deliveryId, delivery.volumeContainers);
        await sendEmail({ to: userData.email, subject: template.subject, text: `Delivery ${event.params.deliveryId} scheduled.`, html: template.html });
    }
});

export const ondeliveryupdate = onDocumentUpdated("users/{userId}/deliveries/{deliveryId}", async (event) => {
    if (!event.data) return;
    const before = event.data.before.data();
    const after = event.data.after.data() as Delivery;
    if (before.status === after.status) return;

    const userId = event.params.userId;
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    await createNotification(userId, { type: 'delivery', title: `Delivery ${after.status}`, description: `Your delivery is now ${after.status}.`, data: { deliveryId: event.params.deliveryId } });

    if (userData?.email) {
        const template = getDeliveryStatusTemplate(userData.businessName, after.status, event.params.deliveryId, after.volumeContainers);
        await sendEmail({ to: userData.email, subject: template.subject, text: `Delivery ${after.status}.`, html: template.html });
    }
});

export const onpaymentupdate = onDocumentUpdated("users/{userId}/payments/{paymentId}", async (event) => {
    if (!event.data) return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.status === after.status) return;

    const userId = event.params.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (before.status === 'Pending Review' && after.status === 'Paid') {
        await createNotification(userId, { type: 'payment', title: 'Payment Confirmed', description: `Payment for invoice ${after.id} confirmed.`, data: { paymentId: after.id }});
        if (userData?.email) {
            const template = getPaymentStatusTemplate(userData.businessName, after.id, after.amount, 'Paid');
            await sendEmail({ to: userData.email, subject: template.subject, text: `Payment confirmed.`, html: template.html });
        }
    }
});

export const ontopuprequestupdate = onDocumentUpdated("users/{userId}/topUpRequests/{requestId}", async (event) => {
    if (!event.data) return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.status === after.status || after.status !== 'Approved') return;

    const userId = event.params.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.email) {
        const template = getTopUpConfirmationTemplate(userData.businessName, after.amount);
        await sendEmail({ to: userData.email, subject: template.subject, text: `Credits added.`, html: template.html });
    }
});

export const onrefillrequestcreate = onDocumentCreated("users/{userId}/refillRequests/{requestId}", async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.email) {
        const template = getRefillRequestTemplate(userData.businessName, 'Requested', event.params.requestId);
        await sendEmail({ to: userData.email, subject: template.subject, text: `Refill request received.`, html: template.html });
    }
});

export const onfileupload = onObjectFinalized({ cpu: "memory" }, async (event) => {
  const filePath = event.data.name;
  if (!filePath || event.data.contentType?.startsWith('application/x-directory')) return;

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
