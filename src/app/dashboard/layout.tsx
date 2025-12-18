
'use client';
import React, { useMemo, useState, useEffect } from 'react';
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
import { Bell, Truck, User, KeyRound, Info, Camera, Eye, EyeOff, LifeBuoy, Mail, Phone, Home, Layers, Receipt, Check, CreditCard, Download, QrCode, FileText, Upload, ArrowLeft, Droplets, MessageSquare, Edit, ShieldCheck, Send, Star, AlertTriangle, FileUp, Building, FileClock, History, Hourglass, Shield, Package, Calendar, Repeat, Wrench, Headset, Rocket, LayoutGrid, Thermometer, CalendarCheck, HelpCircle, FileX, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { LiveChat, type Message as ChatMessage } from '@/components/live-chat';
import { format, differenceInMonths, addMonths } from 'date-fns';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import type { Payment, ImagePlaceholder, Feedback, PaymentOption, Delivery, ComplianceReport, SanitationVisit, WaterStation, AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, useStorage, useAuth } from '@/firebase';
import { doc, collection, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { clientTypes } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMounted } from '@/hooks/use-mounted';
import { MyAccountDialog } from '@/components/MyAccountDialog';

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
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isMounted = useMounted();
  const auth = useAuth();

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
  
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Payment | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<PaymentOption | null>(null);

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
  const [uploadProgress, setUploadProgress] = React.useState(0);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'admin', content: "Hello! How can I help you today?" }
  ]);

  
  React.useEffect(() => {
    if (isUserLoading) return;

    if (!authUser) {
      router.push('/login');
      return;
    }
    
    const checkOnboarding = async () => {
        if (!firestore) return;
        const userDoc = await getDoc(doc(firestore, 'users', authUser.uid));
        if (!userDoc.exists() || !userDoc.data()?.onboardingComplete) {
            router.push('/onboarding');
        }
    }
    checkOnboarding();

  }, [authUser, isUserLoading, router, firestore]);

  useEffect(() => {
    if (!userDocRef || !auth) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateDocumentNonBlocking(userDocRef, { accountStatus: 'Inactive' });
      } else {
        updateDocumentNonBlocking(userDocRef, { accountStatus: 'Active', lastLogin: new Date().toISOString() });
      }
    };

    updateDocumentNonBlocking(userDocRef, { accountStatus: 'Active', lastLogin: new Date().toISOString() });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (auth.currentUser) {
        updateDocumentNonBlocking(userDocRef, { accountStatus: 'Inactive' });
      }
    };
  }, [userDocRef, auth]);
  
  React.useEffect(() => {
    if (!isPaymentDialogOpen) {
      setSelectedPaymentMethod(null);
      setPaymentProofFile(null);
    }
  }, [isPaymentDialogOpen]);

  const handleLogout = () => {
    if (!auth) return;
    signOut(auth).then(() => {
      router.push('/login');
    })
  }

  const handleProofUpload = async () => {
    // This logic needs to be revisited, using a more robust upload utility
  };

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

  const handleMessageSubmit = (messageContent: string) => {
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
    };
    setChatMessages((prev) => [...prev, newUserMessage]);

    setTimeout(() => {
      const adminResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'admin',
        content: "Thanks for your message. An admin will be with you shortly."
      };
      setChatMessages((prev) => [...prev, adminResponse]);
      setHasNewMessage(true);
    }, 1500);
  };

    const planImage = useMemo(() => {
      if (!user?.clientType) return null;
      const clientTypeDetails = clientTypes.find(ct => ct.name === user.clientType);
      if (!clientTypeDetails) return null;
      return PlaceHolderImages.find(p => p.id === clientTypeDetails.imageId);
    }, [user]);

    const generatedInvoices = React.useMemo(() => {
        if (!user?.createdAt || !user.plan || user.plan.isConsumptionBased) return [];
        
        const invoices: Payment[] = [];
        const now = new Date();
        const createdAt = user.createdAt;
        const startDate = typeof (createdAt as any)?.toDate === 'function' 
            ? (createdAt as any).toDate() 
            : new Date(createdAt as string);
        
        if (isNaN(startDate.getTime())) return [];
        
        const months = differenceInMonths(now, startDate);
    
        for (let i = 0; i <= months; i++) {
            const invoiceDate = addMonths(startDate, i);
            invoices.push({
            id: `INV-${format(invoiceDate, 'yyyyMM')}`,
            date: invoiceDate.toISOString(),
            description: `${user.plan.name} - ${format(invoiceDate, 'MMMM yyyy')}`,
            amount: user.plan.price,
            status: 'Upcoming', 
            });
        }

        const mergedInvoices = invoices.map(inv => {
            const dbInvoice = paymentHistoryFromDb?.find(p => p.id === inv.id);
            return dbInvoice ? { ...inv, ...dbInvoice } : inv;
        });

        return mergedInvoices.reverse();
    }, [user, paymentHistoryFromDb]);


  if (isUserLoading || isUserDocLoading || !isMounted) {
    return <div>Loading...</div>
  }

  const displayPhoto = user?.photoURL;

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
                <span className="relative flex items-center mr-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                </span>
                <span className="mr-2 hidden sm:inline">Live Support</span>
                <LifeBuoy className="h-4 w-4" />
                 {hasNewMessage && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background" />}
              </Button>
            </DialogTrigger>
             <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-bold">Hello, {user?.businessName}!</DialogTitle>
                    <DialogDescription>
                        Our team is ready to assist you. Please use the contact details below, and we'll get back to you as soon as possible.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-8 py-4 pr-6 flex-1 min-h-0">
                      <div className="space-y-8 flex flex-col">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 rounded-md border p-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <Phone className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="font-semibold">Viber Support</p>
                                <p className="text-sm text-muted-foreground">Jayvee | Account Manager & Customer Success</p>
                                <p className="text-sm text-muted-foreground">09182719091</p>
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
                      <div className="flex flex-col min-h-0">
                          <LiveChat
                            messages={chatMessages}
                            onMessageSubmit={handleMessageSubmit}
                            user={user}
                          />
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
          <MyAccountDialog
            user={user}
            authUser={authUser}
            planImage={planImage}
            generatedInvoices={generatedInvoices}
            onLogout={handleLogout}
          >
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                      <AvatarImage src={displayPhoto ?? undefined} alt={user?.name || ''} />
                      <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <p className="font-semibold text-sm">{user?.businessName}</p>
                </div>
              </div>
            </div>
          </MyAccountDialog>

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

          <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Submit Feedback</DialogTitle>
                    <DialogDescription>
                        We value your opinion. Let us know how we can improve.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={cn(
                                    "h-8 w-8 cursor-pointer transition-colors",
                                    (hoverRating || feedbackRating) >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                )}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setFeedbackRating(star)}
                            />
                        ))}
                    </div>
                    <Textarea 
                        placeholder="Tell us more about your experience..."
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)} 
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsFeedbackDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleFeedbackSubmit}>Submit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

         <Dialog open={isSwitchProviderDialogOpen} onOpenChange={setIsSwitchProviderDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Request to Switch Water Provider</DialogTitle>
                    <DialogDescription>
                        Please provide a reason for your request. An admin will contact you shortly.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Textarea 
                        placeholder="Describe the reason for your request (e.g., water quality, delivery issues, etc.)..."
                        value={switchReason}
                        onChange={(e) => setSwitchReason(e.target.value)}
                    />
                    <Select onValueChange={setSwitchUrgency}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select urgency level..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low - Just exploring options</SelectItem>
                            <SelectItem value="medium">I have some concerns</SelectItem>
                            <SelectItem value="high">High - Urgent issue, need to switch ASAP</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSwitchProviderDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSwitchProviderSubmit}>Send Request</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Payment Verification In Progress</AlertDialogTitle>
                    <AlertDialogDescription>
                        Your payment is currently being verified by our team. You will be notified once the process is complete. Thank you for your patience.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setIsVerificationDialogOpen(false)}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
