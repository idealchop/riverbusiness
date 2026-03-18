'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Payment, AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, deleteField, DocumentReference } from 'firebase/firestore';
import { CheckCircle, X, Receipt, Upload } from 'lucide-react';
import Image from 'next/image';
import { useAuth, useFirestore, useStorage } from '@/firebase';
import { createClientNotification } from '@/lib/notifications';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { Progress } from '@/components/ui/progress';

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
    const storage = useStorage();
    
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setRejectionReason('');
            setShowRejectionInput(false);
            setUploadProgress(0);
            setIsUploading(false);
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

    const handleAdminUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userDocRef || !paymentToReview || !storage || !auth?.currentUser || !user) return;

        setIsUploading(true);
        setUploadProgress(0);

        const filePath = `admin_uploads/${auth.currentUser.uid}/payment_proofs/${user.id}/${paymentToReview.id}-${Date.now()}-${file.name}`;

        try {
            const downloadURL = await uploadFileWithProgress(storage, auth, filePath, file, {}, setUploadProgress);
            const paymentRef = doc(userDocRef, 'payments', paymentToReview.id);
            
            await updateDoc(paymentRef, {
                proofOfPaymentUrl: downloadURL,
                status: 'Pending Review' // Force back to pending review if admin uploads
            });

            toast({ title: 'Proof Uploaded', description: 'The payment proof has been saved and is ready for review.' });
        } catch (error) {
            console.error("Admin proof upload failed:", error);
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
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
                    <div className="relative w-full aspect-[9/16] max-h-[50vh] rounded-lg border overflow-hidden bg-muted group">
                        {paymentToReview?.proofOfPaymentUrl ? (
                            <Image src={paymentToReview.proofOfPaymentUrl} alt="Proof of Payment" fill className="object-contain" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-center px-4">
                                {isEstimated ? 'This is an estimate. No proof of payment is applicable.' : 'No proof of payment available.'}
                            </div>
                        )}

                        {!isEstimated && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {paymentToReview?.proofOfPaymentUrl ? 'Replace Proof' : 'Upload Proof'}
                                </Button>
                            </div>
                        )}
                        
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 text-white text-center">
                                <p className="text-sm font-medium mb-2">Uploading Proof...</p>
                                <Progress value={uploadProgress} className="w-full h-1" />
                            </div>
                        )}
                    </div>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleAdminUploadProof}
                    />

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
                <DialogFooter className="flex flex-col gap-2">
                     {showRejectionInput ? (
                        <>
                            <Button variant="ghost" onClick={() => setShowRejectionInput(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => handleUpdatePaymentStatus('Upcoming')}>Confirm Rejection</Button>
                        </>
                    ) : isEstimated ? (
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">Close</Button>
                    ) : (
                        <div className="flex flex-col gap-2 w-full">
                            {paymentToReview?.status === 'Pending Review' ? (
                                <div className="flex gap-2 w-full">
                                    <Button variant="destructive" onClick={() => setShowRejectionInput(true)} className="flex-1">
                                        <X className="mr-2 h-4 w-4" /> Reject
                                    </Button>
                                    <Button onClick={() => handleUpdatePaymentStatus('Paid')} className="flex-1">
                                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 w-full">
                                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">Close</Button>
                                    {paymentToReview?.status === 'Paid' && (
                                        <Button 
                                            variant="default" 
                                            className="w-full"
                                            onClick={() => {
                                                onOpenChange(false);
                                                onSendReceipt?.(paymentToReview);
                                            }}
                                        >
                                            <Receipt className="mr-2 h-4 w-4" />
                                            Send Receipt
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}