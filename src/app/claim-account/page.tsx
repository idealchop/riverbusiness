
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, getDocs, writeBatch, collection, query } from 'firebase/firestore';
import type { AppUser, Payment } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { CheckCircle } from 'lucide-react';

const claimSchema = z.object({
  clientId: z.string().min(1, { message: 'Client ID is required.' }),
});

type ClaimFormValues = z.infer<typeof claimSchema>;

export default function ClaimAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [claimedProfile, setClaimedProfile] = useState<AppUser | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
  });

  useEffect(() => {
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
      
      const unclaimedProfileSnap = await getDoc(unclaimedProfileRef);

      if (!unclaimedProfileSnap.exists()) {
        toast({ variant: 'destructive', title: 'Claim Failed', description: 'The provided Client ID is invalid. Please check and try again.' });
        return;
      }
      
      const batch = writeBatch(firestore);

      const unclaimedData = unclaimedProfileSnap.data();
      const newUserData: AppUser = {
        ...(unclaimedData as AppUser),
        id: authUser.uid,
        email: authUser.email as string,
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        accountStatus: 'Active',
      };
      
      // Move any initial invoices (e.g., one-time fees) from unclaimed to the user's profile
      const initialPaymentsQuery = query(collection(unclaimedProfileRef, 'payments'));
      const initialPaymentsSnap = await getDocs(initialPaymentsQuery);
      
      if (!initialPaymentsSnap.empty) {
          initialPaymentsSnap.forEach(paymentDoc => {
              const paymentData = paymentDoc.data() as Payment;
              const newPaymentRef = doc(collection(userProfileRef, 'payments'), paymentDoc.id);
              batch.set(newPaymentRef, paymentData);
              batch.delete(paymentDoc.ref); // Delete from unclaimed
          });
      }

      batch.set(userProfileRef, newUserData);
      batch.delete(unclaimedProfileRef);
      
      await batch.commit();

      toast({ title: 'Profile Claimed!', description: "Please review your account details below." });
      setClaimedProfile(newUserData);

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

  if (claimedProfile) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 mb-4 mx-auto text-green-500" />
            <CardTitle>Welcome, {claimedProfile.businessName}!</CardTitle>
            <CardDescription>
              Your account has been successfully claimed. Please confirm the details below.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div className="space-y-2 rounded-lg border p-4">
                <h4 className="font-semibold">Business Details</h4>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <div><span className="font-medium text-muted-foreground">Client ID:</span> {claimedProfile.clientId}</div>
                    <div><span className="font-medium text-muted-foreground">Business Name:</span> {claimedProfile.businessName}</div>
                    <div><span className="font-medium text-muted-foreground">Contact Name:</span> {claimedProfile.name}</div>
                    <div><span className="font-medium text-muted-foreground">Contact Number:</span> {claimedProfile.contactNumber}</div>
                    <div className="md:col-span-2"><span className="font-medium text-muted-foreground">Address:</span> {claimedProfile.address}</div>
                </div>
            </div>
             <div className="space-y-2 rounded-lg border p-4">
                <h4 className="font-semibold">Plan Details</h4>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <div><span className="font-medium text-muted-foreground">Plan Name:</span> {claimedProfile.plan?.name}</div>
                    {claimedProfile.plan?.isConsumptionBased ? (
                         <div><span className="font-medium text-muted-foreground">Rate:</span> P{claimedProfile.plan?.price}/liter</div>
                    ) : (
                        <>
                         <div><span className="font-medium text-muted-foreground">Monthly Fee:</span> P{claimedProfile.plan?.price?.toLocaleString()}</div>
                         <div><span className="font-medium text-muted-foreground">Monthly Liters:</span> {claimedProfile.customPlanDetails?.litersPerMonth?.toLocaleString()} L</div>
                        </>
                    )}
                    <div><span className="font-medium text-muted-foreground">Delivery Schedule:</span> {claimedProfile.customPlanDetails?.deliveryDay} at {claimedProfile.customPlanDetails?.deliveryTime}</div>
                </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Proceed to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-4">
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
        <div className="text-center text-xs text-muted-foreground max-w-sm">
          <p>
            Trouble getting your account? Send us an email at <a href="mailto:customer@riverph.com" className="font-semibold text-primary hover:underline">customer@riverph.com</a> or reach out to your sales executive.
          </p>
        </div>
      </div>
    </main>
  );
}
