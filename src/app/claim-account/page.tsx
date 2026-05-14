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
import { LogoBlack } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { CheckCircle, ArrowRight, ArrowLeft, Building2, Droplets, Users, Layout, ChevronRight } from 'lucide-react';
import { FullScreenLoader, Loader } from '@/components/ui/loader';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const claimSchema = z.object({
  clientId: z.string().min(1, { message: 'Client ID is required.' }),
});

const registerWorkspaceSchema = z.object({
  businessName: z.string().min(2, { message: 'Business name is required.' }),
  name: z.string().min(2, { message: 'Full name is required.' }),
  address: z.string().min(5, { message: 'Address is required.' }),
  industry: z.string().min(1, { message: 'Industry is required.' }),
  interests: z.array(z.string()).min(1, { message: 'Select at least one interest.' }),
});

type ClaimFormValues = z.infer<typeof claimSchema>;
type RegisterWorkspaceValues = z.infer<typeof registerWorkspaceSchema>;

const INDUSTRIES = [
  'Retail',
  'Technology',
  'Manufacturing',
  'Healthcare',
  'Education',
  'Food & Beverage',
  'Real Estate',
  'Professional Services',
  'Other'
];

const INTERESTS = [
  { id: 'water', label: 'Water Refill', icon: Droplets, description: 'Track your water supply.' },
  { id: 'hr', label: 'HR Management', icon: Users, description: 'Manage staff and payroll.' },
  { id: 'collab', label: 'Collaboration', icon: Layout, description: 'Work on shared documents.' },
];

