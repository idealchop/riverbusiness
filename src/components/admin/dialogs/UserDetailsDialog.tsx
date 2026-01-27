'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCog, UserPlus, KeyRound, Trash2, MoreHorizontal, Users, Building, LogIn, Eye, EyeOff, FileText, Users2, UserCheck, Paperclip, Upload, MinusCircle, Info, Download, Calendar as CalendarIcon, PlusCircle, FileHeart, ShieldX, Receipt, History, Truck, PackageCheck, Package, LogOut, Edit, Shield, Wrench, BarChart, Save, StickyNote, Repeat, BellRing, X, Search, Pencil, CheckCircle, AlertTriangle, MessageSquare, Share2, Copy, RefreshCw, Droplets } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, updateDoc, getDoc, query, increment, addDoc, DocumentReference, arrayUnion, Timestamp, where, deleteField, setDoc, deleteDoc, orderBy, writeBatch } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppUser, Delivery, WaterStation, Payment, SanitationVisit, RefillRequest, RefillRequestStatus, Notification, DispenserReport, Transaction, TopUpRequest, ManualCharge } from '@/lib/types';
import { format, formatDistanceToNow, startOfMonth, endOfMonth, isWithinInterval, subMonths, getYear, getMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;
const toSafeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    if (typeof timestamp === 'object' && 'seconds' in timestamp) return new Date(timestamp.seconds * 1000);
    return null;
};

const deliverySchema = z.object({
    id: z.string().min(1, "Tracking # is required."),
    date: z.date({ required_error: "A date is required." }),
    volumeContainers: z.coerce.number().min(1, "Must be at least 1."),
    status: z.enum(['Delivered', 'In Transit', 'Pending']),
    adminNotes: z.string().optional(),
});
type DeliveryFormValues = z.infer<typeof deliverySchema>;

const manualChargeSchema = z.object({
    description: z.string().min(1, "Description is required."),
    amount: z.coerce.number().min(0.01, "Amount must be positive."),
});
type ManualChargeFormValues = z.infer<typeof manualChargeSchema>;

const topUpSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be positive."),
});
type TopUpFormValues = z.infer<typeof topUpSchema>;

const dispenserReportSchema = z.object({
    dispenserName: z.string().min(1, "Dispenser name is required."),
    dispenserCode: z.string().optional(),
    checklist: z.array(z.object({
        item: z.string(),
        checked: z.boolean(),
        remarks: z.string().optional(),
    })),
});
const sanitationVisitSchema = z.object({
    scheduledDate: z.date({ required_error: "A date is required." }),
    assignedTo: z.string().min(1, "Please assign an officer."),
    status: z.enum(['Completed', 'Scheduled', 'Cancelled']),
    dispenserReports: z.array(dispenserReportSchema),
});
type SanitationVisitFormValues = z.infer<typeof sanitationVisitSchema>;

interface UserDetailsDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    user: AppUser;
    setSelectedUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
    isAdmin: boolean;
    allUsers: AppUser[];
    waterStations: WaterStation[];
}

