
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
import { Bell, Truck, User, KeyRound, Info, Camera, Eye, EyeOff, LifeBuoy, Mail, Phone, Home, Layers, Receipt, Check, CreditCard, Download, QrCode, FileText, Upload, ArrowLeft, Droplets, MessageSquare, Edit, ShieldCheck, Send, Star, AlertTriangle, FileUp, Building, FileClock, History, Hourglass, Shield, Package, Calendar, Repeat, Wrench, Headset, Rocket, LayoutGrid, Thermometer, CalendarCheck, HelpCircle, FileX, RefreshCw, Pencil, Trash2, FileHeart, UserCog } from 'lucide-react';
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
import { format, differenceInMonths, addMonths, subHours, formatDistanceToNow } from 'date-fns';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import type { Payment, ImagePlaceholder, Feedback, PaymentOption, Delivery, ComplianceReport, SanitationVisit, WaterStation, AppUser, Notification as NotificationType, RefillRequest, RefillRequestStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, useStorage, useAuth, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, getDoc, updateDoc, writeBatch, Timestamp, query, serverTimestamp, where, arrayUnion } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { clientTypes } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMounted } from '@/hooks/use-mounted';
import { MyAccountDialog } from '@/components/MyAccountDialog';
import { uploadFileWithProgress } from '@/lib/storage-utils';

const ICONS: { [key: string]: React.ElementType } = {
  delivery: Truck,
  compliance: ShieldCheck,
  sanitation: FileHeart,
  payment: Receipt,
  general: Info,
};

