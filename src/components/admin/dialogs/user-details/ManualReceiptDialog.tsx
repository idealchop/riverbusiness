'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Payment, AppUser } from '@/lib/types';
import { Receipt } from 'lucide-react';

const receiptSchema = z.object({
    amount: z.coerce.number().min(0.01, "Amount must be greater than zero."),
});

type ReceiptFormValues = z.infer<typeof receiptSchema>;

interface ManualReceiptDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    user: AppUser;
    payment: Payment | null;
}

export function ManualReceiptDialog({ isOpen, onOpenChange, user, payment }: ManualReceiptDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ReceiptFormValues>({
        resolver: zodResolver(receiptSchema),
        defaultValues: {
            amount: payment?.amount || 0
        }
    });

    useEffect(() => {
        if (isOpen && payment) {
            form.reset({ amount: payment.amount });
        }
    }, [isOpen, payment, form]);

    const handleSendReceipt = async (values: ReceiptFormValues) => {
        if (!firestore || !payment) return;

        setIsSubmitting(true);
        try {
            const requestsCol = collection(firestore, 'users', user.id, 'receiptRequests');
            await addDoc(requestsCol, {
                invoiceId: payment.id,
                amount: values.amount,
                requestedAt: serverTimestamp(),
                status: 'pending'
            });

            toast({
                title: "Receipt Dispatch Initiated",
                description: `A digital receipt for P${values.amount.toFixed(2)} is being generated and sent to ${user.businessName}.`
            });
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to trigger manual receipt:", error);
            toast({ variant: 'destructive', title: "Action Failed", description: "Could not send the receipt request." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!payment) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Send Digital Receipt
                    </DialogTitle>
                    <DialogDescription>
                        Confirm the amount to be reflected on the official receipt for {user.businessName}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleSendReceipt)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Invoice ID</Label>
                        <Input value={payment.id} disabled className="bg-muted font-mono" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="receiptAmount">Payment Amount (PHP)</Label>
                        <Input 
                            id="receiptAmount" 
                            type="number" 
                            step="0.01" 
                            {...form.register('amount')} 
                            disabled={isSubmitting}
                        />
                        {form.formState.errors.amount && (
                            <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                            Note: The original invoice amount was ₱{payment.amount.toLocaleString()}.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Processing..." : "Generate and Send PDF"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}