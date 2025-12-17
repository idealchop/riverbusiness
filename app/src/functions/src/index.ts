
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import * as path from 'path';
import { initializeApp } from "firebase-admin/app";

initializeApp();
const db = getFirestore();
const storage = getStorage();

/**
 * A generic Cloud Function that triggers on any file being finalized in Firebase Storage.
 * It determines the file type based on its path and updates the corresponding Firestore document with a public URL.
 * THIS FUNCTION IS NOW CONSIDERED LEGACY and is a fallback. The primary upload mechanism for profile photos
 * is handled by a Next.js Server Action. This function remains for other potential uploads.
 */
export const onfileupload = onObjectFinalized({ cpu: "memory" }, async (event) => {
  const fileBucket = event.data.bucket;
  const filePath = event.data.name;

  if (!filePath) {
    logger.warn("File path is undefined, skipping function.");
    return;
  }

  const bucket = storage.bucket(fileBucket);
  const file = bucket.file(filePath);

  const getPublicUrl = async () => {
    const [downloadURL] = await file.getSignedUrl({
      action: "read",
      expires: "01-01-2500", // A far-future expiration date
    });
    return downloadURL;
  };

  try {
    // --- User Contract ---
    if (filePath.startsWith("userContracts/")) {
      const parts = filePath.split("/");
      const userId = parts[1];
      const url = await getPublicUrl();
      await db.collection("users").doc(userId).update({
        currentContractUrl: url,
        contractUploadedDate: FieldValue.serverTimestamp(),
        contractStatus: "Active",
      });
      logger.log(`Updated contract for user: ${userId}`);
      return;
    }

    // --- Delivery Proof ---
    if (filePath.startsWith("users/") && filePath.includes("/deliveries/")) {
      const parts = filePath.split("/");
      const userId = parts[1];
      const deliveryId = path.basename(filePath, path.extname(filePath)); // Get filename without extension
      const url = await getPublicUrl();
      await db
        .collection("users")
        .doc(userId)
        .collection("deliveries")
        .doc(deliveryId)
        .update({
          proofOfDeliveryUrl: url,
        });
      logger.log(`Updated proof for delivery: ${deliveryId} for user: ${userId}`);
      return;
    }

    // --- Payment Proof ---
    if (filePath.startsWith("users/") && filePath.includes("/payments/")) {
        const parts = filePath.split('/');
        const userId = parts[1];
        const paymentId = path.basename(filePath, path.extname(filePath));
        const url = await getPublicUrl();
        await db.collection('users').doc(userId).collection('payments').doc(paymentId).update({
            proofOfPaymentUrl: url,
            status: 'Pending Review'
        });
        logger.log(`Updated proof for payment: ${paymentId} for user: ${userId}`);
        return;
    }

    // --- Water Station Documents (Agreement & Compliance) ---
    if (filePath.startsWith("stations/")) {
        const parts = filePath.split('/');
        const stationId = parts[1];
        const docType = parts[2];
        const fileName = path.basename(filePath);
        const url = await getPublicUrl();

        if (docType === 'agreement') {
            await db.collection('waterStations').doc(stationId).update({ partnershipAgreementUrl: url });
            logger.log(`Updated partnership agreement for station: ${stationId}`);
        } else if (docType === 'compliance') {
            const reportName = fileName.split('-')[0];
            const formattedName = reportName.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
            const reportRef = db.collection('waterStations').doc(stationId).collection('complianceReports');
            const reportDocId = reportName;
            await reportRef.doc(reportDocId).set({
                id: reportDocId,
                name: formattedName,
                date: FieldValue.serverTimestamp(),
                status: 'Pending Review',
                reportUrl: url,
            }, { merge: true });
            logger.log(`Updated compliance report '${formattedName}' for station: ${stationId}`);
        }
        return;
    }

    logger.log(`File path ${filePath} did not match any specific handler.`);
  } catch (error) {
    logger.error(`Failed to process upload for ${filePath}.`, error);
  }
});