function DashboardLayoutSkeleton() {
    return (
        <div className="flex flex-col h-full">
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
                <div className="flex items-center gap-2 font-semibold text-lg">
                    <div className="flex items-center">
                        <span className="font-bold">River Business</span>
                    </div>
                </div>
                <div className="flex-1" />
                {/* Header skeleton */}
            </header>
            <main className="flex-1 overflow-auto p-4 sm:p-6">
                <div className="container mx-auto">
                    {/* Children will be rendered here */}
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
  const storage = useStorage();

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

  const paymentsQuery = useMemoFirebase(() => (firestore && authUser) ? collection(firestore, 'users', authUser.uid, 'payments') : null, [firestore, authUser]);
  const { data: paymentHistoryFromDb } = useCollection<Payment>(paymentsQuery);
  
  const notificationsQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'users', authUser.uid, 'notifications')) : null, [firestore, authUser]);
  const { data: notifications } = useCollection<NotificationType>(notificationsQuery);
  
  const [unreadNotifications, setUnreadNotifications] = useState<NotificationType[]>([]);
  const [isRefillRequesting, setIsRefillRequesting] = useState(false);

  const activeRefillQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(
      collection(firestore, 'users', authUser.uid, 'refillRequests'),
      where('status', 'in', ['Requested', 'In Production', 'Out for Delivery'])
    );
  }, [firestore, authUser]);

  const { data: activeRefills, isLoading: isRefillLoading } = useCollection<RefillRequest>(activeRefillQuery);
  const activeRefillRequest = useMemo(() => (activeRefills && activeRefills.length > 0 ? activeRefills[0] : null), [activeRefills]);
  const hasPendingRefill = useMemo(() => !!activeRefillRequest, [activeRefillRequest]);
  


  useEffect(() => {
    if (notifications) {
      setUnreadNotifications(notifications.filter(n => !n.isRead));
    }
  }, [notifications]);


  const handleNotificationOpenChange = (open: boolean) => {
    if (!open && unreadNotifications.length > 0 && firestore && authUser) {
        const batch = writeBatch(firestore);
        unreadNotifications.forEach(notif => {
            const notifRef = doc(firestore, 'users', authUser.uid, 'notifications', notif.id);
            batch.update(notifRef, { isRead: true });
        });
        batch.commit().catch(err => console.error("Failed to mark notifications as read:", err));
    }
  };
  
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
  const [isSubmittingProof, setIsSubmittingProof] = React.useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);

  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'admin', content: "Hello! How can I help you today?" }
  ]);
  
  React.useEffect(() => {
    if (isUserLoading || !auth) return;

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

  }, [authUser, isUserLoading, router, firestore, auth]);

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
      setSelectedInvoice(null);
    }
  }, [isPaymentDialogOpen]);

  const handleLogout = () => {
    if (!auth) return;
    signOut(auth).then(() => {
      router.push('/login');
    })
  }

  const handleProofUpload = async () => {
    if (!paymentProofFile || !selectedInvoice || !authUser || !storage || !auth) return;

    setIsSubmittingProof(true);
    const filePath = `users/${authUser.uid}/payments/${selectedInvoice.id}-${paymentProofFile.name}`;

    try {
        await uploadFileWithProgress(storage, auth, filePath, paymentProofFile, {}, setUploadProgress);
        
        toast({ title: 'Upload Complete', description: 'Your proof of payment is being processed and will be reviewed shortly.' });
        setIsPaymentDialogOpen(false);

    } catch (error: any) {
        console.error("Proof upload failed", error);
        toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "There was a problem uploading your payment proof. Please try again."
        });
    } finally {
        setIsSubmittingProof(false);
        setUploadProgress(0);
    }
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
    
    const handlePayNow = (invoice: Payment) => {
        setSelectedInvoice(invoice);
        setIsPaymentDialogOpen(true);
    };

    const createNotification = async (userId: string, notification: Omit<NotificationType, 'id' | 'userId' | 'date' | 'isRead'>) => {
        if (!firestore) return;
        const notificationsCol = collection(firestore, 'users', userId, 'notifications');
        const newNotification: Partial<NotificationType> = {
            ...notification,
            userId,
            date: serverTimestamp(),
            isRead: false
        };
        await addDocumentNonBlocking(notificationsCol, newNotification);
    };
    
    const handleOneClickRefill = async () => {
      if (hasPendingRefill) {
          window.dispatchEvent(new CustomEvent('open-refill-status'));
          return;
      }
      if (!user || !firestore || !authUser) {
          toast({ variant: 'destructive', title: 'Error', description: 'Cannot process request. User not found.' });
          return;
      }
  
      setIsRefillRequesting(true);
      const newRequestData: Omit<RefillRequest, 'id'> = {
          userId: user.id,
          userName: user.name,
          businessName: user.businessName,
          clientId: user.clientId || '',
          requestedAt: serverTimestamp(),
          status: 'Requested',
          statusHistory: [{ status: 'Requested', timestamp: new Date().toISOString() as any }],
          requestedDate: new Date().toISOString(), // Use current date for ASAP
      };
  
      try {
          const refillRequestsCollection = collection(firestore, 'users', authUser.uid, 'refillRequests');
          const newDocRef = await addDocumentNonBlocking(refillRequestsCollection, newRequestData);
  
          await createNotification(authUser.uid, {
              type: 'delivery',
              title: 'ASAP Refill Request Sent!',
              description: `Your immediate refill request has been sent.`,
              data: { requestId: newDocRef.id },
          });

          const userName = user?.name.split(' ')[0] || 'friend';
          toast({
              title: 'Request Sent!',
              description: `Salamat, ${userName}! Papunta na ang aming team para sa iyong water refill.`,
          });
  
      } catch (error) {
          toast({
              variant: 'destructive',
              title: 'Request Failed',
              description: 'There was an issue sending your request. Please try again.',
          });
      } finally {
          setIsRefillRequesting(false);
      }
    };

    const handleNotificationClick = (notification: NotificationType) => {
        if (!notification.data) return;

        let eventName: string | null = null;
        let eventDetail: any = {};

        switch (notification.type) {
            case 'payment':
                eventName = 'open-payment-dialog';
                eventDetail = { invoiceId: notification.data.paymentId };
                break;
            case 'delivery':
                eventName = 'open-delivery-history';
                eventDetail = { deliveryId: notification.data.deliveryId };
                break;
            case 'sanitation':
                eventName = 'open-compliance-dialog';
                eventDetail = { tab: 'sanitation' };
                break;
            case 'compliance':
                 eventName = 'open-compliance-dialog';
                 eventDetail = { tab: 'compliance' };
                 break;
        }

        if (eventName) {
            window.dispatchEvent(new CustomEvent(eventName, { detail: eventDetail }));
        }
    }

    const handleComplianceClick = () => {
        window.dispatchEvent(new CustomEvent('open-compliance-dialog'));
    }

  if (isUserLoading || isUserDocLoading || !isMounted || !auth) {
    return <DashboardLayoutSkeleton />;
  }

  const displayPhoto = user?.photoURL;
  const userFirstName = user?.name?.split(' ')[0] || 'friend';

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
               <Button variant="outline" className="rounded-full relative">
                <span className="relative flex items-center mr-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                </span>
                <span className="mr-2 hidden sm:inline">Live Support</span>
                {hasNewMessage && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background" />}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl h-full w-full rounded-none border-none sm:rounded-lg sm:max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-bold">Hello, {user?.businessName}!</DialogTitle>
                    <DialogDescription>
                        Our team is ready to assist you. Please use the contact details below, and we'll get back to you as soon as possible.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 min-h-0">
                         <LiveChat
                            messages={chatMessages}
                            onMessageSubmit={handleMessageSubmit}
                            user={user}
                         />
                    </div>
                    <div className="shrink-0 pt-4 mt-auto border-t">
                        <p className="text-xs text-muted-foreground text-center mb-4">For urgent concerns, you may also reach us through these channels.</p>
                        <div className="flex items-center gap-4 rounded-md p-3 md:p-4 justify-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                  <Phone className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">Viber Support</p>
                                  <p className="text-xs text-muted-foreground">09182719091</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <Mail className="h-5 w-5" />
                                </div>
                                <div>
                                <p className="font-semibold text-sm">Email Support</p>
                                <a href="mailto:jayvee@riverph.com" className="text-xs text-muted-foreground hover:text-primary">jayvee@riverph.com</a>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setIsFeedbackDialogOpen(true)}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Submit Feedback
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setIsSwitchProviderDialogOpen(true)}>
                                  <FileUp className="h-4 w-4 mr-2" />
                                  Switch Provider
                                </Button>
                        </div>
                    </div>
                </div>
              </DialogContent>
          </Dialog>
          <Popover onOpenChange={handleNotificationOpenChange}>
              <PopoverTrigger asChild>
              <Button
                  variant="outline"
                  size="icon"
                  className="relative rounded-full"
              >
                  <Bell className="h-4 w-4" />
                   {unreadNotifications.length > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">
                          {unreadNotifications.length}
                        </Badge>
                   )}
              </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96">
              <div className="space-y-2">
                  <div className="flex justify-between items-center">
                  <h4 className="font-medium text-sm">Notifications</h4>
                   {unreadNotifications.length > 0 && (
                      <Badge variant="secondary" className="rounded-sm">
                          {unreadNotifications.length} New
                      </Badge>
                   )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your recent account updates.
                  </p>
              </div>
              <Separator className="my-4" />
                <div className="space-y-4 max-h-80 overflow-y-auto">
                    {notifications && notifications.length > 0 ? (
                        notifications.sort((a,b) => {
                            const aSeconds = (a.date instanceof Timestamp) ? a.date.seconds : 0;
                            const bSeconds = (b.date instanceof Timestamp) ? b.date.seconds : 0;
                            if (aSeconds === 0 && bSeconds === 0) return 0; // Both dates are not ready, keep order
                            if (aSeconds === 0) return -1; // a is newer (not yet set)
                            if (bSeconds === 0) return 1;  // b is newer (not yet set)
                            return bSeconds - aSeconds; // Sort by most recent
                        }).map((notification) => {
                            const Icon = ICONS[notification.type] || Info;
                            const date = notification.date instanceof Timestamp ? notification.date.toDate() : null;
                            const isActionable = notification.type === 'payment' || notification.type === 'delivery' || notification.type === 'sanitation' || notification.type === 'compliance';

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
                                        <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                           <p>{date ? formatDistanceToNow(date, { addSuffix: true }) : 'Just now'}</p>
                                           {isActionable && 
                                             <button onClick={() => handleNotificationClick(notification)} className="font-medium text-primary hover:underline">View details</button>
                                           }
                                        </div>
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
          <Button variant="outline" size="icon" className="sm:hidden rounded-full" onClick={handleComplianceClick}>
              <ShieldCheck className="h-4 w-4" />
          </Button>
          <MyAccountDialog
            user={user}
            authUser={authUser}
            planImage={planImage}
            paymentHistory={paymentHistoryFromDb || []}
            onLogout={handleLogout}
            onPayNow={handlePayNow}
            isOpen={isAccountDialogOpen}
            onOpenChange={setIsAccountDialogOpen}
          >
            <div className="items-center gap-3 cursor-pointer hidden sm:flex">
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
          <main className="flex-1 overflow-auto p-4 sm:p-6 pb-24 sm:pb-6">
            <div className="container mx-auto">
              {React.cloneElement(children as React.ReactElement, { handleOneClickRefill, isRefillRequesting, hasPendingRefill })}
            </div>
          </main>

        {/* Mobile Bottom Navigation */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex justify-around items-center z-20">
            <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={() => window.dispatchEvent(new CustomEvent('open-delivery-history'))}>
                <History className="h-5 w-5" />
                <span className="text-xs mt-1">History</span>
            </Button>
            <div className="relative group">
                <Button 
                    size="icon" 
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-primary shadow-lg"
                    onClick={handleOneClickRefill}
                    disabled={isRefillRequesting}
                    >
                    <Droplets className="h-8 w-8 text-primary-foreground" />
                </Button>
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
                  <div className="tooltip-bubble">Refill now, {userFirstName}?</div>
                </div>
            </div>
            <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={() => setIsAccountDialogOpen(true)}>
                <User className="h-5 w-5" />
                <span className="text-xs mt-1">Account</span>
            </Button>
        </div>


          <footer className="p-4 text-center text-xs text-muted-foreground border-t hidden sm:block">
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

        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col rounded-lg">
                <DialogHeader>
                    <DialogTitle>
                        {selectedPaymentMethod ? `Pay with ${selectedPaymentMethod.name}` : `Pay Invoice ${selectedInvoice?.id}`}
                    </DialogTitle>
                    <DialogDescription>
                        {selectedPaymentMethod ? `Scan the QR code and upload your proof of payment.` : `Your bill is ₱${selectedInvoice?.amount.toFixed(2)}. Please select a payment method.`}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="pr-6 -mr-6">
                    <div className="py-4 grid md:grid-cols-2 gap-8">
                        {!selectedPaymentMethod ? (
                            <div className="space-y-4">
                                <h4 className="font-semibold mb-4">Select a Payment Method</h4>
                                <div className="grid grid-cols-2 gap-4">
                                {paymentOptions.map((option) => (
                                    <Card key={option.name} className="cursor-pointer hover:border-primary" onClick={() => handlePaymentOptionClick(option)}>
                                        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                                            {option.qr && (
                                                <div className="relative h-10 w-10">
                                                    <Image src={option.qr.imageUrl} alt={option.name} fill className="object-contain" data-ai-hint={option.qr.imageHint}/>
                                                </div>
                                            )}
                                            <p className="font-medium text-sm sm:text-base">{option.name}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Button variant="outline" size="sm" onClick={() => setSelectedPaymentMethod(null)}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payment Options
                                </Button>
                                {selectedPaymentMethod.qr && (
                                    <div className="p-4 border rounded-lg flex flex-col items-center gap-4">
                                        <div className="relative w-48 h-48">
                                            <Image src={selectedPaymentMethod.qr.imageUrl} alt={`${selectedPaymentMethod.name} QR Code`} fill className="object-contain" data-ai-hint={selectedPaymentMethod.qr.imageHint} />
                                        </div>
                                        {selectedPaymentMethod.details && (
                                            <div className="text-center text-sm">
                                                <p>Account Name: <span className="font-semibold">{selectedPaymentMethod.details.accountName}</span></p>
                                                <p>Account Number: <span className="font-semibold">{selectedPaymentMethod.details.accountNumber}</span></p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-4">
                             <h4 className="font-semibold">Upload Proof of Payment</h4>
                             <p className="text-sm text-muted-foreground">
                                After paying, please upload a screenshot of your receipt. Your payment will be marked as "Pending Review" until an admin verifies it.
                             </p>
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="payment-proof">Receipt Screenshot</Label>
                                <Input id="payment-proof" type="file" onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)} disabled={isSubmittingProof} />
                            </div>
                            {uploadProgress > 0 && (
                                <div className="w-full bg-muted rounded-full h-2.5">
                                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                            )}
                            <Button onClick={handleProofUpload} disabled={!paymentProofFile || isSubmittingProof}>
                                {isSubmittingProof ? 'Uploading...' : 'Submit Proof'}
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
                 <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
  );
}

    