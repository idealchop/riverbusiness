
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { enterprisePlans, familyPlans, smePlans, commercialPlans, corporatePlans, clientTypes } from '@/lib/plans';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import type { AppUser } from '@/lib/types';

const planDetailsSchema = z.object({
    litersPerMonth: z.coerce.number().optional(),
    bonusLiters: z.coerce.number().optional(),
    pricePerLiter: z.coerce.number().optional(),
    gallonQuantity: z.coerce.number().min(0, "Cannot be negative"),
    gallonPrice: z.coerce.number().min(0, "Cannot be negative"),
    gallonPaymentType: z.enum(['Monthly', 'One-Time']),
    dispenserQuantity: z.coerce.number().min(0, "Cannot be negative"),
    dispenserPrice: z.coerce.number().min(0, "Cannot be negative"),
    dispenserPaymentType: z.enum(['Monthly', 'One-Time']),
    sanitationPrice: z.coerce.number().optional(),
    sanitationPaymentType: z.enum(['Monthly', 'One-Time']).optional(),
    deliveryFrequency: z.string().optional(),
    deliveryDay: z.string().optional(),
    deliveryTime: z.string().optional(),
    autoRefillEnabled: z.boolean(),
  });
  
const newUserSchema = z.object({
    clientId: z.string().min(1, { message: 'Client ID is required' }),
    name: z.string().min(1, { message: 'Full Name is required' }),
    businessEmail: z.string().email({ message: 'Invalid business email' }).optional().or(z.literal('')),
    businessName: z.string().min(1, { message: 'Business Name is required' }),
    address: z.string().min(1, { message: 'Address is required' }),
    contactNumber: z.string().min(1, { message: 'Contact Number is required' }),
    clientType: z.string().min(1, { message: 'Plan type is required' }),
    plan: z.any().refine(data => data !== null, { message: "Please select a plan." }),
    planPrice: z.coerce.number().min(0, "Price cannot be negative."),
    initialTopUp: z.coerce.number().optional(), 
    accountType: z.enum(['Single', 'Parent', 'Branch']).default('Single'),
    parentId: z.string().optional(),
    customPlanDetails: planDetailsSchema.optional(),
  });
  
type NewUserFormValues = z.infer<typeof newUserSchema>;
  
interface CreateUserDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    parentUsers: AppUser[];
}

