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
    // Redirect to onboarding automatically as we are skipping the wall
    if (!isUserLoading && user) {
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
      // Force reload the user object from Firebase
      await auth.currentUser.reload();
      router.push('/onboarding');
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

  return <FullScreenLoader text="Verifying status..." />;
}
