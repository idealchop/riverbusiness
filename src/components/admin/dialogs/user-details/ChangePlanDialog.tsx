'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { enterprisePlans, familyPlans, smePlans, commercialPlans, corporatePlans, clientTypes } from '@/lib/plans';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

const planChangeSchema = z.object({
  clientType: z.string().min(1),
  plan: z.any().refine(data => data !== null, { message: "Please select a plan." }),
  isPrepaid: z.boolean().default(false),
  planPrice: z.coerce.number().min(0, "Price cannot be negative."),
  customPlanDetails: z.object({
    litersPerMonth: z.coerce.number().optional(),
    bonusLiters: z.coerce.number().optional(),
    pricePerLiter: z.coerce.number().optional(),
  }).optional(),
});

type PlanChangeFormValues = z.infer<typeof planChangeSchema>;

interface ChangePlanDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    user: AppUser;
}

export function ChangePlanDialog({ isOpen, onOpenChange, user }: ChangePlanDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<PlanChangeFormValues>({
        resolver: zodResolver(planChangeSchema),
    });

    useEffect(() => {
        if (user && isOpen) {
            form.reset({
                clientType: user.clientType || '',
                plan: user.plan,
                isPrepaid: user.isPrepaid || false,
                planPrice: user.plan?.price || 0,
                customPlanDetails: user.customPlanDetails || {},
            });
        }
    }, [user, isOpen, form]);

    const getPlansForType = (type: string) => {
        const plans = {
            'Family': familyPlans, 'SME': smePlans, 'Commercial': commercialPlans, 'Corporate': corporatePlans, 'Enterprise': enterprisePlans,
        }[type] || [];
        const customPlanExists = !plans.some(p => p.isConsumptionBased === false && p.name.includes('Custom'));
        const customConsumptionPlanExists = !plans.some(p => p.isConsumptionBased === true && p.name.includes('Flow'));
        
        let allPlans = [...plans];
        if (customPlanExists) {
            allPlans.push({ name: `Custom ${type} Plan`, price: 0, isConsumptionBased: false, details: 'Custom fixed pricing' });
        }
        if (customConsumptionPlanExists) {
             allPlans.push({ name: `${type} Flow Plan`, price: 0, isConsumptionBased: true, details: 'Custom consumption pricing' });
        }
        return allPlans;
    };
    
    const selectedClientType = form.watch('clientType');
    const selectedPlan = form.watch('plan');

    const planOptions = useMemo(() => {
        if (!selectedClientType) return [];
        return getPlansForType(selectedClientType);
    }, [selectedClientType]);

    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'clientType') {
                const plans = getPlansForType(value.clientType!);
                const newPlan = (plans.length > 0 ? plans[0] : null);
                form.setValue('plan', newPlan);
                if (newPlan) form.setValue('planPrice', newPlan.price || 0);
            } else if (name === 'plan' && value.plan && form.getValues('planPrice') !== value.plan.price) {
                form.setValue('planPrice', value.plan.price || 0);
            }
        });
        return () => subscription.unsubscribe();
    }, [form]);

    const handlePlanUpdate = async (values: PlanChangeFormValues) => {
        if (!firestore || !user) return;
        setIsSubmitting(true);
        
        const userDocRef = doc(firestore, 'users', user.id);

        try {
            const updatePayload: Partial<AppUser> = {
                clientType: values.clientType,
                isPrepaid: values.isPrepaid,
                plan: {
                    name: values.plan.name,
                    price: values.planPrice,
                    isConsumptionBased: values.plan.isConsumptionBased || false,
                },
                customPlanDetails: {
                    ...user.customPlanDetails, // preserve existing details like delivery schedule
                    litersPerMonth: values.customPlanDetails?.litersPerMonth || 0,
                    bonusLiters: values.customPlanDetails?.bonusLiters || 0,
                    pricePerLiter: values.customPlanDetails?.pricePerLiter || 0,
                },
                // Reset pending plan changes if any
                pendingPlan: deleteField(),
                planChangeEffectiveDate: deleteField(),
            };
            
            await updateDoc(userDocRef, updatePayload);

            toast({ title: "Plan Updated", description: `${user.businessName}'s plan has been changed.` });
            onOpenChange(false);
        } catch (error) {
            console.error("Error updating plan: ", error);
            toast({ variant: "destructive", title: "Update Failed" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Change Client Plan</DialogTitle>
                    <DialogDescription>Instantly change the plan for {user.businessName}.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handlePlanUpdate)} className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                        <FormField control={form.control} name="clientType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Plan Type</FormLabel>
                                <FormControl><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">{clientTypes.map(type => { const image = PlaceHolderImages.find(p => p.id === type.imageId); return (<Card key={type.name} onClick={() => field.onChange(type.name)} className={cn("cursor-pointer flex flex-col", field.value === type.name && "border-2 border-primary")}>{image && <div className="relative h-20 w-full"><Image src={image.imageUrl} alt={type.name} fill style={{objectFit:"cover"}} className="rounded-t-lg" data-ai-hint={image.imageHint} /></div>}<CardHeader className="p-3 flex-1"><CardTitle className="text-sm">{type.name}</CardTitle><CardDescription className="text-xs">{type.description}</CardDescription></CardHeader></Card>)})}</div></FormControl>
                                <FormMessage />
                            </FormItem>)}/>

                        {selectedClientType && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="plan" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select Plan</FormLabel>
                                        <Select onValueChange={(value) => { const selected = planOptions.find(p => p.name === value); field.onChange(selected); if (selected) form.setValue('planPrice', selected.price || 0); }} value={field.value?.name}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a plan..." >{selectedPlan?.name || "Select a plan..."}</SelectValue></SelectTrigger></FormControl>
                                            <SelectContent>{planOptions.map(plan => (<SelectItem key={plan.name} value={plan.name}>{plan.name}</SelectItem>))}</SelectContent>
                                        </Select><FormMessage />
                                    </FormItem>)}/>
                                {selectedPlan && ( <FormField control={form.control} name="planPrice" render={({ field }) => (<FormItem><FormLabel>{selectedPlan.isConsumptionBased ? "Price per Liter (PHP)" : "Monthly Price (PHP)"}</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>)}
                            </div>
                        )}
                        
                        <FormField control={form.control} name="isPrepaid" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel>Prepaid Account</FormLabel>
                                    <FormDescription>User will top-up credits instead of receiving monthly invoices.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}/>

                        {selectedPlan && !selectedPlan.isConsumptionBased && (
                            <div className="space-y-4 p-4 border rounded-lg">
                                <h4 className="font-medium">Monthly Allocation</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="customPlanDetails.litersPerMonth" render={({ field }) => (<FormItem><FormLabel>Liters/Month</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage/></FormItem>)}/>
                                    <FormField control={form.control} name="customPlanDetails.bonusLiters" render={({ field }) => (<FormItem><FormLabel>Bonus Liters</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage/></FormItem>)}/>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                           <DialogClose asChild><Button type="button" variant="ghost" disabled={isSubmitting}>Cancel</Button></DialogClose>
                           <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save New Plan"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
