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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Users, Briefcase, Building, Layers, Factory, Droplet, RefreshCw, User, Home, Building2, QrCode, CreditCard, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';


const onboardingSchema = z.object({
  fullName: z.string().min(1, { message: 'Full name is required.' }),
  businessName: z.string().min(1, { message: 'Business name is required.' }),
  address: z.string().min(1, { message: 'Address is required.' }),
  contactNumber: z.string().min(10, { message: 'Please enter a valid contact number.' }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const icons: { [key: string]: React.ElementType } = {
    Family: Users,
    SME: Briefcase,
    Commercial: Building,
    Corporate: Layers,
    Enterprise: Factory,
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
  
  const [step, setStep] = React.useState<'selectPlan' | 'payment'>('selectPlan');
  const [selectedClientType, setSelectedClientType] = React.useState<(typeof clientTypes)[0] | null>(null);
  const [selectedPlan, setSelectedPlan] = React.useState<AnyPlan | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = React.useState(false);

  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr');
  const bankQr = PlaceHolderImages.find((p) => p.id === 'bank-qr');
  const paymayaQr = PlaceHolderImages.find((p) => p.id === 'paymaya-qr');
  
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
  });

  const onSubmit = (data: OnboardingFormValues) => {
    console.log('Onboarding data:', data);
    if (selectedClientType) {
        setIsInvoiceDialogOpen(true);
        setStep('selectPlan');
    } else {
        toast({
            variant: "destructive",
            title: 'No Water Plan Selected',
            description: 'Please select a client type to proceed.',
        });
    }
  };

  const handleClientTypeSelect = (clientType: (typeof clientTypes)[0]) => {
    setSelectedClientType(clientType);
  };

  const handlePlanSelect = (plan: AnyPlan) => {
    setSelectedPlan(plan);
    setStep('payment');
  };

  const handleBack = () => {
    if (step === 'payment') {
      setStep('selectPlan');
      setSelectedPlan(null);
    } else if (step === 'selectPlan') {
        setIsInvoiceDialogOpen(false);
        // Do not reset client type, so user can re-open dialog without re-selecting
    }
  };

  const resetFlow = () => {
    setStep('selectPlan');
    setSelectedClientType(null);
    setSelectedPlan(null);
    setIsInvoiceDialogOpen(false);
  }

  const completeOnboardingAndRedirect = () => {
    // This is the final step
    toast({
        title: 'Onboarding Complete!',
        description: 'Your information has been saved. You can manage your plan in the payments dashboard.',
    });
    router.push('/dashboard');
  }

  const getImageForPlan = (imageId: string) => {
    return PlaceHolderImages.find(p => p.id === imageId);
  }

    const getIconForClientType = (typeName: string) => {
    const Icon = icons[typeName];
    return Icon ? <Icon className="w-8 h-8 mb-2 text-primary" /> : null;
  }

  const currentPlans = selectedClientType?.name === 'Family' ? familyPlans : selectedClientType?.name === 'SME' ? smePlans : selectedClientType?.name === 'Commercial' ? commercialPlans: [];
  const regularSmePlans = smePlans.filter(p => !p.details);
  const customSmePlan = smePlans.find(p => p.details);

  const regularCommercialPlans = commercialPlans.filter(p => !p.details);
  const customCommercialPlan = commercialPlans.find(p => p.details);


  return (
    <div className="flex items-center justify-center min-h-screen bg-background py-12">
      <Card className="w-full max-w-2xl mx-4">
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
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold">Full Name</FormLabel>
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
                        <FormLabel className="font-bold">Business Name</FormLabel>
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
                        <FormLabel className="font-bold">Address</FormLabel>
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
                        <FormLabel className="font-bold">Contact Number</FormLabel>
                        <FormControl>
                        <Input type="tel" placeholder="09123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>

              <div className="space-y-2 pt-4">
                <Label>Water Plan</Label>
                <p className="text-sm text-muted-foreground">Choose the client type to see the recommended plans.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-4">
                    {clientTypes.map(client => {
                        const image = getImageForPlan(client.imageId);
                        return (
                            <Card 
                                key={client.name} 
                                className={cn("flex flex-col cursor-pointer hover:shadow-lg transition-shadow text-center", selectedClientType?.name === client.name && "border-primary ring-2 ring-primary")}
                                onClick={() => handleClientTypeSelect(client)}
                            >
                                <CardContent className="p-4 flex flex-col items-center justify-center flex-1">
                                    {image ? <Image src={image.imageUrl} alt={client.name} width={80} height={80} className="rounded-full mb-4 w-16 h-16 object-cover" data-ai-hint={image.imageHint} /> : getIconForClientType(client.name)
                                    }
                                    <h3 className="font-semibold text-sm">{client.name}</h3>
                                    <p className="text-xs text-muted-foreground">{client.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
              </div>
              
              <Button type="submit" className="w-full mt-6">
                Complete Onboarding
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogContent className="sm:max-w-4xl">
              {step === 'selectPlan' && selectedClientType && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center">
                       <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2"><X className="h-4 w-4" /></Button>
                      Choose a Plan
                    </DialogTitle>
                    <DialogDescription>Select the best plan from the options below.</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col md:flex-row gap-4 py-4">
                    <Card className="w-full md:w-1/4">
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          {selectedClientType.imageId && getImageForPlan(selectedClientType.imageId) && <Image src={getImageForPlan(selectedClientType.imageId)!.imageUrl} alt={selectedClientType.name} width={100} height={100} className="rounded-lg object-cover mb-4" />}
                          <h3 className="text-lg font-bold">{selectedClientType.name}</h3>
                          <p className="text-sm text-muted-foreground">{selectedClientType.description}</p>
                        </CardContent>
                    </Card>
                    <div className="w-full md:w-3/4">
                      {selectedClientType.name === 'Family' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {familyPlans.map(plan => (
                              <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className={cn("cursor-pointer hover:border-primary relative flex flex-col", plan.details && 'md:col-span-2' )}>
                                  {plan.recommended && <Badge className="absolute -top-2 -right-2">Recommended</Badge>}
                                  <CardHeader>
                                      <CardTitle>{plan.name}</CardTitle>
                                      {plan.details ? (
                                          <p className="text-2xl font-bold">Custom</p>
                                      ) : (
                                          <p className="text-2xl font-bold">₱{plan.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                                      )}
                                  </CardHeader>
                                  <CardContent className="space-y-4 flex-grow flex flex-col">
                                      {plan.details ? (
                                          <ul className="space-y-1 text-muted-foreground list-disc pl-5 mt-4 text-sm">
                                              {plan.details!.map(detail => <li key={detail}>{detail}</li>)}
                                          </ul>
                                      ) : (
                                          <>
                                              <div className="space-y-1">
                                                  <p className="text-xs text-muted-foreground">Liters Included</p>
                                                  <p className="font-semibold flex items-center gap-2"><Droplet className="w-4 h-4"/>{plan.liters} L</p>
                                              </div>
                                              <div className="space-y-1">
                                                  <p className="text-xs text-muted-foreground">Avg. Refill Frequency</p>
                                                  <p className="font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4"/>{plan.refillFrequency}</p>
                                              </div>
                                          </>
                                      )}
                                      <div className="flex-grow"></div>
                                      <Separator />
                                      <div className="text-xs text-muted-foreground flex items-center justify-between">
                                         <span className="flex items-center gap-1"><User className="w-3 h-3"/> {plan.persons}</span>
                                         {!plan.details && <span className="flex items-center gap-1"><Home className="w-3 h-3"/> ~{plan.gallons} Gallons/week</span>}
                                      </div>
                                  </CardContent>
                              </Card>
                          ))}
                          </div>
                      )}
                      {selectedClientType.name === 'SME' && (
                          <div className="grid grid-cols-1 gap-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {regularSmePlans.map(plan => {
                                      const isSmePlan = 'employees' in plan;
                                      return (
                                          <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className="cursor-pointer hover:border-primary relative flex flex-col">
                                              {plan.recommended && <Badge className="absolute -top-2 -right-2">Recommended</Badge>}
                                              <CardHeader>
                                                  <CardTitle>{plan.name}</CardTitle>
                                                  <p className="text-2xl font-bold">₱{plan.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                                              </CardHeader>
                                              <CardContent className="space-y-4 flex-grow flex flex-col">
                                                  <div className="space-y-1">
                                                      <p className="text-xs text-muted-foreground">Liters Included</p>
                                                      <p className="font-semibold flex items-center gap-2"><Droplet className="w-4 h-4"/>{plan.liters} L</p>
                                                  </div>
                                                  <div className="space-y-1">
                                                      <p className="text-xs text-muted-foreground">Avg. Refill Frequency</p>
                                                      <p className="font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4"/>{plan.refillFrequency}</p>
                                                  </div>
                                                  <div className="flex-grow"></div>
                                                  <Separator />
                                                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                                                      {isSmePlan && <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {plan.employees} Employees</span>}
                                                      {isSmePlan && <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/> {plan.stations} Station</span>}
                                                  </div>
                                              </CardContent>
                                          </Card>
                                      )
                                  })}
                              </div>
                              {customSmePlan && (() => {
                                  const plan = customSmePlan;
                                  return (
                                      <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className="cursor-pointer hover:border-primary relative flex flex-col mt-4">
                                           {plan.recommended && <Badge className="absolute -top-2 -right-2">Recommended</Badge>}
                                          <CardHeader>
                                              <CardTitle>{plan.name}</CardTitle>
                                               <p className="text-2xl font-bold">Custom</p>
                                          </CardHeader>
                                           <CardContent className="space-y-4 flex-grow flex flex-col">
                                              <ul className="space-y-1 text-muted-foreground list-disc pl-5 mt-4 text-sm">
                                                  {plan.details!.map(detail => <li key={detail}>{detail}</li>)}
                                              </ul>
                                          </CardContent>
                                      </Card>
                                  )
                              })()}
                          </div>
                      )}
                      {selectedClientType.name === 'Commercial' && (
                          <div className="grid grid-cols-1 gap-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {regularCommercialPlans.map(plan => {
                                      const isCommercialPlan = 'employees' in plan;
                                      return (
                                          <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className="cursor-pointer hover:border-primary relative flex flex-col">
                                              {plan.recommended && <Badge className="absolute -top-2 -right-2">Recommended</Badge>}
                                              <CardHeader>
                                                  <CardTitle>{plan.name}</CardTitle>
                                                  <p className="text-2xl font-bold">₱{plan.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                                              </CardHeader>
                                              <CardContent className="space-y-4 flex-grow flex flex-col">
                                                  <div className="space-y-1">
                                                      <p className="text-xs text-muted-foreground">Liters Included</p>
                                                      <p className="font-semibold flex items-center gap-2"><Droplet className="w-4 h-4"/>{plan.liters} L</p>
                                                  </div>
                                                  <div className="space-y-1">
                                                      <p className="text-xs text-muted-foreground">Avg. Refill Frequency</p>
                                                      <p className="font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4"/>{plan.refillFrequency}</p>
                                                  </div>
                                                  <div className="flex-grow"></div>
                                                  <Separator />
                                                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                                                      {isCommercialPlan && <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {plan.employees} Employees</span>}
                                                      {isCommercialPlan && <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/> {plan.stations} Station</span>}
                                                  </div>
                                              </CardContent>
                                          </Card>
                                      )
                                  })}
                              </div>
                              {customCommercialPlan && (() => {
                                  const plan = customCommercialPlan;
                                  return (
                                      <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className="cursor-pointer hover:border-primary relative flex flex-col mt-4">
                                           {plan.recommended && <Badge className="absolute -top-2 -right-2">Recommended</Badge>}
                                          <CardHeader>
                                              <CardTitle>{plan.name}</CardTitle>
                                               <p className="text-2xl font-bold">Custom</p>
                                          </CardHeader>
                                           <CardContent className="space-y-4 flex-grow flex flex-col">
                                              <ul className="space-y-1 text-muted-foreground list-disc pl-5 mt-4 text-sm">
                                                  {plan.details!.map(detail => <li key={detail}>{detail}</li>)}
                                              </ul>
                                          </CardContent>
                                      </Card>
                                  )
                              })()}
                          </div>
                      )}
                      {selectedClientType.name === 'Corporate' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {corporatePlans.map(plan => {
                                  const isCorporatePlan = 'employees' in plan;
                                  return (
                                      <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className="cursor-pointer hover:border-primary relative flex flex-col">
                                          {plan.recommended && <Badge className="absolute -top-2 -right-2">Recommended</Badge>}
                                          <CardHeader>
                                              <CardTitle>{plan.name}</CardTitle>
                                              <p className="text-2xl font-bold">₱{plan.price.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                                          </CardHeader>
                                          <CardContent className="space-y-4 flex-grow flex flex-col">
                                              <div className="space-y-1">
                                                  <p className="text-xs text-muted-foreground">Liters Included</p>
                                                  <p className="font-semibold flex items-center gap-2"><Droplet className="w-4 h-4"/>{plan.liters} L</p>
                                              </div>
                                              <div className="space-y-1">
                                                  <p className="text-xs text-muted-foreground">Avg. Refill Frequency</p>
                                                  <p className="font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4"/>{plan.refillFrequency}</p>
                                              </div>
                                              <div className="flex-grow"></div>
                                              <Separator />
                                              <div className="text-xs text-muted-foreground flex items-center justify-between">
                                                  {isCorporatePlan && <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {plan.employees} Employees</span>}
                                                  {isCorporatePlan && <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/> {plan.stations} Stations</span>}
                                              </div>
                                          </CardContent>
                                      </Card>
                                  )
                              })}
                          </div>
                      )}
                      {selectedClientType.name === 'Enterprise' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {enterprisePlans.map(plan => {
                                const image = plan.imageId ? getImageForPlan(plan.imageId) : null;
                                return (
                                    <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className="cursor-pointer hover:border-primary relative flex flex-col">
                                        {image && <Image src={image.imageUrl} alt={plan.name} width={300} height={150} className="rounded-t-lg object-cover w-full h-32" data-ai-hint={image.imageHint} />}
                                        <CardHeader>
                                            <CardTitle>{plan.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4 flex-grow flex flex-col">
                                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                                            <div className="flex-grow"></div>
                                            <Button className="w-full mt-4">Select Plan</Button>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              {step === 'payment' && selectedPlan && (
                 <>
                   <DialogHeader>
                      <DialogTitle className="flex items-center">
                       <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2"><X className="h-4 w-4" /></Button>
                        Complete Your Payment
                      </DialogTitle>
                     <DialogDescription>
                         {'details' in selectedPlan ? (
                            <>You've selected the <span className="font-bold">{selectedPlan?.name}</span> plan. Please contact us for a personalized quote.</>
                         ) : 'employees' in selectedPlan && typeof selectedPlan.price === 'number' ? (
                            <>You've selected the <span className="font-bold">{selectedPlan?.name}</span> plan. Pay ₱{selectedPlan.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} using your preferred method.</>
                         ) : 'persons' in selectedPlan && typeof selectedPlan.price === 'number' ? (
                            <>You've selected the <span className="font-bold">{selectedPlan?.name}</span> plan. Pay ₱{selectedPlan.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} using your preferred method.</>
                         ) : (
                          <>You've selected the <span className="font-bold">{selectedPlan?.name}</span> plan. Please contact us for a personalized quote.</>
                         )}
                     </DialogDescription>
                   </DialogHeader>
                   <Tabs defaultValue="qr" className="w-full">
                       <TabsList className="grid w-full grid-cols-2">
                           <TabsTrigger value="qr"><QrCode className="mr-2" /> QR Code</TabsTrigger>
                           <TabsTrigger value="bank"><CreditCard className="mr-2"/> Bank/Card</TabsTrigger>
                       </TabsList>
                       <TabsContent value="qr">
                           <div className="flex flex-col items-center gap-4 py-4">
                               <p className="text-sm text-muted-foreground text-center">Scan the QR code with your mobile banking or e-wallet app.</p>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                   {gcashQr && <Image src={gcashQr.imageUrl} alt="GCash QR" width={150} height={150} data-ai-hint={gcashQr.imageHint} />}
                                   {paymayaQr && <Image src={paymayaQr.imageUrl} alt="PayMaya QR" width={150} height={150} data-ai-hint={paymayaQr.imageHint} />}
                                   {bankQr && <Image src={bankQr.imageUrl} alt="Bank QR" width={150} height={150} data-ai-hint={bankQr.imageHint} />}
                               </div>
                           </div>
                       </TabsContent>
                       <TabsContent value="bank">
                            <div className="space-y-4 py-4">
                               <div className="text-center">
                                   <p className="font-semibold">Bank Transfer</p>
                                   <p className="text-sm text-muted-foreground">BDO Unibank: 123-456-7890</p>
                                   <p className="text-sm text-muted-foreground">Account Name: River Business Inc.</p>
                               </div>
                                <Separator />
                                <div className="text-center">
                                   <p className="font-semibold">Credit/Debit Card</p>
                                   <p className="text-sm text-muted-foreground">Card payments are processed securely.</p>
                                   <Button className="mt-2">Pay with Card</Button>
                               </div>
                            </div>
                       </TabsContent>
                   </Tabs>
                 </>
              )}
               <DialogFooter>
                <Button type="button" variant="secondary" onClick={completeOnboardingAndRedirect}>
                  Finish
                </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
