
'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Bell, Truck, User, KeyRound, Info, Camera, Eye, EyeOff, LifeBuoy, Mail, Phone, Home, Layers, Receipt, Check, CreditCard, Download, QrCode, FileText, Upload } from 'lucide-react';
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { deliveries, paymentHistory as initialPaymentHistory } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { LiveChat } from '@/components/live-chat';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import type { Payment } from '@/lib/types';


interface OnboardingData {
    formData: {
        fullName: string;
        clientId: string;
        email: string;
        businessName: string;
        address: string;
        contactNumber: string;
    };
    clientType: string;
    plan: {
        name: string;
        price: number;
        imageId: string;
    };
    customPlanDetails: {
        litersPerMonth: number;
        bonusLiters: number;
        deliveryFrequency: string;
        deliveryDay: string;
        deliveryTime: string;
    };
    contractUrl?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');
  const recentDeliveries = deliveries.slice(0, 4);

  const [userName, setUserName] = useState('Juan dela Cruz');
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>(initialPaymentHistory);
  
  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr-payment');
  const bankQr = PlaceHolderImages.find((p) => p.id === 'bank-qr-payment');
  const paymayaQr = PlaceHolderImages.find((p) => p.id === 'maya-qr');
  const cardPayment = PlaceHolderImages.find((p) => p.id === 'card-payment-qr');

  const [isProofUploadDialogOpen, setIsProofUploadDialogOpen] = useState(false);
  const [selectedInvoiceForProof, setSelectedInvoiceForProof] = useState<Payment | null>(null);

  useEffect(() => {
    const storedOnboardingData = localStorage.getItem('onboardingData');
    if (storedOnboardingData) {
      const data = JSON.parse(storedOnboardingData);
      setOnboardingData(data);
      if (data.formData && data.formData.fullName) {
        setUserName(data.formData.fullName);
      }
      
      // Update payment history with plan price
      if (data.plan && data.plan.price) {
        setPaymentHistory(prevHistory => {
          return prevHistory.map(invoice => 
            invoice.status === 'Upcoming' 
              ? { ...invoice, amount: data.plan.price }
              : invoice
          );
        });
      }
    }
  }, []);

  const handleProofUpload = (invoiceId: string) => {
    // Simulate file upload and update state
    const updatedHistory = paymentHistory.map(invoice => {
        if (invoice.id === invoiceId) {
            return { ...invoice, status: 'Paid' as 'Paid', proofOfPaymentUrl: 'https://example.com/proof.pdf' };
        }
        return invoice;
    });
    setPaymentHistory(updatedHistory);
    setIsProofUploadDialogOpen(false);
  };

