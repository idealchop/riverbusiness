
'use client';

import React, { useReducer, useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useStorage, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection, Timestamp, deleteField } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, User } from 'firebase/auth';
import type { AppUser, ImagePlaceholder, Payment, Delivery, SanitationVisit, ComplianceReport } from '@/lib/types';
import { format, startOfMonth, addMonths, isWithinInterval, subMonths, endOfMonth, isAfter, isSameDay, endOfDay, getYear, getMonth } from 'date-fns';
import { User as UserIcon, KeyRound, Edit, Trash2, Upload, FileText, Receipt, EyeOff, Eye, Pencil, Shield, LayoutGrid, Wrench, ShieldCheck, Repeat, Package, FileX, CheckCircle, AlertCircle, Download, Calendar, Undo2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { enterprisePlans } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { generateMonthlySOA, generateInvoicePDF } from '@/lib/pdf-generator';
import { Logo } from '@/components/icons';


// State Management with useReducer
type State = {
  isPasswordDialogOpen: boolean;
  isPhotoPreviewOpen: boolean;
  isChangePlanDialogOpen: boolean;
  isSoaDialogOpen: boolean;
  isInvoiceDetailOpen: boolean;
  selectedNewPlan: any | null;
  profilePhotoFile: File | null;
  profilePhotoPreview: string | null;
  editableFormData: Partial<AppUser>;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  selectedInvoiceForDetail: Payment | null;
};

type Action =
  | { type: 'SET_EDIT_DETAILS'; payload: boolean }
  | { type: 'SET_PASSWORD_DIALOG'; payload: boolean }
  | { type: 'SET_PHOTO_PREVIEW_DIALOG'; payload: boolean }
  | { type: 'SET_CHANGE_PLAN_DIALOG'; payload: boolean }
  | { type: 'SET_SOA_DIALOG'; payload: boolean }
  | { type: 'SET_INVOICE_DETAIL_DIALOG'; payload: boolean }
  | { type: 'SET_SELECTED_INVOICE_FOR_DETAIL', payload: Payment | null }
  | { type: 'SET_SELECTED_NEW_PLAN'; payload: any | null }
  | { type: 'SET_PHOTO_FILE'; payload: { file: File | null, preview: string | null } }
  | { type: 'SET_FORM_DATA'; payload: Partial<AppUser> }
  | { type: 'UPDATE_FORM_DATA'; payload: { name: keyof AppUser, value: string } }
  | { type: 'SET_PASSWORD_FIELD'; payload: { field: 'current' | 'new' | 'confirm', value: string } }
  | { type: 'TOGGLE_PASSWORD_VISIBILITY'; payload: 'current' | 'new' | 'confirm' }
  | { type: 'RESET_PASSWORD_FORM' }
  | { type: 'RESET_UPLOAD' };

const initialState: State = {
  isPasswordDialogOpen: false,
  isPhotoPreviewOpen: false,
  isChangePlanDialogOpen: false,
  isSoaDialogOpen: false,
  isInvoiceDetailOpen: false,
  selectedNewPlan: null,
  profilePhotoFile: null,
  profilePhotoPreview: null,
  editableFormData: {},
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  showCurrentPassword: false,
  showNewPassword: false,
  showConfirmPassword: false,
  selectedInvoiceForDetail: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PASSWORD_DIALOG': return { ...state, isPasswordDialogOpen: action.payload };
    case 'SET_PHOTO_PREVIEW_DIALOG': return { ...state, isPhotoPreviewOpen: action.payload };
    case 'SET_CHANGE_PLAN_DIALOG': return { ...state, isChangePlanDialogOpen: action.payload };
    case 'SET_SOA_DIALOG': return { ...state, isSoaDialogOpen: action.payload };
    case 'SET_INVOICE_DETAIL_DIALOG': return { ...state, isInvoiceDetailOpen: action.payload };
    case 'SET_SELECTED_INVOICE_FOR_DETAIL': return { ...state, selectedInvoiceForDetail: action.payload };
    case 'SET_SELECTED_NEW_PLAN': return { ...state, selectedNewPlan: action.payload };
    case 'SET_PHOTO_FILE': return { ...state, profilePhotoFile: action.payload.file, profilePhotoPreview: action.payload.preview };
    case 'SET_FORM_DATA': return { ...state, editableFormData: action.payload };
    case 'UPDATE_FORM_DATA': return { ...state, editableFormData: { ...state.editableFormData, [action.payload.name]: action.payload.value } };
    case 'SET_PASSWORD_FIELD':
      if (action.payload.field === 'current') return { ...state, currentPassword: action.payload.value };
      if (action.payload.field === 'new') return { ...state, newPassword: action.payload.value };
      if (action.payload.field === 'confirm') return { ...state, confirmPassword: action.payload.value };
      return state;
    case 'TOGGLE_PASSWORD_VISIBILITY':
      if (action.payload === 'current') return { ...state, showCurrentPassword: !state.showCurrentPassword };
      if (action.payload === 'new') return { ...state, showNewPassword: !state.showNewPassword };
      if (action.payload === 'confirm') return { ...state, showConfirmPassword: !state.showConfirmPassword };
      return state;
    case 'RESET_PASSWORD_FORM': return { ...state, currentPassword: '', newPassword: '', confirmPassword: '', isPasswordDialogOpen: false };
    case 'RESET_UPLOAD':
      if (state.profilePhotoPreview) URL.revokeObjectURL(state.profilePhotoPreview);
      return { ...state, profilePhotoFile: null, profilePhotoPreview: null, isPhotoPreviewOpen: false };
    default: return state;
  }
}

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

