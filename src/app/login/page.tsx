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
        {/* Branding Side */}
        <div className="relative w-full lg:w-1/2 p-8 sm:p-12 bg-slate-950 text-white flex flex-col justify-between overflow-hidden min-h-[400px] lg:min-h-screen">
            {/* Background Decorative Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            
            <div className="relative z-10">
                <Logo className="h-10 w-10 mb-8" />
                <div className="space-y-6 max-w-xl">
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.1] text-white">
                        The definitive platform to run <span className="text-primary-light">essential needs</span> for your business.
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-400 font-medium leading-relaxed">
                        Everything in a single platform for your business needs.
                    </p>
                </div>
            </div>

            <div className="relative z-10 space-y-8 mt-12 lg:mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                    {/* 1. Water Logistic */}
                    <div className="flex gap-4">
                        <div className="p-2.5 h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                            <Droplets className="h-5 w-5 text-primary-light" />
                        </div>
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider">Water Logistic</h4>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Smart refill fulfillment and real-time tracking.</p>
                        </div>
                    </div>

                    {/* 2. Workspace */}
                    <div className="flex gap-4">
                        <div className="p-2.5 h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                            <Briefcase className="h-5 w-5 text-primary-light" />
                        </div>
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider">Workspace</h4>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Unified facility management and office optimization.</p>
                        </div>
                    </div>

                    {/* 3. HR & Employee */}
                    <div className="flex gap-4">
                        <div className="p-2.5 h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                            <Users className="h-5 w-5 text-primary-light" />
                        </div>
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider">HR & Employee</h4>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Centralized management for your workforce.</p>
                        </div>
                    </div>

                    {/* 4. Customers */}
                    <div className="flex gap-4">
                        <div className="p-2.5 h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                            <Target className="h-5 w-5 text-primary-light" />
                        </div>
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider">Customers</h4>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Advanced relationship tracking and intelligence.</p>
                        </div>
                    </div>

                    {/* 5. Solar Upgrades */}
                    <div className="flex gap-4">
                        <div className="p-2.5 h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                            <Sun className="h-5 w-5 text-primary-light" />
                        </div>
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider">Solar Upgrades</h4>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Sustainable energy transitions for modern facilities.</p>
                        </div>
                    </div>

                    {/* 6. Business Insurance */}
                    <div className="flex gap-4">
                        <div className="p-2.5 h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                            <Umbrella className="h-5 w-5 text-primary-light" />
                        </div>
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider">Business Insurance</h4>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Comprehensive risk protection and compliance.</p>
                        </div>
                    </div>
                </div>
                
                <div className="pt-8 border-t border-white/10 flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    <span>Enterprise Operating System</span>
                    <div className="h-px bg-white/10 flex-1" />
                    <span>© 2025</span>
                </div>
            </div>

            {/* Immersive Image Overlay */}
            <div className="absolute inset-0 z-0 opacity-20 mix-blend-overlay">
                <Image
                    src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Flanding%20page%20image.png?alt=media&token=4b8d98bc-e6e8-4710-b10e-e84e75839c7a"
                    alt="River Business Operations"
                    fill
                    className="object-cover"
                />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-transparent z-0" />
        </div>

        {/* Login Form Side */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 md:p-20 bg-white min-h-[500px]">
            <div className="w-full max-w-sm space-y-10">
                <div className="text-center lg:text-left space-y-2">
                    <div className="lg:hidden flex justify-center mb-8">
                        <Logo className="h-16 w-16" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">Sign In</h2>
                    <p className="text-slate-500 font-medium">Enter your details to log in to your account.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base px-4 font-medium rounded-xl shadow-none"
                                {...register('email')}
                                disabled={isSubmitting}
                            />
                            {errors.email && <p className="text-[10px] font-bold text-destructive mt-1 uppercase tracking-tighter">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</Label>
                                <button type="button" onClick={() => setIsForgotPasswordOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                                    Forgot Password?
                                </button>
                            </div>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? 'text' : 'password'} 
                                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base pr-12 font-medium rounded-xl shadow-none"
                                    {...register('password')} 
                                    disabled={isSubmitting}
                                />
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-400 hover:text-slate-600" 
                                    onClick={() => setShowPassword(!showPassword)} 
                                    type="button"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </Button>
                            </div>
                            {errors.password && <p className="text-[10px] font-bold text-destructive mt-1 uppercase tracking-tighter">{errors.password.message}</p>}
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-12 text-xs font-black uppercase tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-[0.98] rounded-xl" disabled={isSubmitting}>
                        {isSubmitting ? <Loader className="text-white" /> : 'Log In'}
                    </Button>
                </form>

                <div className="text-center space-y-6">
                    <p className="text-sm font-medium text-slate-500">
                        Don't have an account?{" "}
                        <Link href="/signup" className="text-primary font-black hover:underline">
                            Sign Up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
            <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold">Reset Password</DialogTitle>
                <DialogDescription className="text-slate-600">
                    Enter your email and we'll send you a link to reset your password.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                    <Input
                        id="reset-email"
                        type="email"
                        placeholder="name@company.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={isResetting}
                        className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                    />
                </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                    <Button type="button" variant="ghost" disabled={isResetting} className="text-[10px] font-bold uppercase tracking-widest">Cancel</Button>
                </DialogClose>
                <Button onClick={handlePasswordReset} disabled={isResetting || !resetEmail} className="font-bold text-[10px] uppercase tracking-widest px-8 rounded-xl h-11">
                    {isResetting ? <Loader className="text-white" /> : 'Send Link'}
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
    </main>
  );
}
