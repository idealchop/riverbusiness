'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import Image from 'next/image';

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const servicePillars = [
  { id: '01', title: 'Water Logistic', iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2Fwater.svg?alt=media&token=fe3a77fb-7ae5-4568-93f7-7a3e2340288f' },
  { id: '02', title: 'Collaboration', iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FCollaboration.svg?alt=media&token=6d687bc0-125b-4ad1-ad48-fc2ceb1b07d9' },
  { id: '03', title: 'HR & Employee', iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FEmployee.svg?alt=media&token=f56983da-df57-429c-b67e-e57faa2ce2a6' },
  { id: '04', title: 'Customers', iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2Fcustomers.svg?alt=media&token=33c27f8f-7a05-4133-bf25-ec3949110bcb' },
  { id: '05', title: 'Solar Upgrades', iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2Fsolar-energy.svg?alt=media&token=2afce575-87ba-40c8-b7f9-5ebd6c5ee284' },
  { id: '06', title: 'Benefits', iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FBenefits.svg?alt=media&token=e0a007ac-1929-4a32-afda-8e91c416b62c' },
];

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const initialEmail = searchParams.get('email') || '';
  const isInvited = !!initialEmail;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
        email: initialEmail
    }
  });

  const onSubmit = async (data: SignupFormValues) => {
    if (!auth) {
        toast({
            variant: 'destructive',
            title: 'Service initialization pending',
            description: 'Please wait a moment and try again.',
        });
        return;
    }

    try {
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: "Account created", description: "Taking you to your new workspace..." });
      router.push('/onboarding');
    } catch (error: any) {
        let title = 'Sign up failed';
        let description = 'Could not create your account. Please try again.';

        if (error.code === 'auth/email-already-in-use') {
            title = 'Account exists';
            description = 'This email is already in use. Please sign in instead.';
        }

        toast({
            variant: 'destructive',
            title: title,
            description: description,
        });
    }
  };

  return (
    <div className="flex w-full flex-col lg:flex-row min-h-screen bg-background">
        {/* Branding Side (Left) */}
        <div className="relative w-full lg:w-[60%] p-8 sm:p-12 md:p-20 bg-slate-950 text-white flex flex-col justify-between overflow-hidden min-h-[400px] lg:min-h-screen">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]" />
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(30,58,138,0.15),transparent_50%)]" />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            </div>

            <div className="relative z-10 space-y-12 animate-in fade-in slide-in-from-left-4 duration-700">
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">River Philippines</span>
                </div>
                <div className="space-y-6 max-w-xl">
                    <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.1]">
                        The platform to run <span className="text-blue-500">essential needs</span> for business.
                    </h1>
                    <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-md">
                        Simplified management for modern Filipino organizations.
                    </p>
                </div>
            </div>

            <div className="relative z-10 mt-16 lg:mt-0 grid grid-cols-2 sm:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {servicePillars.map((pillar) => (
                    <div key={pillar.id} className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                        <div className="relative h-5 w-5">
                          <Image src={pillar.iconUrl} alt={pillar.title} fill className="object-contain" />
                        </div>
                        <h4 className="text-[11px] font-bold uppercase tracking-widest">{pillar.title}</h4>
                    </div>
                ))}
            </div>
        </div>

        {/* Signup Form Side (Right) */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 bg-white">
            <div className="w-full max-w-sm space-y-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="space-y-2">
                    {isInvited ? (
                        <>
                            <div className="flex items-center gap-2 text-blue-600 mb-4 px-3 py-1 rounded-full bg-blue-50 w-fit">
                                <MailCheck className="h-4 w-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Invitation detected</span>
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Join your team</h2>
                            <p className="text-slate-500 font-medium">Create your password to activate your profile.</p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Create account</h2>
                            <p className="text-slate-500 font-medium">Start your journey with River Business.</p>
                        </>
                    )}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-semibold text-slate-500">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                className="h-11 bg-slate-50 border-slate-100 rounded-xl font-medium focus-visible:ring-blue-500/20"
                                {...register('email')}
                                disabled={isSubmitting || isInvited}
                            />
                            {errors.email && <p className="text-xs font-medium text-destructive mt-1">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-semibold text-slate-500">Create password</Label>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? 'text' : 'password'} 
                                    placeholder="••••••••"
                                    className="h-11 bg-slate-50 border-slate-100 rounded-xl font-medium pr-10 focus-visible:ring-blue-500/20"
                                    {...register('password')} 
                                    disabled={isSubmitting}
                                />
                                <button 
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs font-medium text-destructive mt-1">{errors.password.message}</p>}
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-11 rounded-xl font-bold shadow-lg shadow-blue-500/10" disabled={isSubmitting}>
                        {isSubmitting ? <Loader className="text-white" /> : 'Activate account'}
                    </Button>
                </form>

                <div className="text-center pt-4">
                    <p className="text-sm text-slate-500 font-medium">
                        Already have an account?{" "}
                        <Link href="/login" className="text-blue-600 font-bold hover:underline underline-offset-4">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<Loader />}>
        <SignupContent />
    </Suspense>
  );
}