export function CreateUserDialog({ isOpen, onOpenChange, parentUsers }: CreateUserDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formStep, setFormStep] = useState(0);

    const newUserForm = useForm<NewUserFormValues>({
        resolver: zodResolver(newUserSchema),
        defaultValues: {
            clientId: '', name: '', businessEmail: '', businessName: '', address: '',
            contactNumber: '', clientType: '', plan: null, planPrice: 0, initialTopUp: 0,
            accountType: 'Single',
            customPlanDetails: {
                litersPerMonth: 0, bonusLiters: 0, pricePerLiter: 0, gallonQuantity: 0, gallonPrice: 0,
                gallonPaymentType: 'Monthly', dispenserQuantity: 0, dispenserPrice: 0, dispenserPaymentType: 'Monthly',
                sanitationPrice: 0, sanitationPaymentType: 'Monthly', deliveryFrequency: 'Weekly',
                deliveryDay: 'Monday', deliveryTime: '09:00', autoRefillEnabled: true,
            }
        }
    });

    const getPlansForType = (type: string) => {
        if (type === 'Enterprise') return enterprisePlans;
        const plans = {
            'Family': familyPlans, 'SME': smePlans, 'Commercial': commercialPlans, 'Corporate': corporatePlans,
        }[type] || [];
        return [
            ...plans.filter(p => !p.isConsumptionBased),
            { name: `Custom ${type} Plan`, price: 0, isConsumptionBased: false, details: 'Custom fixed pricing' },
            ...plans.filter(p => p.isConsumptionBased)
        ];
    };
    
    const selectedClientType = newUserForm.watch('clientType');
    const selectedAccountType = newUserForm.watch('accountType');
    const selectedPlan = newUserForm.watch('plan');
    const watchedPlanPrice = newUserForm.watch('planPrice');

    const planOptions = useMemo(() => {
        if (selectedAccountType === 'Parent') return [enterprisePlans.find(p => p.isParentPlan)].filter(Boolean);
        if (!selectedClientType) return [];
        return getPlansForType(selectedClientType);
    }, [selectedClientType, selectedAccountType]);

    const handleCreateNewUser = async (values: NewUserFormValues) => {
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            const batch = writeBatch(firestore);
            const unclaimedProfileRef = doc(firestore, 'unclaimedProfiles', values.clientId);
            const unclaimedProfileSnap = await getDoc(unclaimedProfileRef);

            if (unclaimedProfileSnap.exists()) {
                toast({ variant: "destructive", title: "Client ID already exists."});
                setIsSubmitting(false);
                return;
            }
            
            const { plan, planPrice, initialTopUp, parentId, ...rest } = values;

            const profileData: any = {
                ...rest, 
                plan: {
                    name: plan.name,
                    price: planPrice,
                    isConsumptionBased: plan.isConsumptionBased || false,
                },
                customPlanDetails: { ...values.customPlanDetails },
                role: 'User',
                accountStatus: 'Active',
                totalConsumptionLiters: (selectedAccountType !== 'Parent' && !plan.isConsumptionBased) ? (values.customPlanDetails?.litersPerMonth || 0) : 0,
                topUpBalanceCredits: selectedAccountType === 'Parent' ? (initialTopUp || 0) : 0,
                adminCreatedAt: serverTimestamp(),
            };

            if (plan.isConsumptionBased) {
                delete profileData.customPlanDetails.litersPerMonth;
                delete profileData.customPlanDetails.bonusLiters;
            } else {
                 delete profileData.customPlanDetails.pricePerLiter;
            }

            if (parentId) profileData.parentId = parentId;
            
            batch.set(unclaimedProfileRef, profileData);
            
            if (values.accountType === 'Parent' && initialTopUp && initialTopUp > 0) {
                const topUpRequestRef = doc(collection(unclaimedProfileRef, 'topUpRequests'));
                batch.set(topUpRequestRef, {
                    amount: initialTopUp,
                    status: 'Approved (Initial Balance)',
                    requestedAt: serverTimestamp(),
                });
            }
            
            await batch.commit();
            toast({ title: 'Client Profile Created', description: `${values.businessName}'s profile is ready to be claimed.` });
            onOpenChange(false);
            newUserForm.reset();
            setFormStep(0);
        } catch (error) {
            console.error("Error creating unclaimed profile: ", error);
            toast({ variant: "destructive", title: "Creation Failed" });
        } finally {
            setIsSubmitting(false);
        }
    }

    useEffect(() => {
        const subscription = newUserForm.watch((value, { name, type }) => {
            if (name === 'clientType') {
                const plans = getPlansForType(value.clientType!);
                const newPlan = (plans.length > 0 ? plans[0] : null);
                newUserForm.setValue('plan', newPlan);
                if (newPlan) newUserForm.setValue('planPrice', newPlan.price || 0);
            } else if (name === 'plan' && value.plan && newUserForm.getValues('planPrice') !== value.plan.price) {
                newUserForm.setValue('planPrice', value.plan.price || 0);
            } else if (name === 'accountType') {
                if(value.accountType === 'Parent') {
                    const parentPlan = enterprisePlans.find(p => p.isParentPlan);
                    if (parentPlan) {
                        newUserForm.setValue('clientType', 'Enterprise');
                        newUserForm.setValue('plan', parentPlan);
                        newUserForm.setValue('planPrice', parentPlan.price);
                    }
                } else {
                    newUserForm.setValue('clientType', '');
                    newUserForm.setValue('plan', null);
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [newUserForm]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { newUserForm.reset(); setFormStep(0); } onOpenChange(open); }}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                    <DialogDescription>Set up a new client profile.</DialogDescription>
                </DialogHeader>
                <Form {...newUserForm}>
                    <form onSubmit={newUserForm.handleSubmit(handleCreateNewUser)}>
                        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                           {formStep === 0 && (
                                <div className="space-y-6">
                                    <h3 className="font-semibold text-lg">Step 1: Business & Account Type</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                      <FormField control={newUserForm.control} name="clientId" render={({ field }) => (<FormItem><FormLabel>Client ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                      <FormField control={newUserForm.control} name="businessName" render={({ field }) => (<FormItem><FormLabel>Business Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                      <FormField control={newUserForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                      <FormField control={newUserForm.control} name="contactNumber" render={({ field }) => (<FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                      <FormField control={newUserForm.control} name="address" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Business Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                      <FormField control={newUserForm.control} name="businessEmail" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Business Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                      <Separator className="md:col-span-2"/>
                                      <FormField control={newUserForm.control} name="accountType" render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Account Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Single">Single Account</SelectItem>
                                                    <SelectItem value="Parent">Parent Account</SelectItem>
                                                    <SelectItem value="Branch">Branch Account</SelectItem>
                                                </SelectContent>
                                            </Select><FormMessage />
                                        </FormItem>)}/>
                                      {selectedAccountType === 'Branch' && (
                                         <FormField control={newUserForm.control} name="parentId" render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>Link to Parent Account</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a Parent Account..."/></SelectTrigger></FormControl>
                                                    <SelectContent>{parentUsers.map(p => (<SelectItem key={p.id} value={p.id}>{p.businessName} ({p.clientId})</SelectItem>))}</SelectContent>
                                                </Select><FormMessage />
                                            </FormItem>)}/>)}
                                      {selectedAccountType === 'Parent' && (
                                         <FormField control={newUserForm.control} name="initialTopUp" render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>Initial Top-Up Credits (PHP)</FormLabel>
                                                <FormControl><Input type="number" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                                                <FormMessage />
                                            </FormItem>)}/>)}
                                    </div>
                                </div>
                            )}
                           {formStep === 1 && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-semibold text-lg">Step 2: Plan & Configuration</h3>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAccountType === 'Parent' ? 'Configure the consumption rate for the parent account.' : 'Select and configure a plan.'}
                                        </p>
                                    </div>
                                    {selectedAccountType === 'Parent' ? (
                                        <Card>
                                            <CardHeader><CardTitle>Parent Account Plan</CardTitle><CardDescription>Set the rate for branch consumption deductions.</CardDescription></CardHeader>
                                            <CardContent><FormField control={newUserForm.control} name="planPrice" render={({ field }) => (<FormItem><FormLabel>Consumption Rate (PHP per Liter)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} /></CardContent>
                                        </Card>
                                    ) : (
                                        <>
                                            <FormField control={newUserForm.control} name="clientType" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Plan Type</FormLabel>
                                                    <FormControl><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">{clientTypes.map(type => { const image = PlaceHolderImages.find(p => p.id === type.imageId); return (<Card key={type.name} onClick={() => { field.onChange(type.name); }} className={cn("cursor-pointer flex flex-col", field.value === type.name && "border-2 border-primary")}>{image && <div className="relative h-20 w-full"><Image src={image.imageUrl} alt={type.name} fill style={{objectFit:"cover"}} className="rounded-t-lg" data-ai-hint={image.imageHint} /></div>}<CardHeader className="p-3 flex-1"><CardTitle className="text-sm">{type.name}</CardTitle><CardDescription className="text-xs">{type.description}</CardDescription></CardHeader></Card>)})}</div></FormControl>
                                                    <FormMessage />
                                                </FormItem>)}/>
                                            {selectedClientType && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={newUserForm.control} name="plan" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Select Plan</FormLabel>
                                                        <Select onValueChange={(value) => { const selected = planOptions.find(p => p.name === value); field.onChange(selected); if (selected) newUserForm.setValue('planPrice', selected.price || 0); }} value={field.value?.name}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a plan..."><span>{selectedPlan?.name}</span></SelectValue></SelectTrigger></FormControl>
                                                            <SelectContent>{planOptions.map(plan => (<SelectItem key={plan.name} value={plan.name}>{plan.name}</SelectItem>))}</SelectContent>
                                                        </Select><FormMessage />
                                                    </FormItem>)}/>
                                                {selectedPlan && ( <FormField control={newUserForm.control} name="planPrice" render={({ field }) => (<FormItem><FormLabel>{selectedPlan.isConsumptionBased ? "Price per Liter (PHP)" : "Monthly Price (PHP)"}</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>)}
                                            </div>)}
                                            {selectedPlan && !selectedPlan.isConsumptionBased && (
                                                <div className="space-y-4 p-4 border rounded-lg">
                                                    <h4 className="font-medium">Monthly Allocation</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <FormField control={newUserForm.control} name="customPlanDetails.litersPerMonth" render={({ field }) => (<FormItem><FormLabel>Liters/Month</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage/></FormItem>)}/>
                                                        <FormField control={newUserForm.control} name="customPlanDetails.bonusLiters" render={({ field }) => (<FormItem><FormLabel>Bonus Liters</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage/></FormItem>)}/>
                                                        <FormField control={newUserForm.control} name="customPlanDetails.pricePerLiter" render={({ field }) => (<FormItem><FormLabel>Excess Price/Liter</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage/></FormItem>)}/>
                                                    </div>
                                                </div>)}
                                            {selectedPlan && (
                                                <div className="space-y-6 pt-4">
                                                    {selectedAccountType !== 'Branch' && (<div className="space-y-4 p-4 border rounded-lg"><h4 className="font-medium">Delivery Schedule</h4><div className="grid grid-cols-2 gap-4"><FormField control={newUserForm.control} name="customPlanDetails.deliveryFrequency" render={({ field }) => (<FormItem><FormLabel>Frequency</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/><FormField control={newUserForm.control} name="customPlanDetails.deliveryDay" render={({ field }) => (<FormItem><FormLabel>Day</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/></div><FormField control={newUserForm.control} name="customPlanDetails.deliveryTime" render={({ field }) => (<FormItem><FormLabel>Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem>)}/></div>)}
                                                    <div className="space-y-4 p-4 border rounded-lg">
                                                        <h4 className="font-medium">Equipment & Services</h4>
                                                        <div className="grid grid-cols-3 gap-4"><FormField control={newUserForm.control} name="customPlanDetails.gallonQuantity" render={({ field }) => (<FormItem><FormLabel>Containers</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage/></FormItem>)}/><FormField control={newUserForm.control} name="customPlanDetails.gallonPrice" render={({ field }) => (<FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage/></FormItem>)}/><FormField control={newUserForm.control} name="customPlanDetails.gallonPaymentType" render={({ field }) => (<FormItem><FormLabel>Payment</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="One-Time">One-Time</SelectItem></SelectContent></Select><FormMessage/></FormItem>)}/></div>
                                                        <div className="grid grid-cols-3 gap-4"><FormField control={newUserForm.control} name="customPlanDetails.dispenserQuantity" render={({ field }) => (<FormItem><FormLabel>Dispensers</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage/></FormItem>)}/><FormField control={newUserForm.control} name="customPlanDetails.dispenserPrice" render={({ field }) => (<FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage/></FormItem>)}/><FormField control={newUserForm.control} name="customPlanDetails.dispenserPaymentType" render={({ field }) => (<FormItem><FormLabel>Payment</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="One-Time">One-Time</SelectItem></SelectContent></Select><FormMessage/></FormItem>)}/></div>
                                                        <div className="grid grid-cols-3 gap-4"><div className="flex items-center pt-5"><p className="text-sm font-medium">Monthly Sanitation</p></div><FormField control={newUserForm.control} name="customPlanDetails.sanitationPrice" render={({ field }) => (<FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)}/><FormField control={newUserForm.control} name="customPlanDetails.sanitationPaymentType" render={({ field }) => (<FormItem><FormLabel>Payment</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="One-Time">One-Time</SelectItem></SelectContent></Select><FormMessage/></FormItem>)}/></div>
                                                    </div>
                                                </div>)}
                                        </>)}
                                </div>)}
                        </div>
                        <DialogFooter>
                           <DialogClose asChild><Button type="button" variant="ghost">Close</Button></DialogClose>
                            {formStep > 0 && <Button type="button" variant="outline" onClick={() => setFormStep(p => p - 1)}>Back</Button>}
                            {formStep === 0 ? <Button type="button" onClick={async () => { const isValid = await newUserForm.trigger(['clientId', 'name', 'businessName', 'address', 'contactNumber', 'businessEmail', 'accountType']); if (isValid) setFormStep(1); }}>Next</Button> : <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating Profile..." : "Create Unclaimed Profile"}</Button>}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

