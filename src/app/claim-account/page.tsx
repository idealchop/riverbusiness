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
import { CheckCircle, ArrowRight, ArrowLeft, Building2, Droplets, Users, Layout, Info, User } from 'lucide-react';
import { FullScreenLoader, Loader } from '@/components/ui/loader';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getHomePath } from '@/lib/workspace-access';

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

const individualSchema = z.object({
  name: z.string().min(2, { message: 'Full name is required.' }),
  workspaceName: z.string().optional(),
});

type ClaimFormValues = z.infer<typeof claimSchema>;
type RegisterWorkspaceValues = z.infer<typeof registerWorkspaceSchema>;
type IndividualFormValues = z.infer<typeof individualSchema>;
type SetupPath = 'choose' | 'company' | 'claim' | 'create' | 'individual';

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
  const [setupPath, setSetupPath] = useState<SetupPath>('choose');
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

  const individualForm = useForm<IndividualFormValues>({
    resolver: zodResolver(individualSchema),
    defaultValues: { name: '', workspaceName: '' },
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
        workspaceKind: 'company',
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
        workspaceKind: 'company',
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

  const onIndividualSubmit = async (data: IndividualFormValues) => {
    if (!firestore || !authUser) return;
    try {
      const batch = writeBatch(firestore);
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const generatedClientId = `RIVER-${randomSuffix}`;
      const userProfileRef = doc(firestore, 'users', authUser.uid);
      const workspaceName = data.workspaceName?.trim() || `${data.name}'s workspace`;

      const newUserData: AppUser = {
        id: authUser.uid,
        clientId: generatedClientId,
        name: data.name,
        email: authUser.email!.toLowerCase().trim(),
        businessName: workspaceName,
        interests: ['Collaboration'],
        companyId: generatedClientId,
        role: 'User',
        hrRole: 'owner',
        workspaceKind: 'individual',
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        accountStatus: 'Active',
        totalConsumptionLiters: 0,
      } as AppUser;

      batch.set(userProfileRef, newUserData);
      await batch.commit();
      toast({ title: 'Workspace ready' });
      setClaimedProfile(newUserData);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not set up your workspace.' });
    }
  };

  const heading =
    setupPath === 'choose' ? 'How will you use River?' :
    setupPath === 'company' ? 'Company workspace' :
    setupPath === 'claim' ? 'Link your account' :
    setupPath === 'individual' ? 'Personal workspace' :
    'Set up your company';

  const description =
    setupPath === 'choose' ? 'Choose the account type that matches how you work.' :
    setupPath === 'company' ? 'Use an existing Client ID or start a new company workspace.' :
    setupPath === 'claim' ? 'Enter your Client ID to link your provisioned account.' :
    setupPath === 'individual' ? 'Documents and files only. Team Hub and Water Refill stay locked.' :
    'Tell us a bit about your business.';

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
                {claimedProfile.workspaceKind === 'individual'
                  ? 'Your personal workspace is ready. Documents and files are unlocked.'
                  : <>Your workspace for <strong>{claimedProfile.businessName}</strong> is ready.</>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-6">
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Your Client ID</p>
                    <p className="text-xl font-bold text-slate-900">{claimedProfile.clientId}</p>
                </div>
            </CardContent>
            <CardFooter className="pb-10">
              <Button onClick={() => router.push(getHomePath(claimedProfile))} className="w-full h-14 rounded-2xl font-bold text-base shadow-xl">
                {claimedProfile.workspaceKind === 'individual' ? 'Open Documents' : claimedProfile.hrRole === 'employee' ? 'Open Team Hub' : 'Open Workspace'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="w-full border-none shadow-2xl rounded-3xl bg-white overflow-hidden">
            <CardHeader className="text-center pt-10 pb-6">
              <LogoBlack className="h-12 w-12 mx-auto mb-6" />
              <CardTitle className="text-2xl font-bold">{heading}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8">
              {setupPath === 'choose' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setSetupPath('company')}
                    className="w-full text-left flex items-start gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                  >
                    <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">Company</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Existing Client ID or start from scratch. Water refill, Team Hub, documents, and files.</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 mt-1 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupPath('individual')}
                    className="w-full text-left flex items-start gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                  >
                    <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-sm">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">Individual</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Personal documents and files. Team Hub and Water Refill stay visible but disabled.</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 mt-1 shrink-0" />
                  </button>
                </div>
              )}

              {setupPath === 'company' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setSetupPath('claim')}
                    className="w-full text-left flex items-start gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">Existing Client ID</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Link a company profile River already provisioned for you.</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 mt-1 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSetupPath('create'); setSetupStep(1); }}
                    className="w-full text-left flex items-start gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">From scratch</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Create a new company workspace as a new customer.</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 mt-1 shrink-0" />
                  </button>
                </div>
              )}

              {setupPath === 'individual' && (
                <form onSubmit={individualForm.handleSubmit(onIndividualSubmit)} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-400 ml-1">Your name</Label>
                    <Input placeholder="Full name" className="h-12 rounded-xl bg-slate-50 border-slate-100" {...individualForm.register('name')} />
                    {individualForm.formState.errors.name && <p className="text-xs text-red-500 ml-1">{individualForm.formState.errors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-400 ml-1">Workspace name (optional)</Label>
                    <Input placeholder="Defaults to your name" className="h-12 rounded-xl bg-slate-50 border-slate-100" {...individualForm.register('workspaceName')} />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={individualForm.formState.isSubmitting}>
                    {individualForm.formState.isSubmitting ? <Loader /> : 'Create workspace'}
                  </Button>
                </form>
              )}

              {setupPath === 'claim' && (
                <form onSubmit={claimForm.handleSubmit(onClaimSubmit)} className="space-y-6 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="clientId" className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wide">Client ID</Label>
                    <Input 
                      id="clientId" 
                      placeholder="e.g. SC25102938" 
                      className="h-12 rounded-xl bg-slate-50 border-slate-100 px-4 font-bold" 
                      {...claimForm.register('clientId')} 
                      disabled={claimForm.formState.isSubmitting} 
                    />
                    <div className="flex items-start gap-2 mt-2 px-1">
                        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-medium text-slate-400 leading-tight">
                            Client ID are sent for customers who availed our subscription.
                        </p>
                    </div>
                    {claimForm.formState.errors.clientId && <p className="text-xs text-red-500 mt-1 ml-1">{claimForm.formState.errors.clientId.message}</p>}
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={claimForm.formState.isSubmitting}>
                    {claimForm.formState.isSubmitting ? <Loader /> : 'Link Account'}
                  </Button>
                </form>
              )}

              {setupPath === 'create' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {setupStep === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-400 ml-1">Business Name</Label>
                                    <Input placeholder="Acme Inc." className="h-12 rounded-xl bg-slate-50 border-slate-100" {...registerForm.register('businessName')} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-400 ml-1">Address</Label>
                                    <Textarea placeholder="Where are you located?" className="rounded-xl bg-slate-50 border-slate-100 h-12 min-h-[48px] resize-none" {...registerForm.register('address')} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-400 ml-1">Industry</Label>
                                    <Select onValueChange={(val) => registerForm.setValue('industry', val)} defaultValue={registerForm.getValues('industry')}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100"><SelectValue placeholder="Select Industry" /></SelectTrigger>
                                        <SelectContent className="rounded-xl">{INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}</SelectContent>
                                    </Select>
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
                                                <p className="text-xs text-muted-foreground">{interest.description}</p>
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
                    {setupPath === 'choose' ? (
                      <span />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (setupPath === 'create' && setupStep === 2) {
                            setSetupStep(1);
                            return;
                          }
                          if (setupPath === 'claim' || setupPath === 'create') {
                            setSetupPath('company');
                            setSetupStep(1);
                            return;
                          }
                          setSetupPath('choose');
                        }}
                        className="text-xs font-bold text-blue-500 hover:underline"
                      >
                        Back
                      </button>
                    )}
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">River Support</p>
               </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </main>
  );
}
