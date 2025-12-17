
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCog, UserPlus, KeyRound, Trash2, MoreHorizontal, Users, Building, LogIn, Eye, EyeOff, FileText, Users2, UserCheck, Paperclip, Upload, MinusCircle, Info, Download, Calendar as CalendarIcon, PlusCircle, FileHeart, ShieldX, Receipt, History, Truck, PackageCheck, Package, LogOut, Edit, Shield, Wrench, BarChart, Save, StickyNote, Repeat, BellRing, X, Search, Pencil } from 'lucide-react';
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
import type { AppUser, Delivery, WaterStation, Payment, ComplianceReport, SanitationVisit, Schedule, RefillRequest } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc, deleteDocumentNonBlocking, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, updateDoc, collectionGroup, getDoc, getDocs, query, FieldValue, increment, addDoc, DocumentReference } from 'firebase/firestore';
import { UploadTask } from 'firebase/storage';
import { createUserWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { clientTypes } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminMyAccountDialog } from '@/components/AdminMyAccountDialog';
import { uploadFileWithProgress } from '@/lib/storage-utils';

const newStationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    location: z.string().min(1, 'Location is required'),
});

type NewStationFormValues = z.infer<typeof newStationSchema>;

const adjustConsumptionSchema = z.object({
    amount: z.coerce.number().min(0, 'Amount must be a positive number'),
    containers: z.coerce.number().optional(),
});
type AdjustConsumptionFormValues = z.infer<typeof adjustConsumptionSchema>;

const deliveryFormSchema = z.object({
    trackingNumber: z.string().min(1, 'Tracking Number is required'),
    date: z.date({ required_error: 'Date is required.'}),
    volumeContainers: z.coerce.number().min(1, 'Volume is required.'),
    status: z.enum(['Pending', 'In Transit', 'Delivered']),
    proofFile: z.any().optional(),
    adminNotes: z.string().optional(),
});
type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;


const containerToLiter = (containers: number) => (containers || 0) * 19.5;


