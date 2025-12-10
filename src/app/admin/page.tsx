
'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCog, UserPlus, KeyRound, Trash2, MoreHorizontal, Users, Building, LogIn, Eye, EyeOff, FileText, Users2, UserCheck, Paperclip, Upload, MinusCircle, Info, Download, Calendar as CalendarIcon, PlusCircle, FileHeart, ShieldX, Receipt, History, Truck, PackageCheck, Package, LogOut, Edit, Shield, Wrench, BarChart, Save, StickyNote, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { format, differenceInMonths, addMonths, isWithinInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AppUser, Delivery, WaterStation, Payment, ComplianceReport, SanitationVisit, Schedule, ConsumptionHistory } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, updateDoc, collectionGroup, getDoc, getDocs, query, FieldValue, increment } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { createUserWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { clientTypes } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

const newStationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    location: z.string().min(1, 'Location is required'),
});

type NewStationFormValues = z.infer<typeof newStationSchema>;

const newSanitationVisitSchema = z.object({
    id: z.string().min(1, "Visit ID is required"),
    scheduledDate: z.date({ required_error: 'Date is required.'}),
    status: z.enum(['Completed', 'Scheduled', 'Cancelled']),
    assignedTo: z.string().min(1, "Technician name is required"),
    reportUrl: z.any().optional(),
});
type NewSanitationVisitFormValues = z.infer<typeof newSanitationVisitSchema>;

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
    proofOfDeliveryUrl: z.any().optional(),
    adminNotes: z.string().optional(),
});
type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;


const containerToLiter = (containers: number) => (containers || 0) * 19.5;

