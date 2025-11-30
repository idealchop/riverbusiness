
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
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Droplet, Package, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { AppUser } from '@/lib/types';
import { clientTypes } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';


const onboardingSchema = z.object({
  name: z.string().min(1, { message: 'Required' }),
  businessName: z.string().min(1, { message: 'Required' }),
  address: z.string().min(1, { message: 'Required' }),
  contactNumber: z.string().min(10, { message: 'Required' }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

interface CustomPlanDetails {
    litersPerMonth: number;
    bonusLiters: number;
    deliveryFrequency: string;
    deliveryDay: string;
    deliveryTime: string;
    gallonQuantity: number;
    gallonPrice: number;
    dispenserQuantity: number;
    dispenserPrice: number;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const deliveryFrequencies = ['Daily', 'Weekly', 'Monthly'];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<any | null>(null);
  const [customPlanDetails, setCustomPlanDetails] = React.useState<CustomPlanDetails | null>(null);
  const [customLiters, setCustomLiters] = React.useState<number>(0);
  const [bonusLiters, setBonusLiters] = React.useState<number>(0);
  const [selectedDay, setSelectedDay] = React.useState<string>('');
  const [deliveryFrequency, setDeliveryFrequency] = React.useState<string>('');
  const [deliveryTime, setDeliveryTime] = React.useState<string>('');
  const [amountPerMonth, setAmountPerMonth] = React.useState<number>(0);
  const [gallonQuantity, setGallonQuantity] = React.useState<number>(0);
  const [gallonPrice, setGallonPrice] = React.useState<number>(0);
  const [dispenserQuantity, setDispenserQuantity] = React.useState<number>(0);
  const [dispenserPrice, setDispenserPrice] = React.useState<number>(0);

  
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { name: '', businessName: '', address: '', contactNumber: '' }
  });

  const onSubmit = (data: OnboardingFormValues) => {
    if (!authUser || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Authentication not ready.'});
        return;
    }
    
    const onboardingData: Partial<AppUser> = {
        ...data,
        email: authUser.email || '',
        id: authUser.uid,
        role: 'User',
        accountStatus: 'Active',
        lastLogin: new Date().toISOString(),
        createdAt: serverTimestamp(),
        plan: selectedPlan,
        customPlanDetails: customPlanDetails,
        onboardingComplete: true,
        totalConsumptionLiters: 0,
    };
    
    const userDocRef = doc(firestore, 'users', authUser.uid);
    setDocumentNonBlocking(userDocRef, onboardingData, { merge: true });

    toast({ title: 'Onboarding Complete!', description: 'Your information has been saved.' });
    router.push('/dashboard');
  };

  const handleNextStep = async () => {
    const isValid = await form.trigger();
    if (isValid) {
        setCurrentStep(2);
    }
  }

  const handleClientTypeSelect = (clientTypeName: string) => {
    // Resetting states
    setCustomLiters(0);
    setBonusLiters(0);
    setAmountPerMonth(0);
    setSelectedPlan(null); 
    setCustomPlanDetails(null);
    setSelectedDay('');
    setDeliveryFrequency('');
    setDeliveryTime('');
    setGallonQuantity(0);
    setGallonPrice(0);
    setDispenserQuantity(0);
    setDispenserPrice(0);
    setIsPlanDialogOpen(true);
  };
  
  const handleSaveCustomization = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (customLiters > 0 && deliveryFrequency && selectedDay && deliveryTime) {
        const planDetails = {
            litersPerMonth: customLiters,
            bonusLiters: bonusLiters,
            deliveryFrequency: deliveryFrequency,
            deliveryDay: selectedDay,
            deliveryTime: deliveryTime,
            gallonQuantity: gallonQuantity,
            gallonPrice: gallonPrice,
            dispenserQuantity: dispenserQuantity,
            dispenserPrice: dispenserPrice,
        };
        setCustomPlanDetails(planDetails);
        
        const totalAmount = amountPerMonth + gallonPrice + dispenserPrice;
        setSelectedPlan({ name: 'Custom Plan', price: totalAmount });
        
        setIsPlanDialogOpen(false);
        setCurrentStep(3);
    } else {
        toast({
            variant: "destructive",
            title: "Incomplete Information",
            description: "Please fill all fields for your plan customization.",
        })
    }
  };

  if (isUserLoading) return <div>Loading...</div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background py-12 px-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
             <div className="flex items-center justify-center gap-2 font-semibold text-2xl mb-4">
              <Logo height={40} />
            </div>
            <CardTitle className="text-3xl font-bold">Welcome Onboard!</CardTitle>
            <CardDescription>Please fill out your information to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {currentStep === 1 && (
                <div className="space-y-4">
                    <h3 className="font-bold text-lg">Step 1: Your Details</h3>
                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl><Input placeholder="e.g. Juan dela Cruz" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="businessName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Business Name</FormLabel>
                                <FormControl><Input placeholder="e.g. River Business Inc." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Address</FormLabel>
                                <FormControl><Input placeholder="e.g. 123 Main St, Anytown" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="contactNumber" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contact Number</FormLabel>
                                <FormControl><Input type="tel" placeholder="e.g. 09123456789" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                     <div className="flex justify-end pt-8">
                        <Button type="button" onClick={handleNextStep}>Next</Button>
                    </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentStep(1)}><ArrowLeft className="h-4 w-4" /></Button>
                        <h3 className="font-bold text-lg">Step 2: Select Your Client Type</h3>
                    </div>
                    <p className="text-muted-foreground">Click to customize your water plan.</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientTypes.map((client) => {
                            const image = PlaceHolderImages.find(p => p.id === client.imageId);
                            return (
                            <div
                                key={client.name}
                                onClick={() => handleClientTypeSelect(client.name)}
                                className={cn(
                                "border rounded-lg p-4 cursor-pointer transition-all flex flex-col h-52 overflow-hidden relative",
                                "hover:border-primary/50"
                                )}
                            >
                                {image && (
                                <Image
                                    src={image.imageUrl}
                                    alt={client.name}
                                    fill
                                    className="object-cover transition-transform group-hover:scale-105"
                                    data-ai-hint={image.imageHint}
                                />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                <div className="relative mt-auto z-10 text-white">
                                <h4 className="text-lg font-bold">{client.name}</h4>
                                <p className="text-xs text-white/80">{client.description}</p>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
              )}
              
                {currentStep === 3 && selectedPlan && customPlanDetails && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                             <Button variant="ghost" size="icon" onClick={() => setCurrentStep(2)}><ArrowLeft className="h-4 w-4" /></Button>
                             <h3 className="text-lg font-semibold">Step 3: Confirm Your Plan</h3>
                        </div>
                        
                        <div className="mt-4 border rounded-lg p-4 bg-accent/50 space-y-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="flex-1">
                                    <p className="font-bold text-xl">{selectedPlan.name}</p>
                                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                        <p><strong>Liters/Month:</strong> {customPlanDetails.litersPerMonth.toLocaleString()}</p>
                                        <p><strong>Bonus Liters:</strong> {customPlanDetails.bonusLiters.toLocaleString()}</p>
                                        <p><strong>Gallons:</strong> {customPlanDetails.gallonQuantity}</p>
                                        <p><strong>Dispensers:</strong> {customPlanDetails.dispenserQuantity}</p>
                                        <p><strong>Subscription:</strong> ₱{selectedPlan.price.toLocaleString()}</p>
                                        <p><strong>Delivery:</strong> {customPlanDetails.deliveryFrequency} on {customPlanDetails.deliveryDay} at {customPlanDetails.deliveryTime}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-2">Your Details</h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                    <p><strong>Name:</strong> {form.getValues('name')}</p>
                                    <p><strong>Email:</strong> {authUser?.email}</p>
                                    <p><strong>Business:</strong> {form.getValues('businessName')}</p>
                                    <p><strong>Address:</strong> {form.getValues('address')}</p>
                                    <p><strong>Contact:</strong> {form.getValues('contactNumber')}</p>
                                </div>
                            </div>
                        </div>
                         <div className="flex justify-end pt-8">
                            <Button type="submit" className="w-full">Complete Onboarding</Button>
                        </div>
                    </div>
                )}
            </form>
          </Form>
        </CardContent>
      </Card>
      {isPlanDialogOpen && (
        <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Customize Your Plan</DialogTitle>
                    <DialogDescription>
                        Please provide the details for your water plan.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveCustomization}>
                    <div className="py-4 space-y-6">
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2"><Droplet className="h-4 w-4" /> Water Plan</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="litersPerMonth">Liters/Month</Label>
                                    <Input id="litersPerMonth" type="number" placeholder="e.g., 5000" onChange={(e) => setCustomLiters(Number(e.target.value))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="bonusLiters">Bonus Liters/Month</Label>
                                    <Input id="bonusLiters" type="number" placeholder="e.g., 500" onChange={(e) => setBonusLiters(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="amountPerMonth">Amount/Month (Water)</Label>
                                <Input id="amountPerMonth" type="number" placeholder="e.g., 15000" onChange={(e) => setAmountPerMonth(Number(e.target.value))} />
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                             <h4 className="font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4" /> Equipment</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="gallonQuantity">Gallon Quantity</Label>
                                    <Input id="gallonQuantity" type="number" placeholder="e.g., 10" onChange={(e) => setGallonQuantity(Number(e.target.value))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="gallonPrice">Gallon Price/Month</Label>
                                    <Input id="gallonPrice" type="number" placeholder="e.g., 100" onChange={(e) => setGallonPrice(Number(e.target.value))} />
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="dispenserQuantity">Dispenser Quantity</Label>
                                    <Input id="dispenserQuantity" type="number" placeholder="e.g., 2" onChange={(e) => setDispenserQuantity(Number(e.target.value))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="dispenserPrice">Dispenser Price/Month</Label>
                                    <Input id="dispenserPrice" type="number" placeholder="e.g., 500" onChange={(e) => setDispenserPrice(Number(e.target.value))} />
                                </div>
                            </div>
                        </div>

                        <Separator />
                        
                        <div className="space-y-4">
                             <h4 className="font-semibold text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Delivery Schedule</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Frequency</Label>
                                    <Select onValueChange={setDeliveryFrequency}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {deliveryFrequencies.map(freq => (
                                                <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Day</Label>
                                    <Select onValueChange={setSelectedDay}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {daysOfWeek.map(day => (
                                                <SelectItem key={day} value={day}>{day}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="deliveryTime">Time</Label>
                                <Input id="deliveryTime" type="time" onChange={(e) => setDeliveryTime(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                         <Button type="button" variant="outline" onClick={() => setIsPlanDialogOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Customization</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
