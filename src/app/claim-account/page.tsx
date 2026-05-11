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
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { CheckCircle } from 'lucide-react';
import { FullScreenLoader, Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';

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
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
  });

  useEffect(() => {
    if (isUserLoading || !firestore) {
        return; 
    }
    
    if (!authUser) {
        router.push('/login');
        return;
    }

    const checkExistingProfile = async () => {
        const userDocRef = doc(firestore, 'users', authUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            router.push('/dashboard');
        } else {
            setIsCheckingProfile(false);
        }
    };
    
    checkExistingProfile();
    
  }, [authUser, isUserLoading, firestore, router]);

  const onSubmit = async (data: ClaimFormValues) => {
    if (!firestore || !authUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'Services not ready. Please try again.' });
      return;
    }

    const normalizedClientId = data.clientId.trim().toUpperCase();

    try {
      const unclaimedProfileRef = doc(firestore, 'unclaimedProfiles', normalizedClientId);
      const userProfileRef = doc(firestore, 'users', authUser.uid);
      
      const unclaimedProfileSnap = await getDoc(unclaimedProfileRef);

      if (!unclaimedProfileSnap.exists()) {
        toast({ variant: 'destructive', title: 'Claim Failed', description: 'The provided Client ID is invalid or does not exist.' });
        return;
      }
      
      const batch = writeBatch(firestore);

      const unclaimedData = unclaimedProfileSnap.data() as Partial<AppUser>;
      
      // Explicitly set the infrastructure roles for the claiming client
      const newUserData: AppUser = {
        ...unclaimedData,
        id: authUser.uid,
        email: authUser.email as string,
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        accountStatus: 'Active',
        role: unclaimedData.role || 'User', // Honor the role assigned by the admin
        hrRole: unclaimedData.hrRole || 'owner', // Default to owner if not specified
        companyId: normalizedClientId, // Ensure companyId is consistent with the verified clientId
      } as AppUser;
      
      batch.set(userProfileRef, newUserData);
      batch.delete(unclaimedProfileRef);
      
      await batch.commit();

      toast({ title: 'Profile Claimed!', description: "Welcome to River Business." });
      setClaimedProfile(newUserData);

    } catch (error) {
      console.error("Error claiming profile: ", error);
      toast({ variant: 'destructive', title: 'Claim Failed', description: 'An unexpected error occurred during profile synchronization.' });
    }
  };

  if (isUserLoading || isCheckingProfile) {
    return <FullScreenLoader />;
  }

  if (claimedProfile) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl border-none shadow-2xl rounded-[2.5rem]">
          <CardHeader className="text-center pt-10">
            <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-green-50">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
            </div>
            <CardTitle className="text-3xl font-bold">Welcome, {claimedProfile.businessName}!</CardTitle>
            <CardDescription className="text-base">
              Your business profile has been activated successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-10">
            <div className="space-y-4">
                <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Business identity</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Client ID</p>
                            <p className="text-slate-900">{claimedProfile.clientId}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">System Role</p>
                            <p className="text-slate-900 capitalize">{claimedProfile.role}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 md:col-span-2">
                            <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Assigned Address</p>
                            <p className="text-slate-900">{claimedProfile.address}</p>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active plan</h4>
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-900">{claimedProfile.plan?.name}</p>
                            <p className="text-xs text-blue-600 font-medium">Fulfillment Sync Active</p>
                        </div>
                        <Badge variant="outline" className="bg-white border-blue-200 text-blue-700">Verified</Badge>
                    </div>
                </div>
            </div>
          </CardContent>
          <CardFooter className="pb-10 px-10">
            <Button onClick={() => router.push(claimedProfile.role === 'Admin' ? '/admin' : '/dashboard')} className="w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/20">
              Launch Workspace
            </Button>
          </CardFooter>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-6">
        <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] p-4">
          <CardHeader className="text-center pt-8">
            <Logo className="h-16 w-16 mb-6 mx-auto" />
            <CardTitle className="text-2xl font-bold tracking-tight">Activate account</CardTitle>
            <CardDescription className="text-base pt-2">
              Enter your unique Client ID to link your business profile and unlock the Command Center.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clientId" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Client identification</Label>
                <Input
                  id="clientId"
                  placeholder="e.g. SC-12345"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-200 px-5 font-bold focus-visible:ring-primary/20 uppercase"
                  {...register('clientId')}
                  disabled={isSubmitting}
                />
                {errors.clientId && <p className="text-[10px] font-black text-destructive mt-2 uppercase tracking-tighter ml-1">{errors.clientId.message}</p>}
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/10" disabled={isSubmitting}>
                {isSubmitting ? <Loader /> : 'Link Profile'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center pb-8">
             <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                Need help? Contact our sales executive or email <a href="mailto:support@riverph.com" className="font-black text-primary hover:underline">support@riverph.com</a>.
             </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
