
'use client';

import { FirebaseStorage, ref, uploadBytesResumable, getDownloadURL, UploadTask, UploadTaskSnapshot } from 'firebase/storage';

/**
 * A reusable, robust function to upload a file to Firebase Storage with progress tracking.
 *
 * This function is designed to be called from within a React component's event handler.
 * It throws an error on failure, which should be caught by the calling component to handle UI updates (e.g., showing a toast).
 *
 * @param storage The Firebase Storage instance.
 * @param file The file to be uploaded.
 * @param path The relative path within Firebase Storage (e.g., 'users/user-id/profile/photo.jpg').
 * @param onProgress An optional callback function to receive upload progress updates (0-100).
 * @returns A promise that resolves with the public download URL of the uploaded file.
 * @throws An error if the upload or URL retrieval fails.
 */
export const uploadFile = (
  storage: FirebaseStorage,
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  
  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  const storageRef = ref(storage, path);
  const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        // Update progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        // Handle unsuccessful uploads by rejecting the promise
        console.error('Upload failed:', error);
        reject(new Error(`Could not upload file. Reason: ${error.code}`));
      },
      async () => {
        // Handle successful uploads on complete
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error('Failed to get download URL:', error);
          reject(new Error('File was uploaded but could not be processed.'));
        }
      }
    );
  });
};
