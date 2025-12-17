
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * A generic Cloud Function that triggers on any file being finalized in
 * Firebase Storage. It reads metadata from the uploaded file to determine
 * which Firestore document and field to update with the public URL.
 *
 * Expected Metadata:
 * - `firestorePath`: The full path to the document in Firestore (e.g., 'users/userId123').
 * - `firestoreField`: The field within the document to update (e.g., 'photoURL').
 */
export const onFileUpload = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  const contentType = object.contentType;
  const metadata = object.metadata;

  if (!filePath || !contentType) {
    functions.logger.warn("File path or content type is undefined. Exiting.");
    return;
  }

  // Exit if this is a folder creation event
  if (contentType === "application/octet-stream" && filePath.endsWith('/')) {
    functions.logger.log(`Ignoring folder creation event for: ${filePath}`);
    return;
  }
  
  if (!metadata) {
    functions.logger.log(`File ${filePath} has no metadata. Skipping Firestore update.`);
    return;
  }
  
  const { firestorePath, firestoreField } = metadata;
  
  if (!firestorePath || !firestoreField) {
    functions.logger.log(`File ${filePath} is missing 'firestorePath' or 'firestoreField' metadata. Skipping Firestore update.`);
    return;
  }

  const bucket = admin.storage().bucket(object.bucket);
  const file = bucket.file(filePath);

  try {
    // Generate a signed URL to make the file publicly accessible.
    // This URL is valid for a very long time.
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
    functions.logger.error(`Failed to process upload for ${filePath}.`, error);
  }
});
