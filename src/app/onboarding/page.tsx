
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
import { waterStations } from '@/lib/data';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Users, Briefcase, Building, Layers, Factory, ArrowLeft, Droplet, Archive, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';


const onboardingSchema = z.object({
  fullName: z.string().min(1, { message: 'Required' }),
  clientId: z.string().min(1, { message: 'Required' }),
  email: z.string().email({ message: 'Invalid email address.' }),
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

type AnyPlan = {
    name: string;
    price: number;
    recommended?: boolean;
    details?: any;
    description?: string;
    imageId?: string;
}

interface CustomPlanDetails {
    litersPerMonth: number;
    addOnLiters: number;
    deliveryFrequency: string;
    deliveryDay: string;
    deliveryTime: string;
    waterStation: string;
    dispenserQuantity: number;
    dispenserPrice: number;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const deliveryFrequencies = ['Daily', 'Weekly', 'Monthly'];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = React.useState(1);
  const [selectedClientType, setSelectedClientType] = React.useState<string | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<AnyPlan | null>(null);
  const [customPlanDetails, setCustomPlanDetails] = React.useState<CustomPlanDetails | null>(null);
  const [customLiters, setCustomLiters] = React.useState<number>(0);
  const [addOnLiters, setAddOnLiters] = React.useState<number>(0);
  const [selectedDay, setSelectedDay] = React.useState<string>('');
  const [deliveryFrequency, setDeliveryFrequency] = React.useState<string>('');
  const [deliveryTime, setDeliveryTime] = React.useState<string>('');
  const [amountPerMonth, setAmountPerMonth] = React.useState<number>(0);
  const [dispenserQuantity, setDispenserQuantity] = React.useState<number>(0);
  const [dispenserPrice, setDispenserPrice] = React.useState<number>(0);

  
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
        fullName: 'Juan dela Cruz',
        clientId: 'SC2500000029',
        email: 'juan.delacruz@example.com',
        businessName: 'River business inc.',
        address: '123 Main St, Anytown',
        contactNumber: '09123456789'
    }
  });

  const onSubmit = (data: OnboardingFormValues) => {
    const onboardingData = {
        formData: data,
        clientType: selectedClientType,
        plan: selectedPlan,
        customPlanDetails: customPlanDetails
    };
    localStorage.setItem('onboardingData', JSON.stringify(onboardingData));
    toast({
        title: 'Onboarding Complete!',
        description: 'Your information has been saved.',
    });
    router.push('/dashboard');
  };

  const handleNextStep = async () => {
    const isValid = await form.trigger(['fullName', 'clientId', 'email', 'businessName', 'address', 'contactNumber']);
    if (isValid) {
        setCurrentStep(2);
    }
  }

  const getImageForPlan = (imageId: string) => {
    return PlaceHolderImages.find(p => p.id === imageId);
  }

  const handleClientTypeSelect = (clientTypeName: string) => {
    setCustomLiters(0);
    setAddOnLiters(0);
    setAmountPerMonth(0);
    setSelectedClientType(clientTypeName);
    setSelectedPlan(null); 
    setCustomPlanDetails(null);
    setSelectedDay('');
    setDeliveryFrequency('');
    setDeliveryTime('');
    setDispenserQuantity(0);
    setDispenserPrice(0);
    setIsPlanDialogOpen(true);
  };
  
  const handleSaveCustomization = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (customLiters > 0 && deliveryFrequency && selectedDay && deliveryTime) {
        setCustomPlanDetails({
            litersPerMonth: customLiters,
            addOnLiters: addOnLiters,
            deliveryFrequency: deliveryFrequency,
            deliveryDay: selectedDay,
            deliveryTime: deliveryTime,
            waterStation: '',
            dispenserQuantity: dispenserQuantity,
            dispenserPrice: dispenserPrice,
        });
        
        const clientTypeDetails = clientTypes.find(c => c.name === selectedClientType);
        let planName = `Custom ${selectedClientType} Plan`;
        const totalAmount = amountPerMonth + dispenserPrice;
        setSelectedPlan({name: planName, price: totalAmount, imageId: clientTypeDetails?.imageId});
        
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

  const handleLitersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : 0;
    setCustomLiters(value);
  }

  const handleAddOnLitersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : 0;
    setAddOnLiters(value);
  }
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : 0;
    setAmountPerMonth(value);
  }

  const handleDispenserQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : 0;
    setDispenserQuantity(value);
  };
  
  const handleDispenserPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : 0;
    setDispenserPrice(value);
  };

  const renderPlanDialog = () => {
    let title = `Customize Your ${selectedClientType} Plan`

    return (
        <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
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
                                    <Input id="litersPerMonth" name="litersPerMonth" type="number" placeholder="e.g., 5000" onChange={handleLitersChange} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="addOnLiters">Add-on Liters/Month</Label>
                                    <Input id="addOnLiters" name="addOnLiters" type="number" placeholder="e.g., 500" onChange={handleAddOnLitersChange} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="amountPerMonth">Amount/Month (Water)</Label>
                                <Input id="amountPerMonth" name="amountPerMonth" type="number" placeholder="e.g., 15000" onChange={handleAmountChange} />
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2"><Archive className="h-4 w-4" /> Dispenser Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="dispenserQuantity">Dispenser Quantity</Label>
                                    <Input id="dispenserQuantity" name="dispenserQuantity" type="number" placeholder="e.g., 2" onChange={handleDispenserQuantityChange} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="dispenserPrice">Dispenser Price/Month</Label>
                                    <Input id="dispenserPrice" name="dispenserPrice" type="number" placeholder="e.g., 500" onChange={handleDispenserPriceChange} />
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
                                <Input id="deliveryTime" name="deliveryTime" type="time" onChange={(e) => setDeliveryTime(e.target.value)} />
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
    );
  }

  const selectedPlanImage = selectedPlan?.imageId ? getImageForPlan(selectedPlan.imageId) : null;

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
                        name="clientId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Client ID</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g. SC2500000029" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                            <Input type="email" placeholder="e.g. juan.delacruz@example.com" {...field} />
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
                     <div className="flex justify-end pt-8">
                        <Button type="button" onClick={handleNextStep}>Next</Button>
                    </div>
                </div>
              )}


              {currentStep === 2 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentStep(1)}><ArrowLeft className="h-4 w-4" /></Button>
                        <h3 className="font-bold text-lg">Step 2: Choose Your Plan</h3>
                    </div>
                    <p className="text-muted-foreground">Select a client type to customize your water plan.</p>
                    <div className="grid grid-cols-2 gap-4">
                        {clientTypes.map((client) => {
                            const image = getImageForPlan(client.imageId);
                            return (
                                <div key={client.name}
                                    onClick={() => handleClientTypeSelect(client.name)}
                                    className={cn(
                                        "border rounded-lg p-0 cursor-pointer transition-all flex flex-col h-52 overflow-hidden relative",
                                        selectedClientType === client.name ? "border-primary ring-2 ring-primary" : "hover:border-primary/50"
                                    )}>
                                    {image && (
                                        <Image
                                            src={image.imageUrl}
                                            alt={client.name}
                                            fill
                                            className={cn("object-cover")}
                                            data-ai-hint={image.imageHint}
                                        />
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                        <p className="font-semibold text-white">{client.name}</p>
                                        <p className="text-xs text-white/80">{client.description}</p>
                                    </div>
                                </div>
                            )
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
                                 {selectedPlanImage && (
                                    <Image
                                        src={selectedPlanImage.imageUrl}
                                        alt={selectedPlan.name}
                                        width={150}
                                        height={150}
                                        className="rounded-lg object-cover"
                                        data-ai-hint={selectedPlanImage.imageHint}
                                    />
                                )}
                                <div className="flex-1">
                                    <p className="font-bold text-xl">{selectedPlan.name}</p>
                                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                        <p><strong>Liters/Month:</strong> {customPlanDetails.litersPerMonth.toLocaleString()}</p>
                                        <p><strong>Add-on Liters:</strong> {customPlanDetails.addOnLiters.toLocaleString()}</p>
                                        <p><strong>Dispensers:</strong> {customPlanDetails.dispenserQuantity}</p>
                                        <p><strong>Est. Bill/Month:</strong> ₱{selectedPlan.price.toLocaleString()}</p>
                                        <p><strong>Delivery:</strong> {customPlanDetails.deliveryFrequency} on {customPlanDetails.deliveryDay} at {customPlanDetails.deliveryTime}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-2">Your Details</h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                    <p><strong>Name:</strong> {form.getValues('fullName')}</p>
                                    <p><strong>Client ID:</strong> {form.getValues('clientId')}</p>
                                    <p><strong>Email:</strong> {form.getValues('email')}</p>
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
      {selectedClientType && renderPlanDialog()}
    </div>
  );
}
