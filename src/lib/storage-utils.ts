
'use client';

import { FirebaseStorage, ref, uploadBytesResumable, getDownloadURL, UploadTask, UploadTaskSnapshot } from 'firebase/storage';

/**
 * A reusable, robust function to upload a file to Firebase Storage with progress tracking.
 * This version uses a more explicit Promise structure to avoid race conditions.
 *
 * @param storage The Firebase Storage instance.
 * @param file The file to be uploaded.
 * @param path The relative path within Firebase Storage (e.g., 'users/user-id/profile/photo.jpg').
 * @param onProgress An optional callback function to receive upload progress updates (0-100).
 * @returns A promise that resolves with the public download URL of the uploaded file.
 * @throws An error if the upload or URL retrieval fails.
 */
export function uploadFile(
  storage: FirebaseStorage,
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  
  return new Promise((resolve, reject) => {
    if (!storage) {
      // Reject the promise if storage is not available
      return reject(new Error('Firebase Storage is not available.'));
    }

    const storageRef = ref(storage, path);
    const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

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
        switch (error.code) {
          case 'storage/unauthorized':
            reject(new Error('Permission denied. Please check your storage security rules.'));
            break;
          case 'storage/canceled':
            reject(new Error('Upload was canceled.'));
            break;
          default:
            reject(new Error(`Upload failed. Reason: ${error.code}`));
            break;
        }
      },
      () => {
        // Handle successful uploads on complete.
        // The upload is finished, now get the download URL.
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          resolve(downloadURL);
        }).catch((error) => {
          console.error('Failed to get download URL:', error);
          reject(new Error('File uploaded but could not get the download URL.'));
        });
      }
    );
  });
};
