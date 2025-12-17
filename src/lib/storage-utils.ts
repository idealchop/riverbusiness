
'use client';

import { getStorage, ref, uploadBytesResumable, getDownloadURL, type FirebaseStorage, type UploadMetadata, type UploadTask } from 'firebase/storage';

/**
 * A robust function to upload a file to Firebase Storage with progress tracking and metadata.
 * This function uses a modern Promise-based approach with async/await for cleaner control flow.
 *
 * @param storage The initialized FirebaseStorage instance.
 * @param file The file to upload.
 * @param path The full path in Firebase Storage where the file should be saved.
 * @param metadata The metadata to attach to the file, used by Cloud Functions.
 * @param onProgress A callback to receive upload progress updates (0-100).
 * @param onSuccess A callback that runs after the upload is successfully completed.
 * @param onError A callback that runs if an error occurs during the upload.
 */
export function uploadFile(
  storage: FirebaseStorage,
  file: File,
  path: string,
  metadata: UploadMetadata,
  onProgress: (progress: number) => void,
  onSuccess: () => void,
  onError: (error: Error) => void
): void {
    if (!storage) {
      onError(new Error("Firebase Storage is not initialized."));
      return;
    }

    const storageRef = ref(storage, path);
    const uploadTask: UploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        // Handle unsuccessful uploads and call the error callback
        console.error('Upload failed:', error);
        onError(error);
      },
      () => {
        // Handle successful uploads on complete
        // The Cloud Function will handle the Firestore update, so we just call the success callback here.
        onSuccess();
      }
    );
}
