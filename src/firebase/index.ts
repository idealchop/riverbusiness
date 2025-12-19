
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// This function ensures that Firebase is initialized only once.
function getFirebaseServices() {
  let firebaseApp: FirebaseApp;

  if (!getApps().length) {
    try {
      // Try to initialize with environment variables first (for App Hosting)
      firebaseApp = initializeApp(process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : firebaseConfig);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
          console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      // Fallback to config object if automatic initialization fails
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    // If already initialized, get the existing app
    firebaseApp = getApp();
  }

  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  const storage = getStorage(firebaseApp);

  return { firebaseApp, auth, firestore, storage };
}

// This is the function that components will call to get the services.
// It ensures initialization only happens on the client.
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    // On the server, return null or mock objects
    return {
      firebaseApp: null,
      auth: null,
      firestore: null,
      storage: null,
    };
  }
  return getFirebaseServices();
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
