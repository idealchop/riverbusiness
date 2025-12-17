
'use server';

import { revalidatePath } from 'next/cache';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, credential } from 'firebase-admin/app';

// This is the definitive, robust way to initialize the Firebase Admin SDK in a serverless environment.
// It ensures that the app is initialized only once per server instance and correctly parses credentials.
function initializeAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // Ensure service account environment variable is set.
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  }

  // Correctly parse the service account JSON, handling escaped newlines.
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
  // The official way to handle the private key from an env var.
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  // Initialize the app with the correctly parsed credential.
  return initializeApp({
    credential: credential.cert(serviceAccount),
    // The storage bucket is specified at the time of use, not here.
  });
}

const BUCKET_NAME = "studio-911553385-80027.appspot.com";

export async function uploadProfilePhotoAction(formData: FormData) {
  try {
    // Initialize the app *inside* the action. This is key for serverless environments.
    const adminApp = initializeAdminApp();
    const db = getFirestore(adminApp);
    const storage = getStorage(adminApp);
    
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return { success: false, error: 'Missing file or user ID.' };
    }
    
    // Explicitly specify the bucket to use. This is the definitive fix.
    const bucket = storage.bucket(BUCKET_NAME);
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

    // Revalidate paths to ensure the new photo shows up immediately
    revalidatePath('/dashboard');
    revalidatePath('/admin');

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Upload failed:', error);
    // Provide a more helpful error message in the response
    const errorMessage = error.message?.includes('access token') 
      ? 'Authentication with Firebase failed. Check server credentials.'
      : error.message || "An unknown error occurred during upload.";
    return { success: false, error: errorMessage };
  }
}
