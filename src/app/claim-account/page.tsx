
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, writeBatch } from 'firebase/firestore';

const claimSchema = z.object({
  clientId: z.string().min(1, { message: 'Client ID is required.' }),
});

type ClaimFormValues = z.infer<typeof claimSchema>;

export default function ClaimAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
  });

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!isUserLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isUserLoading, router]);

  const onSubmit = async (data: ClaimFormValues) => {
    if (!firestore || !authUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'Services not ready. Please try again.' });
      return;
    }

    const { clientId } = data;

    try {
      const unclaimedProfileRef = doc(firestore, 'unclaimedProfiles', clientId);
      const userProfileRef = doc(firestore, 'users', authUser.uid);

      const batch = writeBatch(firestore);

      const unclaimedProfileSnap = await getDoc(unclaimedProfileRef);

      if (!unclaimedProfileSnap.exists()) {
        toast({ variant: 'destructive', title: 'Claim Failed', description: 'The provided Client ID is invalid. Please check and try again.' });
        return;
      }

      const unclaimedData = unclaimedProfileSnap.data();
      
      // The definitive fix: Ensure all data from the unclaimed profile,
      // including the top-level customPlanDetails and totalConsumptionLiters,
      // is correctly copied to the new user profile.
      const newUserData = {
        ...unclaimedData, // This carries over all fields like customPlanDetails, totalConsumptionLiters, etc.
        id: authUser.uid,
        email: authUser.email,
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        accountStatus: 'Active',
      };

      batch.set(userProfileRef, newUserData);
      batch.delete(unclaimedProfileRef);
      
      await batch.commit();

      toast({ title: 'Profile Claimed!', description: 'Your account is ready. Welcome to River Business!' });
      router.push('/dashboard');

    } catch (error) {
      console.error("Error claiming profile: ", error);
      toast({ variant: 'destructive', title: 'Claim Failed', description: 'An unexpected error occurred. Please contact support.' });
    }
  };

  if (isUserLoading || !authUser) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Logo className="h-16 w-16 mb-4 mx-auto" />
          <CardTitle>Welcome to River Business!</CardTitle>
          <CardDescription>
            You're one step away from unlocking a smarter way to manage your water! We've sent the final piece—your Client ID—to your email. Please enter it below to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                placeholder="e.g. C-12345"
                {...register('clientId')}
                disabled={isSubmitting}
              />
              {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Claiming...' : 'Claim Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