const containerToLiter = (containers: number) => (containers || 0) * 19.5;


interface MyAccountDialogProps {
  user: AppUser | null;
  authUser: User | null;
  planImage: ImagePlaceholder | null;
  paymentHistory: Payment[];
  onLogout: () => void;
  children: React.ReactNode;
  onPayNow: (invoice: Payment) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function MyAccountDialog({ user, authUser, planImage, paymentHistory, onLogout, children, onPayNow, isOpen, onOpenChange }: MyAccountDialogProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isPending, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [soaMonth, setSoaMonth] = useState<string>('');
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  
  const deliveriesQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'users', user.id, 'deliveries') : null, [firestore, user]);
  const { data: deliveries } = useCollection<Delivery>(deliveriesQuery);

  const sanitationVisitsQuery = useMemoFirebase(() => (firestore && authUser) ? collection(firestore, 'users', authUser.uid, 'sanitationVisits') : null, [firestore, authUser]);
  const { data: sanitationVisits } = useCollection<SanitationVisit>(sanitationVisitsQuery);

  const complianceReportsQuery = useMemoFirebase( () => (firestore && user?.assignedWaterStationId) ? collection(firestore, 'waterStations', user.assignedWaterStationId, 'complianceReports') : null, [firestore, user?.assignedWaterStationId]);
  const { data: complianceReports } = useCollection<ComplianceReport>(complianceReportsQuery);

  const [isEditingDetails, setIsEditingDetails] = useState(false);


  const consumptionDetails = React.useMemo(() => {
    const now = new Date();
    const cycleStart = startOfMonth(now);
    const cycleEnd = endOfMonth(now);

    if (!user?.plan || !deliveries) {
        return { estimatedCost: 0 };
    }

    const deliveriesThisCycle = deliveries.filter(d => {
        const deliveryDate = new Date(d.date);
        return isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd });
    });
    const consumedLitersThisMonth = deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
    
    let estimatedCost = 0;
    if (user.plan.isConsumptionBased) {
        estimatedCost = consumedLitersThisMonth * (user.plan.price || 0);
    } else {
        estimatedCost = user.plan.price || 0;
    }

    return { estimatedCost };
  }, [user, deliveries]);


  const currentMonthInvoice: Payment = {
    id: `INV-${format(new Date(), 'yyyy-MMM').toUpperCase()}`,
    date: new Date().toISOString(),
    description: `Bill for ${format(new Date(), 'MMMM yyyy')}`,
    amount: consumptionDetails.estimatedCost,
    status: 'Upcoming',
  };

  const flowPlan = React.useMemo(() => enterprisePlans.find(p => p.name === 'Flow Plan (P3/L)'), []);

  useEffect(() => {
    if (user) {
      dispatch({ type: 'SET_FORM_DATA', payload: user });
    }
  }, [user]);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      dispatch({ type: 'SET_PHOTO_FILE', payload: { file, preview: previewUrl } });
      dispatch({ type: 'SET_PHOTO_PREVIEW_DIALOG', payload: true });
    }
    e.target.value = '';
  };

  const handleSaveChanges = async () => {
    if (!authUser || !firestore) return;
    const userDocRef = doc(firestore, 'users', authUser.uid);
    try {
      await updateDoc(userDocRef, state.editableFormData);
      setIsEditingDetails(false);
      toast({ title: "Changes Saved", description: "Your account details have been updated." });
    } catch (error) {
      console.error("Error saving changes: ", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save your changes." });
    }
  };

  const handlePasswordChange = async () => {
    if (!authUser?.email) return;
    if (state.newPassword !== state.confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "New passwords do not match." });
      return;
    }
    if (state.newPassword.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 6 characters long." });
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(authUser.email, state.currentPassword);
      await reauthenticateWithCredential(authUser, credential);
      await updatePassword(authUser, state.newPassword);
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      dispatch({ type: 'RESET_PASSWORD_FORM' });
    } catch (error) {
      toast({ variant: "destructive", title: "Password Update Failed", description: "The current password you entered is incorrect or the new password is too weak." });
    }
  };
  
  const handleProfilePhotoUpload = async () => {
    if (!state.profilePhotoFile || !authUser || !storage || !auth) return;
    
    const filePath = `users/${authUser.uid}/profile/profile-photo-${Date.now()}`;
    
    startTransition(() => {
        uploadFileWithProgress(storage, auth, filePath, state.profilePhotoFile, {}, setUploadProgress)
        .then(() => {
            toast({ title: 'Upload Complete', description: 'Your photo is being processed and will update shortly.' });
        })
        .catch((error) => {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your profile photo.' });
        })
        .finally(() => {
            dispatch({ type: 'RESET_UPLOAD' });
            setUploadProgress(0);
        });
    });
  };
  
  const handleProfilePhotoDelete = async () => {
    if (!authUser || !user || !firestore) return;
    
    startTransition(async () => {
        const userDocRef = doc(firestore, 'users', authUser.uid);
        try {
            await updateDoc(userDocRef, { photoURL: null });
            toast({ title: 'Profile Photo Removed' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not remove photo.' });
        }
    });
  };

  const handleConfirmPlanChange = async () => {
    if (!authUser || !firestore || !state.selectedNewPlan) return;
    
    const now = new Date();
    const firstDayOfNextMonth = startOfMonth(addMonths(now, 1));

    const userDocRef = doc(firestore, 'users', authUser.uid);

    await updateDoc(userDocRef, {
        pendingPlan: state.selectedNewPlan,
        planChangeEffectiveDate: firstDayOfNextMonth,
    });

    toast({
        title: 'Plan Change Scheduled',
        description: `Your plan will switch to ${state.selectedNewPlan.name} on ${format(firstDayOfNextMonth, 'MMMM d, yyyy')}.`,
    });

    dispatch({type: 'SET_CHANGE_PLAN_DIALOG', payload: false});
    dispatch({type: 'SET_SELECTED_NEW_PLAN', payload: null});
  };

  const handleUndoPlanChange = async () => {
    if (!authUser || !firestore) return;
    
    const userDocRef = doc(firestore, 'users', authUser.uid);
    await updateDoc(userDocRef, {
      pendingPlan: deleteField(),
      planChangeEffectiveDate: deleteField(),
    });
    
    toast({
        title: 'Request Cancelled',
        description: 'Your scheduled plan change has been cancelled.',
    });
  };


  const handleDownloadMonthlySOA = () => {
    if (!user || !deliveries) {
      toast({ variant: 'destructive', title: 'Error', description: 'User data or deliveries not available.' });
      return;
    }
    if (!soaMonth) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a month to download.' });
        return;
    }

    const currentYear = getYear(new Date());
    const nextYear = currentYear + 1;
    const specialPeriodKey = `${currentYear}-12-${nextYear}-01`;

    let dateRangeForPDF: { from: Date; to: Date; };
    let soaTitleMonth: string;
    
    if (soaMonth === specialPeriodKey) {
        const decThisYear = new Date(currentYear, 11, 1); // December of current year
        const janNextYear = new Date(nextYear, 0, 1);    // January of next year
        dateRangeForPDF = { from: decThisYear, to: endOfMonth(janNextYear) };
        soaTitleMonth = `Dec ${currentYear} - Jan ${nextYear}`;
    } else {
        const [year, month] = soaMonth.split('-').map(Number);
        const selectedMonthDate = new Date(year, month - 1, 2);
        dateRangeForPDF = { from: startOfMonth(selectedMonthDate), to: endOfMonth(selectedMonthDate) };
        soaTitleMonth = format(dateRangeForPDF.from, 'MMMM yyyy');
    }

    const monthlyDeliveries = deliveries.filter(d => isWithinInterval(new Date(d.date), dateRangeForPDF));
    const monthlySanitation = sanitationVisits?.filter(v => isWithinInterval(new Date(v.scheduledDate), dateRangeForPDF)) || [];
    const monthlyCompliance = complianceReports?.filter(r => r.date && isWithinInterval((r.date as any).toDate(), dateRangeForPDF)) || [];

    const consumedLitersThisMonth = monthlyDeliveries.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
    
    let totalAmount = 0;
    if (user.plan?.isConsumptionBased) {
        totalAmount = consumedLitersThisMonth * (user.plan.price || 0);
    } else {
        totalAmount = user.plan?.price || 0;
    }
    
    if (soaMonth === specialPeriodKey && !user.plan?.isConsumptionBased) {
        totalAmount *= 2;
    }

    generateMonthlySOA({
      user,
      deliveries: monthlyDeliveries,
      sanitationVisits: monthlySanitation,
      complianceReports: monthlyCompliance,
      totalAmount,
      billingPeriod: soaTitleMonth,
    });

    toast({
      title: 'Download Started',
      description: `Your Statement of Account for ${soaTitleMonth} is being generated.`,
    });
    
    dispatch({type: 'SET_SOA_DIALOG', payload: false});
  };

  const availableMonths = useMemo(() => {
    const currentYear = getYear(new Date());
    const nextYear = currentYear + 1;
    let months: {value: string, label: string}[] = [];

    // Special combined period for the current year's December and next year's January
    const specialPeriodKey = `${currentYear}-12-${nextYear}-01`;
    months.push({ value: specialPeriodKey, label: `Dec ${currentYear} - Jan ${nextYear}` });
    
    return months;
  }, []);
  
  
  const isSoaReady = useMemo(() => {
    if (!soaMonth) return false;
    const today = endOfDay(new Date());
    
    const currentYear = getYear(new Date());
    const nextYear = currentYear + 1;
    const specialPeriodKey = `${currentYear}-12-${nextYear}-01`;

    if (soaMonth === specialPeriodKey) {
        const endOfJanNextYear = endOfMonth(new Date(nextYear, 0, 1));
        return isAfter(today, endOfJanNextYear);
    }
    
    const endOfSelectedMonth = endOfMonth(new Date(soaMonth + '-02T00:00:00'));
    return isAfter(today, endOfSelectedMonth);
  }, [soaMonth]);
  
  const soaNotReadyMessage = useMemo(() => {
    if (isSoaReady || !soaMonth || !user) return null;
    
    const currentYear = getYear(new Date());
    const nextYear = currentYear + 1;
    const specialPeriodKey = `${currentYear}-12-${nextYear}-01`;

    const monthLabel = soaMonth === specialPeriodKey
        ? `Dec ${currentYear} - Jan ${nextYear}`
        : format(new Date(soaMonth + '-02T00:00:00'), 'MMMM yyyy');
        
    const userName = user.name.split(' ')[0] || 'there';

    return (
        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
            <h4 className="font-semibold text-blue-800">Report Availability</h4>
            <p className="text-sm text-blue-700 mt-1">
                Hi {userName}, your SOA for {monthLabel} will be available for download at the end of the month.
            </p>
            <p className="text-xs text-blue-600 mt-2">
                Stay hydrated and enjoy the convenience with River Business!
            </p>
        </div>
    );
  }, [isSoaReady, soaMonth, user]);

  useEffect(() => {
    if(availableMonths.length > 0 && !soaMonth) {
      setSoaMonth(availableMonths[0].value);
    }
  }, [availableMonths, soaMonth]);

  const toSafeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    if (typeof timestamp === 'object' && 'seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000);
    }
    return null;
  };


  if (!user) return <>{children}</>;

  const displayPhoto = user.photoURL;
  const userFirstName = user.name.split(' ')[0];

  const handleViewInvoice = (invoice: Payment) => {
    dispatch({ type: 'SET_SELECTED_INVOICE_FOR_DETAIL', payload: invoice });
    dispatch({ type: 'SET_INVOICE_DETAIL_DIALOG', payload: true });
  };
  
  const handleDownloadInvoice = (invoice: Payment) => {
    if (!user) return;
    generateInvoicePDF({ user, invoice });
    toast({
      title: 'Download Started',
      description: `Your invoice ${invoice.id} is being generated.`
    });
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} Copied!`, description: 'The ID has been copied to your clipboard.' });
    });
  };

  return (
    <AlertDialog>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}
        <DialogContent className="sm:max-w-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle>My Account</DialogTitle>
            <DialogDescription>Manage your plan, account details, and invoices.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] w-full">
            <div className="pr-6">
              <Tabs defaultValue="accounts">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="accounts"><UserIcon className="mr-2 h-4 w-4" />Accounts</TabsTrigger>
                  <TabsTrigger value="plan"><FileText className="mr-2 h-4 w-4" />Plan</TabsTrigger>
                  <TabsTrigger value="invoices"><Receipt className="mr-2 h-4 w-4" />Invoices</TabsTrigger>
                </TabsList>
                <TabsContent value="accounts" className="py-4">
                  <Card>
                    <CardContent className="pt-6 space-y-6">
                      <div className="flex items-center gap-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="relative group cursor-pointer">
                              <Avatar className="h-20 w-20">
                                <AvatarImage src={displayPhoto ?? undefined} alt={user.name || ''} />
                                <AvatarFallback className="text-3xl">{user.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {(isPending || uploadProgress > 0) && (
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                    <div className="h-6 w-6 border-2 border-dashed rounded-full animate-spin border-white"></div>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuLabel>Profile Photo</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Label htmlFor="photo-upload-input-user" className="w-full cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" /> Upload new photo
                              </Label>
                            </DropdownMenuItem>
                            {displayPhoto && (
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Remove photo
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Input id="photo-upload-input-user" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={isPending} />
                        <div className="space-y-1">
                          <h4 className="font-semibold">{user.name}</h4>
                          <p className="text-sm text-muted-foreground">Update your account details.</p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold">Your Details</h4>
                          {!isEditingDetails && <Button variant="outline" size="sm" onClick={() => setIsEditingDetails(true)}><Edit className="mr-2 h-4 w-4" />Edit Details</Button>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                <Label htmlFor="fullName" className="text-right">Full Name</Label>
                                <Input id="fullName" name="name" value={state.editableFormData.name || ''} onChange={(e) => dispatch({type: 'UPDATE_FORM_DATA', payload: {name: 'name', value: e.target.value}})} disabled={!isEditingDetails} />
                            </div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                <Label htmlFor="email" className="text-right">Login Email</Label>
                                <Input id="email" name="email" type="email" value={state.editableFormData.email || ''} disabled={true} />
                            </div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                <Label htmlFor="businessEmail" className="text-right">Business Email</Label>
                                <Input id="businessEmail" name="businessEmail" type="email" value={state.editableFormData.businessEmail || ''} onChange={(e) => dispatch({type: 'UPDATE_FORM_DATA', payload: {name: 'businessEmail', value: e.target.value}})} disabled={!isEditingDetails} />
                            </div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                <Label htmlFor="businessName" className="text-right">Business Name</Label>
                                <Input id="businessName" name="businessName" value={state.editableFormData.businessName || ''} onChange={(e) => dispatch({type: 'UPDATE_FORM_DATA', payload: {name: 'businessName', value: e.target.value}})} disabled={!isEditingDetails}/>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                <Label htmlFor="address" className="text-right">Address</Label>
                                <Input id="address" name="address" value={state.editableFormData.address || ''} onChange={(e) => dispatch({type: 'UPDATE_FORM_DATA', payload: {name: 'address', value: e.target.value}})} disabled={!isEditingDetails}/>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                <Label htmlFor="contactNumber" className="text-right">Contact Number</Label>
                                <Input id="contactNumber" name="contactNumber" type="tel" value={state.editableFormData.contactNumber || ''} onChange={(e) => dispatch({type: 'UPDATE_FORM_DATA', payload: {name: 'contactNumber', value: e.target.value}})} disabled={!isEditingDetails}/>
                            </div>
                        </div>
                        {isEditingDetails && (
                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="secondary" onClick={() => { setIsEditingDetails(false); dispatch({type: 'SET_FORM_DATA', payload: user}) }}>Cancel</Button>
                                <Button onClick={handleSaveChanges}>Save Changes</Button>
                            </div>
                        )}
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-4">Security</h4>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button onClick={() => dispatch({ type: 'SET_PASSWORD_DIALOG', payload: true })}><KeyRound className="mr-2 h-4 w-4" />Update Password</Button>
                          <Button variant="outline" onClick={() => toast({ title: "Coming soon!" })}><Shield className="mr-2 h-4 w-4" />Enable 2FA</Button>
                        </div>
                      </div>
                      <Separator />
                        <div>
                            <h4 className="font-semibold mb-4">Account Identifiers</h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="uid" className="text-muted-foreground">User ID (UID)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input id="uid" value={user.id} readOnly className="font-mono text-xs h-8 bg-muted border-0"/>
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(user.id, 'User ID')}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="clientId" className="text-muted-foreground">Client ID</Label>
                                    <div className="flex items-center gap-2">
                                        <Input id="clientId" value={user.clientId || 'N/A'} readOnly className="font-mono text-xs h-8 bg-muted border-0"/>
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => user.clientId && copyToClipboard(user.clientId, 'Client ID')} disabled={!user.clientId}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="plan" className="py-4 space-y-6">
                  <Card>
                    <CardContent className="p-0">
                      {planImage && (
                          <div className="relative h-48 w-full">
                              <Image src={planImage.imageUrl} alt={user.clientType || 'Plan Image'} fill style={{ objectFit: 'cover' }} data-ai-hint={planImage.imageHint} />
                          </div>
                      )}
                      <div className="p-6">
                        <h3 className="text-xl font-bold">{user.plan?.name} ({user.clientType})</h3>
                        {user.plan?.isConsumptionBased ? (
                            <p className="text-lg font-bold text-foreground">
                                P{user.plan.price.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}/liter
                            </p>
                        ) : (
                            <p className="text-lg font-bold text-foreground">
                                P{user.plan?.price.toLocaleString()}/month
                            </p>
                        )}
                        <Separator className="my-4" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          {user.plan?.isConsumptionBased ? (
                            <div className="sm:col-span-2">
                              <h4 className="font-semibold mb-2">Plan Details</h4>
                              <ul className="space-y-1 text-muted-foreground">
                                <li><strong>Billing:</strong> Pay based on consumption.</li>
                                <li>
                                  <strong>Deliveries:</strong> Automated, On-demand, or request refills as needed.
                                  {(user.customPlanDetails?.autoRefillEnabled && user.customPlanDetails?.deliveryDay) && 
                                    <span className="text-xs block pl-4 text-primary"> - Auto-refill scheduled for {user.customPlanDetails.deliveryDay} at {user.customPlanDetails.deliveryTime}.</span>
                                  }
                                </li>
                              </ul>
                            </div>
                          ) : (
                            <div>
                                <h4 className="font-semibold mb-2">Water Plan</h4>
                                <ul className="space-y-1 text-muted-foreground">
                                  <li><strong>Liters/Month:</strong> {user.customPlanDetails?.litersPerMonth?.toLocaleString() || 0} L</li>
                                  <li><strong>Bonus Liters:</strong> {user.customPlanDetails?.bonusLiters?.toLocaleString() || 0} L</li>
                                </ul>
                            </div>
                          )}

                          {user.customPlanDetails && (
                            <div>
                                <h4 className="font-semibold mb-2">Equipment</h4>
                                <ul className="space-y-1 text-muted-foreground">
                                    <li className="flex items-center gap-2">
                                        <Package className="h-4 w-4"/>
                                        <span>
                                            {user.customPlanDetails.gallonQuantity || 0} Containers 
                                            ({user.customPlanDetails.gallonPrice > 0 ? `P${user.customPlanDetails.gallonPrice}/mo` : 'Free'})
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Package className="h-4 w-4"/>
                                        <span>
                                            {user.customPlanDetails.dispenserQuantity || 0} Dispensers 
                                            ({user.customPlanDetails.dispenserPrice > 0 ? `P${user.customPlanDetails.dispenserPrice}/mo` : 'Free'})
                                        </span>
                                    </li>
                                </ul>
                            </div>
                           )}

                          <div className="sm:col-span-2">
                            <h4 className="font-semibold mb-2">Delivery Schedule</h4>
                            <p className="text-muted-foreground">
                              {user.customPlanDetails?.deliveryFrequency} on {user.customPlanDetails?.deliveryDay} at {user.customPlanDetails?.deliveryTime}
                            </p>
                          </div>

                        </div>
                      </div>
                    </CardContent>
                  </Card>
                   <Card>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {user.currentContractUrl ? (
                              <Button variant="outline" asChild>
                                  <a href={user.currentContractUrl} target="_blank" rel="noopener noreferrer">
                                      <FileText className="mr-2 h-4 w-4" />
                                      View Contract
                                  </a>
                              </Button>
                          ) : (
                              <Button variant="outline" disabled>
                                  <FileX className="mr-2 h-4 w-4" />
                                  No Contract
                              </Button>
                          )}
                          <Button variant="outline" onClick={() => {
                            dispatch({type: 'SET_CHANGE_PLAN_DIALOG', payload: true});
                          }}>
                              <Repeat className="mr-2 h-4 w-4" />
                              Change Plan
                          </Button>
                          <Button variant="default" onClick={() => dispatch({type: 'SET_SOA_DIALOG', payload: true})}>
                              <Download className="mr-2 h-4 w-4" />
                              Download SOA
                          </Button>
                        </div>
                      </CardContent>
                  </Card>
                   <Card>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <h3 className="font-semibold">Included in Every Plan</h3>
                                <p className="text-sm text-muted-foreground">All subscription plans include full access to our growing network of partner perks.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                {includedFeatures.map((feature, index) => {
                                    const Icon = feature.icon;
                                    return (
                                        <div key={index} className="flex items-start gap-3">
                                            <Icon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                                            <div>
                                                <h4 className="font-medium text-sm">{feature.title}</h4>
                                                <p className="text-xs text-muted-foreground">{feature.description}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="invoices" className="py-4">
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="bg-muted/50 font-semibold">
                                    <TableCell>{format(new Date(currentMonthInvoice.date), 'MMMM yyyy')}</TableCell>
                                    <TableCell>
                                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800')}>
                                            {currentMonthInvoice.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">P{currentMonthInvoice.amount.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" onClick={() => onPayNow(currentMonthInvoice)}>Pay Now</Button>
                                    </TableCell>
                                </TableRow>
                                {paymentHistory.map((invoice) => {
                                    const safeDate = toSafeDate(invoice.date);
                                    return (
                                    <TableRow key={invoice.id}>
                                        <TableCell>{safeDate ? format(safeDate, 'MMMM yyyy') : 'Invalid Date'}</TableCell>
                                        <TableCell>
                                            <span className={cn('px-2 py-1 rounded-full text-xs font-medium',
                                                invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                invoice.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                                invoice.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            )}>
                                                {invoice.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">P{invoice.amount.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            {invoice.status === 'Paid' ? (
                                                <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice)}>View Invoice</Button>
                                            ) : (invoice.status === 'Upcoming' || invoice.status === 'Overdue') ? (
                                                <Button size="sm" variant="outline" onClick={() => onPayNow(invoice)}>Pay Now</Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">{invoice.status}</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )})}
                                {paymentHistory.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-sm text-muted-foreground">
                                            No past invoices found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="space-y-4 md:hidden">
                        <Card className="bg-muted/50">
                            <CardContent className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{format(new Date(currentMonthInvoice.date), 'MMMM yyyy')}</p>
                                    <p className="text-sm">P{currentMonthInvoice.amount.toFixed(2)}</p>
                                </div>
                                <Button size="sm" onClick={() => onPayNow(currentMonthInvoice)}>Pay Now</Button>
                            </CardContent>
                        </Card>
                        {paymentHistory.map((invoice) => {
                             const safeDate = toSafeDate(invoice.date);
                             return (
                            <Card key={invoice.id}>
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{safeDate ? format(safeDate, 'MMMM yyyy') : 'Invalid Date'}</p>
                                            <p className="text-sm">P{invoice.amount.toFixed(2)}</p>
                                        </div>
                                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium',
                                            invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                            invoice.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                            invoice.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        )}>
                                            {invoice.status}
                                        </span>
                                    </div>
                                    {(invoice.status === 'Paid') ? (
                                        <Button size="sm" variant="outline" className="w-full" onClick={() => handleViewInvoice(invoice)}>View Invoice</Button>
                                    ) : (invoice.status === 'Upcoming' || invoice.status === 'Overdue') && (
                                        <Button size="sm" variant="outline" className="w-full" onClick={() => onPayNow(invoice)}>Pay Now</Button>
                                    )}
                                </CardContent>
                            </Card>
                        )})}
                        {paymentHistory.length === 0 && (
                           <p className="text-center py-10 text-sm text-muted-foreground">No past invoices found.</p>
                        )}
                    </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
          <DialogFooter className="pr-6 pt-4 border-t">
            <Button variant="outline" onClick={onLogout}>Logout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
        <Dialog open={state.isInvoiceDetailOpen} onOpenChange={(open) => {
            dispatch({ type: 'SET_INVOICE_DETAIL_DIALOG', payload: open });
            if (!open) {
                dispatch({ type: 'SET_SELECTED_INVOICE_FOR_DETAIL', payload: null });
            }
        }}>
            <DialogContent className="sm:max-w-2xl bg-background p-0 border-0">
                 <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="sr-only">Invoice Receipt</DialogTitle>
                    <DialogDescription className="sr-only">Details for invoice {state.selectedInvoiceForDetail?.id}</DialogDescription>
                </DialogHeader>
                <div className="p-8 pt-0">
                    <div className="flex items-center gap-2 mb-8">
                        <Logo className="h-8 w-8" />
                        <h3 className="font-semibold text-foreground">River Tech Inc.</h3>
                    </div>

                    <Card className="mb-4">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-muted-foreground">Receipt from River Tech Inc.</p>
                                    <p className="text-4xl font-bold mt-1">₱{state.selectedInvoiceForDetail?.amount.toFixed(2)}</p>
                                    <p className="text-sm text-muted-foreground">Paid {state.selectedInvoiceForDetail ? format(toSafeDate(state.selectedInvoiceForDetail.date) || new Date(), 'PP') : ''}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-secondary">
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                </div>
                            </div>
                            <Separator className="my-6" />
                            <div className="space-y-3 text-sm">
                                <Button 
                                    variant="link" 
                                    className="p-0 h-auto text-primary" 
                                    onClick={() => state.selectedInvoiceForDetail && handleDownloadInvoice(state.selectedInvoiceForDetail)}
                                >
                                    <Download className="mr-2 h-4 w-4" /> Download Invoice
                                </Button>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Receipt number</span>
                                    <span className="font-medium font-mono">{state.selectedInvoiceForDetail?.id.split('-').pop()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Invoice number</span>
                                    <span className="font-medium font-mono">{state.selectedInvoiceForDetail?.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Payment method</span>
                                    <span className="font-medium">Online</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Receipt #{state.selectedInvoiceForDetail?.id.split('-').pop()}</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">{state.selectedInvoiceForDetail?.description}</span>
                                    <span className="font-medium">₱{state.selectedInvoiceForDetail?.amount.toFixed(2)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>₱{state.selectedInvoiceForDetail?.amount.toFixed(2)}</span>
                                </div>
                                 <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Tax (inclusive)</span>
                                    <span>₱0.00</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-bold">
                                    <span>Amount Paid</span>
                                    <span>₱{state.selectedInvoiceForDetail?.amount.toFixed(2)}</span>
                                </div>
                             </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>


      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>This will permanently remove your profile photo.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleProfilePhotoDelete}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>

      {/* Photo Preview Dialog */}
      <Dialog open={state.isPhotoPreviewOpen} onOpenChange={(isOpen) => { if (!isPending) dispatch({ type: 'SET_PHOTO_PREVIEW_DIALOG', payload: isOpen }); }}>
        <DialogContent onInteractOutside={(e) => { if (isPending) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>Preview Profile Photo</DialogTitle>
          </DialogHeader>
          <div className="my-4 flex justify-center">
            {state.profilePhotoPreview && <Image src={state.profilePhotoPreview} alt="Preview" width={200} height={200} className="rounded-full aspect-square object-cover" />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch({type: 'RESET_UPLOAD'})} disabled={isPending}>Cancel</Button>
            <Button onClick={handleProfilePhotoUpload} disabled={isPending}>
              {isPending ? 'Uploading...' : 'Upload Photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={state.isPasswordDialogOpen} onOpenChange={(isOpen) => dispatch({ type: 'SET_PASSWORD_DIALOG', payload: isOpen })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type={state.showCurrentPassword ? 'text' : 'password'} value={state.currentPassword} onChange={(e) => dispatch({type: 'SET_PASSWORD_FIELD', payload: {field: 'current', value: e.target.value}})} />
                <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => dispatch({type: 'TOGGLE_PASSWORD_VISIBILITY', payload: 'current'})}>
                    {state.showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <div className="relative">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type={state.showNewPassword ? 'text' : 'password'} value={state.newPassword} onChange={(e) => dispatch({type: 'SET_PASSWORD_FIELD', payload: {field: 'new', value: e.target.value}})} />
                <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => dispatch({type: 'TOGGLE_PASSWORD_VISIBILITY', payload: 'new'})}>
                    {state.showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <div className="relative">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type={state.showConfirmPassword ? 'text' : 'password'} value={state.confirmPassword} onChange={(e) => dispatch({type: 'SET_PASSWORD_FIELD', payload: {field: 'confirm', value: e.target.value}})} />
                <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => dispatch({type: 'TOGGLE_PASSWORD_VISIBILITY', payload: 'confirm'})}>
                    {state.showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => dispatch({ type: 'SET_PASSWORD_DIALOG', payload: false })}>Cancel</Button>
            <Button onClick={handlePasswordChange}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Change Plan Dialog */}
      <Dialog open={state.isChangePlanDialogOpen} onOpenChange={(isOpen) => dispatch({ type: 'SET_CHANGE_PLAN_DIALOG', payload: isOpen })}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Change Your Plan</DialogTitle>
            <DialogDescription>
              {user.pendingPlan ? "A change to your plan is already scheduled." : "Compare your current plan with our Flow Plan and schedule the change."}
            </DialogDescription>
          </DialogHeader>
            {user.pendingPlan ? (
                <div className="py-4 text-center">
                    <Card className="max-w-md mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-center gap-2">
                                <AlertCircle className="h-6 w-6 text-blue-500" />
                                Plan Change Scheduled
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-muted-foreground">Your plan is scheduled to switch to</p>
                            <p className="font-bold text-lg">{user.pendingPlan.name}</p>
                            <p className="text-muted-foreground">on</p>
                            <p className="font-bold text-lg">{user.planChangeEffectiveDate ? format(user.planChangeEffectiveDate.toDate(), 'MMMM d, yyyy') : ''}</p>
                            <p className="text-xs text-muted-foreground pt-4">Hi {userFirstName}, you can undo this request anytime before the effective date if you change your mind.</p>
                        </CardContent>
                         <CardFooter className="flex flex-col gap-2">
                            <Button variant="outline" onClick={handleUndoPlanChange}>
                                <Undo2 className="mr-2 h-4 w-4"/>
                                No, I'm good with my current plan
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            ) : (
                <ScrollArea className="max-h-[70vh]">
                  <div className="pr-6 py-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card 
                            className="flex flex-col cursor-default border-primary border-2"
                        >
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                  Your Current Plan
                                  <CheckCircle className="h-5 w-5 text-primary" />
                                </CardTitle>
                                <CardDescription>{user.plan?.name}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                {user.plan?.isConsumptionBased ? (
                                    <>
                                      <p className="font-bold text-lg">P{user.plan?.price.toLocaleString()}/liter</p>
                                      <Separator className="my-2" />
                                      <ul className="text-sm space-y-1 text-muted-foreground">
                                        <li><strong>Billing:</strong> Your monthly bill is not fixed.</li>
                                        <li><strong>Flexibility:</strong> Pay only for what you consume.</li>
                                      </ul>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-bold text-lg">P{user.plan?.price.toLocaleString()}/month</p>
                                        <Separator className="my-2" />
                                        <ul className="text-sm space-y-1 text-muted-foreground">
                                            <li><strong>Billing:</strong> Fixed monthly bill.</li>
                                            <li><strong>Liters/Month:</strong> {user.customPlanDetails?.litersPerMonth?.toLocaleString() || 0} L</li>
                                        </ul>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                        {flowPlan && !user.plan?.isConsumptionBased && (
                            <Card 
                                onClick={() => dispatch({type: 'SET_SELECTED_NEW_PLAN', payload: flowPlan})}
                                className={cn(
                                    "cursor-pointer hover:border-primary flex flex-col",
                                    state.selectedNewPlan?.name === flowPlan.name && "border-primary border-2"
                                )}
                            >
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                      {flowPlan.name}
                                      {state.selectedNewPlan?.name === flowPlan.name && <CheckCircle className="h-5 w-5 text-primary" />}
                                    </CardTitle>
                                    <CardDescription>{flowPlan.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <p className="font-bold text-lg">P{flowPlan.price}/liter</p>
                                    <Separator className="my-2" />
                                    <ul className="text-sm space-y-1 text-muted-foreground">
                                        <li><strong>Billing:</strong> Your monthly bill is not fixed.</li>
                                        <li><strong>Flexibility:</strong> Pay only for what you consume.</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <Separator />
                    <div className="space-y-4">
                          <div>
                              <h3 className="font-semibold">Included in Every Plan</h3>
                              <p className="text-sm text-muted-foreground">All subscription plans include full access to our growing network of partner perks.</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                              {includedFeatures.map((feature, index) => {
                                  const Icon = feature.icon;
                                  return (
                                      <div key={index} className="flex items-start gap-3">
                                          <Icon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                                          <div>
                                              <h4 className="font-medium text-sm">{feature.title}</h4>
                                              <p className="text-xs text-muted-foreground">{feature.description}</p>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
                  <DialogFooter className="pr-6 pb-4 pt-2">
                    <Button variant="outline" onClick={() => dispatch({type: 'SET_CHANGE_PLAN_DIALOG', payload: false})}>Cancel</Button>
                    <Button onClick={handleConfirmPlanChange} disabled={!state.selectedNewPlan || state.selectedNewPlan.name === user.plan?.name || user.plan?.isConsumptionBased}>
                      Confirm and Switch Plan
                    </Button>
                  </DialogFooter>
                </ScrollArea>
            )}
        </DialogContent>
      </Dialog>
      
      {/* Download SOA Dialog */}
      <Dialog open={state.isSoaDialogOpen} onOpenChange={(isOpen) => dispatch({ type: 'SET_SOA_DIALOG', payload: isOpen })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Statement of Account</DialogTitle>
            <DialogDescription>
              Select the month for which you'd like to download the SOA.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="soa-month">Month</Label>
                <Select value={soaMonth} onValueChange={setSoaMonth}>
                    <SelectTrigger id="soa-month">
                        <SelectValue placeholder="Select an available month..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableMonths.length > 0 ? availableMonths.map(month => (
                            <SelectItem key={month.value} value={month.value}>
                                {month.label}
                            </SelectItem>
                        )) : <SelectItem value="no-data" disabled>No reports available yet</SelectItem>}
                    </SelectContent>
                </Select>
            </div>
            {soaNotReadyMessage}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleDownloadMonthlySOA} disabled={!isSoaReady}>Download SOA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AlertDialog>
  );
}
