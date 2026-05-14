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
import { Logo, LogoBlack } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { CheckCircle, ArrowRight, ArrowLeft, Building2, UserCircle, MapPin, Briefcase, Droplets, Users, Layout, Globe, Search, Bell } from 'lucide-react';
import { FullScreenLoader, Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
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
  { id: 'water', label: 'Water Refill', icon: Droplets, description: 'Supply and consumption tracking.' },
  { id: 'hr', label: 'HR Management', icon: Users, description: 'Payroll and employee records.' },
  { id: 'collab', label: 'Collaboration', icon: Layout, description: 'Shared documents and tasks.' },
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
    if (isUserLoading || !firestore) {
        return; 
    }
    
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
            const inviteQuery = query(
                collection(firestore, 'unclaimedEmployees'),
                where('email', '==', userEmail)
            );
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
        toast({ variant: 'destructive', title: 'Claim Failed', description: 'The provided Client ID is invalid or does not exist.' });
        return;
      }
      
      const batch = writeBatch(firestore);
      const unclaimedData = unclaimedProfileSnap.data() as Partial<AppUser>;
      
      const newUserData: AppUser = {
        ...unclaimedData,
        id: authUser.uid,
        email: authUser.email!.toLowerCase().trim(),
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        accountStatus: 'Active',
        role: unclaimedData.role || 'User',
        hrRole: unclaimedData.hrRole || 'owner',
        companyId: normalizedClientId,
      } as AppUser;
      
      batch.set(userProfileRef, newUserData);
      batch.delete(unclaimedProfileRef);
      
      await batch.commit();
      toast({ title: 'Profile Claimed!', description: "Welcome to your organizational workspace." });
      setClaimedProfile(newUserData);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Claim Failed', description: 'An unexpected error occurred.' });
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
        plan: {
            name: 'Standard Self-Registered',
            price: 0,
            isConsumptionBased: true
        }
      } as AppUser;
      
      batch.set(userProfileRef, newUserData);
      await batch.commit();

      toast({ title: 'Workspace Initialized', description: "Your new Client ID is " + generatedClientId });
      setClaimedProfile(newUserData);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Setup Failed', description: 'Could not create your workspace.' });
    }
  };

  if (isUserLoading || isCheckingProfile) {
    return <FullScreenLoader text="Validating access..." />;
  }

  return (
    <main className="min-h-screen w-full relative flex items-center justify-center p-4 bg-[#f8faff] overflow-hidden">
      
      {/* Blurred Dashboard Atmosphere in Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
         <div className="flex h-full w-full">
            <div className="w-64 border-r bg-white flex flex-col p-6 gap-6">
                <div className="h-8 w-32 bg-slate-100 rounded-lg animate-pulse" />
                <div className="space-y-3 pt-10">
                    <div className="h-10 w-full bg-slate-50 rounded-xl" />
                    <div className="h-10 w-full bg-slate-50 rounded-xl" />
                    <div className="h-10 w-full bg-slate-50 rounded-xl" />
                </div>
            </div>
            <div className="flex-1 flex flex-col">
                <header className="h-16 border-b bg-white px-8 flex items-center justify-between">
                    <div className="h-8 w-24 bg-slate-50 rounded-lg" />
                    <div className="flex gap-4">
                        <div className="h-8 w-8 bg-slate-50 rounded-full" />
                        <div className="h-8 w-24 bg-slate-50 rounded-full" />
                    </div>
                </header>
                <div className="p-10 grid grid-cols-3 gap-6">
                    <div className="h-40 bg-white rounded-3xl border shadow-sm" />
                    <div className="h-40 bg-white rounded-3xl border shadow-sm" />
                    <div className="h-40 bg-white rounded-3xl border shadow-sm" />
                    <div className="col-span-2 h-80 bg-white rounded-3xl border shadow-sm" />
                    <div className="h-80 bg-white rounded-3xl border shadow-sm" />
                </div>
            </div>
         </div>
         <div className="absolute inset-0 backdrop-blur-3xl bg-white/40" />
      </div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-10">
        
        {/* Logo and Greeting */}
        {!claimedProfile && (
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
                <LogoBlack className="h-16 w-16 mx-auto mb-6" />
                <h2 className="text-4xl font-black tracking-tight text-slate-900 leading-none">
                    Welcome to <span className="text-primary">River</span>
                </h2>
                <p className="text-slate-500 font-bold text-lg">One last step to initialize your environment.</p>
            </div>
        )}

        {claimedProfile ? (
          <Card className="w-full border-none shadow-3xl rounded-[3rem] bg-white animate-in fade-in zoom-in-95 duration-700 p-4">
            <CardHeader className="text-center pt-10">
              <div className="flex justify-center mb-6">
                  <div className="p-6 rounded-[2rem] bg-green-50 shadow-inner">
                      <CheckCircle className="h-14 w-14 text-green-500" />
                  </div>
              </div>
              <CardTitle className="text-4xl font-black tracking-tighter text-slate-900">WORKSPACE READY</CardTitle>
              <CardDescription className="text-lg pt-2 font-medium">
                Infrastructure initialized for <strong>{claimedProfile.businessName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col gap-1">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Client ID</p>
                        <p className="text-lg font-black text-primary tabular-nums tracking-tight">{claimedProfile.clientId}</p>
                    </div>
                    <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col gap-1">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Status</p>
                        <p className="text-lg font-black text-slate-900">Authorized</p>
                    </div>
                </div>
                
                <div className="p-6 rounded-[2rem] bg-blue-50 border border-blue-100 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Active Plan</p>
                        <p className="text-xs text-blue-600 font-bold">Standard Self-Registered Protocol</p>
                    </div>
                    <Badge className="bg-white border-blue-200 text-blue-700 font-black text-[10px] uppercase tracking-widest h-8 px-5">Verified</Badge>
                </div>
            </CardContent>
            <CardFooter className="pb-10 px-10">
              <Button onClick={() => router.push('/dashboard')} className="w-full h-16 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all active:scale-[0.98]">
                Launch Ecosystem <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="w-full border-none shadow-[0_40px_100px_rgba(0,0,0,0.12)] rounded-[3rem] bg-white relative overflow-hidden transition-all duration-500">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            
            <CardHeader className="text-center pt-10">
              <CardTitle className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {mode === 'claim' ? 'Enter Client ID' : 'Initialize Workspace'}
              </CardTitle>
              <CardDescription className="text-sm pt-2 font-medium leading-relaxed max-w-sm mx-auto">
                {mode === 'claim' 
                  ? 'Connect to your pre-configured business profile.' 
                  : 'Start a new organizational ecosystem for your workforce.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-10 pb-8">
              {mode === 'claim' ? (
                <form onSubmit={claimForm.handleSubmit(onClaimSubmit)} className="space-y-8 animate-in fade-in duration-500">
                  <div className="space-y-3 group">
                    <Label htmlFor="clientId" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 transition-colors group-focus-within:text-primary">
                      Identification Key
                    </Label>
                    <Input
                      id="clientId"
                      placeholder="SC-XXXXXX"
                      className="h-16 rounded-2xl bg-slate-50 border-slate-100 px-6 text-lg font-black focus-visible:ring-primary/20 uppercase tabular-nums shadow-inner"
                      {...claimForm.register('clientId')}
                      disabled={claimForm.formState.isSubmitting}
                    />
                    {claimForm.formState.errors.clientId && (
                      <p className="text-[10px] font-black text-destructive mt-2 uppercase tracking-tighter ml-1">
                          {claimForm.formState.errors.clientId.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full h-16 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/10" disabled={claimForm.formState.isSubmitting}>
                    {claimForm.formState.isSubmitting ? <Loader /> : 'Sync Profile'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex gap-2 items-center">
                            <div className={cn("h-2.5 w-2.5 rounded-full transition-all duration-500", setupStep >= 1 ? "bg-primary" : "bg-slate-200")} />
                            <div className={cn("h-2.5 w-2.5 rounded-full transition-all duration-500", setupStep >= 2 ? "bg-primary" : "bg-slate-200")} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Phase {setupStep} of 2</span>
                    </div>

                    {setupStep === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5" /> 1. Infrastructure Identity
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Entity name</Label>
                                        <Input
                                            placeholder="e.g. Acme Logistics"
                                            className="h-12 rounded-xl bg-slate-50 border-slate-100 px-4 font-bold"
                                            {...registerForm.register('businessName')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Industry</Label>
                                        <Select onValueChange={(val) => registerForm.setValue('industry', val)} defaultValue={registerForm.getValues('industry')}>
                                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 px-4 font-bold">
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Physical address</Label>
                                    <Textarea
                                        placeholder="Complete business location"
                                        className="rounded-xl bg-slate-50 border-slate-100 px-4 py-3 font-bold min-h-[80px]"
                                        {...registerForm.register('address')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Account representative</Label>
                                    <Input
                                        placeholder="Your Full Name"
                                        className="h-12 rounded-xl bg-slate-50 border-slate-100 px-4 font-bold"
                                        {...registerForm.register('name')}
                                    />
                                </div>
                            </div>
                            <Button 
                                onClick={async () => {
                                    const isValid = await registerForm.trigger(['businessName', 'name', 'address', 'industry']);
                                    if (isValid) setSetupStep(2);
                                }} 
                                className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/10"
                            >
                                Continue <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {setupStep === 2 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                                    <CheckCircle className="h-3.5 w-3.5" /> 2. Operational Focus
                                </h4>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">Select the areas of the River ecosystem you want to activate first.</p>
                                <div className="grid grid-cols-1 gap-3">
                                    {INTERESTS.map((interest) => (
                                        <div 
                                            key={interest.id} 
                                            onClick={() => {
                                                const current = registerForm.getValues('interests') || [];
                                                if (current.includes(interest.label)) {
                                                    registerForm.setValue('interests', current.filter(i => i !== interest.label), { shouldValidate: true });
                                                } else {
                                                    registerForm.setValue('interests', [...current, interest.label], { shouldValidate: true });
                                                }
                                            }}
                                            className={cn(
                                                "flex items-center space-x-4 p-5 rounded-2xl border transition-all cursor-pointer group",
                                                registerForm.watch('interests').includes(interest.label) 
                                                    ? "bg-primary/5 border-primary shadow-sm" 
                                                    : "bg-slate-50 border-slate-100 hover:border-slate-300"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                                                registerForm.watch('interests').includes(interest.label) 
                                                    ? "bg-primary text-white" 
                                                    : "bg-white text-slate-400 group-hover:text-primary"
                                            )}>
                                                <interest.icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-900 leading-none mb-1">{interest.label}</p>
                                                <p className="text-[10px] font-medium text-slate-400">{interest.description}</p>
                                            </div>
                                            <div className={cn(
                                                "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                registerForm.watch('interests').includes(interest.label)
                                                    ? "bg-primary border-primary"
                                                    : "border-slate-200"
                                            )}>
                                                {registerForm.watch('interests').includes(interest.label) && <CheckCircle className="h-3 w-3 text-white" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setSetupStep(1)} className="h-14 px-6 rounded-2xl font-bold text-slate-400">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                <Button 
                                    onClick={registerForm.handleSubmit(onCreateSubmit)} 
                                    className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
                                    disabled={registerForm.formState.isSubmitting}
                                >
                                    {registerForm.formState.isSubmitting ? <Loader /> : 'Initialize Workspace'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pb-10 px-10">
               <Separator className="bg-slate-50" />
               <div className="flex items-center justify-between w-full">
                    <button 
                        onClick={() => { setMode(mode === 'claim' ? 'create' : 'claim'); setSetupStep(1); }}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline underline-offset-4"
                    >
                        {mode === 'claim' ? "Create new workspace" : "I have a Client ID"}
                    </button>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        Support: <a href="mailto:support@riverph.com" className="font-black text-slate-900 hover:text-primary transition-colors">support@riverph.com</a>
                    </p>
               </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </main>
  );
}

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
