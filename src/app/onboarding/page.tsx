'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { FullScreenLoader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import type { AppUser } from '@/lib/types';

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
        const userData = userDocSnap.data() as AppUser;
        // Direct users based on their HR role
        if (userData.hrRole === 'employee') {
          router.push('/hr-dashboard/attendance');
        } else {
          router.push('/dashboard');
        }
        return;
      }

      // Check if user is an employee being invited (Magic Claim)
      // This is the highest priority claim for invited staff
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
          
          const newUserData: AppUser = {
            ...inviteData,
            id: authUser.uid,
            email: authUser.email!.toLowerCase().trim(),
            onboardingComplete: true,
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            role: 'User',
            hrRole: 'employee',
          } as AppUser;
          
          batch.set(newUserRef, newUserData);
          batch.delete(inviteDoc.ref);
          
          await batch.commit();
          
          toast({ title: 'Welcome to the team!', description: 'Your employee workspace has been activated.' });
          router.push('/hr-dashboard/attendance');
          return;
        } catch (error) {
          console.error("Error claiming employee profile:", error);
          toast({ variant: 'destructive', title: 'Onboarding failed', description: 'Could not activate your profile.' });
        }
      }

      // If no invitation found, proceed to standard client claim
      router.push('/claim-account');
    };
    
    checkUserDoc();

  }, [authUser, isUserLoading, firestore, router, toast]);

  return <FullScreenLoader text="Initializing workspace" />;
}
