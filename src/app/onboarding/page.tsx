
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
import { clientTypes, familyPlans, smePlans, commercialPlans, corporatePlans, enterprisePlans } from '@/lib/plans';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Users, Briefcase, Building, Layers, Factory, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

type Plan = {
    name: string;
    price: number;
    [key: string]: any;
};

type FamilyPlan = (typeof familyPlans)[0] & { details?: string[] };
type SmePlan = (typeof smePlans)[0] & { details?: string[], employees?: string, stations?: string };
type CommercialPlan = (typeof commercialPlans)[0] & { details?: string[], employees?: string, stations?: string };
type CorporatePlan = (typeof corporatePlans)[0] & { details?: string[], employees?: string, stations?: string };
type EnterprisePlan = (typeof enterprisePlans)[0] & { details?: string[], imageId?: string, description?: string };
type AnyPlan = FamilyPlan | SmePlan | CommercialPlan | CorporatePlan | EnterprisePlan;


export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedClientType, setSelectedClientType] = React.useState<string>('Commercial');
  const [isPlanDialogOpen, setIsPlanDialogOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<AnyPlan | null>(commercialPlans.find(p => p.name === 'Growth') || null);
  
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
        fullName: 'Juan dela Cruz',
        businessName: 'River business inc.',
        address: '123 Main St, Anytown',
        contactNumber: '09123456789'
    }
  });

  const onSubmit = (data: OnboardingFormValues) => {
    console.log(data, selectedClientType, selectedPlan);
    toast({
        title: 'Onboarding Complete!',
        description: 'Your information has been saved.',
    });
    router.push('/dashboard');
  };

  const getImageForPlan = (imageId: string) => {
    return PlaceHolderImages.find(p => p.id === imageId);
  }

  const handleClientTypeSelect = (clientTypeName: string) => {
    setSelectedClientType(clientTypeName);
    setSelectedPlan(null); 
    setIsPlanDialogOpen(true);
  };
  
  const handlePlanSelect = (plan: AnyPlan) => {
    setSelectedPlan(plan);
    setIsPlanDialogOpen(false);
  };
  
  const renderPlanDialog = () => {
    let plans: AnyPlan[] = [];
    switch (selectedClientType) {
        case 'Family':
            plans = familyPlans;
            break;
        case 'SME':
            plans = smePlans;
            break;
        case 'Commercial':
            plans = commercialPlans;
            break;
        case 'Corporate':
            plans = corporatePlans;
            break;
        case 'Enterprise':
            plans = enterprisePlans;
            break;
    }

    return (
        <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Choose Your {selectedClientType} Plan</DialogTitle>
                    <DialogDescription>Select the best plan that fits your needs.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                    {plans.map((plan) => (
                        <Card key={plan.name} className={cn(
                            "flex flex-col cursor-pointer hover:border-primary",
                            plan.recommended && "border-primary ring-2 ring-primary",
                            selectedPlan?.name === plan.name && "border-primary ring-2 ring-primary"
                        )} onClick={() => handlePlanSelect(plan)}>
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                {plan.recommended && <Badge className="w-fit">Recommended</Badge>}
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                               <p className="text-3xl font-bold">
                                    {plan.price > 0 ? `₱${plan.price.toLocaleString()}`: 'Custom'}
                                    {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/month</span>}
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {plan.details?.map(detail => <li key={detail} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>{detail}</li>)}
                                    {'liters' in plan && <li><span className="font-semibold text-foreground">{plan.liters}</span> Liters/month</li>}
                                    {'refillFrequency' in plan && <li><span className="font-semibold text-foreground">{plan.refillFrequency}</span> Refills</li>}
                                    {'persons' in plan && <li>For <span className="font-semibold text-foreground">{plan.persons}</span> persons</li>}
                                    {'employees' in plan && <li>For <span className="font-semibold text-foreground">{plan.employees}</span> employees</li>}
                                    {'stations' in plan && <li>Up to <span className="font-semibold text-foreground">{plan.stations}</span> stations</li>}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background py-12 px-4">
      <Card className="w-full max-w-3xl">
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
                                 onClick={() => handleClientTypeSelect(client.name)}
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
              
              {selectedPlan && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Selected Plan</h3>
                    <div className="mt-4 border rounded-lg p-4 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-lg">{selectedPlan.name}</p>
                            <p className="text-muted-foreground">
                                {selectedPlan.price > 0 ? `₱${selectedPlan.price.toLocaleString()}/month` : 'Custom Pricing'}
                            </p>
                        </div>
                        <Button variant="outline" onClick={() => setIsPlanDialogOpen(true)}>Change Plan</Button>
                    </div>
                </div>
              )}

              <div className="flex justify-end pt-8">
                <Button type="submit" className="w-full" disabled={!selectedPlan}>Complete Onboarding</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      {renderPlanDialog()}
    </div>
  );
}
