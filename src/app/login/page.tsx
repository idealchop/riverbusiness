
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
import { useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { AppUser } from '@/lib/types';
import { doc } from 'firebase/firestore';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
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
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        toast({ title: "Login Successful", description: "Welcome back! Redirecting..." });

        // Special case for admin user
        if (data.email === 'admin@riverph.com') {
          const userDocRef = doc(firestore, "users", user.uid);
           const { setDoc } = await import('firebase/firestore');
           await setDoc(userDocRef, {
                id: user.uid,
                name: 'Admin',
                email: user.email,
                businessName: 'River Business Admin',
                role: 'Admin',
                accountStatus: 'Active',
                onboardingComplete: true,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
           }, { merge: true });
          router.push('/admin');
          return;
        }

        const userDocRef = doc(firestore, 'users', user.uid);
        const userSnap = await (await import('firebase/firestore')).getDoc(userDocRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data() as AppUser;
          if (userData.onboardingComplete) {
            router.push('/dashboard');
          } else {
            router.push('/onboarding');
          }
        } else {
           router.push('/onboarding');
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

  return (
    <div className="w-full lg:grid h-screen lg:grid-cols-2 overflow-hidden">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
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
            <div className="grid gap-2 relative">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type={showPassword ? 'text' : 'password'} {...register('password')} disabled={isSubmitting}/>
              <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)} type="button">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
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
      <div className="hidden bg-muted lg:block overflow-hidden">
        <Image
          src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Overflow.png?alt=media&token=ad6cec25-c755-4de3-8276-430a013741b5"
          alt="River Business Marketing Material"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
