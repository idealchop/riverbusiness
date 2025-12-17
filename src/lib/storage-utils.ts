
'use client';

import { getStorage, ref, uploadBytesResumable, getDownloadURL, type FirebaseStorage } from 'firebase/storage';

/**
 * A robust, promise-based function to upload a file to Firebase Storage with progress tracking.
 * This version internally gets the storage instance.
 *
 * @param storage The initialized FirebaseStorage instance.
 * @param file The file to upload.
 * @param path The full path in Firebase Storage where the file should be saved (e.g., 'users/uid/profile.jpg').
 * @param onProgress An optional callback to receive upload progress updates (0-100).
 * @returns A promise that resolves with the public download URL of the uploaded file.
 * @throws An error if the upload fails.
 */
export function uploadFile(
  storage: FirebaseStorage,
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!storage) {
        return reject(new Error("Firebase Storage is not initialized."));
    }

    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        // Handle unsuccessful uploads and reject the promise
        console.error('Upload failed in utility:', error);
        switch (error.code) {
          case 'storage/unauthorized':
            reject(new Error('Permission denied. Please check your storage security rules.'));
            break;
          case 'storage/canceled':
            // Don't reject on cancellation, but we can log it.
            console.log("Upload was canceled.");
            break;
          default:
            reject(new Error(`Upload failed. Reason: ${error.code}`));
            break;
        }
      },
      async () => {
        // Handle successful uploads on complete
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (err) {
          console.error('Failed to get download URL:', err);
          reject(new Error('File uploaded successfully, but failed to get the download URL.'));
        }
      }
    );
  });
}
