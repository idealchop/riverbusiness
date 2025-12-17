
'use client';

import { FirebaseStorage, ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';

/**
 * A robust, promise-based function to upload a file to Firebase Storage with progress tracking.
 * This version ensures the StorageReference is created correctly and properly handles the upload lifecycle.
 *
 * @param storage The Firebase Storage instance.
 * @param path The full path in Firebase Storage where the file should be saved (e.g., 'users/uid/profile.jpg').
 * @param file The file to upload.
 * @param onProgress An optional callback to receive upload progress updates (0-100).
 * @returns A promise that resolves with the public download URL of the uploaded file.
 * @throws An error if the upload fails.
 */
export function uploadFile(
  storage: FirebaseStorage,
  path: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // CRITICAL FIX: The ref function must be called with the storage instance and the path.
  const storageRef = ref(storage, path);
  const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Update progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error('Upload failed:', error);
        switch (error.code) {
          case 'storage/unauthorized':
            reject(new Error('Permission denied. Please check your storage security rules.'));
            break;
          case 'storage/canceled':
            // Although we don't expose a cancel button, this handles browser-based cancellations.
            reject(new Error('Upload was canceled.'));
            break;
          default:
            reject(new Error(`Upload failed. Reason: ${error.code}`));
            break;
        }
      },
      () => {
        // Handle successful uploads on complete
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadURL) => {
            resolve(downloadURL);
          })
          .catch((error) => {
            console.error('Failed to get download URL:', error);
            reject(new Error('File uploaded successfully, but failed to get the download URL.'));
          });
      }
    );
  });
}
