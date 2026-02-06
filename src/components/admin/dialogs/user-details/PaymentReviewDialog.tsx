'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Payment, AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, deleteField, DocumentReference } from 'firebase/firestore';
import { CheckCircle, X, Receipt } from 'lucide-react';
import Image from 'next/image';
import { useAuth, useFirestore } from '@/firebase';
import { createClientNotification } from '@/lib/notifications';


interface PaymentReviewDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    paymentToReview: Payment | null;
    userDocRef: DocumentReference | null;
    user?: AppUser | null;
    onSendReceipt?: (payment: Payment) => void;
}

export function PaymentReviewDialog({ isOpen, onOpenChange, paymentToReview, userDocRef, user, onSendReceipt }: PaymentReviewDialogProps) {
    const { toast } = useToast();
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionInput, setShowRejectionInput] = useState(false);
    const auth = useAuth();
    const firestore = useFirestore();


    useEffect(() => {
        if (!isOpen) {
            setRejectionReason('');
            setShowRejectionInput(false);
        }
    }, [isOpen]);

    const handleUpdatePaymentStatus = async (newStatus: 'Paid' | 'Upcoming') => {
        if (!userDocRef || !paymentToReview || !firestore || !auth?.currentUser || !user) return;

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

            const adminId = auth.currentUser.uid;
            
            if (newStatus === 'Paid') {
                await createClientNotification(firestore, user.id, {
                    type: 'payment',
                    title: 'Payment Confirmed',
                    description: `Your payment for invoice ${paymentToReview.id} has been confirmed. Thank you!`,
                    data: { paymentId: paymentToReview.id }
                });
            } else { 
                await createClientNotification(firestore, user.id, {
                    type: 'payment',
                    title: 'Payment Action Required',
                    description: `Your payment for invoice ${paymentToReview.id} requires attention. Reason: ${rejectionReason}.`,
                    data: { paymentId: paymentToReview.id }
                });
            }

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
    
    const isEstimated = paymentToReview?.id.startsWith('INV-EST');

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEstimated ? 'Estimated Invoice' : paymentToReview?.status === 'Pending Review' ? 'Review Payment' : 'Payment Details'}</DialogTitle>
                    <DialogDescription>
                        Invoice ID: {paymentToReview?.id}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="relative w-full aspect-[9/16] max-h-[50vh] rounded-lg border overflow-hidden bg-muted">
                        {paymentToReview?.proofOfPaymentUrl ? (
                            <Image src={paymentToReview.proofOfPaymentUrl} alt="Proof of Payment" layout="fill" className="object-contain" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-center px-4">
                                {isEstimated ? 'This is an estimate. No proof of payment is applicable.' : 'No proof of payment available.'}
                            </div>
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
                <DialogFooter className="gap-2">
                     {showRejectionInput ? (
                        <>
                            <Button variant="ghost" onClick={() => setShowRejectionInput(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => handleUpdatePaymentStatus('Upcoming')}>Confirm Rejection</Button>
                        </>
                    ) : isEstimated ? (
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">Close</Button>
                    ) : (
                        <div className="flex flex-col sm:flex-row w-full gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Close</Button>
                            {paymentToReview?.status === 'Pending Review' && (
                                <>
                                    <Button variant="destructive" onClick={() => setShowRejectionInput(true)} className="flex-1">
                                        <X className="mr-2 h-4 w-4" /> Reject
                                    </Button>
                                    <Button onClick={() => handleUpdatePaymentStatus('Paid')} className="flex-1">
                                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                    </Button>
                                </>
                            )}
                            {paymentToReview?.status === 'Paid' && onSendReceipt && (
                                <Button variant="default" onClick={() => onSendReceipt(paymentToReview)} className="flex-1">
                                    <Receipt className="mr-2 h-4 w-4" /> Send Receipt
                                </Button>
                            )}
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}