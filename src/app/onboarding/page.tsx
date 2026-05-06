'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { FullScreenLoader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingPage() {
  const router = useRouter();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  React.useEffect(() => {
    if (isUserLoading || !firestore) {
      return; 
    }
    
    if (!authUser) {
      router.push('/login');
      return;
    }

    const checkUserDoc = async () => {
      const userDocRef = doc(firestore, 'users', authUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        // User has a profile, go to dashboard
        router.push('/dashboard');
        return;
      }

      // Check if user is an employee being invited
      const employeeInviteQuery = query(
        collection(firestore, 'unclaimedEmployees'),
        where('email', '==', authUser.email?.toLowerCase().trim())
      );
      const inviteSnap = await getDocs(employeeInviteQuery);

      if (!inviteSnap.empty) {
        const inviteDoc = inviteSnap.docs[0];
        const inviteData = inviteDoc.data();
        
        try {
          const batch = writeBatch(firestore);
          const newUserRef = doc(firestore, 'users', authUser.uid);
          
          batch.set(newUserRef, {
            ...inviteData,
            id: authUser.uid,
            onboardingComplete: true,
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          });
          
          batch.delete(inviteDoc.ref);
          
          await batch.commit();
          
          toast({ title: 'Welcome aboard!', description: 'Your employee profile has been activated.' });
          router.push('/hr-dashboard');
          return;
        } catch (error) {
          console.error("Error claiming employee profile:", error);
          toast({ variant: 'destructive', title: 'Onboarding failed', description: 'Could not activate your profile.' });
        }
      }

      // User is new and needs to claim a client account (original flow)
      router.push('/claim-account');
    };
    
    checkUserDoc();

  }, [authUser, isUserLoading, firestore, router, toast]);

  return <FullScreenLoader text="Preparing your profile" />;
}
