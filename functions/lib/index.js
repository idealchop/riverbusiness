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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onfileupload = exports.onpaymentupdate = exports.ondeliveryupdate = exports.ondeliverycreate = void 0;
const app_1 = require("firebase-admin/app");
const storage_1 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
// Initialize Firebase Admin SDK first
(0, app_1.initializeApp)();
const storage_2 = require("firebase-functions/v2/storage");
const firestore_2 = require("firebase-functions/v2/firestore");
const email_1 = require("./email");
// Export all billing functions
__exportStar(require("./billing"), exports);
/**
 * Creates a notification document in a user's notification subcollection.
 */
async function createNotification(userId, notificationData) {
    if (!userId)
        return;
    const db = (0, firestore_1.getFirestore)();
    const notification = Object.assign(Object.assign({}, notificationData), { userId, date: firestore_1.FieldValue.serverTimestamp(), isRead: false });
    try {
        await db.collection('users').doc(userId).collection('notifications').add(notification);
        logger.info(`Notification created for user ${userId}: ${notificationData.title}`);
    }
    catch (error) {
        logger.error(`Failed to create notification for user ${userId}`, error);
    }
}
// --- TRIGGERS ---
exports.ondeliverycreate = (0, firestore_2.onDocumentCreated)("users/{userId}/deliveries/{deliveryId}", async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    const delivery = event.data.data();
    logger.info(`Triggered ondeliverycreate for user: ${userId}, delivery: ${deliveryId}`);
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    await createNotification(userId, {
        type: 'delivery',
        title: 'Delivery Scheduled',
        description: `Delivery of ${delivery.volumeContainers} containers scheduled.`,
        data: { deliveryId }
    });
    if (userData === null || userData === void 0 ? void 0 : userData.email) {
        logger.info(`Attempting to send delivery email to ${userData.email}`);
        const template = (0, email_1.getDeliveryStatusTemplate)(userData.businessName, 'Scheduled', deliveryId, delivery.volumeContainers);
        await (0, email_1.sendEmail)({
            to: userData.email,
            subject: template.subject,
            text: `Delivery ${deliveryId} scheduled.`,
            html: template.html
        });
    }
    else {
        logger.warn(`No email found for user ${userId}, skipping email.`);
    }
});
exports.ondeliveryupdate = (0, firestore_2.onDocumentUpdated)("users/{userId}/deliveries/{deliveryId}", async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    if (before.status === after.status)
        return;
    logger.info(`Triggered ondeliveryupdate for user: ${userId}, delivery: ${deliveryId}. Status: ${before.status} -> ${after.status}`);
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    await createNotification(userId, {
        type: 'delivery',
        title: `Delivery ${after.status}`,
        description: `Your delivery is now ${after.status}.`,
        data: { deliveryId }
    });
    if (userData === null || userData === void 0 ? void 0 : userData.email) {
        logger.info(`Attempting to send delivery update email to ${userData.email}`);
        const template = (0, email_1.getDeliveryStatusTemplate)(userData.businessName, after.status, deliveryId, after.volumeContainers);
        await (0, email_1.sendEmail)({
            to: userData.email,
            subject: template.subject,
            text: `Delivery ${after.status}.`,
            html: template.html
        });
    }
});
exports.onpaymentupdate = (0, firestore_2.onDocumentUpdated)("users/{userId}/payments/{paymentId}", async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    const paymentId = event.params.paymentId;
    if (before.status === after.status)
        return;
    logger.info(`Triggered onpaymentupdate for user: ${userId}, payment: ${paymentId}. Status: ${before.status} -> ${after.status}`);
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (before.status === 'Pending Review' && after.status === 'Paid') {
        await createNotification(userId, {
            type: 'payment',
            title: 'Payment Confirmed',
            description: `Payment for invoice ${after.id} confirmed.`,
            data: { paymentId: after.id }
        });
        if (userData === null || userData === void 0 ? void 0 : userData.email) {
            logger.info(`Attempting to send payment confirmation email to ${userData.email}`);
            const template = (0, email_1.getPaymentStatusTemplate)(userData.businessName, after.id, after.amount, 'Paid');
            await (0, email_1.sendEmail)({
                to: userData.email,
                subject: template.subject,
                text: `Payment confirmed.`,
                html: template.html
            });
        }
    }
});
exports.onfileupload = (0, storage_2.onObjectFinalized)({ memory: "256MiB" }, async (event) => {
    var _a;
    const filePath = event.data.name;
    if (!filePath || ((_a = event.data.contentType) === null || _a === void 0 ? void 0 : _a.startsWith('application/x-directory')))
        return;
    logger.info(`File uploaded: ${filePath}`);
    const storage = (0, storage_1.getStorage)();
    const db = (0, firestore_1.getFirestore)();
    const bucket = storage.bucket(event.data.bucket);
    const file = bucket.file(filePath);
    // Create a long-lived signed URL
    const [url] = await file.getSignedUrl({ action: "read", expires: "01-01-2500" });
    if (filePath.startsWith("users/") && filePath.includes("/profile/")) {
        const userId = filePath.split("/")[1];
        logger.info(`Updating profile photo for user: ${userId}`);
        await db.collection("users").doc(userId).update({ photoURL: url });
    }
    else if (filePath.startsWith("users/") && filePath.includes("/payments/")) {
        const customMetadata = event.data.metadata;
        if ((customMetadata === null || customMetadata === void 0 ? void 0 : customMetadata.paymentId) && (customMetadata === null || customMetadata === void 0 ? void 0 : customMetadata.userId)) {
            logger.info(`Updating payment proof for user: ${customMetadata.userId}, invoice: ${customMetadata.paymentId}`);
            await db.collection("users").doc(customMetadata.userId).collection("payments").doc(customMetadata.paymentId).update({
                proofOfPaymentUrl: url,
                status: "Pending Review"
            });
        }
    }
});
//# sourceMappingURL=index.js.map