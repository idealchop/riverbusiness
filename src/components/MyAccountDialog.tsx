
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
import { doc, updateDoc, collection, Timestamp, deleteField, addDoc, serverTimestamp, query, orderBy, where, collectionGroup } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, User } from 'firebase/auth';
import type { AppUser, ImagePlaceholder, Payment, Delivery, SanitationVisit, ComplianceReport, Transaction, PaymentOption, TopUpRequest } from '@/lib/types';
import { format, startOfMonth, addMonths, isWithinInterval, subMonths, endOfMonth, isAfter, isSameDay, endOfDay, getYear, getMonth, isToday } from 'date-fns';
import { User as UserIcon, KeyRound, Edit, Trash2, Upload, FileText, Receipt, EyeOff, Eye, Pencil, Shield, LayoutGrid, Wrench, ShieldCheck, Repeat, Package, FileX, CheckCircle, AlertCircle, Download, Calendar, Undo2, Copy, Wallet, Info, Users, ArrowRightLeft, Plus, DollarSign, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { enterprisePlans } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { generateMonthlySOA, generateInvoicePDF } from '@/lib/pdf-generator';
import { Logo } from '@/components/icons';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { Badge } from '@/components/ui/badge';


// State Management with useReducer
type State = {
  isPasswordDialogOpen: boolean;
  isPhotoPreviewOpen: boolean;
  isChangePlanDialogOpen: boolean;
  isSoaDialogOpen: boolean;
  isInvoiceDetailOpen: boolean;
  isBreakdownDialogOpen: boolean;
  isTopUpDialogOpen: boolean;
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
  invoiceForBreakdown: Payment | null;
};

type Action =
  | { type: 'SET_EDIT_DETAILS'; payload: boolean }
  | { type: 'SET_PASSWORD_DIALOG'; payload: boolean }
  | { type: 'SET_PHOTO_PREVIEW_DIALOG'; payload: boolean }
  | { type: 'SET_CHANGE_PLAN_DIALOG'; payload: boolean }
  | { type: 'SET_SOA_DIALOG'; payload: boolean }
  | { type: 'SET_INVOICE_DETAIL_DIALOG'; payload: boolean }
  | { type: 'SET_BREAKDOWN_DIALOG'; payload: boolean }
  | { type: 'SET_TOPUP_DIALOG'; payload: boolean }
  | { type: 'SET_SELECTED_INVOICE_FOR_DETAIL', payload: Payment | null }
  | { type: 'SET_INVOICE_FOR_BREAKDOWN', payload: Payment | null }
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
  isBreakdownDialogOpen: false,
  isTopUpDialogOpen: false,
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
  invoiceForBreakdown: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PASSWORD_DIALOG': return { ...state, isPasswordDialogOpen: action.payload };
    case 'SET_PHOTO_PREVIEW_DIALOG': return { ...state, isPhotoPreviewOpen: action.payload };
    case 'SET_CHANGE_PLAN_DIALOG': return { ...state, isChangePlanDialogOpen: action.payload };
    case 'SET_SOA_DIALOG': return { ...state, isSoaDialogOpen: action.payload };
    case 'SET_INVOICE_DETAIL_DIALOG': return { ...state, isInvoiceDetailOpen: action.payload };
    case 'SET_BREAKDOWN_DIALOG': return { ...state, isBreakdownDialogOpen: action.payload };
    case 'SET_TOPUP_DIALOG': return { ...state, isTopUpDialogOpen: action.payload };
    case 'SET_SELECTED_INVOICE_FOR_DETAIL': return { ...state, selectedInvoiceForDetail: action.payload };
    case 'SET_INVOICE_FOR_BREAKDOWN': return { ...state, invoiceForBreakdown: action.payload };
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
  paymentsLoading: boolean;
  onLogout: () => void;
  children: React.ReactNode;
  onPayNow: (invoice: Payment) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function MyAccountDialog({ user, authUser, planImage, paymentHistory, paymentsLoading, onLogout, children, onPayNow, isOpen, onOpenChange }: MyAccountDialogProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isPending, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [soaMonth, setSoaMonth] = useState<string>('');
  const [topUpAmount, setTopUpAmount] = useState<number | ''>('');
  const [topUpProof, setTopUpProof] = useState<File | null>(null);
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);

  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  
  const deliveriesQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'users', user.id, 'deliveries') : null, [firestore, user]);
  const { data: deliveries, isLoading: deliveriesLoading } = useCollection<Delivery>(deliveriesQuery);

  const sanitationVisitsQuery = useMemoFirebase(() => (firestore && authUser) ? collection(firestore, 'users', authUser.uid, 'sanitationVisits') : null, [firestore, authUser]);
  const { data: sanitationVisits } = useCollection<SanitationVisit>(sanitationVisitsQuery);

  const complianceReportsQuery = useMemoFirebase( () => (firestore && user?.assignedWaterStationId) ? collection(firestore, 'waterStations', user.assignedWaterStationId, 'complianceReports') : null, [firestore, user?.assignedWaterStationId]);
  const { data: complianceReports } = useCollection<ComplianceReport>(complianceReportsQuery);

  const transactionsQuery = useMemoFirebase(() => (firestore && user?.accountType === 'Parent') ? query(collection(firestore, 'users', user.id, 'transactions'), orderBy('date', 'desc')) : null, [firestore, user]);
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const topUpRequestsQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'users', user.id, 'topUpRequests'), orderBy('requestedAt', 'desc')) : null, [firestore, user]);
  const { data: topUpRequests } = useCollection<TopUpRequest>(topUpRequestsQuery);

  const isParent = user?.accountType === 'Parent';
  
  const branchUsersQuery = useMemoFirebase(() => (firestore && user?.accountType === 'Parent') ? query(collection(firestore, 'users'), where('parentId', '==', user.id)) : null, [firestore, user]);
  const { data: branchUsers } = useCollection<AppUser>(branchUsersQuery);

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [invoiceCurrentPage, setInvoiceCurrentPage] = useState(1);
  const INVOICES_PER_PAGE = 5;

  const [transactionCurrentPage, setTransactionCurrentPage] = useState(1);
  const TRANSACTIONS_PER_PAGE = 5;

  // Move all hooks before the early return
  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr-payment');
  const bankQr = PlaceHolderImages.find((p) => p.id === 'bpi-qr-payment');
  const paymayaQr = PlaceHolderImages.find((p) => p.id === 'maya-qr-payment');

  const paymentOptions: PaymentOption[] = [
      { name: 'GCash', qr: gcashQr, details: { accountName: 'Jimboy Regalado', accountNumber: '09989811596' } },
      { name: 'BPI', qr: bankQr, details: { accountName: 'Jimboy Regalado', accountNumber: '3489145013' } },
      { name: 'PayMaya', qr: paymayaQr, details: { accountName: 'Jimboy Regalado', accountNumber: '09557750188' } },
  ];

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
  
  const currentMonthInvoice = useMemo(() => {
    if (!user || deliveriesLoading) return null;

    const now = new Date();
    const currentYear = getYear(now);
    const currentMonth = getMonth(now);

    let cycleStart: Date;
    let cycleEnd: Date;
    let monthsToBill = 1;
    let description: string;
    let invoiceIdSuffix: string;

    if (currentYear === 2026 && currentMonth === 1 && user.plan?.isConsumptionBased) {
        cycleStart = new Date(2025, 11, 1); // Dec 1, 2025
        cycleEnd = endOfMonth(new Date(2026, 0, 1)); // Jan 31, 2026
        monthsToBill = 2;
        description = 'Bill for December 2025 - January 2026';
        invoiceIdSuffix = '202512-202601';
    } else {
        cycleStart = startOfMonth(now);
        cycleEnd = endOfMonth(now);
        description = `Bill for ${format(now, 'MMMM yyyy')}`;
        invoiceIdSuffix = format(now, 'yyyyMM');
    }
    
    const deliveriesThisCycle = (deliveries || []).filter(d => {
        const deliveryDate = toSafeDate(d.date);
        return deliveryDate ? isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd }) : false;
    });
    
    const consumedLitersThisCycle = deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);

    let estimatedCost = 0;
    
    const userCreationDate = toSafeDate(user.createdAt);
    const isFirstMonth = userCreationDate ? getYear(userCreationDate) === getYear(now) && getMonth(userCreationDate) === getMonth(now) : false;

    if (isFirstMonth && user.customPlanDetails) {
        if (user.customPlanDetails.gallonPaymentType === 'One-Time') {
            estimatedCost += user.customPlanDetails.gallonPrice || 0;
        }
        if (user.customPlanDetails.dispenserPaymentType === 'One-Time') {
            estimatedCost += user.customPlanDetails.dispenserPrice || 0;
        }
    }

    let monthlyEquipmentCost = 0;
    if (user.customPlanDetails?.gallonPaymentType === 'Monthly') {
        monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
    }
    if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') {
        monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);
    }
    
    const equipmentCostForPeriod = monthlyEquipmentCost * monthsToBill;
    estimatedCost += equipmentCostForPeriod;

    if (user.plan?.isConsumptionBased) {
        const consumptionCost = consumedLitersThisCycle * (user.plan.price || 0);
        estimatedCost += consumptionCost;
    } else {
        const planCost = (user.plan?.price || 0) * (user.plan?.isConsumptionBased ? 1 : monthsToBill);
        estimatedCost += planCost;
    }
    
    return {
        id: `INV-${user.id.substring(0, 5)}-${invoiceIdSuffix}`,
        date: new Date().toISOString(),
        description: isFirstMonth ? `${description} + One-Time Fees` : description,
        amount: estimatedCost,
        status: user.accountType === 'Branch' ? 'Covered by Parent Account' : 'Upcoming',
    };
}, [user, deliveries, deliveriesLoading]);


    const breakdownDetails = useMemo(() => {
        const emptyDetails = { planCost: 0, gallonCost: 0, dispenserCost: 0, consumptionCost: 0, consumedLiters: 0, isCurrent: false, isFirstInvoice: false };
        if (!user || !state.invoiceForBreakdown || !deliveries) {
            return emptyDetails;
        }

        const invoiceDate = toSafeDate(state.invoiceForBreakdown.date);
        if (!invoiceDate) return emptyDetails;
        
        const userCreationDate = toSafeDate(user.createdAt);
        
        const isFirstInvoice = userCreationDate
            ? getYear(invoiceDate) === getYear(userCreationDate) && getMonth(invoiceDate) === getMonth(userCreationDate)
            : false;
        
        const isCurrent = currentMonthInvoice ? state.invoiceForBreakdown.id === currentMonthInvoice.id : false;

        const gallonPrice = user.customPlanDetails?.gallonPrice || 0;
        const dispenserPrice = user.customPlanDetails?.dispenserPrice || 0;

        let planCost = 0;
        let consumptionCost = 0;
        let consumedLiters = 0;
        let gallonCost = 0;
        let dispenserCost = 0;

        const cycleStart = startOfMonth(invoiceDate);
        const cycleEnd = endOfMonth(invoiceDate);
        const deliveriesInPeriod = deliveries.filter(d => {
            const dDate = toSafeDate(d.date);
            return dDate ? isWithinInterval(dDate, { start: cycleStart, end: cycleEnd }) : false;
        });
        consumedLiters = deliveriesInPeriod.reduce((sum, d) => sum + containerToLiter(d.volumeContainers), 0);
        
        if (user.plan?.isConsumptionBased) {
            consumptionCost = consumedLiters * (user.plan.price || 0);
        } else {
            planCost = user.plan?.price || 0;
        }

        if (isFirstInvoice) {
            if (user.customPlanDetails?.gallonPaymentType === 'One-Time') gallonCost += gallonPrice;
            if (user.customPlanDetails?.dispenserPaymentType === 'One-Time') dispenserCost += dispenserPrice;
        }
        
        if (user.customPlanDetails?.gallonPaymentType === 'Monthly') gallonCost += gallonPrice;
        if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') dispenserCost += dispenserPrice;

        return {
            planCost,
            gallonCost,
            dispenserCost,
            consumptionCost,
            consumedLiters,
            isCurrent,
            isFirstInvoice,
        };
    }, [user, state.invoiceForBreakdown, currentMonthInvoice, deliveries]);

    const totalBreakdownAmount = useMemo(() => {
        return (breakdownDetails.planCost || 0) +
               (breakdownDetails.consumptionCost || 0) +
               (breakdownDetails.gallonCost || 0) +
               (breakdownDetails.dispenserCost || 0);
    }, [breakdownDetails]);

  const availableMonths = useMemo(() => {
    const months: {value: string, label: string}[] = [];
    const now = new Date();
    for (let i=0; i < 6; i++) {
        const monthDate = subMonths(now, i);
        months.push({
            value: format(monthDate, 'yyyy-MM'),
            label: format(monthDate, 'MMMM yyyy')
        });
    }
    return months;
  }, []);

  const isSoaReady = useMemo(() => {
    if (!soaMonth) return false;
    const today = endOfDay(new Date());
    const endOfSelectedMonth = endOfMonth(new Date(soaMonth + '-02T00:00:00'));
    return isAfter(today, endOfSelectedMonth);
  }, [soaMonth]);

  const soaNotReadyMessage = useMemo(() => {
    if (isSoaReady || !soaMonth || !user) return null;
        
    const monthLabel = format(new Date(soaMonth + '-02T00:00:00'), 'MMMM yyyy');
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

  const showCurrentMonthInvoice = useMemo(() => {
    if (!currentMonthInvoice) return false;
    return !paymentHistory.some(inv => inv.id === currentMonthInvoice.id);
  }, [currentMonthInvoice, paymentHistory]);

  const allInvoices = useMemo(() => {
    const invoices = [...paymentHistory];
    if (showCurrentMonthInvoice && currentMonthInvoice) {
      invoices.unshift(currentMonthInvoice);
    }
    return invoices
      .filter((invoice): invoice is Payment => {
        if (!invoice) return false;
        const date = toSafeDate(invoice.date);
        return date instanceof Date && !isNaN(date.getTime());
      })
      .sort((a, b) => {
        const dateA = toSafeDate(a.date)!;
        const dateB = toSafeDate(b.date)!;
        return dateB.getTime() - dateA.getTime();
      });
  }, [paymentHistory, showCurrentMonthInvoice, currentMonthInvoice]);

  const totalInvoicePages = Math.ceil(allInvoices.length / INVOICES_PER_PAGE);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (invoiceCurrentPage - 1) * INVOICES_PER_PAGE;
    return allInvoices.slice(startIndex, startIndex + INVOICES_PER_PAGE);
  }, [allInvoices, invoiceCurrentPage]);

  const totalTransactionPages = Math.ceil((transactions?.length || 0) / TRANSACTIONS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    if (!transactions) return [];
    const startIndex = (transactionCurrentPage - 1) * TRANSACTIONS_PER_PAGE;
    return transactions.slice(startIndex, startIndex + TRANSACTIONS_PER_PAGE);
  }, [transactions, transactionCurrentPage]);


  const defaultTab = useMemo(() => {
    if (user?.accountType === 'Parent') return 'transactions';
    if (user?.accountType === 'Branch') return 'invoices';
    if (user?.plan?.isPrepaid) return 'top-ups';
    return 'accounts';
  }, [user]);


  const flowPlan = React.useMemo(() => enterprisePlans.find(p => p.name === 'Flow Plan (P3/L)'), []);
  const isPayday = isToday(startOfMonth(new Date()));

  useEffect(() => {
    if (user) {
      dispatch({ type: 'SET_FORM_DATA', payload: user });
    }
  }, [user]);

  useEffect(() => {
    if(availableMonths.length > 0 && !soaMonth) {
      setSoaMonth(availableMonths[0].value);
    }
  }, [availableMonths, soaMonth]);

  if (!user) {
    return <>{children}</>;
  }

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

    const [year, month] = soaMonth.split('-').map(Number);
    const selectedMonthDate = new Date(year, month - 1, 2);
    const dateRangeForPDF = { from: startOfMonth(selectedMonthDate), to: endOfMonth(selectedMonthDate) };
    const soaTitleMonth = format(dateRangeForPDF.from, 'MMMM yyyy');
    
    const monthlyDeliveries = deliveries.filter(d => isWithinInterval(new Date(d.date), dateRangeForPDF));
    const monthlySanitation = sanitationVisits?.filter(v => isWithinInterval(new Date(v.scheduledDate), dateRangeForPDF)) || [];
    const monthlyCompliance = complianceReports?.filter(r => r.date && isWithinInterval((r.date as any).toDate(), dateRangeForPDF)) || [];

    const consumedLitersThisMonth = monthlyDeliveries.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
    
    let totalAmount = 0;
    
    let monthlyEquipmentCost = 0;
    if (user.customPlanDetails?.gallonPaymentType === 'Monthly') {
        monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
    }
    if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') {
        monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);
    }

    if (user.plan?.isConsumptionBased) {
        totalAmount = consumedLitersThisMonth * (user.plan.price || 0) + monthlyEquipmentCost;
    } else {
        totalAmount = (user.plan?.price || 0) + monthlyEquipmentCost;
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
  
  const handleViewBreakdown = (invoice: Payment) => {
    dispatch({ type: 'SET_INVOICE_FOR_BREAKDOWN', payload: invoice });
    dispatch({ type: 'SET_BREAKDOWN_DIALOG', payload: true });
  };

  const getInvoiceDisplayDate = (invoice: Payment) => {
    const safeDate = toSafeDate(invoice.date);
    return safeDate ? format(safeDate, 'MMMM yyyy') : 'Invalid Date';
  };
  
  const userFirstName = user.name.split(' ')[0];
  const displayPhoto = user.photoURL;

  const handleTopUpSubmit = async () => {
    if (!topUpProof || !topUpAmount || !user || !storage || !auth || !firestore) return;
    
    setIsSubmittingTopUp(true);
    try {
        const filePath = `topup_proofs/${user.id}/${Date.now()}-${topUpProof.name}`;
        const proofUrl = await uploadFileWithProgress(storage, auth, filePath, topUpProof, {}, setUploadProgress);

        const requestData: Omit<TopUpRequest, 'id' | 'rejectionReason'> = {
            userId: user.id,
            amount: Number(topUpAmount),
            status: 'Pending Review',
            requestedAt: serverTimestamp(),
            proofOfPaymentUrl: proofUrl,
        };

        const requestsCollection = collection(firestore, 'users', user.id, 'topUpRequests');
        await addDoc(requestsCollection, requestData);

        toast({
            title: 'Top-Up Request Submitted',
            description: "Your request is now pending review by our admin team.",
        });

        dispatch({type: 'SET_TOPUP_DIALOG', payload: false});
        setTopUpAmount('');
        setTopUpProof(null);

    } catch (error) {
        console.error('Top-up submission failed:', error);
        toast({ variant: 'destructive', title: 'Submission Failed' });
    } finally {
        setIsSubmittingTopUp(false);
    }
  };
  
  const literConversionRate = useMemo(() => {
    if (user?.accountType === 'Parent' && user?.plan?.price > 0) {
        return user.plan.price;
    }
    if (user?.plan?.isConsumptionBased && user.plan.price > 0) {
        return user.plan.price;
    }
    return 3; // Default rate
  }, [user]);

  const literEquivalent = useMemo(() => {
    if (typeof topUpAmount === 'number' && topUpAmount > 0) {
      return (topUpAmount / literConversionRate).toFixed(0);
    }
    return '0';
  }, [topUpAmount, literConversionRate]);
  
  const availableLiters = useMemo(() => {
    if (!isParent) return 0;
    const credits = user?.topUpBalanceCredits ?? 0;
    const totalConsumption = (branchUsers || []).reduce((acc, branch) => acc + branch.totalConsumptionLiters, 0);
    
    return totalConsumption;
  }, [isParent, user?.topUpBalanceCredits, branchUsers]);
  
  const totalBranchConsumptionLiters = useMemo(() => {
    if (!isParent || !deliveries) return 0;
    return deliveries.reduce((total, delivery) => total + containerToLiter(delivery.volumeContainers), 0);
  }, [isParent, deliveries]);

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
              <Tabs defaultValue={defaultTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="accounts"><UserIcon className="mr-2 h-4 w-4" />Accounts</TabsTrigger>
                  {user.accountType === 'Parent' ? (
                    <TabsTrigger value="transactions"><ArrowRightLeft className="mr-2 h-4 w-4" />Transactions</TabsTrigger>
                  ) : user.plan?.isPrepaid ? (
                    <TabsTrigger value="top-ups"><DollarSign className="mr-2 h-4 w-4" />Top-Ups</TabsTrigger>
                  ) : (
                    <TabsTrigger value="invoices"><Receipt className="mr-2 h-4 w-4" />Invoices</TabsTrigger>
                  )}
                  <TabsTrigger value="plan"><FileText className="mr-2 h-4 w-4" />Plan</TabsTrigger>
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
                                    {uploadProgress < 100 ? (
                                        <Progress value={uploadProgress} className="h-1 w-16" />
                                    ) : (
                                        <div className="h-6 w-6 border-2 border-dashed rounded-full animate-spin border-white"></div>
                                    )}
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
                        ) : user.plan?.isPrepaid ? (
                            <p className="text-lg font-bold text-foreground">
                                Prepaid Balance Plan
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
                          ) : user.plan?.isPrepaid ? (
                             <div className="sm:col-span-2">
                              <h4 className="font-semibold mb-2">Plan Details</h4>
                              <ul className="space-y-1 text-muted-foreground">
                                <li><strong>Billing:</strong> Top-up your liter balance as needed.</li>
                                <li><strong>Consumption:</strong> Deliveries deduct from your balance.</li>
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
                                            ({user.customPlanDetails.gallonPrice && user.customPlanDetails.gallonPrice > 0 ? `P${user.customPlanDetails.gallonPrice}${user.customPlanDetails.gallonPaymentType === 'Monthly' ? '/mo' : ' (Rental Fee - One-Time)'}` : 'Free'})
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Package className="h-4 w-4"/>
                                        <span>
                                            {user.customPlanDetails.dispenserQuantity || 0} Dispensers 
                                            ({user.customPlanDetails.dispenserPrice && user.customPlanDetails.dispenserPrice > 0 ? `P${user.customPlanDetails.dispenserPrice}${user.customPlanDetails.dispenserPaymentType === 'Monthly' ? '/mo' : ' (Rental Fee - One-Time)'}` : 'Free'})
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                          {user.accountType === 'Parent' || user.plan?.isPrepaid ? (
                            <Button variant="default" onClick={() => dispatch({type: 'SET_TOPUP_DIALOG', payload: true})}>
                              <Plus className="mr-2 h-4 w-4" /> Top-Up Balance
                            </Button>
                          ) : (
                            <Button variant="default" onClick={() => dispatch({type: 'SET_SOA_DIALOG', payload: true})}>
                                <Download className="mr-2 h-4 w-4" />
                                Download SOA
                            </Button>
                          )}
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
                    
                    {user.plan?.isPrepaid && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Top-Up History</CardTitle>
                                <CardDescription>A log of all your top-up requests.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-60">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Amount (PHP)</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topUpRequests && topUpRequests.length > 0 ? (
                                            topUpRequests.map(req => (
                                                <TableRow key={req.id}>
                                                    <TableCell>{toSafeDate(req.requestedAt) ? format(toSafeDate(req.requestedAt)!, 'PP') : 'N/A'}</TableCell>
                                                    <TableCell className="text-right">₱{req.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={
                                                          req.status === 'Approved' || req.status === 'Approved (Initial Balance)' ? 'default' :
                                                          req.status === 'Pending Review' ? 'secondary' :
                                                          'destructive'
                                                        } className={cn(
                                                            (req.status === 'Approved' || req.status === 'Approved (Initial Balance)') && 'bg-green-100 text-green-800'
                                                        )}>
                                                            {req.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center">No top-up requests yet.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                 <TabsContent value="invoices" className="py-4 space-y-4">
                    {user.accountType === 'Branch' && (
                        <div className="flex items-center gap-2 p-3 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg">
                            <Info className="h-5 w-5 shrink-0" />
                            <p>Your invoices are covered by your parent account. This history is for your records.</p>
                        </div>
                    )}
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
                                {paymentsLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={`skel-inv-${i}`}>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedInvoices.length > 0 ? (
                                    paginatedInvoices.map((invoice) => {
                                        if (!invoice) return null;
                                        const isCurrentEst = showCurrentMonthInvoice && invoice.id === currentMonthInvoice?.id;
                                        return (
                                        <TableRow key={invoice.id} className={cn(isCurrentEst && "bg-muted/50 font-semibold")}>
                                            <TableCell>{getInvoiceDisplayDate(invoice)}</TableCell>
                                            <TableCell>
                                                <span className={cn('px-2 py-1 rounded-full text-xs font-medium',
                                                    invoice.status === 'Covered by Parent Account' ? 'bg-purple-100 text-purple-800' :
                                                    isCurrentEst ? 'bg-blue-100 text-blue-800' :
                                                    invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                    invoice.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                                    invoice.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                )}>
                                                    {invoice.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span>P{invoice.amount.toFixed(2)}</span>
                                                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleViewBreakdown(invoice)}>View details</Button>
                                            </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {invoice.status === 'Covered by Parent Account' ? (
                                                    <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice)}>View Invoice</Button>
                                                ) : isCurrentEst ? (
                                                    isPayday ? (
                                                        <Button size="sm" onClick={() => onPayNow(invoice)}>Pay Now</Button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Payment starts on the 1st</span>
                                                    )
                                                ) : invoice.status === 'Paid' ? (
                                                    <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice)}>View Invoice</Button>
                                                ) : (invoice.status === 'Upcoming' || invoice.status === 'Overdue') ? (
                                                    <Button size="sm" variant="outline" onClick={() => onPayNow(invoice)}>Pay Now</Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">{invoice.status}</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )})
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-sm text-muted-foreground">
                                            No invoices found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="space-y-4 md:hidden">
                        {paymentsLoading ? (
                             Array.from({ length: 3 }).map((_, i) => (
                                <Card key={`skel-inv-mob-${i}`}>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Skeleton className="h-5 w-24 mb-1" />
                                                <Skeleton className="h-6 w-20" />
                                            </div>
                                            <Skeleton className="h-6 w-24 rounded-full" />
                                        </div>
                                        <Skeleton className="h-9 w-full" />
                                    </CardContent>
                                </Card>
                            ))
                        ) : paginatedInvoices.length > 0 ? (
                            paginatedInvoices.map((invoice) => {
                                if (!invoice) return null;
                                const isCurrentEst = showCurrentMonthInvoice && invoice.id === currentMonthInvoice?.id;
                                return (
                                <Card key={invoice.id} className={cn(isCurrentEst && "bg-muted/50")}>
                                    <CardContent className="p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{getInvoiceDisplayDate(invoice)}</p>
                                                <p className="text-sm">P{invoice.amount.toFixed(2)}</p>
                                                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleViewBreakdown(invoice)}>View details</Button>
                                            </div>
                                            <span className={cn('px-2 py-1 rounded-full text-xs font-medium',
                                                invoice.status === 'Covered by Parent Account' ? 'bg-purple-100 text-purple-800' :
                                                isCurrentEst ? 'bg-blue-100 text-blue-800' :
                                                invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                invoice.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                                invoice.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            )}>
                                                {invoice.status}
                                            </span>
                                        </div>
                                        {invoice.status === 'Covered by Parent Account' ? (
                                            <Button size="sm" variant="outline" className="w-full" onClick={() => handleViewInvoice(invoice)}>View Invoice</Button>
                                        ) : isCurrentEst ? (
                                            isPayday ? (
                                                <Button size="sm" className="w-full" onClick={() => onPayNow(invoice)}>Pay Now</Button>
                                            ) : (
                                                <div className="text-xs text-muted-foreground text-center pt-2">Payment starts on the 1st</div>
                                            )
                                        ) : (invoice.status === 'Paid') ? (
                                            <Button size="sm" variant="outline" className="w-full" onClick={() => handleViewInvoice(invoice)}>View Invoice</Button>
                                        ) : (invoice.status === 'Upcoming' || invoice.status === 'Overdue') && (
                                            <Button size="sm" variant="outline" className="w-full" onClick={() => onPayNow(invoice)}>Pay Now</Button>
                                        )}
                                    </CardContent>
                                </Card>
                            )})
                        ) : (
                           <p className="text-center py-10 text-sm text-muted-foreground">No invoices found.</p>
                        )}
                    </div>
                    <div className="flex items-center justify-end space-x-2 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInvoiceCurrentPage(p => Math.max(1, p - 1))}
                            disabled={invoiceCurrentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {invoiceCurrentPage} of {totalInvoicePages > 0 ? totalInvoicePages : 1}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInvoiceCurrentPage(p => Math.min(totalInvoicePages, p + 1))}
                            disabled={invoiceCurrentPage === totalInvoicePages || totalInvoicePages === 0}
                        >
                            Next
                        </Button>
                    </div>
                </TabsContent>
                 <TabsContent value="transactions" className="py-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2"><Wallet className="h-4 w-4"/>Credit Balance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">₱{(user.topUpBalanceCredits ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2"><Droplets className="h-4 w-4" />Available Liter Credits</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{availableLiters.toLocaleString(undefined, {maximumFractionDigits: 0})} L</p>
                                <p className="text-xs text-muted-foreground">Consumed: {(totalBranchConsumptionLiters || 0).toLocaleString()} L</p>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-4">
                        {!transactions ? (
                          <p className="text-center py-10 text-muted-foreground">Loading...</p>
                        ) : paginatedTransactions.length === 0 ? (
                          <p className="text-center py-10 text-muted-foreground">No transactions yet.</p>
                        ) : (
                          paginatedTransactions.map(tx => (
                            <Card key={tx.id}>
                              <CardContent className="p-4 space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold text-sm">{tx.description}</p>
                                    <p className="text-xs text-muted-foreground">{toSafeDate(tx.date) ? format(toSafeDate(tx.date)!, 'PP') : 'N/A'}</p>
                                  </div>
                                  <Badge variant={tx.type === 'Credit' ? 'default' : 'secondary'} className={cn('text-xs', tx.type === 'Credit' && 'bg-green-100 text-green-800')}>
                                    {tx.type === 'Debit' ? 'Deducted' : tx.type}
                                  </Badge>
                                </div>
                                <p className={cn("text-lg font-bold text-right", tx.type === 'Credit' ? 'text-green-600' : 'text-red-600')}>
                                  {tx.type === 'Credit' ? '+' : '-'}{`₱${(tx.amountCredits ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`}
                                </p>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                      {(transactions?.length || 0) > 0 && (
                        <div className="flex items-center justify-end space-x-2 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTransactionCurrentPage(p => Math.max(1, p - 1))}
                                disabled={transactionCurrentPage === 1}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Page {transactionCurrentPage} of {totalTransactionPages > 0 ? totalTransactionPages : 1}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTransactionCurrentPage(p => Math.min(totalTransactionPages, p + 1))}
                                disabled={transactionCurrentPage === totalTransactionPages || totalTransactionPages === 0}
                            >
                                Next
                            </Button>
                        </div>
                      )}
                 </TabsContent>
                 <TabsContent value="top-ups" className="py-4 space-y-4">
                    {user.accountType === 'Branch' ? (
                        <div className="flex items-center gap-2 p-3 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg">
                            <Info className="h-5 w-5 shrink-0" />
                            <p>Your invoices are covered by your parent account. This history is for your records.</p>
                        </div>
                    ) : (
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between">
                               <div>
                                 <CardTitle>Top-Up / Payment History</CardTitle>
                                 <CardDescription>A log of your top-up payments.</CardDescription>
                               </div>
                               <Button variant="default" onClick={() => dispatch({type: 'SET_TOPUP_DIALOG', payload: true})}>
                                  <Plus className="mr-2 h-4 w-4" /> Top-Up
                               </Button>
                           </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Amount (PHP)</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topUpRequests && topUpRequests.length > 0 ? (
                                            topUpRequests.map(req => {
                                                const asPayment: Payment = {
                                                    id: req.id,
                                                    date: (req.requestedAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
                                                    description: `Top-Up Request`,
                                                    amount: req.amount,
                                                    status: req.status,
                                                    proofOfPaymentUrl: req.proofOfPaymentUrl,
                                                };
                                                return (
                                                    <TableRow key={req.id}>
                                                        <TableCell>{toSafeDate(req.requestedAt) ? format(toSafeDate(req.requestedAt)!, 'PP') : 'N/A'}</TableCell>
                                                        <TableCell>₱{req.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={
                                                              req.status === 'Approved' || req.status === 'Approved (Initial Balance)' ? 'default' :
                                                              req.status === 'Pending Review' ? 'secondary' :
                                                              'destructive'
                                                            } className={cn(
                                                                (req.status === 'Approved' || req.status === 'Approved (Initial Balance)') && 'bg-green-100 text-green-800'
                                                            )}>
                                                                {req.status}
                                                            </Badge>
                                                        </TableCell>
                                                         <TableCell className="text-right">
                                                            <Button size="sm" variant="outline" onClick={() => handleViewInvoice(asPayment)}>
                                                                View Receipt
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center">No top-up requests yet.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                 </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
          <DialogFooter className="pr-6 pt-4 border-t">
            <Button variant="outline" onClick={onLogout}>Logout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Breakdown Dialog */}
      <Dialog open={state.isBreakdownDialogOpen} onOpenChange={(open) => { if (!open) { dispatch({type: 'SET_INVOICE_FOR_BREAKDOWN', payload: null}); } dispatch({type: 'SET_BREAKDOWN_DIALOG', payload: open}); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Invoice Breakdown</DialogTitle>
            <DialogDescription>
               This is a breakdown of the total amount for the invoice for {state.invoiceForBreakdown ? getInvoiceDisplayDate(state.invoiceForBreakdown) : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                {breakdownDetails.planCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Plan ({user.plan?.name})</span>
                    <span className="font-medium">P{breakdownDetails.planCost.toFixed(2)}</span>
                  </div>
                )}
                 {breakdownDetails.consumptionCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Water Consumption ({breakdownDetails.consumedLiters.toLocaleString()} L)</span>
                    <span className="font-medium">P{breakdownDetails.consumptionCost.toFixed(2)}</span>
                  </div>
                )}
                {user.customPlanDetails?.gallonQuantity > 0 &&
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Container Rental ({user.customPlanDetails?.gallonQuantity || 0} units)
                            <span className="text-xs ml-1">({user.customPlanDetails.gallonPaymentType})</span>
                        </span>
                        <span className="font-medium">P{(breakdownDetails.gallonCost || 0).toFixed(2)}</span>
                    </div>
                }
                {user.customPlanDetails?.dispenserQuantity > 0 &&
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Dispenser Rental ({user.customPlanDetails?.dispenserQuantity || 0} units)
                             <span className="text-xs ml-1">({user.customPlanDetails.dispenserPaymentType})</span>
                        </span>
                        <span className="font-medium">P{(breakdownDetails.dispenserCost || 0).toFixed(2)}</span>
                    </div>
                }
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total Amount</span>
                  <span>P{totalBreakdownAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
            {breakdownDetails.isCurrent && (
              <p className="text-xs text-muted-foreground text-center">
                This is a live estimate for the current billing period. Final amount may vary.
              </p>
            )}
          </div>
           <DialogFooter>
             <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
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
          {isPending && <Progress value={uploadProgress} className="w-full" />}
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
      
       {/* Top-Up Dialog */}
      <Dialog open={state.isTopUpDialogOpen} onOpenChange={(isOpen) => dispatch({ type: 'SET_TOPUP_DIALOG', payload: isOpen })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Top-Up Your Balance</DialogTitle>
            <DialogDescription>Add credits to your Parent Account to cover your branch deliveries.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="top-up-amount">Amount (PHP)</Label>
                <Input id="top-up-amount" type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(Number(e.target.value) || '')} placeholder="Enter amount to top-up" disabled={isSubmittingTopUp}/>
                 {topUpAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Approximately {literEquivalent} liters (based on a ₱{literConversionRate.toFixed(2)}/liter rate)
                  </p>
                )}
              </div>
               <div className="space-y-2">
                <p className="text-sm font-medium">Payment Method</p>
                <p className="text-xs text-muted-foreground">You may send your payment through any of our accredited payment channels below.</p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                    {paymentOptions.map(option => (
                        <Card key={option.name}>
                            <CardHeader className="p-3">
                                <CardTitle className="text-sm">{option.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 text-xs">
                                {option.details ? (
                                    <>
                                        <p className="font-semibold">{option.details.accountName}</p>
                                        <p>{option.details.accountNumber}</p>
                                    </>
                                ) : (
                                    <p>Scan QR in payment app.</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="top-up-proof">Upload Proof of Payment</Label>
                <Input id="top-up-proof" type="file" onChange={(e) => setTopUpProof(e.target.files?.[0] || null)} disabled={isSubmittingTopUp}/>
                 {isSubmittingTopUp && <Progress value={uploadProgress} className="h-1" />}
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch({type: 'SET_TOPUP_DIALOG', payload: false})} disabled={isSubmittingTopUp}>Cancel</Button>
            <Button onClick={handleTopUpSubmit} disabled={!topUpAmount || !topUpProof || isSubmittingTopUp}>
              {isSubmittingTopUp ? "Submitting..." : "Submit for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AlertDialog>
  );
}



