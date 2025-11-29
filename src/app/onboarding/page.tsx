
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
import { waterStations } from '@/lib/data';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Users, Briefcase, Building, Layers, Factory, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';


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

type FamilyPlan = (typeof familyPlans)[0] & { details?: string[], employees?: string, stations?: string, refills?:string, liters?:string };
type SmePlan = (typeof smePlans)[0] & { details?: string[], employees?: string, stations?: string, refills?:string, liters?:string };
type CommercialPlan = (typeof commercialPlans)[0] & { details?: string[], employees?: string, stations?: string, refills?:string, liters?:string };
type CorporatePlan = (typeof corporatePlans)[0] & { details?: string[], employees?: string, stations?: string, refills?:string, liters?:string };
type EnterprisePlan = (typeof enterprisePlans)[0] & { details?: { label: string; value: string; }[], imageId?: string, description?: string };
type AnyPlan = FamilyPlan | SmePlan | CommercialPlan | CorporatePlan | EnterprisePlan;

interface CustomPlanDetails {
    litersPerMonth: number;
    deliveriesPerWeek: number;
    waterStation: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedClientType, setSelectedClientType] = React.useState<string | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<AnyPlan | null>(null);
  const [customPlanDetails, setCustomPlanDetails] = React.useState<CustomPlanDetails | null>(null);
  const [dialogView, setDialogView] = React.useState<'list' | 'customize'>('list');

  
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
    console.log(data, selectedClientType, selectedPlan, customPlanDetails);
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
    setCustomPlanDetails(null);
    if (clientTypeName === 'Enterprise') {
      setDialogView('list');
    } else {
      setDialogView('customize');
    }
    setIsPlanDialogOpen(true);
  };
  
  const handlePlanSelect = (plan: AnyPlan) => {
    if (plan.name.toLowerCase().includes('custom')) {
        setSelectedPlan(plan);
        setDialogView('customize');
    } else {
        setSelectedPlan(plan);
        setCustomPlanDetails(null);
        setIsPlanDialogOpen(false);
    }
  };

  const handleSaveCustomization = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const liters = form.querySelector<HTMLInputElement>('input[name="litersPerMonth"]')?.value;
    const deliveries = form.querySelector<HTMLInputElement>('input[name="deliveriesPerWeek"]')?.value;
    const station = form.querySelector<HTMLSelectElement>('select[name="waterStation"]')?.value;
    
    if (liters && deliveries && station) {
        setCustomPlanDetails({
            litersPerMonth: parseInt(liters),
            deliveriesPerWeek: parseInt(deliveries),
            waterStation: station
        });
        if (!selectedPlan) {
            let planName = `Custom ${selectedClientType} Plan`;
            if (selectedClientType === 'Family') planName = familyPlans[0].name;
            if (selectedClientType === 'SME') planName = smePlans[0].name;
            if (selectedClientType === 'Commercial') planName = commercialPlans[0].name;
            if (selectedClientType === 'Corporate') planName = corporatePlans[0].name;

            setSelectedPlan({name: planName, price: 0});
        }
        setIsPlanDialogOpen(false);
    } else {
        toast({
            variant: "destructive",
            title: "Incomplete Information",
            description: "Please fill out all fields for your custom plan.",
        })
    }
  };
  
  const renderPlanDialog = () => {
    let plans: AnyPlan[] = [];
    let isEnterprise = false;
    let title = `Customize Your ${selectedClientType} Plan`

    if (selectedClientType === 'Family') {
        plans = familyPlans;
        title = 'Customize Family Plan'
    } else if (selectedClientType === 'SME') {
        plans = smePlans;
        title = 'Customize SME Plan'
    } else if (selectedClientType === 'Commercial') {
        plans = commercialPlans;
        title = 'Customize Commercial Plan'
    } else if (selectedClientType === 'Corporate') {
        plans = corporatePlans;
        title = 'Customize Corporate Plan'
    } else if (selectedClientType === 'Enterprise') {
        plans = enterprisePlans;
        isEnterprise = true;
        title = `Choose Your Enterprise Plan`
    }
    

    return (
        <Dialog open={isPlanDialogOpen} onOpenChange={(isOpen) => {
            setIsPlanDialogOpen(isOpen);
            if (!isOpen) {
                setDialogView('list');
            }
        }}>
            <DialogContent className={isEnterprise ? "sm:max-w-4xl" : "sm:max-w-md"}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                      {dialogView === 'list' 
                        ? 'Select the best plan that fits your needs.'
                        : 'Please provide the details for your water plan.'
                      }
                    </DialogDescription>
                </DialogHeader>
                {dialogView === 'list' && isEnterprise ? (
                    <div className={cn("grid gap-6 py-4", isEnterprise ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                        {plans.map((plan) => (
                            <Card key={plan.name} className={cn(
                                "flex flex-col cursor-pointer hover:border-primary transition-all",
                                plan.recommended && "border-primary ring-1 ring-primary",
                                selectedPlan?.name === plan.name && "border-primary ring-2 ring-primary"
                            )} onClick={() => handlePlanSelect(plan)}>
                                <CardHeader>
                                    <CardTitle>{plan.name}</CardTitle>
                                    {plan.recommended && <Badge className="w-fit">Recommended</Badge>}
                                </CardHeader>
                                <CardContent className="flex-grow space-y-4">
                                   {'details' in plan && Array.isArray(plan.details) ? (
                                        <ul className="space-y-2 text-sm text-muted-foreground">
                                            {(plan as EnterprisePlan).details?.map(detail => (
                                                <li key={detail.label} className="flex justify-between">
                                                    <span>{detail.label}</span>
                                                    <span className="font-semibold text-foreground">{detail.value}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <form onSubmit={handleSaveCustomization}>
                        <div className="py-4 space-y-4">
                             <div className="grid gap-2">
                                <Label htmlFor="litersPerMonth">Liters/Month</Label>
                                <Input id="litersPerMonth" name="litersPerMonth" type="number" placeholder="e.g., 5000" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="deliveriesPerWeek">Deliveries/Week</Label>
                                <Input id="deliveriesPerWeek" name="deliveriesPerWeek" type="number" placeholder="e.g., 2" />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="waterStation">Water Station</Label>
                                <Select name="waterStation">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a water station" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {waterStations.map(station => (
                                            <SelectItem key={station.id} value={station.name}>{station.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            {selectedClientType === 'Enterprise' && <Button variant="ghost" onClick={() => setDialogView('list')}>Back</Button>}
                            <Button type="submit">Save Customization</Button>
                        </div>
                    </form>
                )}
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
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Juan dela Cruz" {...field} />
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
                        <Input placeholder="e.g. River Business Inc." {...field} />
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
                        <Input placeholder="e.g. 123 Main St, Anytown" {...field} />
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
                        <Input type="tel" placeholder="e.g. 09123456789" {...field} />
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
                          const isEnterprise = client.name === 'Enterprise';
                          return (
                            <div key={client.name}
                                 onClick={() => handleClientTypeSelect(client.name)}
                                 className={cn(
                                     "border rounded-lg p-4 text-center cursor-pointer transition-all flex flex-col justify-center",
                                     isEnterprise ? "" : "aspect-square",
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
                        <div className="mt-4 border rounded-lg p-4 flex justify-between items-start">
                            <div>
                                <p className="font-bold text-lg">{selectedPlan.name}</p>
                                {customPlanDetails ? (
                                     <div className="text-sm text-muted-foreground">
                                        <p>{customPlanDetails.litersPerMonth.toLocaleString()} Liters/Month</p>
                                        <p>{customPlanDetails.deliveriesPerWeek} Deliveries/Week</p>
                                        <p>Station: {customPlanDetails.waterStation}</p>
                                    </div>
                                ) : 'details' in selectedPlan && selectedPlan.details && Array.isArray(selectedPlan.details) && (selectedPlan as EnterprisePlan).details?.map(d => (
                                    <p key={d.label} className="text-sm text-muted-foreground">{d.label}: {d.value}</p>
                                ))
                                }
                            </div>
                            <Button variant="outline" onClick={() => handleClientTypeSelect(selectedClientType!)}>Change Plan</Button>
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
