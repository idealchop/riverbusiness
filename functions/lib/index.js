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
exports.onfileupload = exports.oncompliancecreate = exports.onsanitationupdate = exports.onrefillrequestcreate = exports.ontopuprequestupdate = exports.onpaymentupdate = exports.ondeliveryupdate = exports.ondeliverycreate = exports.onunclaimedprofilecreate = void 0;
const app_1 = require("firebase-admin/app");
const storage_1 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
// Initialize Firebase Admin SDK first
(0, app_1.initializeApp)();
const storage_2 = require("firebase-functions/v2/storage");
const firestore_2 = require("firebase-functions/v2/firestore");
const email_1 = require("./email");
// Export all billing functions (this includes generateMonthlyInvoices)
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
 * Triggered when a new unclaimed profile is created by an admin.
 * Sends a welcome invitation email to the business contact.
 */
exports.onunclaimedprofilecreate = (0, firestore_2.onDocumentCreated)({
    document: "unclaimedProfiles/{clientId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    var _a, _b, _c;
    if (!event.data)
        return;
    const profile = event.data.data();
    // Check if we have an email to send to
    if (!profile.businessEmail) {
        logger.warn(`No businessEmail found for unclaimed profile: ${event.params.clientId}`);
        return;
    }
    const planName = `${profile.clientType || ''} - ${((_a = profile.plan) === null || _a === void 0 ? void 0 : _a.name) || ''}`;
    const schedule = `${((_b = profile.customPlanDetails) === null || _b === void 0 ? void 0 : _b.deliveryDay) || 'TBD'} / ${((_c = profile.customPlanDetails) === null || _c === void 0 ? void 0 : _c.deliveryFrequency) || 'TBD'}`;
    const template = (0, email_1.getWelcomeUnclaimedTemplate)(profile.businessName || profile.name || 'Valued Client', profile.clientId, planName, profile.address || 'N/A', schedule);
    try {
        await (0, email_1.sendEmail)({
            to: profile.businessEmail,
            subject: template.subject,
            text: `Welcome to River Philippines! Your Client ID is ${profile.clientId}. Link it at app.riverph.com to activate your dashboard.`,
            html: template.html
        });
        logger.info(`Welcome email sent to ${profile.businessEmail} for client ${profile.clientId}`);
    }
    catch (error) {
        logger.error(`Failed to send welcome email to ${profile.businessEmail}`, error);
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
    logger.info(`Triggered ondeliverycreate for user: ${userId}, delivery: ${deliveryId}`);
    const db = (0, firestore_1.getFirestore)();
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
    if ((userData === null || userData === void 0 ? void 0 : userData.email) && delivery.status === 'Delivered') {
        const template = (0, email_1.getDeliveryStatusTemplate)(userData.businessName, 'Delivered', deliveryId, delivery.volumeContainers);
        await (0, email_1.sendEmail)({
            to: userData.email,
            subject: template.subject,
            text: `Delivery ${deliveryId} is complete.`,
            html: template.html
        });
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
    logger.info(`Triggered ondeliveryupdate for user: ${userId}, delivery: ${deliveryId}. Status: ${before.status} -> ${after.status}`);
    const db = (0, firestore_1.getFirestore)();
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
    if ((userData === null || userData === void 0 ? void 0 : userData.email) && after.status === 'Delivered') {
        const template = (0, email_1.getDeliveryStatusTemplate)(userData.businessName, 'Delivered', deliveryId, after.volumeContainers);
        await (0, email_1.sendEmail)({
            to: userData.email,
            subject: template.subject,
            text: `Delivery ${deliveryId} is complete.`,
            html: template.html
        });
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
/**
 * Triggered when a top-up request status is updated (e.g., Approved).
 */
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
    logger.info(`Triggered ontopuprequestupdate for user: ${userId}. Status: Approved`);
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData === null || userData === void 0 ? void 0 : userData.email) {
        const template = (0, email_1.getTopUpConfirmationTemplate)(userData.businessName, after.amount);
        await (0, email_1.sendEmail)({
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
exports.onrefillrequestcreate = (0, firestore_2.onDocumentCreated)({
    document: "users/{userId}/refillRequests/{requestId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const requestId = event.params.requestId;
    const request = event.data.data();
    logger.info(`Triggered onrefillrequestcreate for user: ${userId}, request: ${requestId}`);
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    // 1. Notify the Client
    if (userData === null || userData === void 0 ? void 0 : userData.email) {
        const template = (0, email_1.getRefillRequestTemplate)(userData.businessName, 'Requested', requestId, request.requestedDate);
        await (0, email_1.sendEmail)({
            to: userData.email,
            subject: template.subject,
            text: `Refill request ${requestId} received.`,
            html: template.html
        }).catch(e => logger.error("Client refill email failed", e));
    }
    // 2. Notify the Internal Team (Jimbs and Jayvee)
    if (userData === null || userData === void 0 ? void 0 : userData.businessName) {
        const admins = [
            { name: 'Jimbs', email: 'jimbs.work@gmail.com' },
            { name: 'Jayvee', email: 'jayvee@riverph.com' }
        ];
        for (const admin of admins) {
            const adminTemplate = (0, email_1.getInternalRefillAlertTemplate)(admin.name, userData.businessName, requestId, request.requestedDate);
            await (0, email_1.sendEmail)({
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
        logger.info(`Triggered onsanitationupdate for user: ${userId}. Status: Completed`);
        const db = (0, firestore_1.getFirestore)();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        if (userData === null || userData === void 0 ? void 0 : userData.email) {
            const dateStr = new Date(after.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const template = (0, email_1.getSanitationReportTemplate)(userData.businessName, after.assignedTo, dateStr);
            await (0, email_1.sendEmail)({
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
exports.oncompliancecreate = (0, firestore_2.onDocumentCreated)({
    document: "waterStations/{stationId}/complianceReports/{reportId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const stationId = event.params.stationId;
    const report = event.data.data();
    logger.info(`Triggered oncompliancecreate for station: ${stationId}`);
    const db = (0, firestore_1.getFirestore)();
    const stationDoc = await db.collection("waterStations").doc(stationId).get();
    const stationData = stationDoc.data();
    // Find all users assigned to this station
    const usersSnapshot = await db.collection("users").where("assignedWaterStationId", "==", stationId).get();
    if (usersSnapshot.empty || !stationData)
        return;
    const emailPromises = usersSnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        if (userData.email) {
            const template = (0, email_1.getComplianceAlertTemplate)(userData.businessName, stationData.name, report.name);
            return (0, email_1.sendEmail)({
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
        await db.collection("users").doc(userId).update({ photoURL: url });
    }
    else if (filePath.startsWith("users/") && filePath.includes("/payments/")) {
        const customMetadata = event.data.metadata;
        if ((customMetadata === null || customMetadata === void 0 ? void 0 : customMetadata.paymentId) && (customMetadata === null || customMetadata === void 0 ? void 0 : customMetadata.userId)) {
            await db.collection("users").doc(customMetadata.userId).collection("payments").doc(customMetadata.paymentId).update({
                proofOfPaymentUrl: url,
                status: "Pending Review"
            });
        }
    }
});
//# sourceMappingURL=index.js.map