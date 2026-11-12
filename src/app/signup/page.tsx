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
import { RiverMark } from '@/components/river/ui';

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
      // Normalize email for strict identity matching
      const normalizedEmail = data.email.toLowerCase().trim();
      
      // Create account
      await createUserWithEmailAndPassword(auth, normalizedEmail, data.password);
      
      toast({ 
        title: "Account created", 
        description: "Welcome to River Business! Taking you to your dashboard." 
      });
      
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
        <div className="relative w-full lg:w-[65%] p-8 pb-48 sm:p-12 md:p-20 bg-[#1A2C49] text-white flex flex-col justify-between overflow-hidden min-h-[400px] lg:min-h-screen">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-12%] left-[-8%] h-[60%] w-[60%] rounded-full bg-[#3D5A80] blur-[100px]" />
                <div className="absolute bottom-[-16%] right-[-10%] h-[55%] w-[55%] rounded-full bg-[#0E1A2E] blur-[110px]" />
                <div className="absolute left-[18%] top-[38%] h-[36%] w-[36%] rounded-full bg-[#4C6E96]/40 blur-[90px]" />
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none animate-drift mix-blend-overlay" 
                     style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent absolute left-0 animate-slide-down shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                </div>
            </div>

            <div className="relative z-10 space-y-12 animate-in fade-in slide-in-from-left-4 duration-700">
                <div className="mb-16 grid h-[88px] w-[88px] place-items-center rounded-[24px] bg-white shadow-[0_16px_40px_-18px_rgba(0,0,0,0.45)]">
                    <RiverMark className="h-11" />
                </div>
                <div className="space-y-6 max-w-xl">
                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] text-white">
                        River Business — AI-powered operations for modern teams.
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-400 font-bold leading-relaxed max-w-xl">
                        Run water refill operations, workforce and HR, files, and a collaboration workspace with documents, canvas, and sheets.
                    </p>
                </div>
            </div>
        </div>

        {/* Signup Form Side (Right) - 35% width to match Login */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-12 md:p-20 bg-slate-50 lg:bg-white relative">
            <div className="w-full max-sm space-y-12 animate-in fade-in zoom-in-95 duration-500 bg-white p-10 lg:p-0 rounded-[3rem] lg:rounded-none shadow-2xl lg:shadow-none -mt-32 lg:mt-0 relative z-20">
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
                        {isSubmitting ? <Loader className="text-white" /> : 'Create account'}
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
