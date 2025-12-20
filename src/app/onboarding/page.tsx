
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function OnboardingPage() {
  const router = useRouter();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();

  React.useEffect(() => {
    if (isUserLoading) {
      return; 
    }
    
    if (!authUser) {
      router.push('/login');
      return;
    }

    const checkUserDoc = async () => {
      if (!firestore) return;
      
      const userDocRef = doc(firestore, 'users', authUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        // User has a profile, should be on dashboard
        router.push('/dashboard');
      } else {
        // User is new and needs to claim an account
        router.push('/claim-account');
      }
    };
    
    checkUserDoc();

  }, [authUser, isUserLoading, firestore, router]);

  // Render a loading state while checks are in progress
  return (
    <div className="flex h-screen items-center justify-center">
      <p>Redirecting...</p>
    </div>
  );
}
