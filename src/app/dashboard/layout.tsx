

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
import { Bell, Truck, User, KeyRound, Info, Camera, Eye, EyeOff, LifeBuoy, Mail, Phone, Home, Layers, Receipt, Check, CreditCard, Download, QrCode, FileText, Upload, ArrowLeft, Droplets, MessageSquare, Edit, ShieldCheck, Send, Star, AlertTriangle, FileUp, Building } from 'lucide-react';
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { deliveries, paymentHistory as initialPaymentHistory, waterStations } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { LiveChat } from '@/components/live-chat';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import type { Payment, ImagePlaceholder, Feedback, PaymentOption } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';


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
  const { toast } = useToast();

  const [userName, setUserName] = useState('Juan dela Cruz');
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>(initialPaymentHistory);
  const [editableFormData, setEditableFormData] = useState<OnboardingData['formData'] | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  
  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr-payment');
  const bpiQr = PlaceHolderImages.find((p) => p.id === 'bpi-qr-payment');
  const mayaQr = PlaceHolderImages.find((p) => p.id === 'maya-qr-payment');

  const [isProofUploadDialogOpen, setIsProofUploadDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedInvoiceForProof, setSelectedInvoiceForProof] = useState<Payment | null>(null);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<PaymentOption | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedStation, setSelectedStation] = useState('');
  const [isSwitchProviderDialogOpen, setIsSwitchProviderDialogOpen] = useState(false);
  const [switchReason, setSwitchReason] = useState('');
  const [switchUrgency, setSwitchUrgency] = useState('');

  const recentDeliveries = deliveries.slice(0, 4);


  useEffect(() => {
    const storedOnboardingData = localStorage.getItem('onboardingData');
    if (storedOnboardingData) {
      const data = JSON.parse(storedOnboardingData);
      setOnboardingData(data);
      setEditableFormData(data.formData);
      if (data.formData && data.formData.fullName) {
        setUserName(data.formData.fullName);
      }
      
      // Update payment history with plan price
      setPaymentHistory(prevHistory => {
          const updatedHistory = prevHistory.map(invoice => 
              invoice.status === 'Upcoming' 
                  ? { ...invoice, amount: data.plan.price || invoice.amount }
                  : invoice
          );

          const hasUpcomingInvoice = updatedHistory.some(inv => inv.status === 'Upcoming');

          if (!hasUpcomingInvoice && data.plan && data.plan.price > 0) {
              const newUpcomingInvoice: Payment = {
                  id: `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
                  date: new Date().toISOString(),
                  description: `Bill for ${format(new Date(), 'MMMM yyyy')}`,
                  amount: data.plan.price,
                  status: 'Upcoming',
              };
              return [...updatedHistory, newUpcomingInvoice];
          }
          
          return updatedHistory;
      });
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

  const handleAccountInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editableFormData) {
        setEditableFormData({
            ...editableFormData,
            [e.target.name]: e.target.value
        });
    }
  };

  const handleSaveChanges = () => {
    if (onboardingData && editableFormData) {
        const updatedData = { ...onboardingData, formData: editableFormData };
        localStorage.setItem('onboardingData', JSON.stringify(updatedData));
        setOnboardingData(updatedData);
        setUserName(editableFormData.fullName);
        setIsEditingDetails(false);
        toast({
            title: "Account Updated",
            description: "Your account information has been saved.",
        });
    }
  };

  const handleCancelEdit = () => {
    if (onboardingData) {
        setEditableFormData(onboardingData.formData);
    }
    setIsEditingDetails(false);
  }

  const handlePasswordChange = () => {
    toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
    });
    setIsPasswordDialogOpen(false);
  }

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
  
    const handleFeedbackSubmit = () => {
        const station = waterStations[0]; // Assume first station
        if (feedbackMessage.trim() === '' || feedbackRating === 0) {
            toast({
                variant: 'destructive',
                title: 'Incomplete Feedback',
                description: 'Please provide a rating and write a message.'
            });
            return;
        }

        const newFeedback: Feedback = {
            id: `FB-${Date.now()}`,
            userId: 'USR-001', // This should be dynamic based on logged in user
            userName: userName,
            timestamp: new Date().toISOString(),
            feedback: `[${station.name}] ${feedbackMessage}`,
            rating: feedbackRating,
            read: false,
        };

        const existingFeedback = JSON.parse(localStorage.getItem('feedbackLogs') || '[]');
        localStorage.setItem('feedbackLogs', JSON.stringify([...existingFeedback, newFeedback]));

        toast({
            title: 'Feedback Submitted!',
            description: 'Thank you for your valuable input.',
        });

        setIsFeedbackDialogOpen(false);
        setFeedbackMessage('');
        setFeedbackRating(0);
        setHoverRating(0);
    };

    const handleSwitchProviderSubmit = () => {
        if (switchReason.trim() === '' || !switchUrgency) {
            toast({
                variant: 'destructive',
                title: 'Incomplete Request',
                description: 'Please provide a reason and select an urgency level.',
            });
            return;
        }

        console.log({
            type: 'Switch Provider Request',
            reason: switchReason,
            urgency: switchUrgency,
        });

        toast({
            title: 'Request Submitted',
            description: 'Your request to switch providers has been sent to the admin team.',
        });

        setIsSwitchProviderDialogOpen(false);
        setSwitchReason('');
        setSwitchUrgency('');
    };

  const planImage = onboardingData?.plan?.imageId ? PlaceHolderImages.find(p => p.id === onboardingData.plan.imageId) : null;

  const paymentOptions: PaymentOption[] = [
      { name: 'GCash', qr: gcashQr, details: { accountName: 'Jimboy Regalado', accountNumber: '09989811596' } },
      { name: 'Maya', qr: mayaQr, details: { accountName: 'Jimboy Regalado', accountNumber: '09557750188' } },
      { name: 'Bank', qr: bpiQr, details: { bankName: 'Bank of the Philippine Islands', accountName: 'Jimboy Regalado', accountNumber: '3489145013' } },
      { name: 'Card' },
  ];

  const handlePaymentOptionClick = (option: PaymentOption) => {
    if (option.name === 'Card') {
        toast({
            title: "Coming Soon!",
            description: "Card payment option is currently under development."
        });
    } else {
        setSelectedPaymentOption(option);
    }
  };

  const assignedWaterStation = waterStations[0];

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
                className="rounded-full"
              >
                <span className="mr-2 hidden sm:inline">Need Support?</span>
                <LifeBuoy className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-bold">Hello, {userName}!</DialogTitle>
                    <DialogDescription>
                        Our team is ready to assist you. Please use the contact details below, and we'll get back to you as soon as possible.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-8 py-4 flex-1 overflow-hidden">
                    <div className="space-y-8 flex flex-col">
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
                       <div className="mt-auto pt-4 text-center text-sm space-y-4">
                         <div className="flex justify-center gap-2">
                             <Button variant="outline" onClick={() => setIsFeedbackDialogOpen(true)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Submit Feedback
                             </Button>
                             <Button variant="outline" onClick={() => setIsSwitchProviderDialogOpen(true)}>
                                <FileUp className="h-4 w-4 mr-2" />
                                Switch Provider
                             </Button>
                         </div>
                        <p className="text-balance text-muted-foreground mt-4">Your Drinking Water, Safe & Simplified.</p>
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
                    {editableFormData ? (
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-semibold">Your Details</h4>
                                   {!isEditingDetails && <Button variant="outline" size="sm" onClick={() => setIsEditingDetails(true)}><Edit className="mr-2 h-4 w-4" />Edit Details</Button>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                    <div className="space-y-1">
                                        <Label htmlFor="fullName">Full Name</Label>
                                        <Input id="fullName" name="fullName" value={editableFormData.fullName} onChange={handleAccountInfoChange} disabled={!isEditingDetails} />
                                    </div>
                                     <div className="space-y-1">
                                        <Label htmlFor="clientId">Client ID</Label>
                                        <Input id="clientId" name="clientId" value={editableFormData.clientId} disabled />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" name="email" type="email" value={editableFormData.email} onChange={handleAccountInfoChange} disabled={!isEditingDetails} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="businessName">Business Name</Label>
                                        <Input id="businessName" name="businessName" value={editableFormData.businessName} onChange={handleAccountInfoChange} disabled={!isEditingDetails}/>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address">Address</Label>
                                        <Input id="address" name="address" value={editableFormData.address} onChange={handleAccountInfoChange} disabled={!isEditingDetails}/>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="contactNumber">Contact Number</Label>
                                        <Input id="contactNumber" name="contactNumber" type="tel" value={editableFormData.contactNumber} onChange={handleAccountInfoChange} disabled={!isEditingDetails}/>
                                    </div>
                                </div>
                                {isEditingDetails && (
                                    <div className="flex justify-end gap-2 mt-4">
                                        <Button variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
                                        <Button onClick={handleSaveChanges}>Save Changes</Button>
                                    </div>
                                )}
                            </div>
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-4">Security</h4>
                                <div className="flex gap-2">
                                    <Button onClick={() => setIsPasswordDialogOpen(true)}><KeyRound className="mr-2 h-4 w-4" />Update Password</Button>
                                    <Button variant="outline" onClick={() => toast({ title: "Coming Soon!", description: "This feature is under development." })}>
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        Add Authentication
                                    </Button>
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
                                     <Dialog onOpenChange={() => setSelectedPaymentOption(null)}>
                                        <DialogTrigger asChild>
                                             <Button className="flex-1">
                                                <CreditCard className="mr-2 h-4 w-4" />
                                                Pay Now
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                {selectedPaymentOption ? (
                                                     <Button variant="ghost" className="absolute top-3 left-3 h-8 w-8 p-0" onClick={() => setSelectedPaymentOption(null)}>
                                                        <ArrowLeft className="h-4 w-4" />
                                                    </Button>
                                                ): null}
                                                <DialogTitle className={cn(selectedPaymentOption ? 'text-center' : '')}>
                                                  {selectedPaymentOption ? `Scan to Pay with ${selectedPaymentOption.name}` : 'Select Payment Method'}
                                                </DialogTitle>
                                                <DialogDescription className={cn(selectedPaymentOption ? 'text-center' : '')}>
                                                    {selectedPaymentOption ? 'Use your preferred payment app to scan.' : 'Choose your preferred payment method below.'}
                                                </DialogDescription>
                                            </DialogHeader>
                                            {selectedPaymentOption?.qr ? (
                                                <div className="flex flex-col items-center justify-center py-4 gap-4">
                                                    <Image src={selectedPaymentOption.qr.imageUrl} alt={selectedPaymentOption.qr.description} width={250} height={250} data-ai-hint={selectedPaymentOption.qr.imageHint} />
                                                     {selectedPaymentOption.details && (
                                                        <div className="text-center text-sm space-y-1">
                                                            {selectedPaymentOption.details.bankName && <p><strong>Bank:</strong> {selectedPaymentOption.details.bankName}</p>}
                                                            <p><strong>Account Name:</strong> {selectedPaymentOption.details.accountName}</p>
                                                            <p><strong>Account Number:</strong> {selectedPaymentOption.details.accountNumber}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                 <div className="grid grid-cols-2 gap-4 py-4">
                                                    {paymentOptions.map(option => (
                                                        <Card key={option.name} className="flex flex-col items-center justify-center p-4 hover:bg-accent cursor-pointer" onClick={() => handlePaymentOptionClick(option)}>
                                                            <p className="font-semibold">{option.name}</p>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
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
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Password</DialogTitle>
                        <DialogDescription>
                           Enter your current and new password to update.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="space-y-4 py-4">
                        <div className="space-y-1 relative">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} />
                            <Button size="icon" variant="ghost" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                            <div className="space-y-1 relative">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input id="new-password" type={showNewPassword ? 'text' : 'password'} />
                            <Button size="icon" variant="ghost" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)}>
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                            <div className="space-y-1 relative">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} />
                            <Button size="icon" variant="ghost" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handlePasswordChange}>Change Password</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rate Your Water Station</DialogTitle>
                        <DialogDescription>
                            We value your opinion. Let us know how we can improve our service.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {assignedWaterStation && (
                            <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/50">
                                <Building className="h-6 w-6 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">{assignedWaterStation.name}</p>
                                    <p className="text-sm text-muted-foreground">{assignedWaterStation.location}</p>
                                </div>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="feedback-rating" className="mb-2 block">Rating</Label>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={cn(
                                            'h-6 w-6 cursor-pointer',
                                            (hoverRating >= star || feedbackRating >= star)
                                                ? 'text-yellow-400 fill-yellow-400'
                                                : 'text-muted-foreground'
                                        )}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setFeedbackRating(star)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="feedback-message">Recommendation / Message</Label>
                            <Textarea
                                id="feedback-message"
                                placeholder="Tell us about your experience with this station..."
                                value={feedbackMessage}
                                onChange={(e) => setFeedbackMessage(e.target.value)}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleFeedbackSubmit}>
                            <Send className="mr-2 h-4 w-4" />
                            Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

          <Dialog open={isSwitchProviderDialogOpen} onOpenChange={setIsSwitchProviderDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request to Switch Provider</DialogTitle>
                        <DialogDescription>
                           Please provide the details for your request. An admin will review it shortly.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="switch-urgency">Urgency</Label>
                            <Select onValueChange={setSwitchUrgency} value={switchUrgency}>
                                <SelectTrigger id="switch-urgency">
                                    <SelectValue placeholder="Select urgency level..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low - Not urgent</SelectItem>
                                    <SelectItem value="medium">Medium - Important</SelectItem>
                                    <SelectItem value="high">High - Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="switch-reason">Reason for Switching</Label>
                            <Textarea
                                id="switch-reason"
                                placeholder="Please describe why you want to switch providers..."
                                value={switchReason}
                                onChange={(e) => setSwitchReason(e.target.value)}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSwitchProviderSubmit}>
                            <Send className="mr-2 h-4 w-4" />
                            Submit Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="container mx-auto">
              {React.cloneElement(children as React.ReactElement, { userName })}
            </div>
          </main>
          <footer className="p-4 text-center text-xs text-muted-foreground border-t">
              v1.0.0 - Smart Refill is a trademark and product name of{' '}
              <a href="https://riverph.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  River Philippines
              </a>.
          </footer>
      </div>
  );
}


    
