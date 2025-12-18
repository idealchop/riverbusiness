
'use client';

import { FirebaseStorage, ref, uploadBytesResumable, type UploadMetadata, getDownloadURL } from 'firebase/storage';
import type { Auth } from 'firebase/auth';

/**
 * A utility function to upload a file to Firebase Storage with progress tracking.
 * It now requires the Auth instance and will fail if the user is not authenticated.
 * This implementation is promise-safe to ensure it always resolves or rejects.
 *
 * @param storage The Firebase Storage instance.
 * @param auth The Firebase Auth instance.
 * @param path The full path in the storage bucket where the file should be uploaded.
 * @param file The file object to upload.
 * @param metadata The custom metadata to attach to the file, if any.
 * @param onProgress A callback function to report the upload progress (0-100).
 * @returns A promise that resolves when the upload is 100% complete.
 */
export function uploadFileWithProgress(
  storage: FirebaseStorage,
  auth: Auth,
  path: string,
  file: File,
  metadata: UploadMetadata,
  onProgress: (progress: number) => void
): Promise<void> {
    
  return new Promise((resolve, reject) => {
    // Critical Step: Ensure user is authenticated before attempting upload.
    if (!auth.currentUser) {
      const authError = new Error("User not authenticated.");
      console.error("[UPLOAD] Error: User is not authenticated. Upload blocked.", authError);
      onProgress(0); // Reset progress on error
      return reject(authError);
    }
    
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        console.error("[UPLOAD] error:", error);
        onProgress(0); // Reset progress on error
        reject(error); // Make sure to reject the promise on error
      },
      () => {
        // Handle successful uploads on complete
        // This callback is the source of truth for completion.
        onProgress(100);
        // The getDownloadURL is not strictly needed by the client, but confirming
        // the task is complete is the most important part.
        // We resolve without a URL, as the client doesn't need it.
        // The Cloud Function is responsible for getting the URL and updating Firestore.
        resolve(); // Resolve the promise ONLY when the upload is complete.
      }
    );
  });
}
