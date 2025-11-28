'use client';

import React from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  CreditCard,
  QrCode,
  Download,
} from 'lucide-react';

const paymentHistory = [
  {
    id: 'INV-07-2024',
    date: '2024-07-15',
    description: 'July 2024 Invoice',
    amount: 150.0,
    status: 'Paid',
  },
  {
    id: 'INV-06-2024',
    date: '2024-06-15',
    description: 'June 2024 Invoice',
    amount: 145.0,
    status: 'Paid',
  },
  {
    id: 'INV-05-2024',
    date: '2024-05-15',
    description: 'May 2024 Invoice',
    amount: 160.0,
    status: 'Paid',
  },
];

const totalPaid = paymentHistory.reduce((sum, item) => sum + item.amount, 0);

export default function PaymentsPage() {
  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr');
  const bankQr = PlaceHolderImages.find((p) => p.id === 'bank-qr');
  const paymayaQr = PlaceHolderImages.find((p) => p.id === 'paymaya-qr');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Paid</CardTitle>
            <CardDescription>
              Total amount of payments received from your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              ₱{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              A record of your recent invoices and payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell>{payment.date}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === 'Paid' ? 'default' : 'outline'
                        }
                        className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₱{payment.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar */}
      <div className="flex flex-col gap-6">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle>Next Bill Due</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-4xl font-bold">₱155.00</p>
            <div className="text-sm text-primary-foreground/80">
                <p>Due on August 15, 2024</p>
                <p>Invoice #INV-08-2024</p>
            </div>
            <Button variant="secondary">Pay Now</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Visa ending in 4242</p>
                <p className="text-sm text-muted-foreground">Expires 12/2026</p>
              </div>
              <Button variant="ghost" size="sm">
                Manage
              </Button>
            </div>
            <Button variant="outline" className="w-full">
              Add new method
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Pay with QR
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-around items-center gap-2">
             <div className="flex flex-col items-center gap-2">
                {gcashQr && (
                 <Image
                    src={gcashQr.imageUrl}
                    width={64}
                    height={64}
                    alt={gcashQr.description}
                    data-ai-hint={gcashQr.imageHint}
                    className="rounded-md"
                  />
                )}
                <p className="text-xs font-medium">GCash</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                {bankQr && (
                  <Image
                    src={bankQr.imageUrl}
                    width={64}
                    height={64}
                    alt={bankQr.description}
                    data-ai-hint={bankQr.imageHint}
                    className="rounded-md"
                  />
                )}
                <p className="text-xs font-medium">Bank</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                {paymayaQr && (
                  <Image
                    src={paymayaQr.imageUrl}
                    width={64}
                    height={64}
                    alt={paymayaQr.description}
                    data-ai-hint={paymayaQr.imageHint}
                    className="rounded-md"
                  />
                )}
                <p className="text-xs font-medium">PayMaya</p>
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}