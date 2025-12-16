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
Object.defineProperty(exports, "__esModule", { value: true });
exports.onFileUpload = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const path = __importStar(require("path"));
// Initialize the Firebase Admin SDK.
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();
/**
 * A generic Cloud Function that triggers on any file being finalized in
 * Firebase Storage. It determines the file type based on its path and
 * updates the corresponding Firestore document with a public URL.
 */
exports.onFileUpload = functions.storage.object().onFinalize(async (object) => {
    const filePath = object.name;
    const bucket = storage.bucket(object.bucket);
    const file = bucket.file(filePath);
    // Ensure filePath is valid
    if (!filePath) {
        functions.logger.warn("File path is undefined.");
        return;
    }
    const getPublicUrl = async () => {
        const [downloadURL] = await file.getSignedUrl({
            action: "read",
            expires: "01-01-2500", // A far-future expiration date
        });
        return downloadURL;
    };
    try {
        // --- User Profile Photo ---
        if (filePath.startsWith("users/") && filePath.includes("/profile/")) {
            const parts = filePath.split("/");
            const userId = parts[1];
            const url = await getPublicUrl();
            await db.collection("users").doc(userId).update({ photoURL: url });
            functions.logger.log(`Updated profile photo for user: ${userId}`);
            return;
        }
        // --- User Contract ---
        if (filePath.startsWith("userContracts/")) {
            const parts = filePath.split("/");
            const userId = parts[1];
            const url = await getPublicUrl();
            await db.collection("users").doc(userId).update({
                currentContractUrl: url,
                contractUploadedDate: admin.firestore.FieldValue.serverTimestamp(),
                contractStatus: "Active",
            });
            functions.logger.log(`Updated contract for user: ${userId}`);
            return;
        }
        // --- Delivery Proof ---
        if (filePath.startsWith("users/") && filePath.includes("/deliveries/")) {
            const parts = filePath.split("/");
            const userId = parts[1];
            const deliveryId = parts[3];
            const url = await getPublicUrl();
            await db.collection("users").doc(userId).collection("deliveries").doc(deliveryId).update({
                proofOfDeliveryUrl: url,
            });
            functions.logger.log(`Updated proof for delivery: ${deliveryId} for user: ${userId}`);
            return;
        }
        // --- Payment Proof ---
        if (filePath.startsWith("users/") && filePath.includes("/payments/")) {
            const parts = filePath.split("/");
            const userId = parts[1];
            const paymentId = parts[3];
            const url = await getPublicUrl();
            await db.collection("users").doc(userId).collection("payments").doc(paymentId).update({
                proofOfPaymentUrl: url,
                status: "Pending Review",
            });
            functions.logger.log(`Updated proof for payment: ${paymentId} for user: ${userId}`);
            return;
        }
        // --- Water Station Documents (Agreement & Compliance) ---
        if (filePath.startsWith("stations/")) {
            const parts = filePath.split("/");
            const stationId = parts[1];
            const docType = parts[2]; // e.g., 'agreement' or 'compliance'
            const fileName = path.basename(filePath);
            const url = await getPublicUrl();
            if (docType === "agreement") {
                await db.collection("waterStations").doc(stationId).update({
                    partnershipAgreementUrl: url,
                });
                functions.logger.log(`Updated partnership agreement for station: ${stationId}`);
            }
            else if (docType === "compliance") {
                // Example filename: 'businessPermit-some_file.pdf'
                const reportName = fileName.split("-")[0]; // 'businessPermit'
                const formattedName = reportName.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
                const reportRef = db.collection("waterStations").doc(stationId).collection("complianceReports");
                // Create a unique ID from the report name to avoid duplicates
                const reportDocId = reportName;
                await reportRef.doc(reportDocId).set({
                    id: reportDocId,
                    name: formattedName,
                    date: admin.firestore.FieldValue.serverTimestamp(),
                    status: "Pending Review",
                    reportUrl: url,
                }, { merge: true });
                functions.logger.log(`Updated compliance report '${formattedName}' for station: ${stationId}`);
            }
            return;
        }
        functions.logger.log(`File path ${filePath} did not match any handler.`);
    }
    catch (error) {
        functions.logger.error(`Failed to process upload for ${filePath}.`, error);
    }
});
//# sourceMappingURL=index.js.map