export function UserDetailsDialog({ isOpen, onOpenChange, user, setSelectedUser, isAdmin, allUsers, waterStations }: UserDetailsDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const storage = useStorage();
    const auth = useAuth();
    
    const [isCreateDeliveryOpen, setIsCreateDeliveryOpen] = useState(false);
    const [deliveryToEdit, setDeliveryToEdit] = useState<Delivery | null>(null);
    const [isManualChargeOpen, setIsManualChargeOpen] = useState(false);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [isCreateSanitationOpen, setIsCreateSanitationOpen] = useState(false);
    const [isSanitationHistoryOpen, setIsSanitationHistoryOpen] = useState(false);
    const [selectedSanitationVisit, setSelectedSanitationVisit] = useState<SanitationVisit | null>(null);
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [isUploadingContract, setIsUploadingContract] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [proofToViewUrl, setProofToViewUrl] = useState<string | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [isUploadingProof, setIsUploadingProof] = useState(false);
    const [deliveriesCurrentPage, setDeliveriesCurrentPage] = useState(1);
    const DELIVERIES_PER_PAGE = 5;
    const [paymentsCurrentPage, setPaymentsCurrentPage] = useState(1);
    const PAYMENTS_PER_PAGE = 5;
    const [isPaymentReviewOpen, setIsPaymentReviewOpen] = useState(false);
    const [paymentToReview, setPaymentToReview] = useState<Payment | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionInput, setShowRejectionInput] = useState(false);

    const userDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', user.id) : null, [firestore, user.id]);
    const userDeliveriesQuery = useMemoFirebase(() => userDocRef ? query(collection(userDocRef, 'deliveries'), orderBy('date', 'desc')) : null, [userDocRef]);
    const { data: userDeliveriesData } = useCollection<Delivery>(userDeliveriesQuery);
    const userPaymentsQuery = useMemoFirebase(() => userDocRef ? query(collection(userDocRef, 'payments'), orderBy('date', 'desc')) : null, [userDocRef]);
    const { data: userPaymentsData } = useCollection<Payment>(userPaymentsQuery);
    const sanitationVisitsQuery = useMemoFirebase(() => userDocRef ? query(collection(userDocRef, 'sanitationVisits'), orderBy('scheduledDate', 'desc')) : null, [userDocRef]);
    const { data: sanitationVisitsData } = useCollection<SanitationVisit>(sanitationVisitsQuery);

    const deliveryForm = useForm<DeliveryFormValues>({ resolver: zodResolver(deliverySchema), defaultValues: { status: 'Pending', volumeContainers: 1 } });
    const manualChargeForm = useForm<ManualChargeFormValues>({ resolver: zodResolver(manualChargeSchema) });
    const topUpForm = useForm<TopUpFormValues>({ resolver: zodResolver(topUpSchema) });
    const sanitationVisitForm = useForm<SanitationVisitFormValues>({ resolver: zodResolver(sanitationVisitSchema), defaultValues: { status: 'Scheduled', dispenserReports: [{ dispenserName: 'Main Unit', checklist: [ { item: 'Cleaned exterior', checked: false, remarks: '' }, { item: 'Flushed lines', checked: false, remarks: '' }, { item: 'Checked for leaks', checked: false, remarks: '' } ] }] } });
    const { fields, append, remove } = useFieldArray({ control: sanitationVisitForm.control, name: "dispenserReports" });

    const totalDeliveryPages = useMemo(() => {
        if (!userDeliveriesData) return 0;
        return Math.ceil(userDeliveriesData.length / DELIVERIES_PER_PAGE);
    }, [userDeliveriesData]);

    const paginatedDeliveries = useMemo(() => {
        if (!userDeliveriesData) return [];
        const startIndex = (deliveriesCurrentPage - 1) * DELIVERIES_PER_PAGE;
        return userDeliveriesData.slice(startIndex, startIndex + DELIVERIES_PER_PAGE);
    }, [userDeliveriesData, deliveriesCurrentPage]);
    
    const currentMonthInvoice = useMemo(() => {
        if (!user || !userDeliveriesData) return null;
    
        const now = new Date();
        const cycleStart = startOfMonth(now);
        const cycleEnd = endOfMonth(now);
        const monthsToBill = 1;
    
        const deliveriesThisCycle = userDeliveriesData.filter(d => {
            const deliveryDate = toSafeDate(d.date);
            return deliveryDate ? isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd }) : false;
        });
        const consumedLitersThisCycle = deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
    
        let estimatedCost = 0;
        const userCreationDate = toSafeDate(user.createdAt);
        const isFirstMonth = userCreationDate ? getYear(userCreationDate) === getYear(now) && getMonth(userCreationDate) === getMonth(now) : false;
    
        if (isFirstMonth && user.customPlanDetails) {
            if (user.customPlanDetails.gallonPaymentType === 'One-Time') estimatedCost += user.customPlanDetails.gallonPrice || 0;
            if (user.customPlanDetails.dispenserPaymentType === 'One-Time') estimatedCost += user.customPlanDetails.dispenserPrice || 0;
        }
    
        let monthlyEquipmentCost = 0;
        if (user.customPlanDetails?.gallonPaymentType === 'Monthly') monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
        if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);
        
        estimatedCost += monthlyEquipmentCost * monthsToBill;
    
        if (user.plan?.isConsumptionBased) {
            estimatedCost += consumedLitersThisCycle * (user.plan.price || 0);
        } else {
            estimatedCost += user.plan?.price || 0;
        }
    
        const pendingChargesTotal = (user.pendingCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
        estimatedCost += pendingChargesTotal;
    
        return {
            id: `INV-EST-${user.id.substring(0, 5)}-${format(now, 'yyyyMM')}`,
            date: new Date().toISOString(),
            description: `Estimated bill for ${format(now, 'MMMM yyyy')}`,
            amount: estimatedCost,
            status: user.accountType === 'Branch' ? 'Covered by Parent Account' : 'Upcoming',
        };
    }, [user, userDeliveriesData]);

    const showCurrentMonthInvoice = useMemo(() => {
        if (!currentMonthInvoice || !userPaymentsData) return false;
        return !userPaymentsData.some(inv => inv.description === currentMonthInvoice.description);
      }, [currentMonthInvoice, userPaymentsData]);
    
      const allPayments = useMemo(() => {
        const invoices = userPaymentsData ? [...userPaymentsData] : [];
        if (showCurrentMonthInvoice && currentMonthInvoice) {
          invoices.unshift(currentMonthInvoice);
        }
        return invoices
          .sort((a, b) => {
            const dateA = toSafeDate(a.date)!;
            const dateB = toSafeDate(b.date)!;
            return dateB.getTime() - dateA.getTime();
          });
      }, [userPaymentsData, showCurrentMonthInvoice, currentMonthInvoice]);
    
      const totalPaymentPages = Math.ceil(allPayments.length / PAYMENTS_PER_PAGE);
    
      const paginatedPayments = useMemo(() => {
        const startIndex = (paymentsCurrentPage - 1) * PAYMENTS_PER_PAGE;
        return allPayments.slice(startIndex, startIndex + PAYMENTS_PER_PAGE);
      }, [allPayments, paymentsCurrentPage]);


    useEffect(() => {
        if (isCreateDeliveryOpen) {
            if (deliveryToEdit) {
                deliveryForm.reset({ ...deliveryToEdit, date: new Date(deliveryToEdit.date) });
            } else {
                const defaultId = `D-${Date.now().toString().slice(-6)}`;
                deliveryForm.reset({ id: defaultId, status: 'Pending', volumeContainers: 1, date: new Date(), adminNotes: '' });
            }
        } else {
            setDeliveryToEdit(null);
        }
        setProofFile(null);
    }, [isCreateDeliveryOpen, deliveryToEdit, deliveryForm]);
    
    useEffect(() => {
        if (!isPaymentReviewOpen) {
            setPaymentToReview(null);
            setRejectionReason('');
            setShowRejectionInput(false);
        }
    }, [isPaymentReviewOpen]);

    const handleAssignStation = async (stationId: string) => {
        if (!userDocRef) return;
        await updateDoc(userDocRef, { assignedWaterStationId: stationId });
        toast({ title: "Station Assigned" });
    };

    const handleCreateDelivery = async (values: DeliveryFormValues) => {
        if (!userDocRef || !auth?.currentUser || !storage || !firestore) return;

        try {
            const { id: deliveryId, ...restOfValues } = values;

            if (!deliveryToEdit) {
                const newDocRef = doc(userDocRef, 'deliveries', deliveryId);
                const docSnap = await getDoc(newDocRef);
                if (docSnap.exists()) {
                    toast({
                        variant: 'destructive',
                        title: 'Tracking # Exists',
                        description: `A delivery with ID ${deliveryId} already exists. Please use a unique ID.`,
                    });
                    return;
                }
            }

            const deliveryRef = doc(userDocRef, 'deliveries', deliveryId);

            const deliveryData:Partial<Delivery> = {
                ...restOfValues,
                id: deliveryId,
                userId: user.id,
                date: values.date.toISOString(),
            };

            if (proofFile) {
                setIsUploadingProof(true);
                setUploadProgress(0);
                const filePath = `admin_uploads/${auth.currentUser.uid}/proofs_for/${user.id}/${deliveryId}-${Date.now()}-${proofFile.name}`;
                const downloadURL = await uploadFileWithProgress(storage, auth, filePath, proofFile, {}, setUploadProgress);
                deliveryData.proofOfDeliveryUrl = downloadURL;
                toast({ title: 'Proof upload complete.' });
            }

            await setDoc(deliveryRef, deliveryData, { merge: true });

            toast({ title: deliveryToEdit ? "Delivery Updated" : "Delivery Created" });
            setIsCreateDeliveryOpen(false);

        } catch (error) {
            console.error("Delivery operation failed:", error);
            toast({ variant: 'destructive', title: "Operation Failed" });
        } finally {
            setIsUploadingProof(false);
            setUploadProgress(0);
            setProofFile(null);
        }
    };

    const handleManualChargeSubmit = async (values: ManualChargeFormValues) => {
      if (!userDocRef || !firestore) return;
      const newCharge: ManualCharge = {
          id: doc(collection(firestore, 'dummy')).id,
          ...values,
          dateAdded: serverTimestamp(),
      };
      await updateDoc(userDocRef, { pendingCharges: arrayUnion(newCharge) });
      toast({ title: "Charge Added", description: "This will be included in the next invoice." });
      setIsManualChargeOpen(false);
    };

    const handleTopUpSubmit = async (values: TopUpFormValues) => {
        if (!userDocRef || !firestore) return;
        const batch = writeBatch(firestore);
        
        const transactionRef = doc(collection(userDocRef, 'transactions'));
        batch.set(transactionRef, {
            id: transactionRef.id,
            type: 'Credit',
            amountCredits: values.amount,
            description: 'Admin Top-Up',
            date: serverTimestamp(),
        });
        
        batch.update(userDocRef, { topUpBalanceCredits: increment(values.amount) });
        
        await batch.commit();

        toast({ title: `₱${values.amount} credited to ${user.businessName}.` });
        setIsTopUpOpen(false);
    };
    
    const handleSanitationVisitSubmit = async (values: SanitationVisitFormValues) => {
        if (!userDocRef || !firestore) return;
        const visitsCol = collection(userDocRef, 'sanitationVisits');
        const newVisitRef = doc(visitsCol);

        const linkRef = doc(collection(firestore, 'publicSanitationLinks'));

        const visitData = { 
            ...values, 
            id: newVisitRef.id,
            userId: user.id,
            scheduledDate: values.scheduledDate.toISOString(),
            shareableLink: `${window.location.origin}/sanitation-report/${linkRef.id}`
        };

        const batch = writeBatch(firestore);
        batch.set(newVisitRef, visitData);
        batch.set(linkRef, { userId: user.id, visitId: newVisitRef.id });

        await batch.commit();

        toast({ title: "Sanitation Visit Scheduled" });
        setIsCreateSanitationOpen(false);
    };

    const handleContractUpload = async () => {
        if (!contractFile || !auth?.currentUser || !storage || !userDocRef) return;
        setIsUploadingContract(true);
        const filePath = `userContracts/${user.id}/${Date.now()}-${contractFile.name}`;
        try {
            await uploadFileWithProgress(storage, auth, filePath, contractFile, {}, setUploadProgress);
            toast({ title: "Contract Uploaded", description: "The user's contract has been updated." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Upload Failed" });
        } finally {
            setIsUploadingContract(false);
            setContractFile(null);
            setUploadProgress(0);
        }
    };
    
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
          toast({ title: `${label} Copied!`, description: 'The ID has been copied to your clipboard.' });
        });
    };

    const handleOpenPaymentReview = (payment: Payment) => {
        if (payment.status !== 'Pending Review') {
            toast({
                title: 'No action needed',
                description: `This payment is already marked as '${payment.status}'.`,
            });
            return;
        }
        if (!payment.proofOfPaymentUrl) {
            toast({
                variant: 'destructive',
                title: 'No Proof Available',
                description: 'There is no proof of payment uploaded for this invoice.',
            });
            return;
        }
        setPaymentToReview(payment);
        setIsPaymentReviewOpen(true);
    };

    const handleUpdatePaymentStatus = async (newStatus: 'Paid' | 'Upcoming') => {
        if (!userDocRef || !paymentToReview) return;
    
        if (newStatus === 'Upcoming' && !rejectionReason.trim()) {
            toast({
                variant: 'destructive',
                title: 'Reason Required',
                description: 'Please provide a reason for rejecting the payment.',
            });
            return;
        }
    
        const paymentRef = doc(userDocRef, 'payments', paymentToReview.id);
        
        try {
            await updateDoc(paymentRef, {
                status: newStatus,
                rejectionReason: newStatus === 'Upcoming' ? rejectionReason : deleteField(),
            });
    
            toast({
                title: `Payment ${newStatus === 'Paid' ? 'Approved' : 'Rejected'}`,
                description: `The invoice status has been updated.`,
            });
    
            setIsPaymentReviewOpen(false);
        } catch (error) {
            console.error("Failed to update payment status:", error);
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>User Account Management</DialogTitle>
                        <DialogDescription>View user details and perform administrative actions.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="pr-6 -mr-6 flex-1">
                        <Tabs defaultValue="overview">
                            <TabsList>
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
                                <TabsTrigger value="billing">Billing</TabsTrigger>
                                <TabsTrigger value="sanitation">Sanitation</TabsTrigger>
                            </TabsList>
                            <TabsContent value="overview" className="py-6 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Client Profile</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-16 w-16">
                                                <AvatarImage src={user.photoURL || undefined} alt={user.name}/>
                                                <AvatarFallback>{user.businessName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="text-lg font-semibold">{user.businessName}</h3>
                                                <p className="text-sm text-muted-foreground">{user.name} - {user.clientId}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-4">
                                            <div><span className="font-semibold">Email:</span> {user.email}</div>
                                            <div><span className="font-semibold">Contact:</span> {user.contactNumber}</div>
                                            <div className="md:col-span-2"><span className="font-semibold">Address:</span> {user.address}</div>
                                            <div><span className="font-semibold">Account Type:</span> {user.accountType}</div>
                                            {user.accountType === 'Branch' && user.parentId && <div><span className="font-semibold">Parent Account:</span> {allUsers.find(u => u.id === user.parentId)?.businessName || 'N/A'}</div>}

                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Plan & Station</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <h4 className="font-medium">Current Plan</h4>
                                            <p className="text-sm text-muted-foreground">{user.plan?.name || 'Not set'}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Assigned Water Station</Label>
                                            <Select onValueChange={handleAssignStation} defaultValue={user.assignedWaterStationId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Assign a station..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(waterStations || []).map(station => (
                                                        <SelectItem key={station.id} value={station.id}>{station.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Contract Management</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-4 p-4 border rounded-lg">
                                            {user.currentContractUrl ? (
                                                <>
                                                    <FileText className="h-6 w-6"/>
                                                    <div className="flex-1">
                                                        <p>Contract on File</p>
                                                        <p className="text-xs text-muted-foreground">Uploaded on: {user.contractUploadedDate ? toSafeDate(user.contractUploadedDate)?.toLocaleDateString() : 'N/A'}</p>
                                                    </div>
                                                    <Button asChild variant="outline">
                                                        <a href={user.currentContractUrl} target="_blank" rel="noopener noreferrer"><Eye className="mr-2 h-4 w-4"/> View</a>
                                                    </Button>
                                                </>
                                            ) : (
                                                <div className="text-center w-full text-muted-foreground text-sm">No contract uploaded.</div>
                                            )}
                                        </div>
                                        <div className="mt-4">
                                            <Label>Upload New/Updated Contract</Label>
                                            <div className="flex gap-2">
                                                <Input type="file" onChange={(e) => setContractFile(e.target.files?.[0] || null)} disabled={isUploadingContract} />
                                                <Button onClick={handleContractUpload} disabled={!contractFile || isUploadingContract}>{isUploadingContract ? 'Uploading...' : 'Upload'}</Button>
                                            </div>
                                            {isUploadingContract && <Progress value={uploadProgress} className="mt-2" />}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="deliveries" className="py-6 space-y-6">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>Delivery History</CardTitle>
                                            <CardDescription>Log of all deliveries for this user.</CardDescription>
                                        </div>
                                        <Button onClick={() => setIsCreateDeliveryOpen(true)}>
                                            <PlusCircle className="mr-2 h-4 w-4"/> Create Delivery
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tracking #</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Volume</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Proof</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginatedDeliveries.map(delivery => (
                                                    <TableRow key={delivery.id}>
                                                        <TableCell className="font-mono text-xs">{delivery.id}</TableCell>
                                                        <TableCell>{toSafeDate(delivery.date)?.toLocaleDateString()}</TableCell>
                                                        <TableCell>
                                                            <div>{delivery.volumeContainers} containers</div>
                                                            <div className="text-xs text-muted-foreground">({containerToLiter(delivery.volumeContainers).toLocaleString(undefined, {maximumFractionDigits: 0})} L)</div>
                                                        </TableCell>
                                                        <TableCell><Badge>{delivery.status}</Badge></TableCell>
                                                        <TableCell>
                                                            {delivery.proofOfDeliveryUrl ? (
                                                                <Button variant="link" className="p-0 h-auto" onClick={() => setProofToViewUrl(delivery.proofOfDeliveryUrl!)}>View</Button>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">None</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="sm" onClick={() => { setDeliveryToEdit(delivery); setIsCreateDeliveryOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                 {paginatedDeliveries.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No deliveries found.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                        <div className="flex items-center justify-end space-x-2 pt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDeliveriesCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={deliveriesCurrentPage === 1}
                                            >
                                                Previous
                                            </Button>
                                            <span className="text-sm text-muted-foreground">
                                                Page {deliveriesCurrentPage} of {totalDeliveryPages > 0 ? totalDeliveryPages : 1}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDeliveriesCurrentPage(p => Math.min(totalDeliveryPages, p + 1))}
                                                disabled={deliveriesCurrentPage === totalDeliveryPages || totalDeliveryPages === 0}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="billing" className="py-6 space-y-6">
                            <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>Billing & Invoices</CardTitle>
                                            <CardDescription>Manage invoices and charges.</CardDescription>
                                        </div>
                                        {user.accountType === 'Parent' ? (
                                            <Button onClick={() => setIsTopUpOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/>Top-up Credits</Button>
                                        ) : (
                                            <Button onClick={() => setIsManualChargeOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/>Add Manual Charge</Button>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        {user.accountType === 'Parent' && (
                                            <div className="mb-4">
                                                <p className="text-sm text-muted-foreground">Current Credit Balance</p>
                                                <p className="text-2xl font-bold">₱{(user.topUpBalanceCredits || 0).toLocaleString()}</p>
                                            </div>
                                        )}
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Invoice ID</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {paginatedPayments.map(payment => {
                                                    const isEstimated = payment.id.startsWith('INV-EST');
                                                    return (
                                                        <TableRow key={payment.id} className={cn(isEstimated && 'bg-blue-50')}>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono text-xs">{payment.id}</span>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(payment.id, 'Invoice ID')}><Copy className="h-3 w-3"/></Button>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{toSafeDate(payment.date)?.toLocaleDateString()}</TableCell>
                                                            <TableCell>{payment.description}</TableCell>
                                                            <TableCell>₱{payment.amount.toLocaleString()}</TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    onClick={() => payment.status === 'Pending Review' && handleOpenPaymentReview(payment)}
                                                                    variant={isEstimated ? 'outline' : 'default'}
                                                                    className={cn(
                                                                        isEstimated ? 'border-blue-500 text-blue-600' : 
                                                                        payment.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800 cursor-pointer hover:bg-yellow-200' :
                                                                        payment.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                                        payment.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                    )}
                                                                >
                                                                    {isEstimated ? 'Estimated' : payment.status}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                        <div className="flex items-center justify-end space-x-2 pt-4">
                                            <Button variant="outline" size="sm" onClick={() => setPaymentsCurrentPage(p => Math.max(1, p - 1))} disabled={paymentsCurrentPage === 1}>Previous</Button>
                                            <span className="text-sm text-muted-foreground">Page {paymentsCurrentPage} of {totalPaymentPages > 0 ? totalPaymentPages : 1}</span>
                                            <Button variant="outline" size="sm" onClick={() => setPaymentsCurrentPage(p => Math.min(totalPaymentPages, p + 1))} disabled={paymentsCurrentPage === totalPaymentPages || totalPaymentPages === 0}>Next</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="sanitation" className="py-6 space-y-6">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>Sanitation Schedule</CardTitle>
                                            <CardDescription>Manage office sanitation visits.</CardDescription>
                                        </div>
                                        <Button onClick={() => setIsCreateSanitationOpen(true)}>
                                            <PlusCircle className="mr-2 h-4 w-4"/> Schedule Visit
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Scheduled Date</TableHead><TableHead>Status</TableHead><TableHead>Assigned To</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {(sanitationVisitsData || []).map(visit => (
                                                    <TableRow key={visit.id}>
                                                        <TableCell>{toSafeDate(visit.scheduledDate)?.toLocaleDateString()}</TableCell>
                                                        <TableCell><Badge>{visit.status}</Badge></TableCell>
                                                        <TableCell>{visit.assignedTo}</TableCell>
                                                        <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => { setSelectedSanitationVisit(visit); setIsSanitationHistoryOpen(true); }}><Eye className="h-4 w-4"/></Button></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </ScrollArea>
                    <DialogFooter className="border-t pt-4 -mb-2 -mx-6 px-6 pb-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create/Edit Delivery Dialog */}
            <Dialog open={isCreateDeliveryOpen} onOpenChange={setIsCreateDeliveryOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{deliveryToEdit ? 'Edit' : 'Create'} Delivery</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={deliveryForm.handleSubmit(handleCreateDelivery)} className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="trackingNumber">Tracking Number</Label>
                            <Input id="trackingNumber" {...deliveryForm.register('id')} disabled={!!deliveryToEdit}/>
                            {deliveryForm.formState.errors.id && <p className="text-sm text-destructive">{deliveryForm.formState.errors.id.message}</p>}
                        </div>
                        <div>
                            <Label>Delivery Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !deliveryForm.watch('date') && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {deliveryForm.watch('date') ? format(deliveryForm.watch('date'), "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={deliveryForm.watch('date')}
                                    onSelect={(date) => deliveryForm.setValue('date', date as Date)}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label htmlFor="volumeContainers">Volume (containers)</Label>
                            <Input id="volumeContainers" type="number" {...deliveryForm.register('volumeContainers')} />
                            {deliveryForm.formState.errors.volumeContainers && <p className="text-sm text-destructive">{deliveryForm.formState.errors.volumeContainers.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <Select onValueChange={(value) => deliveryForm.setValue('status', value as any)} defaultValue={deliveryForm.getValues('status')}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="In Transit">In Transit</SelectItem>
                                    <SelectItem value="Delivered">Delivered</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="adminNotes">Admin Notes</Label>
                            <Textarea id="adminNotes" {...deliveryForm.register('adminNotes')} />
                        </div>
                        
                        <div>
                            <Label>Proof of Delivery</Label>
                            {deliveryToEdit?.proofOfDeliveryUrl && !proofFile ? (
                                    <div className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md">
                                    <FileText className="h-4 w-4" />
                                    <a href={deliveryToEdit.proofOfDeliveryUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex-1 truncate">View current proof</a>
                                </div>
                            ) : <p className="text-xs text-muted-foreground mt-1">No proof uploaded yet.</p>}
                            <Input 
                                id="proof-upload"
                                type="file"
                                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                className="mt-2"
                                disabled={isUploadingProof}
                            />
                            {isUploadingProof && <Progress value={uploadProgress} className="mt-2 h-1" />}
                            {proofFile && <p className="text-xs text-muted-foreground mt-1">New file selected: {proofFile.name}</p>}
                        </div>
                        
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsCreateDeliveryOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isUploadingProof}>
                                {isUploadingProof ? 'Uploading...' : 'Save Delivery'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
            {/* Payment Review Dialog */}
            <Dialog open={isPaymentReviewOpen} onOpenChange={setIsPaymentReviewOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Review Payment</DialogTitle>
                        <DialogDescription>
                            Invoice ID: {paymentToReview?.id}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="relative w-full aspect-[9/16] max-h-[50vh] rounded-lg border overflow-hidden bg-muted">
                            {paymentToReview?.proofOfPaymentUrl ? (
                                <Image src={paymentToReview.proofOfPaymentUrl} alt="Proof of Payment" layout="fill" className="object-contain" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">No proof available</div>
                            )}
                        </div>
                        
                        {showRejectionInput ? (
                            <div className="space-y-2 pt-4">
                                <Label htmlFor="rejectionReason">Rejection Reason</Label>
                                <Textarea 
                                    id="rejectionReason"
                                    placeholder="e.g., Unclear image, amount does not match..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" onClick={() => {setShowRejectionInput(false); setRejectionReason('')}}>Cancel</Button>
                                    <Button variant="destructive" onClick={() => handleUpdatePaymentStatus('Upcoming')}>Confirm Rejection</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <Button onClick={() => handleUpdatePaymentStatus('Paid')}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                </Button>
                                <Button variant="outline" onClick={() => setShowRejectionInput(true)}>
                                <X className="mr-2 h-4 w-4" /> Reject
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manual Charge Dialog */}
            <Dialog open={isManualChargeOpen} onOpenChange={setIsManualChargeOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Manual Charge</DialogTitle></DialogHeader>
                    <form onSubmit={manualChargeForm.handleSubmit(handleManualChargeSubmit)} className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="chargeDesc">Description</Label>
                            <Input id="chargeDesc" {...manualChargeForm.register('description')} />
                            {manualChargeForm.formState.errors.description && <p className="text-sm text-destructive">{manualChargeForm.formState.errors.description.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="chargeAmount">Amount (PHP)</Label>
                            <Input id="chargeAmount" type="number" {...manualChargeForm.register('amount')} />
                            {manualChargeForm.formState.errors.amount && <p className="text-sm text-destructive">{manualChargeForm.formState.errors.amount.message}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsManualChargeOpen(false)}>Cancel</Button>
                            <Button type="submit">Add Charge</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {/* Top-up Dialog */}
            <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Top-up Credits</DialogTitle></DialogHeader>
                    <form onSubmit={topUpForm.handleSubmit(handleTopUpSubmit)} className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="topupAmount">Amount (PHP)</Label>
                            <Input id="topupAmount" type="number" {...topUpForm.register('amount')} />
                            {topUpForm.formState.errors.amount && <p className="text-sm text-destructive">{topUpForm.formState.errors.amount.message}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsTopUpOpen(false)}>Cancel</Button>
                            <Button type="submit">Add Credits</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {/* Create Sanitation Visit Dialog */}
            <Dialog open={isCreateSanitationOpen} onOpenChange={setIsCreateSanitationOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader><DialogTitle>Schedule Sanitation Visit</DialogTitle></DialogHeader>
                    <form onSubmit={sanitationVisitForm.handleSubmit(handleSanitationVisitSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Scheduled Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !sanitationVisitForm.watch('scheduledDate') && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{sanitationVisitForm.watch('scheduledDate') ? format(sanitationVisitForm.watch('scheduledDate'), "PPP") : <span>Pick a date</span>}</Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={sanitationVisitForm.watch('scheduledDate')} onSelect={(date) => sanitationVisitForm.setValue('scheduledDate', date as Date)} initialFocus/></PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select onValueChange={(value) => sanitationVisitForm.setValue('status', value as any)} defaultValue={sanitationVisitForm.getValues('status')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label>Assigned To</Label>
                            <Input {...sanitationVisitForm.register('assignedTo')} />
                        </div>

                        {fields.map((field, index) => (
                            <Card key={field.id}>
                                <CardHeader className="flex flex-row items-center justify-between py-4">
                                    <CardTitle className="text-base">Dispenser #{index + 1}</CardTitle>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><MinusCircle className="h-4 w-4 text-destructive"/></Button>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input {...sanitationVisitForm.register(`dispenserReports.${index}.dispenserName`)} placeholder="Dispenser Name (e.g., Lobby)" />
                                        <Input {...sanitationVisitForm.register(`dispenserReports.${index}.dispenserCode`)} placeholder="Dispenser Code (Optional)" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Button type="button" variant="outline" onClick={() => append({ dispenserName: `Unit #${fields.length + 1}`, checklist: [ { item: 'Cleaned exterior', checked: false, remarks: '' }, { item: 'Flushed lines', checked: false, remarks: '' }, { item: 'Checked for leaks', checked: false, remarks: '' } ] })}><PlusCircle className="mr-2 h-4 w-4"/>Add Another Dispenser</Button>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsCreateSanitationOpen(false)}>Cancel</Button>
                            <Button type="submit">Schedule Visit</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={!!proofToViewUrl} onOpenChange={() => setProofToViewUrl(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Proof of Delivery</DialogTitle>
                    </DialogHeader>
                    {proofToViewUrl && <div className="relative w-full aspect-auto h-[70vh]"><Image src={proofToViewUrl} alt="Proof of delivery" layout="fill" className="object-contain rounded-md" /></div>}
                </DialogContent>
            </Dialog>
        </>
    );
}
