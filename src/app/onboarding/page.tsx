
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
import { Separator } from '@/components/ui/separator';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Users, Briefcase, Building, Layers, Factory, Droplet, RefreshCw, User, Home, Building2, QrCode, CreditCard, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';


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

const steps = [
    { id: 'info', name: 'Your Information' },
    { id: 'clientType', name: 'Client Type' },
    { id: 'plan', name: 'Select Plan' },
    { id: 'payment', name: 'Payment' }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = React.useState(0);
  const [selectedClientType, setSelectedClientType] = React.useState<(typeof clientTypes)[0] | null>(null);
  const [selectedPlan, setSelectedPlan] = React.useState<AnyPlan | null>(null);

  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr');
  const bankQr = PlaceHolderImages.find((p) => p.id === 'bank-qr');
  const paymayaQr = PlaceHolderImages.find((p) => p.id === 'paymaya-qr');
  
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
  });

  const handleNext = async () => {
    if (currentStep === 0) {
      const isValid = await form.trigger();
      if (!isValid) return;
    }
    if (currentStep === 1 && !selectedClientType) {
        toast({ variant: 'destructive', title: 'Please select a client type.' });
        return;
    }
    if (currentStep === 2 && !selectedPlan) {
        toast({ variant: 'destructive', title: 'Please select a plan.' });
        return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
        // Final step action
        toast({
            title: 'Onboarding Complete!',
            description: 'Your information has been saved. You can manage your plan in the payments dashboard.',
        });
        router.push('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClientTypeSelect = (clientType: (typeof clientTypes)[0]) => {
    setSelectedClientType(clientType);
    setSelectedPlan(null); // Reset plan when client type changes
    handleNext();
  };

  const handlePlanSelect = (plan: AnyPlan) => {
    setSelectedPlan(plan);
    handleNext();
  };

  const getImageForPlan = (imageId: string) => {
    return PlaceHolderImages.find(p => p.id === imageId);
  }

  const getIconForClientType = (typeName: string) => {
    const Icon = icons[typeName];
    return Icon ? <Icon className="w-8 h-8 mb-2 text-primary" /> : null;
  }

  const regularSmePlans = smePlans.filter(p => !p.details);
  const customSmePlan = smePlans.find(p => p.details);

  const regularCommercialPlans = commercialPlans.filter(p => !p.details);
  const customCommercialPlan = commercialPlans.find(p => p.details);
  
  const progressValue = ((currentStep + 1) / steps.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // User Information
        return (
          <Form {...form}>
            <form className="space-y-4">
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
            </form>
          </Form>
        );
      case 1: // Select Client Type
        return (
            <div className="space-y-2 pt-4">
                <Label className="font-bold">Select Your Client Type</Label>
                <p className="text-sm text-muted-foreground">Choose the category that best fits you to see recommended plans.</p>
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
                                    {image ? <Image src={image.imageUrl} alt={client.name} width={80} height={80} className="rounded-full mb-4 w-16 h-16 object-cover" data-ai-hint={image.imageHint} /> : getIconForClientType(client.name)}
                                    <h3 className="font-semibold text-sm">{client.name}</h3>
                                    <p className="text-xs text-muted-foreground">{client.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    case 2: // Select Plan
        return (
            <div className="py-4">
                <h3 className="text-lg font-semibold mb-2">Choose a Plan for {selectedClientType?.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">Select the best plan from the options below.</p>
                
                {selectedClientType?.name === 'Family' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {familyPlans.map(plan => (
                            <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className={cn("cursor-pointer hover:border-primary relative flex flex-col", plan.details && 'md:col-span-2' )}>
                                {plan.recommended && <Badge className="absolute -top-2 -right-2 z-10">Recommended</Badge>}
                                <CardHeader>
                                    <CardTitle>{plan.name}</CardTitle>
                                    {plan.details ? <p className="text-2xl font-bold">Custom</p> : <p className="text-2xl font-bold">₱{plan.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>}
                                </CardHeader>
                                <CardContent className="space-y-4 flex-grow flex flex-col">
                                    {plan.details ? <ul className="space-y-1 text-muted-foreground list-disc pl-5 mt-4 text-sm">{plan.details!.map(detail => <li key={detail}>{detail}</li>)}</ul> : <> <div className="space-y-1"> <p className="text-xs text-muted-foreground">Liters Included</p> <p className="font-semibold flex items-center gap-2"><Droplet className="w-4 h-4"/>{plan.liters} L</p> </div> <div className="space-y-1"> <p className="text-xs text-muted-foreground">Avg. Refill Frequency</p> <p className="font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4"/>{plan.refillFrequency}</p> </div> </>}
                                    <div className="flex-grow"></div>
                                    <Separator />
                                    <div className="text-xs text-muted-foreground flex items-center justify-between pt-4"> <span className="flex items-center gap-1"><User className="w-3 h-3"/> {plan.persons}</span> {!plan.details && <span className="flex items-center gap-1"><Home className="w-3 h-3"/> ~{plan.gallons} Gallons/week</span>} </div>
                                </CardContent>
                                {plan.details && <CardContent><Button className="w-full" onClick={(e) => { e.stopPropagation(); handlePlanSelect(plan); }}>Select Custom Plan</Button></CardContent>}
                            </Card>
                        ))}
                    </div>
                )}
                {selectedClientType?.name === 'SME' && (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {regularSmePlans.map(plan => (
                                <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className="cursor-pointer hover:border-primary relative flex flex-col">
                                    {plan.recommended && <Badge className="absolute -top-2 -right-2 z-10">Recommended</Badge>}
                                    <CardHeader> <CardTitle>{plan.name}</CardTitle> <p className="text-2xl font-bold">₱{plan.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p> </CardHeader>
                                    <CardContent className="space-y-4 flex-grow flex flex-col"> <div className="space-y-1"> <p className="text-xs text-muted-foreground">Liters Included</p> <p className="font-semibold flex items-center gap-2"><Droplet className="w-4 h-4"/>{plan.liters} L</p> </div> <div className="space-y-1"> <p className="text-xs text-muted-foreground">Avg. Refill Frequency</p> <p className="font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4"/>{plan.refillFrequency}</p> </div> <div className="flex-grow"></div> <Separator /> <div className="text-xs text-muted-foreground flex items-center justify-between pt-4"> {'employees' in plan && <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {plan.employees} Employees</span>} {'stations' in plan && <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/> {plan.stations} Station</span>} </div> </CardContent>
                                </Card>
                            ))}
                        </div>
                        {customSmePlan && (
                            <Card key={customSmePlan.name} onClick={() => handlePlanSelect(customSmePlan)} className="cursor-pointer hover:border-primary relative flex flex-col mt-4">
                                {customSmePlan.recommended && <Badge className="absolute -top-2 -right-2 z-10">Recommended</Badge>}
                                <CardHeader> <CardTitle>{customSmePlan.name}</CardTitle> <p className="text-2xl font-bold">Custom</p> </CardHeader>
                                <CardContent className="space-y-4 flex-grow flex flex-col"> <ul className="space-y-1 text-muted-foreground list-disc pl-5 mt-4 text-sm">{customSmePlan.details!.map(detail => <li key={detail}>{detail}</li>)}</ul> <div className="flex-grow" /> <Button className="w-full mt-4" onClick={(e) => { e.stopPropagation(); handlePlanSelect(customSmePlan); }}>Select Plan</Button> </CardContent>
                            </Card>
                        )}
                    </div>
                )}
                 {selectedClientType?.name === 'Commercial' && (
                          <div className="grid grid-cols-1 gap-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {regularCommercialPlans.map(plan => {
                                      const isCommercialPlan = 'employees' in plan;
                                      return (
                                          <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className="cursor-pointer hover:border-primary relative flex flex-col">
                                              {plan.recommended && <Badge className="absolute -top-2 -right-2 z-10">Recommended</Badge>}
                                              <CardHeader> <CardTitle>{plan.name}</CardTitle> <p className="text-2xl font-bold">₱{plan.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p> </CardHeader>
                                              <CardContent className="space-y-4 flex-grow flex flex-col"> <div className="space-y-1"> <p className="text-xs text-muted-foreground">Liters Included</p> <p className="font-semibold flex items-center gap-2"><Droplet className="w-4 h-4"/>{plan.liters} L</p> </div> <div className="space-y-1"> <p className="text-xs text-muted-foreground">Avg. Refill Frequency</p> <p className="font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4"/>{plan.refillFrequency}</p> </div> <div className="flex-grow"></div> <Separator /> <div className="text-xs text-muted-foreground flex items-center justify-between pt-4"> {isCommercialPlan && <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {plan.employees} Employees</span>} {isCommercialPlan && <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/> {plan.stations} Station</span>} </div> </CardContent>
                                          </Card>
                                      )
                                  })}
                              </div>
                              {customCommercialPlan && (() => {
                                  const plan = customCommercialPlan;
                                  return (
                                      <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className="cursor-pointer hover:border-primary relative flex flex-col mt-4">
                                           {plan.recommended && <Badge className="absolute -top-2 -right-2 z-10">Recommended</Badge>}
                                          <CardHeader> <CardTitle>{plan.name}</CardTitle> <p className="text-2xl font-bold">Custom</p> </CardHeader>
                                           <CardContent className="space-y-4 flex-grow flex flex-col"> <ul className="space-y-1 text-muted-foreground list-disc pl-5 mt-4 text-sm">{plan.details!.map(detail => <li key={detail}>{detail}</li>)}</ul> <div className="flex-grow" /> <Button className="w-full mt-4" onClick={(e) => { e.stopPropagation(); handlePlanSelect(plan); }}>Select Plan</Button> </CardContent>
                                      </Card>
                                  )
                              })()}
                          </div>
                )}
                {selectedClientType?.name === 'Corporate' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {corporatePlans.map(plan => (
                            <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className="cursor-pointer hover:border-primary relative flex flex-col">
                                {plan.recommended && <Badge className="absolute -top-2 -right-2 z-10">Recommended</Badge>}
                                <CardHeader> <CardTitle>{plan.name}</CardTitle> <p className="text-2xl font-bold">₱{plan.price.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/month</span></p> </CardHeader>
                                <CardContent className="space-y-4 flex-grow flex flex-col"> <div className="space-y-1"> <p className="text-xs text-muted-foreground">Liters Included</p> <p className="font-semibold flex items-center gap-2"><Droplet className="w-4 h-4"/>{plan.liters} L</p> </div> <div className="space-y-1"> <p className="text-xs text-muted-foreground">Avg. Refill Frequency</p> <p className="font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4"/>{plan.refillFrequency}</p> </div> <div className="flex-grow"></div> <Separator /> <div className="text-xs text-muted-foreground flex items-center justify-between pt-4"> {'employees' in plan && <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {plan.employees} Employees</span>} {'stations' in plan && <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/> {plan.stations} Stations</span>} </div> </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
                {selectedClientType?.name === 'Enterprise' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {enterprisePlans.map(plan => {
                            const image = plan.imageId ? getImageForPlan(plan.imageId) : null;
                            return (
                                <Card key={plan.name} onClick={() => handlePlanSelect(plan)} className="cursor-pointer hover:border-primary relative flex flex-col">
                                    {image && <Image src={image.imageUrl} alt={plan.name} width={300} height={150} className="rounded-t-lg object-cover w-full h-32" data-ai-hint={image.imageHint} />}
                                    <CardHeader> <CardTitle>{plan.name}</CardTitle> </CardHeader>
                                    <CardContent className="space-y-4 flex-grow flex flex-col"> <p className="text-sm text-muted-foreground">{plan.description}</p> <div className="flex-grow"></div> <Button className="w-full mt-4" onClick={(e) => { e.stopPropagation(); handlePlanSelect(plan); }}>Select Plan</Button> </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        );
        case 3: // Payment
            const getPlanPrice = () => {
                if (!selectedPlan) return 'N/A';
                if ('price' in selectedPlan && typeof selectedPlan.price === 'number' && selectedPlan.price > 0) {
                    return `₱${selectedPlan.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                return 'Custom Quote';
            }
            return (
                 <div className="py-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Selected Plan: {selectedPlan?.name}</span>
                                <Badge variant="secondary">{getPlanPrice()}</Badge>
                            </CardTitle>
                             <CardDescription>
                                 {'details' in selectedPlan ? (
                                    <>You've selected a custom plan. Please contact us for a personalized quote.</>
                                 ) : (
                                    <>Complete your payment for the <span className="font-bold">{selectedPlan?.name}</span> plan.</>
                                 )}
                             </CardDescription>
                        </CardHeader>
                        {'price' in selectedPlan && selectedPlan.price > 0 && (
                        <CardContent>
                            <Tabs defaultValue="qr" className="w-full pt-4">
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
                        </CardContent>
                        )}
                    </Card>
                 </div>
            );
      default:
        return null;
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background py-12">
      <Card className="w-full max-w-4xl mx-4">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 font-semibold text-2xl mb-4">
                <Logo className="h-10 w-10 text-primary" />
                <span className="font-headline">River Business</span>
            </div>
          <CardTitle className="text-3xl font-bold">Welcome Onboard!</CardTitle>
          <CardDescription>Please follow the steps to get started.</CardDescription>
          <div className="pt-4">
            <Progress value={progressValue} className="w-full" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                {steps.map((step, index) => (
                    <div key={step.id} className={cn("text-center", currentStep >= index && "text-primary font-semibold")}>
                        {step.name}
                    </div>
                ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {renderStepContent()}
        </CardContent>
        <CardContent>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleNext}>
                  {currentStep === steps.length - 1 ? (
                      <>Finish <Check className="ml-2 h-4 w-4" /></>
                  ) : 'Next'}
              </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