function AdminDashboard({ isAdmin }: { isAdmin: boolean }) {
    const { toast } = useToast();
    const auth = useAuth();
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const usersQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'users') : null, [firestore, isAdmin]);
    const { data: appUsers, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);

    const waterStationsQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'waterStations') : null, [firestore, isAdmin]);
    const { data: waterStations, isLoading: stationsLoading } = useCollection<WaterStation>(waterStationsQuery);
    
    const [isUserDetailOpen, setIsUserDetailOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<AppUser | null>(null);
    const [isDeliveryHistoryOpen, setIsDeliveryHistoryOpen] = React.useState(false);
    const [userForHistory, setUserForHistory] = React.useState<AppUser | null>(null);
    const [activeTab, setActiveTab] = React.useState('user-management');
    
    const [stationToUpdate, setStationToUpdate] = React.useState<WaterStation | null>(null);
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

    const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
    const [editableFormData, setEditableFormData] = React.useState<Partial<AppUser>>({});
    const [isEditingDetails, setIsEditingDetails] = React.useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
    const [showNewPassword, setShowNewPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [currentPassword, setCurrentPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [isCreateSanitationVisitOpen, setIsCreateSanitationVisitOpen] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState<Record<string, number>>({});
    const [complianceRefresher, setComplianceRefresher] = React.useState(0);
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = React.useState(false);
    const [userForSchedule, setUserForSchedule] = React.useState<AppUser | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);

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
            : new Date(createdAt as string);
        
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
      const handleUserSearch = (event: Event) => {
        const customEvent = event as CustomEvent<string>;
        const searchTerm = customEvent.detail.toLowerCase();
        
        if (!appUsers) return;

        const foundUser = appUsers.find(user => 
            user.clientId?.toLowerCase() === searchTerm || (user.name && user.name.toLowerCase().includes(searchTerm))
        );
        
        if (foundUser) {
          setSelectedUser(foundUser);
          setIsUserDetailOpen(true);
        } else {
            toast({
                variant: "destructive",
                title: "User not found",
                description: `No user found with ID or name: ${customEvent.detail}`,
            });
        }
      };

      const openAccountDialog = () => {
        const adminUser = appUsers?.find(u => u.id === authUser?.uid);
        if (adminUser) {
            setEditableFormData(adminUser);
        }
        setIsAccountDialogOpen(true)
      };
      
      window.addEventListener('admin-user-search-term', handleUserSearch);
      window.addEventListener('admin-open-my-account', openAccountDialog);
  
      return () => {
        window.removeEventListener('admin-user-search-term', handleUserSearch);
        window.removeEventListener('admin-open-my-account', openAccountDialog);
      };
    }, [appUsers, toast, authUser]);

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

    const sanitationVisitForm = useForm<NewSanitationVisitFormValues>({
        resolver: zodResolver(newSanitationVisitSchema),
        defaultValues: { id: '', status: 'Scheduled', assignedTo: '' },
    });

    React.useEffect(() => {
        if (isStationProfileOpen && stationToUpdate) {
            stationForm.reset({ name: stationToUpdate.name, location: stationToUpdate.location });
        } else {
            stationForm.reset({ name: '', location: '' });
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
        if (!firestore) return;
    
        if (stationToUpdate) {
            const stationRef = doc(firestore, 'waterStations', stationToUpdate.id);
            await updateDocumentNonBlocking(stationRef, values);
            toast({ title: 'Station Updated', description: `Station "${values.name}" has been updated.` });
        } else {
            try {
                const stationsRef = collection(firestore, 'waterStations');
                const newDocRef = await addDocumentNonBlocking(stationsRef, values);
                if (newDocRef) {
                    const newStationData = { ...values, id: newDocRef.id };
                    setStationToUpdate(newStationData); 
                    toast({ title: 'Station Created', description: `Station "${values.name}" has been created. Please attach compliance documents.` });
                }
            } catch (error) {
                console.error("Error creating station: ", error);
                toast({ variant: 'destructive', title: 'Creation Failed', description: 'Could not create the new station.' });
            }
        }
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

    const handleAttachPermit = (permitType: string, file: File, label: string) => {
        if (!stationToUpdate || !firestore) return;
        setIsUploading(true);
        const storage = getStorage();
        const filePath = `stations/${stationToUpdate.id}/compliance/${permitType}-${file.name}`;
        const storageRef = ref(storage, filePath);
    
        const uploadTask = uploadBytesResumable(storageRef, file);
    
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(prev => ({ ...prev, [permitType]: progress }));
            },
            (error) => {
                console.error("Upload error:", error);
                toast({ variant: 'destructive', title: 'Attach Failed', description: 'Could not attach the compliance document. Please try again.' });
                setUploadProgress(prev => ({ ...prev, [permitType]: 0 }));
                setIsUploading(false);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
    
                const reportsRef = collection(firestore, 'waterStations', stationToUpdate.id, 'complianceReports');
                const newReport: Omit<ComplianceReport, 'id'> = {
                    name: label,
                    date: new Date().toISOString(),
                    status: 'Compliant',
                    reportUrl: downloadURL,
                };
                await addDocumentNonBlocking(reportsRef, newReport);
    
                toast({ title: 'Compliance Document Attached', description: `${label} has been successfully attached.` });
                setUploadProgress(prev => ({ ...prev, [permitType]: 0 }));
                setComplianceRefresher(c => c + 1); // Trigger a refresh
                setIsUploading(false);
            }
        );
    };

    const handleCreateSanitationVisit = async (values: NewSanitationVisitFormValues) => {
        if (!stationToUpdate || !firestore) return;
        setIsUploading(true);
        let reportUrl = '';
        if (values.reportUrl && values.reportUrl.length > 0) {
            const file = values.reportUrl[0];
            const storage = getStorage();
            const filePath = `stations/${stationToUpdate.id}/sanitation/${values.id}/${file.name}`;
            const storageRef = ref(storage, filePath);
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            const uploadKey = `sanitation-${values.id}`;
            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(prev => ({ ...prev, [uploadKey]: progress }));
                    },
                    (error) => {
                        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload sanitation report.' });
                        setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
                        setIsUploading(false);
                        reject(error);
                    },
                    async () => {
                        reportUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
                        resolve();
                    }
                );
            });
        }
    
        const visitDocRef = doc(firestore, 'waterStations', stationToUpdate.id, 'sanitationVisits', values.id);
        
        const newVisitData: SanitationVisit = {
            id: values.id,
            scheduledDate: values.scheduledDate.toISOString(),
            status: values.status,
            assignedTo: values.assignedTo,
            reportUrl: reportUrl,
        };

        setDocumentNonBlocking(visitDocRef, newVisitData);

        toast({ title: "Sanitation Visit Created", description: `A new sanitation visit has been scheduled.` });
        sanitationVisitForm.reset();
        setIsCreateSanitationVisitOpen(false);
        setIsUploading(false);
    };

    const handleUploadProof = () => {
        if (!deliveryToUpdate || !userForHistory || !firestore || !deliveryProofFile) {
            toast({ variant: 'destructive', title: 'Attach Failed', description: 'No file selected or context missing.' });
            return;
        }
        setIsUploading(true);
        const storage = getStorage();
        const filePath = `users/${userForHistory.id}/deliveries/${deliveryToUpdate.id}/${deliveryProofFile.name}`;
        const storageRef = ref(storage, filePath);

        const uploadKey = `proof-${deliveryToUpdate.id}`;
        const uploadTask = uploadBytesResumable(storageRef, deliveryProofFile);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(prev => ({ ...prev, [uploadKey]: progress }));
            },
            (error) => {
                console.error("Upload error:", error);
                toast({ variant: 'destructive', title: 'Attach Failed', description: 'Could not attach proof. Please try again.' });
                setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
                setIsUploading(false);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const deliveryRef = doc(firestore, 'users', userForHistory.id, 'deliveries', deliveryToUpdate.id);
                updateDocumentNonBlocking(deliveryRef, { proofOfDeliveryUrl: downloadURL });
                
                toast({ title: "Proof Attached", description: `Proof for delivery ${deliveryToUpdate.id} has been attached.` });
                setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
                setDeliveryToUpdate(null);
                setDeliveryProofFile(null);
                setIsUploading(false);
            }
        );
    };

    const handleUploadContract = async () => {
        if (!userForContract || !contractFile || !firestore) {
            toast({ variant: 'destructive', title: 'Attach Failed', description: 'No file selected or user context missing.' });
            return;
        };
        setIsUploading(true);
        const storage = getStorage();
        const filePath = `userContracts/${userForContract.id}/latest_plan_contract.pdf`;
        const storageRef = ref(storage, filePath);
    
        const uploadKey = `contract-${userForContract.id}`;
        const uploadTask = uploadBytesResumable(storageRef, contractFile);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(prev => ({...prev, [uploadKey]: progress}));
            },
            (error) => {
                 console.error("Upload error:", error);
                 toast({ variant: 'destructive', title: 'Attach Failed', description: 'Could not attach contract. Please try again.' });
                 setUploadProgress(prev => ({...prev, [uploadKey]: 0}));
                 setIsUploading(false);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
                const userRef = doc(firestore, 'users', userForContract.id);
                updateDocumentNonBlocking(userRef, { 
                    currentContractUrl: downloadURL,
                    contractUploadedDate: serverTimestamp(),
                    contractStatus: "Active Contract",
                });
    
                if (selectedUser && selectedUser.id === userForContract.id) {
                     setSelectedUser(prev => prev ? { ...prev, currentContractUrl: downloadURL, contractStatus: 'Active Contract' } : null);
                }
                
                toast({ title: "Contract Attached", description: `A contract has been attached to ${userForContract.name}.` });
                setUploadProgress(prev => ({...prev, [uploadKey]: 0}));
                setIsUploadContractOpen(false);
                setUserForContract(null);
                setContractFile(null);
                setIsUploading(false);
            }
        );
    };

    const handleCreateDelivery = async (values: DeliveryFormValues) => {
        if (!userForHistory || !firestore) return;
    
        setIsUploading(true);
        let proofOfDeliveryUrl = '';
        if (values.proofOfDeliveryUrl && values.proofOfDeliveryUrl.length > 0) {
            const file = values.proofOfDeliveryUrl[0];
            const storage = getStorage();
            const filePath = `users/${userForHistory.id}/deliveries/${values.trackingNumber}/${file.name}`;
            const storageRef = ref(storage, filePath);
            const uploadTask = uploadBytesResumable(storageRef, file);

            const uploadKey = `delivery-${values.trackingNumber}`;
            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(prev => ({ ...prev, [uploadKey]: progress }));
                    }, 
                    (error) => {
                        setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
                        setIsUploading(false);
                        reject(error);
                    },
                    async () => {
                        proofOfDeliveryUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
                        resolve();
                    }
                );
            });
        }
    
        const newDeliveryDocRef = doc(firestore, 'users', userForHistory.id, 'deliveries', values.trackingNumber);
        
        const newDeliveryData: Delivery = {
            id: values.trackingNumber,
            userId: userForHistory.id,
            date: values.date.toISOString(),
            volumeContainers: values.volumeContainers,
            status: values.status,
            proofOfDeliveryUrl: proofOfDeliveryUrl,
            adminNotes: values.adminNotes,
        };

        await setDocumentNonBlocking(newDeliveryDocRef, newDeliveryData);

        if (values.status === 'Delivered') {
            const litersToDeduct = values.volumeContainers * 19.5;
            const userRef = doc(firestore, 'users', userForHistory.id);
            updateDocumentNonBlocking(userRef, { totalConsumptionLiters: increment(-litersToDeduct) });
        }


        toast({ title: "Delivery Record Created", description: `A manual delivery has been added for ${userForHistory.name}.` });
        deliveryForm.reset();
        setIsCreateDeliveryOpen(false);
        setIsUploading(false);
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
    
        // Calculate consumption adjustment if status or volume changed
        const oldLiters = (deliveryToEdit.status === 'Delivered') ? containerToLiter(deliveryToEdit.volumeContainers) : 0;
        const newLiters = (values.status === 'Delivered') ? containerToLiter(values.volumeContainers) : 0;
        const adjustment = oldLiters - newLiters; // Note: we reverse old and new to get the correct increment/decrement
    
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
    
        // If the delivery was already completed, we need to add the liters back.
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

    const handleLogout = () => {
        if (!auth) return;
        signOut(auth).then(() => {
          router.push('/login');
        })
    }

    const handleAccountInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditableFormData({
            ...editableFormData,
            [e.target.name]: e.target.value
        });
    };
    
    const handleSaveChanges = () => {
        if (!authUser || !firestore) return;
        const adminUserDocRef = doc(firestore, "users", authUser.uid)
        if (adminUserDocRef && editableFormData) {
            updateDocumentNonBlocking(adminUserDocRef, editableFormData);
            setIsEditingDetails(false);
            toast({
                title: "Changes Saved",
                description: "Your account details have been successfully updated.",
            });
        }
    };

    const handleCancelEdit = () => {
        const adminUser = appUsers?.find(u => u.id === authUser?.uid);
        if (adminUser) {
            setEditableFormData(adminUser);
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

    const handleProfilePhotoUpload = async (file: File) => {
        if (!authUser || !firestore) return;
        setIsUploading(true);
        const storage = getStorage();
        const filePath = `users/${authUser.uid}/profile/${file.name}`;
        const storageRef = ref(storage, filePath);
    
        const uploadKey = `profile-${authUser.uid}`;
        const uploadTask = uploadBytesResumable(storageRef, file);
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(prev => ({...prev, [uploadKey]: progress}));
            },
            (error) => {
              toast({ variant: 'destructive', title: 'Attach Failed', description: 'Could not attach your photo. Please try again.' });
              setUploadProgress(prev => ({...prev, [uploadKey]: 0}));
              setIsUploading(false);
            },
            async () => {
                const downloadURL = await getDownloadURL(storageRef);
                const userRef = doc(firestore, 'users', authUser.uid);
                updateDocumentNonBlocking(userRef, { photoURL: downloadURL });
                toast({ title: 'Profile Photo Updated', description: 'Your new photo has been saved.' });
                setUploadProgress(prev => ({...prev, [uploadKey]: 0}));
                setIsUploading(false);
            }
        );
    };

    React.useEffect(() => {
        if(selectedUser) {
            const deliveriesForUser = collection(firestore, 'users', selectedUser.id, 'deliveries');
            // This will trigger a fetch, handled by useCollection
        }
    }, [selectedUser, firestore]);

    const watchedContainers = adjustConsumptionForm.watch('containers');
    React.useEffect(() => {
        const liters = (watchedContainers || 0) * 19.5;
        adjustConsumptionForm.setValue('amount', parseFloat(liters.toFixed(2)), { shouldValidate: true });
    }, [watchedContainers, adjustConsumptionForm]);

    const watchedDeliveryContainers = deliveryForm.watch('volumeContainers');
    const watchedEditDeliveryContainers = editDeliveryForm.watch('volumeContainers');

    
    const filteredUsers = appUsers?.filter(user => user.role !== 'Admin') || [];

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

    const complianceFields: { key: string, label: string }[] = [
        { key: 'dohPermitUrl', label: 'DOH Permit' },
        { key: 'businessPermitUrl', label: 'Business Permit' },
        { key: 'bacteriologicalTestUrl', label: 'Bacteriological' },
        { key: 'physicalChemicalTestUrl', label: 'Physical-Chemical' },
        { key: 'annualMonitoringUrl', label: 'Annual Monitoring' },
    ];
      
    const selectedUserPlanImage = React.useMemo(() => {
        if (!selectedUser?.clientType) return null;
        const clientTypeDetails = clientTypes.find(ct => ct.name === selectedUser.clientType);
        if (!clientTypeDetails) return null;
        return PlaceHolderImages.find(p => p.id === clientTypeDetails.imageId);
    }, [selectedUser]);


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
                                        <AvatarImage src={selectedUser.photoURL} alt={selectedUser.name} />
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
                                    <Button onClick={()={() => { setIsAssignStationOpen(true); }} disabled={!isAdmin}>
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
                                    const isUploadingProof = uploadProgress[`proof-${delivery.id}`] > 0 && uploadProgress[`proof-${delivery.id}`] < 100;
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

        <Dialog open={isCreateDeliveryOpen} onOpenChange={isCreateDeliveryOpen}>
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
                                        <Input placeholder="e.g., DEL-00123" {...field} disabled={isUploading} />
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
                                                    disabled={isUploading}
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
                                        <Input type="number" placeholder="e.g., 50" {...field} disabled={isUploading} />
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isUploading}>
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
                            name="proofOfDeliveryUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proof of Delivery (Optional)</FormLabel>
                                    <FormControl>
                                       <Input type="file" onChange={(e) => field.onChange(e.target.files)} disabled={isUploading} />
                                    </FormControl>
                                    {uploadProgress[`delivery-${deliveryForm.watch('trackingNumber')}`] > 0 && (
                                        <Progress value={uploadProgress[`delivery-${deliveryForm.watch('trackingNumber')}`]} className="mt-2" />
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
                                        <Textarea placeholder="Add any specific notes for this delivery..." {...field} disabled={isUploading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary" disabled={isUploading}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isUploading}>
                                {isUploading ? "Creating..." : "Create Delivery"}
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
        
        <Dialog open={!!deliveryToUpdate} onOpenChange={(open) => { if (!open && !isUploading) { setDeliveryToUpdate(null); setDeliveryProofFile(null); } }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Attach Proof of Delivery</DialogTitle>
                    <DialogDescription>Attach the proof of delivery for delivery ID: {deliveryToUpdate?.id}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Input type="file" onChange={(e) => setDeliveryProofFile(e.target.files?.[0] || null)} disabled={isUploading} />
                    {deliveryToUpdate && uploadProgress[`proof-${deliveryToUpdate.id}`] > 0 && (
                        <Progress value={uploadProgress[`proof-${deliveryToUpdate.id}`]} />
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={()={() => { setDeliveryToUpdate(null); setDeliveryProofFile(null); }} disabled={isUploading}>Cancel</Button>
                    <Button onClick={handleUploadProof} disabled={!deliveryProofFile || isUploading}>
                        {isUploading ? "Uploading..." : "Attach"}
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
                    <Input type="file" onChange={(e) => setContractFile(e.target.files?.[0] || null)} disabled={isUploading} />
                     {userForContract && uploadProgress[`contract-${userForContract.id}`] > 0 && (
                        <Progress value={uploadProgress[`contract-${userForContract.id}`]} />
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUploadContractOpen(false)} disabled={isUploading}>Cancel</Button>
                    <Button onClick={handleUploadContract} disabled={!contractFile || isUploading}>
                        {isUploading ? 'Uploading...' : 'Attach'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>My Account</DialogTitle>
                <DialogDescription>
                Manage your account details.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] w-full">
                <div className="pr-6 py-4">
                    {editableFormData ? (
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center gap-4 mb-4">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src={editableFormData.photoURL} alt={editableFormData.name} />
                                        <AvatarFallback className="text-3xl">{editableFormData.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <h4 className="font-semibold">Profile Photo</h4>
                                        <p className="text-sm text-muted-foreground">Update your photo.</p>
                                        <div className="flex items-center gap-2">
                                            <Button asChild variant="outline" size="sm" disabled={isUploading}>
                                                <Label>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Attach Photo
                                                    <Input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleProfilePhotoUpload(e.target.files[0])}/>
                                                </Label>
                                            </Button>
                                            {authUser && uploadProgress[`profile-${authUser.uid}`] > 0 && (
                                                <Progress value={uploadProgress[`profile-${authUser.uid}`]} className="w-24 h-2" />
                                            )}
                                        </div>
                                    </div>
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
                                        <Input id="fullName" name="name" value={editableFormData.name || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails} />
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                        <Label htmlFor="email" className="text-right">Login Email</Label>
                                        <Input id="email" name="email" type="email" value={editableFormData.email || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails} />
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
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button onClick={() => setIsPasswordDialogOpen(true)}><KeyRound className="mr-2 h-4 w-4" />Update Password</Button>
                                </div>
                            </div>
                        </div>
                    ) : <p>No account information available.</p>}
                </div>
            </ScrollArea>
            <DialogFooter className="pr-6 pt-4">
                <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Logout</Button>
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
                        <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={()={() => setShowNewPassword(!showNewPassword)}>
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


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="user-management">
                    <CardHeader>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="user-management"><Users className="mr-2 h-4 w-4"/>User Management</TabsTrigger>
                            <TabsTrigger value="water-stations"><Building className="mr-2 h-4 w-4" />Water Stations</TabsTrigger>
                        </TabsList>
                    </CardHeader>
                    <CardContent>
                        <TabsContent value="user-management">
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
                                        {filteredUsers.map((user) => {
                                            const schedule = user.customPlanDetails?.deliveryDay && user.customPlanDetails?.deliveryTime
                                                ? `${user.customPlanDetails.deliveryDay}, ${user.customPlanDetails.deliveryTime}`
                                                : 'N/A';
                                            const autoRefillEnabled = user.customPlanDetails?.autoRefillEnabled ?? true;
                                            return (
                                            <TableRow key={user.id} onClick={()={() => { setSelectedUser(user); setIsUserDetailOpen(true);}} className="cursor-pointer">
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
                                        {filteredUsers.length === 0 && !usersLoading && (
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
                        </TabsContent>
                        
                        <TabsContent value="water-stations">
                            <div className="flex justify-end mb-4">
                               <Button onClick={()={() => { setStationToUpdate(null); setIsStationProfileOpen(true); }} disabled={!isAdmin}><PlusCircle className="mr-2 h-4 w-4" />Create Station</Button>
                            </div>
                            <div className="overflow-x-auto">
                               <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Station ID</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Permits</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stationsLoading && (
                                            <TableRow><TableCell colSpan={5} className="text-center">Loading stations...</TableCell></TableRow>
                                        )}
                                        {!stationsLoading && waterStations?.map((station) => (
                                            <TableRow key={station.id}>
                                                <TableCell>{station.id}</TableCell>
                                                <TableCell>{station.name}</TableCell>
                                                <TableCell>{station.location}</TableCell>
                                                <TableCell>
                                                    <Badge variant={'outline'}>
                                                       View
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="outline" size="sm" onClick={()={() => { setStationToUpdate(station); setIsStationProfileOpen(true); }}>
                                                        <UserCog className="mr-2 h-4 w-4"/>
                                                        Manage
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        </div>


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

        <Dialog open={isCreateSanitationVisitOpen} onOpenChange={setIsCreateSanitationVisitOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Schedule Sanitation Visit</DialogTitle>
                    <DialogDescription>Schedule a new sanitation visit for {stationToUpdate?.name}.</DialogDescription>
                </DialogHeader>
                <Form {...sanitationVisitForm}>
                    <form onSubmit={sanitationVisitForm.handleSubmit(handleCreateSanitationVisit)} className="space-y-4 py-4">
                        <FormField control={sanitationVisitForm.control} name="id" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Visit ID</FormLabel>
                                <FormControl><Input placeholder="e.g., SV-001" {...field} disabled={isUploading}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={sanitationVisitForm.control} name="scheduledDate" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Scheduled Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")} disabled={isUploading}>
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
                                <FormLabel>Assigned Technician</FormLabel>
                                <FormControl><Input placeholder="e.g., John Doe" {...field} disabled={isUploading}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={sanitationVisitForm.control} name="status" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isUploading}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={sanitationVisitForm.control} name="reportUrl" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sanitation Report (Optional)</FormLabel>
                                <FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files)} disabled={isUploading}/></FormControl>
                                {uploadProgress[`sanitation-${sanitationVisitForm.watch('id')}`] > 0 && (
                                    <Progress value={uploadProgress[`sanitation-${sanitationVisitForm.watch('id')}`]} className="mt-2" />
                                )}
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary" disabled={isUploading}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isUploading}>{isUploading ? 'Creating...' : 'Create Visit'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
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
                                        <FormControl><Input placeholder="e.g. Aqua Pure Downtown" {...field} disabled={!!stationToUpdate}/></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={stationForm.control} name="location" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Location</FormLabel>
                                        <FormControl><Input placeholder="e.g. 123 Business Rd, Metro City" {...field} disabled={!!stationToUpdate}/></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                {!stationToUpdate && (
                                    <Button onClick={stationForm.handleSubmit(handleSaveStation)} size="sm">Save Station Details</Button>
                                )}
                            </form>
                        </Form>

                        <Separator />
                        
                        <div className={cn(!stationToUpdate && "opacity-50 pointer-events-none")}>
                            <h3 className="font-semibold text-base mb-1">Compliance Documents</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {!stationToUpdate 
                                    ? "Please save the station details first to enable document uploads."
                                    : "Submit your latest water test results. All tests are required for full partner verification."
                                }
                            </p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Test Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {complianceFields.map(field => {
                                        const report = complianceReports?.find(r => r.name === field.label);
                                        const progress = uploadProgress[field.key] || 0;
                                        const isUploadingFile = progress > 0 && progress < 100;

                                        return (
                                        <TableRow key={field.key}>
                                            <TableCell className="font-medium">{field.label}</TableCell>
                                            <TableCell>
                                                 {report ? (
                                                    <Badge variant="default" className="bg-green-100 text-green-800">Compliant</Badge>
                                                ) : isUploadingFile ? (
                                                    <Badge variant="secondary">Uploading...</Badge>
                                                ) : (
                                                    <Badge variant="destructive">Needs Compliance</Badge>
                                                )}
                                            </TableCell>
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
                                                    ) : (
                                                        <Button asChild type="button" variant="outline" size="sm" disabled={!stationToUpdate || !isAdmin || isUploading}>
                                                            <Label className={cn("flex items-center", (stationToUpdate && isAdmin && !isUploading) ? "cursor-pointer" : "cursor-not-allowed")}>
                                                                <Upload className="mr-2 h-4 w-4" /> Attach
                                                                <Input type="file" accept="*/*" className="hidden" disabled={!stationToUpdate || !isAdmin || isUploading} onChange={(e) => e.target.files?.[0] && handleAttachPermit(field.key, e.target.files[0], field.label)} />
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

                         <div className={cn(!stationToUpdate && "opacity-50 pointer-events-none")}>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-semibold text-base">Sanitation Visits</h3>
                                    <p className="text-sm text-muted-foreground">Schedule and manage sanitation visits.</p>
                                </div>
                                <Button size="sm" onClick={() => setIsCreateSanitationVisitOpen(true)} disabled={!stationToUpdate || !isAdmin}>
                                    <Wrench className="mr-2 h-4 w-4" /> Schedule Visit
                                </Button>
                            </div>
                        </div>
                        
                        <div className={cn(!stationToUpdate && "opacity-50 pointer-events-none")}>
                            <h3 className="font-semibold text-base mb-1">Partnership Agreement</h3>
                            <p className="text-sm text-muted-foreground mb-4">Review and accept the partnership agreement.</p>
                            <Button variant="outline" disabled={!isAdmin || !stationToUpdate} onClick={() => toast({ title: "Coming Soon!" })}><FileText className="mr-2 h-4 w-4" /> View &amp; Sign Agreement</Button>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="mt-4 pt-4 border-t">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={() => { setStationToUpdate(null); stationForm.reset();}}>Close</Button>
                    </DialogClose>
                     {stationToUpdate && (
                        <Button onClick={() => { setStationToUpdate(null); stationForm.reset(); setIsStationProfileOpen(false);}} disabled={!isAdmin}>Finish</Button>
                    )}
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
      return <div className="flex items-center justify-center h-full">Loading...</div>;
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

    