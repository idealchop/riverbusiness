'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { Eye, EyeOff, Users, Target, Sun, Umbrella, Droplets, Briefcase } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { FullScreenLoader, Loader } from '@/components/ui/loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const servicePillars = [
  { id: '01', title: 'Water Logistic', icon: Droplets, desc: 'Smart refill fulfillment and tracking.' },
  { id: '02', title: 'Workspace', icon: Briefcase, desc: 'Facility management and optimization.' },
  { id: '03', title: 'HR & Employee', icon: Users, desc: 'Centralized workforce management.' },
  { id: '04', title: 'Customers', icon: Target, desc: 'Advanced relationship tracking.' },
  { id: '05', title: 'Solar Upgrades', icon: Sun, desc: 'Sustainable energy transitions.' },
  { id: '06', title: 'Business Insurance', icon: Umbrella, desc: 'Comprehensive risk protection.' },
];

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    if (!auth) {
        toast({
            variant: 'destructive',
            title: 'Login service not ready',
            description: 'Please wait a moment and try again.',
        });
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        toast({ title: "Welcome back!", description: "Logging you in..." });

        if (user.email === 'admin@riverph.com') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }

    } catch (error: any) {
        let title = 'Login Failed';
        let description = 'Something went wrong. Please try again.';

        switch (error.code) {
            case 'auth/invalid-credential':
                title = 'Wrong Details';
                description = 'The email or password you entered is incorrect.';
                break;
            case 'auth/too-many-requests':
                title = 'Too Many Attempts';
                description = 'Try again later or reset your password.';
                break;
            case 'auth/user-disabled':
                title = 'Account Disabled';
                description = 'Your account has been disabled. Please contact support.';
                break;
        }

        toast({
            variant: 'destructive',
            title: title,
            description: description,
        });
    }
  };
  
  const handlePasswordReset = async () => {
    if (!auth || !resetEmail) {
        toast({ variant: 'destructive', title: 'Email required', description: 'Please enter your email address.' });
        return;
    }
    setIsResetting(true);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({ title: 'Email Sent!', description: 'Check your inbox for a link to reset your password.' });
        setIsForgotPasswordOpen(false);
        setResetEmail('');
    } catch (error: any) {
        toast({ 
            variant: 'destructive', 
            title: 'Request Failed', 
            description: 'Something went wrong. Please try again.' 
        });
    } finally {
        setIsResetting(false);
    }
  };

  if (!auth) {
      return <FullScreenLoader />;
  }

  return (
    <main className="flex min-h-screen w-full bg-background overflow-hidden font-sans">
      <div className="flex w-full flex-col lg:flex-row">
        {/* Branding Side (Left) */}
        <div className="relative w-full lg:w-3/5 p-8 sm:p-12 md:p-16 bg-slate-950 text-white flex flex-col justify-between overflow-hidden min-h-[500px] lg:min-h-screen">
            {/* Advanced Background Movements */}
            <div className="absolute inset-0 opacity-10 pointer-events-none animate-drift mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            
            {/* Branding Image with Ken Burns Effect */}
            <div className="absolute inset-0 z-0 opacity-30 mix-blend-screen">
                <Image
                    src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Flanding%20page%20image.png?alt=media&token=4b8d98bc-e6e8-4710-b10e-e84e75839c7a"
                    alt="River Business Network"
                    fill
                    className="object-cover animate-slow-zoom"
                    priority
                />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-transparent z-0" />

            <div className="relative z-10">
                <div className="inline-flex p-3 bg-white rounded-2xl mb-12 shadow-2xl shadow-blue-500/20">
                    <Logo className="h-10 w-10" />
                </div>
                <div className="space-y-6 max-w-2xl">
                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] text-white">
                        The platform to run <span className="text-blue-400">essential needs</span> for business.
                    </h1>
                    <p className="text-xl sm:text-2xl text-slate-400 font-bold leading-relaxed max-w-xl">
                        Everything in a single platform for Filipino businesses.
                    </p>
                </div>
            </div>

            <div className="relative z-10 mt-16 lg:mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {servicePillars.map((pillar) => (
                        <div key={pillar.id} className="group flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20">
                            <div className="relative">
                                <div className="p-2.5 h-11 w-11 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-400/20 group-hover:scale-110 transition-transform">
                                    <pillar.icon className="h-6 w-6 text-blue-400" />
                                </div>
                                <span className="absolute -top-2 -left-2 font-mono text-[8px] font-black text-blue-400/60">{pillar.id}</span>
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-black text-xs uppercase tracking-widest text-white group-hover:text-blue-400 transition-colors">{pillar.title}</h4>
                                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">{pillar.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-12 pt-8 border-t border-white/10 flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                    <span className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        Operating System for Commerce
                    </span>
                    <div className="h-px bg-white/5 flex-1" />
                    <span>Est. 2025</span>
                </div>
            </div>
        </div>

        {/* Login Form Side (Right) */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 md:p-20 bg-white">
            <div className="w-full max-w-sm space-y-12">
                <div className="text-center lg:text-left space-y-3">
                    <div className="lg:hidden flex justify-center mb-10">
                        <Logo className="h-16 w-16" />
                    </div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900">Sign In</h2>
                    <p className="text-slate-500 font-bold text-lg">Access your business account.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                className="h-14 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base px-5 font-bold rounded-2xl shadow-none"
                                {...register('email')}
                                disabled={isSubmitting}
                            />
                            {errors.email && <p className="text-[10px] font-black text-destructive mt-2 uppercase tracking-tighter ml-1">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</Label>
                                <button type="button" onClick={() => setIsForgotPasswordOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 hover:underline">
                                    Forgot Password?
                                </button>
                            </div>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? 'text' : 'password'} 
                                    className="h-14 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base pr-14 pl-5 font-bold rounded-2xl shadow-none"
                                    {...register('password')} 
                                    disabled={isSubmitting}
                                />
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-400 hover:text-slate-600 hover:bg-transparent" 
                                    onClick={() => setShowPassword(!showPassword)} 
                                    type="button"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </Button>
                            </div>
                            {errors.password && <p className="text-[10px] font-black text-destructive mt-2 uppercase tracking-tighter ml-1">{errors.password.message}</p>}
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20 transition-all active:scale-[0.98] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                        {isSubmitting ? <Loader className="text-white" /> : 'Log In'}
                    </Button>
                </form>

                <div className="text-center space-y-6 pt-4">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        Don't have an account?{" "}
                        <Link href="/signup" className="text-blue-600 font-black hover:underline">
                            Sign Up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
            <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl p-8">
            <DialogHeader className="space-y-4">
                <DialogTitle className="text-2xl font-black tracking-tight">Reset Password</DialogTitle>
                <DialogDescription className="text-slate-500 font-bold leading-relaxed">
                    Enter your email and we'll send you a link to restore your account access.
                </DialogDescription>
            </DialogHeader>
            <div className="py-6">
                <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</Label>
                    <Input
                        id="reset-email"
                        type="email"
                        placeholder="name@company.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={isResetting}
                        className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold px-5"
                    />
                </div>
            </div>
            <DialogFooter className="flex flex-col gap-3 sm:flex-col sm:gap-3 sm:justify-center">
                <Button onClick={handlePasswordReset} disabled={isResetting || !resetEmail} className="w-full h-14 font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-blue-500/10">
                    {isResetting ? <Loader className="text-white" /> : 'Send Recovery Link'}
                </Button>
                <DialogClose asChild>
                    <Button type="button" variant="ghost" disabled={isResetting} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">Cancel</Button>
                </DialogClose>
            </DialogFooter>
            </DialogContent>
        </Dialog>
    </main>
  );
}
