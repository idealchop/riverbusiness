'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { FullScreenLoader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import type { AppUser } from '@/lib/types';

/**
 * Onboarding Orchestrator
 * Analyzes the authentication state and Firestore profile to determine the 
 * correct routing for Type 1 (Admin Provisioned), Type 2 (Self-Registered), 
 * or Type 3 (Invited Employee) users.
 */
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

    // MANDATORY EMAIL VERIFICATION CHECK
    if (!authUser.emailVerified) {
        router.push('/verify-email');
        return;
    }

    const analyzeIdentityAndRoute = async () => {
      const userDocRef = doc(firestore, 'users', authUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      // Check if Profile Already Exists (Type 1 setup complete, Type 2 complete, or Type 3 complete)
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as AppUser;
        
        // Direct users based on their resolved infrastructure role
        if (userData.hrRole === 'employee') {
          router.push('/hr-dashboard/attendance');
        } else if (userData.role === 'Admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
        return;
      }

      // IDENTITY TYPE 3: Check for pending employee invitation (Magic Claim)
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
            // companyId is inherited from the inviteData
          } as AppUser;
          
          batch.set(newUserRef, newUserData);
          batch.delete(inviteDoc.ref);
          
          await batch.commit();
          
          toast({ title: 'Welcome to the team!', description: 'Your employee workspace has been activated.' });
          router.push('/hr-dashboard/attendance');
          return;
        } catch (error) {
          console.error("Identity resolution error:", error);
          toast({ variant: 'destructive', title: 'Activation failed', description: 'Could not sync your profile.' });
        }
      }

      // IDENTITY TYPE 1 or 2: No profile or employee invite found, move to Workspace Ownership choice
      router.push('/claim-account');
    };
    
    analyzeIdentityAndRoute();

  }, [authUser, isUserLoading, firestore, router, toast]);

  return <FullScreenLoader text="Synchronizing secure workspace..." />;
}
