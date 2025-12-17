
'use server';

import { revalidatePath } from 'next/cache';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// Initialize Firebase Admin SDK
let adminApp: App;
if (!getApps().length) {
  // In a real production environment, you would use applicationDefault()
  // or another secure method to load credentials.
  // For this environment, we assume credentials might be available as env vars.
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      adminApp = initializeApp({
          credential: credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
  } else {
      // Fallback for local dev if ADC is not set up
      // This will use the service account key from the file path if available
      try {
        adminApp = initializeApp({
            credential: applicationDefault(),
            storageBucket: 'studio-911553385-80027.appspot.com'
        });
      } catch (e) {
        console.error("Could not initialize Firebase Admin SDK. Ensure you have the necessary environment variables set up.");
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

  const bucket = storage.bucket('gs://studio-911553385-80027.appspot.com');
  const filePath = `users/${userId}/profile/profile_photo.jpg`;
  const fileRef = bucket.file(filePath);

  try {
    // 1. Upload the file buffer to Firebase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // 2. Make the file public and get its URL
    await fileRef.makePublic();
    const publicUrl = fileRef.publicUrl();

    // 3. Update the Firestore document
    const docRef = db.doc(firestorePath);
    await docRef.update({
      [firestoreField]: publicUrl,
    });

    // 4. Revalidate the path to show the new image
    revalidatePath('/dashboard');
    revalidatePath('/admin');

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Upload failed:', error);
    return { success: false, error: error.message };
  }
}
