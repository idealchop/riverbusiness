

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCog, UserPlus, KeyRound, Trash2, MoreHorizontal, Users, Building, LogIn, Eye, EyeOff, FileText, Users2, UserCheck, Paperclip, Upload, MinusCircle, Info, Download, Calendar as CalendarIcon, PlusCircle, FileHeart, ShieldX, Receipt, History, Truck, PackageCheck, Package, LogOut, Edit, Shield, Wrench, BarChart, Save, StickyNote, Repeat, BellRing, X, Search, Pencil, CheckCircle, AlertTriangle, MessageSquare, Share2, Copy, RefreshCw, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { format, differenceInMonths, addMonths, isWithinInterval, startOfMonth, endOfMonth, subMonths, formatDistanceToNow, getYear, getMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AppUser, Delivery, WaterStation, Payment, ComplianceReport, SanitationVisit, Schedule, RefillRequest, SanitationChecklistItem, RefillRequestStatus, Notification, DispenserReport, Transaction, TopUpRequest } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser, useDoc, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, updateDoc, collectionGroup, getDoc, getDocs, query, increment, addDoc, DocumentReference, arrayUnion, Timestamp, where, deleteField, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { clientTypes, enterprisePlans, familyPlans, smePlans, commercialPlans, corporatePlans } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AdminMyAccountDialog } from '@/components/AdminMyAccountDialog';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminDashboardSkeleton } from './AdminDashboardSkeleton';
import { LiveChat } from '../live-chat';

const newStationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    location: z.string().min(1, 'Location is required'),
});

type NewStationFormValues = z.infer<typeof newStationSchema>;

const complianceReportSchema = z.object({
    reportType: z.enum(['DOH Bacteriological Test (Monthly)', 'DOH Bacteriological Test (Semi-Annual)', 'Sanitary Permit', 'Business Permit']),
    resultId: z.string().min(1, 'Result ID is required.'),
    status: z.enum(['Passed', 'Failed', 'Pending Review']),
    results: z.string().optional(),
    reportFile: z.any().optional(),
});
type ComplianceReportFormValues = z.infer<typeof complianceReportSchema>;


const deliveryFormSchema = z.object({
    trackingNumber: z.string().min(1, 'Tracking Number is required'),
    date: z.date({ required_error: 'Date is required.'}),
    volumeContainers: z.coerce.number().min(1, 'Volume is required.'),
    status: z.enum(['Pending', 'In Transit', 'Delivered']),
    proofFile: z.any().optional(),
    adminNotes: z.string().optional(),
});
type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;

const dispenserReportSchema = z.object({
    dispenserId: z.string(),
    dispenserName: z.string().min(1, "Dispenser name is required"),
    dispenserCode: z.string().optional(),
});

const sanitationVisitSchema = z.object({
    scheduledDate: z.date({ required_error: 'Date is required.' }),
    status: z.enum(['Scheduled', 'Completed', 'Cancelled']),
    assignedTo: z.string().min(1, "Please assign a team member."),
    reportFile: z.any().optional(),
    dispenserReports: z.array(dispenserReportSchema).min(1, 'At least one dispenser is required.'),
});

type SanitationVisitFormValues = z.infer<typeof sanitationVisitSchema>;

const planDetailsSchema = z.object({
  litersPerMonth: z.coerce.number().optional(),
  bonusLiters: z.coerce.number().optional(),
  gallonQuantity: z.coerce.number().min(0, "Cannot be negative"),
  gallonPrice: z.coerce.number().min(0, "Cannot be negative"),
  gallonPaymentType: z.enum(['Monthly', 'One-Time']),
  dispenserQuantity: z.coerce.number().min(0, "Cannot be negative"),
  dispenserPrice: z.coerce.number().min(0, "Cannot be negative"),
  dispenserPaymentType: z.enum(['Monthly', 'One-Time']),
  deliveryFrequency: z.string().optional(),
  deliveryDay: z.string().optional(),
  deliveryTime: z.string().optional(),
  autoRefillEnabled: z.boolean(),
});


const newUserSchema = z.object({
  clientId: z.string().min(1, { message: 'Client ID is required' }),
  name: z.string().min(1, { message: 'Full Name is required' }),
  businessEmail: z.string().email({ message: 'Invalid business email' }).optional().or(z.literal('')),
  businessName: z.string().min(1, { message: 'Business Name is required' }),
  address: z.string().min(1, { message: 'Address is required' }),
  contactNumber: z.string().min(1, { message: 'Contact Number is required' }),
  clientType: z.string().min(1, { message: 'Plan type is required' }),
  plan: z.any().refine(data => data !== null, { message: "Please select a plan." }),
  initialTopUp: z.coerce.number().optional(), 
  accountType: z.enum(['Single', 'Parent', 'Branch']).default('Single'),
  parentId: z.string().optional(),
  customPlanDetails: planDetailsSchema.optional(),
});


type NewUserFormValues = z.infer<typeof newUserSchema>;


const defaultChecklistItems: Omit<SanitationChecklistItem, 'id'>[] = [
    { item: 'Exterior surfaces inspected for dust, dirt, or spills.', checked: false, remarks: '' },
    { item: 'Dispenser exterior cleaned and disinfected.', checked: false, remarks: '' },
    { item: 'Drip tray checked, cleaned, and sanitized.', checked: false, remarks: '' },
    { item: 'Dispensing nozzles cleaned and checked for blockage.', checked: false, remarks: '' },
    { item: 'Internal water lines flushed (if applicable).', checked: false, remarks: '' },
    { item: 'Refillable bottles/containers inspected for cracks or contamination.', checked: false, remarks: '' },
    { item: 'Bottle caps cleaned and checked for proper sealing.', checked: false, remarks: '' },
    { item: 'Inspection for mold, algae, or discoloration.', checked: false, remarks: '' },
    { item: 'The surrounding area was cleaned and kept dry.', checked: false, remarks: '' },
    { item: 'Temperature settings (hot/cold) verified.', checked: false, remarks: '' },
];


const containerToLiter = (containers: number) => (containers || 0) * 19.5;


