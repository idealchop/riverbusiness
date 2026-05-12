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
      toast({ title: "Email sent", description: "Check your inbox for a new link." });
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: "Error", 
        description: "Please wait a moment before trying again." 
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
        router.push('/onboarding');
      } else {
        toast({ 
          title: "Still pending", 
          description: "We haven't detected the verification yet. Please click the link in your email." 
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "Could not refresh status." });
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
    return <FullScreenLoader text="Verifying status..." />;
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="text-center pt-10 pb-6">
          <Logo className="h-16 w-16 mb-6 mx-auto" />
          <CardTitle className="text-2xl font-bold text-slate-900">Verify your email</CardTitle>
          <CardDescription className="text-sm font-medium text-slate-500 pt-2">
            We've sent a link to <span className="font-bold text-slate-900">{user?.email}</span>. Please verify to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 flex flex-col items-center pb-8 px-10">
            <div className="p-6 rounded-full bg-blue-50 text-primary mb-2">
                <Mail className="h-10 w-10" />
            </div>
            
            <div className="space-y-3 w-full">
                <Button 
                    onClick={checkStatus} 
                    disabled={isChecking} 
                    className="w-full h-12 rounded-xl font-bold"
                >
                    {isChecking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    I've verified my email
                </Button>
                
                <Button 
                    variant="ghost" 
                    onClick={handleResend} 
                    disabled={isResending} 
                    className="w-full h-10 rounded-xl font-bold text-slate-400 hover:text-primary transition-colors text-xs"
                >
                    {isResending ? "Resending..." : "Resend verification email"}
                </Button>
            </div>
        </CardContent>
        <CardFooter className="py-6 flex justify-center border-t bg-slate-50/30">
            <Button variant="ghost" onClick={handleLogout} className="text-xs font-bold text-slate-400 gap-2 hover:text-slate-900">
                <LogOut className="h-3 w-3" /> Use a different account
            </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