  const getStatusBadgeVariant = (status: 'Delivered' | 'In Transit' | 'Pending'): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'Delivered':
        return 'default';
      case 'In Transit':
        return 'secondary';
      case 'Pending':
        return 'outline';
      default:
        return 'outline';
    }
  }
  
  const planImage = onboardingData?.plan?.imageId ? PlaceHolderImages.find(p => p.id === onboardingData.plan.imageId) : null;

  return (
      <div className="flex flex-col h-full">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
            
            <div className="flex items-center">
                <span className="font-bold">River Business</span>
            </div>
          </Link>
          <div className="flex-1" />
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
              >
                <LifeBuoy className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
                <div className="space-y-2 text-center">
                    <h2 className="text-3xl font-bold">Hello, {userName}!</h2>
                    <p className="text-muted-foreground">
                        Our team is ready to assist you. Please use the contact details below, and we'll get back to you as soon as possible.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 py-4 flex-1 overflow-hidden">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 rounded-md border p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Phone className="h-6 w-6" />
                            </div>
                            <div>
                            <p className="font-semibold">Jayvee Victor Co</p>
                            <a href="tel:09182719091" className="text-sm text-muted-foreground hover:text-primary">09182719091</a>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 rounded-md border p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Mail className="h-6 w-6" />
                            </div>
                            <div>
                            <p className="font-semibold">Email Support</p>
                            <a href="mailto:jayvee@riverph.com" className="text-sm text-muted-foreground hover:text-primary">jayvee@riverph.com</a>
                            </div>
                        </div>
                      </div>
                       <div className="mt-4 text-center text-sm">
                        <p className="font-semibold">In case of urgent need, just contact us.</p>
                        <p className="text-balance text-muted-foreground">Your Drinking Water, Safe & Simplified.</p>
                        <p className="text-xs text-muted-foreground">By Smart Refill</p>
                      </div>
                    </div>
                    <div className="flex flex-col h-full">
                         <LiveChat />
                    </div>
                </div>
              </DialogContent>
          </Dialog>
          <Popover>
              <PopoverTrigger asChild>
              <Button
                  variant="outline"
                  size="icon"
                  className="relative rounded-full"
              >
                  <Bell className="h-4 w-4" />
              </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96">
              <div className="space-y-2">
                  <div className="flex justify-between items-center">
                  <h4 className="font-medium text-sm">Notifications</h4>
                  <Badge variant="default" className="rounded-full">
                      {recentDeliveries.filter(d => d.status !== 'Delivered').length} New
                  </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                  Recent water delivery updates.
                  </p>
              </div>
              <Separator className="my-4" />
              <div className="space-y-4">
                  {recentDeliveries.map((delivery) => (
                  <div key={delivery.id} className="grid grid-cols-[25px_1fr] items-start gap-4">
                      <span className="flex h-2 w-2 translate-y-1 rounded-full bg-primary" />
                      <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                          Delivery {delivery.id}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center justify-between">
                          <span>{delivery.volumeGallons} Gallons</span>
                          <Badge
                          variant={getStatusBadgeVariant(delivery.status)}
                          className={cn('text-xs',
                              delivery.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                              delivery.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                          )}
                          >
                          {delivery.status}
                          </Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(delivery.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                  </div>
                  ))}
              </div>
              </PopoverContent>
          </Popover>
          <Dialog>
            <DialogTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer">
                {userAvatar && (
                  <Image
                    src={userAvatar.imageUrl}
                    width={40}
                    height={40}
                    alt={userAvatar.description}
                    data-ai-hint={userAvatar.imageHint}
                    className={cn("rounded-full")}
                  />
                )}
                <div className="hidden sm:flex flex-col items-start">
                  <p className="font-semibold text-sm">{userName}</p>
                  <p className="text-xs text-muted-foreground">{onboardingData?.plan?.name || 'No Plan Selected'}</p>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>My Account</DialogTitle>
                <DialogDescription>
                  Manage your plan, account details, and invoices.
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="accounts">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="accounts"><User className="mr-2" />Accounts</TabsTrigger>
                  <TabsTrigger value="plans"><Home className="mr-2" />Plans</TabsTrigger>
                  <TabsTrigger value="invoices"><Receipt className="mr-2" />Invoices</TabsTrigger>
                </TabsList>

                <TabsContent value="accounts" className="py-4">
                    {onboardingData?.formData ? (
                        <div className="space-y-4">
                            <h4 className="font-semibold mb-2">Your Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                <div>
                                    <Label className="text-muted-foreground">Full Name</Label>
                                    <p className="font-medium">{onboardingData.formData.fullName}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Client ID</Label>
                                    <p className="font-medium">{onboardingData.formData.clientId}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Email Address</Label>
                                    <p className="font-medium">{onboardingData.formData.email}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Business Name</Label>
                                    <p className="font-medium">{onboardingData.formData.businessName}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="text-muted-foreground">Address</Label>
                                    <p className="font-medium">{onboardingData.formData.address}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Contact Number</Label>
                                    <p className="font-medium">{onboardingData.formData.contactNumber}</p>
                                </div>
                            </div>
                        </div>
                    ) : <p>No account information available. Please complete onboarding.</p>}
                </TabsContent>

                <TabsContent value="plans" className="py-4">
                  {onboardingData?.plan && onboardingData.customPlanDetails ? (
                    <div className="border rounded-lg p-4 bg-accent/50 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                                {planImage && (
                                <Image
                                    src={planImage.imageUrl}
                                    alt={onboardingData.plan.name}
                                    width={150}
                                    height={150}
                                    className="rounded-lg object-cover"
                                    data-ai-hint={planImage.imageHint}
                                />
                            )}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <p className="font-bold text-xl">{onboardingData.plan.name}</p>
                                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                        <p><strong>Liters/Month:</strong> {onboardingData.customPlanDetails.litersPerMonth.toLocaleString()}</p>
                                        <p><strong>Bonus Liters:</strong> {onboardingData.customPlanDetails.bonusLiters.toLocaleString()}</p>
                                        <p><strong>Est. Bill/Month:</strong> ₱{onboardingData.plan.price.toLocaleString()}</p>
                                        <p><strong>Delivery:</strong> {onboardingData.customPlanDetails.deliveryFrequency} on {onboardingData.customPlanDetails.deliveryDay} at {onboardingData.customPlanDetails.deliveryTime}</p>
                                    </div>
                                </div>
                                <div className="border-t pt-4">
                                     <h4 className="font-semibold mb-2">Contract</h4>
                                      <Button variant="outline" disabled={!onboardingData.contractUrl}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        {onboardingData.contractUrl ? 'View Contract' : 'Contract Not Available'}
                                      </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                  ) : <p>No plan information available. Please complete onboarding.</p>}
                </TabsContent>
                
                <TabsContent value="invoices" className="py-4">
                    {onboardingData?.plan ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Invoice Summary</CardTitle>
                                <CardDescription>Your estimated recurring bill and payment options.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-baseline">
                                    <p className="text-muted-foreground">Estimated Monthly Bill</p>
                                    <p className="text-2xl font-bold">₱{onboardingData.plan.price.toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2">
                                     <Dialog>
                                        <DialogTrigger asChild>
                                             <Button className="flex-1">
                                                <CreditCard className="mr-2 h-4 w-4" />
                                                Pay Now
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Scan to Pay</DialogTitle>
                                                <DialogDescription>
                                                    Use your preferred payment method.
                                                </DialogDescription>
                                            </DialogHeader>
                                             <Tabs defaultValue="gcash" className="w-full">
                                                <TabsList className="grid w-full grid-cols-4">
                                                    <TabsTrigger value="gcash">GCash</TabsTrigger>
                                                    <TabsTrigger value="maya">Maya</TabsTrigger>
                                                    <TabsTrigger value="bank">Bank</TabsTrigger>
                                                    <TabsTrigger value="card">Card</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="gcash" className="mt-4 flex justify-center">
                                                    {gcashQr && <Image src={gcashQr.imageUrl} alt="GCash QR" width={250} height={250} data-ai-hint={gcashQr.imageHint} />}
                                                </TabsContent>
                                                <TabsContent value="maya" className="mt-4 flex justify-center">
                                                    {paymayaQr && <Image src={paymayaQr.imageUrl} alt="Maya QR" width={250} height={250} data-ai-hint={paymayaQr.imageHint} />}
                                                </TabsContent>
                                                <TabsContent value="bank" className="mt-4 flex justify-center">
                                                    {bankQr && <Image src={bankQr.imageUrl} alt="Bank QR" width={250} height={250} data-ai-hint={bankQr.imageHint} />}
                                                </TabsContent>
                                                 <TabsContent value="card" className="mt-4 flex justify-center">
                                                    {cardPayment && <Image src={cardPayment.imageUrl} alt="Card Payment Coming Soon" width={250} height={250} data-ai-hint={cardPayment.imageHint} />}
                                                </TabsContent>
                                            </Tabs>
                                        </DialogContent>
                                    </Dialog>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="flex-1">View History</Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-3xl">
                                            <DialogHeader>
                                                <DialogTitle>Invoice History</DialogTitle>
                                                <DialogDescription>A record of all your past and upcoming invoices.</DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4 max-h-[60vh] overflow-y-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Invoice ID</TableHead>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead className="text-right">Amount</TableHead>
                                                            <TableHead className="text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {paymentHistory.map((payment) => (
                                                            <TableRow key={payment.id}>
                                                                <TableCell className="font-medium">{payment.id}</TableCell>
                                                                <TableCell>{new Date(payment.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        variant={payment.status === 'Paid' ? 'default' : (payment.status === 'Upcoming' ? 'secondary' : 'outline')}
                                                                        className={payment.status === 'Paid' ? 'bg-green-100 text-green-800' : payment.status === 'Upcoming' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                                    >{payment.status}</Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right font-mono">₱{payment.amount.toFixed(2)}</TableCell>
                                                                <TableCell className="text-right">
                                                                    {payment.status === 'Upcoming' ? (
                                                                    <Button size="sm" onClick={() => { setSelectedInvoiceForProof(payment); setIsProofUploadDialogOpen(true); }}>
                                                                        <Upload className="mr-2 h-4 w-4" />
                                                                        Upload Proof
                                                                    </Button>
                                                                    ) : payment.proofOfPaymentUrl ? (
                                                                    <Button variant="outline" size="sm" asChild>
                                                                        <a href={payment.proofOfPaymentUrl} target="_blank" rel="noopener noreferrer">
                                                                            <Check className="mr-2 h-4 w-4" />
                                                                            View Proof
                                                                        </a>
                                                                    </Button>
                                                                    ) : (
                                                                    <Button variant="outline" size="sm" disabled>
                                                                        <Download className="mr-2 h-4 w-4" />
                                                                        Download
                                                                    </Button>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardContent>
                        </Card>
                    ) : <p>No invoice information available. Please complete onboarding.</p>}
                </TabsContent>

              </Tabs>
              <div className="flex justify-end pt-4">
                  <Button variant="outline">Logout</Button>
              </div>
            </DialogContent>
          </Dialog>
           <Dialog open={isProofUploadDialogOpen} onOpenChange={setIsProofUploadDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Proof of Payment</DialogTitle>
                        <DialogDescription>
                            Please upload a screenshot or document for invoice {selectedInvoiceForProof?.id}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input type="file" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsProofUploadDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => selectedInvoiceForProof && handleProofUpload(selectedInvoiceForProof.id)}>Upload & Mark as Paid</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="container mx-auto">
              {React.cloneElement(children as React.ReactElement, { userName })}
            </div>
          </main>
      </div>
  );
}
