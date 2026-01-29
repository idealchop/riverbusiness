
'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Payment, AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, deleteField, DocumentReference } from 'firebase/firestore';
import { CheckCircle, X } from 'lucide-react';
import Image from 'next/image';
import { useAuth, useFirestore } from '@/firebase';
import { createClientNotification } from '@/lib/notifications';


interface PaymentReviewDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    paymentToReview: Payment | null;
    userDocRef: DocumentReference | null;
    user?: AppUser | null;
}

export function PaymentReviewDialog({ isOpen, onOpenChange, paymentToReview, userDocRef, user }: PaymentReviewDialogProps) {
    const { toast } = useToast();
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionInput, setShowRejectionInput] = useState(false);
    const auth = useAuth();
    const firestore = useFirestore();


    useEffect(() => {
        if (!isOpen) {
            // Reset state when dialog closes
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
                await createClientNotification(firestore, adminId, {
                    type: 'payment',
                    title: 'Payment Approved',
                    description: `You approved a payment of ₱${paymentToReview.amount.toFixed(2)} from ${user.businessName}.`,
                    data: { userId: user.id, paymentId: paymentToReview.id }
                });
            } else { // Rejected
                await createClientNotification(firestore, user.id, {
                    type: 'payment',
                    title: 'Payment Action Required',
                    description: `Your payment for invoice ${paymentToReview.id} requires attention. Reason: ${rejectionReason}.`,
                    data: { paymentId: paymentToReview.id }
                });
                await createClientNotification(firestore, adminId, {
                    type: 'payment',
                    title: 'Payment Rejected',
                    description: `You rejected a payment from ${user.businessName}. Reason: ${rejectionReason}.`,
                    data: { userId: user.id, paymentId: paymentToReview.id }
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
                            <div className="flex items-center justify-center h-full text-muted-foreground">{isEstimated ? 'This is an estimate. No proof of payment is applicable.' : 'No proof of payment available.'}</div>
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
                    ) : isEstimated ? (
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
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
