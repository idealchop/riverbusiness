'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Upload } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Payment, PaymentOption } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useStorage, useAuth, useFirestore } from '@/firebase';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { doc, setDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface PaymentPanelProps {
  invoice: Payment;
  onBack: () => void;
  onComplete?: () => void;
}

export function PaymentPanel({ invoice, onBack, onComplete }: PaymentPanelProps) {
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

  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr-payment');
  const bankQr = PlaceHolderImages.find((p) => p.id === 'bpi-qr-payment');
  const paymayaQr = PlaceHolderImages.find((p) => p.id === 'maya-qr-payment');
  const cardQr = PlaceHolderImages.find((p) => p.id === 'card-payment-qr');

  const paymentOptions: PaymentOption[] = React.useMemo(() => [
    { name: 'GCash', qr: gcashQr, details: { accountName: 'Jamie Camille Liongson', accountNumber: '09557750188' } },
    { name: 'BPI', qr: bankQr, details: { accountName: 'Jimboy Regalado', accountNumber: '3489145013' } },
    { name: 'Maya', qr: paymayaQr, details: { accountName: 'Jimboy Regalado', accountNumber: '09557750188' } },
    { name: 'Credit Card', qr: cardQr },
  ], [gcashQr, bankQr, paymayaQr, cardQr]);

  React.useEffect(() => {
    return () => {
      if (paymentProofPreview) URL.revokeObjectURL(paymentProofPreview);
    };
  }, [paymentProofPreview]);

  const handlePaymentOptionClick = (option: PaymentOption) => {
    if (option.name === 'Credit Card') {
      toast({ title: 'Coming soon', description: 'Credit card payment will be available shortly.' });
      return;
    }
    setSelectedPaymentMethod(option);
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPaymentProofFile(file || null);
    if (paymentProofPreview) URL.revokeObjectURL(paymentProofPreview);
    setPaymentProofPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleProofUpload = async () => {
    if (!paymentProofFile || !authUser || !storage || !auth || !firestore) return;

    setIsSubmittingProof(true);
    setUploadProgress(0);

    const filePath = `users/${authUser.uid}/payments/${invoice.id}-${Date.now()}-${paymentProofFile.name}`;
    const metadata = { customMetadata: { paymentId: invoice.id, userId: authUser.uid } };

    try {
      const downloadURL = await uploadFileWithProgress(storage, auth, filePath, paymentProofFile, metadata, setUploadProgress);
      const paymentRef = doc(firestore, 'users', authUser.uid, 'payments', invoice.id);

      await setDoc(paymentRef, {
        ...invoice,
        status: 'Pending Review',
        proofOfPaymentUrl: downloadURL,
      }, { merge: true });

      toast({ title: 'Proof submitted', description: 'Your payment is now pending review.' });
      onComplete?.();
      onBack();
    } catch (error) {
      console.error('Proof upload failed', error);
      toast({ variant: 'destructive', title: 'Upload failed', description: 'There was a problem uploading your payment proof.' });
    } finally {
      setIsSubmittingProof(false);
      setUploadProgress(0);
      setPaymentProofFile(null);
      if (paymentProofPreview) URL.revokeObjectURL(paymentProofPreview);
      setPaymentProofPreview(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50">
      <div className="px-4 pt-4 pb-2">
        <Button variant="ghost" className="rounded-full h-10 px-3 font-bold -ml-2" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to profile
        </Button>
      </div>

      <div className="px-5 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Payment</p>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-1">Pay this statement</h2>
        <p className="text-sm font-bold text-slate-500 mt-1">{invoice.description}</p>
        <p className="text-3xl font-black tracking-tight text-slate-900 mt-3">₱{Number(invoice.amount || 0).toFixed(2)}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {!selectedPaymentMethod ? (
          <section className="rounded-[1.75rem] bg-white p-5 shadow-sm border border-slate-100 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Choose a method</p>
            <div className="grid grid-cols-2 gap-3">
              {paymentOptions.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => handlePaymentOptionClick(option)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col items-center gap-3 hover:border-primary hover:bg-white transition-colors text-center"
                >
                  {option.qr && (
                    <div className="relative h-12 w-12">
                      <Image src={option.qr.imageUrl} alt={option.name} fill className="object-contain" />
                    </div>
                  )}
                  <p className="font-black text-sm text-slate-900">{option.name}</p>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-[1.75rem] bg-white p-5 shadow-sm border border-slate-100 space-y-4">
            <Button variant="outline" size="sm" className="rounded-full font-bold" onClick={() => setSelectedPaymentMethod(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Other methods
            </Button>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pay with {selectedPaymentMethod.name}</p>
            {selectedPaymentMethod.qr && (
              <div className="rounded-2xl bg-slate-50 p-5 flex flex-col items-center gap-4">
                <div className="relative w-52 h-52 bg-white rounded-2xl p-3 shadow-sm">
                  <Image src={selectedPaymentMethod.qr.imageUrl} alt={`${selectedPaymentMethod.name} QR`} fill className="object-contain p-2" />
                </div>
                {selectedPaymentMethod.details && (
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-slate-900">{selectedPaymentMethod.details.accountName}</p>
                    <p className="text-sm font-mono font-bold text-slate-600">{selectedPaymentMethod.details.accountNumber}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="rounded-[1.75rem] bg-white p-5 shadow-sm border border-slate-100 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Proof of payment</p>
          <p className="text-sm font-medium text-slate-500">Scan the QR, pay the amount, then upload your receipt.</p>
          <div className="space-y-1.5">
            <Label htmlFor="payment-proof" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Receipt screenshot</Label>
            <Input
              id="payment-proof"
              type="file"
              accept="image/*"
              onChange={handleProofFileChange}
              disabled={isSubmittingProof}
              className="h-12 rounded-2xl bg-slate-50 border-slate-200"
            />
          </div>
          {paymentProofPreview && (
            <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
              <Image src={paymentProofPreview} alt="Payment proof" width={640} height={800} className="w-full max-h-64 object-contain bg-white" />
              <p className="px-3 py-2 text-xs font-bold text-slate-500 truncate">{paymentProofFile?.name}</p>
            </div>
          )}
          {uploadProgress > 0 && <Progress value={uploadProgress} className="h-2.5" />}
          <Button
            className={cn('w-full h-12 rounded-2xl font-black')}
            onClick={handleProofUpload}
            disabled={!paymentProofFile || isSubmittingProof || !selectedPaymentMethod}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isSubmittingProof ? 'Submitting…' : 'Submit proof'}
          </Button>
          {!selectedPaymentMethod && (
            <p className="text-xs font-bold text-slate-400 text-center">Select a payment method first.</p>
          )}
        </section>
      </div>
    </div>
  );
}
