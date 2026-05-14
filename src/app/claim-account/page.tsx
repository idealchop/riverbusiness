
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
import { doc, getDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { CheckCircle, ArrowRight, Building2, UserCircle, MapPin, Briefcase, Droplets, Users, Layout } from 'lucide-react';
import { FullScreenLoader, Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  { id: 'water', label: 'Water Refill', icon: Droplets },
  { id: 'hr', label: 'HR Management', icon: Users },
  { id: 'collab', label: 'Collaboration', icon: Layout },
];

export default function ClaimAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [claimedProfile, setClaimedProfile] = useState<AppUser | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [mode, setMode] = useState<'claim' | 'create'>('claim');

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
    return <FullScreenLoader text="Validating organizational access..." />;
  }

  if (claimedProfile) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 font-sans">
        <Card className="w-full max-w-2xl border-none shadow-2xl rounded-[2.5rem] animate-in fade-in zoom-in-95 duration-700">
          <CardHeader className="text-center pt-10">
            <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-green-50 shadow-inner">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">Workspace initialized</CardTitle>
            <CardDescription className="text-base pt-2">
              Welcome, {claimedProfile.name}. Your organization is ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-10">
            <div className="space-y-4">
                <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Infrastructure details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Company identity</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{claimedProfile.businessName}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Client ID</p>
                            <p className="text-sm font-bold text-primary tabular-nums">{claimedProfile.clientId}</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Active Protocol</p>
                        <p className="text-xs text-blue-600 font-bold">Standard Workspace Access</p>
                    </div>
                    <Badge className="bg-white border-blue-200 text-blue-700 font-black text-[9px] uppercase tracking-widest h-6 px-3">Verified</Badge>
                </div>
            </div>
          </CardContent>
          <CardFooter className="pb-10 px-10">
            <Button onClick={() => router.push('/dashboard')} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-[0.98]">
              Launch command center <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 font-sans">
      <div className="flex flex-col items-center gap-8 w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <Logo className="h-16 w-16" />
        
        <Card className="w-full border-none shadow-2xl rounded-[2.5rem] p-4 bg-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <CardHeader className="text-center pt-8">
            <CardTitle className="text-2xl font-black tracking-tight text-slate-900">
              {mode === 'claim' ? 'Enter Client ID' : 'Setup Workspace'}
            </CardTitle>
            <CardDescription className="text-sm pt-2 font-medium leading-relaxed">
              {mode === 'claim' 
                ? 'Link your business profile provided by an administrator.' 
                : 'Initialize a new organizational infrastructure for your team.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {mode === 'claim' ? (
              <form onSubmit={claimForm.handleSubmit(onClaimSubmit)} className="space-y-6 animate-in fade-in duration-500">
                <div className="space-y-2 group">
                  <Label htmlFor="clientId" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 transition-colors group-focus-within:text-primary">
                    Client identification
                  </Label>
                  <Input
                    id="clientId"
                    placeholder="e.g. SC-2500000001"
                    className="h-14 rounded-2xl bg-slate-50 border-slate-200 px-5 font-bold focus-visible:ring-primary/20 uppercase tabular-nums"
                    {...claimForm.register('clientId')}
                    disabled={claimForm.formState.isSubmitting}
                  />
                  {claimForm.formState.errors.clientId && (
                    <p className="text-[10px] font-black text-destructive mt-2 uppercase tracking-tighter ml-1">
                        {claimForm.formState.errors.clientId.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/10" disabled={claimForm.formState.isSubmitting}>
                  {claimForm.formState.isSubmitting ? <Loader /> : 'Link Profile'}
                </Button>
              </form>
            ) : (
              <form onSubmit={registerForm.handleSubmit(onCreateSubmit)} className="space-y-6 animate-in fade-in duration-500">
                <ScrollArea className="max-h-[50vh] pr-4 -mr-4">
                    <div className="space-y-6 pb-2">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                <Building2 className="h-3 w-3" /> 1. Business Information
                            </h4>
                            <div className="space-y-4">
                                <div className="space-y-2 group">
                                    <Label htmlFor="businessName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Company name</Label>
                                    <Input
                                        id="businessName"
                                        placeholder="e.g. Acme Corp"
                                        className="h-12 rounded-xl bg-slate-50 border-slate-200 px-4 font-bold"
                                        {...registerForm.register('businessName')}
                                        disabled={registerForm.formState.isSubmitting}
                                    />
                                    {registerForm.formState.errors.businessName && <p className="text-[10px] font-black text-destructive uppercase tracking-tighter ml-1">{registerForm.formState.errors.businessName.message}</p>}
                                </div>
                                <div className="space-y-2 group">
                                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Primary owner</Label>
                                    <Input
                                        id="name"
                                        placeholder="Full Name"
                                        className="h-12 rounded-xl bg-slate-50 border-slate-200 px-4 font-bold"
                                        {...registerForm.register('name')}
                                        disabled={registerForm.formState.isSubmitting}
                                    />
                                    {registerForm.formState.errors.name && <p className="text-[10px] font-black text-destructive uppercase tracking-tighter ml-1">{registerForm.formState.errors.name.message}</p>}
                                </div>
                                <div className="space-y-2 group">
                                    <Label htmlFor="industry" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Industry classification</Label>
                                    <Select onValueChange={(val) => registerForm.setValue('industry', val)} defaultValue={registerForm.getValues('industry')}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 px-4 font-bold">
                                            <SelectValue placeholder="Select Industry" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {INDUSTRIES.map(ind => (
                                                <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {registerForm.formState.errors.industry && <p className="text-[10px] font-black text-destructive uppercase tracking-tighter ml-1">{registerForm.formState.errors.industry.message}</p>}
                                </div>
                                <div className="space-y-2 group">
                                    <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Business address</Label>
                                    <Textarea
                                        id="address"
                                        placeholder="Complete Service Address"
                                        className="rounded-xl bg-slate-50 border-slate-200 px-4 py-3 font-bold min-h-[80px]"
                                        {...registerForm.register('address')}
                                        disabled={registerForm.formState.isSubmitting}
                                    />
                                    {registerForm.formState.errors.address && <p className="text-[10px] font-black text-destructive uppercase tracking-tighter ml-1">{registerForm.formState.errors.address.message}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                <CheckCircle className="h-3 w-3" /> 2. Operational Interests
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {INTERESTS.map((interest) => (
                                    <div key={interest.id} className="flex items-center space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all group">
                                        <Checkbox 
                                            id={interest.id} 
                                            onCheckedChange={(checked) => {
                                                const current = registerForm.getValues('interests') || [];
                                                if (checked) {
                                                    registerForm.setValue('interests', [...current, interest.label]);
                                                } else {
                                                    registerForm.setValue('interests', current.filter(i => i !== interest.label));
                                                }
                                            }}
                                        />
                                        <Label htmlFor={interest.id} className="flex items-center gap-3 cursor-pointer flex-1">
                                            <interest.icon className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                            <span className="font-bold text-slate-700">{interest.label}</span>
                                        </Label>
                                    </div>
                                ))}
                                {registerForm.formState.errors.interests && <p className="text-[10px] font-black text-destructive uppercase tracking-tighter ml-1">{registerForm.formState.errors.interests.message}</p>}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                <Button type="submit" className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/10" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting ? <Loader /> : 'Initialize Workspace'}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-8">
             <Separator className="bg-slate-50" />
             <button 
                onClick={() => setMode(mode === 'claim' ? 'create' : 'claim')}
                className="text-[11px] font-black uppercase tracking-[0.2em] text-primary hover:underline underline-offset-4"
             >
                {mode === 'claim' ? "I don't have a Client ID" : "I already have an ID"}
             </button>
             <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed px-4">
                Need technical support? <br/> Reach out at <a href="mailto:support@riverph.com" className="font-black text-slate-900 hover:text-primary transition-colors">support@riverph.com</a>
             </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
