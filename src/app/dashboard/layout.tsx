
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
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, getDoc } from 'firebase/firestore';
import { getAuth, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { clientTypes } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CircularProgress } from '@/components/ui/circular-progress';
import { useMounted } from '@/hooks/use-mounted';

type Notification = {
    id: string;
    type: 'delivery' | 'invoice' | 'compliance' | 'sanitation';
    title: string;
    description: string;
    date: string;
    icon: React.ElementType;
    data: Delivery | Payment | ComplianceReport | SanitationVisit;
};

const includedFeatures = [
    {
        icon: LayoutGrid,
        title: 'Smart Client Portal',
        description: 'Monitor consumption, compliance, water providers, and payments in real time.',
    },
    {
        icon: Wrench,
        title: 'Monthly Sanitation Visit',
        description: 'Regular cleaning and compliance check for your dispensers and reusable gallons.',
    },
    {
        icon: ShieldCheck,
        title: 'Guaranteed Water Compliance',
        description: 'All partner stations meet strict sanitation and quality standards.',
    },
    {
        icon: Repeat,
        title: 'Switch Water Providers',
        description: 'Flexibility to switch between our network of trusted providers.',
    },
];

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
  const isMounted = useMounted();

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
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

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
  
  const [profilePhotoFile, setProfilePhotoFile] = React.useState<File | null>(null);
  const [uploadingFiles, setUploadingFiles] = React.useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'admin', content: "Hello! How can I help you today?" }
  ]);

  React.useEffect(() => {
    if (isUserLoading) return;

    if (!authUser) {
      router.push('/login');
      return;
    }
    
    // Onboarding check moved here
    const checkOnboarding = async () => {
        if (!firestore) return;
        const userDoc = await getDoc(doc(firestore, 'users', authUser.uid));
        if (!userDoc.exists() || !userDoc.data()?.onboardingComplete) {
            router.push('/onboarding');
        }
    }
    checkOnboarding();

  }, [authUser, isUserLoading, router, firestore]);

  React.useEffect(() => {
    if(user) {
      setEditableFormData(user);
    }
  }, [user]);

  useEffect(() => {
    if (profilePhotoFile) {
        handleProfilePhotoUpload(profilePhotoFile);
        setProfilePhotoFile(null); // Reset after initiating upload
    }
  }, [profilePhotoFile, authUser, userDocRef]);

  useEffect(() => {
    if (!userDocRef) return;

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
    signOut(auth).then(() => {
      router.push('/login');
    })
  }

  const handleProofUpload = async () => {
    if (!authUser || !firestore || !paymentProofFile || !selectedInvoice) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Please select an invoice and a file to upload.' });
      return;
    }
    const uploadKey = `payment-${selectedInvoice.id}`;
    setUploadingFiles(prev => ({ ...prev, [uploadKey]: 0 }));
    setIsSubmitting(true);

    try {
        const storage = getStorage();
        const filePath = `users/${authUser.uid}/payments/${selectedInvoice.id}/${paymentProofFile.name}`;
        const storageRef = ref(storage, filePath);
        const uploadTask = uploadBytesResumable(storageRef, paymentProofFile);

        await new Promise<void>((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadingFiles(prev => ({ ...prev, [uploadKey]: progress }));
                },
                (error) => reject(error),
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        const paymentRef = doc(firestore, 'users', authUser.uid, 'payments', selectedInvoice.id);
                        const paymentData: Partial<Payment> = {
                            status: 'Pending Review',
                            proofOfPaymentUrl: downloadURL,
                        };
                        setDocumentNonBlocking(paymentRef, paymentData, { merge: true });
                        toast({ title: 'Proof Submitted', description: 'Your proof of payment is now pending for verification.' });
                        setIsPaymentDialogOpen(false);
                        setSelectedInvoice(null);
                        setPaymentProofFile(null);
                        resolve();
                    } catch(e) {
                        reject(e);
                    }
                }
            );
        });
    } catch(error) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload proof of payment. Please try again.' });
    } finally {
        setIsSubmitting(false);
        setUploadingFiles(prev => {
            const newUploadingFiles = { ...prev };
            delete newUploadingFiles[uploadKey];
            return newUploadingFiles;
        });
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

  const handlePasswordChange = async () => {
    if (!authUser || !authUser.email) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to change your password." });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 6 characters long." });
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(authUser.email, currentPassword);
      await reauthenticateWithCredential(authUser, credential);
      await updatePassword(authUser, newPassword);
      
      toast({
          title: "Password Updated",
          description: "Your password has been changed successfully.",
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
        let description = 'An unexpected error occurred. Please try again.';
        if (error.code === 'auth/wrong-password') {
            description = 'The current password you entered is incorrect.';
        } else if (error.code === 'auth/weak-password') {
            description = 'The new password is too weak.';
        }
       toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: description,
      });
    }
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

  const handleProfilePhotoUpload = async (file: File) => {
    if (!authUser || !userDocRef) return;
    
    const uploadKey = `profile-${authUser.uid}`;
    setIsSubmitting(true);
    setUploadingFiles(prev => ({ ...prev, [uploadKey]: 0 }));
  
    try {
      const storage = getStorage();
      const filePath = `users/${authUser.uid}/profile/${file.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);
  
      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadingFiles(prev => ({ ...prev, [uploadKey]: progress }));
          },
          (error) => reject(error),
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              updateDocumentNonBlocking(userDocRef, { photoURL: downloadURL });
              toast({ title: 'Profile Photo Updated', description: 'Your new photo has been saved.' });
              resolve();
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your photo. Please try again.' });
    } finally {
      setIsSubmitting(false);
      setUploadingFiles(prev => {
        const newUploadingFiles = { ...prev };
        delete newUploadingFiles[uploadKey];
        return newUploadingFiles;
      });
    }
  };

   const handleProfilePhotoDelete = async () => {
    if (!authUser || !userDocRef || !user?.photoURL) return;

    const storage = getStorage();
    const photoRef = ref(storage, user.photoURL);

    try {
      await deleteObject(photoRef);
      updateDocumentNonBlocking(userDocRef, { photoURL: null });
      toast({
        title: 'Profile Photo Deleted',
        description: 'Your profile photo has been removed.',
      });
    } catch (error) {
      console.error("Error deleting profile photo: ", error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Could not delete the photo. Please try again.',
      });
    }
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
        if (!user?.createdAt || !user.plan) return [];
        
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

  const profileUploadProgress = authUser ? uploadingFiles[`profile-${authUser.uid}`] : 0;
  const isUploadingProfilePhoto = profileUploadProgress > 0 && profileUploadProgress <= 100;

  const paymentUploadProgress = selectedInvoice ? uploadingFiles[`payment-${selectedInvoice.id}`] : 0;
  const isUploadingPayment = paymentUploadProgress > 0 && paymentUploadProgress <= 100;

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
             <DialogContent className="sm:max-w-4xl h-[90vh] sm:h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-bold">Hello, {user?.businessName}!</DialogTitle>
                    <DialogDescription>
                        Our team is ready to assist you. Please use the contact details below, and we'll get back to you as soon as possible.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1">
                  <div className="grid md:grid-cols-2 gap-8 py-4 pr-6">
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
                      <div className="flex flex-col h-[60vh] md:h-auto">
                          <LiveChat
                            messages={chatMessages}
                            onMessageSubmit={handleMessageSubmit}
                            user={user}
                          />
                      </div>
                  </div>
                </ScrollArea>
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
          <AlertDialog>
            <Dialog>
              <DialogTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.photoURL ?? undefined} alt={user?.name || ''} />
                          <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    <div className="hidden sm:flex flex-col items-start">
                      <p className="font-semibold text-sm">{user?.businessName}</p>
                    </div>
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
                <ScrollArea className="max-h-[70vh] w-full">
                  <div className="pr-6">
                    <Tabs defaultValue="accounts">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="accounts"><User className="mr-2" />Accounts</TabsTrigger>
                        <TabsTrigger value="plan"><FileText className="mr-2" />Plan</TabsTrigger>
                        <TabsTrigger value="invoices"><Receipt className="mr-2" />Invoices</TabsTrigger>
                      </TabsList>

                      <TabsContent value="accounts" className="py-4">
                        <Card>
                          <CardContent className="pt-6">
                              {user && editableFormData ? (
                                  <div className="space-y-6">
                                      <div>
                                          <div className="flex items-center gap-4 mb-4">
                                              <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                      <div className="relative group cursor-pointer">
                                                          <Avatar className="h-20 w-20">
                                                              <AvatarImage src={user.photoURL ?? undefined} alt={user.name || ''} />
                                                              <AvatarFallback className="text-3xl">{user.name?.charAt(0)}</AvatarFallback>
                                                          </Avatar>
                                                          {isUploadingProfilePhoto && profileUploadProgress < 100 ? (
                                                              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                                                  <CircularProgress value={profileUploadProgress} />
                                                              </div>
                                                          ) : (
                                                              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                  <Pencil className="h-6 w-6 text-white" />
                                                              </div>
                                                          )}
                                                      </div>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="start">
                                                      <DropdownMenuLabel>Profile Photo</DropdownMenuLabel>
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuItem asChild>
                                                          <Label htmlFor="photo-upload-input" className="w-full cursor-pointer">
                                                              <Upload className="mr-2 h-4 w-4" />
                                                              Upload new photo
                                                          </Label>
                                                      </DropdownMenuItem>
                                                      {user.photoURL && (
                                                          <AlertDialogTrigger asChild>
                                                              <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                                  <Trash2 className="mr-2 h-4 w-4" />
                                                                  Remove photo
                                                              </DropdownMenuItem>
                                                          </AlertDialogTrigger>
                                                      )}
                                                  </DropdownMenuContent>
                                              </DropdownMenu>
                                              <Input id="photo-upload-input" type="file" accept="image/*" className="hidden" onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)} disabled={isSubmitting}/>
                                              <div className="space-y-1">
                                                  <h4 className="font-semibold">{user.name}</h4>
                                                  <p className="text-sm text-muted-foreground">Update your account details.</p>
                                              </div>
                                          </div>
                                      </div>
                                      <Separator />
                                      <div>
                                          <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-semibold">Your Details</h4>
                                            {!isEditingDetails && <Button variant="outline" size="sm" onClick={() => { setIsEditingDetails(true); setEditableFormData(user); }}><Edit className="mr-2 h-4 w-4" />Edit Details</Button>}
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                              <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                                  <Label htmlFor="fullName" className="text-right">Full Name</Label>
                                                  <Input id="fullName" name="name" value={editableFormData.name || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails} />
                                              </div>
                                              <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                                  <Label htmlFor="email" className="text-right">Login Email</Label>
                                                  <Input id="email" name="email" type="email" value={editableFormData.email || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails} />
                                              </div>
                                              <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                                  <Label htmlFor="businessEmail" className="text-right">Business Email</Label>
                                                  <Input id="businessEmail" name="businessEmail" type="email" value={editableFormData.businessEmail || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails} />
                                              </div>
                                              <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                                  <Label htmlFor="businessName" className="text-right">Business Name</Label>
                                                  <Input id="businessName" name="businessName" value={editableFormData.businessName || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails}/>
                                              </div>
                                              <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                                  <Label htmlFor="address" className="text-right">Address</Label>
                                                  <Input id="address" name="address" value={editableFormData.address || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails}/>
                                              </div>
                                              <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                                  <Label htmlFor="contactNumber" className="text-right">Contact Number</Label>
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
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm mb-4">
                                              <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                                  <Label htmlFor="clientId" className="text-right">Client ID</Label>
                                                  <Input id="clientId" value={editableFormData.clientId || ''} disabled />
                                              </div>
                                              <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                                  <Label htmlFor="uid" className="text-right">User ID (UID)</Label>
                                                  <Input id="uid" value={authUser?.uid || ''} disabled />
                                              </div>
                                          </div>
                                          <div className="flex flex-col sm:flex-row gap-2">
                                              <Button onClick={() => setIsPasswordDialogOpen(true)}><KeyRound className="mr-2 h-4 w-4" />Update Password</Button>
                                              <Button variant="outline" onClick={() => toast({ title: "Coming soon!" })}><Shield className="mr-2 h-4 w-4" />Enable 2FA</Button>
                                          </div>
                                      </div>
                                  </div>
                              ) : <p>No account information available.</p>}
                          </CardContent>
                        </Card>
                    </TabsContent>

                      <TabsContent value="plan" className="py-4">
                        <div className="space-y-6">
                          {user?.plan ? (
                              <Card className="overflow-hidden">
                                <CardContent className="p-0">
                                  <div className="flex flex-col md:flex-row">
                                    {planImage && (
                                      <div className="relative md:w-1/2 aspect-square md:aspect-auto">
                                        <Image src={planImage.imageUrl} alt={user.clientType || 'Plan Image'} fill style={{ objectFit: 'cover' }} data-ai-hint={planImage.imageHint} />
                                      </div>
                                    )}
                                    <div className="flex-1 p-6">
                                      <CardTitle>{user.plan.name}</CardTitle>
                                      <CardDescription className="text-xl font-bold text-foreground">₱{user.plan.price.toLocaleString()}/month</CardDescription>
                                      <Separator className="my-4" />
                                      <h4 className="font-semibold mb-2">Inclusions:</h4>
                                      <ul className="space-y-2 text-sm text-muted-foreground">
                                          <li className="flex items-center gap-2"><Droplets className="h-4 w-4 text-primary" /> <span>{(user.customPlanDetails?.litersPerMonth || 0).toLocaleString()} Liters/Month (+{(user.customPlanDetails?.bonusLiters || 0).toLocaleString()} bonus)</span></li>
                                          <li className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> <span>{user.customPlanDetails?.deliveryFrequency || 'N/A'} on {user.customPlanDetails?.deliveryDay}</span></li>
                                          <li className="flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> <span>{user.customPlanDetails?.gallonQuantity || '0'} Gallons / {user.customPlanDetails?.dispenserQuantity || '0'} Dispensers</span></li>
                                      </ul>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                          ) : (
                              <p className="text-center text-muted-foreground py-8">You have not selected a plan yet.</p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                              {user?.currentContractUrl ? (
                                  <Button asChild variant="outline" className="w-full">
                                      <a href={user.currentContractUrl} target="_blank" rel="noopener noreferrer">
                                          <FileText className="mr-2 h-4 w-4" />
                                          Contract
                                      </a>
                                  </Button>
                              ) : (
                                  <Button variant="outline" className="w-full" disabled>
                                      <FileX className="mr-2 h-4 w-4" />
                                      Contract Not Available
                                  </Button>
                              )}
                              <Button variant="outline" className="w-full" onClick={() => toast({ title: 'Coming Soon!', description: 'Plan changes will be available shortly.'})}>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Change Plan
                              </Button>
                          </div>

                          <Card>
                              <CardHeader>
                                  <CardTitle className="text-base">Included in Every Plan</CardTitle>
                                  <CardDescription className="text-xs">Every subscription plan includes full access to our growing network of partner perks.</CardDescription>
                              </CardHeader>
                              <CardContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                      {includedFeatures.map((feature, index) => {
                                          const Icon = feature.icon;
                                          return (
                                              <div key={index} className="flex items-start gap-3">
                                                  <Icon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                                  <div>
                                                      <h4 className="text-sm font-medium">{feature.title}</h4>
                                                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </CardContent>
                          </Card>

                        </div>
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
                                  <ScrollArea className="w-full whitespace-nowrap">
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
                                                      <TableCell className="text-right">₱{payment.amount.toFixed(2)}</TableCell>
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
                                      <div className="h-1" />
                                  </ScrollArea>
                              </CardContent>
                          </Card>
                      </TabsContent>

                    </Tabs>
                  </div>
                </ScrollArea>
                <DialogFooter className="pr-6 pt-4 border-t">
                    <Button variant="outline" onClick={handleLogout}>Logout</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently remove your profile photo.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleProfilePhotoDelete}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Complete Your Payment</DialogTitle>
                <DialogDescription>
                  Invoice {selectedInvoice?.id} for ₱{selectedInvoice?.amount.toFixed(2)}
                </DialogDescription>
              </DialogHeader>
              {!selectedPaymentMethod ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  {paymentOptions.map((option) => (
                    <Card
                      key={option.name}
                      onClick={() => handlePaymentOptionClick(option)}
                      className="cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center p-6"
                    >
                      <h3 className="font-semibold text-lg">{option.name}</h3>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-4 space-y-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPaymentMethod(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to payment options
                  </Button>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Scan to Pay with {selectedPaymentMethod.name}</h4>
                      {selectedPaymentMethod.qr && (
                        <div className="relative aspect-square w-full max-w-sm mx-auto border rounded-lg overflow-hidden">
                          <Image
                            src={selectedPaymentMethod.qr.imageUrl}
                            alt={`${selectedPaymentMethod.name} QR Code`}
                            fill
                            className="object-contain"
                            data-ai-hint={selectedPaymentMethod.qr.imageHint}
                          />
                        </div>
                      )}
                      {selectedPaymentMethod.details && (
                        <div className="text-sm text-center space-y-1 pt-2">
                          <p>Account Name: <span className="font-semibold">{selectedPaymentMethod.details.accountName}</span></p>
                          <p>Account Number: <span className="font-semibold">{selectedPaymentMethod.details.accountNumber}</span></p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold">Upload Proof of Payment</h4>
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">After paying, please upload a screenshot of your transaction confirmation.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment-proof-upload">Proof of Payment</Label>
                        <Input id="payment-proof-upload" type="file" onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)} disabled={isSubmitting} />
                        {isUploadingPayment && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Progress value={paymentUploadProgress} className="w-full" />
                            <span>{Math.round(paymentUploadProgress)}%</span>
                          </div>
                        )}
                      </div>
                      <Button onClick={handleProofUpload} disabled={!paymentProofFile || isSubmitting} className="w-full">
                        {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
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
                      <div className="relative">
                          <Label htmlFor="current-password">Current Password</Label>
                          <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                          <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                      </div>
                      <div className="relative">
                          <Label htmlFor="new-password">New Password</Label>
                          <Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                          <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowNewPassword(!showNewPassword)}>
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                      </div>
                      <div className="relative">
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                          <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
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
                            <SelectItem value="medium">Medium - I have some concerns</SelectItem>
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

    