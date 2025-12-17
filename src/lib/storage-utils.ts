
'use client';

import { FirebaseStorage, getStorage, ref, uploadBytesResumable, UploadTask, UploadMetadata } from 'firebase/storage';
import { FirebaseApp } from 'firebase/app';

/**
 * A utility function to upload a file to Firebase Storage with progress tracking
 * and custom metadata for backend processing by a Cloud Function.
 *
 * @param storage The Firebase Storage instance.
 * @param path The full path in the storage bucket where the file should be uploaded.
 * @param file The file object to upload.
 * @param metadata The custom metadata to attach to the file, specifically for the Cloud Function.
 * @param onProgress A callback function to report the upload progress (0-100).
 * @returns A promise that resolves with the UploadTask when the upload is initiated.
 */
export function uploadFileWithProgress(
  storage: FirebaseStorage,
  path: string,
  file: File,
  metadata: UploadMetadata,
  onProgress: (progress: number) => void
): Promise<UploadTask> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Observe state change events such as progress, pause, and resume
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error("Upload failed:", error);
        reject(error);
      },
      () => {
        // Handle successful uploads on complete
        // The onfileupload Cloud Function will handle getting the URL and updating Firestore.
        onProgress(100); // Ensure progress reaches 100%
      }
    );

    resolve(uploadTask);
  });
}
