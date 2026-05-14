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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const claimSchema = z.object({
  clientId: z.string().min(1, { message: 'Client ID is required.' }),
});

const registerWorkspaceSchema = z.object({
  businessName: z.string().min(2, { message: 'Business name is required.' }),
  name: z.string().min(2, { message: 'Full name is required.' }),
  address: z.string().min(5, { message: 'Complete business address is required.' }),
  industry: z.string().min(1, { message: 'Industry classification is required.' }),
  interests: z.array(z.string()).min(1, { message: 'Select at least one area of interest.' }),
});

type ClaimFormValues = z.infer<typeof claimSchema>;
type RegisterWorkspaceValues = z.infer<typeof registerWorkspaceSchema>;

const INDUSTRIES = [
  'Retail & E-commerce',
  'Technology & Software',
  'Manufacturing & Logistics',
  'Healthcare & Medical',
  'Education & Training',
  'Food & Beverage',
  'Real Estate & Construction',
  'Professional Services',
  'Other'
];

const INTERESTS = [
  { id: 'water', label: 'Water Refill', icon: Droplets, description: 'Supply tracking.' },
  { id: 'hr', label: 'HR Management', icon: Users, description: 'Payroll & staff.' },
  { id: 'collab', label: 'Collaboration', icon: Layout, description: 'Shared documents.' },
];

