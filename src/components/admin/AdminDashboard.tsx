
'use client';

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCog, UserPlus, KeyRound, Trash2, MoreHorizontal, Users, Building, LogIn, Eye, EyeOff, FileText, Users2, UserCheck, Paperclip, Upload, MinusCircle, Info, Download, Calendar as CalendarIcon, PlusCircle, FileHeart, ShieldX, Receipt, History, Truck, PackageCheck, Package, LogOut, Edit, Shield, Wrench, BarChart, Save, StickyNote, Repeat, BellRing, X, Search, Pencil, CheckCircle, AlertTriangle } from 'lucide-react';
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
import { format, differenceInMonths, addMonths, isWithinInterval, startOfMonth, endOfMonth, subMonths, formatDistanceToNow } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AppUser, Delivery, WaterStation, Payment, ComplianceReport, SanitationVisit, Schedule, RefillRequest, SanitationChecklistItem, RefillRequestStatus, Notification } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc, deleteDocumentNonBlocking, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, updateDoc, collectionGroup, getDoc, getDocs, query, FieldValue, increment, addDoc, DocumentReference, arrayUnion, Timestamp, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { clientTypes } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AdminMyAccountDialog } from '@/components/AdminMyAccountDialog';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminDashboardSkeleton } from './AdminDashboardSkeleton';

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

const sanitationChecklistItemSchema = z.object({
    item: z.string(),
    checked: z.boolean(),
    remarks: z.string(),
});

const sanitationVisitSchema = z.object({
    scheduledDate: z.date({ required_error: 'Date is required.' }),
    status: z.enum(['Scheduled', 'Completed', 'Cancelled']),
    assignedTo: z.string().min(1, "Please assign a team member."),
    reportFile: z.any().optional(),
    checklist: z.array(sanitationChecklistItemSchema),
});

