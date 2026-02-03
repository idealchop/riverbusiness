"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onfileupload = exports.onrefillrequestcreate = exports.ontopuprequestupdate = exports.onpaymentupdate = exports.ondeliveryupdate = exports.ondeliverycreate = void 0;
exports.createNotification = createNotification;
const storage_1 = require("firebase-functions/v2/storage");
const firestore_1 = require("firebase-functions/v2/firestore");
const storage_2 = require("firebase-admin/storage");
const firestore_2 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const email_1 = require("./email");
__exportStar(require("./billing"), exports);
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
const storage = (0, storage_2.getStorage)();
const containerToLiter = (containers) => (containers || 0) * 19.5;
async function getAdminId() {
    const adminQuery = await db.collection('users').where('email', '==', 'admin@riverph.com').limit(1).get();
    return !adminQuery.empty ? adminQuery.docs[0].id : null;
}
async function createNotification(userId, notificationData) {
    if (!userId)
        return;
    const notification = Object.assign(Object.assign({}, notificationData), { userId, date: firestore_2.FieldValue.serverTimestamp(), isRead: false });
    await db.collection('users').doc(userId).collection('notifications').add(notification);
}
// --- TRIGGERS ---
exports.ondeliverycreate = (0, firestore_1.onDocumentCreated)("users/{userId}/deliveries/{deliveryId}", async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const delivery = event.data.data();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    await createNotification(userId, { type: 'delivery', title: 'Delivery Scheduled', description: `Delivery of ${delivery.volumeContainers} containers scheduled.`, data: { deliveryId: event.params.deliveryId } });
    if (userData === null || userData === void 0 ? void 0 : userData.email) {
        const template = (0, email_1.getDeliveryStatusTemplate)(userData.businessName, 'Scheduled', event.params.deliveryId, delivery.volumeContainers);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Delivery ${event.params.deliveryId} scheduled.`, html: template.html });
    }
});
exports.ondeliveryupdate = (0, firestore_1.onDocumentUpdated)("users/{userId}/deliveries/{deliveryId}", async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.status === after.status)
        return;
    const userId = event.params.userId;
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    await createNotification(userId, { type: 'delivery', title: `Delivery ${after.status}`, description: `Your delivery is now ${after.status}.`, data: { deliveryId: event.params.deliveryId } });
    if (userData === null || userData === void 0 ? void 0 : userData.email) {
        const template = (0, email_1.getDeliveryStatusTemplate)(userData.businessName, after.status, event.params.deliveryId, after.volumeContainers);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Delivery ${after.status}.`, html: template.html });
    }
});
exports.onpaymentupdate = (0, firestore_1.onDocumentUpdated)("users/{userId}/payments/{paymentId}", async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.status === after.status)
        return;
    const userId = event.params.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (before.status === 'Pending Review' && after.status === 'Paid') {
        await createNotification(userId, { type: 'payment', title: 'Payment Confirmed', description: `Payment for invoice ${after.id} confirmed.`, data: { paymentId: after.id } });
        if (userData === null || userData === void 0 ? void 0 : userData.email) {
            const template = (0, email_1.getPaymentStatusTemplate)(userData.businessName, after.id, after.amount, 'Paid');
            await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Payment confirmed.`, html: template.html });
        }
    }
});
exports.ontopuprequestupdate = (0, firestore_1.onDocumentUpdated)("users/{userId}/topUpRequests/{requestId}", async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.status === after.status || after.status !== 'Approved')
        return;
    const userId = event.params.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData === null || userData === void 0 ? void 0 : userData.email) {
        const template = (0, email_1.getTopUpConfirmationTemplate)(userData.businessName, after.amount);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Credits added.`, html: template.html });
    }
});
exports.onrefillrequestcreate = (0, firestore_1.onDocumentCreated)("users/{userId}/refillRequests/{requestId}", async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData === null || userData === void 0 ? void 0 : userData.email) {
        const template = (0, email_1.getRefillRequestTemplate)(userData.businessName, 'Requested', event.params.requestId);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Refill request received.`, html: template.html });
    }
});
exports.onfileupload = (0, storage_1.onObjectFinalized)({ cpu: "memory" }, async (event) => {
    var _a;
    const filePath = event.data.name;
    if (!filePath || ((_a = event.data.contentType) === null || _a === void 0 ? void 0 : _a.startsWith('application/x-directory')))
        return;
    const bucket = storage.bucket(event.data.bucket);
    const file = bucket.file(filePath);
    const [url] = await file.getSignedUrl({ action: "read", expires: "01-01-2500" });
    if (filePath.startsWith("users/") && filePath.includes("/profile/")) {
        const userId = filePath.split("/")[1];
        await db.collection("users").doc(userId).update({ photoURL: url });
    }
    else if (filePath.startsWith("users/") && filePath.includes("/payments/")) {
        const customMetadata = event.data.metadata;
        if ((customMetadata === null || customMetadata === void 0 ? void 0 : customMetadata.paymentId) && (customMetadata === null || customMetadata === void 0 ? void 0 : customMetadata.userId)) {
            await db.collection("users").doc(customMetadata.userId).collection("payments").doc(customMetadata.paymentId).update({ proofOfPaymentUrl: url, status: "Pending Review" });
        }
    }
});
//# sourceMappingURL=index.js.map