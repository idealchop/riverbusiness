
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
  Check,
  Calendar as CalendarIcon,
} from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Payment, AppUser } from '@/lib/types';


export default function PaymentsPage() {
  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr-payment');
  const bankQr = PlaceHolderImages.find((p) => p.id === 'bpi-qr-payment');
  const paymayaQr = PlaceHolderImages.find((p) => p.id === 'maya-qr-payment');

  const { user } = useUser();
  const firestore = useFirestore();

  const paymentsQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'users', user.id, 'payments') : null, [firestore, user]);
  const { data: paymentHistory, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: appUsers, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);

  const { toast } = useToast();
  const [date, setDate] = React.useState<DateRange | undefined>()
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);

  const handleSendInvoice = () => {
    if (!selectedCustomerId || !date?.from || !date?.to) {
      toast({
        variant: "destructive",
        title: "Invoice Creation Failed",
        description: "Please select a customer and a date range to generate an invoice.",
      });
      return;
    }
    toast({
      title: "Invoice Sent",
      description: `An invoice has been successfully generated and sent.`,
    });
    
    setDate(undefined);
    setSelectedCustomerId(null);
  };
  
  if (paymentsLoading || usersLoading) {
    return <div>Loading payments...</div>
  }

  return (
    <div className="flex flex-col gap-6">
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory?.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell>{new Date(payment.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
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
                     <TableCell className="text-right">
                      {payment.status === 'Upcoming' ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Pay Now
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Pay Invoice {payment.id}</DialogTitle>
                              <DialogDescription>
                                Scan a QR code to pay ₱{payment.amount.toFixed(2)}.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 py-4">
                                {gcashQr && (
                                    <div className="flex flex-col items-center gap-2 border p-4 rounded-lg">
                                        <Image src={gcashQr.imageUrl} alt="GCash QR" width={150} height={150} data-ai-hint={gcashQr.imageHint} />
                                        <p className="font-semibold">GCash</p>
                                    </div>
                                )}
                                 {bankQr && (
                                    <div className="flex flex-col items-center gap-2 border p-4 rounded-lg">
                                        <Image src={bankQr.imageUrl} alt="BDO QR" width={150} height={150} data-ai-hint={bankQr.imageHint} />
                                        <p className="font-semibold">BDO</p>
                                    </div>
                                )}
                                {bankQr && (
                                    <div className="flex flex-col items-center gap-2 border p-4 rounded-lg">
                                        <Image src={bankQr.imageUrl} alt="BPI QR" width={150} height={150} data-ai-hint={bankQr.imageHint} />
                                        <p className="font-semibold">BPI</p>
                                    </div>
                                )}
                                 {paymayaQr && (
                                    <div className="flex flex-col items-center gap-2 border p-4 rounded-lg">
                                        <Image src={paymayaQr.imageUrl} alt="PayMaya QR" width={150} height={150} data-ai-hint={paymayaQr.imageHint} />
                                        <p className="font-semibold">PayMaya</p>
                                    </div>
                                )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Button variant="outline" disabled>
                          <Check className="mr-2 h-4 w-4" />
                          Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             <div className="flex justify-end mt-4 gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="bg-primary/90 hover:bg-primary">Create Invoice</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Invoice to Smart Refill</DialogTitle>
                            <DialogDescription>
                                Select a customer and date range to generate an invoice for their recurring billed amount.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="customer">Select a Customer</Label>
                                <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId || undefined}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a customer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {appUsers?.map(user => (
                                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="date-range">Select Date Range</Label>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    id="date-create"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                        <>
                                            {format(date.from, "LLL dd, y")} -{" "}
                                            {format(date.to, "LLL dd, y")}
                                        </>
                                        ) : (
                                        format(date.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                    />
                                </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <DialogFooter className="grid grid-cols-2 gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                Cancel
                                </Button>
                            </DialogClose>
                            <DialogClose asChild>
                                <Button type="button" onClick={handleSendInvoice}>Send Invoice to Smart Refill</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
