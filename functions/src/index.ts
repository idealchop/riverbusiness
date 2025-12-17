
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";

// Initialize the Admin SDK
initializeApp();

/**
 * This function triggers when a new file is uploaded to any folder in Firebase Storage.
 * It reads metadata from the file to determine which Firestore document to update.
 *
 * THIS IS THE CORRECT, MODERN v2 IMPLEMENTATION.
 *
 * Expected Metadata from Client:
 * - `customMetadata.firestorePath`: The full path to the document (e.g., 'users/userId123').
 * - `customMetadata.firestoreField`: The field to update (e.g., 'photoURL').
 */
export const onfileupload = onObjectFinalized(async (event) => {
  const { bucket, name: filePath, metadata } = event.data;

  // Ignore folder creation events or files without a path.
  if (!filePath) {
    logger.log(`Ignoring event with no file path.`);
    return;
  }
  
  // The client MUST provide these two pieces of metadata for the function to work.
  if (!metadata?.firestorePath || !metadata?.firestoreField) {
    logger.log(`File '${filePath}' is missing required 'firestorePath' or 'firestoreField' metadata. Skipping Firestore update.`);
    return;
  }
  
  const { firestorePath, firestoreField } = metadata;
  logger.log(`Processing file: ${filePath}. Will update doc '${firestorePath}' in field '${firestoreField}'.`);

  const file = getStorage().bucket(bucket).file(filePath);

  try {
    // Generate a long-lived signed URL for public read access.
    const [downloadURL] = await file.getSignedUrl({
      action: "read",
      expires: "01-01-2500", // Set a far-future expiration date.
    });

    const db = getFirestore();
    const docRef = db.doc(firestorePath);

    // Prepare the update payload.
    const updatePayload: { [key: string]: any } = {
      [firestoreField]: downloadURL,
    };
    
    // Perform the Firestore document update.
    await docRef.update(updatePayload);

    logger.log(`Successfully updated document '${firestorePath}' with URL: ${downloadURL}`);

  } catch (error) {
    logger.error(`Failed to process upload for ${filePath}. Error:`, error);
  }
});
