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
  Receipt,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

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
    amount: 0.0,
    status: 'Paid',
  },
  {
    id: 'INV-04-2024',
    date: '2024-04-15',
    description: 'April 2024 Invoice',
    amount: 152.0,
    status: 'Paid',
  },
  {
    id: 'INV-03-2024',
    date: '2024-03-15',
    description: 'March 2024 Invoice',
    amount: 148.0,
    status: 'Paid',
  },
  {
    id: 'INV-02-2024',
    date: '2024-02-15',
    description: 'February 2024 Invoice',
    amount: 155.0,
    status: 'Paid',
  },
];

const totalPaid = paymentHistory.reduce((sum, item) => sum + item.amount, 0);

const chartData = paymentHistory.map(p => ({
    month: new Date(p.date).toLocaleString('default', { month: 'short' }),
    amount: p.amount
})).reverse();


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
            <CardTitle>Total Balance Paid</CardTitle>
            <CardDescription>Total amount of payments received from your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4">
              <p className="text-4xl font-bold tracking-tight">
                ₱{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                      </defs>
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₱${value}`} />
                      <Tooltip 
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 'var(--radius)',
                        }}
                        labelStyle={{color: 'hsl(var(--foreground))'}}
                        formatter={(value: number) => [`₱${value.toFixed(2)}`, 'Amount']}
                      />
                      <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorAmount)" />
                  </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Partner Transactions</CardTitle>
            <CardDescription>
              Recent invoices submitted and payments received.
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
                {paymentHistory.slice(0, 3).map((payment) => (
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
             <div className="flex justify-end mt-4">
                <Button variant="outline">Create Invoice</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar */}
      <div className="flex flex-col gap-6">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle>Available for Payout</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-4xl font-bold">₱155.00</p>
            <div className="text-sm text-primary-foreground/80 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <p>**** **** **** 4242</p>
            </div>
            <div className='flex items-center gap-2'>
                <Button variant="secondary" className='w-full'>Manage Account</Button>
                <Button variant="ghost" className='w-full bg-primary-foreground/20 hover:bg-primary-foreground/30'>Request Payout</Button>
            </div>
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
