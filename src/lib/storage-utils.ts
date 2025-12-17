
'use client';

import { getStorage, ref, uploadBytesResumable, getDownloadURL, UploadTask, UploadTaskSnapshot } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import type { Auth } from 'firebase/auth';

/**
 * A reusable, robust function to upload a file to Firebase Storage with progress tracking.
 *
 * @param file The file to be uploaded.
 * @param path The relative path within Firebase Storage (e.g., 'users/user-id/profile/photo.jpg').
 * @param onProgress An optional callback function to receive upload progress updates (0-100).
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export const uploadFile = async (
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const { toast } = useToast();
  const storage = getStorage();
  
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
        // Handle unsuccessful uploads
        console.error('Upload failed:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: `Could not upload file. Reason: ${error.code}`,
        });
        reject(error);
      },
      async () => {
        // Handle successful uploads on complete
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error('Failed to get download URL:', error);
          toast({
            variant: 'destructive',
            title: 'Processing Failed',
            description: 'File was uploaded but could not be processed.',
          });
          reject(error);
        }
      }
    );
  });
};