function AdminDashboardSkeleton() {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <Skeleton className="h-9 w-64" />
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-1" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-10 w-full mb-4" />
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-40" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
                 <div className="flex items-center justify-end space-x-2 py-4">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

function AdminDashboard({ isAdmin }: { isAdmin: boolean }) {
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

    const refillRequestsQuery = useMemoFirebase(() => (firestore && isAdmin) ? query(collection(firestore, 'refillRequests')) : null, [firestore, isAdmin]);
    const { data: refillRequests, isLoading: refillRequestsLoading } = useCollection<RefillRequest>(refillRequestsQuery);
    
    const [isUserDetailOpen, setIsUserDetailOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<AppUser | null>(null);
    const [isDeliveryHistoryOpen, setIsDeliveryHistoryOpen] = React.useState(false);
    const [userForHistory, setUserForHistory] = React.useState<AppUser | null>(null);
    
    const [stationToUpdate, setStationToUpdate] = React.useState<WaterStation | null>(null);
    const [stationToDelete, setStationToDelete] = React.useState<WaterStation | null>(null);
    const [isAdjustConsumptionOpen, setIsAdjustConsumptionOpen] = React.useState(false);
    const [adjustmentType, setAdjustmentType] = React.useState<'add' | 'deduct'>('deduct');
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
    const [complianceFiles, setComplianceFiles] = React.useState<Record<string, File>>({});

    const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
    const [uploadingFiles, setUploadingFiles] = React.useState<Record<string, number>>({});
    const [complianceRefresher, setComplianceRefresher] = React.useState(0);
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = React.useState(false);
    const [userForSchedule, setUserForSchedule] = React.useState<AppUser | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [localSearchTerm, setLocalSearchTerm] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
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
    const { data: userPaymentsData } = useCollection<Payment>(paymentsQuery);
    
    const consumptionDetails = React.useMemo(() => {
        const now = new Date();
        const emptyState = {
            monthlyPlanLiters: 0,
            bonusLiters: 0,
            rolloverLiters: 0,
            totalLitersForMonth: 0,
            consumedLitersThisMonth: 0,
            currentBalance: 0,
        };
    
        if (!selectedUser || !selectedUser.plan || !userDeliveriesData || !selectedUser.createdAt) {
            return { ...emptyState, currentBalance: selectedUser?.totalConsumptionLiters || 0 };
        }
    
        const createdAtDate = typeof (selectedUser.createdAt as any)?.toDate === 'function' 
            ? (selectedUser.createdAt as any).toDate() 
            : new Date(selectedUser.createdAt as string);

        const cycleStart = startOfMonth(now);
        const cycleEnd = endOfMonth(now);
        
        const lastMonth = subMonths(now, 1);
        const lastCycleStart = startOfMonth(lastMonth);
        const lastCycleEnd = endOfMonth(lastMonth);

        const deliveriesThisCycle = userDeliveriesData.filter(d => {
            const deliveryDate = new Date(d.date);
            return isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd });
        });
        const consumedLitersThisMonth = deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
    
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


    const generatedInvoices = React.useMemo(() => {
        if (!selectedUser?.createdAt || !selectedUser.plan) return [];
        
        const invoices: Payment[] = [];
        const now = new Date();
        const createdAt = selectedUser.createdAt;
        const startDate = typeof (createdAt as any)?.toDate === 'function' 
            ? (createdAt as any).toDate() 
            : new Date(selectedUser.createdAt as string);
        
        if (isNaN(startDate.getTime())) return [];

        const months = differenceInMonths(now, startDate);
    
        for (let i = 0; i <= months; i++) {
          const invoiceDate = addMonths(startDate, i);
          invoices.push({
            id: `INV-${format(invoiceDate, 'yyyyMM')}`,
            date: invoiceDate.toISOString(),
            description: `${selectedUser.plan.name} - ${format(invoiceDate, 'MMMM yyyy')}`,
            amount: selectedUser.plan.price,
            status: 'Upcoming', 
          });
        }
  
        const mergedInvoices = invoices.map(inv => {
          const dbInvoice = userPaymentsData?.find(p => p.id === inv.id);
          return dbInvoice ? { ...inv, ...dbInvoice } : inv;
        });
  
        return mergedInvoices.reverse();
    }, [selectedUser, userPaymentsData]);

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
    
    const adjustConsumptionForm = useForm<AdjustConsumptionFormValues>({
        resolver: zodResolver(adjustConsumptionSchema),
        defaultValues: { amount: 0, containers: 0 },
    });

    React.useEffect(() => {
        if (isStationProfileOpen && stationToUpdate) {
            stationForm.reset({ name: stationToUpdate.name, location: stationToUpdate.location });
        } else {
            stationForm.reset({ name: '', location: '' });
            setAgreementFile(null);
            setComplianceFiles({});
        }
    }, [stationToUpdate, stationForm, isStationProfileOpen]);
    
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
        updateDocumentNonBlocking(userRef, { assignedWaterStationId: stationToAssign });
        
        setSelectedUser(prev => prev ? { ...prev, assignedWaterStationId: stationToAssign } : null);

        toast({ title: 'Station Assigned', description: `A new water station has been assigned to ${selectedUser.name}.` });
        setIsAssignStationOpen(false);
        setStationToAssign(undefined);
    };

    const handleAdjustConsumption = (values: AdjustConsumptionFormValues) => {
        if (!selectedUser || !firestore) return;

        const amount = adjustmentType === 'add' ? values.amount : -values.amount;
        
        const userRef = doc(firestore, 'users', selectedUser.id);
        updateDocumentNonBlocking(userRef, { totalConsumptionLiters: increment(amount) });
        
        setSelectedUser(prev => prev ? { ...prev, totalConsumptionLiters: (prev.totalConsumptionLiters || 0) + amount } : null);

        toast({
            title: `Liters Adjusted`,
            description: `${Math.abs(values.amount).toLocaleString()} liters ${adjustmentType === 'add' ? 'added to' : 'deducted from'} ${selectedUser.name}'s balance.`
        });
        
        setIsAdjustConsumptionOpen(false);
        adjustConsumptionForm.reset();
    };

    const handleFileUpload = async (
      file: File,
      path: string,
      metadata: any,
      uploadKey: string,
    ): Promise<UploadTask> => {
      if (!storage) throw new Error("Storage not initialized");
      
      return uploadFileWithProgress(
        storage,
        path,
        file,
        { customMetadata: metadata },
        (progress) => {
          setUploadingFiles(prev => ({ ...prev, [uploadKey]: progress }));
        }
      );
    };

    const handleProofUpload = async () => {
        if (!deliveryProofFile || !deliveryToUpdate || !userForHistory) return;
    
        setIsSubmitting(true);
        const uploadKey = `proof-${deliveryToUpdate.id}`;
    
        try {
            const path = `users/${userForHistory.id}/deliveries/${deliveryToUpdate.id}-${deliveryProofFile.name}`;
            const metadata = {
                firestorePath: `users/${userForHistory.id}/deliveries/${deliveryToUpdate.id}`,
                firestoreField: 'proofOfDeliveryUrl'
            };
            await handleFileUpload(deliveryProofFile, path, metadata, uploadKey);
            
            toast({ title: 'Proof Uploaded', description: 'The proof of delivery is being processed.' });
            setDeliveryToUpdate(null);
            setDeliveryProofFile(null);
    
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload proof.' });
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleUploadContract = async () => {
        if (!contractFile || !userForContract) return;

        setIsSubmitting(true);
        const uploadKey = `contract-${userForContract.id}`;
    
        try {
            const path = `userContracts/${userForContract.id}/${contractFile.name}`;
            const metadata = {
                firestorePath: `users/${userForContract.id}`,
                firestoreField: 'currentContractUrl'
            };
            await handleFileUpload(contractFile, path, metadata, uploadKey);
    
            toast({ title: 'Contract Uploaded', description: 'The contract is being processed.' });
            setIsUploadContractOpen(false);
            setContractFile(null);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload contract.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateDelivery = async (values: DeliveryFormValues) => {
        if (!userForHistory || !firestore || !storage) return;
        setIsSubmitting(true);
    
        try {
            const newDeliveryDocRef = doc(firestore, 'users', userForHistory.id, 'deliveries', values.trackingNumber);
    
            const newDeliveryData: Delivery = {
                id: values.trackingNumber,
                userId: userForHistory.id,
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
                const metadata = {
                    firestorePath: newDeliveryDocRef.path,
                    firestoreField: 'proofOfDeliveryUrl'
                };
                await handleFileUpload(file, path, metadata, uploadKey);
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
        if(selectedUser) {
            const deliveriesForUser = collection(firestore, 'users', selectedUser.id, 'deliveries');
        }
    }, [selectedUser, firestore]);

    const watchedContainers = adjustConsumptionForm.watch('containers');
    React.useEffect(() => {
        const liters = (watchedContainers || 0) * 19.5;
        adjustConsumptionForm.setValue('amount', parseFloat(liters.toFixed(2)), { shouldValidate: true });
    }, [watchedContainers, adjustConsumptionForm]);

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

    const handleCompleteRefillRequest = (requestId: string) => {
        if (!firestore) return;
        const requestRef = doc(firestore, 'refillRequests', requestId);
        updateDocumentNonBlocking(requestRef, { status: 'Completed' });
        toast({ title: 'Request Completed', description: 'The refill request has been marked as completed.' });
    };

    const pendingRefillRequests = React.useMemo(() => {
        return refillRequests?.filter(req => req.status === 'Pending') || [];
    }, [refillRequests]);

    const complianceFields: { key: string, label: string }[] = [
        { key: 'businessPermit', label: 'Business Permit' },
        { key: 'dohPermit', label: 'DOH Permit' },
        { key: 'sanitaryPermit', label: 'Sanitary Permit' },
    ];
      
    const selectedUserPlanImage = React.useMemo(() => {
        if (!selectedUser?.clientType) return null;
        const clientTypeDetails = clientTypes.find(ct => ct.name === selectedUser.clientType);
        if (!clientTypeDetails) return null;
        return PlaceHolderImages.find(p => p.id === clientTypeDetails.imageId);
    }, [selectedUser]);

    const handleComplianceFileSelect = (key: string, file: File | null) => {
        setComplianceFiles(prev => {
            const newState = {...prev};
            if (file) {
                newState[key] = file;
            } else {
                delete newState[key];
            }
            return newState;
        })
    }
    
    const handleCreateStation = async (values: NewStationFormValues) => {
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            const newStationRef = await addDocumentNonBlocking(collection(firestore, 'waterStations'), values);
            
            // Upload files after station is created
            const uploadPromises: Promise<any>[] = [];
            const stationId = newStationRef.id;

            if (agreementFile) {
                const path = `stations/${stationId}/agreement/${agreementFile.name}`;
                const metadata = { firestorePath: `waterStations/${stationId}`, firestoreField: 'partnershipAgreementUrl' };
                uploadPromises.push(handleFileUpload(agreementFile, path, metadata, 'agreement'));
            }

            Object.entries(complianceFiles).forEach(([key, file]) => {
                const path = `stations/${stationId}/compliance/${key}-${file.name}`;
                // Note: The cloud function for compliance is slightly different.
                // It creates a new doc in a subcollection. This metadata reflects that.
                const metadata = {
                    firestorePath: `waterStations/${stationId}/complianceReports/${key}`,
                    firestoreField: 'reportUrl'
                };
                uploadPromises.push(handleFileUpload(file, path, metadata, key));
            });

            await Promise.all(uploadPromises);

            toast({ title: "Station Created", description: `Station "${values.name}" and its documents are being processed.` });
            setIsStationProfileOpen(false);
            stationForm.reset();
            setAgreementFile(null);
            setComplianceFiles({});

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Creation Failed', description: 'Could not create the new station.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (usersLoading || stationsLoading) {
        return <AdminDashboardSkeleton />;
    }

  return (
    <>
        <Dialog open={isUserDetailOpen} onOpenChange={setIsUserDetailOpen}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>User Account Management</DialogTitle>
                    <DialogDescription>
                        View user details and perform administrative actions.
                    </DialogDescription>
                </DialogHeader>
                {selectedUser && (
                    <Tabs defaultValue="profile">
                        <div className="grid md:grid-cols-2 gap-8 py-6">
                            {/* Left Column: User Profile */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src={selectedUser.photoURL || undefined} alt={selectedUser.name} />
                                        <AvatarFallback className="text-3xl">{selectedUser.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-lg">{selectedUser.name}</h4>
                                        <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                    </div>
                                </div>
                                
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="profile">Profile</TabsTrigger>
                                    <TabsTrigger value="invoices">Invoice History</TabsTrigger>
                                </TabsList>
                                <TabsContent value="profile">
                                    <div className="space-y-4 text-sm">
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base">User Profile</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-1 text-sm pt-0">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Client ID:</span>
                                                    <span className="font-medium">{selectedUser.clientId}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Business Name:</span>
                                                    <span className="font-medium">{selectedUser.businessName}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Contact Person:</span>
                                                    <span className="font-medium">{selectedUser.name}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Plan:</span>
                                                    <span className="font-medium">{selectedUser.plan?.name || 'N/A'}</span>
                                                </div>
                                                 <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Role:</span>
                                                    <span className="font-medium">{selectedUser.role}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Assigned Station:</span>
                                                    <span className="font-medium">{waterStations?.find(ws => ws.id === selectedUser.assignedWaterStationId)?.name || 'Not Assigned'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Last Login:</span>
                                                    <span className="font-medium">{selectedUser.lastLogin ? format(new Date(selectedUser.lastLogin), 'PPp') : 'N/A'}</span>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base">Consumption Details</CardTitle>
                                            </CardHeader>
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
                                        </Card>
                                    </div>
                                </TabsContent>
                                <TabsContent value="invoices">
                                    <ScrollArea className="h-72">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Invoice</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {generatedInvoices.map((invoice) => (
                                                <TableRow key={invoice.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{invoice.id}</div>
                                                        <div className="text-xs text-muted-foreground">{format(new Date(invoice.date), 'PP')}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={invoice.status === 'Paid' ? 'default' : (invoice.status === 'Upcoming' ? 'secondary' : 'outline')}
                                                            className={invoice.status === 'Paid' ? 'bg-green-100 text-green-800' : invoice.status === 'Upcoming' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                        >{invoice.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">₱{invoice.amount.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                            {generatedInvoices.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center">No invoices found.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                    </ScrollArea>
                                </TabsContent>
                            </div>

                            {/* Right Column: Actions */}
                            <div className="space-y-4">
                                {selectedUserPlanImage && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-lg text-center">{selectedUser.clientType} Plan</h4>
                                    <div className="relative w-full h-32 rounded-lg overflow-hidden">
                                        <Image
                                            src={selectedUserPlanImage.imageUrl}
                                            alt={selectedUser.clientType || ''}
                                            fill
                                            className="object-contain"
                                            data-ai-hint={selectedUserPlanImage.imageHint}
                                        />
                                    </div>
                                  </div>
                                )}
                                <h4 className="font-semibold text-lg border-b pb-2">Actions</h4>
                                <div className="flex flex-col gap-2">
                                    <Button onClick={() => { setUserForHistory(selectedUser); setIsDeliveryHistoryOpen(true); }} variant="outline">
                                        <History className="mr-2 h-4 w-4" />
                                        Delivery History
                                    </Button>
                                    <Button onClick={() => { setIsAssignStationOpen(true); }} disabled={!isAdmin}>
                                        <Building className="mr-2 h-4 w-4" />
                                        Assign Station
                                    </Button>
                                    <Button variant="outline" onClick={() => { setUserForContract(selectedUser); setIsUploadContractOpen(true); }} disabled={!isAdmin}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Attach Contract
                                    </Button>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline">
                                                <Repeat className="mr-2 h-4 w-4" />
                                                Adjust Consumption
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { setAdjustmentType('add'); setIsAdjustConsumptionOpen(true); }}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Add Liters
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => { setAdjustmentType('deduct'); setIsAdjustConsumptionOpen(true); }}>
                                                 <MinusCircle className="mr-2 h-4 w-4" />
                                                Deduct Liters
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    {selectedUser.currentContractUrl && (
                                        <Button variant="link" asChild>
                                            <a href={selectedUser.currentContractUrl} target="_blank" rel="noopener noreferrer">View Contract</a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Tabs>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUserDetailOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
         <Dialog open={isDeliveryHistoryOpen} onOpenChange={setIsDeliveryHistoryOpen}>
            <DialogContent className="sm:max-w-4xl">
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
                 <div className="py-4 max-h-[60vh] overflow-y-auto">
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
                </div>
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


        <Dialog open={isAdjustConsumptionOpen} onOpenChange={setIsAdjustConsumptionOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{adjustmentType === 'deduct' ? 'Deduct' : 'Add'} Liters</DialogTitle>
                    <DialogDescription>
                        Manually {adjustmentType} water liters for {selectedUser?.name}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...adjustConsumptionForm}>
                    <form onSubmit={adjustConsumptionForm.handleSubmit(handleAdjustConsumption)} className="space-y-4 py-4">
                         <FormField
                            control={adjustConsumptionForm.control}
                            name="containers"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Containers</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 5" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        1 container = 19.5 liters. This will automatically calculate the liters below.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={adjustConsumptionForm.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Liters to {adjustmentType}</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                            <Button type="submit">{adjustmentType === 'deduct' ? 'Deduct' : 'Add'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
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
                        {pendingRefillRequests.length > 0 && (
                            <Badge className="ml-2 h-5 w-5 justify-center p-0">{pendingRefillRequests.length}</Badge>
                        )}
                    </CardTitle>
                    <CardDescription>Manage all user accounts and their details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     {pendingRefillRequests.length > 0 && (
                        <Card className="bg-amber-50 border-amber-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base"><BellRing className="h-5 w-5 text-amber-600"/> Pending Refill Requests</CardTitle>
                                <CardDescription>Users who have requested a one-time refill.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Client ID</TableHead>
                                            <TableHead>Business Name</TableHead>
                                            <TableHead>Requested</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {refillRequestsLoading ? (
                                            <TableRow><TableCell colSpan={4} className="text-center">Loading requests...</TableCell></TableRow>
                                        ) : pendingRefillRequests.map((request) => (
                                            <TableRow key={request.id}>
                                                <TableCell>{request.clientId}</TableCell>
                                                <TableCell>{request.businessName}</TableCell>
                                                <TableCell>
                                                    {request.requestedAt ? formatDistanceToNow(new Date((request.requestedAt as any).seconds * 1000), { addSuffix: true }) : 'Just now'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" onClick={() => handleCompleteRefillRequest(request.id)}>
                                                        Mark as Complete
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
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
                                                {autoRefillEnabled ? (
                                                    <Badge variant="default" className="bg-green-100 text-green-800">Enabled</Badge>
                                                ) : (
                                                    <Badge variant="destructive">Disabled</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{schedule}</TableCell>
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
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Partnership Requirements</DialogTitle>
                    <DialogDescription>
                        {stationToUpdate ? `Manage compliance for ${stationToUpdate.name}.` : "Submit documents to become a verified Refill Partner."}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1">
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
                                        <FormControl><Input placeholder="e.g. 123 Business Rd, Metro City" {...field} disabled={!!stationToUpdate || isSubmitting}/></FormControl>
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
                            <h3 className="font-semibold text-base mb-1">Compliance Documents</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Submit your latest permits. All documents are required for full partner verification.
                            </p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Document Type</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {complianceFields.map(field => {
                                        const report = complianceReports?.find(r => r.name === field.label);
                                        const stagedFile = complianceFiles[field.key];
                                        const progress = uploadingFiles[field.key] || 0;
                                        const isUploadingFile = progress > 0 && progress < 100;
                                        
                                        const onUpload = async (fileToUpload: File) => {
                                            if (!stationToUpdate || !storage) return;
                                            const docKey = field.key;
                                            const path = `stations/${stationToUpdate.id}/compliance/${docKey}-${fileToUpload.name}`;
                                            const metadata = { firestorePath: `waterStations/${stationToUpdate.id}/complianceReports/${docKey}`, firestoreField: 'reportUrl' };
                                            try {
                                                await handleFileUpload(fileToUpload, path, metadata, docKey);
                                                toast({ title: 'Document Uploaded', description: `${field.label} is being processed.` });
                                                setComplianceRefresher(c => c + 1);
                                                handleComplianceFileSelect(docKey, null);
                                            } catch (err) {
                                                console.error(err);
                                                toast({variant: 'destructive', title: 'Upload Failed'});
                                            }
                                        };

                                        return (
                                        <TableRow key={field.key}>
                                            <TableCell className="font-medium">{field.label}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isUploadingFile ? (
                                                      <Progress value={progress} className="w-24 h-2" />
                                                    ) : report ? (
                                                        <Button asChild variant="outline" size="sm">
                                                            <a href={report.reportUrl} target="_blank" rel="noopener noreferrer">
                                                                <Eye className="mr-2 h-4 w-4" /> View
                                                            </a>
                                                        </Button>
                                                    ) : stagedFile ? (
                                                        <>
                                                            <span className="text-sm text-muted-foreground truncate max-w-[120px]">{stagedFile.name}</span>
                                                            <Button size="sm" disabled={isSubmitting || !stationToUpdate} onClick={() => onUpload(stagedFile)}>
                                                                <Upload className="mr-2 h-4 w-4" /> Upload
                                                            </Button>
                                                            <Button size="icon" variant="ghost" onClick={() => handleComplianceFileSelect(field.key, null)} disabled={isSubmitting}>
                                                                <X className="h-4 w-4"/>
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button asChild type="button" variant="outline" size="sm" disabled={!isAdmin || isSubmitting}>
                                                            <Label className={cn("flex items-center", (isAdmin && !isSubmitting) ? "cursor-pointer" : "cursor-not-allowed")}>
                                                                <Paperclip className="mr-2 h-4 w-4" /> Attach
                                                                <Input type="file" accept="application/pdf,image/*" className="hidden" disabled={!isAdmin || isSubmitting} onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleComplianceFileSelect(field.key, file);
                                                                }} />
                                                            </Label>
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )})}
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
                                        const path = `stations/${stationToUpdate.id}/agreement/${agreementFile.name}`;
                                        try {
                                            const metadata = { firestorePath: `waterStations/${stationToUpdate.id}`, firestoreField: 'partnershipAgreementUrl' };
                                            await handleFileUpload(agreementFile, path, metadata, docKey);
                                            toast({ title: 'Agreement Uploaded', description: 'The partnership agreement is being processed.' });
                                            setAgreementFile(null);
                                        } catch (err) {
                                            console.error(err);
                                            toast({variant: 'destructive', title: 'Upload Failed'});
                                        }
                                    };
                                    
                                    const progress = uploadingFiles['agreement'];
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
    </>
  );
}

export default function AdminPage() {
    const { user: authUser, isUserLoading } = useUser();
    const [isAdmin, setIsAdmin] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    
    React.useEffect(() => {
        if (isUserLoading) return;
        if (!authUser) {
            setIsLoading(false);
            return;
        };

        if (authUser.email === 'admin@riverph.com') {
            setIsAdmin(true);
        }
        setIsLoading(false);
    }, [authUser, isUserLoading]);
    
    const [greeting, setGreeting] = React.useState('');
    React.useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    if (isLoading || isUserLoading) {
      return (
        <div className="flex flex-col gap-6 font-sans">
            <AdminDashboardSkeleton />
        </div>
      );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
                <ShieldX className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-3xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-6 font-sans">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{greeting}, Admin!</h1>
            </div>
            <AdminDashboard isAdmin={isAdmin} />
        </div>
    )
}