export default function ClaimAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const [claimedProfile, setClaimedProfile] = useState<AppUser | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [mode, setMode] = useState<'claim' | 'create'>('create');
  const [setupStep, setSetupStep] = useState(1);

  const claimForm = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
  });

  const registerForm = useForm<RegisterWorkspaceValues>({
    resolver: zodResolver(registerWorkspaceSchema),
    defaultValues: {
      interests: [],
    }
  });

  useEffect(() => {
    if (isUserLoading || !firestore) return;
    if (!authUser) {
        router.push('/login');
        return;
    }

    const checkExistingOrInvited = async () => {
        const userDocRef = doc(firestore, 'users', authUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
            router.push('/onboarding');
            return;
        }

        const userEmail = authUser.email?.toLowerCase().trim();
        if (userEmail) {
            const inviteQuery = query(collection(firestore, 'unclaimedEmployees'), where('email', '==', userEmail));
            const inviteSnap = await getDocs(inviteQuery);
            if (!inviteSnap.empty) {
                router.push('/onboarding');
                return;
            }
        }
        setIsCheckingProfile(false);
    };
    checkExistingOrInvited();
  }, [authUser, isUserLoading, firestore, router]);

  const onClaimSubmit = async (data: ClaimFormValues) => {
    if (!firestore || !authUser) return;
    const normalizedClientId = data.clientId.trim().toUpperCase();
    try {
      const unclaimedProfileRef = doc(firestore, 'unclaimedProfiles', normalizedClientId);
      const userProfileRef = doc(firestore, 'users', authUser.uid);
      const unclaimedProfileSnap = await getDoc(unclaimedProfileRef);

      if (!unclaimedProfileSnap.exists()) {
        toast({ variant: 'destructive', title: 'Invalid ID', description: 'We couldn’t find a profile with that ID.' });
        return;
      }
      
      const batch = writeBatch(firestore);
      const unclaimedData = unclaimedProfileSnap.data();
      const newUserData: AppUser = {
        ...unclaimedData,
        id: authUser.uid,
        email: authUser.email!.toLowerCase().trim(),
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        accountStatus: 'Active',
        role: unclaimedData?.role || 'User',
        hrRole: unclaimedData?.hrRole || 'owner',
        companyId: normalizedClientId,
      } as AppUser;
      
      batch.set(userProfileRef, newUserData);
      batch.delete(unclaimedProfileRef);
      await batch.commit();
      toast({ title: 'Account linked' });
      setClaimedProfile(newUserData);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not link your account.' });
    }
  };

  const onCreateSubmit = async (data: RegisterWorkspaceValues) => {
    if (!firestore || !authUser) return;
    try {
      const batch = writeBatch(firestore);
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const generatedClientId = `RIVER-${randomSuffix}`;
      const userProfileRef = doc(firestore, 'users', authUser.uid);
      
      const newUserData: AppUser = {
        id: authUser.uid,
        clientId: generatedClientId,
        name: data.name,
        email: authUser.email!.toLowerCase().trim(),
        businessName: data.businessName,
        address: data.address,
        industry: data.industry,
        interests: data.interests,
        companyId: generatedClientId,
        role: 'User',
        hrRole: 'owner',
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        accountStatus: 'Active',
        totalConsumptionLiters: 0,
        plan: { name: 'Standard', price: 0, isConsumptionBased: true }
      } as AppUser;
      
      batch.set(userProfileRef, newUserData);
      await batch.commit();
      toast({ title: 'Workspace ready' });
      setClaimedProfile(newUserData);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not set up your workspace.' });
    }
  };

  if (isUserLoading || isCheckingProfile) return <FullScreenLoader text="Verifying..." />;

  return (
    <main className="min-h-screen w-full relative flex items-center justify-center p-6 bg-slate-50 overflow-hidden">
      {/* Blurred Dashboard Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
         <div className="flex h-full w-full">
            <div className="w-64 border-r bg-white/50 p-6 space-y-8">
                <div className="h-6 w-32 bg-slate-200 rounded" />
                <div className="space-y-4 pt-10">
                    {[1,2,3,4].map(i => <div key={i} className="h-8 w-full bg-slate-100 rounded-lg" />)}
                </div>
            </div>
            <div className="flex-1 p-10 grid grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-2xl border" />)}
                <div className="col-span-2 h-64 bg-white rounded-2xl border" />
                <div className="h-64 bg-white rounded-2xl border" />
            </div>
         </div>
         <div className="absolute inset-0 backdrop-blur-3xl bg-slate-50/40" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {claimedProfile ? (
          <Card className="w-full border-none shadow-2xl rounded-3xl bg-white animate-in fade-in zoom-in-95 duration-500">
            <CardHeader className="text-center pt-10">
              <div className="flex justify-center mb-6">
                  <div className="p-4 rounded-full bg-blue-50">
                      <CheckCircle className="h-12 w-12 text-blue-500" />
                  </div>
              </div>
              <CardTitle className="text-2xl font-bold">You're all set!</CardTitle>
              <CardDescription className="text-sm">
                Your workspace for <strong>{claimedProfile.businessName}</strong> is ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-6">
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Your Client ID</p>
                    <p className="text-xl font-bold text-slate-900">{claimedProfile.clientId}</p>
                </div>
            </CardContent>
            <CardFooter className="pb-10">
              <Button onClick={() => router.push('/dashboard')} className="w-full h-14 rounded-2xl font-bold text-base shadow-xl">
                Open Workspace <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="w-full border-none shadow-2xl rounded-3xl bg-white overflow-hidden">
            <CardHeader className="text-center pt-10 pb-6">
              <LogoBlack className="h-12 w-12 mx-auto mb-6" />
              <CardTitle className="text-2xl font-bold">
                {mode === 'create' ? 'Set up your workspace' : 'Link your account'}
              </CardTitle>
              <CardDescription className="text-sm">
                {mode === 'create' ? 'Tell us a bit about your business.' : 'Enter your Client ID to link your existing account.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8">
              {mode === 'claim' ? (
                <form onSubmit={claimForm.handleSubmit(onClaimSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="clientId" className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wide">Client ID</Label>
                    <Input 
                      id="clientId" 
                      placeholder="e.g. RIVER-123456" 
                      className="h-12 rounded-xl bg-slate-50 border-slate-100 px-4 font-bold" 
                      {...claimForm.register('clientId')} 
                      disabled={claimForm.formState.isSubmitting} 
                    />
                    {claimForm.formState.errors.clientId && <p className="text-xs text-red-500 mt-1 ml-1">{claimForm.formState.errors.clientId.message}</p>}
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={claimForm.formState.isSubmitting}>
                    {claimForm.formState.isSubmitting ? <Loader /> : 'Link Account'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {setupStep === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-400 ml-1">Business Name</Label>
                                    <Input placeholder="Acme Inc." className="h-12 rounded-xl bg-slate-50 border-slate-100" {...registerForm.register('businessName')} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-400 ml-1">Industry</Label>
                                    <Select onValueChange={(val) => registerForm.setValue('industry', val)} defaultValue={registerForm.getValues('industry')}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100"><SelectValue placeholder="Select Industry" /></SelectTrigger>
                                        <SelectContent className="rounded-xl">{INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-400 ml-1">Address</Label>
                                    <Textarea placeholder="Where are you located?" className="rounded-xl bg-slate-50 border-slate-100 min-h-[80px]" {...registerForm.register('address')} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-400 ml-1">Your Name</Label>
                                    <Input placeholder="Full Name" className="h-12 rounded-xl bg-slate-50 border-slate-100" {...registerForm.register('name')} />
                                </div>
                            </div>
                            <Button onClick={async () => { if (await registerForm.trigger(['businessName', 'name', 'address', 'industry'])) setSetupStep(2); }} className="w-full h-12 rounded-xl font-bold">
                                Continue
                            </Button>
                        </div>
                    )}

                    {setupStep === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <Label className="text-xs font-bold text-slate-400 ml-1 uppercase">What are you interested in?</Label>
                                <div className="grid grid-cols-1 gap-3">
                                    {INTERESTS.map((interest) => (
                                        <div 
                                            key={interest.id} 
                                            onClick={() => {
                                                const current = registerForm.getValues('interests') || [];
                                                registerForm.setValue('interests', current.includes(interest.label) ? current.filter(i => i !== interest.label) : [...current, interest.label], { shouldValidate: true });
                                            }}
                                            className={cn(
                                                "flex items-center space-x-4 p-4 rounded-2xl border transition-all cursor-pointer group",
                                                registerForm.watch('interests').includes(interest.label) ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", registerForm.watch('interests').includes(interest.label) ? "bg-blue-500 text-white" : "bg-white text-slate-400")}>
                                                <interest.icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900">{interest.label}</p>
                                                <p className="text-xs text-slate-400">{interest.description}</p>
                                            </div>
                                            {registerForm.watch('interests').includes(interest.label) && <CheckCircle className="h-5 w-5 text-blue-500" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setSetupStep(1)} className="h-12 px-6 rounded-xl font-bold text-slate-400"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                                <Button onClick={registerForm.handleSubmit(onCreateSubmit)} className="flex-1 h-12 rounded-xl font-bold shadow-lg" disabled={registerForm.formState.isSubmitting}>
                                    {registerForm.formState.isSubmitting ? <Loader /> : 'Finish Setup'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-6 pb-10 px-8">
               <Separator className="bg-slate-50" />
               <div className="flex items-center justify-between w-full">
                    <button onClick={() => { setMode(mode === 'claim' ? 'create' : 'claim'); setSetupStep(1); }} className="text-xs font-bold text-blue-500 hover:underline">
                        {mode === 'claim' ? "Create new workspace" : "Already have a Client ID?"}
                    </button>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">River Support</p>
               </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </main>
  );
}
