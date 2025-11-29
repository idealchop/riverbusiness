
'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { clientTypes } from '@/lib/plans';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Users, Briefcase, Building, Layers, Factory } from 'lucide-react';
import { cn } from '@/lib/utils';


const onboardingSchema = z.object({
  fullName: z.string().min(1, { message: 'Required' }),
  businessName: z.string().min(1, { message: 'Required' }),
  address: z.string().min(1, { message: 'Required' }),
  contactNumber: z.string().min(10, { message: 'Required' }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const icons: { [key: string]: React.ElementType } = {
    Family: Users,
    SME: Briefcase,
    Commercial: Building,
    Corporate: Layers,
    Enterprise: Factory,
};

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedClientType, setSelectedClientType] = React.useState<string>('Commercial');
  
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
        fullName: 'Juan dela Cruz',
        businessName: 'River Business Inc.',
        address: '123 Main St. Anytown',
        contactNumber: '09123456789'
    }
  });

  const onSubmit = (data: OnboardingFormValues) => {
    console.log(data, selectedClientType);
    toast({
        title: 'Onboarding Complete!',
        description: 'Your information has been saved.',
    });
    router.push('/dashboard');
  };

  const getImageForPlan = (imageId: string) => {
    return PlaceHolderImages.find(p => p.id === imageId);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background py-12 px-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Welcome Onboard!</CardTitle>
            <CardDescription>Please fill out your information to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-red-500">Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="border-0 border-b rounded-none px-0 focus-visible:ring-0" />
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
                      <FormLabel className="font-bold text-red-500">Business Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="border-0 border-b rounded-none px-0 focus-visible:ring-0" />
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
                      <FormLabel className="font-bold text-red-500">Address</FormLabel>
                      <FormControl>
                        <Input {...field} className="border-0 border-b rounded-none px-0 focus-visible:ring-0" />
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
                      <FormLabel className="font-bold text-red-500">Contact Number</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} className="border-0 border-b rounded-none px-0 focus-visible:ring-0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                  <h3 className="font-bold text-lg">Water Plan</h3>
                  <p className="text-muted-foreground">Choose the client type to see the recommended plans.</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {clientTypes.map((client) => {
                          const image = getImageForPlan(client.imageId);
                          return (
                            <div key={client.name}
                                 onClick={() => setSelectedClientType(client.name)}
                                 className={cn(
                                     "border rounded-lg p-4 text-center cursor-pointer transition-all",
                                     selectedClientType === client.name ? "border-primary ring-2 ring-primary" : "hover:border-primary/50"
                                 )}>
                                {image && (
                                    <Image
                                        src={image.imageUrl}
                                        alt={client.name}
                                        width={80}
                                        height={80}
                                        className="rounded-full mx-auto mb-2 object-cover h-20 w-20"
                                        data-ai-hint={image.imageHint}
                                    />
                                )}
                                <p className="font-semibold">{client.name}</p>
                                <p className="text-xs text-muted-foreground">{client.description}</p>
                            </div>
                          )
                      })}
                  </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mt-8">Selected Plan</h3>
                {/* This section can be built out further once a plan is selected */}
                <div className="mt-4 border rounded-lg p-4 text-center text-muted-foreground">
                    Select a client type above to view and choose a plan.
                </div>
              </div>

              {/* The button would be here but is not in the screenshot */}
              {/* <div className="flex justify-end pt-8">
                <Button type="submit">Complete Onboarding</Button>
              </div> */}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
