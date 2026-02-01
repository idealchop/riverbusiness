
'use client';

import React from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Payment, PaymentOption } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useStorage, useAuth, useFirestore } from '@/firebase';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { doc, setDoc } from 'firebase/firestore';

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedInvoice: Payment | null;
}

export function PaymentDialog({ isOpen, onOpenChange, selectedInvoice }: PaymentDialogProps) {
  const { toast } = useToast();
  const { user: authUser } = useUser();
  const storage = useStorage();
  const auth = useAuth();
  const firestore = useFirestore();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<PaymentOption | null>(null);
  const [paymentProofFile, setPaymentProofFile] = React.useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isSubmittingProof, setIsSubmittingProof] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr-payment');
  const bankQr = PlaceHolderImages.find((p) => p.id === 'bpi-qr-payment');
  const paymayaQr = PlaceHolderImages.find((p) => p.id === 'maya-qr-payment');
  const cardQr = PlaceHolderImages.find((p) => p.id === 'card-payment-qr');

  const paymentOptions: PaymentOption[] = React.useMemo(() => [
    { name: 'GCash', qr: gcashQr, details: { accountName: 'Jamie Camille Liongson', accountNumber: '09557750188' } },
    { name: 'BPI', qr: bankQr, details: { accountName: 'Jimboy Regalado', accountNumber: '3489145013' } },
    { name: 'Maya', qr: paymayaQr, details: { accountName: 'Jimboy Regalado', accountNumber: '09557750188' } },
    { name: 'Credit Card', qr: cardQr }
  ], [gcashQr, bankQr, paymayaQr, cardQr]);

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedPaymentMethod(null);
      setPaymentProofFile(null);
      if (paymentProofPreview) {
        URL.revokeObjectURL(paymentProofPreview);
      }
      setPaymentProofPreview(null);
    }
  }, [isOpen, paymentProofPreview]);

  const handlePaymentOptionClick = (option: PaymentOption) => {
    if (option.name === 'Credit Card') {
      toast({ title: 'Coming Soon!', description: 'Credit card payment will be available shortly.' });
      return;
    }
    setSelectedPaymentMethod(option);
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPaymentProofFile(file || null);
    if (paymentProofPreview) {
        URL.revokeObjectURL(paymentProofPreview);
    }
    if (file) {
        setPaymentProofPreview(URL.createObjectURL(file));
    } else {
        setPaymentProofPreview(null);
    }
  };

  const handleProofUpload = async () => {
    if (!paymentProofFile || !selectedInvoice || !authUser || !storage || !auth || !firestore) return;

    setIsSubmittingProof(true);
    setUploadProgress(0);
    
    const filePath = `users/${authUser.uid}/payments/${selectedInvoice.id}-${Date.now()}-${paymentProofFile.name}`;
    const metadata = { customMetadata: { paymentId: selectedInvoice.id, userId: authUser.uid } };

    try {
        const downloadURL = await uploadFileWithProgress(storage, auth, filePath, paymentProofFile, metadata, setUploadProgress);
        const paymentRef = doc(firestore, 'users', authUser.uid, 'payments', selectedInvoice.id);
        
        await setDoc(paymentRef, { 
            ...selectedInvoice,
            status: 'Pending Review',
            proofOfPaymentUrl: downloadURL,
        }, { merge: true });

        toast({ title: 'Upload Complete', description: 'Your proof of payment has been submitted for review.' });
    } catch (error: any) {
        console.error("Proof upload failed", error);
        toast({ variant: "destructive", title: "Upload Failed", description: "There was a problem uploading your payment proof." });
    } finally {
        setIsSubmittingProof(false);
        setUploadProgress(0);
        setPaymentProofFile(null);
        if (paymentProofPreview) URL.revokeObjectURL(paymentProofPreview);
        setPaymentProofPreview(null);
        onOpenChange(false);
    }
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedPaymentMethod ? `Pay with ${selectedPaymentMethod.name}` : `Pay Invoice ${selectedInvoice?.id}`}
            </DialogTitle>
            <DialogDescription>
              {selectedPaymentMethod ? `Scan the QR code and upload your proof of payment.` : `Your bill is ₱${selectedInvoice?.amount.toFixed(2)}. Please select a payment method.`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="pr-6 -mr-6">
            <div className="py-4 grid md:grid-cols-2 gap-8">
              {!selectedPaymentMethod ? (
                <div className="space-y-4">
                  <h4 className="font-semibold mb-4">Select a Payment Method</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {paymentOptions.map((option) => (
                      <Card key={option.name} className="cursor-pointer hover:border-primary" onClick={() => handlePaymentOptionClick(option)}>
                        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                          {option.qr && (
                            <div className="relative h-10 w-10">
                              <Image src={option.qr.imageUrl} alt={option.name} fill className="object-contain" data-ai-hint={option.qr.imageHint}/>
                            </div>
                          )}
                          <p className="font-medium text-sm sm:text-base">{option.name}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button variant="outline" size="sm" onClick={() => setSelectedPaymentMethod(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payment Options
                  </Button>
                  {selectedPaymentMethod.qr && (
                    <div className="p-4 border rounded-lg flex flex-col items-center gap-4">
                      <div className="relative w-48 h-48">
                        <Image src={selectedPaymentMethod.qr.imageUrl} alt={`${selectedPaymentMethod.name} QR Code`} fill className="object-contain" data-ai-hint={selectedPaymentMethod.qr.imageHint} />
                      </div>
                      {selectedPaymentMethod.details && (
                        <div className="text-center text-sm">
                          <p>Account Name: <span className="font-semibold">{selectedPaymentMethod.details.accountName}</span></p>
                          <p>Account Number: <span className="font-semibold">{selectedPaymentMethod.details.accountNumber}</span></p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-semibold">Upload Proof of Payment</h4>
                <p className="text-sm text-muted-foreground">Please upload your proof of payment.</p>
                <div className="space-y-1.5">
                  <Label htmlFor="payment-proof">Receipt Screenshot</Label>
                  <div className="flex items-center gap-2">
                    <Input id="payment-proof" type="file" onChange={handleProofFileChange} disabled={isSubmittingProof} />
                    <Button onClick={handleProofUpload} disabled={!paymentProofFile || isSubmittingProof} className="shrink-0">
                      {isSubmittingProof ? 'Uploading...' : 'Submit Proof'}
                    </Button>
                  </div>
                </div>
                {paymentProofPreview && (
                  <div className="flex items-center gap-2 text-sm">
                    <Image src={paymentProofPreview} alt="Preview" width={40} height={40} className="rounded-md object-cover" />
                    <span className="truncate flex-1">{paymentProofFile?.name}</span>
                    <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setIsPreviewOpen(true)}>Preview</Button>
                  </div>
                )}
                {uploadProgress > 0 && <Progress value={uploadProgress} className="mt-2 h-2.5" />}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {paymentProofPreview && (
            <div className="py-4 flex justify-center">
              <Image src={paymentProofPreview} alt="Payment Proof Preview" width={400} height={600} className="rounded-md object-contain max-h-[70vh]" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
