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
import { Eye, EyeOff, ShieldCheck, Zap, BarChart3, Globe } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
        toast({ title: "Welcome back!", description: "Accessing Command Center..." });

        if (user.email === 'admin@riverph.com') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }

    } catch (error: any) {
        let title = 'Login Failed';
        let description = 'An unexpected error occurred. Please try again.';

        switch (error.code) {
            case 'auth/invalid-credential':
                title = 'Invalid Credentials';
                description = 'The email or password you entered is incorrect. Please check your details.';
                break;
            case 'auth/too-many-requests':
                title = 'Too Many Attempts';
                description = 'Access temporarily disabled. You can reset your password or try again later.';
                break;
            case 'auth/user-disabled':
                title = 'Account Disabled';
                description = 'This account has been disabled. Please contact support for assistance.';
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
        toast({ title: 'Check Your Inbox!', description: 'A password reset link has been sent to your email address.' });
        setIsForgotPasswordOpen(false);
        setResetEmail('');
    } catch (error: any) {
        toast({ 
            variant: 'destructive', 
            title: 'Request Failed', 
            description: 'An unexpected error occurred. Please try again.' 
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
      <div className="flex w-full">
        {/* Visual / Branding Side */}
        <div className="hidden lg:flex flex-col relative w-1/2 p-12 bg-slate-950 text-white justify-between overflow-hidden">
            {/* Background Decorative Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            
            <div className="relative z-10">
                <Logo className="h-12 w-12 mb-8" />
                <div className="space-y-6 max-w-xl">
                    <h1 className="text-5xl font-black tracking-tight leading-[1.1]">
                        The definitive platform to run <span className="text-primary-light">essential needs</span> for your business.
                    </h1>
                    <p className="text-xl text-slate-400 font-medium leading-relaxed">
                        Turn everyday operational requirements into automated, connected experiences.
                    </p>
                </div>
            </div>

            <div className="relative z-10 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                    <div className="flex gap-4">
                        <div className="p-3 h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                            <Zap className="h-6 w-6 text-primary-light" />
                        </div>
                        <div>
                            <h4 className="font-bold">Instant Fulfillment</h4>
                            <p className="text-sm text-slate-400">Zero-friction replenishment cycles.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="p-3 h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                            <BarChart3 className="h-6 w-6 text-primary-light" />
                        </div>
                        <div>
                            <h4 className="font-bold">Real-time Analytics</h4>
                            <p className="text-sm text-slate-400">Full visibility into consumption.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="p-3 h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-6 w-6 text-primary-light" />
                        </div>
                        <div>
                            <h4 className="font-bold">Audit Ready</h4>
                            <p className="text-sm text-slate-400">DOH compliance & legal records.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="p-3 h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                            <Globe className="h-6 w-6 text-primary-light" />
                        </div>
                        <div>
                            <h4 className="font-bold">Multi-Site Scale</h4>
                            <p className="text-sm text-slate-400">Manage all locations centrally.</p>
                        </div>
                    </div>
                </div>
                
                <div className="pt-8 border-t border-white/10 flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                    <span>Trusted by Corporate Partners</span>
                    <div className="h-px bg-white/10 flex-1" />
                    <span>River Philippines © 2025</span>
                </div>
            </div>

            {/* Immersive Image Overlay */}
            <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
                <Image
                    src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Flanding%20page%20image.png?alt=media&token=4b8d98bc-e6e8-4710-b10e-e84e75839c7a"
                    alt="River Business Marketing Material"
                    fill
                    className="object-cover"
                />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-transparent z-0" />
        </div>

        {/* Login Form Side */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 md:p-20 bg-white">
            <div className="w-full max-w-sm space-y-10">
                <div className="text-center lg:text-left space-y-2">
                    <div className="lg:hidden flex justify-center mb-6">
                        <Logo className="h-16 w-16" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">Command Center Access</h2>
                    <p className="text-slate-500 font-medium">Please enter your authorized credentials.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-500">Authorized Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base"
                                {...register('email')}
                                disabled={isSubmitting}
                            />
                            {errors.email && <p className="text-xs font-bold text-destructive mt-1 uppercase tracking-tighter">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-500">Security Password</Label>
                                <button type="button" onClick={() => setIsForgotPasswordOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                                    Forgot Access?
                                </button>
                            </div>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? 'text' : 'password'} 
                                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base pr-10"
                                    {...register('password')} 
                                    disabled={isSubmitting}
                                />
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600" 
                                    onClick={() => setShowPassword(!showPassword)} 
                                    type="button"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            {errors.password && <p className="text-xs font-bold text-destructive mt-1 uppercase tracking-tighter">{errors.password.message}</p>}
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-12 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]" disabled={isSubmitting}>
                        {isSubmitting ? <Loader className="text-white" /> : 'Authorize & Sign In'}
                    </Button>
                </form>

                <div className="text-center space-y-4">
                    <p className="text-sm font-medium text-slate-500">
                        New corporate entity?{" "}
                        <Link href="/signup" className="text-primary font-black hover:underline">
                            Request Onboarding
                        </Link>
                    </p>
                    <div className="pt-8 border-t border-slate-100 flex flex-col gap-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Corporate Support Interface</p>
                        <a href="mailto:business@smartrefill.io" className="text-xs font-bold text-slate-600 hover:text-primary transition-colors">business@smartrefill.io</a>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
            <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold">Account Access Recovery</DialogTitle>
                <DialogDescription className="text-slate-600">
                Enter your registered business email and we'll send a secure authorization link to reset your password.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Work Email Address</Label>
                    <Input
                        id="reset-email"
                        type="email"
                        placeholder="name@company.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={isResetting}
                        className="h-11 bg-slate-50"
                    />
                </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                    <Button type="button" variant="ghost" disabled={isResetting} className="text-xs font-bold uppercase tracking-widest">Cancel</Button>
                </DialogClose>
                <Button onClick={handlePasswordReset} disabled={isResetting || !resetEmail} className="font-bold text-xs uppercase tracking-widest px-6">
                    {isResetting ? <Loader className="text-white" /> : 'Send Auth Link'}
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
    </main>
  );
}
