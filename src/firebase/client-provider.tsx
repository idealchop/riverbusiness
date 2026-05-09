'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { type FirebaseApp } from 'firebase/app';
import { type Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { type Firestore } from 'firebase/firestore';
import { type FirebaseStorage } from 'firebase/storage';
import { initializeFirebase } from './index';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  storage: FirebaseStorage | null;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices>({
    firebaseApp: null,
    auth: null,
    firestore: null,
    storage: null,
  });

  useEffect(() => {
    // Standardize initialization through the singleton pattern
    const initialized = initializeFirebase();
    
    if (initialized) {
        const { firebaseApp, auth, firestore, storage } = initialized;
        
        // Configure Auth persistence once on start
        setPersistence(auth, browserLocalPersistence)
            .catch((error) => {
                console.warn("Firebase Auth persistence configuration notice:", error);
            })
            .finally(() => {
                setServices({ firebaseApp, auth, firestore, storage });
            });
    }
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
      storage={services.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
