'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
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

      // 1. Check if Profile Already Exists
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

      // 2. IDENTITY TYPE 3: Check for pending employee invitation (Magic Claim)
      // We look for an invite matching the current user's email
      const userEmail = authUser.email?.toLowerCase().trim();
      if (userEmail) {
          const employeeInviteQuery = query(
            collection(firestore, 'unclaimedEmployees'),
            where('email', '==', userEmail)
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
                email: userEmail,
                onboardingComplete: true,
                lastLogin: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                role: 'User',
                hrRole: 'employee',
                // companyId and hrProfile are inherited from the inviteData
              } as AppUser;
              
              batch.set(newUserRef, newUserData);
              batch.delete(inviteDoc.ref);
              
              await batch.commit();
              
              toast({ title: 'Profile Activated', description: `Welcome to the ${inviteData.inviterBusinessName || 'team'} workspace.` });
              router.push('/hr-dashboard/attendance');
              return;
            } catch (error) {
              console.error("Magic Claim failed:", error);
              toast({ variant: 'destructive', title: 'Activation failed', description: 'Could not sync your employee profile.' });
            }
          }
      }

      // 3. IDENTITY TYPE 1 or 2: No profile or employee invite found, move to Workspace Ownership choice
      router.push('/claim-account');
    };
    
    analyzeIdentityAndRoute();

  }, [authUser, isUserLoading, firestore, router, toast]);

  return <FullScreenLoader text="Synchronizing secure workspace..." />;
}
