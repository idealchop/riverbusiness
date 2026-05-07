'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
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
            title: 'Service initialization pending',
            description: 'Please wait a moment and try again.',
        });
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        toast({ title: "Success", description: "Signing you in..." });

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
                title = 'Incorrect Details';
                description = 'The email or password you entered is incorrect.';
                break;
            case 'auth/too-many-requests':
                title = 'Too Many Attempts';
                description = 'Access is temporarily locked. Please try again later.';
                break;
            case 'auth/user-disabled':
                title = 'Account Disabled';
                description = 'Your account has been deactivated. Please contact support.';
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
        toast({ variant: 'destructive', title: 'Email required', description: 'Enter your email to reset your password.' });
        return;
    }
    setIsResetting(true);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({ title: 'Email Sent', description: 'Check your inbox for a link to reset your password.' });
        setIsForgotPasswordOpen(false);
        setResetEmail('');
    } catch (error: any) {
        toast({ 
            variant: 'destructive', 
            title: 'Error', 
            description: 'Could not send reset email. Please try again.' 
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
        {/* Branding Side (Left) - 65% width */}
        <div className="relative w-full lg:w-[65%] p-8 sm:p-12 md:p-20 bg-[#020617] text-white flex flex-col justify-between overflow-hidden min-h-[500px] lg:min-h-screen">
            {/* Animated Mesh Gradient Background */}
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

            <div className="relative z-10 animate-in fade-in slide-in-from-left-4 duration-700">
                <div className="mb-16">
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/80">RIVER PHILIPPINES</span>
                </div>
                <div className="space-y-6 max-w-xl">
                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] text-white">
                        The platform to run <span className="text-primary">essential needs</span> for business workforce.
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-400 font-bold leading-relaxed max-md">
                        Simplifying how modern teams operate.
                    </p>
                </div>
            </div>
        </div>

        {/* Login Form Side (Right) - 35% width */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 md:p-20 bg-white">
            <div className="w-full max-sm space-y-12 animate-in fade-in zoom-in-95 duration-500">
                <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-tight text-slate-900">Sign in</h2>
                    <p className="text-slate-500 font-bold text-lg">Welcome back! Please enter your details.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2 group">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 transition-colors group-focus-within:text-primary">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                className="h-14 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base px-5 font-bold rounded-2xl shadow-none ring-offset-transparent focus-visible:ring-primary/20"
                                {...register('email')}
                                disabled={isSubmitting}
                            />
                            {errors.email && <p className="text-[10px] font-black text-destructive mt-2 uppercase tracking-tighter ml-1">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2 group">
                            <div className="flex items-center justify-between px-1">
                                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors group-focus-within:text-primary">Password</Label>
                                <button type="button" onClick={() => setIsForgotPasswordOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline underline-offset-4">
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? 'text' : 'password'} 
                                    className="h-14 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base pr-14 pl-5 font-bold rounded-2xl shadow-none ring-offset-transparent focus-visible:ring-primary/20"
                                    {...register('password')} 
                                    disabled={isSubmitting}
                                />
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-400 hover:text-primary hover:bg-transparent transition-colors" 
                                    onClick={() => setShowPassword(!showPassword)} 
                                    type="button"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            {errors.password && <p className="text-[10px] font-black text-destructive mt-2 uppercase tracking-tighter ml-1">{errors.password.message}</p>}
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-14 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all active:scale-[0.98] rounded-2xl bg-primary hover:bg-primary/90 text-white" disabled={isSubmitting}>
                        {isSubmitting ? <Loader className="text-white" /> : 'Sign in'}
                    </Button>
                </form>

                <div className="text-center space-y-6 pt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Don't have an account?{" "}
                        <Link href="/signup" className="text-primary font-black hover:underline underline-offset-4">
                            Sign up
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
                <DialogTitle className="text-2xl font-black tracking-tight">Reset password</DialogTitle>
                <DialogDescription className="text-slate-500 font-bold leading-relaxed">
                    Enter your email address and we'll send you a link to reset your password.
                </DialogDescription>
            </DialogHeader>
            <div className="py-6">
                <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</Label>
                    <Input
                        id="reset-email"
                        type="email"
                        placeholder="name@company.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={isResetting}
                        className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold px-5 ring-offset-transparent focus-visible:ring-primary/20"
                    />
                </div>
            </div>
            <DialogFooter className="flex flex-col gap-3 sm:flex-col sm:gap-3 sm:justify-center">
                <Button onClick={handlePasswordReset} disabled={isResetting || !resetEmail} className="w-full h-14 font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/10">
                    {isResetting ? <Loader className="text-white" /> : 'Send reset link'}
                </Button>
                <DialogClose asChild>
                    <Button type="button" variant="ghost" disabled={isResetting} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Cancel</Button>
                </DialogClose>
            </DialogFooter>
            </DialogContent>
        </Dialog>
    </main>
  );
}
