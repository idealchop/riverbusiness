
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";

initializeApp();
const db = getFirestore();
const storage = getStorage();

/**
 * A generic Cloud Function that triggers on any file being finalized in Firebase Storage.
 * It reads metadata from the uploaded file to determine which Firestore document and field to update.
 *
 * This function is the single source of truth for updating Firestore after a file upload.
 * It uses the modern v2 modular API.
 *
 * Expected Metadata from Client:
 * - `customMetadata.firestorePath`: The full path to the document in Firestore (e.g., 'users/userId123').
 * - `customMetadata.firestoreField`: The field within the document to update (e.g., 'photoURL').
 */
export const onfileupload = onObjectFinalized({ cpu: "memory" }, async (event) => {
  const fileBucket = event.data.bucket;
  const filePath = event.data.name;
  const contentType = event.data.contentType;
  const metadata = event.data.metadata;

  // Exit if this is a folder creation event, file path is missing, or content type is generic stream
  if (!filePath || !contentType || (contentType === "application/octet-stream" && filePath.endsWith('/'))) {
    logger.log(`Ignoring event for folder or incomplete data: ${filePath}`);
    return;
  }
  
  // Exit if the required custom metadata is not present
  if (!metadata?.firestorePath || !metadata?.firestoreField) {
    logger.log(`File ${filePath} is missing required 'firestorePath' or 'firestoreField' metadata. Skipping Firestore update.`);
    return;
  }
  
  const { firestorePath, firestoreField } = metadata;

  const bucket = storage.bucket(fileBucket);
  const file = bucket.file(filePath);

  try {
    // Generate a signed URL to make the file publicly accessible for a very long time.
    const [downloadURL] = await file.getSignedUrl({
      action: "read",
      expires: "01-01-2500", 
    });

    // Get a reference to the specified Firestore document.
    const docRef = db.doc(firestorePath);
    
    // Create the update payload.
    const updatePayload: { [key: string]: any } = {
      [firestoreField]: downloadURL,
    };

    // Special case for contract uploads: also update status and date
    if (firestoreField === 'currentContractUrl') {
        updatePayload.contractStatus = "Active";
        updatePayload.contractUploadedDate = new Date().toISOString();
    }
    
    // Perform the update.
    await docRef.update(updatePayload);

    logger.log(`Successfully updated document '${firestorePath}' with URL for ${filePath}.`);

  } catch (error) {
    logger.error(`Failed to process upload for ${filePath}. Error:`, error);
  }
});
