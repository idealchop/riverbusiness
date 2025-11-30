
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
import { Users, Briefcase, Building, Layers, Factory } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


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
    deliveryDays: string[];
    waterStation: string;
}

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedClientType, setSelectedClientType] = React.useState<string | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<AnyPlan | null>(null);
  const [customPlanDetails, setCustomPlanDetails] = React.useState<CustomPlanDetails | null>(null);
  const [customLiters, setCustomLiters] = React.useState<number>(0);
  const [selectedDays, setSelectedDays] = React.useState<string[]>([]);

  
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

  const getImageForPlan = (imageId: string) => {
    return PlaceHolderImages.find(p => p.id === imageId);
  }

  const handleClientTypeSelect = (clientTypeName: string) => {
    setCustomLiters(0);
    setSelectedClientType(clientTypeName);
    setSelectedPlan(null); 
    setCustomPlanDetails(null);
    setSelectedDays([]);
    setIsPlanDialogOpen(true);
  };
  
  const handleSaveCustomization = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const liters = form.querySelector<HTMLInputElement>('input[name="litersPerMonth"]')?.value;
    const station = form.querySelector<HTMLSelectElement>('select[name="waterStation"]')?.value;
    
    if (liters && selectedDays.length > 0 && station) {
        setCustomPlanDetails({
            litersPerMonth: parseInt(liters),
            deliveryDays: selectedDays,
            waterStation: station
        });
        
        let planName = `Custom ${selectedClientType} Plan`;
        setSelectedPlan({name: planName, price: 0});
        
        setIsPlanDialogOpen(false);
    } else {
        toast({
            variant: "destructive",
            title: "Incomplete Information",
            description: "Please fill out all fields for your custom plan, including at least one delivery day.",
        })
    }
  };

  const handleLitersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomLiters(value ? parseInt(value) : 0);
  }

  const calculatePeopleAccommodated = (liters: number) => {
      // Assuming 2 liters per person per day for a 30-day month (60 liters/person/month)
      if (liters <= 0) return 0;
      return Math.floor(liters / 60);
  }

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };
  
  const renderPlanDialog = () => {
    let title = `Customize Your ${selectedClientType} Plan`
    const peopleAccommodated = calculatePeopleAccommodated(customLiters);
    const reorderedDaysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];


    return (
        <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Please provide the details for your water plan.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveCustomization}>
                    <div className="py-4 space-y-4">
                         <div className="grid gap-2">
                            <Label htmlFor="litersPerMonth">Liters/Month</Label>
                            <Input id="litersPerMonth" name="litersPerMonth" type="number" placeholder="e.g., 5000" onChange={handleLitersChange} />
                            {peopleAccommodated > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Can accommodate approximately <span className="font-bold text-primary">{peopleAccommodated}</span> person(s).
                                </p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label>Delivery Days</Label>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {reorderedDaysOfWeek.map(day => (
                                    <Button
                                        key={day}
                                        type="button"
                                        variant={selectedDays.includes(day) ? 'default' : 'outline'}
                                        onClick={() => toggleDay(day)}
                                        className={cn(day === 'Sun' ? 'flex-grow basis-full max-w-xs mx-auto' : 'flex-1')}
                                    >
                                        {day}
                                    </Button>
                                ))}
                            </div>
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
                         <Button type="button" variant="outline" onClick={() => setIsPlanDialogOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Customization</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
  }

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
                 <FormItem>
                    <FormLabel>Client ID</FormLabel>
                    <FormControl>
                        <Input readOnly value="SC2500000029" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
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
              
                {selectedPlan && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Selected Plan</h3>
                        <div className="mt-4 border rounded-lg p-4 flex justify-between items-start">
                            <div>
                                <p className="font-bold text-lg">{selectedPlan.name}</p>
                                {customPlanDetails ? (
                                     <div className="text-sm text-muted-foreground">
                                        <p>{customPlanDetails.litersPerMonth.toLocaleString()} Liters/Month</p>
                                        <p>{customPlanDetails.deliveryDays.length} Deliveries/Week ({customPlanDetails.deliveryDays.join(', ')})</p>
                                        <p>Station: {customPlanDetails.waterStation}</p>
                                    </div>
                                ) : 'details' in selectedPlan && selectedPlan.details && Array.isArray(selectedPlan.details) && (selectedPlan as any).details?.map((d: any) => (
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
      {selectedClientType && renderPlanDialog()}
    </div>
  );
}

    