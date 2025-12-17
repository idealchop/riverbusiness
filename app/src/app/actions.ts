
'use server';

import 'dotenv/config';
import { revalidatePath } from 'next/cache';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';
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
        console.error("Firebase Admin SDK credentials not found in environment variables.");
    }
} else {
  adminApp = getApps()[0];
}


const db = adminApp ? getFirestore(adminApp) : null;
const storage = adminApp ? getStorage(adminApp) : null;

export async function uploadProfilePhotoAction(formData: FormData) {
  const file = formData.get('file') as File;
  const userId = formData.get('userId') as string;

  if (!db || !storage) {
    const errorMsg = 'Firebase Admin SDK not initialized. Cannot perform upload.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }
  
  if (!file || !userId) {
    return { success: false, error: 'Missing file or user ID.' };
  }
  
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
      const errorMsg = 'Firebase Storage bucket name not configured in environment variables.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
  }

  const bucket = storage.bucket(bucketName);
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
    
    const docRef = db.doc(`users/${userId}`);
    await docRef.update({
      photoURL: publicUrl,
    });

    revalidatePath('/dashboard');
    revalidatePath('/admin');

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Upload failed:', error);
    return { success: false, error: error.message };
  }
}
