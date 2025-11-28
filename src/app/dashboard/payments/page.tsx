'use client';

import React, { useState } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const paymentHistory = [
    { id: 'INV-08-2024', date: '2024-08-15', description: 'August 2024 Invoice', amount: 155.00, status: 'Upcoming' },
    { id: 'INV-07-2024', date: '2024-07-15', description: 'July 2024 Invoice', amount: 150.0, status: 'Paid' },
    { id: 'INV-06-2024', date: '2024-06-15', description: 'June 2024 Invoice', amount: 145.0, status: 'Paid' },
    { id: 'INV-05-2024', date: '2024-05-15', description: 'May 2024 Invoice', amount: 0.0, status: 'Paid' },
    { id: 'INV-04-2024', date: '2024-04-15', description: 'April 2024 Invoice', amount: 152.0, status: 'Paid' },
    { id: 'INV-03-2024', date: '2024-03-15', description: 'March 2024 Invoice', amount: 148.0, status: 'Paid' },
    { id: 'INV-02-2024', date: '2024-02-15', description: 'February 2024 Invoice', amount: 155.0, status: 'Paid' },
    { id: 'INV-01-2024', date: '2024-01-15', description: 'January 2024 Invoice', amount: 160.0, status: 'Paid' },
    { id: 'INV-12-2023', date: '2023-12-15', description: 'December 2023 Invoice', amount: 158.0, status: 'Paid' },
    { id: 'INV-11-2023', date: '2023-11-15', description: 'November 2023 Invoice', amount: 154.0, status: 'Paid' },
    { id: 'INV-10-2023', date: '2023-10-15', description: 'October 2023 Invoice', amount: 150.0, status: 'Paid' },
    { id: 'INV-09-2023', date: '2023-09-15', description: 'September 2023 Invoice', amount: 147.0, status: 'Paid' },
];

const totalPaid = paymentHistory.filter(p => p.status === 'Paid').reduce((sum, item) => sum + item.amount, 0);

const chartData = paymentHistory.filter(p => p.status === 'Paid').map(p => ({
    month: new Date(p.date).toLocaleString('default', { month: 'short' }),
    amount: p.amount
})).reverse();

const plans = [
    { name: 'Basic', price: 50, description: 'Up to 5,000 gallons/month' },
    { name: 'Standard', price: 100, description: 'Up to 15,000 gallons/month' },
    { name: 'Premium', price: 150, description: 'Unlimited gallons/month' },
];


export default function PaymentsPage() {
  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr');
  const bankQr = PlaceHolderImages.find((p) => p.id === 'bank-qr');
  const paymayaQr = PlaceHolderImages.find((p) => p.id === 'paymaya-qr');
  const upcomingPayment = paymentHistory.find(p => p.status === 'Upcoming');
  
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number; description: string} | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const handlePlanSelection = (plan: { name: string; price: number; description: string}) => {
    setSelectedPlan(plan);
    setShowPaymentDialog(true);
  };

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
                {paymentHistory.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell>{payment.date}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === 'Paid' ? 'default' : (payment.status === 'Upcoming' ? 'secondary' : 'outline')
                        }
                        className={
                          payment.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                          : payment.status === 'Upcoming' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-200'
                        }
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
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">Invoice</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader>
                            <DialogTitle>Choose a Plan</DialogTitle>
                            <DialogDescription>Select a water consumption plan that fits your needs.</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                            {plans.map(plan => (
                                <Card key={plan.name} className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle>{plan.name}</CardTitle>
                                        <CardDescription>{plan.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-4xl font-bold">₱{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                                    </CardContent>
                                    <div className="p-4 pt-0">
                                        <Button className="w-full" onClick={() => handlePlanSelection(plan)}>
                                            Choose Plan
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar */}
      <div className="flex flex-col gap-6">
        <Card className="bg-foreground text-background">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Available for Payout</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6 opacity-50"><rect width="256" height="256" fill="none"></rect><path d="M89.3,160l-58-58a8,8,0,0,1,0-11.3l58-58a8,8,0,0,1,11.3,0l58,58a8,8,0,0,1,0,11.3l-58,58A8,8,0,0,1,89.3,160Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></path><path d="M194.7,160l-58-58a8,8,0,0,1,0-11.3l58-58a8,8,0,0,1,11.3,0l58,58a8,8,0,0,1,0,11.3l-58,58A8,8,0,0,1,194.7,160Z" opacity="0.2" fill="currentColor"></path><path d="M89.3,224l-58-58a8,8,0,0,1,0-11.3l58-58a8,8,0,0,1,11.3,0l58,58a8,8,0,0,1,0,11.3l-58,58A8,8,0,0,1,89.3,224Z" opacity="0.2" fill="currentColor"></path></svg>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-4xl font-bold">₱{upcomingPayment ? upcomingPayment.amount.toFixed(2) : '0.00'}</p>
            <div className="text-sm text-background/70 flex items-center justify-between">
                <p>**** **** **** 5678</p>
                <CreditCard className="h-5 w-5" />
            </div>
             <p className="text-sm text-background/70">Juan dela Cruz</p>
            <div className='flex items-center gap-2'>
                <Button variant="secondary" className='w-full text-foreground'>Manage Account</Button>
                <Button variant="default" className='w-full bg-primary/90 hover:bg-primary'>Request Payout</Button>
            </div>
          </CardContent>
        </Card>
      </div>

       <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Complete Your Payment</DialogTitle>
                    <DialogDescription>
                        You've selected the <span className="font-bold">{selectedPlan?.name}</span> plan. 
                        Pay ₱{selectedPlan?.price.toFixed(2)} using your preferred method.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="qr" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="qr"><QrCode className="mr-2" /> QR Code</TabsTrigger>
                        <TabsTrigger value="bank"><CreditCard className="mr-2"/> Bank/Card</TabsTrigger>
                    </TabsList>
                    <TabsContent value="qr">
                        <div className="flex flex-col items-center gap-4 py-4">
                            <p className="text-sm text-muted-foreground text-center">Scan the QR code with your mobile banking or e-wallet app.</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {gcashQr && <Image src={gcashQr.imageUrl} alt="GCash QR" width={150} height={150} data-ai-hint={gcashQr.imageHint} />}
                                {paymayaQr && <Image src={paymayaQr.imageUrl} alt="PayMaya QR" width={150} height={150} data-ai-hint={paymayaQr.imageHint} />}
                                {bankQr && <Image src={bankQr.imageUrl} alt="Bank QR" width={150} height={150} data-ai-hint={bankQr.imageHint} />}
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="bank">
                         <div className="space-y-4 py-4">
                            <div className="text-center">
                                <p className="font-semibold">Bank Transfer</p>
                                <p className="text-sm text-muted-foreground">BDO Unibank: 123-456-7890</p>
                                <p className="text-sm text-muted-foreground">Account Name: River Business Inc.</p>
                            </div>
                             <Separator />
                             <div className="text-center">
                                <p className="font-semibold">Credit/Debit Card</p>
                                <p className="text-sm text-muted-foreground">Card payments are processed securely.</p>
                                <Button className="mt-2">Pay with Card</Button>
                            </div>
                         </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    </div>
  );
}
