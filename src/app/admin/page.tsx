
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCog, UserPlus, KeyRound, Trash2, MoreHorizontal, Users, Building, LogIn, Eye, EyeOff, FileText, Users2, UserCheck, Paperclip, Upload, MinusCircle, Info, Download, Calendar as CalendarIcon, PlusCircle, FileHeart, ShieldX, Receipt, History, Truck, PackageCheck, Package, LogOut, Edit, Shield } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { format, differenceInMonths, addMonths } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AppUser, Delivery, WaterStation, Payment } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc } from '@/firebase';
import { collection, doc, serverTimestamp, updateDoc, collectionGroup, getDoc, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

const newDeliverySchema = z.object({
    refId: z.string().min(1, 'Reference ID is required'),
    date: z.date({ required_error: 'Date is required.'}),
    volumeContainers: z.coerce.number().min(1, 'Volume is required.'),
    status: z.enum(['Pending', 'In Transit', 'Delivered']),
    proofUrl: z.any().optional(),
});
type NewDeliveryFormValues = z.infer<typeof newDeliverySchema>;

export default function AdminPage() {
    const { toast } = useToast();
    const auth = useAuth();
    const { user: authUser, isUserLoading } = useUser();
    const firestore = useFirestore();

    const [isAdmin, setIsAdmin] = React.useState(false);

    const adminUserDocRef = useMemoFirebase(() => authUser ? doc(firestore, "users", authUser.uid) : null, [authUser, firestore]);
    const { data: adminUserData, isLoading: isAdminUserLoading } = useDoc<AppUser>(adminUserDocRef);

    React.useEffect(() => {
        if (!isAdminUserLoading && adminUserData) {
            setIsAdmin(adminUserData.role === 'Admin');
        }
    }, [adminUserData, isAdminUserLoading]);

    const usersQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'users') : null, [firestore, isAdmin]);
    const { data: appUsers, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);

    const waterStationsQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'waterStations') : null, [firestore, isAdmin]);
    const { data: waterStations, isLoading: stationsLoading } = useCollection<WaterStation>(waterStationsQuery);

    const allDeliveriesQuery = useMemoFirebase(() => (firestore && isAdmin) ? collectionGroup(firestore, 'deliveries') : null, [firestore, isAdmin]);
    const { data: allDeliveries, isLoading: allDeliveriesLoading } = useCollection<Delivery>(allDeliveriesQuery);
    
    const [greeting, setGreeting] = React.useState('');
    
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
    const [deliveryDateRange, setDeliveryDateRange] = React.useState<DateRange | undefined>()
    const [isStationProfileOpen, setIsStationProfileOpen] = React.useState(false);
    const [isAssignStationOpen, setIsAssignStationOpen] = React.useState(false);
    const [stationToAssign, setStationToAssign] = React.useState<string | undefined>();
    const [isCreateDeliveryOpen, setIsCreateDeliveryOpen] = React.useState(false);
    const [isUploadContractOpen, setIsUploadContractOpen] = React.useState(false);
    const [userForContract, setUserForContract] = React.useState<AppUser | null>(null);

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

    const userDeliveriesQuery = useMemoFirebase(() => {
        if (!firestore || !userForHistory) return null;
        return collection(firestore, 'users', userForHistory.id, 'deliveries');
    }, [firestore, userForHistory]);

    const { data: userDeliveriesData, isLoading: userDeliveriesLoading } = useCollection<Delivery>(userDeliveriesQuery);

    const paymentsQuery = useMemoFirebase(() => {
        if (!firestore || !selectedUser) return null;
        return collection(firestore, 'users', selectedUser.id, 'payments');
    }, [firestore, selectedUser]);
    const { data: userPaymentsData } = useCollection<Payment>(paymentsQuery);


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

      const openAccountDialog = () => setIsAccountDialogOpen(true);
      
      window.addEventListener('admin-user-search-term', handleUserSearch);
      window.addEventListener('admin-open-my-account', openAccountDialog);
  
      return () => {
        window.removeEventListener('admin-user-search-term', handleUserSearch);
        window.removeEventListener('admin-open-my-account', openAccountDialog);
      };
    }, [appUsers, toast]);

    React.useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    React.useEffect(() => {
        if(adminUserData) {
          setEditableFormData(adminUserData);
        }
    }, [adminUserData]);

    const stationForm = useForm<NewStationFormValues>({
        resolver: zodResolver(newStationSchema),
        defaultValues: { name: '', location: '' },
    });

    const deliveryForm = useForm<NewDeliveryFormValues>({
        resolver: zodResolver(newDeliverySchema),
        defaultValues: { refId: '', volumeContainers: 0, status: 'Pending' },
    });

    React.useEffect(() => {
        if (isStationProfileOpen && stationToUpdate) {
            stationForm.reset({ name: stationToUpdate.name, location: stationToUpdate.location });
        } else {
            stationForm.reset({ name: '', location: '' });
        }
    }, [stationToUpdate, stationForm, isStationProfileOpen]);

    const adjustConsumptionForm = useForm<AdjustConsumptionFormValues>({
        resolver: zodResolver(adjustConsumptionSchema),
        defaultValues: { amount: 0, containers: 0 },
    });

    const handleSaveStation = (values: NewStationFormValues) => {
        if (!firestore) return;

        if (stationToUpdate) {
            const stationRef = doc(firestore, 'waterStations', stationToUpdate.id);
            updateDocumentNonBlocking(stationRef, values);
            toast({ title: 'Station Updated', description: `Station "${values.name}" has been updated.` });
        } else {
            const stationsRef = collection(firestore, 'waterStations');
            addDocumentNonBlocking(stationsRef, values);
            toast({ title: 'Water Station Created', description: `Station "${values.name}" has been created.` });
        }
        stationForm.reset();
        setStationToUpdate(null);
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

        const amount = adjustmentType === 'deduct' ? -values.amount : values.amount;
        const newTotal = (selectedUser.totalConsumptionLiters || 0) + amount;

        const userRef = doc(firestore, 'users', selectedUser.id);
        updateDocumentNonBlocking(userRef, { totalConsumptionLiters: newTotal });
        
        setSelectedUser(prev => prev ? { ...prev, totalConsumptionLiters: newTotal } : null);

        toast({
            title: `Liters Adjusted`,
            description: `${values.amount.toLocaleString()} liters ${adjustmentType === 'add' ? 'added to' : 'deducted from'} ${selectedUser.name}'s balance.`
        });
        
        setIsAdjustConsumptionOpen(false);
        adjustConsumptionForm.reset();
    };

    const handleDeductFromDelivery = (userId: string, containers: number) => {
        if (!firestore || !appUsers) return;
        const userToUpdate = appUsers.find(u => u.id === userId);
        if (!userToUpdate) return;
        
        const litersToDeduct = containers * 19.5;
        const newTotal = (userToUpdate.totalConsumptionLiters || 0) - litersToDeduct;
        
        const userRef = doc(firestore, 'users', userId);
        updateDocumentNonBlocking(userRef, { totalConsumptionLiters: newTotal });

        if (selectedUser && selectedUser.id === userId) {
            setSelectedUser(prev => prev ? { ...prev, totalConsumptionLiters: newTotal } : null);
        }

        toast({
            title: "Consumption Deducted",
            description: `${litersToDeduct.toLocaleString(undefined, {maximumFractionDigits: 2})} liters have been deducted from the user's balance.`
        })
    };

    const handleAttachPermit = async (permitType: keyof WaterStation['permits'], file: File) => {
        if (!stationToUpdate || !firestore) return;
        const storage = getStorage();
        const filePath = `stations/${stationToUpdate.id}/permits/${permitType}-${file.name}`;
        const storageRef = ref(storage, filePath);

        try {
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const stationRef = doc(firestore, 'waterStations', stationToUpdate.id);
            updateDocumentNonBlocking(stationRef, {
                [`permits.${permitType}`]: downloadURL,
            });
            
            setStationToUpdate(prev => prev ? { ...prev, permits: { ...prev.permits, [permitType]: downloadURL } } : null);

            toast({ title: 'Permit Attached', description: `A new permit has been successfully attached to the station.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the permit. Please try again.' });
        }
    };

    const handleUploadProof = async (file: File) => {
        if (!deliveryToUpdate || !userForHistory || !firestore) return;
        const storage = getStorage();
        const filePath = `users/${userForHistory.id}/deliveries/${deliveryToUpdate.id}/${file.name}`;
        const storageRef = ref(storage, filePath);

        try {
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const deliveryRef = doc(firestore, 'users', userForHistory.id, 'deliveries', deliveryToUpdate.id);
            updateDocumentNonBlocking(deliveryRef, { proofOfDeliveryUrl: downloadURL });
            
            toast({ title: "Proof Uploaded", description: `Proof for delivery ${deliveryToUpdate.id} has been attached.` });
            setDeliveryToUpdate(null);
        } catch (error) {
             toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload proof. Please try again.' });
        }
    };

    const handleUploadContract = async (file: File) => {
        if (!userForContract || !firestore) return;
        const storage = getStorage();
        const filePath = `users/${userForContract.id}/contracts/${file.name}`;
        const storageRef = ref(storage, filePath);
    
        try {
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
    
            const userRef = doc(firestore, 'users', userForContract.id);
            updateDocumentNonBlocking(userRef, { contractUrl: downloadURL });

            if (selectedUser && selectedUser.id === userForContract.id) {
                 setSelectedUser(prev => prev ? { ...prev, contractUrl: downloadURL } : null);
            }
            
            toast({ title: "Contract Uploaded", description: `A contract has been attached to ${userForContract.name}.` });
            setIsUploadContractOpen(false);
            setUserForContract(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload contract. Please try again.' });
        }
    };

    const handleCreateDelivery = async (values: NewDeliveryFormValues) => {
        if (!userForHistory || !firestore) return;
    
        let proofUrl = '';
        if (values.proofUrl && values.proofUrl.length > 0) {
            const file = values.proofUrl[0];
            const storage = getStorage();
            const filePath = `users/${userForHistory.id}/deliveries/${values.refId}/${file.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            proofUrl = await getDownloadURL(storageRef);
        }
    
        const newDeliveryDocRef = doc(firestore, 'users', userForHistory.id, 'deliveries', values.refId);
        
        const newDeliveryData: Delivery = {
            id: values.refId,
            userId: userForHistory.id,
            date: values.date.toISOString(),
            volumeContainers: values.volumeContainers,
            status: values.status,
            proofOfDeliveryUrl: proofUrl,
        };

        try {
            setDocumentNonBlocking(newDeliveryDocRef, newDeliveryData);
            toast({ title: "Delivery Record Created", description: `A manual delivery has been added for ${userForHistory.name}.` });
            deliveryForm.reset();
            setIsCreateDeliveryOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Creation Failed', description: 'Could not create the delivery record.' });
        }
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
        if (adminUserData) {
            setEditableFormData(adminUserData);
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
        const storage = getStorage();
        const filePath = `users/${authUser.uid}/profile/${file.name}`;
        const storageRef = ref(storage, filePath);
    
        try {
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);
    
          const userRef = doc(firestore, 'users', authUser.uid);
          updateDocumentNonBlocking(userRef, { photoURL: downloadURL });
    
          toast({ title: 'Profile Photo Updated', description: 'Your new photo has been saved.' });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your photo. Please try again.' });
        }
    };

    const watchedContainers = adjustConsumptionForm.watch('containers');
    React.useEffect(() => {
        const liters = (watchedContainers || 0) * 19.5;
        adjustConsumptionForm.setValue('amount', parseFloat(liters.toFixed(2)), { shouldValidate: true });
    }, [watchedContainers, adjustConsumptionForm]);

    const watchedDeliveryContainers = deliveryForm.watch('volumeContainers');

    
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

    const permitFields: { key: keyof WaterStation['permits'], label: string }[] = [
        { key: 'businessPermitUrl', label: 'Business / Mayor\'s Permit' },
        { key: 'sanitationPermitUrl', label: 'Sanitary Permit' },
    ];

    const complianceFields: { key: keyof WaterStation['permits'], label: string }[] = [
        { key: 'bacteriologicalTestUrl', label: 'Bacteriological' },
        { key: 'physicalChemicalTestUrl', label: 'Physical-Chemical' },
        { key: 'annualMonitoringUrl', label: 'Annual Monitoring' },
    ];

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
      
    const getDeliveryStatus = (user: AppUser) => {
        if (!allDeliveries) return 'No Delivery';
        
        const userDeliveries = allDeliveries
            .filter(d => d.userId === user.id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (userDeliveries.length === 0) {
            return 'No Delivery';
        }
        return userDeliveries[0].status;
    };


  if (isUserLoading || isAdminUserLoading) {
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
            <h1 className="text-3xl font-bold">{greeting}, {adminUserData?.businessName || 'Admin'}!</h1>
        </div>

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
                        <div className="grid md:grid-cols-2 gap-8 py-4">
                            {/* Left Column: User Profile */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src={selectedUser.photoURL} alt={selectedUser.name} />
                                        <AvatarFallback className="text-3xl">{selectedUser.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="font-semibold text-lg">{selectedUser.name}</h4>
                                        <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                    </div>
                                </div>
                                <Separator/>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="profile">Profile</TabsTrigger>
                                    <TabsTrigger value="invoices">Invoice History</TabsTrigger>
                                </TabsList>
                                <TabsContent value="profile">
                                    <div className="space-y-3 text-sm">
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
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Account Status:</span>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("h-2 w-2 rounded-full", selectedUser.accountStatus === 'Active' ? 'bg-green-500' : 'bg-gray-500')} />
                                                <span className="font-medium">{selectedUser.accountStatus === 'Active' ? 'Online' : 'Offline'}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Plan:</span>
                                            <span className="font-medium">{selectedUser.plan?.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Purchased Liters:</span>
                                            <span className="font-medium">{(selectedUser.customPlanDetails?.litersPerMonth || 0).toLocaleString()} Liters/Month</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total Consumption:</span>
                                            <span className="font-medium">{(selectedUser.totalConsumptionLiters || 0).toLocaleString()} Liters</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Assigned Station:</span>
                                            <span className="font-medium">{waterStations?.find(ws => ws.id === selectedUser.assignedWaterStationId)?.name || 'Not Assigned'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Role:</span>
                                            <span className="font-medium">{selectedUser.role}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Last Login:</span>
                                            <span className="font-medium">{selectedUser.lastLogin ? format(new Date(selectedUser.lastLogin), 'PPp') : 'N/A'}</span>
                                        </div>
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
                                    <Button variant="outline" onClick={() => { setAdjustmentType('add'); setIsAdjustConsumptionOpen(true); }} disabled={!isAdmin}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Liters
                                    </Button>
                                    <Button variant="outline" onClick={() => { setAdjustmentType('deduct'); setIsAdjustConsumptionOpen(true); }} disabled={!isAdmin}>
                                        <MinusCircle className="mr-2 h-4 w-4" />
                                        Deduct Liters
                                    </Button>
                                    <Button variant="outline" onClick={() => { setUserForContract(selectedUser); setIsUploadContractOpen(true); }} disabled={!isAdmin}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload Contract
                                    </Button>
                                    {selectedUser.contractUrl && (
                                        <Button variant="link" asChild>
                                            <a href={selectedUser.contractUrl} target="_blank" rel="noopener noreferrer">View Contract</a>
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
                                <TableHead>Ref ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Volume</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Proof of Delivery</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {userDeliveriesLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">Loading history...</TableCell>
                                </TableRow>
                            ) : filteredDeliveries.map(delivery => {
                                const liters = delivery.volumeContainers * 19.5;
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
                                    <TableCell>
                                        {delivery.proofOfDeliveryUrl ? (
                                             <Button variant="link" size="sm" onClick={() => setSelectedProofUrl(delivery.proofOfDeliveryUrl || null)}>View</Button>
                                        ) : (
                                            <Button variant="outline" size="sm" onClick={() => setDeliveryToUpdate(delivery)} disabled={!isAdmin}>
                                                <Upload className="mr-2 h-3 w-3"/>
                                                Upload
                                            </Button>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {delivery.status === 'Delivered' && userForHistory && (
                                            <Button size="sm" onClick={() => handleDeductFromDelivery(userForHistory.id, delivery.volumeContainers)} disabled={!isAdmin}>
                                                Deduct
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )})}
                             {filteredDeliveries.length === 0 && !userDeliveriesLoading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">No delivery history found for the selected date range.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>

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
                            name="refId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reference ID</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., DEL-00123" {...field} />
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
                                        <Input type="number" placeholder="e.g., 50" {...field} />
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
                            control={deliveryForm.control}
                            name="proofUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proof of Delivery (Optional)</FormLabel>
                                    <FormControl>
                                       <Input type="file" onChange={(e) => field.onChange(e.target.files)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                            <Button type="submit">Create Delivery</Button>
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
        
        <Dialog open={!!deliveryToUpdate} onOpenChange={(open) => !open && setDeliveryToUpdate(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Proof of Delivery</DialogTitle>
                    <DialogDescription>Attach the proof of delivery for delivery ID: {deliveryToUpdate?.id}</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input type="file" onChange={(e) => {
                        if (e.target.files?.[0]) {
                            handleUploadProof(e.target.files[0]);
                        }
                    }}/>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setDeliveryToUpdate(null)}>Cancel</Button>
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

        <Dialog open={isUploadContractOpen} onOpenChange={setIsUploadContractOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Contract</DialogTitle>
                    <DialogDescription>Attach a contract for {userForContract?.name}.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input type="file" onChange={(e) => {
                        if (e.target.files?.[0]) {
                            handleUploadContract(e.target.files[0]);
                        }
                    }}/>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsUploadContractOpen(false); setUserForContract(null); }}>Cancel</Button>
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
                                        <Button asChild variant="outline" size="sm">
                                            <Label>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Upload Photo
                                                <Input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleProfilePhotoUpload(e.target.files[0])}/>
                                            </Label>
                                        </Button>
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
                    <div className="space-y-1 relative">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                        <Button size="icon" variant="ghost" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                        <div className="space-y-1 relative">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        <Button size="icon" variant="ghost" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)}>
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                        <div className="space-y-1 relative">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        <Button size="icon" variant="ghost" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
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


        <Card>
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
                                        <TableHead>Status</TableHead>
                                        <TableHead>Assigned Station</TableHead>
                                        <TableHead>Delivery Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => {
                                        return (
                                        <TableRow key={user.id}>
                                            <TableCell className="whitespace-nowrap">{user.clientId}</TableCell>
                                            <TableCell className="whitespace-nowrap">{user.businessName}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("h-2 w-2 rounded-full", user.accountStatus === 'Active' ? 'bg-green-500' : 'bg-gray-500')} />
                                                    <span>{user.accountStatus === 'Active' ? 'Online' : 'Offline'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{waterStations?.find(ws => ws.id === user.assignedWaterStationId)?.name || 'N/A'}</TableCell>
                                            <TableCell>
                                                {getDeliveryStatus(user)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsUserDetailOpen(true);}}>
                                                            <Users2 className="mr-2 h-4 w-4" />
                                                            Client's Profile
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                    {filteredUsers.length === 0 && !usersLoading && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center">No users found.</TableCell>
                                        </TableRow>
                                    )}
                                     {usersLoading && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center">Loading users...</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         </div>
                    </TabsContent>
                    
                    <TabsContent value="water-stations">
                        <div className="flex justify-end mb-4">
                           <Button onClick={() => { setStationToUpdate(null); setIsStationProfileOpen(true); }} disabled={!isAdmin}><PlusCircle className="mr-2 h-4 w-4" />Create Station</Button>
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
                                                <Badge variant={station.permits && Object.values(station.permits).some(p => p) ? 'default' : 'outline'}>
                                                    {station.permits ? Object.values(station.permits).filter(p => p).length : 0} / {permitFields.length + complianceFields.length} Attached
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => { setStationToUpdate(station); setIsStationProfileOpen(true); }}>
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
         <Dialog open={isStationProfileOpen} onOpenChange={(open) => {if (!open) {setStationToUpdate(null); stationForm.reset();} setIsStationProfileOpen(open);}}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Partnership Requirements</DialogTitle>
                    <DialogDescription>
                        Submit the following documents to become a verified Refill Partner.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1">
                    <div className="space-y-8 p-4">
                         <Form {...stationForm}>
                            <form onSubmit={stationForm.handleSubmit(handleSaveStation)} className="space-y-4">
                                <FormField control={stationForm.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Station Name</FormLabel>
                                        <FormControl><Input placeholder="e.g. Aqua Pure Downtown" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={stationForm.control} name="location" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Location</FormLabel>
                                        <FormControl><Input placeholder="e.g. 123 Business Rd, Metro City" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                {stationToUpdate && (
                                    <Button type="submit" size="sm" disabled={!isAdmin}>Save Changes</Button>
                                )}
                            </form>
                        </Form>

                        <Separator />

                        <div>
                            <h3 className="font-semibold text-base mb-1">1. Valid Business Permits</h3>
                            <p className="text-sm text-muted-foreground mb-4">Please upload the following required documents for a water refilling station to operate.</p>
                            <div className="space-y-3">
                                {permitFields.map(field => (
                                    <div key={field.key} className="flex justify-between items-center text-sm p-3 border rounded-lg bg-background">
                                        <span className="font-medium">{field.label}</span>
                                        {stationToUpdate?.permits?.[field.key] ? (
                                             <Badge variant="default" className="bg-green-100 text-green-800">Attached</Badge>
                                        ) : (
                                            <Button asChild type="button" variant="outline" size="sm" disabled={!stationToUpdate || !isAdmin}>
                                                <Label className={cn("flex items-center", isAdmin ? "cursor-pointer" : "cursor-not-allowed")}>
                                                    <Upload className="mr-2 h-4 w-4" /> Upload
                                                    <Input type="file" className="hidden" disabled={!isAdmin} onChange={(e) => e.target.files?.[0] && handleAttachPermit(field.key, e.target.files[0])} />
                                                </Label>
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                             <h3 className="font-semibold text-base mb-1">2. Compliance</h3>
                            <p className="text-sm text-muted-foreground mb-4">Submit your latest water test results. All three tests are required for full partner verification.</p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Test Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {complianceFields.map(field => (
                                        <TableRow key={field.key}>
                                            <TableCell className="font-medium">{field.label}</TableCell>
                                            <TableCell>
                                                 {stationToUpdate?.permits?.[field.key] ? (
                                                    <Badge variant="default" className="bg-green-100 text-green-800">Compliant</Badge>
                                                ) : (
                                                    <Badge variant="destructive">Needs Compliance</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 <Button asChild type="button" variant="outline" size="sm" disabled={!stationToUpdate || !isAdmin}>
                                                    <Label className={cn("flex items-center", isAdmin ? "cursor-pointer" : "cursor-not-allowed")}>
                                                        <Upload className="mr-2 h-4 w-4" /> Upload
                                                        <Input type="file" className="hidden" disabled={!isAdmin} onChange={(e) => e.target.files?.[0] && handleAttachPermit(field.key, e.target.files[0])} />
                                                    </Label>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        
                        <div>
                            <h3 className="font-semibold text-base mb-1">3. Partnership Agreement</h3>
                            <p className="text-sm text-muted-foreground mb-4">Review and accept the partnership agreement.</p>
                            <Button variant="outline" disabled={!isAdmin} onClick={() => toast({ title: "Coming Soon!" })}><FileText className="mr-2 h-4 w-4" /> View &amp; Sign Agreement</Button>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="mt-4 pt-4 border-t">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={() => { setStationToUpdate(null); stationForm.reset();}}>Close</Button>
                    </DialogClose>
                    {!stationToUpdate && (
                        <Button onClick={stationForm.handleSubmit(handleSaveStation)} disabled={!isAdmin}>Create Station</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

    

    