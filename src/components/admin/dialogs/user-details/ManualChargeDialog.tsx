'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocumentReference, updateDoc, arrayUnion, doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ManualCharge } from '@/lib/types';
import { useFirestore } from '@/firebase';

const manualChargeSchema = z.object({
    description: z.string().min(1, "Description is required."),
    amount: z.coerce.number().min(0, "Amount cannot be negative."),
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
    const manualChargeForm = useForm<ManualChargeFormValues>({ resolver: zodResolver(manualChargeSchema) });

    const handleManualChargeSubmit = async (values: ManualChargeFormValues) => {
        if (!userDocRef || !firestore) return;
        const newCharge: Omit<ManualCharge, 'id'> = {
            ...values,
            dateAdded: new Date(),
        };
        await updateDoc(userDocRef, { pendingCharges: arrayUnion({ ...newCharge, id: doc(collection(firestore, '_')).id }) });
        toast({ title: "Charge Added", description: "This will be included in the next invoice." });
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Add Manual Charge</DialogTitle></DialogHeader>
                <form onSubmit={manualChargeForm.handleSubmit(handleManualChargeSubmit)} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="chargeDesc">Description</Label>
                        <Input id="chargeDesc" {...manualChargeForm.register('description')} />
                        {manualChargeForm.formState.errors.description && <p className="text-sm text-destructive">{manualChargeForm.formState.errors.description.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="chargeAmount">Amount (PHP)</Label>
                        <Input id="chargeAmount" type="number" {...manualChargeForm.register('amount')} />
                        {manualChargeForm.formState.errors.amount && <p className="text-sm text-destructive">{manualChargeForm.formState.errors.amount.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Add Charge</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
