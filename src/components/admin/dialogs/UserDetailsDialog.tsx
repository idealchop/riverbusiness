
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
import { format, formatDistanceToNow, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    const sanitationVisitForm = useForm<SanitationVisitFormValues>({ resolver: zodResolver(sanitationVisitSchema), defaultValues: { status: 'Scheduled', dispenserReports: [{ dispenserName: 'Main Unit', checklist: [ { item: 'Cleaned exterior', checked: false }, { item: 'Flushed lines', checked: false }, { item: 'Checked for leaks', checked: false } ] }] } });
    const { fields, append, remove } = useFieldArray({ control: sanitationVisitForm.control, name: "dispenserReports" });

    useEffect(() => {
        if (isCreateDeliveryOpen && deliveryToEdit) {
            deliveryForm.reset({ ...deliveryToEdit, date: new Date(deliveryToEdit.date) });
        } else {
            deliveryForm.reset({ status: 'Pending', volumeContainers: 1, date: new Date(), adminNotes: '' });
        }
    }, [isCreateDeliveryOpen, deliveryToEdit, deliveryForm]);
    
    const handleAssignStation = async (stationId: string) => {
        if (!userDocRef) return;
        await updateDoc(userDocRef, { assignedWaterStationId: stationId });
        toast({ title: "Station Assigned" });
    };

    const handleCreateDelivery = async (values: DeliveryFormValues) => {
        if (!userDocRef) return;
        const deliveryData = { ...values, userId: user.id, date: values.date.toISOString() };
        const deliveriesCol = collection(userDocRef, 'deliveries');
        if (deliveryToEdit) {
            await setDoc(doc(deliveriesCol, deliveryToEdit.id), deliveryData);
            toast({ title: "Delivery Updated" });
        } else {
            const newDocRef = doc(deliveriesCol);
            await setDoc(newDocRef, {...deliveryData, id: newDocRef.id});
            toast({ title: "Delivery Created" });
        }
        setIsCreateDeliveryOpen(false);
        setDeliveryToEdit(null);
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
    
    return (
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
                         <TabsContent value="overview">
                           {/* TODO: Add User Overview Content */}
                         </TabsContent>
                         <TabsContent value="deliveries">
                            {/* TODO: Add User Deliveries Content */}
                         </TabsContent>
                         <TabsContent value="billing">
                           {/* TODO: Add User Billing Content */}
                         </TabsContent>
                         <TabsContent value="sanitation">
                            {/* TODO: Add User Sanitation Content */}
                         </TabsContent>
                    </Tabs>
                </ScrollArea>
                <DialogFooter className="border-t pt-4 -mb-2 -mx-6 px-6 pb-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
            {/* TODO: Add all other nested dialogs here */}
        </Dialog>
    );
}
