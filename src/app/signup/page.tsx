
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    if (!auth) {
        toast({ variant: 'destructive', title: 'Service not ready', description: 'Please wait a moment and try again.' });
        return;
    }
    try {
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: "Account Created", description: "Redirecting you to claim your profile..." });
      router.push('/claim-account');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ variant: 'destructive', title: 'Signup Failed', description: 'This email is already in use. Please log in instead.' });
      } else {
        toast({ variant: 'destructive', title: 'Signup Failed', description: 'An unexpected error occurred. Please try again.' });
      }
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-5xl shadow-2xl overflow-hidden rounded-2xl">
          <div className="grid lg:grid-cols-2">
            <div className="flex flex-col items-center justify-center p-6 sm:p-12">
              <div className="mx-auto grid w-full max-w-sm gap-6">
                <div className="grid gap-2 text-center justify-center">
                  <Logo className="h-20 w-20 mb-4 mx-auto" />
                  <h1 className="text-3xl font-bold">Create an Account</h1>
                  <p className="text-balance text-muted-foreground">
                    Enter your email below to create your account.
                  </p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="Enter your email" {...register('email')} disabled={isSubmitting} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? 'text' : 'password'} {...register('password')} disabled={isSubmitting} />
                       <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)} type="button">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
                 <div className="mt-4 text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="underline">
                    Sign in
                  </Link>
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
