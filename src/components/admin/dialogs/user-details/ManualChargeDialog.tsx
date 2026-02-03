'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentReference, updateDoc, arrayUnion, doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ManualCharge } from '@/lib/types';
import { useFirestore } from '@/firebase';

const manualChargeSchema = z.object({
    description: z.string().min(1, "Description is required."),
    amount: z.coerce.number().min(0.01, "Amount must be greater than zero."),
    type: z.enum(['Addition', 'Deduction']),
});
type ManualChargeFormValues = z.infer<typeof manualChargeSchema>;

interface ManualChargeDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    userDocRef: DocumentReference | null;
}

export function ManualChargeDialog({ isOpen, onOpenChange, userDocRef }: ManualChargeDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const manualChargeForm = useForm<ManualChargeFormValues>({ 
        resolver: zodResolver(manualChargeSchema),
        defaultValues: {
            type: 'Addition'
        }
    });

    const handleManualChargeSubmit = async (values: ManualChargeFormValues) => {
        if (!userDocRef || !firestore) return;
        
        // Deduction makes the value negative
        const finalAmount = values.type === 'Deduction' ? -Math.abs(values.amount) : Math.abs(values.amount);

        const newCharge: Omit<ManualCharge, 'id'> = {
            description: values.description,
            amount: finalAmount,
            dateAdded: new Date(),
        };

        try {
            await updateDoc(userDocRef, { 
                pendingCharges: arrayUnion({ ...newCharge, id: doc(collection(firestore, '_')).id }) 
            });
            toast({ 
                title: values.type === 'Addition' ? "Charge Added" : "Deduction Applied", 
                description: `This adjustment of P${Math.abs(finalAmount).toFixed(2)} will be reflected in the next invoice.` 
            });
            manualChargeForm.reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Error adding manual charge:", error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to apply adjustment." });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) manualChargeForm.reset();
            onOpenChange(open);
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Manual Adjustment</DialogTitle>
                </DialogHeader>
                <form onSubmit={manualChargeForm.handleSubmit(handleManualChargeSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="chargeType">Adjustment Type</Label>
                        <Select 
                            onValueChange={(value) => manualChargeForm.setValue('type', value as 'Addition' | 'Deduction')} 
                            defaultValue={manualChargeForm.getValues('type')}
                        >
                            <SelectTrigger id="chargeType">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Addition">Addition (Charge)</SelectItem>
                                <SelectItem value="Deduction">Deduction (Discount)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="chargeDesc">Description</Label>
                        <Input id="chargeDesc" placeholder="e.g. Loyalty Discount, Special Equipment Fee" {...manualChargeForm.register('description')} />
                        {manualChargeForm.formState.errors.description && <p className="text-sm text-destructive">{manualChargeForm.formState.errors.description.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="chargeAmount">Amount (PHP)</Label>
                        <Input id="chargeAmount" type="number" step="0.01" {...manualChargeForm.register('amount')} />
                        {manualChargeForm.formState.errors.amount && <p className="text-sm text-destructive">{manualChargeForm.formState.errors.amount.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Apply Adjustment</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
