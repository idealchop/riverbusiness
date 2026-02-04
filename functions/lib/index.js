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
exports.onfileupload = exports.onsanitationupdate = exports.onsanitationcreate = exports.onrefillrequestcreate = exports.ontopuprequestupdate = exports.onpaymentupdate = exports.ondeliveryupdate = exports.ondeliverycreate = exports.onunclaimedprofilecreate = exports.onpaymentremindercreate = void 0;
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
/**
 * Triggered when an admin clicks the "Send Reminder" button.
 */
exports.onpaymentremindercreate = (0, firestore_2.onDocumentCreated)({
    document: "users/{userId}/reminders/{reminderId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const user = userDoc.data();
    if (!user || !user.email)
        return;
    // Find the latest unpaid payment or use estimated info
    const paymentsSnap = await db.collection('users').doc(userId).collection('payments').orderBy('date', 'desc').limit(1).get();
    let amount = "0.00";
    let period = "Current Period";
    if (!paymentsSnap.empty) {
        const p = paymentsSnap.docs[0].data();
        amount = p.amount.toFixed(2);
        period = p.description.replace('Bill for ', '').replace('Monthly Subscription for ', '');
    }
    const template = (0, email_1.getPaymentReminderTemplate)(user.businessName, amount, period);
    try {
        await (0, email_1.sendEmail)({
            to: user.email,
            subject: template.subject,
            text: `Reminder: Your statement for ${period} is ₱${amount}.`,
            html: template.html
        });
        logger.info(`Follow-up email sent to ${user.email}`);
    }
    catch (error) {
        logger.error(`Failed to send follow-up to ${user.email}`, error);
    }
});
/**
 * Triggered when a new unclaimed profile is created by an admin.
 */
exports.onunclaimedprofilecreate = (0, firestore_2.onDocumentCreated)({
    document: "unclaimedProfiles/{clientId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    var _a, _b, _c;
    if (!event.data)
        return;
    const profile = event.data.data();
    if (!profile.businessEmail)
        return;
    const planName = `${profile.clientType || ''} - ${((_a = profile.plan) === null || _a === void 0 ? void 0 : _a.name) || ''}`;
    const schedule = `${((_b = profile.customPlanDetails) === null || _b === void 0 ? void 0 : _b.deliveryDay) || 'TBD'} / ${((_c = profile.customPlanDetails) === null || _c === void 0 ? void 0 : _c.deliveryFrequency) || 'TBD'}`;
    const template = (0, email_1.getWelcomeUnclaimedTemplate)(profile.businessName || profile.name || 'Valued Client', profile.clientId, planName, profile.address || 'N/A', schedule);
    try {
        await (0, email_1.sendEmail)({
            to: profile.businessEmail,
            subject: template.subject,
            text: `Welcome to River Philippines! Your Client ID is ${profile.clientId}.`,
            html: template.html
        });
    }
    catch (error) {
        logger.error(`Failed welcome email`, error);
    }
});
exports.ondeliverycreate = (0, firestore_2.onDocumentCreated)({
    document: "users/{userId}/deliveries/{deliveryId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    const delivery = event.data.data();
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    await createNotification(userId, {
        type: 'delivery',
        title: 'Delivery Scheduled',
        description: `Delivery of ${delivery.volumeContainers} containers scheduled.`,
        data: { deliveryId }
    });
    if ((userData === null || userData === void 0 ? void 0 : userData.email) && delivery.status === 'Delivered') {
        const template = (0, email_1.getDeliveryStatusTemplate)(userData.businessName, 'Delivered', deliveryId, delivery.volumeContainers);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Delivery complete`, html: template.html });
    }
});
exports.ondeliveryupdate = (0, firestore_2.onDocumentUpdated)({
    document: "users/{userId}/deliveries/{deliveryId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    if (before.status === after.status)
        return;
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    await createNotification(userId, { type: 'delivery', title: `Delivery ${after.status}`, description: `Your delivery is now ${after.status}.`, data: { deliveryId } });
    if ((userData === null || userData === void 0 ? void 0 : userData.email) && after.status === 'Delivered') {
        const template = (0, email_1.getDeliveryStatusTemplate)(userData.businessName, 'Delivered', deliveryId, after.volumeContainers);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Delivery complete`, html: template.html });
    }
});
exports.onpaymentupdate = (0, firestore_2.onDocumentUpdated)({
    document: "users/{userId}/payments/{paymentId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    if (before.status === after.status)
        return;
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (before.status === 'Pending Review' && after.status === 'Paid') {
        await createNotification(userId, { type: 'payment', title: 'Payment Confirmed', description: `Payment for invoice ${after.id} confirmed.`, data: { paymentId: after.id } });
        if (userData === null || userData === void 0 ? void 0 : userData.email) {
            const template = (0, email_1.getPaymentStatusTemplate)(userData.businessName, after.id, after.amount, 'Paid');
            await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Payment confirmed`, html: template.html });
        }
    }
});
exports.ontopuprequestupdate = (0, firestore_2.onDocumentUpdated)({
    document: "users/{userId}/topUpRequests/{requestId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    if (before.status === after.status || after.status !== 'Approved')
        return;
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData === null || userData === void 0 ? void 0 : userData.email) {
        const template = (0, email_1.getTopUpConfirmationTemplate)(userData.businessName, after.amount);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Top-up approved`, html: template.html });
    }
});
exports.onrefillrequestcreate = (0, firestore_2.onDocumentCreated)({
    document: "users/{userId}/refillRequests/{requestId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const requestId = event.params.requestId;
    const request = event.data.data();
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData === null || userData === void 0 ? void 0 : userData.email) {
        const template = (0, email_1.getRefillRequestTemplate)(userData.businessName, 'Requested', requestId, request.requestedDate);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Refill request received`, html: template.html });
    }
});
exports.onsanitationcreate = (0, firestore_2.onDocumentCreated)({
    document: "users/{userId}/sanitationVisits/{visitId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const visit = event.data.data();
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if ((userData === null || userData === void 0 ? void 0 : userData.email) && visit.status === 'Scheduled') {
        const dateStr = new Date(visit.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const template = (0, email_1.getSanitationScheduledTemplate)(userData.businessName, visit.assignedTo, dateStr);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Visit scheduled`, html: template.html });
    }
});
exports.onsanitationupdate = (0, firestore_2.onDocumentUpdated)({
    document: "users/{userId}/sanitationVisits/{visitId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    if (before.status !== 'Completed' && after.status === 'Completed') {
        const db = (0, firestore_1.getFirestore)();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        if (userData === null || userData === void 0 ? void 0 : userData.email) {
            const dateStr = new Date(after.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const template = (0, email_1.getSanitationReportTemplate)(userData.businessName, after.assignedTo, dateStr);
            await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Report ready`, html: template.html });
        }
    }
});
exports.onfileupload = (0, storage_2.onObjectFinalized)({ memory: "256MiB" }, async (event) => {
    var _a;
    const filePath = event.data.name;
    if (!filePath || ((_a = event.data.contentType) === null || _a === void 0 ? void 0 : _a.startsWith('application/x-directory')))
        return;
    const storage = (0, storage_1.getStorage)();
    const db = (0, firestore_1.getFirestore)();
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