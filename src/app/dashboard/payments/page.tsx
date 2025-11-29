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
  X,
  Users,
  Building,
  Briefcase,
  Layers,
  Factory,
  RefreshCw,
  Droplet,
  Home,
  User,
  Check,
  Building2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { clientTypes, familyPlans, smePlans, commercialPlans, corporatePlans, enterprisePlans } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { appUsers } from '@/lib/data';


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

const icons: { [key: string]: React.ElementType } = {
  Family: Users,
  SME: Briefcase,
  Commercial: Building,
  Corporate: Layers,
  Enterprise: Factory,
};

type FamilyPlan = (typeof familyPlans)[0] & { details?: string[] };
type SmePlan = (typeof smePlans)[0] & { details?: string[], employees?: string, stations?: string };
type CommercialPlan = (typeof commercialPlans)[0] & { details?: string[], employees?: string, stations?: string };
type CorporatePlan = (typeof corporatePlans)[0] & { details?: string[], employees?: string, stations?: string };
type EnterprisePlan = (typeof enterprisePlans)[0] & { details?: string[], imageId?: string, description?: string };
type AnyPlan = FamilyPlan | SmePlan | CommercialPlan | CorporatePlan | EnterprisePlan;


export default function PaymentsPage() {
  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr');
  const bankQr = PlaceHolderImages.find((p) => p.id === 'bank-qr');
  const paymayaQr = PlaceHolderImages.find((p) => p.id === 'paymaya-qr');
  const upcomingPayment = paymentHistory.find(p => p.status === 'Upcoming');
  
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = React.useState(false);
  const [date, setDate] = React.useState<DateRange | undefined>()


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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             <div className="flex justify-end mt-4">
                <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
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
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a customer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {appUsers.map(user => (
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
                                    id="date"
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
                            <Button type="button">Send Invoice to Smart Refill</Button>
                        </DialogFooter>
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
    </div>
  );
}