type SanitationVisitFormValues = z.infer<typeof sanitationVisitSchema>;

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

    const usersQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'users') : null, [firestore, isAdmin]);
    const { data: appUsers, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);

    const waterStationsQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'waterStations') : null, [firestore, isAdmin]);
    const { data: waterStations, isLoading: stationsLoading } = useCollection<WaterStation>(waterStationsQuery);

    const refillRequestsQuery = useMemoFirebase(() => (firestore && isAdmin) ? collectionGroup(firestore, 'refillRequests') : null, [firestore, isAdmin]);
    const { data: refillRequests, isLoading: refillRequestsLoading } = useCollection<RefillRequest>(refillRequestsQuery);
    
    const [isUserDetailOpen, setIsUserDetailOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<AppUser | null>(null);
    const [isDeliveryHistoryOpen, setIsDeliveryHistoryOpen] = React.useState(false);
    const [userForHistory, setUserForHistory] = React.useState<AppUser | null>(null);
    
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
    const [uploadingFiles, setUploadingFiles] = React.useState<Record<string, number>>({});
    const [complianceRefresher, setComplianceRefresher] = React.useState(0);
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = React.useState(false);
    const [userForSchedule, setUserForSchedule] = React.useState<AppUser | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [localSearchTerm, setLocalSearchTerm] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [isManageInvoiceOpen, setIsManageInvoiceOpen] = React.useState(false);
    const [selectedInvoice, setSelectedInvoice] = React.useState<Payment | null>(null);
    const [rejectionReason, setRejectionReason] = React.useState('');
    const [isSanitationHistoryOpen, setIsSanitationHistoryOpen] = React.useState(false);
    const [isSanitationVisitDialogOpen, setIsSanitationVisitDialogOpen] = React.useState(false);
    const [visitToEdit, setVisitToEdit] = React.useState<SanitationVisit | null>(null);
    const [visitToDelete, setVisitToDelete] = React.useState<SanitationVisit | null>(null);
    const ITEMS_PER_PAGE = 20;

    const adminUserDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
    const { data: adminUser } = useDoc<AppUser>(adminUserDocRef);

    const userDeliveriesQuery = useMemoFirebase(() => {
        if (!firestore || !selectedUser) return null;
        return collection(firestore, 'users', selectedUser.id, 'deliveries');
    }, [firestore, selectedUser]);
    const { data: userDeliveriesData } = useCollection<Delivery>(userDeliveriesQuery);

    const paymentsQuery = useMemoFirebase(() => {
        if (!firestore || !selectedUser) return null;
        return collection(firestore, 'users', selectedUser.id, 'payments');
    }, [firestore, selectedUser]);
    const { data: userPaymentsData, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);

    const sanitationVisitsQuery = useMemoFirebase(() => {
        if (!firestore || !selectedUser) return null;
        return collection(firestore, 'users', selectedUser.id, 'sanitationVisits');
    }, [firestore, selectedUser]);
    const { data: sanitationVisitsData, isLoading: sanitationVisitsLoading } = useCollection<SanitationVisit>(sanitationVisitsQuery);
    
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
            return { ...emptyState, currentBalance: selectedUser?.totalConsumptionLiters || 0 };
        }
    
        const cycleStart = startOfMonth(now);
        const cycleEnd = endOfMonth(now);
        
        const deliveriesThisCycle = userDeliveriesData.filter(d => {
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

        if (!selectedUser.createdAt) return emptyState;

        const createdAtDate = typeof (selectedUser.createdAt as any)?.toDate === 'function' 
            ? (selectedUser.createdAt as any).toDate() 
            : new Date(selectedUser.createdAt as string);

        const lastMonth = subMonths(now, 1);
        const lastCycleStart = startOfMonth(lastMonth);
        const lastCycleEnd = endOfMonth(lastMonth);
        
        const monthlyPlanLiters = selectedUser.customPlanDetails?.litersPerMonth || 0;
        const bonusLiters = selectedUser.customPlanDetails?.bonusLiters || 0;
        const totalMonthlyAllocation = monthlyPlanLiters + bonusLiters;
        
        let rolloverLiters = 0;
        
        if (createdAtDate < lastCycleStart) {
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
    
        window.addEventListener('admin-open-my-account', openAccountDialog);
    
        return () => {
          window.removeEventListener('admin-open-my-account', openAccountDialog);
        };
    }, []);

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
            checklist: defaultChecklistItems,
        }
    });

    const { fields: checklistFields, control: checklistControl } = useFieldArray({
        control: sanitationVisitForm.control,
        name: "checklist",
    });

    const watchedChecklist = sanitationVisitForm.watch("checklist");

    const createNotification = async (userId: string, notification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'>) => {
        if (!firestore) return;
        const notificationsCol = collection(firestore, 'users', userId, 'notifications');
        const newNotification: Partial<Notification> = {
            ...notification,
            userId,
            date: serverTimestamp(),
            isRead: false
        };
        await addDocumentNonBlocking(notificationsCol, newNotification);
    };

    React.useEffect(() => {
        if (visitToEdit) {
            sanitationVisitForm.reset({
                scheduledDate: new Date(visitToEdit.scheduledDate),
                status: visitToEdit.status,
                assignedTo: visitToEdit.assignedTo,
                checklist: visitToEdit.checklist || defaultChecklistItems,
            });
            setIsSanitationVisitDialogOpen(true);
        } else {
            sanitationVisitForm.reset({
                status: 'Scheduled',
                assignedTo: '',
                checklist: defaultChecklistItems,
                reportFile: null
            });
        }
    }, [visitToEdit, sanitationVisitForm]);


    React.useEffect(() => {
        if (isStationProfileOpen && stationToUpdate) {
            stationForm.reset({ name: stationToUpdate.name, location: stationToUpdate.location });
        } else {
            stationForm.reset({ name: '', location: '' });
            setAgreementFile(null);
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
        await updateDocumentNonBlocking(stationRef, values);
        toast({ title: 'Station Updated', description: `Station "${values.name}" has been updated.` });
    };

    const handleDeleteStation = async () => {
        if (!stationToDelete || !firestore) return;
        
        const stationRef = doc(firestore, 'waterStations', stationToDelete.id);
        deleteDocumentNonBlocking(stationRef);

        toast({
            title: 'Station Deleted',
            description: `Water station "${stationToDelete.name}" has been removed.`,
        });

        setStationToDelete(null);
        setIsStationProfileOpen(false);
    };


    const handleAssignStation = () => {
        if (!selectedUser || !stationToAssign || !firestore) return;

        const userRef = doc(firestore, 'users', selectedUser.id);
        const stationName = waterStations?.find(ws => ws.id === stationToAssign)?.name || 'a new station';
        updateDocumentNonBlocking(userRef, { assignedWaterStationId: stationToAssign });
        
        setSelectedUser(prev => prev ? { ...prev, assignedWaterStationId: stationToAssign } : null);

        createNotification(selectedUser.id, {
            type: 'general',
            title: 'Water Station Assigned',
            description: `Your account has been assigned to the ${stationName} water station.`,
            data: { stationId: stationToAssign }
        });

        toast({ title: 'Station Assigned', description: `${stationName} has been assigned to ${selectedUser.name}.` });
        setIsAssignStationOpen(false);
        setStationToAssign(undefined);
    };

    const handleFileUpload = async (
      file: File,
      path: string,
      uploadKey: string,
    ) => {
      if (!storage || !auth) throw new Error("Firebase not initialized");
      
      return uploadFileWithProgress(
        storage,
        auth,
        path,
        file,
        {}, // Metadata can be empty
        (progress) => {
          setUploadingFiles(prev => ({ ...prev, [uploadKey]: progress }));
        }
      );
    };

    const handleProofUpload = async () => {
        if (!deliveryProofFile || !deliveryToUpdate || !userForHistory || !storage) return;
    
        setIsSubmitting(true);
        const uploadKey = `proof-${deliveryToUpdate.id}`;
    
        try {
            const path = `users/${userForHistory.id}/deliveries/${deliveryToUpdate.id}-${deliveryProofFile.name}`;
            await handleFileUpload(deliveryProofFile, path, uploadKey);
            
            toast({ title: 'Upload Complete', description: 'The proof of delivery is being processed.' });
            setDeliveryToUpdate(null);
            setDeliveryProofFile(null);
    
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload proof.' });
        } finally {
            setIsSubmitting(false);
            setUploadingFiles(prev => {
                const newUploadingFiles = { ...prev };
                delete newUploadingFiles[uploadKey];
                return newUploadingFiles;
            });
        }
    };


    const handleUploadContract = async () => {
        if (!contractFile || !userForContract || !storage || !firestore) return;

        setIsSubmitting(true);
        const uploadKey = `contract-${userForContract.id}`;
    
        try {
            const path = `userContracts/${userForContract.id}/${contractFile.name}`;
            await handleFileUpload(contractFile, path, uploadKey);

            createNotification(userForContract.id, {
                type: 'general',
                title: 'Contract Attached',
                description: 'A new contract has been attached to your account.',
                data: {}
            });
    
            toast({ title: 'Upload Complete', description: 'The contract is being processed.' });
            setIsUploadContractOpen(false);
            setContractFile(null);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload contract.' });
        } finally {
            setIsSubmitting(false);
            setUploadingFiles(prev => {
                const newUploadingFiles = { ...prev };
                delete newUploadingFiles[uploadKey];
                return newUploadingFiles;
            });
        }
    };

    const handleCreateDelivery = async (values: DeliveryFormValues) => {
        if (!userForHistory || !firestore || !storage) return;
        setIsSubmitting(true);
    
        try {
            const newDeliveryDocRef = doc(collection(firestore, 'users', userForHistory.id, 'deliveries'), values.trackingNumber);
    
            const newDeliveryData: Omit<Delivery, 'id'|'userId'> & {date: string} = {
                date: values.date.toISOString(),
                volumeContainers: values.volumeContainers,
                status: values.status,
                adminNotes: values.adminNotes,
            };
    
            await setDocumentNonBlocking(newDeliveryDocRef, newDeliveryData);
    
            const file = values.proofFile?.[0];
            if (file) {
                const uploadKey = `delivery-${values.trackingNumber}`;
                const path = `users/${userForHistory.id}/deliveries/${values.trackingNumber}-${file.name}`;
                await handleFileUpload(file, path, uploadKey);
            }
    
            if (values.status === 'Delivered') {
                const litersToDeduct = values.volumeContainers * 19.5;
                const userRef = doc(firestore, 'users', userForHistory.id);
                await updateDocumentNonBlocking(userRef, { totalConsumptionLiters: increment(-litersToDeduct) });
            }
    
            toast({ title: "Delivery Record Created", description: `A manual delivery has been added for ${userForHistory.name}.` });
            deliveryForm.reset();
            setIsCreateDeliveryOpen(false);
    
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Creation Failed',
                description: 'Could not create delivery record.',
            });
        } finally {
            setIsSubmitting(false);
            setUploadingFiles({});
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
    
        const oldLiters = (deliveryToEdit.status === 'Delivered') ? containerToLiter(deliveryToEdit.volumeContainers) : 0;
        const newLiters = (values.status === 'Delivered') ? containerToLiter(values.volumeContainers) : 0;
        const adjustment = oldLiters - newLiters; 
    
        await updateDocumentNonBlocking(deliveryRef, updatedData);
    
        if (adjustment !== 0) {
            const userRef = doc(firestore, 'users', userForHistory.id);
            await updateDocumentNonBlocking(userRef, { totalConsumptionLiters: increment(adjustment) });
        }
    
        toast({ title: "Delivery Updated", description: `Delivery ${deliveryToEdit.id} has been successfully updated.` });
        setIsEditDeliveryOpen(false);
        setDeliveryToEdit(null);
    };

    const handleDeleteDelivery = async () => {
        if (!deliveryToDelete || !userForHistory || !firestore) return;
    
        const deliveryRef = doc(firestore, 'users', userForHistory.id, 'deliveries', deliveryToDelete.id);
    
        if (deliveryToDelete.status === 'Delivered') {
            const litersToRestore = containerToLiter(deliveryToDelete.volumeContainers);
            const userRef = doc(firestore, 'users', userForHistory.id);
            updateDocumentNonBlocking(userRef, { totalConsumptionLiters: increment(litersToRestore) });
        }
    
        deleteDocumentNonBlocking(deliveryRef);
    
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
        const allUsers = appUsers?.filter(user => user.role !== 'Admin') || [];
        if (!localSearchTerm) {
            return allUsers;
        }
        return allUsers.filter(user =>
            user.clientId?.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
            user.businessName?.toLowerCase().includes(localSearchTerm.toLowerCase())
        );
    }, [appUsers, localSearchTerm]);

    const paginatedUsers = React.useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredUsers.slice(startIndex, endIndex);
    }, [filteredUsers, currentPage]);

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

    const filteredDeliveries = (userDeliveriesData || []).filter(delivery => {
        if (!deliveryDateRange?.from) return true;
        const fromDate = deliveryDateRange.from;
        const toDate = deliveryDateRange.to || fromDate;
        const deliveryDate = new Date(delivery.date);
        return deliveryDate >= fromDate && deliveryDate <= toDate;
    });

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

    const handleRefillStatusUpdate = (request: RefillRequest, newStatus: RefillRequestStatus) => {
        if (!firestore) return;
        const requestRef = doc(firestore, 'users', request.userId, 'refillRequests', request.id);
        updateDocumentNonBlocking(requestRef, {
            status: newStatus,
            statusHistory: arrayUnion({ status: newStatus, timestamp: new Date().toISOString() })
        });
        
        createNotification(request.userId, {
            type: 'delivery',
            title: `Refill Request: ${newStatus}`,
            description: `Your one-time refill request is now ${newStatus}.`,
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
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            const newStationData = {
                name: values.name,
                location: values.location,
            };
            const newStationRef = await addDocumentNonBlocking(collection(firestore, 'waterStations'), newStationData);
            
            if (agreementFile) {
                const path = `stations/${newStationRef.id}/agreement/${agreementFile.name}`;
                await handleFileUpload(agreementFile, path, `agreement-${newStationRef.id}`);
            }

            toast({ title: "Station Created", description: `Station "${values.name}" and its documents are being processed.` });
            setIsStationProfileOpen(false);
            stationForm.reset();
            setAgreementFile(null);

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Creation Failed', description: 'Could not create the new station.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleInvoiceStatusUpdate = (newStatus: 'Paid' | 'Upcoming') => {
        if (!selectedUser || !selectedInvoice || !firestore) return;

        const invoiceRef = doc(firestore, 'users', selectedUser.id, 'payments', selectedInvoice.id);
        updateDocumentNonBlocking(invoiceRef, { status: newStatus });

        if (newStatus === 'Paid') {
            createNotification(selectedUser.id, {
                type: 'payment',
                title: 'Payment Confirmed',
                description: `Your payment for invoice ${selectedInvoice.id} has been confirmed. Thank you!`,
                data: { paymentId: selectedInvoice.id }
            });
        } else { // Rejected
             createNotification(selectedUser.id, {
                type: 'payment',
                title: 'Payment Action Required',
                description: `Your payment for invoice ${selectedInvoice.id} was rejected. Reason: ${rejectionReason || 'Please contact support.'}`,
                data: { paymentId: selectedInvoice.id }
            });
        }
        
        toast({ title: 'Invoice Updated', description: `Invoice status changed to ${newStatus}.` });
        setIsManageInvoiceOpen(false);
    };

    const handleSanitationVisitSubmit = async (values: SanitationVisitFormValues) => {
        if (!firestore || !selectedUser) return;
        setIsSubmitting(true);
    
        try {
            const visitData: Partial<SanitationVisit> = {
                ...values,
                scheduledDate: values.scheduledDate.toISOString(),
                userId: selectedUser.id,
            };
            delete (visitData as any).reportFile;
    
            let visitRef: DocumentReference;
            let isNewVisit = false;
    
            if (visitToEdit) {
                visitRef = doc(firestore, 'users', selectedUser.id, 'sanitationVisits', visitToEdit.id);
                await updateDocumentNonBlocking(visitRef, visitData);
                toast({ title: "Visit Updated", description: "The sanitation visit has been updated." });
            } else {
                isNewVisit = true;
                visitRef = await addDocumentNonBlocking(collection(firestore, 'users', selectedUser.id, 'sanitationVisits'), visitData);
                toast({ title: "Visit Scheduled", description: "A new sanitation visit has been scheduled." });
            }
    
            const file = values.reportFile?.[0];
            if (file) {
                const path = `users/${selectedUser.id}/sanitationVisits/${visitRef.id}/${file.name}`;
                await handleFileUpload(file, path, `sanitation-${visitRef.id}`);
            }
            
            // Send notification
            if (isNewVisit) {
                 createNotification(selectedUser.id, {
                    type: 'sanitation',
                    title: 'Sanitation Visit Scheduled',
                    description: `A sanitation visit has been scheduled for your office on ${format(values.scheduledDate, 'PPP')}.`,
                    data: { visitId: visitRef.id }
                });
            } else if (visitToEdit?.status !== values.status) {
                 createNotification(selectedUser.id, {
                    type: 'sanitation',
                    title: `Sanitation Visit: ${values.status}`,
                    description: `Your sanitation visit scheduled for ${format(values.scheduledDate, 'PPP')} is now ${values.status}.`,
                    data: { visitId: visitRef.id }
                });
            }
    
            setIsSanitationVisitDialogOpen(false);
            setVisitToEdit(null);
            sanitationVisitForm.reset();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Operation Failed", description: "Could not save the sanitation visit." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSanitationVisit = async () => {
        if (!firestore || !selectedUser || !visitToDelete) return;
        
        const visitRef = doc(firestore, 'users', selectedUser.id, 'sanitationVisits', visitToDelete.id);
        await deleteDocumentNonBlocking(visitRef);
        
        toast({ title: "Visit Deleted", description: "The sanitation visit has been removed." });
        setVisitToDelete(null);
    };

    const handleComplianceReportSubmit = async (values: ComplianceReportFormValues) => {
        if (!firestore || !stationToUpdate) return;
        setIsSubmitting(true);
    
        try {
            const reportData = {
                ...values,
                name: `${values.reportType} - ${format(new Date(), 'MMM yyyy')}`,
                date: serverTimestamp(),
            };
            
            delete (reportData as any).reportFile;
    
            let reportRef: DocumentReference;
            if (complianceReportToEdit) {
                reportRef = doc(firestore, 'waterStations', stationToUpdate.id, 'complianceReports', complianceReportToEdit.id);
                await updateDocumentNonBlocking(reportRef, reportData);
                toast({ title: 'Report Updated', description: 'The compliance report has been updated.' });
            } else {
                reportRef = await addDocumentNonBlocking(collection(firestore, 'waterStations', stationToUpdate.id, 'complianceReports'), reportData);
                toast({ title: 'Report Created', description: 'A new compliance report has been created.' });
            }
    
            const file = values.reportFile?.[0];
            if (file) {
                const path = `stations/${stationToUpdate.id}/compliance/${reportRef.id}-${file.name}`;
                await handleFileUpload(file, path, `compliance-${reportRef.id}`);
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
        }
    };

    const handleDeleteComplianceReport = async () => {
        if (!firestore || !stationToUpdate || !complianceReportToDelete) return;

        const reportRef = doc(firestore, 'waterStations', stationToUpdate.id, 'complianceReports', complianceReportToDelete.id);
        await deleteDocumentNonBlocking(reportRef);

        toast({ title: "Report Deleted", description: "The compliance report has been removed." });
        setComplianceReportToDelete(null);
        setComplianceRefresher(c => c + 1);
    };
    
    // Helper function to safely convert a Firestore timestamp or string to a Date object
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

    if (usersLoading || stationsLoading) {
        return <AdminDashboardSkeleton />;
    }

  return (
    <>
        <Dialog open={isUserDetailOpen} onOpenChange={setIsUserDetailOpen}>
            <DialogContent className="sm:max-w-5xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>User Account Management</DialogTitle>
                    <DialogDescription>
                        View user details and perform administrative actions.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="pr-6 -mr-6">
                {selectedUser && (
                    <div className="grid md:grid-cols-2 gap-8 py-6">
                        {/* Left Column: User Profile & Details */}
                        <div className="space-y-4">
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
                            
                            <Tabs defaultValue="profile">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="profile">Profile</TabsTrigger>
                                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                                </TabsList>
                                <TabsContent value="profile" className="pt-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">User Profile</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm pt-0">
                                            <div className="grid grid-cols-2 gap-x-4">
                                                <div className="text-muted-foreground">Client ID:</div>
                                                <div className="font-medium text-right">{selectedUser.clientId}</div>
                                                <div className="text-muted-foreground">Plan:</div>
                                                <div className="font-medium text-right">{selectedUser.plan?.name || 'N/A'}</div>
                                                <div className="text-muted-foreground">Role:</div>
                                                <div className="font-medium text-right">{selectedUser.role}</div>
                                                <div className="text-muted-foreground">Assigned Station:</div>
                                                <div className="font-medium text-right">{waterStations?.find(ws => ws.id === selectedUser.assignedWaterStationId)?.name || 'Not Assigned'}</div>
                                                <div className="text-muted-foreground">Last Login:</div>
                                                <div className="font-medium text-right">{selectedUser.lastLogin ? format(new Date(selectedUser.lastLogin), 'PPp') : 'N/A'}</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                <TabsContent value="invoices" className="pt-4">
                                    <ScrollArea className="h-72">
                                    {paymentsLoading ? (
                                         <div className="text-center text-muted-foreground py-10">
                                            Loading invoices...
                                        </div>
                                    ) : userPaymentsData && userPaymentsData.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Invoice</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {userPaymentsData.map((invoice) => (
                                                    <TableRow key={invoice.id} className="cursor-pointer" onClick={() => { setSelectedInvoice(invoice); setIsManageInvoiceOpen(true); }}>
                                                        <TableCell>
                                                            <div className="font-medium">{invoice.id}</div>
                                                            <div className="text-xs text-muted-foreground">{format(new Date(invoice.date), 'PP')}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={invoice.status === 'Paid' ? 'default' : (invoice.status === 'Upcoming' ? 'secondary' : 'outline')}
                                                                className={cn(
                                                                    'text-xs',
                                                                    invoice.status === 'Paid' && 'bg-green-100 text-green-800',
                                                                    invoice.status === 'Upcoming' && 'bg-yellow-100 text-yellow-800',
                                                                    invoice.status === 'Overdue' && 'bg-red-100 text-red-800',
                                                                    invoice.status === 'Pending Review' && 'bg-blue-100 text-blue-800'
                                                                )}
                                                            >{invoice.status}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">₱{invoice.amount.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                         <div className="text-center text-muted-foreground py-10">
                                            No invoices found for this user.
                                        </div>
                                    )}
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                             <h4 className="font-semibold text-lg pt-4">Actions</h4>
                             <div className="grid grid-cols-2 gap-2">
                                <Button onClick={() => { setUserForHistory(selectedUser); setIsDeliveryHistoryOpen(true); }} variant="outline" size="sm">
                                    <History className="mr-2 h-4 w-4" />
                                    Deliveries
                                </Button>
                                <Button onClick={() => setIsSanitationHistoryOpen(true)} variant="outline" size="sm">
                                    <FileHeart className="mr-2 h-4 w-4" />
                                    Sanitation
                                </Button>
                                <Button onClick={() => { setIsAssignStationOpen(true); }} disabled={!isAdmin} variant="outline" size="sm">
                                    <Building className="mr-2 h-4 w-4" />
                                    Assign Station
                                </Button>
                                <Button variant="outline" onClick={() => { setUserForContract(selectedUser); setIsUploadContractOpen(true); }} disabled={!isAdmin} size="sm">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Contract
                                </Button>
                            </div>
                        </div>

                        {/* Right Column: Consumption & Plan */}
                        <div className="space-y-4">
                            {selectedUserPlanImage && (
                                <div className="space-y-2">
                                <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                                    <Image
                                        src={selectedUserPlanImage.imageUrl}
                                        alt={selectedUser.clientType || ''}
                                        fill
                                        className="object-cover"
                                        data-ai-hint={selectedUserPlanImage.imageHint}
                                    />
                                </div>
                                </div>
                            )}

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Consumption Details</CardTitle>
                                </CardHeader>
                                {selectedUser.plan?.isConsumptionBased ? (
                                    <CardContent className="space-y-2 text-sm pt-0">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Billing Model:</span>
                                            <span className="font-medium">Pay based on consumption</span>
                                        </div>
                                         <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-1">
                                            <span className="text-foreground">Estimated Cost This Month:</span>
                                            <span>₱{consumptionDetails.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <Separator/>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Consumed this Month:</span>
                                            <span className="font-medium text-red-600">{consumptionDetails.consumedLitersThisMonth.toLocaleString()} L</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Rate:</span>
                                            <span className="font-medium">₱{selectedUser.plan.price}/Liter</span>
                                        </div>
                                    </CardContent>
                                ) : (
                                    <CardContent className="space-y-2 text-sm pt-0">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Auto Refill:</span>
                                            {selectedUser.customPlanDetails?.autoRefillEnabled ?? true ? (
                                                <Badge variant="default" className="bg-green-100 text-green-800">Enabled</Badge>
                                            ) : (
                                                <Badge variant="destructive">Disabled</Badge>
                                            )}
                                        </div>
                                        <Separator/>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Monthly Plan Liters:</span>
                                            <span className="font-medium">{consumptionDetails.monthlyPlanLiters.toLocaleString()} L</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Bonus Liters:</span>
                                            <span className="font-medium">{consumptionDetails.bonusLiters.toLocaleString()} L</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Rollover from Last Month:</span>
                                            <span className="font-medium">{consumptionDetails.rolloverLiters.toLocaleString()} L</span>
                                        </div>
                                        <div className="flex justify-between font-semibold border-t pt-2 mt-1">
                                            <span className="text-foreground">Total for this Month:</span>
                                            <span>{consumptionDetails.totalLitersForMonth.toLocaleString()} L</span>
                                        </div>
                                        <Separator/>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Consumed this Month:</span>
                                            <span className="font-medium text-red-600">-{consumptionDetails.consumedLitersThisMonth.toLocaleString()} L</span>
                                        </div>
                                        <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-1">
                                            <span className="text-foreground">Current Balance:</span>
                                            <span>{consumptionDetails.currentBalance.toLocaleString()} L</span>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        </div>
                    </div>
                )}
                </ScrollArea>
                <DialogFooter className="border-t pt-4 -mb-2 -mx-6 px-6 pb-4">
                    <Button variant="outline" onClick={() => setIsUserDetailOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
         <Dialog open={isDeliveryHistoryOpen} onOpenChange={setIsDeliveryHistoryOpen}>
            <DialogContent className="sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/> Delivery History for {userForHistory?.name}</DialogTitle>
                    <DialogDescription>
                        A log of all past deliveries for this user.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-2 py-4">
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
                 <ScrollArea className="pr-2 -mr-2">
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
                            {userDeliveriesData && userDeliveriesData.length > 0 ? (
                                filteredDeliveries.map(delivery => {
                                    const liters = delivery.volumeContainers * 19.5;
                                    const isUploadingProof = uploadingFiles[`proof-${delivery.id}`] > 0 && uploadingFiles[`proof-${delivery.id}`] < 100;
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
                                                        <DropdownMenuItem onClick={() => setDeliveryToUpdate(delivery)} disabled={!isAdmin || isUploadingProof}>
                                                            <Upload className="mr-2 h-4 w-4" />
                                                            {isUploadingProof ? 'Uploading...' : 'Attach Proof'}
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

        <Dialog open={isCreateDeliveryOpen} onOpenChange={setIsCreateDeliveryOpen}>
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
                         <FormField
                            control={deliveryForm.control}
                            name="proofFile"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proof of Delivery (Optional)</FormLabel>
                                    <FormControl>
                                       <Input type="file" onChange={(e) => field.onChange(e.target.files)} disabled={isSubmitting} />
                                    </FormControl>
                                    {uploadingFiles[`delivery-${deliveryForm.watch('trackingNumber')}`] > 0 && (
                                        <Progress value={uploadingFiles[`delivery-${deliveryForm.watch('trackingNumber')}`]} className="mt-2" />
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
        
        <Dialog open={!!deliveryToUpdate} onOpenChange={(open) => { if (!open && !isSubmitting) { setDeliveryToUpdate(null); setDeliveryProofFile(null); } }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Attach Proof of Delivery</DialogTitle>
                    <DialogDescription>Attach the proof of delivery for delivery ID: {deliveryToUpdate?.id}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Input type="file" onChange={(e) => setDeliveryProofFile(e.target.files?.[0] || null)} disabled={isSubmitting} />
                    {deliveryToUpdate && uploadingFiles[`proof-${deliveryToUpdate.id}`] > 0 && (
                        <Progress value={uploadingFiles[`proof-${deliveryToUpdate.id}`]} />
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setDeliveryToUpdate(null); setDeliveryProofFile(null); }} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleProofUpload} disabled={!deliveryProofFile || isSubmitting}>
                        {isSubmitting ? "Uploading..." : "Attach"}
                    </Button>
                </DialogFooter>
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
                     {userForContract && uploadingFiles[`contract-${userForContract.id}`] > 0 && (
                        <Progress value={uploadingFiles[`contract-${userForContract.id}`]} />
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUploadContractOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleUploadContract} disabled={!contractFile || isSubmitting}>
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
                            {selectedInvoice?.status}
                        </Badge>
                    </div>
                    {selectedInvoice?.proofOfPaymentUrl && (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Proof of Payment</p>
                            <Button variant="outline" onClick={() => setSelectedProofUrl(selectedInvoice.proofOfPaymentUrl!)}>
                                <Eye className="mr-2 h-4 w-4" /> View Proof
                            </Button>
                        </div>
                    )}

                    {selectedInvoice?.status === 'Pending Review' && (
                        <div className="pt-4 space-y-4 border-t">
                             <h4 className="font-semibold">Actions</h4>
                             <div className="flex gap-2">
                                <Button onClick={() => handleInvoiceStatusUpdate('Paid')}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                                </Button>
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
            <Card>
                <CardHeader>
                    <CardTitle className="relative flex items-center">
                        <Users className="mr-2 h-4 w-4"/>User Management
                        {activeRefillRequests.length > 0 && (
                            <Badge className="ml-2 h-5 w-5 justify-center p-0">{activeRefillRequests.length}</Badge>
                        )}
                    </CardTitle>
                    <CardDescription>Manage all user accounts and their details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                                    <TableHead>Auto Refill</TableHead>
                                    <TableHead>Delivery Schedule</TableHead>
                                    <TableHead>Assigned Station</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedUsers.map((user) => {
                                    const schedule = user.customPlanDetails?.deliveryDay && user.customPlanDetails?.deliveryTime
                                        ? `${user.customPlanDetails.deliveryDay}, ${user.customPlanDetails.deliveryTime}`
                                        : 'N/A';
                                    const autoRefillEnabled = user.customPlanDetails?.autoRefillEnabled ?? true;
                                    return (
                                    <TableRow key={user.id} onClick={() => { setSelectedUser(user); setIsUserDetailOpen(true);}} className="cursor-pointer">
                                        <TableCell className="whitespace-nowrap">{user.clientId}</TableCell>
                                        <TableCell className="whitespace-nowrap">{user.businessName}</TableCell>
                                        <TableCell>
                                            <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setUserForSchedule(user); setIsScheduleDialogOpen(true); }}>
                                                {user.plan?.isConsumptionBased && !autoRefillEnabled ? (
                                                     <Badge variant="outline">On-Demand</Badge>
                                                ) : autoRefillEnabled ? (
                                                    <Badge variant="default" className="bg-green-100 text-green-800">Enabled</Badge>
                                                ) : (
                                                    <Badge variant="destructive">Disabled</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{user.plan?.isConsumptionBased && !autoRefillEnabled ? 'On-demand' : schedule}</TableCell>
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
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Building className="mr-2 h-4 w-4" />Water Stations</CardTitle>
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
        </div>


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
                                        <FormControl><Input placeholder="e.g. Aqua Pure Downtown" {...field} disabled={!stationToUpdate && isSubmitting}/></FormControl>
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
                                    const onUpload = async () => {
                                        if (!agreementFile || !stationToUpdate || !storage) return;
                                        const docKey = 'agreement';
                                        const stationId = stationToUpdate.id;
                                        const path = `stations/${stationId}/agreement/${agreementFile.name}`;
                                        const uploadKey = `${docKey}-${stationId}`;
                                        try {
                                            await handleFileUpload(agreementFile, path, uploadKey);
                                            toast({ title: 'Agreement Uploaded', description: 'The partnership agreement is being processed.' });
                                            setAgreementFile(null);
                                        } catch (err) {
                                            console.error(err);
                                            toast({variant: 'destructive', title: 'Upload Failed'});
                                        } finally {
                                            setUploadingFiles(prev => {
                                                const newState = {...prev};
                                                delete newState[uploadKey];
                                                return newState;
                                            });
                                        }
                                    };
                                    
                                    const progress = uploadingFiles[`agreement-${stationToUpdate?.id}`];
                                    const isUploadingFile = progress > 0 && progress < 100;

                                    if (isUploadingFile) {
                                        return <Progress value={progress} className="w-full h-2" />;
                                    }
                                    if (stationToUpdate?.partnershipAgreementUrl) {
                                        return (
                                            <>
                                                <FileText className="h-6 w-6 text-muted-foreground" />
                                                <div className="flex-1"><p className="font-medium">Agreement on File</p></div>
                                                <Button asChild variant="outline"><a href={stationToUpdate.partnershipAgreementUrl} target="_blank" rel="noopener noreferrer"><Eye className="mr-2 h-4 w-4" /> View</a></Button>
                                            </>
                                        );
                                    }
                                    if (agreementFile) {
                                        return (
                                            <>
                                                <FileText className="h-6 w-6 text-muted-foreground" />
                                                <div className="flex-1">
                                                    <p className="font-medium truncate">{agreementFile.name}</p>
                                                    <p className="text-xs text-muted-foreground">Ready to upload</p>
                                                </div>
                                                {<Button disabled={isSubmitting || !stationToUpdate} onClick={onUpload}><Upload className="mr-2 h-4 w-4"/> Upload</Button>}
                                                <Button size="icon" variant="ghost" onClick={() => setAgreementFile(null)} disabled={isSubmitting}><X className="h-4 w-4"/></Button>
                                            </>
                                        );
                                    }
                                    return (
                                        <>
                                            <FileText className="h-6 w-6 text-muted-foreground" />
                                            <div className="flex-1">
                                                <p className="font-medium">No Agreement Attached</p>
                                                <p className="text-xs text-muted-foreground">Please attach the signed agreement.</p>
                                            </div>
                                             <Button asChild variant="outline" disabled={isSubmitting}>
                                                <Label className={cn("flex items-center", !isSubmitting ? "cursor-pointer" : "cursor-not-allowed")}>
                                                    <Paperclip className="mr-2 h-4 w-4" /> Attach
                                                    <Input type="file" accept="application/pdf" className="hidden" disabled={isSubmitting} onChange={(e) => e.target.files?.[0] && setAgreementFile(e.target.files[0])} />
                                                </Label>
                                            </Button>
                                        </>
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
                            <Button onClick={stationForm.handleSubmit(handleCreateStation)} disabled={isSubmitting || stationForm.formState.isSubmitting}>{isSubmitting ? "Creating..." : "Create Station"}</Button>
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
                                    <TableHead className="text-right"></TableHead>
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
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => setVisitToEdit(visit)}><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => setVisitToDelete(visit)}><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
        
        <Dialog open={isSanitationVisitDialogOpen} onOpenChange={(open) => { if (!open) { setVisitToEdit(null); sanitationVisitForm.reset(); } setIsSanitationVisitDialogOpen(open);}}>
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
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Sanitation Checklist</h4>
                                <ScrollArea className="h-72 border rounded-md p-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-8"></TableHead>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Remarks</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {checklistFields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell>
                                                    <FormField
                                                        control={sanitationVisitForm.control}
                                                        name={`checklist.${index}.checked`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value}
                                                                        onCheckedChange={field.onChange}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-xs">{field.item}</TableCell>
                                                <TableCell>
                                                    {watchedChecklist[index]?.checked ? (
                                                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                            <CheckCircle className="h-3 w-3 mr-1"/>
                                                            Passed
                                                        </Badge>
                                                    ) : (
                                                        <FormField
                                                            control={sanitationVisitForm.control}
                                                            name={`checklist.${index}.remarks`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <Input {...field} placeholder="Remarks..." className="h-7 text-xs" />
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </ScrollArea>
                            </div>
                        </div>
                    </ScrollArea>
                        <DialogFooter className="pt-6">
                            <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Visit"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
         <AlertDialog open={!!visitToDelete} onOpenChange={(open) => !open && setVisitToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the sanitation visit scheduled for {visitToDelete ? format(new Date(visitToDelete.scheduledDate), 'PP') : ''}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSanitationVisit}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

