
'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const passwordSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

function ResetPasswordComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<'loading' | 'idle' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (!auth) {
        setStatus('error');
        setErrorMessage('Authentication service is not available. Please try again later.');
        return;
    }

    if (!oobCode) {
      setStatus('error');
      setErrorMessage('The password reset link is missing a required code. Please request a new link.');
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then(() => {
        setStatus('idle');
      })
      .catch((error) => {
        if (error.code === 'auth/invalid-action-code') {
          setErrorMessage('This password reset link is invalid or has expired. Please request a new one.');
        } else {
          setErrorMessage('An unexpected error occurred while verifying the reset link.');
        }
        setStatus('error');
      });
  }, [auth, oobCode]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormValues) => {
    if (status !== 'idle' || !oobCode || !auth) {
      return;
    }
    
    try {
      await confirmPasswordReset(auth, oobCode, data.password);
      setStatus('success');
    } catch (error: any) {
      if (error.code === 'auth/invalid-action-code') {
        setErrorMessage('This password reset link is invalid or has expired. Please request a new one.');
      } else {
        setErrorMessage('Failed to reset password. Please try again.');
      }
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <Logo className="h-16 w-16 mb-4 mx-auto" />
                <CardTitle>Verifying Link...</CardTitle>
                <CardDescription>Please wait while we validate your password reset request.</CardDescription>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    )
  }

  if (status === 'success') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <CardTitle>Password Reset Successfully</CardTitle>
          <CardDescription>You can now log in with your new password.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.push('/login')} className="w-full">Back to Login</Button>
        </CardFooter>
      </Card>
    );
  }

  if (status === 'error') {
     return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-4" />
          <CardTitle>An Error Occurred</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.push('/login')} className="w-full">Back to Login</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Logo className="h-16 w-16 mb-4 mx-auto" />
        <CardTitle>Reset Your Password</CardTitle>
        <CardDescription>Enter a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="relative grid gap-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              disabled={isSubmitting}
            />
            <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => setShowPassword(!showPassword)} type="button">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
          </div>
          <div className="relative grid gap-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              disabled={isSubmitting}
            />
            <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => setShowConfirmPassword(!showConfirmPassword)} type="button">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Suspense fallback={
          <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <Skeleton className="h-16 w-16 mb-4 mx-auto rounded-full" />
                <CardTitle><Skeleton className="h-8 w-48 mx-auto" /></CardTitle>
                <CardDescription><Skeleton className="h-5 w-64 mx-auto" /></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
          </Card>
      }>
        <ResetPasswordComponent />
      </Suspense>
    </main>
  );
}
