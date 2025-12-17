
'use server';

import { revalidatePath } from 'next/cache';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, credential } from 'firebase-admin/app';

// This is a robust way to initialize the Firebase Admin SDK in a serverless environment like Next.js.
// It ensures that the app is initialized only once.
function initializeAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  }
   if (!process.env.FIREBASE_STORAGE_BUCKET) {
    throw new Error('FIREBASE_STORAGE_BUCKET environment variable is not set.');
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  return initializeApp({
    credential: credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}


export async function uploadProfilePhotoAction(formData: FormData) {
  try {
    const adminApp = initializeAdminApp();
    const db = getFirestore(adminApp);
    const storage = getStorage(adminApp);
    
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const firestorePath = `users/${userId}`;
    const firestoreField = 'photoURL';

    if (!file || !userId) {
      return { success: false, error: 'Missing file or user ID.' };
    }
    
    const bucket = storage.bucket(); // Use the default bucket from initialization
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
    
    const docRef = db.doc(firestorePath);
    await docRef.update({
      [firestoreField]: publicUrl,
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
