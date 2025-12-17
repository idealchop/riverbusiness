
'use client';

import { FirebaseStorage, ref, uploadBytesResumable, type UploadTask, type UploadMetadata } from 'firebase/storage';

/**
 * A utility function to upload a file to Firebase Storage with progress tracking.
 * The backend Cloud Function will handle creating a public URL and updating Firestore.
 *
 * @param storage The Firebase Storage instance.
 * @param path The full path in the storage bucket where the file should be uploaded.
 * @param file The file object to upload.
 * @param metadata The custom metadata to attach to the file, if any.
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
    
    // The custom metadata is now an empty object because the V2 Cloud Function
    // infers all necessary information from the file path itself.
    const uploadTask = uploadBytesResumable(storageRef, file, {});

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
        // Handle successful uploads on complete.
        // The `onfileupload` Cloud Function will handle the rest.
        onProgress(100);
      }
    );

    resolve(uploadTask);
  });
}

    