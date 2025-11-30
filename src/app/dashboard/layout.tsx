
'use client';
import React, { useMemo } from 'react';
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
import { Bell, Truck, User, KeyRound, Info, Camera, Eye, EyeOff, LifeBuoy, Mail, Phone, Home, Layers, Receipt, Check, CreditCard, Download, QrCode, FileText, Upload, ArrowLeft, Droplets, MessageSquare, Edit, ShieldCheck, Send, Star, AlertTriangle, FileUp, Building, FileClock, History, Hourglass, Shield } from 'lucide-react';
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { LiveChat } from '@/components/live-chat';
import { format, differenceInMonths, addMonths } from 'date-fns';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import type { Payment, ImagePlaceholder, Feedback, PaymentOption, Delivery, ComplianceReport, SanitationVisit, WaterStation, AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { clientTypes } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type Notification = {
    id: string;
    type: 'delivery' | 'invoice' | 'compliance' | 'sanitation';
    title: string;
    description: string;
    date: string;
    icon: React.ElementType;
    data: Delivery | Payment | ComplianceReport | SanitationVisit;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const auth = getAuth();
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();
  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr-payment');
  const bankQr = PlaceHolderImages.find((p) => p.id === 'bpi-qr-payment');
  const paymayaQr = PlaceHolderImages.find((p) => p.id === 'maya-qr-payment');
  const cardQr = PlaceHolderImages.find((p) => p.id === 'card-payment-qr');


  const paymentOptions: PaymentOption[] = [
      { name: 'GCash', qr: gcashQr, details: { accountName: 'Jimboy Regalado', accountNumber: '09989811596' } },
      { name: 'BPI', qr: bankQr, details: { accountName: 'Jimboy Regalado', accountNumber: '3489145013' } },
      { name: 'PayMaya', qr: paymayaQr, details: { accountName: 'Jimboy Regalado', accountNumber: '09557750188' } },
      { name: 'Credit Card', qr: cardQr }
  ];


  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);
  
  const stationDocRef = useMemoFirebase(() => (firestore && user?.assignedWaterStationId) ? doc(firestore, 'waterStations', user.assignedWaterStationId) : null, [firestore, user]);
  const { data: waterStation } = useDoc<WaterStation>(stationDocRef);
  
  const deliveriesQuery = useMemoFirebase(() => (firestore && authUser) ? collection(firestore, 'users', authUser.uid, 'deliveries') : null, [firestore, authUser]);
  const { data: deliveries } = useCollection<Delivery>(deliveriesQuery);

  const paymentsQuery = useMemoFirebase(() => (firestore && authUser) ? collection(firestore, 'users', authUser.uid, 'payments') : null, [firestore, authUser]);
  const { data: paymentHistoryFromDb } = useCollection<Payment>(paymentsQuery);
  
  const [editableFormData, setEditableFormData] = React.useState<Partial<AppUser>>({});
  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Payment | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<PaymentOption | null>(null);
  
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = React.useState(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState('');
  const [feedbackRating, setFeedbackRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [isSwitchProviderDialogOpen, setIsSwitchProviderDialogOpen] = React.useState(false);
  const [switchReason, setSwitchReason] = React.useState('');
  const [switchUrgency, setSwitchUrgency] = React.useState('');
  const [hasNewMessage, setHasNewMessage] = React.useState(false);
  const [paymentProofFile, setPaymentProofFile] = React.useState<File | null>(null);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isUserLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isUserLoading, router]);

  React.useEffect(() => {
    if(user) {
      setEditableFormData(user);
    }
  }, [user]);
  
  React.useEffect(() => {
    if (!isPaymentDialogOpen) {
      // Reset payment method selection when dialog closes
      setSelectedPaymentMethod(null);
      setPaymentProofFile(null);
    }
  }, [isPaymentDialogOpen]);

  const handleLogout = () => {
    signOut(auth).then(() => {
      router.push('/login');
    })
  }

  const handleProofUpload = async () => {
    if (!authUser || !firestore || !paymentProofFile || !selectedInvoice) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Please select an invoice and a file to upload.' });
      return;
    }
    const storage = getStorage();
    const filePath = `users/${authUser.uid}/payments/${selectedInvoice.id}/${paymentProofFile.name}`;
    const storageRef = ref(storage, filePath);
  
    try {
      await uploadBytes(storageRef, paymentProofFile);
      const downloadURL = await getDownloadURL(storageRef);
  
      const paymentRef = doc(firestore, 'users', authUser.uid, 'payments', selectedInvoice.id);
      
      const paymentData: Payment = {
        id: selectedInvoice.id,
        date: selectedInvoice.date,
        description: selectedInvoice.description,
        amount: selectedInvoice.amount,
        status: 'Pending Review',
        proofOfPaymentUrl: downloadURL,
      };

      setDocumentNonBlocking(paymentRef, paymentData, { merge: true });
  
      toast({ title: 'Proof Submitted', description: 'Your proof of payment is now pending for verification.' });
      setIsPaymentDialogOpen(false);
      setSelectedInvoice(null);
      setPaymentProofFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload proof of payment. Please try again.' });
    }
  };

  const handleAccountInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableFormData({
        ...editableFormData,
        [e.target.name]: e.target.value
    });
  };

  const handleSaveChanges = () => {
    if (userDocRef && editableFormData) {
        updateDocumentNonBlocking(userDocRef, editableFormData);
        setIsEditingDetails(false);
        toast({
            title: "Changes Saved",
            description: "Your account details have been successfully updated.",
        });
    }
  };

  const handleCancelEdit = () => {
    if (user) {
        setEditableFormData(user);
    }
    setIsEditingDetails(false);
  }

  const handlePasswordChange = () => {
    toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
    });
    setIsPasswordDialogOpen(false);
  }
  
    const handleFeedbackSubmit = () => {
        toast({
            title: 'Feedback Received',
            description: 'Thank you for your valuable input. We appreciate it!',
        });
        setIsFeedbackDialogOpen(false);
        setFeedbackMessage('');
        setFeedbackRating(0);
        setHoverRating(0);
    };

    const handleSwitchProviderSubmit = () => {
        toast({
            title: 'Request Sent',
            description: 'Your request to switch providers has been submitted to the admin team.',
        });
        setIsSwitchProviderDialogOpen(false);
        setSwitchReason('');
        setSwitchUrgency('');
    };
    
  const handlePaymentOptionClick = (option: PaymentOption) => {
    if (option.name === 'Credit Card') {
      toast({
        title: 'Coming Soon!',
        description: 'Credit card payment will be available shortly.',
      });
      return;
    }
    setSelectedPaymentMethod(option);
  };

    const planImage = useMemo(() => {
      if (!user?.clientType) return null;
      const clientTypeDetails = clientTypes.find(ct => ct.name === user.clientType);
      if (!clientTypeDetails) return null;
      return PlaceHolderImages.find(p => p.id === clientTypeDetails.imageId);
    }, [user]);

    const generatedInvoices = React.useMemo(() => {
      if (!user?.createdAt || !user.plan) return [];
      
      const invoices: Payment[] = [];
      const now = new Date();
      // Firestore serverTimestamp is an object, not a Date, so we check for 'toDate' method
      const startDate = typeof user.createdAt.toDate === 'function' ? user.createdAt.toDate() : new Date();
      const months = differenceInMonths(now, startDate);
  
      for (let i = 0; i <= months; i++) {
        const invoiceDate = addMonths(startDate, i);
        invoices.push({
          id: `INV-${format(invoiceDate, 'yyyyMM')}`,
          date: invoiceDate.toISOString(),
          description: `${user.plan.name} - ${format(invoiceDate, 'MMMM yyyy')}`,
          amount: user.plan.price,
          status: 'Upcoming', // Default status, can be updated from DB
        });
      }

      // Merge with DB payments
      const mergedInvoices = invoices.map(inv => {
        const dbInvoice = paymentHistoryFromDb?.find(p => p.id === inv.id);
        return dbInvoice ? { ...inv, ...dbInvoice } : inv;
      });

      return mergedInvoices.reverse();
    }, [user, paymentHistoryFromDb]);


  if (isUserLoading || isUserDocLoading) {
    return <div>Loading...</div>
  }


  return (
      <div className="flex flex-col h-full">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
            <div className="flex items-center">
                <span className="font-bold">River Business</span>
            </div>
          </Link>
          <div className="flex-1" />
          <Dialog onOpenChange={(open) => !open && setHasNewMessage(false)}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full relative"
              >
                <span className="mr-2 hidden sm:inline">Need Support?</span>
                <LifeBuoy className="h-4 w-4" />
                 {hasNewMessage && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background" />}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-bold">Hello, {user?.name}!</DialogTitle>
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
                         <LiveChat setHasNewMessage={setHasNewMessage} />
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
                   {notifications.length > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">
                          {notifications.length}
                        </Badge>
                   )}
              </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96">
              <div className="space-y-2">
                  <div className="flex justify-between items-center">
                  <h4 className="font-medium text-sm">Notifications</h4>
                   {notifications.length > 0 && (
                      <Badge variant="secondary" className="rounded-sm">
                          {notifications.length} New
                      </Badge>
                   )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your recent account updates.
                  </p>
              </div>
              <Separator className="my-4" />
                <div className="space-y-4 max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                        notifications.map((notification) => {
                            const Icon = notification.icon;
                            return (
                                <div key={notification.id} className="grid grid-cols-[25px_1fr] items-start gap-4">
                                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {notification.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {notification.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{format(new Date(notification.date), 'PP')}</p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No new notifications.</p>
                    )}
                </div>
              </PopoverContent>
          </Popover>
          <Dialog>
            <DialogTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="hidden sm:flex flex-col items-start">
                  <p className="font-semibold text-sm">{user?.name}</p>
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
                  <TabsTrigger value="plan"><FileText className="mr-2" />Plan</TabsTrigger>
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
                                        <Label htmlFor="clientId">Client ID</Label>
                                        <Input id="clientId" name="clientId" value={editableFormData.clientId || ''} disabled />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="fullName">Full Name</Label>
                                        <Input id="fullName" name="name" value={editableFormData.name || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="email">Login Email</Label>
                                        <Input id="email" name="email" type="email" value={editableFormData.email || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails} />
                                    </div>
                                     <div className="space-y-1">
                                        <Label htmlFor="businessEmail">Business Email</Label>
                                        <Input id="businessEmail" name="businessEmail" type="email" value={editableFormData.businessEmail || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="businessName">Business Name</Label>
                                        <Input id="businessName" name="businessName" value={editableFormData.businessName || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails}/>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address">Address</Label>
                                        <Input id="address" name="address" value={editableFormData.address || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails}/>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="contactNumber">Contact Number</Label>
                                        <Input id="contactNumber" name="contactNumber" type="tel" value={editableFormData.contactNumber || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails}/>
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
                                <div className="space-y-2 mb-4">
                                    <Label htmlFor="uid">User ID (UID)</Label>
                                    <Input id="uid" value={authUser?.uid || ''} disabled />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={() => setIsPasswordDialogOpen(true)}><KeyRound className="mr-2 h-4 w-4" />Update Password</Button>
                                    <Button variant="outline" onClick={() => toast({ title: "Coming soon!" })}><Shield className="mr-2 h-4 w-4" />Enable 2FA</Button>
                                </div>
                            </div>
                        </div>
                    ) : <p>No account information available.</p>}
                </TabsContent>

                <TabsContent value="plan" className="py-4">
                  {user?.plan ? (
                      <Card>
                          <CardHeader>
                              <CardTitle>Your Current Plan</CardTitle>
                              <CardDescription>Details of your subscription with River Business.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                              {planImage && (
                                <div className="relative h-40 w-full rounded-lg overflow-hidden">
                                  <Image src={planImage.imageUrl} alt={user.clientType || 'Plan Image'} fill style={{objectFit: 'cover'}} data-ai-hint={planImage.imageHint} />
                                </div>
                              )}
                              <div className="flex justify-between items-baseline">
                                  <h3 className="text-xl font-bold">{user.plan.name}</h3>
                                  <p className="text-2xl font-bold">
                                      ₱{user.plan.price.toLocaleString()}
                                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                                  </p>
                              </div>
                              <Separator />
                              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                  <div>
                                      <p className="font-medium text-muted-foreground">Liters per Month</p>
                                      <p>{user.customPlanDetails?.litersPerMonth?.toLocaleString() || 'N/A'}</p>
                                  </div>
                                  <div>
                                      <p className="font-medium text-muted-foreground">Bonus Liters</p>
                                      <p>{user.customPlanDetails?.bonusLiters?.toLocaleString() || 'N/A'}</p>
                                  </div>
                                  <div>
                                      <p className="font-medium text-muted-foreground">Delivery Frequency</p>
                                      <p>{user.customPlanDetails?.deliveryFrequency || 'N/A'}</p>
                                  </div>
                                  <div>
                                      <p className="font-medium text-muted-foreground">Preferred Delivery Day</p>
                                      <p>{user.customPlanDetails?.deliveryDay || 'N-A'}</p>
                                  </div>
                                  <div>
                                      <p className="font-medium text-muted-foreground">Preferred Delivery Time</p>
                                      <p>{user.customPlanDetails?.deliveryTime || 'N-A'}</p>
                                  </div>
                                  <Separator className="col-span-2 my-2"/>
                                   <div>
                                      <p className="font-medium text-muted-foreground">Gallon Quantity</p>
                                      <p>{user.customPlanDetails?.gallonQuantity || '0'}</p>
                                  </div>
                                    <div>
                                      <p className="font-medium text-muted-foreground">Monthly Gallon Fee</p>
                                      <p>₱{user.customPlanDetails?.gallonPrice?.toLocaleString() || '0'}</p>
                                  </div>
                                   <div>
                                      <p className="font-medium text-muted-foreground">Dispenser Quantity</p>
                                      <p>{user.customPlanDetails?.dispenserQuantity || '0'}</p>
                                  </div>
                                  <div>
                                      <p className="font-medium text-muted-foreground">Monthly Dispenser Fee</p>
                                      <p>₱{user.customPlanDetails?.dispenserPrice?.toLocaleString() || '0'}</p>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  ) : (
                      <p className="text-center text-muted-foreground py-8">You have not selected a plan yet.</p>
                  )}
              </TabsContent>

                <TabsContent value="invoices" className="py-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Invoice History</CardTitle>
                                <CardDescription>A record of all your past and upcoming invoices.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => toast({title: "Coming soon!"})}>
                                <History className="mr-2 h-4 w-4" />
                                History
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice ID</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {generatedInvoices.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell className="font-medium">{payment.id}</TableCell>
                                            <TableCell>{format(new Date(payment.date), 'PP')}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={payment.status === 'Paid' ? 'default' : (payment.status === 'Upcoming' ? 'secondary' : 'outline')}
                                                    className={payment.status === 'Paid' ? 'bg-green-100 text-green-800' : payment.status === 'Upcoming' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                >{payment.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">₱{payment.amount.toFixed(2)}</TableCell>
                                            <TableCell className="text-center">
                                                <div className='flex gap-2 justify-center'>
                                                {(payment.status === 'Upcoming' || payment.status === 'Overdue') && (
                                                    <Button size="sm" onClick={() => { setSelectedInvoice(payment); setIsPaymentDialogOpen(true); }}>
                                                        <CreditCard className="mr-2 h-4 w-4" />
                                                        Pay Now
                                                    </Button>
                                                )}
                                                {payment.status === 'Pending Review' && (
                                                     <Button variant="secondary" size="sm" onClick={() => setIsVerificationDialogOpen(true)}>
                                                        <Hourglass className="mr-2 h-4 w-4" />
                                                        Processing
                                                    </Button>
                                                )}
                                                {payment.status === 'Paid' && payment.proofOfPaymentUrl && (
                                                    <Button variant="outline" size="sm" asChild>
                                                        <a href={payment.proofOfPaymentUrl} target="_blank" rel="noopener noreferrer">
                                                            <Check className="mr-2 h-4 w-4" />
                                                            View Proof
                                                        </a>
                                                    </Button>
                                                )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

              </Tabs>
              <div className="flex justify-end pt-4">
                  <Button variant="outline" onClick={handleLogout}>Logout</Button>
              </div>
            </DialogContent>
          </Dialog>
           <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Pay Invoice {selectedInvoice?.id}</DialogTitle>
                        <DialogDescription>
                            Complete your payment of ₱{selectedInvoice?.amount.toFixed(2)}.
                        </DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="qr">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="qr"><QrCode className="mr-2 h-4 w-4" />Scan to Pay</TabsTrigger>
                            <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4" />Upload Proof</TabsTrigger>
                        </TabsList>
                        <TabsContent value="qr" className="py-4">
                            {!selectedPaymentMethod ? (
                                <div className="space-y-4">
                                     <p className="text-sm text-muted-foreground text-center">Select a payment method to see the QR code.</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {paymentOptions.map((opt) => (
                                        <Card
                                            key={opt.name}
                                            className="flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-accent transition-colors"
                                            onClick={() => handlePaymentOptionClick(opt)}
                                        >
                                            {opt.qr && <Image src={opt.qr.imageUrl} alt={opt.name} width={60} height={60} className="mb-2 rounded-md" data-ai-hint={opt.qr.imageHint} />}
                                            <p className="font-semibold text-sm">{opt.name}</p>
                                        </Card>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <Button variant="ghost" size="sm" className="self-start" onClick={() => setSelectedPaymentMethod(null)}>
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back
                                    </Button>
                                    <h3 className="font-semibold text-lg">Scan to Pay with {selectedPaymentMethod.name}</h3>
                                    {selectedPaymentMethod.qr && (
                                        <div className="p-4 border rounded-lg bg-white">
                                            <Image src={selectedPaymentMethod.qr.imageUrl} alt={`${selectedPaymentMethod.name} QR Code`} width={200} height={200} data-ai-hint={selectedPaymentMethod.qr.imageHint} />
                                        </div>
                                    )}
                                    <div className="text-center text-sm text-muted-foreground space-y-1">
                                        <p>Account Name: <span className="font-medium text-foreground">{selectedPaymentMethod.details?.accountName}</span></p>
                                        <p>Account Number: <span className="font-medium text-foreground">{selectedPaymentMethod.details?.accountNumber}</span></p>
                                        <p className="font-bold text-foreground pt-2">Total Amount: ₱{selectedInvoice?.amount.toFixed(2)}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center mt-2">After paying, please go to the 'Upload Proof' tab to submit your payment confirmation.</p>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="upload" className="py-4">
                            <div className="grid gap-4">
                                <Label htmlFor="payment-proof">Upload Screenshot or Document</Label>
                                <Input id="payment-proof" type="file" onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)} />
                                <Button onClick={handleProofUpload}>Submit for Verification</Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
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
                        <DialogTitle>Rate {waterStation ? waterStation.name : 'Your Water Station'}</DialogTitle>
                        <DialogDescription>
                            We value your opinion. Let us know how we can improve our service.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
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

            <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Payment Verification Status</DialogTitle>
                        <DialogDescription>
                            Your payment is being processed by our team.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-8">
                        <ul className="relative flex justify-between">
                            <li className="relative flex flex-col items-center w-1/3">
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary -translate-y-1/2" />
                                <div className="relative h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="h-4 w-4 text-primary-foreground" />
                                </div>
                                <p className="text-xs text-center mt-2">Payment Submitted</p>
                            </li>
                             <li className="relative flex flex-col items-center w-1/3">
                                <div className={cn("relative h-6 w-6 rounded-full flex items-center justify-center", "bg-primary")}>
                                    <Hourglass className="h-4 w-4 text-primary-foreground animate-spin" />
                                </div>
                                <p className="text-xs text-center mt-2 font-semibold">Pending Verification</p>
                            </li>
                             <li className="relative flex flex-col items-center w-1/3">
                                <div className="absolute top-1/2 right-0 w-full h-0.5 bg-border -translate-y-1/2" />
                                 <div className={cn("relative h-6 w-6 rounded-full flex items-center justify-center", "bg-border")}>
                                     <Check className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-xs text-center text-muted-foreground mt-2">Payment Confirmed</p>
                            </li>
                        </ul>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="container mx-auto">
              {children}
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
