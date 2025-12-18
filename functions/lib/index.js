
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onfileupload = exports.ondeliveryupdate = exports.ondeliverycreate = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const firestore_1 = require("firebase-functions/v2/firestore");
const storage_2 = require("firebase-admin/storage");
const firestore_2 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const app_1 = require("firebase-admin/app");
const path = __importStar(require("path"));
// Initialize Firebase Admin SDK
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
const storage = (0, storage_2.getStorage)();
/**
 * Creates a notification document in a user's notification subcollection.
 */
async function createNotification(userId, notificationData) {
    if (!userId) {
        logger.warn("User ID is missing, cannot create notification.");
        return;
    }
    const notification = {
        ...notificationData,
        userId: userId,
        date: firestore_2.FieldValue.serverTimestamp(),
        isRead: false,
    };
    await db.collection('users').doc(userId).collection('notifications').add(notification);
}
/**
 * Cloud Function to create a notification when a delivery is first created.
 */
exports.ondeliverycreate = (0, firestore_1.onDocumentCreated)("users/{userId}/deliveries/{deliveryId}", async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const delivery = event.data.data();
    const notification = {
        type: 'delivery',
        title: 'Delivery Scheduled',
        description: `A new delivery of ${delivery.volumeContainers} containers has been scheduled.`,
        data: { deliveryId: event.params.deliveryId }
    };
    await createNotification(userId, notification);
});
/**
 * Cloud Function to create a notification when a delivery is updated.
 */
exports.ondeliveryupdate = (0, firestore_1.onDocumentUpdated)("users/{userId}/deliveries/{deliveryId}", async (event) => {
    if (!event.data)
        return;
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
        description: `Your delivery of ${delivery.volumeContainers} containers is now ${delivery.status}.`,
        data: { deliveryId: event.params.deliveryId }
    };
    await createNotification(userId, notification);
});
/**
 * Generic Cloud Function for file uploads.
 */
exports.onfileupload = (0, storage_1.onObjectFinalized)({ cpu: "memory" }, async (event) => {
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
                contractUploadedDate: firestore_2.FieldValue.serverTimestamp(),
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
                description: `Your payment proof for invoice ${paymentId} has been received and is now pending review.`,
                data: { paymentId: paymentId }
            });
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
            }
            else if (docType === "compliance") {
                const reportKey = path.basename(filePath).split('-')[0];
                const formattedName = reportKey.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
                const reportRef = db.collection("waterStations").doc(stationId).collection("complianceReports");
                const reportDocId = reportKey;
                await reportRef.doc(reportDocId).set({
                    id: reportDocId,
                    name: formattedName,
                    date: firestore_2.FieldValue.serverTimestamp(),
                    status: "Pending Review",
                    reportUrl: url,
                }, { merge: true });
                logger.log(`Updated compliance report '${formattedName}' for station: ${stationId}`);
            }
            return;
        }
        logger.log(`File path ${filePath} did not match any handler.`);
    }
    catch (error) {
        logger.error(`Failed to process upload for ${filePath}.`, error);
    }
});
//# sourceMappingURL=index.js.map

    