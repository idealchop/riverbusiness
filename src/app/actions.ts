
'use server';

import { revalidatePath } from 'next/cache';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, credential } from 'firebase-admin/app';

// This is a robust way to initialize the Firebase Admin SDK in a serverless environment like Next.js.
// It ensures that the app is initialized only once per server instance.
function initializeAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // Ensure service account environment variable is set.
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  // Initialize the app with credential and storage bucket.
  return initializeApp({
    credential: credential.cert(serviceAccount),
    storageBucket: "studio-911553385-80027.appspot.com",
  });
}


export async function uploadProfilePhotoAction(formData: FormData) {
  try {
    // Ensure the storage bucket environment variable is set before proceeding.
    if (!process.env.FIREBASE_STORAGE_BUCKET) {
      throw new Error('FIREBASE_STORAGE_BUCKET environment variable is not set.');
    }
    
    // Initialize the app *inside* the action. This is the key fix.
    const adminApp = initializeAdminApp();
    const db = getFirestore(adminApp);
    const storage = getStorage(adminApp);
    
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return { success: false, error: 'Missing file or user ID.' };
    }
    
    // Explicitly specify the bucket to use.
    const bucket = storage.bucket("studio-911553385-80027.appspot.com");
    const filePath = `users/${userId}/profile/profile_photo.jpg`;
    const fileRef = bucket.file(filePath);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    const [publicUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '01-01-2500', // A very long-lived URL
    });
    
    const docRef = db.doc(`users/${userId}`);
    await docRef.update({
      photoURL: publicUrl,
    });

    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/test-upload');

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Upload failed:', error);
    return { success: false, error: error.message || "An unknown error occurred during upload." };
  }
}
