
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocumentReference, updateDoc, increment, collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AppUser } from '@/lib/types';
import { useFirestore } from '@/firebase';

const topUpSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be positive."),
});
type TopUpFormValues = z.infer<typeof topUpSchema>;

interface TopUpDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    userDocRef: DocumentReference | null;
    user: AppUser;
}

export function TopUpDialog({ isOpen, onOpenChange, userDocRef, user }: TopUpDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const topUpForm = useForm<TopUpFormValues>({ resolver: zodResolver(topUpSchema) });

    const handleTopUpSubmit = async (values: TopUpFormValues) => {
        if (!userDocRef || !firestore) return;
        const batch = writeBatch(firestore);

        const transactionRef = doc(collection(userDocRef, 'transactions'));
        batch.set(transactionRef, {
            id: transactionRef.id,
            type: 'Credit',
            amountCredits: values.amount,
            description: 'Admin Top-Up',
            date: serverTimestamp(),
        });

        batch.update(userDocRef, { topUpBalanceCredits: increment(values.amount) });

        await batch.commit();

        toast({ title: `₱${values.amount} credited to ${user.businessName}.` });
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Top-up Credits</DialogTitle></DialogHeader>
                <form onSubmit={topUpForm.handleSubmit(handleTopUpSubmit)} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="topupAmount">Amount (PHP)</Label>
                        <Input id="topupAmount" type="number" {...topUpForm.register('amount')} />
                        {topUpForm.formState.errors.amount && <p className="text-sm text-destructive">{topUpForm.formState.errors.amount.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Add Credits</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
