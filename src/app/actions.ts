
'use server';

import { revalidatePath } from 'next/cache';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, deleteApp } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// Initialize Firebase Admin SDK
let adminApp: App;

if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        adminApp = initializeApp({
            credential: credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
    } else {
        // This is a fallback for local development if environment variables are not set.
        // It will likely not work in a deployed environment without proper configuration.
        console.warn("Firebase Admin SDK credentials not found in environment variables. Attempting to initialize without explicit credentials.");
        try {
            adminApp = initializeApp();
        } catch(e) {
            console.error("Fatal: Could not initialize Firebase Admin SDK. Ensure you have the necessary environment variables set up or Application Default Credentials configured.", e);
        }
    }
} else {
  adminApp = getApps()[0];
}


const db = getFirestore(adminApp);
const storage = getStorage(adminApp);

export async function uploadProfilePhotoAction(formData: FormData) {
  const file = formData.get('file') as File;
  const userId = formData.get('userId') as string;
  const firestorePath = `users/${userId}`;
  const firestoreField = 'photoURL';

  if (!file || !userId) {
    return { success: false, error: 'Missing file or user ID.' };
  }
  
  if (!adminApp) {
    return { success: false, error: 'Firebase Admin SDK not initialized.' };
  }

  const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET);
  const filePath = `users/${userId}/profile/profile_photo.jpg`;
  const fileRef = bucket.file(filePath);

  try {
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
    
    const docRef = db.doc(firestorePath);
    await docRef.update({
      [firestoreField]: publicUrl,
    });

    revalidatePath('/dashboard');
    revalidatePath('/admin');

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Upload failed:', error);
    return { success: false, error: error.message };
  }
}
