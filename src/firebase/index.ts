
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// This structure ensures that Firebase is initialized only once.
let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;


// Check if Firebase has already been initialized
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

// Get SDK instances from the initialized app
auth = getAuth(firebaseApp);
firestore = getFirestore(firebaseApp);
storage = getStorage(firebaseApp);


// This function is now a simple getter for the initialized services.
// It does not perform any initialization itself.
export function initializeFirebase() {
  return {
    firebaseApp,
    auth,
    firestore,
    storage,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
