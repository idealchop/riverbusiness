
'use client';

import { getStorage, ref, uploadBytesResumable, getDownloadURL, type FirebaseStorage, type UploadMetadata } from 'firebase/storage';

/**
 * A robust, promise-based function to upload a file to Firebase Storage with progress tracking and metadata.
 *
 * @param storage The initialized FirebaseStorage instance.
 * @param file The file to upload.
 * @param path The full path in Firebase Storage where the file should be saved.
 * @param metadata The metadata to attach to the file, used by the Cloud Function.
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
        switch (error.code) {
          case 'storage/unauthorized':
            reject(new Error('Permission denied. Please check your storage security rules.'));
            break;
          case 'storage/canceled':
            // Don't reject on cancel, just resolve with an empty string or handle as needed
            resolve(''); 
            break;
          default:
            reject(new Error(`Upload failed. Reason: ${error.code}`));
            break;
        }
      },
      async () => {
        try {
          // The upload is complete. Now, get the download URL.
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (err) {
          console.error('Failed to get download URL:', err);
          reject(new Error('File uploaded, but failed to get the download URL.'));
        }
      }
    );
  });
}
