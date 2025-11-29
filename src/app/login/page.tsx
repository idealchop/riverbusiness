'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Logo } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const loginSchema = z.object({
  smartId: z.string().min(1, { message: 'Smart ID is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormValues) => {
    console.log(data);
    // For demonstration, we'll assume a new user and redirect to onboarding
    // In a real app, you'd check if the user is new here.
    if (data.smartId.includes('new')) {
        router.push('/onboarding');
    } else {
        router.push('/dashboard');
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex items-center justify-center gap-2 font-semibold text-2xl mb-4">
              <Logo className="h-10 w-10 text-primary" />
              <span className="font-headline">River Business</span>
            </div>
            <h1 className="text-3xl font-bold">Sign In</h1>
            <p className="text-balance text-muted-foreground">
              Welcome back! Please enter your details.
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="smartId">Smart ID</Label>
              <Input
                id="smartId"
                type="text"
                placeholder="Enter your Smart ID"
                {...register('smartId')}
              />
              {errors.smartId && <p className="text-sm text-destructive">{errors.smartId.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" {...register('remember')} />
              <Label htmlFor="remember">Remember for 30 days</Label>
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </div>
      </div>
      <div className="hidden bg-primary lg:flex lg:items-center lg:justify-center lg:p-12">
        <div className="text-primary-foreground text-center max-w-md">
            <h2 className="text-4xl font-bold mb-4">Welcome back!</h2>
            <h3 className="text-2xl mb-4">Please sign in to your River Business account</h3>
            <p className="text-lg opacity-80 mb-8">
                Manage your water consumption, track deliveries, and ensure quality with our comprehensive dashboard.
            </p>
            <Card className="bg-card/20 border-0">
                <CardHeader>
                    <CardTitle className="text-primary-foreground">Sales Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <Image
                        src="https://picsum.photos/seed/river-chart/600/350"
                        alt="Sales Report Chart"
                        width={600}
                        height={350}
                        data-ai-hint="chart dashboard"
                        className="rounded-lg shadow-2xl"
                    />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
