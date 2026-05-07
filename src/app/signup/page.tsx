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

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const initialEmail = searchParams.get('email') || '';
  const isInvited = !!initialEmail;

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: initialEmail
    }
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

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
    <div className="flex w-full flex-col lg:flex-row min-h-screen bg-background font-sans overflow-hidden">
        {/* Branding Side (Left) - 65% width to match Login */}
        <div className="relative w-full lg:w-[65%] p-8 sm:p-12 md:p-20 bg-[#020617] text-white flex flex-col justify-between overflow-hidden min-h-[400px] lg:min-h-screen">
            {/* Animated Mesh Gradient Background - match Login */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px] animate-pulse transition-all duration-[4000ms]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-900/20 blur-[120px] animate-pulse delay-1000 transition-all duration-[6000ms]" />
                <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[50%] h-[50%] rounded-full bg-primary/5 blur-[140px] pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none animate-drift mix-blend-overlay" 
                     style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent absolute left-0 animate-slide-down shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                </div>
            </div>

            <div className="relative z-10 space-y-12 animate-in fade-in slide-in-from-left-4 duration-700">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/80">RIVER PHILIPPINES</span>
                </div>
                <div className="space-y-6 max-w-xl">
                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] text-white">
                        The platform to run <span className="text-primary">essential needs</span> for business.
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-400 font-bold leading-relaxed max-md">
                        Simplified management for modern Filipino organizations.
                    </p>
                </div>
            </div>
        </div>

        {/* Signup Form Side (Right) - 35% width to match Login */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 md:p-20 bg-white">
            <div className="w-full max-w-sm space-y-12 animate-in fade-in zoom-in-95 duration-500">
                <div className="space-y-2">
                    {isInvited ? (
                        <>
                            <div className="flex items-center gap-2 text-primary mb-4 px-3 py-1 rounded-full bg-primary/10 w-fit">
                                <MailCheck className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Invitation detected</span>
                            </div>
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">Join your team</h2>
                            <p className="text-slate-500 font-bold text-lg">Create your password to activate your profile.</p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">Create account</h2>
                            <p className="text-slate-500 font-bold text-lg">Start your journey with River Business.</p>
                        </>
                    )}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2 group">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 transition-colors group-focus-within:text-primary">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                className="h-14 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base px-5 font-bold rounded-2xl shadow-none ring-offset-transparent focus-visible:ring-primary/20"
                                {...register('email')}
                                disabled={isSubmitting || isInvited}
                            />
                            {errors.email && <p className="text-[10px] font-black text-destructive mt-2 uppercase tracking-tighter ml-1">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2 group">
                            <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 transition-colors group-focus-within:text-primary">Create password</Label>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? 'text' : 'password'} 
                                    placeholder="••••••••"
                                    className="h-14 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base pr-14 pl-5 font-bold rounded-2xl shadow-none ring-offset-transparent focus-visible:ring-primary/20"
                                    {...register('password')} 
                                    disabled={isSubmitting}
                                />
                                <button 
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-400 hover:text-primary hover:bg-transparent transition-colors flex items-center justify-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-[10px] font-black text-destructive mt-2 uppercase tracking-tighter ml-1">{errors.password.message}</p>}
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-14 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all active:scale-[0.98] rounded-2xl bg-primary hover:bg-primary/90 text-white" disabled={isSubmitting}>
                        {isSubmitting ? <Loader className="text-white" /> : 'Activate account'}
                    </Button>
                </form>

                <div className="text-center pt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary font-black hover:underline underline-offset-4">
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