export function AdminDashboard({ isAdmin }: { isAdmin: boolean }) {
    const { toast } = useToast();
    const auth = useAuth();
    const storage = useStorage();
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const usersQuery = useMemoFirebase(() => (firestore && isAdmin) ? query(collection(firestore, 'users'), where('role', '==', 'User')) : null, [firestore, isAdmin]);
    const { data: appUsers, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);

    const parentUsers = useMemo(() => appUsers?.filter(u => u.accountType === 'Parent'), [appUsers]);

    const unclaimedProfilesQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'unclaimedProfiles') : null, [firestore, isAdmin]);
    const { data: unclaimedProfiles, isLoading: unclaimedProfilesLoading } = useCollection<any>(unclaimedProfilesQuery);

    const waterStationsQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'waterStations') : null, [firestore, isAdmin]);
    const { data: waterStations, isLoading: stationsLoading } = useCollection<WaterStation>(waterStationsQuery);

    const refillRequestsQuery = useMemoFirebase(() => (firestore && isAdmin) ? query(collectionGroup(firestore, 'refillRequests')) : null, [firestore, isAdmin]);
    const { data: refillRequests, isLoading: refillRequestsLoading } = useCollection<RefillRequest>(refillRequestsQuery);
    
    const [isUserDetailOpen, setIsUserDetailOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<AppUser | null>(null);
    const [isDeliveryHistoryOpen, setIsDeliveryHistoryOpen] = React.useState(false);
    const [userForHistory, setUserForHistory] = React.useState<AppUser | null>(null);
    const [isUserInvoicesOpen, setIsUserInvoicesOpen] = React.useState(false);
    const [userForInvoices, setUserForInvoices] = React.useState<AppUser | null>(null);
    
    const [stationToUpdate, setStationToUpdate] = React.useState<WaterStation | null>(null);
    const [stationToDelete, setStationToDelete] = React.useState<WaterStation | null>(null);
    const [selectedProofUrl, setSelectedProofUrl] = React.useState<string | null>(null);
    const [deliveryToUpdate, setDeliveryToUpdate] = React.useState<Delivery | null>(null);
    const [deliveryProofFile, setDeliveryProofFile] = React.useState<File | null>(null);
    const [deliveryDateRange, setDeliveryDateRange] = React.useState<DateRange | undefined>()
    const [isStationProfileOpen, setIsStationProfileOpen] = React.useState(false);
    const [isAssignStationOpen, setIsAssignStationOpen] = React.useState(false);
    const [stationToAssign, setStationToAssign] = React.useState<string | undefined>();
    const [isCreateDeliveryOpen, setIsCreateDeliveryOpen] = React.useState(false);
    const [isEditDeliveryOpen, setIsEditDeliveryOpen] = React.useState(false);
    const [deliveryToEdit, setDeliveryToEdit] = React.useState<Delivery | null>(null);
    const [deliveryToDelete, setDeliveryToDelete] = React.useState<Delivery | null>(null);
    const [isUploadContractOpen, setIsUploadContractOpen] = React.useState(false);
    const [userForContract, setUserForContract] = React.useState<AppUser | null>(null);
    const [contractFile, setContractFile] = React.useState<File | null>(null);
    const [agreementFile, setAgreementFile] = React.useState<File | null>(null);
    
    const [isComplianceReportDialogOpen, setIsComplianceReportDialogOpen] = React.useState(false);
    const [complianceReportToEdit, setComplianceReportToEdit] = React.useState<ComplianceReport | null>(null);
    const [complianceReportToDelete, setComplianceReportToDelete] = React.useState<ComplianceReport | null>(null);

    const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
    const [complianceRefresher, setComplianceRefresher] = React.useState(0);
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = React.useState(false);
    const [userForSchedule, setUserForSchedule] = React.useState<AppUser | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [localSearchTerm, setLocalSearchTerm] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(20);

    const [isManageInvoiceOpen, setIsManageInvoiceOpen] = React.useState(false);
    const [selectedInvoice, setSelectedInvoice] = React.useState<Payment | null>(null);
    const [rejectionReason, setRejectionReason] = React.useState('');
    const [isSanitationHistoryOpen, setIsSanitationHistoryOpen] = React.useState(false);
    const [isSanitationVisitDialogOpen, setIsSanitationVisitDialogOpen] = React.useState(false);
    const [visitToEdit, setVisitToEdit] = React.useState<SanitationVisit | null>(null);
    const [visitToDelete, setVisitToDelete] = React.useState<SanitationVisit | null>(null);
    const [isCreateUserOpen, setIsCreateUserOpen] = React.useState(false);
    const [isTopUpDialogOpen, setIsTopUpDialogOpen] = React.useState(false);
    const [topUpAmount, setTopUpAmount] = React.useState<number>(0);
    const [isDebitDialogOpen, setIsDebitDialogOpen] = React.useState(false);
    const [debitAmount, setDebitAmount] = React.useState<number>(0);
    const [debitReason, setDebitReason] = React.useState('');
    
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedProofUrl, setUploadedProofUrl] = useState<string | null>(null);
    const [uploadedAgreementUrl, setUploadedAgreementUrl] = useState<string | null>(null);
    const [sharingVisitId, setSharingVisitId] = useState<string | null>(null);

    const adminUserDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
    const { data: adminUser } = useDoc<AppUser>(adminUserDocRef);

    const userDeliveriesQuery = useMemoFirebase(() => {
        const userToQuery = userForHistory || selectedUser || userForInvoices;
        if (!firestore || !userToQuery) return null;
        return collection(firestore, 'users', userToQuery.id, 'deliveries');
    }, [firestore, selectedUser, userForHistory, userForInvoices]);
    const { data: userDeliveriesData } = useCollection<Delivery>(userDeliveriesQuery);

    const paymentsQuery = useMemoFirebase(() => {
        const userToQuery = userForInvoices || selectedUser;
        if (!firestore || !userToQuery) return null;
        return collection(firestore, 'users', userToQuery.id, 'payments');
    }, [firestore, userForInvoices, selectedUser]);
    const { data: userPaymentsData, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);

    const sanitationVisitsQuery = useMemoFirebase(() => {
        if (!firestore || !selectedUser) return null;
        return collection(firestore, 'users', selectedUser.id, 'sanitationVisits');
    }, [firestore, selectedUser]);
    const { data: sanitationVisitsData, isLoading: sanitationVisitsLoading } = useCollection<SanitationVisit>(sanitationVisitsQuery);
    
    const allPaymentsQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'payments') : null, [firestore]);
    const { data: allPayments, isLoading: allPaymentsLoading } = useCollection<Payment & { parentId: string }>(allPaymentsQuery, {
        idField: 'parentId'
    });
    
    const userTopUpRequestsQuery = useMemoFirebase(() => firestore && selectedUser ? query(collection(firestore, 'users', selectedUser.id, 'topUpRequests'), orderBy('requestedAt', 'desc')) : null, [firestore, selectedUser]);
    const { data: topUpRequests } = useCollection<TopUpRequest>(userTopUpRequestsQuery);

    const branchUsersQuery = useMemoFirebase(() => (firestore && selectedUser?.accountType === 'Parent') ? query(collection(firestore, 'users'), where('parentId', '==', selectedUser.id)) : null, [firestore, selectedUser]);
    const { data: branchUsers } = useCollection<AppUser>(branchUsersQuery);

    const parentTransactionsQuery = useMemoFirebase(() => (firestore && selectedUser?.accountType === 'Parent') ? query(collection(firestore, 'users', selectedUser.id, 'transactions'), orderBy('date', 'desc')) : null, [firestore, selectedUser]);
    const { data: parentTransactions } = useCollection<Transaction>(parentTransactionsQuery);

    const pendingPaymentsByUser = React.useMemo(() => {
        if (!allPayments) return {};
        return allPayments.reduce((acc, payment) => {
            if (payment.status === 'Pending Review') {
                const userId = payment.parentId.split('/')[1];
                if (!acc[userId]) {
                    acc[userId] = [];
                }
                acc[userId].push(payment);
            }
            return acc;
        }, {} as Record<string, Payment[]>);
    }, [allPayments]);

    const createNotification = async (userId: string, notificationData: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'>) => {
        if (!firestore) return;
        try {
            const notificationWithMeta = {
                ...notificationData,
                userId,
                date: serverTimestamp(),
                isRead: false,
            };
            await addDoc(collection(firestore, 'users', userId, 'notifications'), notificationWithMeta);
        } catch (error) {
            console.error("Failed to create notification:", error);
        }
    };

    const currentMonthInvoice = React.useMemo(() => {
        const userToCalc = userForInvoices || selectedUser;
        if (!userToCalc) return null;
    
        const now = new Date();
        const cycleStart = startOfMonth(now);
        const cycleEnd = endOfMonth(now);
        
        const description = `Bill for ${format(now, 'MMMM yyyy')}`;
        const invoiceIdSuffix = format(now, 'yyyyMM');
    
        const deliveriesThisCycle = (userDeliveriesData || []).filter(d => {
            const deliveryDate = new Date(d.date);
            return isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd });
        });
    
        const consumedLitersThisCycle = deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
    
        let estimatedCost = 0;
        let monthlyEquipmentCost = 0;
        if (userToCalc.customPlanDetails?.gallonPaymentType === 'Monthly') {
            monthlyEquipmentCost += (userToCalc.customPlanDetails?.gallonPrice || 0);
        }
        if (userToCalc.customPlanDetails?.dispenserPaymentType === 'Monthly') {
            monthlyEquipmentCost += (userToCalc.customPlanDetails?.dispenserPrice || 0);
        }

        if (userToCalc.plan?.isConsumptionBased) {
            const consumptionCost = consumedLitersThisCycle * (userToCalc.plan.price || 0);
            estimatedCost = consumptionCost + monthlyEquipmentCost;
        } else {
            const planCost = (userToCalc.plan?.price || 0);
            estimatedCost = planCost + monthlyEquipmentCost;
        }
    
        return {
            id: `INV-${userToCalc.id.substring(0, 5)}-${invoiceIdSuffix}`,
            date: new Date().toISOString(),
            description: description,
            amount: estimatedCost,
            status: 'Upcoming',
        } as Payment;
    
    }, [userForInvoices, selectedUser, userDeliveriesData]);
    
    const consumptionDetails = React.useMemo(() => {
        const now = new Date();
        const emptyState = {
            monthlyPlanLiters: 0,
            bonusLiters: 0,
            rolloverLiters: 0,
            totalLitersForMonth: 0,
            consumedLitersThisMonth: 0,
            currentBalance: 0,
            estimatedCost: 0,
        };
    
        if (!selectedUser || !selectedUser.plan || !userDeliveriesData) {
            if (selectedUser?.plan?.isPrepaid) {
                return { ...emptyState, currentBalance: selectedUser.totalConsumptionLiters || 0 };
            }
            return { ...emptyState, currentBalance: selectedUser?.totalConsumptionLiters || 0 };
        }
    
        const planDetails = selectedUser.customPlanDetails || selectedUser.plan.customPlanDetails;

        const cycleStart = startOfMonth(now);
        const cycleEnd = endOfMonth(now);
        
        const deliveriesThisCycle = (userDeliveriesData || []).filter(d => {
            const deliveryDate = new Date(d.date);
            return isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd });
        });
        const consumedLitersThisMonth = deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
    
        if (selectedUser.plan.isConsumptionBased) {
            return {
                ...emptyState,
                consumedLitersThisMonth,
                estimatedCost: consumedLitersThisMonth * (selectedUser.plan.price || 3),
            };
        }

        if (selectedUser.plan.isPrepaid) {
            return {
                 ...emptyState,
                consumedLitersThisMonth,
                currentBalance: selectedUser.totalConsumptionLiters,
            }
        }

        if (!selectedUser.createdAt) return emptyState;
        if (!planDetails) return { ...emptyState, currentBalance: selectedUser.totalConsumptionLiters - consumedLitersThisMonth };


        const createdAtDate = typeof (selectedUser.createdAt as any)?.toDate === 'function' 
            ? (selectedUser.createdAt as any).toDate() 
            : new Date(selectedUser.createdAt as string);

        const lastMonth = subMonths(now, 1);
        const lastCycleStart = startOfMonth(lastMonth);
        
        const monthlyPlanLiters = planDetails.litersPerMonth || 0;
        const bonusLiters = planDetails.bonusLiters || 0;
        const totalMonthlyAllocation = monthlyPlanLiters + bonusLiters;
        
        let rolloverLiters = 0;
        
        if (createdAtDate < lastCycleStart) {
            const lastCycleEnd = endOfMonth(lastMonth);
            const deliveriesLastCycle = userDeliveriesData.filter(d => {
                const deliveryDate = new Date(d.date);
                return isWithinInterval(deliveryDate, { start: lastCycleStart, end: lastCycleEnd });
            });
            const consumedLitersLastMonth = deliveriesLastCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
            
            rolloverLiters = Math.max(0, totalMonthlyAllocation - consumedLitersLastMonth);
        }
    
        const totalLitersForMonth = totalMonthlyAllocation + rolloverLiters;
        const currentBalance = totalLitersForMonth - consumedLitersThisMonth;
    
        return {
            ...emptyState,
            monthlyPlanLiters,
            bonusLiters,
            rolloverLiters,
            totalLitersForMonth,
            consumedLitersThisMonth,
            currentBalance,
        };
    }, [selectedUser, userDeliveriesData]);

    const monthlyConsumptionHistory = React.useMemo(() => {
        if (!userDeliveriesData || !selectedUser?.plan) return [];

        const history: { [month: string]: { liters: number; cost: number } } = {};
        const rate = selectedUser.plan.isConsumptionBased ? (selectedUser.plan.price || 3) : 0;

        userDeliveriesData.forEach(delivery => {
            const date = new Date(delivery.date);
            const monthKey = format(date, 'yyyy-MM');
            const liters = containerToLiter(delivery.volumeContainers);

            if (!history[monthKey]) {
                history[monthKey] = { liters: 0, cost: 0 };
            }
            history[monthKey].liters += liters;
            if (selectedUser.plan?.isConsumptionBased) {
                history[monthKey].cost += liters * rate;
            }
        });
        
        if (!selectedUser.plan?.isConsumptionBased) {
            Object.keys(history).forEach(monthKey => {
                 history[monthKey].cost = selectedUser.plan?.price || 0;
            });
        }

        return Object.entries(history)
            .map(([month, data]) => ({
                month: format(new Date(month + '-02'), 'MMM yyyy'),
                liters: data.liters,
                cost: data.cost
            }))
            .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

    }, [userDeliveriesData, selectedUser?.plan]);


    const complianceReportsQuery = useMemoFirebase(() => 
        (firestore && stationToUpdate?.id) 
        ? collection(firestore, 'waterStations', stationToUpdate.id, 'complianceReports') 
        : null, 
        [firestore, stationToUpdate?.id, complianceRefresher]
    );
    const { data: complianceReports } = useCollection<ComplianceReport>(complianceReportsQuery);

    React.useEffect(() => {
        const openAccountDialog = () => {
          setIsAccountDialogOpen(true);
        };
        const openUserDetail = (event: Event) => {
            const customEvent = event as CustomEvent;
            const userId = customEvent.detail.userId;
            if(userId) {
                const userToOpen = appUsers?.find(u => u.id === userId);
                if (userToOpen) {
                    setSelectedUser(userToOpen);
                    setIsUserDetailOpen(true);
                }
            }
        };
    
        window.addEventListener('admin-open-my-account', openAccountDialog);
        window.addEventListener('admin-open-user-detail', openUserDetail);
    
        return () => {
          window.removeEventListener('admin-open-my-account', openAccountDialog);
          window.removeEventListener('admin-open-user-detail', openUserDetail);
        };
    }, [appUsers]);

    const stationForm = useForm<NewStationFormValues>({
        resolver: zodResolver(newStationSchema),
        defaultValues: { name: '', location: '' },
    });

    const deliveryForm = useForm<DeliveryFormValues>({
        resolver: zodResolver(deliveryFormSchema),
        defaultValues: { trackingNumber: '', volumeContainers: 0, status: 'Pending', adminNotes: '' },
    });
    
    const editDeliveryForm = useForm<DeliveryFormValues>({
        resolver: zodResolver(deliveryFormSchema),
    });
    
    const newUserForm = useForm<NewUserFormValues>({
        resolver: zodResolver(newUserSchema),
        defaultValues: {
            clientId: '',
            name: '',
            businessEmail: '',
            businessName: '',
            address: '',
            contactNumber: '',
            clientType: '',
            plan: null,
            initialTopUp: 0,
            accountType: 'Single',
            customPlanDetails: {
                gallonQuantity: 0,
                gallonPrice: 0,
                gallonPaymentType: 'Monthly',
                dispenserQuantity: 0,
                dispenserPrice: 0,
                dispenserPaymentType: 'Monthly',
                deliveryFrequency: 'Weekly',
                deliveryDay: 'Monday',
                deliveryTime: '09:00',
                autoRefillEnabled: true,
            }
        }
    });
    
    const complianceReportForm = useForm<ComplianceReportFormValues>({
        resolver: zodResolver(complianceReportSchema),
        defaultValues: {
            reportType: 'DOH Bacteriological Test (Monthly)',
            resultId: '',
            status: 'Pending Review',
            results: '',
        }
    });

    const sanitationVisitForm = useForm<SanitationVisitFormValues>({
        resolver: zodResolver(sanitationVisitSchema),
        defaultValues: {
            status: 'Scheduled',
            assignedTo: '',
            dispenserReports: [{ dispenserId: 'dispenser-1', dispenserName: 'Dispenser 1', dispenserCode: `SAN${Math.floor(10000 + Math.random() * 90000)}` }],
        }
    });

    const { fields: dispenserFields, append: appendDispenser, remove: removeDispenser } = useFieldArray({
        control: sanitationVisitForm.control,
        name: "dispenserReports",
    });

    React.useEffect(() => {
        if (visitToEdit) {
            sanitationVisitForm.reset({
                scheduledDate: new Date(visitToEdit.scheduledDate),
                status: visitToEdit.status,
                assignedTo: visitToEdit.assignedTo,
                dispenserReports: visitToEdit.dispenserReports?.map(dr => ({ 
                    dispenserId: dr.dispenserId, 
                    dispenserName: dr.dispenserName,
                    dispenserCode: dr.dispenserCode,
                })),
            });
        } else {
            sanitationVisitForm.reset({
                status: 'Scheduled',
                assignedTo: '',
                reportFile: null,
                dispenserReports: [{ dispenserId: 'dispenser-1', dispenserName: 'Dispenser 1', dispenserCode: `SAN${Math.floor(10000 + Math.random() * 90000)}` }],
            });
        }
    }, [visitToEdit, sanitationVisitForm]);


    React.useEffect(() => {
        if (isStationProfileOpen && stationToUpdate) {
            stationForm.reset({ name: stationToUpdate.name, location: stationToUpdate.location });
        } else {
            stationForm.reset({ name: '', location: '' });
            setAgreementFile(null);
            setUploadedAgreementUrl(null);
        }
    }, [stationToUpdate, stationForm, isStationProfileOpen]);

    React.useEffect(() => {
        if (isComplianceReportDialogOpen) {
            if (complianceReportToEdit) {
                complianceReportForm.reset({
                    reportType: complianceReportToEdit.reportType,
                    resultId: complianceReportToEdit.resultId || '',
                    status: complianceReportToEdit.status,
                    results: complianceReportToEdit.results || '',
                });
            } else {
                complianceReportForm.reset({
                    reportType: 'DOH Bacteriological Test (Monthly)',
                    resultId: '',
                    status: 'Pending Review',
                    results: '',
                    reportFile: null
                });
            }
        }
    }, [complianceReportToEdit, isComplianceReportDialogOpen, complianceReportForm]);

    
    React.useEffect(() => {
        if (deliveryToEdit) {
            editDeliveryForm.reset({
                trackingNumber: deliveryToEdit.id,
                date: new Date(deliveryToEdit.date),
                volumeContainers: deliveryToEdit.volumeContainers,
                status: deliveryToEdit.status,
                adminNotes: deliveryToEdit.adminNotes || '',
            });
            setIsEditDeliveryOpen(true);
        }
    }, [deliveryToEdit, editDeliveryForm]);

    const handleSaveStation = async (values: NewStationFormValues) => {
        if (!firestore || !stationToUpdate) return;
    
        const stationRef = doc(firestore, 'waterStations', stationToUpdate.id);
        await updateDoc(stationRef, values);
        toast({ title: 'Station Updated', description: `Station "${values.name}" has been updated.` });
    };

    const handleDeleteStation = async () => {
        if (!stationToDelete || !firestore) return;
        
        const stationRef = doc(firestore, 'waterStations', stationToDelete.id);
        await deleteDoc(stationRef);

        toast({
            title: 'Station Deleted',
            description: `Water station "${stationToDelete.name}" has been removed.`,
        });

        setStationToDelete(null);
        setIsStationProfileOpen(false);
    };


    const handleAssignStation = async () => {
        if (!selectedUser || !stationToAssign || !firestore) return;

        const userRef = doc(firestore, 'users', selectedUser.id);
        await updateDoc(userRef, { assignedWaterStationId: stationToAssign });

        const station = waterStations?.find(ws => ws.id === stationToAssign);
        await createNotification(selectedUser.id, {
            type: 'general',
            title: 'Water Station Assigned',
            description: `You have been assigned to a new water station: ${station?.name || 'a new station'}.`,
            data: { userId: selectedUser.id }
        });
        
        setSelectedUser(prev => prev ? { ...prev, assignedWaterStationId: stationToAssign } : null);

        toast({ title: 'Station Assigned', description: `A new station has been assigned to ${selectedUser.name}.` });
        setIsAssignStationOpen(false);
        setStationToAssign(undefined);
    };
    
    const handleCreateDelivery = async (values: DeliveryFormValues) => {
        if (!userForHistory || !firestore || !auth || !authUser) return;
        setIsSubmitting(true);
    
        try {
            const file = values.proofFile?.[0];
            let proofUrl = '';
    
            if (file) {
                const path = `admin_uploads/${authUser.uid}/proofs_for/${userForHistory.id}/${values.trackingNumber}-${file.name}`;
                proofUrl = await uploadFileWithProgress(storage, auth, path, file, {}, setUploadProgress);
                await createNotification(userForHistory.id, {
                    type: 'delivery',
                    title: 'Proof of Delivery Uploaded',
                    description: `A proof of delivery for order ${values.trackingNumber} has been uploaded.`,
                    data: { deliveryId: values.trackingNumber }
                });
            }
    
            const deliveryData: any = {
                id: values.trackingNumber,
                userId: userForHistory.id,
                date: values.date.toISOString(),
                volumeContainers: values.volumeContainers,
                status: values.status,
                adminNotes: values.adminNotes,
                proofOfDeliveryUrl: proofUrl || null,
            };
    
            const deliveryRef = doc(firestore, 'users', userForHistory.id, 'deliveries', values.trackingNumber);
            await setDoc(deliveryRef, deliveryData);

            if (values.status === 'Delivered' && userForHistory.accountType !== 'Branch' && !userForHistory.plan?.isPrepaid) {
                // This deduction logic is now handled by ondeliverycreate for prepaid/parent, and not at all for fixed-plan (it's tracked differently).
                // Leaving this empty to avoid double-deducting.
            }
    
            toast({ title: "Delivery Record Created", description: `A manual delivery has been added for ${userForHistory.name}.` });
            
            deliveryForm.reset();
            setUploadProgress(0);
            setIsCreateDeliveryOpen(false);
    
        } catch (error) {
            console.error("Delivery creation failed: ", error);
            toast({
                variant: 'destructive',
                title: 'Creation Failed',
                description: 'Could not create delivery record. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateDelivery = async (values: DeliveryFormValues) => {
        if (!deliveryToEdit || !userForHistory || !firestore) return;
    
        const deliveryRef = doc(firestore, 'users', userForHistory.id, 'deliveries', deliveryToEdit.id);
        
        const updatedData = {
            date: values.date.toISOString(),
            volumeContainers: values.volumeContainers,
            status: values.status,
            adminNotes: values.adminNotes || '',
        };
    
        // This is complex. The trigger on `ondeliverycreate` handles the initial deduction.
        // We need to adjust if the delivery was already 'Delivered' and is now being changed.
        // The simplest approach is to let the backend handle complex balance adjustments if needed,
        // or just update the info here. For now, we only update the delivery doc.
    
        await updateDoc(deliveryRef, updatedData);

        if (deliveryToEdit.status !== values.status) {
            await createNotification(userForHistory.id, {
                type: 'delivery',
                title: `Delivery ${values.status}`,
                description: `Your delivery of ${values.volumeContainers} containers is now ${values.status}.`,
                data: { deliveryId: deliveryToEdit.id }
            });
        }
    
        toast({ title: "Delivery Updated", description: `Delivery ${deliveryToEdit.id} has been successfully updated.` });
        setIsEditDeliveryOpen(false);
        setDeliveryToEdit(null);
    };

    const handleDeleteDelivery = async () => {
        if (!deliveryToDelete || !userForHistory || !firestore) return;
    
        const deliveryRef = doc(firestore, 'users', userForHistory.id, 'deliveries', deliveryToDelete.id);
        
        // If we delete a delivered record, we need to credit back the user.
        if (deliveryToDelete.status === 'Delivered') {
            const userRef = doc(firestore, 'users', userForHistory.id);
            const userDoc = await getDoc(userRef);
            const userData = userDoc.data();
            if (userData) {
                if(userData.accountType === 'Branch' && userData.parentId) {
                    // Credit Parent account
                    const parentRef = doc(firestore, 'users', userData.parentId);
                    const costToCredit = containerToLiter(deliveryToDelete.volumeContainers) * (userData.plan.price || 0);
                    await updateDoc(parentRef, { topUpBalanceCredits: increment(costToCredit) });
                } else if (userData.plan?.isPrepaid) {
                    // Credit user's own liter balance
                    const litersToCredit = containerToLiter(deliveryToDelete.volumeContainers);
                    await updateDoc(userRef, { totalConsumptionLiters: increment(litersToCredit) });
                }
            }
        }
    
        await deleteDoc(deliveryRef);
    
        toast({
            title: "Delivery Deleted",
            description: `Delivery record ${deliveryToDelete.id} has been removed.`,
        });
    
        setDeliveryToDelete(null);
    };

    React.useEffect(() => {
        if(selectedUser && firestore) {
            const deliveriesForUser = collection(firestore, 'users', selectedUser.id, 'deliveries');
        }
    }, [selectedUser, firestore]);

    const watchedDeliveryContainers = deliveryForm.watch('volumeContainers');
    const watchedEditDeliveryContainers = editDeliveryForm.watch('volumeContainers');

    const filteredUsers = React.useMemo(() => {
        const allUsers = appUsers || [];
        if (!localSearchTerm) {
            return allUsers;
        }
        return allUsers.filter(user =>
            user.clientId?.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
            user.businessName?.toLowerCase().includes(localSearchTerm.toLowerCase())
        );
    }, [appUsers, localSearchTerm]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    const paginatedUsers = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredUsers.slice(startIndex, endIndex);
    }, [filteredUsers, currentPage, itemsPerPage]);

    const filteredDeliveries = React.useMemo(() => (userDeliveriesData || []).filter(delivery => {
        if (!deliveryDateRange?.from) return true;
        const fromDate = deliveryDateRange.from;
        const toDate = deliveryDateRange.to || fromDate;
        const deliveryDate = new Date(delivery.date);
        return deliveryDate >= fromDate && deliveryDate <= toDate;
    }), [userDeliveriesData, deliveryDateRange]);

    const [deliveryCurrentPage, setDeliveryCurrentPage] = React.useState(1);
    const DELIVERY_ITEMS_PER_PAGE = 8;
    const totalDeliveryPages = Math.ceil(filteredDeliveries.length / DELIVERY_ITEMS_PER_PAGE);

    const paginatedDeliveries = React.useMemo(() => {
        const startIndex = (deliveryCurrentPage - 1) * DELIVERY_ITEMS_PER_PAGE;
        const endIndex = startIndex + DELIVERY_ITEMS_PER_PAGE;
        return filteredDeliveries.slice(startIndex, endIndex);
    }, [filteredDeliveries, deliveryCurrentPage]);
    
    React.useEffect(() => {
      setDeliveryCurrentPage(1);
    }, [deliveryDateRange]);


    const handleDownloadDeliveries = () => {
        const headers = ["ID", "Date", "Volume (Containers)", "Status", "Proof of Delivery URL"];
        const csvRows = [headers.join(',')];

        filteredDeliveries.forEach(delivery => {
            const row = [
                delivery.id,
                format(new Date(delivery.date), 'PP'),
                delivery.volumeContainers,
                delivery.status,
                delivery.proofOfDeliveryUrl || "N/A"
            ].join(',');
            csvRows.push(row);
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `delivery-history-${userForHistory?.name?.replace(/\s/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Download Started", description: "Your delivery history CSV is being downloaded." });
    };

    const handleRefillStatusUpdate = async (request: RefillRequest, newStatus: RefillRequestStatus) => {
        if (!firestore) return;
        const requestRef = doc(firestore, 'users', request.userId, 'refillRequests', request.id);
        await updateDoc(requestRef, {
            status: newStatus,
            statusHistory: arrayUnion({ status: newStatus, timestamp: new Date().toISOString() })
        });
        await createNotification(request.userId, {
            type: 'delivery',
            title: `Refill Request: ${newStatus}`,
            description: `Your refill request is now ${newStatus}.`,
            data: { requestId: request.id }
        });
        toast({ title: 'Request Updated', description: `The refill request has been moved to "${newStatus}".` });
    };


    const activeRefillRequests = React.useMemo(() => {
        return refillRequests?.filter(req => req.status !== 'Completed' && req.status !== 'Cancelled') || [];
    }, [refillRequests]);

    const selectedUserPlanImage = React.useMemo(() => {
        if (!selectedUser?.clientType) return null;
        const clientTypeDetails = clientTypes.find(ct => ct.name === selectedUser.clientType);
        if (!clientTypeDetails) return null;
        return PlaceHolderImages.find(p => p.id === clientTypeDetails.imageId);
    }, [selectedUser]);
    
    const handleCreateStation = async (values: NewStationFormValues) => {
        if (!firestore || !auth || !storage) return;
        setIsSubmitting(true);
        let stationId = '';
        try {
            const newStationData = {
                name: values.name,
                location: values.location,
                partnershipAgreementUrl: uploadedAgreementUrl
            };
            const newStationRef = await addDoc(collection(firestore, 'waterStations'), newStationData);
            stationId = newStationRef.id;

            toast({ title: "Station Created", description: `Station "${values.name}" has been created.` });
            setIsStationProfileOpen(false);
            stationForm.reset();
            setUploadedAgreementUrl(null);

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Creation Failed', description: 'Could not create the new station.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleAgreementFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !auth || !storage) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const path = `stations/temp_agreements/${Date.now()}-${file.name}`;
            const downloadURL = await uploadFileWithProgress(storage, auth, path, file, {}, setUploadProgress);
            setUploadedAgreementUrl(downloadURL);
            toast({ title: "Upload Complete", description: "Agreement is ready to be attached." });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload agreement.' });
            setUploadedAgreementUrl(null);
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleInvoiceStatusUpdate = async (newStatus: 'Paid' | 'Upcoming') => {
        const userToUpdate = userForInvoices || selectedUser;
        if (!userToUpdate || !selectedInvoice || !firestore) return;
    
        const invoiceRef = doc(firestore, 'users', userToUpdate.id, 'payments', selectedInvoice.id);
    
        const isCurrentMonthVirtualInvoice = selectedInvoice.id === currentMonthInvoice?.id;
    
        if (newStatus === 'Paid' && isCurrentMonthVirtualInvoice) {
            const docToCreate = {
                ...selectedInvoice,
                status: 'Paid',
                date: serverTimestamp(),
            };
            await setDoc(invoiceRef, docToCreate);
        } else {
            const updatePayload: any = { status: newStatus };
            if (newStatus === 'Upcoming') {
                updatePayload.rejectionReason = rejectionReason;
            } else if (newStatus === 'Paid') {
                updatePayload.rejectionReason = deleteField();
            }
            await updateDoc(invoiceRef, updatePayload);
        }

        if (newStatus === 'Paid') {
            await createNotification(userToUpdate.id, {
                type: 'payment',
                title: 'Payment Confirmed',
                description: `Your payment for invoice ${selectedInvoice.id} has been confirmed. Thank you!`,
                data: { paymentId: selectedInvoice.id }
            });
        } else {
             await createNotification(userToUpdate.id, {
                type: 'payment',
                title: 'Payment Action Required',
                description: `Your payment for invoice ${selectedInvoice.id} requires attention. Reason: ${rejectionReason || 'Please contact support.'}`,
                data: { paymentId: selectedInvoice.id }
            });
        }
        
        toast({ title: 'Invoice Updated', description: `Invoice status changed to ${newStatus}.` });
    
        setIsManageInvoiceOpen(false);
        setTimeout(() => {
            const currentlySelected = userForInvoices;
            setUserForInvoices(null);
            setUserForInvoices(currentlySelected);
        }, 500);
        
        setRejectionReason('');
    };

    const handleSanitationVisitSubmit = async (values: SanitationVisitFormValues) => {
        if (!firestore || !selectedUser || !storage || !auth || !authUser) return;
        setIsSubmitting(true);
    
        try {
            const dispenserReports: DispenserReport[] = values.dispenserReports.map(dr => ({
                dispenserId: dr.dispenserId,
                dispenserName: dr.dispenserName,
                dispenserCode: dr.dispenserCode,
                checklist: defaultChecklistItems.map(item => ({...item})), // Create a fresh checklist for each
            }));

            const visitData: Partial<SanitationVisit> = {
                scheduledDate: values.scheduledDate.toISOString(),
                status: values.status,
                assignedTo: values.assignedTo,
                userId: selectedUser.id,
                dispenserReports: dispenserReports
            };
            
            const file = values.reportFile?.[0];
            let reportUrl = visitToEdit?.reportUrl || '';
    
            if (file) {
                const visitId = visitToEdit?.id || Date.now();
                const path = `admin_uploads/${authUser.uid}/sanitation_for/${selectedUser.id}/${visitId}-${file.name}`;
                reportUrl = await uploadFileWithProgress(storage, auth, path, file, {}, setUploadProgress);
                visitData.reportUrl = reportUrl;
                await createNotification(selectedUser.id, {
                    type: 'sanitation',
                    title: 'Sanitation Report Available',
                    description: 'Your latest sanitation report is now available to view.',
                    data: { visitId: visitToEdit?.id || visitId }
                });
            }
            delete (visitData as any).reportFile;
    
            if (visitToEdit) {
                const visitRef = doc(firestore, 'users', selectedUser.id, 'sanitationVisits', visitToEdit.id);
                await updateDoc(visitRef, visitData);
                toast({ title: "Visit Updated", description: "The sanitation visit has been updated." });
                if (visitToEdit.status !== values.status) {
                    const scheduledDate = new Date(values.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    await createNotification(selectedUser.id, {
                        type: 'sanitation',
                        title: `Sanitation Visit: ${values.status}`,
                        description: `Your sanitation visit for ${scheduledDate} is now ${values.status}.`,
                        data: { visitId: visitToEdit.id }
                    });
                }
            } else {
                const visitRef = await addDoc(collection(firestore, 'users', selectedUser.id, 'sanitationVisits'), visitData);
                const scheduledDate = new Date(values.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                 await createNotification(selectedUser.id, {
                    type: 'sanitation',
                    title: 'Sanitation Visit Scheduled',
                    description: `A sanitation visit is scheduled for your office on ${scheduledDate}.`,
                    data: { visitId: visitRef.id }
                });
                toast({ title: "Visit Scheduled", description: "A new sanitation visit has been scheduled." });
            }
    
            setIsSanitationVisitDialogOpen(false);
            setVisitToEdit(null);
            sanitationVisitForm.reset();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Operation Failed", description: "Could not save the sanitation visit." });
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    const handleDeleteSanitationVisit = async () => {
        if (!firestore || !selectedUser || !visitToDelete) return;
    
        try {
            const visitRef = doc(firestore, 'users', selectedUser.id, 'sanitationVisits', visitToDelete.id);
            await deleteDoc(visitRef);
    
            const linkId = visitToDelete.id;
            const linkRef = doc(firestore, 'publicSanitationLinks', linkId);
            const linkSnap = await getDoc(linkRef);
            if (linkSnap.exists()) {
                await deleteDoc(linkRef);
            }
    
            toast({
                title: "Visit Deleted",
                description: "The sanitation visit and its associated public link have been removed.",
            });
    
            setVisitToDelete(null);
            if (isSanitationVisitDialogOpen) {
                setIsSanitationVisitDialogOpen(false);
            }
        } catch (error) {
            console.error("Error deleting visit:", error);
            toast({
                variant: 'destructive',
                title: "Deletion Failed",
                description: "There was an error removing the sanitation visit.",
            });
        }
    };

    const handleShareVisit = async (visit: SanitationVisit) => {
        if (!firestore || !selectedUser) return;
        setSharingVisitId(visit.id);
        
        try {
            const linkId = visit.id; 
            const linkRef = doc(firestore, 'publicSanitationLinks', linkId);
            await setDoc(linkRef, {
                userId: selectedUser.id,
                visitId: visit.id
            });
            
            const shareableLink = `${window.location.origin}/sanitation-report/${linkId}`;
            
            const visitRef = doc(firestore, 'users', selectedUser.id, 'sanitationVisits', visit.id);
            await updateDoc(visitRef, { shareableLink });

            toast({
                title: "Link Ready to Share!",
                description: (
                    <div className="flex items-center gap-2">
                        <Input value={shareableLink} readOnly className="h-8 text-xs" />
                        <Button
                            size="sm"
                            onClick={() => {
                                navigator.clipboard.writeText(shareableLink);
                                toast({ title: "Copied!" });
                            }}
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                ),
            });
        } catch (error) {
            console.error("Error creating shareable link:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not create a shareable link.",
            });
        } finally {
            setSharingVisitId(null);
        }
    };

    const handleContractUpload = async () => {
        if (!contractFile || !userForContract || !storage || !auth || !firestore) return;
        setIsSubmitting(true);
        try {
            const path = `userContracts/${userForContract.id}/${contractFile.name}`;
            const url = await uploadFileWithProgress(storage, auth, path, contractFile, {}, setUploadProgress);

            const userRef = doc(firestore, 'users', userForContract.id);
            await updateDoc(userRef, {
                currentContractUrl: url,
                contractUploadedDate: serverTimestamp(),
                contractStatus: "Active",
            });
            
            await createNotification(userForContract.id, {
                type: 'general',
                title: 'New Contract Uploaded',
                description: 'A new contract has been uploaded to your account. You can view it in your account details.',
                data: { userId: userForContract.id }
            });
            
            toast({ title: 'Upload Complete', description: 'The contract has been attached to the user profile.' });
            setIsUploadContractOpen(false);
            setContractFile(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload contract.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleComplianceReportSubmit = async (values: ComplianceReportFormValues) => {
        if (!firestore || !stationToUpdate || !auth || !storage) return;
        setIsSubmitting(true);
    
        try {
            const reportData: any = {
                ...values,
                name: `${values.reportType} - ${format(new Date(), 'MMM yyyy')}`,
                date: serverTimestamp(),
            };
            
            const file = values.reportFile?.[0];
            if (file) {
                 const path = `stations/${stationToUpdate.id}/compliance/${complianceReportToEdit?.id || Date.now()}-${file.name}`;
                 const downloadURL = await uploadFileWithProgress(storage, auth, path, file, {}, setUploadProgress);
                 reportData.reportUrl = downloadURL;
            }
            delete reportData.reportFile;
    
            let reportRef: DocumentReference;
            if (complianceReportToEdit) {
                reportRef = doc(firestore, 'waterStations', stationToUpdate.id, 'complianceReports', complianceReportToEdit.id);
                await updateDoc(reportRef, reportData);
                toast({ title: 'Report Updated', description: 'The compliance report has been updated.' });
            } else {
                reportRef = await addDoc(collection(firestore, 'waterStations', stationToUpdate.id, 'complianceReports'), reportData);
                toast({ title: 'Report Created', description: 'A new compliance report has been created.' });
            }
    
            setIsComplianceReportDialogOpen(false);
            setComplianceReportToEdit(null);
            complianceReportForm.reset();
            setComplianceRefresher(c => c + 1);
    
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Operation Failed', description: 'Could not save the compliance report.' });
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    const handleDeleteComplianceReport = async () => {
        if (!firestore || !stationToUpdate || !complianceReportToDelete) return;

        const reportRef = doc(firestore, 'waterStations', stationToUpdate.id, 'complianceReports', complianceReportToDelete.id);
        await deleteDoc(reportRef);

        toast({ title: "Report Deleted", description: "The compliance report has been removed." });
        setComplianceReportToDelete(null);
        setComplianceRefresher(c => c + 1);
    };
    
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
    
    const [formStep, setFormStep] = React.useState(0);

    const getPlansForType = (type: string) => {
        switch (type) {
            case 'Family': return familyPlans;
            case 'SME': return smePlans;
            case 'Commercial': return commercialPlans;
            case 'Corporate': return corporatePlans;
            default: return [];
        }
    };
    
    const selectedClientType = newUserForm.watch('clientType');
    const selectedAccountType = newUserForm.watch('accountType');

    const planOptions = React.useMemo(() => {
        if (!selectedClientType) return [];
        if (selectedClientType === 'Enterprise') {
            return enterprisePlans;
        }
        return getPlansForType(selectedClientType);
    }, [selectedClientType]);

    
    const handleCreateNewUser = async (values: NewUserFormValues) => {
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            const unclaimedProfileRef = doc(firestore, 'unclaimedProfiles', values.clientId);
            const unclaimedProfileSnap = await getDoc(unclaimedProfileRef);

            if (unclaimedProfileSnap.exists()) {
                toast({ variant: "destructive", title: "Client ID already exists.", description: "Please use a unique Client ID."});
                setIsSubmitting(false);
                return;
            }
            
            const { plan, initialTopUp, ...rest } = values;

            let totalLiters = 0;
            let topUpCredits = 0;
            
            if (plan.isPrepaid) {
                const rate = plan.price || 3;
                totalLiters = rate > 0 ? (initialTopUp || 0) / rate : 0;
                topUpCredits = initialTopUp || 0;
            }

            if (values.accountType === 'Parent') {
                topUpCredits = initialTopUp || 0;
            }

            const profileData: any = {
                ...rest, 
                plan: {
                    name: plan.name,
                    price: plan.price,
                    isConsumptionBased: plan.isConsumptionBased || false,
                    isPrepaid: plan.isPrepaid || false,
                },
                role: 'User',
                totalConsumptionLiters: totalLiters,
                topUpBalanceCredits: topUpCredits,
                adminCreatedAt: serverTimestamp(),
            };

            await setDoc(unclaimedProfileRef, profileData);
            
            toast({ title: 'Client Profile Created', description: `${values.businessName}'s profile is ready to be claimed.` });
            setIsCreateUserOpen(false);
            newUserForm.reset();
            setFormStep(0);
        } catch (error) {
            console.error("Error creating unclaimed profile: ", error);
            toast({ variant: "destructive", title: "Creation Failed", description: "An error occurred while creating the profile." });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const selectedPlan = newUserForm.watch('plan');

     useEffect(() => {
        const subscription = newUserForm.watch((value, { name, type }) => {
            if (name === 'clientType') {
                const plans = getPlansForType(value.clientType!);
                const newPlan = (value.clientType === 'Enterprise') ? enterprisePlans[0] : (plans.length > 0 ? plans[0] : null);
                 if (newPlan) {
                    newUserForm.setValue('plan', newPlan);
                } else {
                    newUserForm.setValue('plan', null);
                }
            }
             if (name === 'plan' && value.plan) {
                const planPrice = value.plan.price || 0;
                if (newUserForm.getValues('plan.price') !== planPrice) {
                    newUserForm.setValue('plan.price', planPrice);
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [newUserForm]);

    const handleTopUp = async () => {
        if (!firestore || !selectedUser || topUpAmount <= 0) return;
        setIsSubmitting(true);
        try {
            const userRef = doc(firestore, 'users', selectedUser.id);
            
            const isParent = selectedUser.accountType === 'Parent';
            
            if (isParent) {
                 await updateDoc(userRef, {
                    topUpBalanceCredits: increment(topUpAmount)
                });
                const transactionData: Omit<Transaction, 'id'> = {
                    date: serverTimestamp(),
                    type: 'Credit',
                    amountCredits: topUpAmount,
                    description: 'Admin Top-Up'
                };
                await addDoc(collection(userRef, 'transactions'), transactionData);
            } else if (selectedUser.plan?.isPrepaid) {
                const rate = selectedUser.plan.price || 3;
                const litersToAdd = rate > 0 ? topUpAmount / rate : 0;
                 await updateDoc(userRef, {
                    totalConsumptionLiters: increment(litersToAdd)
                });
            }
            
            await createNotification(selectedUser.id, {
                type: 'top-up',
                title: 'Balance Topped Up',
                description: `Your account has been credited with ${isParent ? `₱${topUpAmount.toLocaleString()}` : `${(topUpAmount / (selectedUser.plan.price || 3)).toLocaleString()} Liters`}.`,
                data: { amount: topUpAmount }
            });

            toast({ title: 'Top-Up Successful', description: `${isParent ? `₱${topUpAmount.toLocaleString()}` : `${(topUpAmount / (selectedUser.plan.price || 3)).toLocaleString()} Liters`} added to ${selectedUser.businessName}'s balance.` });
            setIsTopUpDialogOpen(false);
            setTopUpAmount(0);
        } catch (error) {
            console.error("Top-up failed:", error);
            toast({ variant: 'destructive', title: 'Top-Up Failed', description: 'An error occurred while adding credits.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDebit = async () => {
        if (!firestore || !selectedUser || debitAmount <= 0 || !debitReason) return;
        setIsSubmitting(true);
        try {
            const userRef = doc(firestore, 'users', selectedUser.id);
            const incrementField = 'topUpBalanceCredits';
            
            await updateDoc(userRef, {
                [incrementField]: increment(-debitAmount)
            });

            const transactionData: Omit<Transaction, 'id'> = {
                date: serverTimestamp(),
                type: 'Debit',
                amountCredits: debitAmount,
                description: debitReason
            };
            await addDoc(collection(userRef, 'transactions'), transactionData);

            await createNotification(selectedUser.id, {
                type: 'general',
                title: 'Balance Adjustment',
                description: `PHP ${debitAmount.toLocaleString()} was debited from your account. Reason: ${debitReason}.`,
                data: { amount: debitAmount, reason: debitReason }
            });

            toast({ title: 'Debit Successful', description: `PHP ${debitAmount} was debited from ${selectedUser.businessName}'s balance.` });
            setIsDebitDialogOpen(false);
            setDebitAmount(0);
            setDebitReason('');
        } catch (error) {
            console.error("Debit failed:", error);
            toast({ variant: 'destructive', title: 'Debit Failed', description: 'An error occurred while debiting credits.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApproveTopUp = async (request: TopUpRequest) => {
        if (!firestore || !selectedUser) return;
        
        try {
            const userRef = doc(firestore, 'users', selectedUser.id);
            const requestRef = doc(userRef, 'topUpRequests', request.id);

            const isParent = selectedUser.accountType === 'Parent';
            
            if (isParent) {
                 await updateDoc(userRef, {
                    topUpBalanceCredits: increment(request.amount)
                });
                const transactionData: Omit<Transaction, 'id'> = {
                    date: serverTimestamp(),
                    type: 'Credit',
                    amountCredits: request.amount,
                    description: 'User Top-Up'
                };
                await addDoc(collection(userRef, 'transactions'), transactionData);
            } else if (selectedUser.plan?.isPrepaid) {
                 const rate = selectedUser.plan.price || 3;
                 const litersToAdd = rate > 0 ? request.amount / rate : 0;
                 await updateDoc(userRef, {
                    totalConsumptionLiters: increment(litersToAdd)
                });
            }
            
            await updateDoc(requestRef, { status: 'Approved' });

             await createNotification(selectedUser.id, {
                type: 'top-up',
                title: 'Top-Up Approved',
                description: `Your top-up of ${isParent ? `₱${request.amount.toLocaleString()}` : `${(request.amount / (selectedUser.plan.price || 3)).toLocaleString()}L`} has been approved.`,
            });
            toast({ title: 'Top-Up Approved' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Approval Failed' });
        }
    };
    
    const handleRejectTopUp = async (request: TopUpRequest, reason: string) => {
        if (!firestore || !selectedUser) return;
        const requestRef = doc(firestore, 'users', selectedUser.id, 'topUpRequests', request.id);
        await updateDoc(requestRef, { status: 'Rejected', rejectionReason: reason });
         await createNotification(selectedUser.id, {
            type: 'top-up',
            title: 'Top-Up Rejected',
            description: `Your top-up request was rejected. Reason: ${reason}`,
        });
        toast({ title: 'Top-Up Rejected' });
    };

    const watchedTopUpAmount = newUserForm.watch('initialTopUp');
    const watchedPlanPrice = newUserForm.watch('plan.price');


    if (usersLoading || stationsLoading || unclaimedProfilesLoading) {
        return <AdminDashboardSkeleton />;
    }

  return (
    <>
        <Dialog open={isUserDetailOpen} onOpenChange={setIsUserDetailOpen}>
            <DialogContent className="sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>User Account Management</DialogTitle>
                    <DialogDescription>
                        View user details and perform administrative actions.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="pr-6 -mr-6 flex-1">
                {selectedUser && (
                    <Tabs defaultValue="overview">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
                            <TabsTrigger value="sanitation">Sanitation</TabsTrigger>
                            {selectedUser.accountType === 'Parent' ? (
                                <TabsTrigger value="branches">Branches</TabsTrigger>
                            ) : (
                                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                            )}
                        </TabsList>

                        <TabsContent value="overview" className="py-6 space-y-6">
                            <div className="flex items-start gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={selectedUser.photoURL || undefined} alt={selectedUser.name} />
                                    <AvatarFallback className="text-3xl">{selectedUser.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-lg">{selectedUser.businessName}</h4>
                                    <p className="text-sm text-muted-foreground">Contact: {selectedUser.name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                               <Card>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-base">User Profile</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm pt-0">
                                    <div className="grid grid-cols-[120px_1fr] gap-x-4">
                                        <div className="text-muted-foreground">Client ID:</div><div className="font-medium">{selectedUser.clientId}</div>
                                        <div className="text-muted-foreground">Account Type:</div><div className="font-medium">{selectedUser.accountType || 'Single'}</div>
                                        <div className="text-muted-foreground">Plan:</div><div className="font-medium">{selectedUser.plan?.name || 'N/A'}</div>
                                        <div className="text-muted-foreground">Assigned Station:</div><div className="font-medium">{waterStations?.find(ws => ws.id === selectedUser.assignedWaterStationId)?.name || 'Not Assigned'}</div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button onClick={() => setIsAssignStationOpen(true)} disabled={!isAdmin} variant="outline" size="sm">
                                            <Building className="mr-2 h-4 w-4" /> Assign Station
                                        </Button>
                                        <Button variant="outline" onClick={() => { setUserForContract(selectedUser); setIsUploadContractOpen(true); }} disabled={!isAdmin} size="sm">
                                            <Upload className="mr-2 h-4 w-4" /> Contract
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                            
                             {selectedUser.accountType === 'Parent' ? (
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base">Parent Top-Up Balance</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className="text-3xl font-bold mb-2">
                                          ₱{(selectedUser.topUpBalanceCredits ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => setIsTopUpDialogOpen(true)}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Top-Up Credits
                                            </Button>
                                             <Button size="sm" variant="destructive" onClick={() => setIsDebitDialogOpen(true)}>
                                                <MinusCircle className="mr-2 h-4 w-4" />
                                                Debit/Adjust
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : selectedUser.plan?.isPrepaid ? (
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base">Prepaid Balance</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className="text-3xl font-bold mb-2">
                                          {(selectedUser.totalConsumptionLiters || 0).toLocaleString()} <span className="text-lg font-normal text-muted-foreground">Liters</span>
                                        </p>
                                        <Button size="sm" onClick={() => setIsTopUpDialogOpen(true)}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Top-Up Liters
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : selectedUser.accountType !== 'Branch' && (
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base">Consumption Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm pt-0">
                                        {selectedUser.plan?.isConsumptionBased ? (
                                            <>
                                                <div className="flex justify-between items-center font-semibold text-base border-t pt-2 mt-2">
                                                    <span>Est. Cost This Month:</span>
                                                    <span>₱{consumptionDetails.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground">Consumed this Month:</span>
                                                    <span className="font-medium text-red-600">{consumptionDetails.consumedLitersThisMonth.toLocaleString()} L</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-center font-semibold text-lg border-t pt-2 mt-2"><span>Current Balance:</span><span>{consumptionDetails.currentBalance.toLocaleString()} L</span></div>
                                                <div className="flex justify-between items-center"><span>Total for Month:</span><span>{consumptionDetails.totalLitersForMonth.toLocaleString()} L</span></div>
                                                <div className="flex justify-between items-center"><span>Consumed:</span><span className="font-medium text-red-600">-{consumptionDetails.consumedLitersThisMonth.toLocaleString()} L</span></div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                                )}
                            </div>

                             {(selectedUser.accountType === 'Parent' || selectedUser.plan?.isPrepaid) && (
                                 <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Pending Top-Up Requests</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {topUpRequests && topUpRequests.length > 0 ? (
                                            <div className="space-y-4">
                                                {topUpRequests.filter(r => r.status === 'Pending Review').map(req => (
                                                    <Card key={req.id}>
                                                        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                            <div>
                                                                <p className="font-semibold">₱{req.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Requested {toSafeDate(req.requestedAt) ? formatDistanceToNow(toSafeDate(req.requestedAt)!, { addSuffix: true }) : 'N/A'}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Button variant="outline" size="sm" asChild>
                                                                    <a href={req.proofOfPaymentUrl} target="_blank" rel="noopener noreferrer"><Eye className="mr-2 h-4 w-4" />View Proof</a>
                                                                </Button>
                                                                <Button size="sm" onClick={() => handleApproveTopUp(req)} variant="default">Approve</Button>
                                                                <Button size="sm" onClick={() => {
                                                                    const reason = prompt('Reason for rejection:');
                                                                    if (reason) handleRejectTopUp(req, reason);
                                                                }} variant="destructive">Reject</Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">No pending top-up requests.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                             {selectedUser.accountType === 'Parent' && (
                                 <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Parent Account Transaction History</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-48">
                                             <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Description</TableHead>
                                                        <TableHead className="text-right">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {parentTransactions && parentTransactions.length > 0 ? (
                                                        parentTransactions.map(tx => (
                                                            <TableRow key={tx.id}>
                                                                <TableCell>{toSafeDate(tx.date) ? format(toSafeDate(tx.date)!, 'PP') : 'N/A'}</TableCell>
                                                                <TableCell><Badge variant={tx.type === 'Credit' ? 'default' : 'secondary'} className={cn(tx.type === 'Credit' && 'bg-green-100 text-green-800')}>{tx.type}</Badge></TableCell>
                                                                <TableCell>{tx.description}</TableCell>
                                                                <TableCell className={cn("text-right font-medium", tx.type === 'Credit' ? 'text-green-600' : 'text-red-600')}>
                                                                    {tx.type === 'Credit' ? '+' : '-'}{`₱${(tx.amountCredits ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow><TableCell colSpan={4} className="text-center">No transactions yet.</TableCell></TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            )}

                        </TabsContent>

                        <TabsContent value="deliveries" className="py-6">
                            {/* This content will be populated by the delivery history dialog trigger */}
                             <p className="text-sm text-muted-foreground">Click the button below to view and manage all deliveries for this user.</p>
                             <Button onClick={() => { setUserForHistory(selectedUser); setIsDeliveryHistoryOpen(true); }} variant="outline" className="mt-4">
                                <History className="mr-2 h-4 w-4" /> View Delivery History
                            </Button>
                        </TabsContent>

                        <TabsContent value="sanitation" className="py-6">
                            <p className="text-sm text-muted-foreground">Click the button below to view and manage sanitation visits for this user.</p>
                             <Button onClick={() => setIsSanitationHistoryOpen(true)} variant="outline" className="mt-4">
                                <FileHeart className="mr-2 h-4 w-4" /> View Sanitation History
                            </Button>
                        </TabsContent>

                         <TabsContent value="invoices" className="py-6">
                             <p className="text-sm text-muted-foreground">Click the button below to view and manage invoices for this user.</p>
                            <Button onClick={() => { setUserForInvoices(selectedUser); setIsUserInvoicesOpen(true); }} variant="outline" className="mt-4">
                                <Receipt className="mr-2 h-4 w-4" /> View Invoices
                            </Button>
                        </TabsContent>
                        
                        <TabsContent value="branches" className="py-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Linked Branch Accounts</CardTitle>
                                    <CardDescription>Accounts that consume from this parent's top-up balance.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Client ID</TableHead>
                                                <TableHead>Business Name</TableHead>
                                                <TableHead>Contact</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {branchUsers && branchUsers.length > 0 ? (
                                                branchUsers.map(branch => (
                                                    <TableRow key={branch.id}>
                                                        <TableCell>{branch.clientId}</TableCell>
                                                        <TableCell>{branch.businessName}</TableCell>
                                                        <TableCell>{branch.name}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow><TableCell colSpan={3} className="text-center">No branch accounts linked.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                    </Tabs>
                )}
                </ScrollArea>
                <DialogFooter className="border-t pt-4 -mb-2 -mx-6 px-6 pb-4">
                    <Button variant="outline" onClick={() => setIsUserDetailOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isUserInvoicesOpen} onOpenChange={(open) => { if (!open) { setUserForInvoices(null); } setIsUserInvoicesOpen(open);}}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Invoice History for {userForInvoices?.businessName}</DialogTitle>
                    <DialogDescription>Review and manage payment statuses.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-6 -mr-6">
                    {paymentsLoading ? (
                        <div className="text-center text-muted-foreground py-10">Loading invoices...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentMonthInvoice && (
                                     <TableRow className="bg-muted/50 font-semibold cursor-pointer hover:bg-muted" onClick={() => { setSelectedInvoice(currentMonthInvoice); setIsManageInvoiceOpen(true); }}>
                                        <TableCell className="font-mono text-xs">{currentMonthInvoice.id}</TableCell>
                                        <TableCell>{format(new Date(currentMonthInvoice.date), 'PP')}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className='bg-blue-100 text-blue-800'
                                            >{currentMonthInvoice.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">₱{currentMonthInvoice.amount.toFixed(2)}</TableCell>
                                    </TableRow>
                                )}
                                {(userPaymentsData && userPaymentsData.length > 0) ? (
                                    userPaymentsData.map((invoice) => {
                                        const safeDate = toSafeDate(invoice.date);
                                        return (
                                        <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedInvoice(invoice); setIsManageInvoiceOpen(true); }}>
                                            <TableCell className="font-mono text-xs">{invoice.id}</TableCell>
                                            <TableCell>{safeDate ? format(safeDate, 'PP') : 'Invalid Date'}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={invoice.status === 'Paid' ? 'default' : invoice.status === 'Pending Review' ? 'secondary' : 'outline'}
                                                    className={cn('text-xs',
                                                        invoice.status === 'Paid' && 'bg-green-100 text-green-800',
                                                        invoice.status === 'Upcoming' && 'bg-yellow-100 text-yellow-800',
                                                        invoice.status === 'Overdue' && 'bg-red-100 text-red-800',
                                                        invoice.status === 'Pending Review' && 'bg-blue-100 text-blue-800'
                                                    )}
                                                >{invoice.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">₱{invoice.amount.toFixed(2)}</TableCell>
                                        </TableRow>
                                    )})
                                ) : (
                                    !currentMonthInvoice &&
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-10">No invoices found for this user.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </ScrollArea>
                 <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsUserInvoicesOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

         <Dialog open={isDeliveryHistoryOpen} onOpenChange={setIsDeliveryHistoryOpen}>
            <DialogContent className="sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/> Delivery History for {userForHistory?.name}</DialogTitle>
                    <DialogDescription>A log of all past deliveries for this user.</DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-2 px-6 pt-4 flex-shrink-0">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[300px] justify-start text-left font-normal",
                                !deliveryDateRange && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {deliveryDateRange?.from ? (
                                deliveryDateRange.to ? (
                                <>
                                    {format(deliveryDateRange.from, "LLL dd, y")} -{" "}
                                    {format(deliveryDateRange.to, "LLL dd, y")}
                                </>
                                ) : (
                                format(deliveryDateRange.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={deliveryDateRange?.from}
                            selected={deliveryDateRange}
                            onSelect={setDeliveryDateRange}
                            numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleDownloadDeliveries} disabled={filteredDeliveries.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                    </Button>
                    <Button onClick={() => setIsCreateDeliveryOpen(true)} disabled={!isAdmin}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Delivery
                    </Button>
                </div>
                 <ScrollArea className="px-6 flex-1 min-h-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tracking No.</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Volume</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedDeliveries.length > 0 ? (
                                paginatedDeliveries.map(delivery => {
                                    const liters = delivery.volumeContainers * 19.5;
                                    const isUploadingProof = uploadProgress > 0 && uploadProgress < 100;
                                    return (
                                    <TableRow key={delivery.id}>
                                        <TableCell>{delivery.id}</TableCell>
                                        <TableCell>{format(new Date(delivery.date), 'PP')}</TableCell>
                                        <TableCell>{liters.toLocaleString(undefined, {maximumFractionDigits: 0})}L / {delivery.volumeContainers} containers</TableCell>
                                        <TableCell>
                                            <Badge>
                                                {delivery.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setDeliveryToEdit(delivery)} disabled={!isAdmin}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit Delivery
                                                    </DropdownMenuItem>
                                                    {delivery.proofOfDeliveryUrl ? (
                                                         <DropdownMenuItem onClick={() => setSelectedProofUrl(delivery.proofOfDeliveryUrl || null)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Proof
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem disabled>
                                                            <Upload className="mr-2 h-4 w-4" />
                                                            No Proof
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setDeliveryToDelete(delivery)} disabled={!isAdmin} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Delivery
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )})
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">No delivery history found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
                 <DialogFooter className="pt-4 p-6 border-t flex-shrink-0 flex justify-between items-center">
                    <Button variant="outline" onClick={() => setIsDeliveryHistoryOpen(false)}>Close</Button>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeliveryCurrentPage(p => Math.max(1, p - 1))}
                            disabled={deliveryCurrentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {deliveryCurrentPage} of {totalDeliveryPages > 0 ? totalDeliveryPages : 1}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeliveryCurrentPage(p => Math.min(totalDeliveryPages, p + 1))}
                            disabled={deliveryCurrentPage === totalDeliveryPages || totalDeliveryPages === 0}
                        >
                            Next
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!deliveryToDelete} onOpenChange={(open) => !open && setDeliveryToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the delivery record for ID: <span className="font-semibold">{deliveryToDelete?.id}</span> and restore the consumed liters if applicable.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeliveryToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteDelivery}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isCreateDeliveryOpen} onOpenChange={(open) => { if (!open) { setUploadProgress(0); deliveryForm.reset(); } setIsCreateDeliveryOpen(open); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Manual Delivery</DialogTitle>
                    <DialogDescription>Manually add a delivery record for {userForHistory?.name}.</DialogDescription>
                </DialogHeader>
                <Form {...deliveryForm}>
                    <form onSubmit={deliveryForm.handleSubmit(handleCreateDelivery)} className="space-y-4 py-4">
                        <FormField
                            control={deliveryForm.control}
                            name="trackingNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tracking Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., DEL-00123" {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={deliveryForm.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Delivery Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                    disabled={isSubmitting}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={deliveryForm.control}
                            name="volumeContainers"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Volume (Containers)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 50" {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormDescription>
                                        1 container = 19.5 liters. Total: { (watchedDeliveryContainers * 19.5).toLocaleString() } liters.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={deliveryForm.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="In Transit">In Transit</SelectItem>
                                            <SelectItem value="Delivered">Delivered</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={deliveryForm.control} name="proofFile" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Proof of Delivery (Optional)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => field.onChange(e.target.files)}
                                        disabled={isSubmitting}
                                    />
                                </FormControl>
                                {isSubmitting && uploadProgress > 0 && <Progress value={uploadProgress} className="mt-2" />}
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField
                            control={deliveryForm.control}
                            name="adminNotes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Admin Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Add any specific notes for this delivery..." {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary" disabled={isSubmitting}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Creating..." : "Create Delivery"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isEditDeliveryOpen} onOpenChange={setIsEditDeliveryOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Delivery</DialogTitle>
                    <DialogDescription>Update the details for delivery ID: {deliveryToEdit?.id}</DialogDescription>
                </DialogHeader>
                <Form {...editDeliveryForm}>
                    <form onSubmit={editDeliveryForm.handleSubmit(handleUpdateDelivery)} className="space-y-4 py-4">
                         <FormField
                            control={editDeliveryForm.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Delivery Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={"outline"} className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={editDeliveryForm.control}
                            name="volumeContainers"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Volume (Containers)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        1 container = 19.5 liters. Total: { (watchedEditDeliveryContainers * 19.5).toLocaleString() } liters.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={editDeliveryForm.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="In Transit">In Transit</SelectItem>
                                            <SelectItem value="Delivered">Delivered</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={editDeliveryForm.control}
                            name="adminNotes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Admin Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Update notes for this delivery..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                             <Button variant="secondary" onClick={() => setIsEditDeliveryOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>


        <Dialog open={!!selectedProofUrl} onOpenChange={(open) => !open && setSelectedProofUrl(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Proof of Delivery</DialogTitle>
                </DialogHeader>
                {selectedProofUrl && (
                    <div className="py-4 flex justify-center">
                        <Image src={selectedProofUrl} alt="Proof of delivery" width={400} height={600} className="rounded-md object-contain" />
                    </div>
                )}
            </DialogContent>
        </Dialog>
        
        <Dialog open={isUploadContractOpen} onOpenChange={(open) => { if (!open) { setUserForContract(null); setContractFile(null); } setIsUploadContractOpen(open); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Attach Contract</DialogTitle>
                    <DialogDescription>Attach a contract for {userForContract?.name}.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Input type="file" onChange={(e) => setContractFile(e.target.files?.[0] || null)} disabled={isSubmitting} />
                     {isSubmitting && (
                        <Progress value={uploadProgress} />
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUploadContractOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleContractUpload} disabled={!contractFile || isSubmitting}>
                        {isSubmitting ? 'Uploading...' : 'Attach'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isManageInvoiceOpen} onOpenChange={setIsManageInvoiceOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Invoice</DialogTitle>
                    <DialogDescription>Review payment and update the status for invoice {selectedInvoice?.id}.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-xl font-bold">₱{selectedInvoice?.amount.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Current Status</p>
                        <Badge variant={selectedInvoice?.status === 'Paid' ? 'default' : (selectedInvoice?.status === 'Upcoming' ? 'secondary' : 'outline')} className={cn(
                            selectedInvoice?.status === 'Paid' && 'bg-green-100 text-green-800',
                            selectedInvoice?.status === 'Pending Review' && 'bg-blue-100 text-blue-800'
                        )}>
                            {selectedInvoice?.status}</Badge>
                    </div>
                    
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Proof of Payment</p>
                        {selectedInvoice?.proofOfPaymentUrl ? (
                            <Button variant="outline" onClick={() => setSelectedProofUrl(selectedInvoice.proofOfPaymentUrl!)}>
                                <Eye className="mr-2 h-4 w-4" /> View Proof
                            </Button>
                        ) : (
                             <Button variant="outline" disabled>
                                <EyeOff className="mr-2 h-4 w-4" /> No Proof Uploaded
                            </Button>
                        )}
                    </div>

                    {selectedInvoice?.status !== 'Paid' && (
                        <div className="pt-4 space-y-4 border-t">
                             <h4 className="font-semibold">Actions</h4>
                             <div className="flex gap-2">
                                <Button onClick={() => handleInvoiceStatusUpdate('Paid')}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                                </Button>
                                {selectedInvoice?.status === 'Pending Review' && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive">
                                                <AlertTriangle className="mr-2 h-4 w-4" /> Reject Payment
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Reject Payment?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will set the invoice status back to "Upcoming". You can add a note for the user.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <Textarea 
                                                placeholder="Optional: Reason for rejection (e.g., incorrect amount, unclear screenshot)..."
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                            />
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleInvoiceStatusUpdate('Upcoming')}>Confirm Rejection</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                             </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsManageInvoiceOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AdminMyAccountDialog
            adminUser={adminUser}
            isOpen={isAccountDialogOpen}
            onOpenChange={setIsAccountDialogOpen}
        />

        <div className="space-y-6">
            <Tabs defaultValue="user-management">
                <TabsList>
                    <TabsTrigger value="user-management"><Users className="mr-2 h-4 w-4"/>User Management</TabsTrigger>
                    <TabsTrigger value="station-management"><Building className="mr-2 h-4 w-4" />Station Management</TabsTrigger>
                </TabsList>
                <TabsContent value="user-management">
                    <Card>
                        <CardHeader>
                            <CardTitle>Client Accounts ({filteredUsers.length})</CardTitle>
                            <CardDescription>Manage all active and pending user accounts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="active-users">
                                <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                                    <TabsTrigger value="active-users">Active Users</TabsTrigger>
                                    <TabsTrigger value="unclaimed-profiles" className="relative">
                                        Unclaimed Profiles
                                        {unclaimedProfiles && unclaimedProfiles.length > 0 && (
                                            <Badge className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">{unclaimedProfiles.length}</Badge>
                                        )}
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="active-users" className="space-y-6 pt-4">
                                    {activeRefillRequests.length > 0 && (
                                        <Card className="bg-amber-50 border-amber-200">
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2 text-base"><BellRing className="h-5 w-5 text-amber-600"/>Active Refill Requests</CardTitle>
                                                <CardDescription>This is the queue for the refill team. Update the status as the request progresses.</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Client ID</TableHead>
                                                            <TableHead>Business Name</TableHead>
                                                            <TableHead>Requested</TableHead>
                                                            <TableHead>Date / Qty</TableHead>
                                                            <TableHead>Current Status</TableHead>
                                                            <TableHead className="text-right">Action</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {refillRequestsLoading ? (
                                                            <TableRow><TableCell colSpan={6} className="text-center">Loading requests...</TableCell></TableRow>
                                                        ) : activeRefillRequests.map((request) => {
                                                            const requestedAtDate = toSafeDate(request.requestedAt);
                                                            const requestedForDate = toSafeDate(request.requestedDate);
                                                            return (
                                                            <TableRow key={request.id}>
                                                                <TableCell>{request.clientId}</TableCell>
                                                                <TableCell>{request.businessName}</TableCell>
                                                                <TableCell>
                                                                    {requestedAtDate ? formatDistanceToNow(requestedAtDate, { addSuffix: true }) : 'Just now'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {requestedForDate ? format(requestedForDate, 'PP') : 'ASAP'}
                                                                    {request.volumeContainers && ` (${request.volumeContainers} cont.)`}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="secondary">{request.status}</Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild><Button size="sm">Update Status</Button></DropdownMenuTrigger>
                                                                        <DropdownMenuContent>
                                                                            <DropdownMenuItem onClick={() => handleRefillStatusUpdate(request, 'In Production')} disabled={request.status !== 'Requested'}>Move to Production</DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handleRefillStatusUpdate(request, 'Out for Delivery')} disabled={request.status !== 'In Production'}>Set to Delivery</DropdownMenuItem>
                                                                            <DropdownMenuSeparator/>
                                                                            <DropdownMenuItem onClick={() => handleRefillStatusUpdate(request, 'Completed')}>Mark as Completed</DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handleRefillStatusUpdate(request, 'Cancelled')} className="text-destructive">Cancel Request</DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </TableCell>
                                                            </TableRow>
                                                        )})}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder="Search by Client ID or Business Name..."
                                            value={localSearchTerm}
                                            onChange={(e) => {
                                                setLocalSearchTerm(e.target.value);
                                                setCurrentPage(1); // Reset to first page on new search
                                            }}
                                            className="max-w-sm"
                                        />
                                    </div>
                                    <div className="overflow-x-auto">
                                        <Table className="min-w-full">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Client ID</TableHead>
                                                    <TableHead>Business Name</TableHead>
                                                    <TableHead>Account Type</TableHead>
                                                    <TableHead>Payment Status</TableHead>
                                                    <TableHead>Assigned Station</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginatedUsers.map((user) => {
                                                    const schedule = user.customPlanDetails?.deliveryDay && user.customPlanDetails?.deliveryTime
                                                        ? `${user.customPlanDetails.deliveryDay}, ${user.customPlanDetails.deliveryTime}`
                                                        : 'N/A';
                                                    const autoRefillEnabled = user.customPlanDetails?.autoRefillEnabled ?? true;
                                                    const userPendingPayments = pendingPaymentsByUser[user.id] || [];
                                                    const handlePaymentStatusClick = (e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        setUserForInvoices(user);
                                                        setIsUserInvoicesOpen(true);
                                                    };

                                                    return (
                                                    <TableRow key={user.id} onClick={() => { setSelectedUser(user); setIsUserDetailOpen(true);}} className="cursor-pointer">
                                                        <TableCell className="whitespace-nowrap">{user.clientId}</TableCell>
                                                        <TableCell className="whitespace-nowrap">{user.businessName}</TableCell>
                                                        <TableCell>
                                                             <Badge variant={
                                                                user.accountType === 'Parent' ? 'default' :
                                                                user.accountType === 'Branch' ? 'secondary' :
                                                                'outline'
                                                            }>
                                                                {user.accountType || 'Single'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {userPendingPayments.length > 0 ? (
                                                                <Badge onClick={handlePaymentStatusClick} className="cursor-pointer bg-blue-100 text-blue-800 hover:bg-blue-200">
                                                                    {userPendingPayments.length} Pending
                                                                </Badge>
                                                            ) : (
                                                                <div onClick={handlePaymentStatusClick} className="text-xs text-muted-foreground cursor-pointer hover:text-primary">
                                                                Up to date
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{waterStations?.find(ws => ws.id === user.assignedWaterStationId)?.name || 'N/A'}</TableCell>
                                                    </TableRow>
                                                )})}
                                                {paginatedUsers.length === 0 && !usersLoading && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center">No users found.</TableCell>
                                                    </TableRow>
                                                )}
                                                {usersLoading && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center">Loading users...</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="flex items-center justify-end space-x-2 py-4">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="items-per-page" className="text-sm font-normal">Rows per page:</Label>
                                            <Select
                                                value={String(itemsPerPage)}
                                                onValueChange={(value) => {
                                                    setItemsPerPage(Number(value));
                                                    setCurrentPage(1);
                                                }}
                                            >
                                                <SelectTrigger id="items-per-page" className="w-20 h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="20">20</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                    <SelectItem value="100">100</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </TabsContent>
                                <TabsContent value="unclaimed-profiles" className="space-y-6 pt-4">
                                     <div className="flex justify-between items-center">
                                        <p className="text-sm text-muted-foreground">These profiles have been created and are waiting for users to claim them.</p>
                                        <Button onClick={() => setIsCreateUserOpen(true)}>
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Add New Client
                                        </Button>
                                    </div>
                                     <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Client ID</TableHead>
                                                <TableHead>Business Name</TableHead>
                                                <TableHead>Plan</TableHead>
                                                <TableHead>Account Type</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {unclaimedProfiles && unclaimedProfiles.length > 0 ? (
                                                unclaimedProfiles.map((profile) => (
                                                    <TableRow key={profile.id}>
                                                        <TableCell className="font-medium">{profile.clientId}</TableCell>
                                                        <TableCell>{profile.businessName}</TableCell>
                                                        <TableCell>{profile.plan?.name}</TableCell>
                                                        <TableCell>
                                                            {profile.accountType && profile.accountType !== 'Single' && (
                                                                <Badge variant={profile.accountType === 'Parent' ? 'default' : 'secondary'}>{profile.accountType}</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                                                Pending Claim
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                                        No unclaimed profiles.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="station-management">
                    <Card>
                        <CardHeader>
                            <CardTitle>Water Station Network</CardTitle>
                            <CardDescription>Manage all water refilling stations in the network.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-end mb-4">
                               <Button onClick={() => { setStationToUpdate(null); setIsStationProfileOpen(true); }} disabled={!isAdmin}><PlusCircle className="mr-2 h-4 w-4" />Create Station</Button>
                            </div>
                            <div className="overflow-x-auto">
                               <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Station ID</TableHead>
                                            <TableHead>Station Name</TableHead>
                                            <TableHead>Location</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stationsLoading && (
                                            <TableRow><TableCell colSpan={3} className="text-center">Loading stations...</TableCell></TableRow>
                                        )}
                                        {!stationsLoading && waterStations?.map((station) => (
                                            <TableRow key={station.id} onClick={() => { setStationToUpdate(station); setIsStationProfileOpen(true); }} className="cursor-pointer">
                                                <TableCell className="font-mono text-xs">{station.id}</TableCell>
                                                <TableCell className="font-medium">{station.name}</TableCell>
                                                <TableCell>{station.location}</TableCell>
                                            </TableRow>
                                        ))}
                                         {!stationsLoading && waterStations?.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center">No water stations found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>

        <Dialog open={isTopUpDialogOpen} onOpenChange={setIsTopUpDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Top-Up Balance</DialogTitle>
                    <DialogDescription>Add {selectedUser?.accountType === 'Parent' ? 'credits (PHP)' : 'liters'} to {selectedUser?.businessName}'s balance.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="top-up-amount">Amount to Add ({selectedUser?.accountType === 'Parent' ? 'PHP' : 'Liters'})</Label>
                    <Input id="top-up-amount" type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(Number(e.target.value))} placeholder="e.g., 10000" />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTopUpDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleTopUp} disabled={topUpAmount <= 0 || isSubmitting}>
                        {isSubmitting ? 'Topping up...' : 'Confirm Top-Up'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isDebitDialogOpen} onOpenChange={setIsDebitDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Debit/Adjust Balance</DialogTitle>
                    <DialogDescription>Manually subtract credits from {selectedUser?.businessName}'s balance.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="debit-amount">Amount to Debit (PHP)</Label>
                        <Input id="debit-amount" type="number" value={debitAmount} onChange={(e) => setDebitAmount(Number(e.target.value))} placeholder="e.g., 500" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="debit-reason">Reason for Debit</Label>
                        <Input id="debit-reason" value={debitReason} onChange={(e) => setDebitReason(e.target.value)} placeholder="e.g., Monthly service fee" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDebitDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleDebit} disabled={debitAmount <= 0 || !debitReason || isSubmitting} variant="destructive">
                        {isSubmitting ? 'Debiting...' : 'Confirm Debit'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        <AlertDialog open={!!stationToDelete} onOpenChange={(open) => !open && setStationToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the water station <span className="font-semibold">{stationToDelete?.name}</span> and all its associated data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setStationToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteStation}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isAssignStationOpen} onOpenChange={setIsAssignStationOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Water Station</DialogTitle>
                    <DialogDescription>Assign a water station to {selectedUser?.name}.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Select onValueChange={setStationToAssign} defaultValue={selectedUser?.assignedWaterStationId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a station..." />
                        </SelectTrigger>
                        <SelectContent>
                            {waterStations?.map(station => (
                                <SelectItem key={station.id} value={station.id}>{station.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                    <Button onClick={handleAssignStation}>Assign</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delivery Schedule for {userForSchedule?.businessName}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    {userForSchedule?.customPlanDetails?.autoRefillEnabled ?? true ? (
                        <div>
                            <DialogDescription>Auto-refill is enabled. The recurring delivery is scheduled for:</DialogDescription>
                            <p className="font-bold text-lg mt-2">
                                {userForSchedule?.customPlanDetails?.deliveryDay}, {userForSchedule?.customPlanDetails?.deliveryTime}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <DialogDescription>Auto-refill is disabled. Deliveries are scheduled manually by the user.</DialogDescription>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

         <Dialog open={isStationProfileOpen} onOpenChange={(open) => {if (!open) {setStationToUpdate(null); stationForm.reset();} setIsStationProfileOpen(open);}}>
            <DialogContent className="sm:max-w-3xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Partnership Requirements</DialogTitle>
                    <DialogDescription>
                        {stationToUpdate ? `Manage compliance for ${stationToUpdate.name}.` : "Submit documents to become a verified Refill Partner."}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="pr-6 -mr-6">
                    <div className="space-y-8 p-4">
                         <Form {...stationForm}>
                            <form className="space-y-4">
                                <FormField control={stationForm.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Station Name</FormLabel>
                                        <FormControl><Input placeholder="e.g. Aqua Pure Downtown" {...field} disabled={!!stationToUpdate || isSubmitting}/></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={stationForm.control} name="location" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Location</FormLabel>
                                        <FormControl><Input placeholder="e.g. 123 Business Rd, Metro City" {...field} disabled={isSubmitting}/></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                {stationToUpdate && (
                                     <Button onClick={stationForm.handleSubmit(handleSaveStation)} size="sm" disabled={isSubmitting}>Save Station Details</Button>
                                )}
                            </form>
                        </Form>

                        <Separator />
                        
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-semibold text-base">Compliance Documents</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Manage and track monthly compliance reports.
                                    </p>
                                </div>
                                <Button size="sm" onClick={() => { setComplianceReportToEdit(null); setIsComplianceReportDialogOpen(true); }} disabled={!stationToUpdate}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Create Report
                                </Button>
                            </div>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Report Name</TableHead>
                                        <TableHead>Month</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {complianceReports?.map((report) => (
                                        <TableRow key={report.id}>
                                            <TableCell className="font-medium">{report.name}</TableCell>
                                            <TableCell>
                                                {report.date && typeof (report.date as any).toDate === 'function' 
                                                    ? format((report.date as any).toDate(), 'MMM yyyy') 
                                                    : 'Processing...'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={report.status === 'Passed' ? 'default' : report.status === 'Failed' ? 'destructive' : 'secondary'}
                                                    className={cn(
                                                        'text-xs',
                                                        report.status === 'Passed' && 'bg-green-100 text-green-800',
                                                        report.status === 'Failed' && 'bg-red-100 text-red-800',
                                                        report.status === 'Pending Review' && 'bg-yellow-100 text-yellow-800'
                                                    )}
                                                >{report.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => { setComplianceReportToEdit(report); setIsComplianceReportDialogOpen(true); }}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive" onClick={() => setComplianceReportToDelete(report)}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!complianceReports || complianceReports.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground">No reports found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="font-semibold text-base mb-1">Partnership Agreement</h3>
                            <p className="text-sm text-muted-foreground mb-4">Review and accept the partnership agreement.</p>
                            <div className="flex items-center gap-4 p-4 border rounded-lg">
                                {(() => {
                                    if (stationToUpdate?.partnershipAgreementUrl) {
                                        return (
                                            <>
                                                <FileText className="h-6 w-6 text-muted-foreground" />
                                                <div className="flex-1"><p className="font-medium">Agreement on File</p></div>
                                                <Button asChild variant="outline"><a href={stationToUpdate.partnershipAgreementUrl} target="_blank" rel="noopener noreferrer"><Eye className="mr-2 h-4 w-4" /> View</a></Button>
                                            </>
                                        );
                                    }
                                    return (
                                        <div className="w-full">
                                            <Label>Attach Signed Agreement</Label>
                                            <Input 
                                                type="file" 
                                                accept="image/*,application/pdf" 
                                                onChange={handleAgreementFileChange} 
                                                disabled={isUploading}
                                            />
                                            {isUploading && <Progress value={uploadProgress} className="mt-2" />}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="mt-4 pt-4 border-t flex justify-between w-full">
                     <div>
                        {stationToUpdate && (
                             <Button variant="destructive" onClick={() => setStationToDelete(stationToUpdate)} disabled={!isAdmin || isSubmitting}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Station
                             </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" onClick={() => { setStationToUpdate(null); stationForm.reset();}}>Close</Button>
                        </DialogClose>
                        {!stationToUpdate && (
                            <Button onClick={stationForm.handleSubmit(handleCreateStation)} disabled={isSubmitting || stationForm.formState.isSubmitting || isUploading || !uploadedAgreementUrl}>{isSubmitting ? "Creating..." : "Create Station"}</Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isComplianceReportDialogOpen} onOpenChange={(open) => { if(!open) setComplianceReportToEdit(null); setIsComplianceReportDialogOpen(open); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{complianceReportToEdit ? 'Edit' : 'Create'} Compliance Report</DialogTitle>
                    <DialogDescription>Fill out the details for the compliance report.</DialogDescription>
                </DialogHeader>
                <Form {...complianceReportForm}>
                    <form onSubmit={complianceReportForm.handleSubmit(handleComplianceReportSubmit)} className="space-y-4 py-4">
                        <FormField control={complianceReportForm.control} name="reportType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Report Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a report type" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="DOH Bacteriological Test (Monthly)">DOH Bacteriological Test (Monthly)</SelectItem>
                                        <SelectItem value="DOH Bacteriological Test (Semi-Annual)">DOH Bacteriological Test (Semi-Annual)</SelectItem>
                                        <SelectItem value="Sanitary Permit">Sanitary Permit</SelectItem>
                                        <SelectItem value="Business Permit">Business Permit</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={complianceReportForm.control} name="resultId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Result ID Number</FormLabel>
                                <FormControl><Input placeholder="e.g., DOH-2024-12345" {...field} disabled={isSubmitting} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={complianceReportForm.control} name="status" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Passed">Passed</SelectItem>
                                        <SelectItem value="Failed">Failed</SelectItem>
                                        <SelectItem value="Pending Review">Pending Review</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={complianceReportForm.control} name="results" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Results / Notes</FormLabel>
                                <FormControl><Textarea placeholder="Enter inspection results or notes..." {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={complianceReportForm.control} name="reportFile" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Attach Report File (Optional)</FormLabel>
                                <FormControl><Input type="file" accept="application/pdf,image/*" onChange={(e) => field.onChange(e.target.files)} disabled={isSubmitting} /></FormControl>
                                {isSubmitting && (
                                    <Progress value={uploadProgress} className="mt-2" />
                                )}
                                <FormDescription>
                                    {complianceReportToEdit?.reportUrl ? "Attaching a new file will replace the existing one." : "Attach the official report document."}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Report'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!complianceReportToDelete} onOpenChange={(open) => !open && setComplianceReportToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the compliance report: <span className="font-semibold">{complianceReportToDelete?.name}</span>. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteComplianceReport}>Delete Report</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isSanitationHistoryOpen} onOpenChange={setIsSanitationHistoryOpen}>
            <DialogContent className="sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Sanitation for {selectedUser?.businessName}</DialogTitle>
                    <DialogDescription>
                        Schedule and track office sanitation visits.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end mb-4">
                    <Button size="sm" onClick={() => { setVisitToEdit(null); setIsSanitationVisitDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Schedule Visit
                    </Button>
                </div>
                 <ScrollArea className="pr-2 -mr-2">
                    {sanitationVisitsLoading ? (
                        <p>Loading visits...</p>
                    ) : sanitationVisitsData && sanitationVisitsData.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Quality Officer</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sanitationVisitsData.map(visit => (
                                    <TableRow key={visit.id}>
                                        <TableCell>{format(new Date(visit.scheduledDate), 'PP')}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={visit.status === 'Completed' ? 'default' : visit.status === 'Scheduled' ? 'secondary' : 'outline'}
                                                className={cn('text-xs',
                                                    visit.status === 'Completed' && 'bg-green-100 text-green-800',
                                                    visit.status === 'Scheduled' && 'bg-blue-100 text-blue-800',
                                                    visit.status === 'Cancelled' && 'bg-red-100 text-red-800'
                                                )}
                                            >{visit.status}</Badge>
                                        </TableCell>
                                        <TableCell>{visit.assignedTo}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => { setVisitToEdit(visit); setIsSanitationVisitDialogOpen(true); }}>View</Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleShareVisit(visit)} disabled={sharingVisitId === visit.id}>
                                                {sharingVisitId === visit.id ? (
                                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                  <Share2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-10">No sanitation visits scheduled.</p>
                    )}
                </ScrollArea>
                <DialogFooter className="border-t pt-4 -mb-2 -mx-6 px-6 pb-4">
                    <DialogClose asChild><Button variant="secondary">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isSanitationVisitDialogOpen} onOpenChange={setIsSanitationVisitDialogOpen}>
            <DialogContent className="sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
                 <DialogHeader>
                    <DialogTitle>{visitToEdit ? 'Edit' : 'Schedule'} Sanitation Visit</DialogTitle>
                    <DialogDescription>
                        {visitToEdit ? 'Update the details for this sanitation visit.' : `Schedule a new sanitation visit for ${selectedUser?.businessName}.`}
                    </DialogDescription>
                </DialogHeader>
                <Form {...sanitationVisitForm}>
                    <form onSubmit={sanitationVisitForm.handleSubmit(handleSanitationVisitSubmit)} className="py-4 flex-1 min-h-0 flex flex-col">
                    <ScrollArea className="pr-6 -mr-6 flex-1">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <FormField control={sanitationVisitForm.control} name="scheduledDate" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Scheduled Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={sanitationVisitForm.control} name="assignedTo" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quality Officer</FormLabel>
                                        <FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={sanitationVisitForm.control} name="status" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Scheduled">Scheduled</SelectItem>
                                                <SelectItem value="Completed">Completed</SelectItem>
                                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                    <FormField
                                    control={sanitationVisitForm.control}
                                    name="reportFile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Attach Report (Optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="file"
                                                    accept="application/pdf,image/*"
                                                    onChange={(e) => field.onChange(e.target.files)}
                                                    disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            {isSubmitting && uploadProgress > 0 && (
                                                <Progress value={uploadProgress} className="mt-2" />
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-semibold text-sm">Dispensers to Inspect</h4>
                                {dispenserFields.map((field, index) => (
                                    <div key={field.id} className="flex items-start gap-2">
                                    <div className="grid grid-cols-2 gap-2 flex-1">
                                        <FormField
                                            control={sanitationVisitForm.control}
                                            name={`dispenserReports.${index}.dispenserName`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input {...field} placeholder={`Name (e.g. Lobby)`} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                            <FormField
                                            control={sanitationVisitForm.control}
                                            name={`dispenserReports.${index}.dispenserCode`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input {...field} placeholder={`Code (e.g. D-001)`} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeDispenser(index)}
                                        disabled={dispenserFields.length <= 1}
                                        className="mt-2"
                                    >
                                        <MinusCircle className="h-4 w-4" />
                                    </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendDispenser({ 
                                        dispenserId: `dispenser-${Date.now()}`, 
                                        dispenserName: ``, 
                                        dispenserCode: `SAN${Math.floor(10000 + Math.random() * 90000)}` 
                                    })}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add another dispenser
                                </Button>
                                    <FormMessage>{sanitationVisitForm.formState.errors.dispenserReports?.root?.message}</FormMessage>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="pt-6 flex justify-between w-full">
                        <div>
                            {visitToEdit && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" type="button" disabled={isSubmitting}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Visit
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete the sanitation visit scheduled for {visitToEdit ? format(new Date(visitToEdit.scheduledDate), 'PP') : ''}. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => { setVisitToDelete(visitToEdit); handleDeleteSanitationVisit(); }}>Delete Visit</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Visit"}</Button>
                        </div>
                    </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <Dialog open={isCreateUserOpen} onOpenChange={(open) => { if (!open) { newUserForm.reset(); setFormStep(0); } setIsCreateUserOpen(open); }}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                    <DialogDescription>Set up a new client profile. The user will claim this profile using the generated Client ID.</DialogDescription>
                </DialogHeader>
                 <Form {...newUserForm}>
                    <form onSubmit={newUserForm.handleSubmit(handleCreateNewUser)}>
                        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                           {formStep === 0 && (
                                <div className="space-y-6">
                                    <h3 className="font-semibold text-lg">Step 1: Business & Account Type</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                      <FormField control={newUserForm.control} name="clientId" render={({ field }) => (
                                          <FormItem><FormLabel>Client ID</FormLabel><FormControl><Input placeholder="e.g. C-12345" {...field} /></FormControl><FormMessage /></FormItem>
                                      )}/>
                                      <FormField control={newUserForm.control} name="businessName" render={({ field }) => (
                                          <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input placeholder="Client's Business Name" {...field} /></FormControl><FormMessage /></FormItem>
                                      )}/>
                                       <FormField control={newUserForm.control} name="name" render={({ field }) => (
                                          <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input placeholder="Full Name" {...field} /></FormControl><FormMessage /></FormItem>
                                      )}/>
                                       <FormField control={newUserForm.control} name="contactNumber" render={({ field }) => (
                                          <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="Phone Number" {...field} /></FormControl><FormMessage /></FormItem>
                                      )}/>
                                      <FormField control={newUserForm.control} name="address" render={({ field }) => (
                                          <FormItem className="md:col-span-2"><FormLabel>Business Address</FormLabel><FormControl><Textarea placeholder="Full Business Address" {...field} /></FormControl><FormMessage /></FormItem>
                                      )}/>
                                       <FormField control={newUserForm.control} name="businessEmail" render={({ field }) => (
                                          <FormItem className="md:col-span-2"><FormLabel>Business Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="contact@business.com" {...field} /></FormControl><FormMessage /></FormItem>
                                      )}/>
                                      <Separator className="md:col-span-2"/>
                                      <FormField control={newUserForm.control} name="accountType" render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Account Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Single">Single Account</SelectItem>
                                                    <SelectItem value="Parent">Parent Account</SelectItem>
                                                    <SelectItem value="Branch">Branch Account</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                      )}/>
                                      {selectedAccountType === 'Branch' && (
                                         <FormField control={newUserForm.control} name="parentId" render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>Link to Parent Account</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a Parent Account..."/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {parentUsers?.map(p => (
                                                            <SelectItem key={p.id} value={p.id}>{p.businessName} ({p.clientId})</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                      )}
                                      {selectedAccountType === 'Parent' && (
                                         <FormField control={newUserForm.control} name="initialTopUp" render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>Initial Top-Up Credits (PHP)</FormLabel>
                                                <FormControl><Input type="number" placeholder="e.g. 10000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                                                <FormDescription>Set the starting credit balance for this parent account.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                         )}/>
                                      )}
                                    </div>
                                </div>
                            )}
                           {formStep === 1 && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-semibold text-lg">Step 2: Plan &amp; Configuration</h3>
                                        <p className="text-sm text-muted-foreground">Select a plan type, then choose and configure a specific plan.</p>
                                    </div>
                                    <FormField control={newUserForm.control} name="clientType" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Select a Plan Type</FormLabel>
                                                <FormControl>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                                        {clientTypes.map(type => {
                                                            const image = PlaceHolderImages.find(p => p.id === type.imageId);
                                                            return (
                                                                <Card key={type.name} onClick={() => { field.onChange(type.name); }} className={cn("cursor-pointer flex flex-col", field.value === type.name && "border-2 border-primary")}>
                                                                    {image && <div className="relative h-20 w-full"><Image src={image.imageUrl} alt={type.name} fill style={{objectFit:"cover"}} className="rounded-t-lg" data-ai-hint={image.imageHint} /></div>}
                                                                    <CardHeader className="p-3 flex-1"><CardTitle className="text-sm">{type.name}</CardTitle><CardDescription className="text-xs">{type.description}</CardDescription></CardHeader>
                                                                </Card>
                                                            )
                                                        })}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                    )}/>
                                    
                                    {selectedClientType && (
                                        <FormField control={newUserForm.control} name="plan" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Select a {selectedClientType} Plan</FormLabel>
                                                    <Select onValueChange={(value) => { const selectedPlan = planOptions.find(p => p.name === value); field.onChange(selectedPlan); }} value={field.value?.name}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a plan..." /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {planOptions.map(plan => (
                                                                <SelectItem key={plan.name} value={plan.name}>{plan.name} {plan.price > 0 && !plan.isConsumptionBased && !plan.isPrepaid && `(P${plan.price}/mo)`} {plan.isConsumptionBased && `(P${plan.price}/L)`}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                        )} />
                                    )}

                                    {selectedPlan && (
                                        <div className="space-y-6 pt-4">
                                            {selectedPlan.isPrepaid ? (
                                                <div className="space-y-4 p-4 border rounded-lg">
                                                    <h4 className="font-medium">Prepaid Configuration</h4>
                                                    <FormField control={newUserForm.control} name="plan.price" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Price per Liter (PHP)</FormLabel>
                                                            <FormControl><Input type="number" placeholder="e.g., 2.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}/>
                                                    <FormField control={newUserForm.control} name="initialTopUp" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Initial Top-Up (PHP)</FormLabel>
                                                            <FormControl><Input type="number" placeholder="e.g., 5000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                                                            <FormDescription>
                                                                {`This will give the user ~${(watchedTopUpAmount && watchedPlanPrice > 0) ? (watchedTopUpAmount / watchedPlanPrice).toFixed(0) : 0} liters.`}
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}/>
                                                </div>
                                            ) : selectedAccountType !== 'Branch' && (
                                                <div className="space-y-4 p-4 border rounded-lg">
                                                    <h4 className="font-medium">Delivery Schedule</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <FormField control={newUserForm.control} name="customPlanDetails.deliveryFrequency" render={({ field }) => (<FormItem><FormLabel>Frequency</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>
                                                        <FormField control={newUserForm.control} name="customPlanDetails.deliveryDay" render={({ field }) => (<FormItem><FormLabel>Day</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>
                                                    </div>
                                                    <FormField control={newUserForm.control} name="customPlanDetails.deliveryTime" render={({ field }) => (<FormItem><FormLabel>Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                                                </div>
                                            )}

                                            <div className="space-y-4 p-4 border rounded-lg">
                                                <h4 className="font-medium">Equipment Setup</h4>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <FormField control={newUserForm.control} name="customPlanDetails.gallonQuantity" render={({ field }) => (<FormItem><FormLabel>Containers</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                                                    <FormField control={newUserForm.control} name="customPlanDetails.gallonPrice" render={({ field }) => (<FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                                                    <FormField control={newUserForm.control} name="customPlanDetails.gallonPaymentType" render={({ field }) => (<FormItem><FormLabel>Payment</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Monthly">Monthly</SelectItem></SelectContent></Select><FormMessage/></FormItem>)}/>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <FormField control={newUserForm.control} name="customPlanDetails.dispenserQuantity" render={({ field }) => (<FormItem><FormLabel>Dispensers</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                                                    <FormField control={newUserForm.control} name="customPlanDetails.dispenserPrice" render={({ field }) => (<FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                                                    <FormField control={newUserForm.control} name="customPlanDetails.dispenserPaymentType" render={({ field }) => (<FormItem><FormLabel>Payment</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Monthly">Monthly</SelectItem></SelectContent></Select><FormMessage/></FormItem>)}/>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                           <DialogClose asChild><Button type="button" variant="ghost">Close</Button></DialogClose>
                            {formStep > 0 && <Button type="button" variant="outline" onClick={() => setFormStep(p => p - 1)}>Back</Button>}
                            
                            {formStep === 0 ?
                                <Button type="button" onClick={async () => {
                                     const isValid = await newUserForm.trigger(['clientId', 'name', 'businessName', 'address', 'contactNumber', 'businessEmail', 'accountType']);
                                     if (isValid) setFormStep(1);
                                }}>Next</Button>
                                :
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating Profile..." : "Create Unclaimed Profile"}</Button>
                            }
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </>
  );
}