export default function ClaimAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const [claimedProfile, setClaimedProfile] = useState<AppUser | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [mode, setMode] = useState<'claim' | 'create'>('claim');
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
        toast({ variant: 'destructive', title: 'Claim Failed', description: 'Invalid Client ID.' });
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
      toast({ title: 'Profile Claimed' });
      setClaimedProfile(newUserData);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Claim Failed' });
    }
  };

  const onCreateSubmit = async (data: RegisterWorkspaceValues) => {
    if (!firestore || !authUser) return;
    try {
      const batch = writeBatch(firestore);
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const generatedClientId = `SC-SR-${randomSuffix}`;
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
        plan: { name: 'Standard Self-Registered', price: 0, isConsumptionBased: true }
      } as AppUser;
      
      batch.set(userProfileRef, newUserData);
      await batch.commit();
      toast({ title: 'Workspace Initialized' });
      setClaimedProfile(newUserData);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Setup Failed' });
    }
  };

  if (isUserLoading || isCheckingProfile) return <FullScreenLoader text="Validating access..." />;

  return (
    <main className="min-h-screen w-full relative flex items-center justify-center p-6 bg-slate-50 overflow-hidden">
      {/* Subtle Background Atmosphere */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
         <div className="flex h-full w-full">
            <div className="w-64 border-r bg-white/50 p-6 space-y-8">
                <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
                <div className="space-y-4 pt-10">
                    {[1,2,3].map(i => <div key={i} className="h-8 w-full bg-slate-100 rounded-lg" />)}
                </div>
            </div>
            <div className="flex-1 p-10 grid grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-2xl border" />)}
                <div className="col-span-2 h-64 bg-white rounded-2xl border" />
                <div className="h-64 bg-white rounded-2xl border" />
            </div>
         </div>
         <div className="absolute inset-0 backdrop-blur-2xl bg-slate-50/40" />
      </div>

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-10">
        {!claimedProfile && (
            <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-700">
                <LogoBlack className="h-12 w-12 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Initialize Workspace</h2>
                <p className="text-slate-500 text-sm font-medium">Finalize your ecosystem environment.</p>
            </div>
        )}

        {claimedProfile ? (
          <Card className="w-full border-none shadow-xl rounded-3xl bg-white animate-in fade-in zoom-in-95 duration-500">
            <CardHeader className="text-center pt-8">
              <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-green-50">
                      <CheckCircle className="h-10 w-10 text-green-500" />
                  </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">Workspace Ready</CardTitle>
              <CardDescription className="text-sm">
                Initialized for <strong>{claimedProfile.businessName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1 text-center">
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Client ID</p>
                        <p className="text-sm font-bold text-primary tabular-nums">{claimedProfile.clientId}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1 text-center">
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Access</p>
                        <p className="text-sm font-bold text-slate-900">Authorized</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pb-8">
              <Button onClick={() => router.push('/dashboard')} className="w-full h-12 rounded-xl font-bold text-sm shadow-lg shadow-primary/20">
                Launch Ecosystem <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="w-full border-none shadow-2xl rounded-2xl bg-white overflow-hidden">
            <CardHeader className="text-center bg-slate-50/50 pb-8 pt-8">
              <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                {mode === 'claim' ? 'Sync Client ID' : 'Create Organization'}
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                {mode === 'claim' ? 'Link existing business profile.' : 'Set up a new organizational infrastructure.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8">
              {mode === 'claim' ? (
                <form onSubmit={claimForm.handleSubmit(onClaimSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="clientId" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Identification Key</Label>
                    <Input id="clientId" placeholder="SC-XXXXXX" className="h-12 rounded-xl bg-slate-50 border-slate-100 px-4 text-sm font-bold uppercase tracking-widest tabular-nums" {...claimForm.register('clientId')} disabled={claimForm.formState.isSubmitting} />
                    {claimForm.formState.errors.clientId && <p className="text-[10px] font-bold text-destructive mt-1 ml-1">{claimForm.formState.errors.clientId.message}</p>}
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest" disabled={claimForm.formState.isSubmitting}>
                    {claimForm.formState.isSubmitting ? <Loader /> : 'Sync Profile'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex items-center justify-center gap-3">
                        <div className={cn("h-1 w-8 rounded-full transition-all", setupStep >= 1 ? "bg-primary" : "bg-slate-100")} />
                        <div className={cn("h-1 w-8 rounded-full transition-all", setupStep >= 2 ? "bg-primary" : "bg-slate-100")} />
                    </div>

                    {setupStep === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Identity Phase</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Business name</Label>
                                        <Input placeholder="Acme Logistics" className="h-10 rounded-lg bg-slate-50 border-slate-100 text-sm font-semibold" {...registerForm.register('businessName')} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Industry</Label>
                                        <Select onValueChange={(val) => registerForm.setValue('industry', val)} defaultValue={registerForm.getValues('industry')}>
                                            <SelectTrigger className="h-10 rounded-lg bg-slate-50 border-slate-100 text-sm font-semibold"><SelectValue placeholder="Select Industry" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">{INDUSTRIES.map(ind => <SelectItem key={ind} value={ind} className="text-xs">{ind}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Physical address</Label>
                                        <Textarea placeholder="Complete location" className="rounded-lg bg-slate-50 border-slate-100 text-sm min-h-[60px]" {...registerForm.register('address')} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Account representative</Label>
                                        <Input placeholder="Full Name" className="h-10 rounded-lg bg-slate-50 border-slate-100 text-sm font-semibold" {...registerForm.register('name')} />
                                    </div>
                                </div>
                            </div>
                            <Button onClick={async () => { if (await registerForm.trigger(['businessName', 'name', 'address', 'industry'])) setSetupStep(2); }} className="w-full h-11 rounded-xl text-xs font-bold uppercase tracking-widest">
                                Continue <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {setupStep === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Focus Phase</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {INTERESTS.map((interest) => (
                                        <div 
                                            key={interest.id} 
                                            onClick={() => {
                                                const current = registerForm.getValues('interests') || [];
                                                registerForm.setValue('interests', current.includes(interest.label) ? current.filter(i => i !== interest.label) : [...current, interest.label], { shouldValidate: true });
                                            }}
                                            className={cn(
                                                "flex items-center space-x-4 p-4 rounded-xl border transition-all cursor-pointer group",
                                                registerForm.watch('interests').includes(interest.label) ? "bg-primary/5 border-primary" : "bg-slate-50 border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", registerForm.watch('interests').includes(interest.label) ? "bg-primary text-white" : "bg-white text-slate-400")}>
                                                <interest.icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900 leading-none">{interest.label}</p>
                                                <p className="text-[9px] font-medium text-slate-400 mt-1">{interest.description}</p>
                                            </div>
                                            {registerForm.watch('interests').includes(interest.label) && <CheckCircle className="h-4 w-4 text-primary" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setSetupStep(1)} className="h-11 px-4 text-xs font-bold text-slate-400"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                                <Button onClick={registerForm.handleSubmit(onCreateSubmit)} className="flex-1 h-11 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20" disabled={registerForm.formState.isSubmitting}>
                                    {registerForm.formState.isSubmitting ? <Loader /> : 'Complete Setup'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-6 pb-8 px-8">
               <Separator className="bg-slate-50" />
               <div className="flex items-center justify-between w-full">
                    <button onClick={() => { setMode(mode === 'claim' ? 'create' : 'claim'); setSetupStep(1); }} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
                        {mode === 'claim' ? "Create Workspace" : "Use Client ID"}
                    </button>
                    <p className="text-[9px] text-slate-400 font-medium">support@riverph.com</p>
               </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </main>
  );
}
