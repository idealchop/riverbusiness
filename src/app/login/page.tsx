
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginSkeleton() {
    return (
        <Card className="w-full max-w-5xl shadow-2xl overflow-hidden rounded-2xl">
          <div className="grid lg:grid-cols-2">
            <div className="flex flex-col items-center justify-center p-6 sm:p-12">
              <div className="mx-auto grid w-full max-w-sm gap-6">
                <div className="grid gap-2 text-center justify-center">
                    <Skeleton className="h-20 w-20 mb-4 mx-auto rounded-full" />
                    <Skeleton className="h-9 w-24 mx-auto" />
                    <Skeleton className="h-5 w-64 mx-auto" />
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="grid gap-2">
                       <Skeleton className="h-5 w-16" />
                       <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-800">
                <Skeleton className="w-full h-full min-h-[400px]" />
            </div>
          </div>
      </Card>
    );
}

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

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
        toast({ title: "Login Successful", description: "Welcome back! Redirecting..." });

        if (user.email === 'admin@riverph.com') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Please check your credentials and try again.',
      });
    }
  };
  
  // Do not render the form until the auth service is available
  if (!auth) {
      return (
        <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <LoginSkeleton />
        </main>
      );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-5xl shadow-2xl overflow-hidden rounded-2xl">
          <div className="grid lg:grid-cols-2">
            <div className="flex flex-col items-center justify-center p-6 sm:p-12">
              <div className="mx-auto grid w-full max-w-sm gap-6">
                <div className="grid gap-2 text-center justify-center">
                  <Logo className="h-20 w-20 mb-4 mx-auto" />
                  <h1 className="text-3xl font-bold">Sign In</h1>
                  <p className="text-balance text-muted-foreground">
                    Welcome back! Please enter your details.
                  </p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      {...register('email')}
                      disabled={isSubmitting}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? 'text' : 'password'} {...register('password')} disabled={isSubmitting}/>
                      <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)} type="button">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing In...' : 'Sign in'}
                  </Button>
                </form>
                <div className="mt-4 text-center text-sm">
                  <p className="text-balance text-muted-foreground">Your Drinking Water, Safe & Simplified.</p>
                  <p className="text-xs text-muted-foreground">By Smart Refill</p>
                </div>
                <div className="mt-4 text-center text-xs text-muted-foreground">
                  <p>For questions or inquiries, contact us at:</p>
                  <a href="mailto:business@smartrefill.io" className="font-semibold text-primary hover:underline">business@smartrefill.io</a>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-800">
              <div className="relative w-full h-full min-h-[400px]">
                  <Image
                    src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Flanding%20page%20image.png?alt=media&token=4b8d98bc-e6e8-4710-b10e-e84e75839c7a"
                    alt="River Business Marketing Material"
                    fill
                    className="object-contain dark:brightness-[0.2] dark:grayscale"
                  />
              </div>
            </div>
          </div>
      </Card>
    </main>
  );
}
