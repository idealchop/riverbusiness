import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function PaymentsPage() {
  const gcashQr = PlaceHolderImages.find(p => p.id === 'gcash-qr');
  const bankQr = PlaceHolderImages.find(p => p.id === 'bank-qr');
  const paymayaQr = PlaceHolderImages.find(p => p.id === 'paymaya-qr');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
        <CardDescription>Manage your billing information and view payment history.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Pay with QR</h3>
          <p className="text-sm text-muted-foreground">Scan the QR code below with your preferred payment app.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
              {gcashQr && (
                 <Image
                    src={gcashQr.imageUrl}
                    width={150}
                    height={150}
                    alt={gcashQr.description}
                    data-ai-hint={gcashQr.imageHint}
                    className="rounded-md"
                  />
              )}
              <p className="font-medium">GCash</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
              {bankQr && (
                 <Image
                    src={bankQr.imageUrl}
                    width={150}
                    height={150}
                    alt={bankQr.description}
                    data-ai-hint={bankQr.imageHint}
                    className="rounded-md"
                  />
              )}
              <p className="font-medium">Bank Transfer</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
              {paymayaQr && (
                 <Image
                    src={paymayaQr.imageUrl}
                    width={150}
                    height={150}
                    alt={paymayaQr.description}
                    data-ai-hint={paymayaQr.imageHint}
                    className="rounded-md"
                  />
              )}
              <p className="font-medium">PayMaya</p>
            </div>
          </div>
        </div>
        
        <Separator />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Current Method</h3>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Visa ending in 4242</p>
              <p className="text-sm text-muted-foreground">Expires 12/2026</p>
            </div>
            <Button variant="outline">Update</Button>
          </div>
        </div>
        
        <Separator />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Payment History</h3>
          <div className="border rounded-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-medium">July 2024 Invoice</p>
                <p className="text-sm text-muted-foreground">Paid on July 15, 2024</p>
              </div>
              <p className="font-medium">$150.00</p>
            </div>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-medium">June 2024 Invoice</p>
                <p className="text-sm text-muted-foreground">Paid on June 15, 2024</p>
              </div>
              <p className="font-medium">$145.00</p>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">May 2024 Invoice</p>
                <p className="text-sm text-muted-foreground">Paid on May 15, 2024</p>
              </div>
              <p className="font-medium">$160.00</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
