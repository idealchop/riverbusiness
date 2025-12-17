
'use client';

import { getStorage, ref, uploadBytesResumable, getDownloadURL, type FirebaseStorage, type UploadMetadata } from 'firebase/storage';

/**
 * A robust, promise-based function to upload a file to Firebase Storage with progress tracking and metadata.
 * This function correctly wraps the upload task in a Promise, resolving only upon successful completion.
 *
 * @param storage The initialized FirebaseStorage instance.
 * @param file The file to upload.
 * @param path The full path in Firebase Storage where the file should be saved.
 * @param metadata The metadata to attach to the file, which can be used by Cloud Functions.
 * @param onProgress An optional callback to receive upload progress updates (0-100).
 * @returns A promise that resolves with the public download URL of the uploaded file.
 * @throws An error if the upload fails.
 */
export function uploadFile(
  storage: FirebaseStorage,
  file: File,
  path: string,
  metadata: UploadMetadata,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (!storage) {
        return reject(new Error("Firebase Storage is not initialized."));
    }

    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        console.error('Upload failed in utility:', error);
        // The promise is rejected with the Firebase error, allowing the caller to handle it.
        reject(error);
      },
      async () => {
        // This completion callback is only called on successful upload.
        try {
          // The upload is complete, now get the download URL.
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          // Resolve the promise with the download URL, signaling success to the caller.
          resolve(downloadURL);
        } catch (err) {
          console.error('Failed to get download URL:', err);
          reject(new Error('File uploaded, but failed to get the download URL.'));
        }
      }
    );
  });
}
