
'use client';

import { getStorage, ref, uploadBytesResumable, getDownloadURL, type FirebaseStorage, type UploadMetadata } from 'firebase/storage';

/**
 * A robust function to upload a file to Firebase Storage with progress tracking and metadata.
 * This function uses callbacks for success and error, suitable for client-side UI updates.
 *
 * @param storage The initialized FirebaseStorage instance.
 * @param file The file to upload.
 * @param path The full path in Firebase Storage where the file should be saved.
 * @param metadata The metadata to attach to the file, which can be used by Cloud Functions.
 * @param onProgress A callback to receive upload progress updates (0-100).
 * @param onSuccess A callback that fires when the upload is fully complete.
 * @param onError A callback that fires if the upload fails.
 */
export function uploadFile(
  storage: FirebaseStorage,
  file: File,
  path: string,
  metadata: UploadMetadata,
  onProgress?: (progress: number) => void,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): void {
  if (!storage) {
    onError?.(new Error("Firebase Storage is not initialized."));
    return;
  }

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  uploadTask.on(
    'state_changed',
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      onProgress?.(progress);
    },
    (error) => {
      // The promise is rejected with the Firebase error, allowing the caller to handle it.
      console.error('Upload failed:', error);
      onError?.(error);
    },
    () => {
      // This completion callback is only called on successful upload.
      // The Cloud Function will handle the Firestore update, so we just signal success here.
      onSuccess?.();
    }
  );
}
