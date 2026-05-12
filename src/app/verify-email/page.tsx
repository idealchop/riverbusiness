'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Mail, RefreshCw, LogOut, Loader2 } from 'lucide-react';
import { FullScreenLoader } from '@/components/ui/loader';
import { Separator } from '@/components/ui/separator';

export default function VerifyEmailPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
    if (user?.emailVerified) {
      router.push('/onboarding');
    }
  }, [user, isUserLoading, router]);

  const handleResend = async () => {
    if (!user) return;
    setIsResending(true);
    try {
      await sendEmailVerification(user);
      toast({ title: "Email sent", description: "Check your inbox for a new verification link." });
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: "Error", 
        description: "Too many requests. Please wait a moment before trying again." 
      });
    } finally {
      setIsResending(false);
    }
  };

  const checkStatus = async () => {
    if (!auth?.currentUser) return;
    setIsChecking(true);
    try {
      // Force reload the user object from Firebase to get latest verification status
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        toast({ title: "Verified", description: "Your email is confirmed. Taking you to onboarding..." });
        router.push('/onboarding');
      } else {
        toast({ 
          title: "Still pending", 
          description: "We haven't detected the verification yet. Please click the link in your email." 
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "Could not refresh account status." });
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      router.push('/login');
    }
  };

  if (isUserLoading || (user && user.emailVerified)) {
    return <FullScreenLoader text="Checking verification status..." />;
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
      </div>

      <Card className="relative z-10 w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
        <div className="bg-primary h-2 w-full" />
        <CardHeader className="text-center pt-10 pb-6">
          <Logo className="h-16 w-16 mb-6 mx-auto" />
          <CardTitle className="text-2xl font-black tracking-tight text-slate-900">Verify your email</CardTitle>
          <CardDescription className="text-sm font-medium text-slate-500 pt-2 px-4">
            We've sent a verification link to <span className="font-bold text-slate-900">{user?.email}</span>. Please click the link to activate your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 flex flex-col items-center pb-8 px-10">
            <div className="p-6 rounded-[2rem] bg-blue-50 text-primary mb-2 shadow-inner">
                <Mail className="h-10 w-10" />
            </div>
            
            <div className="space-y-3 w-full">
                <Button 
                    onClick={checkStatus} 
                    disabled={isChecking} 
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20"
                >
                    {isChecking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    I've verified my email
                </Button>
                
                <Button 
                    variant="ghost" 
                    onClick={handleResend} 
                    disabled={isResending} 
                    className="w-full h-12 rounded-xl font-bold text-slate-400 hover:text-primary transition-colors text-[10px] uppercase tracking-widest"
                >
                    {isResending ? "Dispatching..." : "Resend verification email"}
                </Button>
            </div>
        </CardContent>
        <Separator className="bg-slate-50" />
        <CardFooter className="py-6 flex justify-center bg-slate-50/30">
            <Button variant="link" onClick={handleLogout} className="text-[10px] font-black uppercase tracking-widest text-slate-400 gap-2 hover:text-slate-900">
                <LogOut className="h-3 w-3" /> Sign in with a different account
            </Button>
        </CardFooter>
      </Card>
    </main>
  );
}