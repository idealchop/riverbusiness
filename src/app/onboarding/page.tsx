'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clientTypes } from '@/lib/plans';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';

const onboardingSchema = z.object({
  fullName: z.string().min(1, { message: 'Full name is required.' }),
  businessName: z.string().min(1, { message: 'Business name is required.' }),
  address: z.string().min(1, { message: 'Address is required.' }),
  contactNumber: z.string().min(10, { message: 'Please enter a valid contact number.' }),
  waterPlan: z.string({ required_error: 'Please select a water plan.' }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
  });

  const onSubmit = (data: OnboardingFormValues) => {
    console.log('Onboarding data:', data);
    toast({
      title: 'Onboarding Complete!',
      description: 'Your information has been saved successfully.',
    });
    router.push('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 font-semibold text-2xl mb-4">
                <Logo className="h-10 w-10 text-primary" />
                <span className="font-headline">River Business</span>
            </div>
          <CardTitle className="text-3xl font-bold">Welcome Onboard!</CardTitle>
          <CardDescription>Please fill out your information to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan dela Cruz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="River Business Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, Anytown" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="09123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="waterPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Water Plan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your water plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientTypes.map((type) => (
                          <SelectItem key={type.name} value={type.name}>
                            {type.name} - <span className="text-muted-foreground text-xs">{type.description}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mt-6">
                Complete Onboarding
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
