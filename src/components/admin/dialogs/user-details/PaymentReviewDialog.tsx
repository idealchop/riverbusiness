
'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Payment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, deleteField, DocumentReference } from 'firebase/firestore';
import { CheckCircle, X } from 'lucide-react';
import Image from 'next/image';

interface PaymentReviewDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    paymentToReview: Payment | null;
    userDocRef: DocumentReference | null;
}

export function PaymentReviewDialog({ isOpen, onOpenChange, paymentToReview, userDocRef }: PaymentReviewDialogProps) {
    const { toast } = useToast();
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionInput, setShowRejectionInput] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when dialog closes
            setRejectionReason('');
            setShowRejectionInput(false);
        }
    }, [isOpen]);

    const handleUpdatePaymentStatus = async (newStatus: 'Paid' | 'Upcoming') => {
        if (!userDocRef || !paymentToReview) return;

        if (newStatus === 'Upcoming' && !rejectionReason.trim()) {
            toast({
                variant: 'destructive',
                title: 'Reason Required',
                description: 'Please provide a reason for rejecting the payment.',
            });
            return;
        }

        const paymentRef = doc(userDocRef, 'payments', paymentToReview.id);

        try {
            await updateDoc(paymentRef, {
                status: newStatus,
                rejectionReason: newStatus === 'Upcoming' ? rejectionReason : deleteField(),
            });

            toast({
                title: `Payment ${newStatus === 'Paid' ? 'Approved' : 'Rejected'}`,
                description: `The invoice status has been updated.`,
            });

            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update payment status:", error);
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{paymentToReview?.status === 'Pending Review' ? 'Review Payment' : 'Payment Details'}</DialogTitle>
                    <DialogDescription>
                        Invoice ID: {paymentToReview?.id}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="relative w-full aspect-[9/16] max-h-[50vh] rounded-lg border overflow-hidden bg-muted">
                        {paymentToReview?.proofOfPaymentUrl ? (
                            <Image src={paymentToReview.proofOfPaymentUrl} alt="Proof of Payment" layout="fill" className="object-contain" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">No proof of payment available.</div>
                        )}
                    </div>

                    {showRejectionInput && (
                        <div className="space-y-2 pt-4">
                            <Label htmlFor="rejectionReason">Reason for Rejection</Label>
                            <Textarea
                                id="rejectionReason"
                                placeholder="e.g., Unclear image, amount does not match..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                     {showRejectionInput ? (
                        <>
                            <Button variant="ghost" onClick={() => setShowRejectionInput(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => handleUpdatePaymentStatus('Upcoming')}>Confirm Rejection</Button>
                        </>
                    ) : paymentToReview?.status === 'Pending Review' ? (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                            <div className='flex-grow' />
                            <Button variant="destructive" onClick={() => setShowRejectionInput(true)}>
                                <X className="mr-2 h-4 w-4" /> Reject
                            </Button>
                            <Button onClick={() => handleUpdatePaymentStatus('Paid')}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve
                            </Button>
                        </>
                    ) : (
                         <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

