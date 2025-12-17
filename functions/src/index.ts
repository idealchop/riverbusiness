
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * A generic Cloud Function that triggers on any file being finalized in
 * Firebase Storage. It reads metadata from the uploaded file to determine
 * which Firestore document and field to update with the public URL.
 *
 * This function is now the single source of truth for updating Firestore after a file upload.
 *
 * Expected Metadata from Client:
 * - `customMetadata.firestorePath`: The full path to the document in Firestore (e.g., 'users/userId123').
 * - `customMetadata.firestoreField`: The field within the document to update (e.g., 'photoURL').
 */
export const onFileUpload = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  const contentType = object.contentType;
  const metadata = object.metadata;

  // Exit if this is a folder creation event or file path is missing
  if (!filePath || !contentType || (contentType === "application/octet-stream" && filePath.endsWith('/'))) {
    functions.logger.log(`Ignoring event for: ${filePath}`);
    return;
  }
  
  // Exit if the required custom metadata is not present
  if (!metadata?.customMetadata?.firestorePath || !metadata?.customMetadata?.firestoreField) {
    functions.logger.log(`File ${filePath} is missing required 'firestorePath' or 'firestoreField' metadata. Skipping Firestore update.`);
    return;
  }
  
  const { firestorePath, firestoreField } = metadata.customMetadata;

  const bucket = admin.storage().bucket(object.bucket);
  const file = bucket.file(filePath);

  try {
    // Generate a signed URL to make the file publicly accessible for a very long time.
    const [downloadURL] = await file.getSignedUrl({
      action: "read",
      expires: "01-01-2500", 
    });

    // Update the specified Firestore document with the new URL.
    const docRef = db.doc(firestorePath);
    await docRef.update({
      [firestoreField]: downloadURL,
    });

    functions.logger.log(`Successfully updated document '${firestorePath}' with URL for ${filePath}.`);

  } catch (error) {
    functions.logger.error(`Failed to process upload for ${filePath}. Error:`, error);
  }
});
