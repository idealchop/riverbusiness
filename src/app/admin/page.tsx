
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCog, UserPlus, KeyRound, Trash2, MoreHorizontal, Users, Building, LogIn, Eye, EyeOff, FileText, Users2, UserCheck, Paperclip, Upload, MinusCircle, Info, Download, Calendar as CalendarIcon, PlusCircle, FileHeart } from 'lucide-react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AppUser, Delivery, WaterStation } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createUserWithEmailAndPassword } from 'firebase/auth';

const newUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  businessName: z.string().min(1, 'Business Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Admin', 'User']),
});

type NewUserFormValues = z.infer<typeof newUserSchema>;

const newStationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    location: z.string().min(1, 'Location is required'),
});

type NewStationFormValues = z.infer<typeof newStationSchema>;

const adjustConsumptionSchema = z.object({
    amount: z.coerce.number().min(0, 'Amount must be a positive number'),
});
type AdjustConsumptionFormValues = z.infer<typeof adjustConsumptionSchema>;

const newDeliverySchema = z.object({
    date: z.date({ required_error: 'Date is required.'}),
    referenceId: z.string().min(1, 'Reference ID is required.'),
    volumeGallons: z.coerce.number().min(1, 'Volume is required.'),
});
type NewDeliveryFormValues = z.infer<typeof newDeliverySchema>;

export default function AdminPage() {
    const { toast } = useToast();
    const auth = useAuth();
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: appUsers, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);

    const waterStationsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'waterStations') : null, [firestore]);
    const { data: waterStations, isLoading: stationsLoading } = useCollection<WaterStation>(waterStationsQuery);

    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [greeting, setGreeting] = useState('');
    
    const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isDeliveryHistoryOpen, setIsDeliveryHistoryOpen] = useState(false);
    const [userForHistory, setUserForHistory] = useState<AppUser | null>(null);
    const [activeTab, setActiveTab] = useState('user-management');
    const [userFilter, setUserFilter] = useState<'all' | 'active' | 'inactive'>('all');
    
    const [stationToUpdate, setStationToUpdate] = useState<WaterStation | null>(null);
    const [isAdjustConsumptionOpen, setIsAdjustConsumptionOpen]_ = useState(false);
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct'>('deduct');
    const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
    const [deliveryToUpdate, setDeliveryToUpdate] = useState<Delivery | null>(null);
    const [deliveryDateRange, setDeliveryDateRange] = React.useState<DateRange | undefined>()
    const [isStationProfileOpen, setIsStationProfileOpen] = useState(false);
    const [isAssignStationOpen, setIsAssignStationOpen] = useState(false);
    const [stationToAssign, setStationToAssign] = useState<string | undefined>();
    const [isCreateDeliveryOpen, setIsCreateDeliveryOpen] = useState(false);
    
    const deliveriesQuery = useMemoFirebase(() => {
        if (!firestore || !userForHistory) return null;
        return collection(firestore, 'users', userForHistory.id, 'deliveries');
    }, [firestore, userForHistory]);
    const { data: userDeliveriesData } = useCollection<Delivery>(deliveriesQuery);


    useEffect(() => {
      const handleUserSearch = (event: CustomEvent<AppUser>) => {
        setSelectedUser(event.detail);
        setIsUserDetailOpen(true);
      };
      
      window.addEventListener('admin-user-search', handleUserSearch as EventListener);
  
      return () => {
        window.removeEventListener('admin-user-search', handleUserSearch as EventListener);
      };
    }, []);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    const form = useForm<NewUserFormValues>({
        resolver: zodResolver(newUserSchema),
        defaultValues: { name: '', businessName: '', email: '', password: '', role: 'User' },
    });
    
    const stationForm = useForm<NewStationFormValues>({
        resolver: zodResolver(newStationSchema),
        defaultValues: { name: '', location: '' },
    });

    const deliveryForm = useForm<NewDeliveryFormValues>({
        resolver: zodResolver(newDeliverySchema),
        defaultValues: { referenceId: '', volumeGallons: 0, },
    });

    useEffect(() => {
        if (stationToUpdate) {
            stationForm.reset({ name: stationToUpdate.name, location: stationToUpdate.location });
        } else {
            stationForm.reset({ name: '', location: '' });
        }
    }, [stationToUpdate, stationForm]);

    const adjustConsumptionForm = useForm<AdjustConsumptionFormValues>({
        resolver: zodResolver(adjustConsumptionSchema),
        defaultValues: { amount: 0 },
    });

    const handleCreateUser = async (values: NewUserFormValues) => {
        if (!auth || !firestore) return;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;

            const newUserDoc: AppUser = {
                id: user.uid,
                name: values.name,
                businessName: values.businessName,
                email: values.email,
                role: values.role,
                totalConsumptionLiters: 0,
                accountStatus: 'Active',
                lastLogin: new Date().toISOString(),
                createdAt: serverTimestamp(),
            };

            const userDocRef = doc(firestore, "users", user.uid);
            setDocumentNonBlocking(userDocRef, newUserDoc, { merge: true });

            toast({ title: 'User Created', description: `User ${values.name} has been created.` });
            form.reset();
            setIsCreateUserOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error creating user', description: error.message });
        }
    };

    const handleSaveStation = (values: NewStationFormValues) => {
        if (!firestore) return;

        if (stationToUpdate) {
            const stationRef = doc(firestore, 'waterStations', stationToUpdate.id);
            updateDocumentNonBlocking(stationRef, values);
            toast({ title: 'Station Updated', description: `Station ${values.name} has been updated.` });
        } else {
            const stationsRef = collection(firestore, 'waterStations');
            addDocumentNonBlocking(stationsRef, values);
            toast({ title: 'Water Station Created', description: `Station ${values.name} has been created.` });
        }
        stationForm.reset();
        setStationToUpdate(null);
        setIsStationProfileOpen(false);
    };

    const handleAssignStation = () => {
        if (!selectedUser || !stationToAssign || !firestore) return;

        const userRef = doc(firestore, 'users', selectedUser.id);
        updateDocumentNonBlocking(userRef, { assignedWaterStationId: stationToAssign });

        toast({ title: 'Station Assigned', description: `Station assigned to ${selectedUser.name}.` });
        setIsAssignStationOpen(false);
        setStationToAssign(undefined);
    };

    const handleResetPassword = (userId: string) => {
        toast({ title: "Password Reset", description: `Password reset instructions sent to user.` });
    };

    const handleAdjustConsumption = (values: AdjustConsumptionFormValues) => {
        if (!selectedUser || !firestore) return;

        const amount = adjustmentType === 'deduct' ? -values.amount : values.amount;
        const newTotal = (selectedUser.totalConsumptionLiters || 0) + amount;

        const userRef = doc(firestore, 'users', selectedUser.id);
        updateDocumentNonBlocking(userRef, { totalConsumptionLiters: newTotal });
        
        toast({
            title: `Consumption ${adjustmentType === 'add' ? 'Added' : 'Deducted'}`,
            description: `${values.amount.toLocaleString()} liters ${adjustmentType === 'add' ? 'added to' : 'deducted from'} ${selectedUser.name}'s balance.`
        });
        
        setIsAdjustConsumptionOpen(false);
        adjustConsumptionForm.reset();
    };

    const handleDeductFromDelivery = (userId: string, gallons: number) => {
        if (!firestore || !appUsers) return;
        const userToUpdate = appUsers.find(u => u.id === userId);
        if (!userToUpdate) return;
        
        const litersToDeduct = gallons * 3.785;
        const newTotal = (userToUpdate.totalConsumptionLiters || 0) - litersToDeduct;
        
        const userRef = doc(firestore, 'users', userId);
        updateDocumentNonBlocking(userRef, { totalConsumptionLiters: newTotal });

        toast({
            title: "Consumption Deducted",
            description: `${litersToDeduct.toLocaleString(undefined, {maximumFractionDigits: 2})} liters deducted from user's balance.`
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
            
            // Optimistically update local state for UI responsiveness
            setStationToUpdate(prev => prev ? { ...prev, permits: { ...prev.permits, [permitType]: downloadURL } } : null);

            toast({ title: 'Permit Attached', description: `A permit has been attached to the station.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload permit.' });
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
            
            toast({ title: "Proof Uploaded", description: `Proof for delivery ${deliveryToUpdate.id} attached.` });
            setDeliveryToUpdate(null);
        } catch (error) {
             toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload proof.' });
        }
    };

    const handleCreateDelivery = (values: NewDeliveryFormValues) => {
        if (!userForHistory || !firestore) return;

        const newDelivery: Omit<Delivery, 'id'> = {
            userId: userForHistory.id,
            date: values.date.toISOString(),
            volumeGallons: values.volumeGallons,
            status: 'Delivered',
        };

        const deliveriesRef = collection(firestore, 'users', userForHistory.id, 'deliveries');
        addDocumentNonBlocking(deliveriesRef)
          .then((docRef) => {
            if(docRef) {
              updateDocumentNonBlocking(docRef, {id: docRef.id});
            }
          });

        toast({ title: "Delivery Created", description: `Manual delivery has been added for ${userForHistory.name}.` });
        deliveryForm.reset();
        setIsCreateDeliveryOpen(false);
    };


    const adminUser = appUsers?.find(user => user.role === 'Admin');
    const totalUsers = appUsers?.length || 0;
    const activeUsers = appUsers?.filter(u => u.accountStatus === 'Active').length || 0;
    
    const filteredUsers = appUsers?.filter(user => {
        if (userFilter === 'all') return true;
        if (userFilter === 'active') return user.accountStatus === 'Active';
        if (userFilter === 'inactive') return user.accountStatus === 'Inactive';
        return true;
    }) || [];

    const handleFilterClick = (filter: 'all' | 'active' | 'inactive') => {
        setUserFilter(filter);
        setActiveTab('user-management');
    };

    const getLatestDelivery = (userId: string): Delivery | undefined => {
        if (!userDeliveriesData) return undefined;
        return userDeliveriesData
            .filter(d => d.userId === userId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    };
    
    const filteredDeliveries = (userDeliveriesData || []).filter(delivery => {
        if (!deliveryDateRange?.from) return true;
        const fromDate = deliveryDateRange.from;
        const toDate = deliveryDateRange.to || fromDate;
        const deliveryDate = new Date(delivery.date);
        return deliveryDate >= fromDate && deliveryDate <= toDate;
    });

    const handleDownloadDeliveries = () => {
        const headers = ["ID", "Date", "Volume (Gallons)", "Status", "Proof of Delivery URL"];
        const csvRows = [headers.join(',')];

        filteredDeliveries.forEach(delivery => {
            const row = [
                delivery.id,
                format(new Date(delivery.date), 'PP'),
                delivery.volumeGallons,
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
        toast({ title: "Download Started", description: "Delivery history is being downloaded." });
    };

    const latestUserDelivery = selectedUser ? getLatestDelivery(selectedUser.id) : null;

    const permitFields: { key: keyof WaterStation['permits'], label: string }[] = [
        { key: 'businessPermitUrl', label: 'Business / Mayor\'s Permit' },
        { key: 'sanitationPermitUrl', label: 'Sanitary Permit' },
    ];

    const complianceFields: { key: keyof WaterStation['permits'], label: string }[] = [
        { key: 'bacteriologicalTestUrl', label: 'Bacteriological' },
        { key: 'physicalChemicalTestUrl', label: 'Physical-Chemical' },
        { key: 'annualMonitoringUrl', label: 'Annual Monitoring' },
    ];

  if (usersLoading || stationsLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">{greeting}, {adminUser?.name || 'Admin'}!</h1>
        </div>

        <Dialog open={isUserDetailOpen} onOpenChange={setIsUserDetailOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>User Details</DialogTitle>
                    <DialogDescription>
                        Information for user ID: {selectedUser?.id}
                    </DialogDescription>
                </DialogHeader>
                {selectedUser && (
                     <div className="space-y-4 py-4">
                        <div className="flex items-center space-x-4">
                            <div>
                                <h4 className="font-semibold text-lg">{selectedUser.name}</h4>
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4 text-sm">
                             <div>
                                 <p className="font-medium text-muted-foreground">Account Status</p>
                                 <Badge variant={selectedUser.accountStatus === 'Active' ? 'default' : 'destructive'}>
                                     {selectedUser.accountStatus}
                                 </Badge>
                             </div>
                             <div>
                                 <p className="font-medium text-muted-foreground">Total Consumption</p>
                                 <p>{(selectedUser.totalConsumptionLiters || 0).toLocaleString()} Liters</p>
                             </div>
                             <div>
                                 <p className="font-medium text-muted-foreground">Role</p>
                                 <p>{selectedUser.role}</p>
                             </div>
                             <div>
                                 <p className="font-medium text-muted-foreground">Last Login</p>
                                 <p>{format(new Date(selectedUser.lastLogin), 'PP')}</p>
                             </div>
                             <div>
                                <p className="font-medium text-muted-foreground">Assigned Station</p>
                                <p>{waterStations?.find(ws => ws.id === selectedUser.assignedWaterStationId)?.name || 'Not Assigned'}</p>
                            </div>
                         </div>
                         <Separator className="my-4" />
                         <div className="flex flex-col space-y-2">
                             <Button variant="outline" onClick={() => { if(selectedUser) handleResetPassword(selectedUser.id)}}><KeyRound className="mr-2 h-4 w-4" /> Reset Password</Button>
                             <Button variant="destructive" className="mt-4"><Trash2 className="mr-2 h-4 w-4" /> Delete User</Button>
                         </div>
                    </div>
                )}
                <DialogFooter>
                    <Button onClick={() => setIsUserDetailOpen(false)}>Close</Button>
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
                    <Button onClick={() => setIsCreateDeliveryOpen(true)}>
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
                            {filteredDeliveries.map(delivery => {
                                const liters = delivery.volumeGallons * 3.785;
                                const bottles = Math.round(liters / 19);
                                return (
                                <TableRow key={delivery.id}>
                                    <TableCell>{delivery.id}</TableCell>
                                    <TableCell>{format(new Date(delivery.date), 'PP')}</TableCell>
                                    <TableCell>{liters.toLocaleString(undefined, {maximumFractionDigits: 0})}L / {bottles} bottles</TableCell>
                                    <TableCell>
                                         <Badge>
                                            {delivery.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {delivery.proofOfDeliveryUrl ? (
                                             <Button variant="link" size="sm" onClick={() => setSelectedProofUrl(delivery.proofOfDeliveryUrl || null)}>View</Button>
                                        ) : (
                                            <Button variant="outline" size="sm" onClick={() => setDeliveryToUpdate(delivery)}>
                                                <Upload className="mr-2 h-3 w-3"/>
                                                Upload
                                            </Button>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {delivery.status === 'Delivered' && userForHistory && (
                                            <Button size="sm" onClick={() => handleDeductFromDelivery(userForHistory.id, delivery.volumeGallons)}>
                                                Deduct
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )})}
                             {filteredDeliveries.length === 0 && (
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
                            name="referenceId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reference ID</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., MAN-001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={deliveryForm.control}
                            name="volumeGallons"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Volume (Gallons)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 5000" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={deliveryForm.control}
                            name="proofUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proof of Delivery (Optional URL)</FormLabel>
                                    <FormControl>
                                       <Input type="file" onChange={(e) => field.onChange(e.target.files?.[0])} />
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


        <Dialog open={isAdjustConsumptionOpen} onOpenChange={setIsAdjustConsumptionOpen_}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{adjustmentType === 'deduct' ? 'Deduct' : 'Add'} Consumption</DialogTitle>
                    <DialogDescription>
                        Manually {adjustmentType} water consumption for {selectedUser?.name}.
                    </DialogDescription>
                </DialogHeader>
                 {latestUserDelivery && adjustmentType === 'deduct' && (
                    <div className="rounded-md border bg-muted/50 p-3 text-sm my-4">
                        <h4 className="font-semibold flex items-center gap-2 mb-2"><Info className="h-4 w-4"/>Last Delivery Info</h4>
                        <p><strong>Date:</strong> {format(new Date(latestUserDelivery.date), 'PP')}</p>
                        <p><strong>Volume:</strong> {latestUserDelivery.volumeGallons} gallons ({(latestUserDelivery.volumeGallons * 3.785).toLocaleString(undefined, { maximumFractionDigits: 0 })} liters)</p>
                        <p><strong>Status:</strong> {latestUserDelivery.status}</p>
                         <Button
                            size="sm"
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => adjustConsumptionForm.setValue('amount', latestUserDelivery.volumeGallons * 3.785)}
                        >
                            Use this amount
                        </Button>
                    </div>
                )}
                <Form {...adjustConsumptionForm}>
                    <form onSubmit={adjustConsumptionForm.handleSubmit(handleAdjustConsumption)} className="space-y-4">
                        <FormField
                            control={adjustConsumptionForm.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Liters to {adjustmentType}</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 100" {...field} />
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:bg-muted" onClick={() => handleFilterClick('all')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalUsers}</div>
                </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted" onClick={() => handleFilterClick('active')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeUsers}</div>
                </CardContent>
            </Card>
            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                <DialogTrigger asChild>
                     <Card className="bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 flex flex-col justify-center items-center">
                        <CardHeader className="p-4 flex-row items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            <CardTitle className="text-lg font-bold">Generate Account</CardTitle>
                        </CardHeader>
                    </Card>
                </DialogTrigger>
                <DialogContent>
                     <DialogHeader>
                        <DialogTitle>Create a New User</DialogTitle>
                        <DialogDescription>
                            Fill in the details to create a new user account.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl><Input placeholder="Juan dela Cruz" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="businessName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Business Name</FormLabel>
                                    <FormControl><Input placeholder="Acme Inc." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="password" render={({ field }) => (
                                 <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input type={showPassword ? 'text' : 'password'} placeholder="******" {...field} />
                                            <Button size="icon" variant="ghost" type="button" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="role" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="User">User</SelectItem>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}/>
                            <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="secondary" className="bg-secondary text-secondary-foreground">Cancel</Button>
                                </DialogClose>
                                <Button type="submit" className="bg-primary text-primary-foreground">Create User</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="user-management">
             <Card>
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
                                        const latestDelivery = getLatestDelivery(user.id);
                                        return (
                                        <TableRow key={user.id}>
                                            <TableCell className="whitespace-nowrap">{user.id}</TableCell>
                                            <TableCell className="whitespace-nowrap">{user.businessName}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.accountStatus === 'Active' ? 'default' : 'destructive'}>
                                                    {user.accountStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{waterStations?.find(ws => ws.id === user.assignedWaterStationId)?.name || 'N/A'}</TableCell>
                                            <TableCell>
                                                <div onClick={() => { setUserForHistory(user); setIsDeliveryHistoryOpen(true); }} className="cursor-pointer">
                                                    <Badge variant={latestDelivery?.status === 'Delivered' ? 'default' : latestDelivery?.status === 'In Transit' ? 'secondary' : 'outline'}>
                                                        {latestDelivery?.status || 'No Delivery'}
                                                    </Badge>
                                                </div>
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
                                                            <UserCog className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsAssignStationOpen(true); }}>
                                                            <Building className="mr-2 h-4 w-4" />
                                                            Assign Station
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setSelectedUser(user); setAdjustmentType('add'); setIsAdjustConsumptionOpen_(true); }}>
                                                            <PlusCircle className="mr-2 h-4 w-4" />
                                                            Add Consumption
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setSelectedUser(user); setAdjustmentType('deduct'); setIsAdjustConsumptionOpen_(true); }}>
                                                            <MinusCircle className="mr-2 h-4 w-4" />
                                                            Deduct Consumption
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { if(user) handleResetPassword(user.id); }}>
                                                            <KeyRound className="mr-2 h-4 w-4" />
                                                            Reset Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                    {filteredUsers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center">No users found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         </div>
                    </TabsContent>
                    
                    <TabsContent value="water-stations">
                        <div className="flex justify-end mb-4">
                           <Button onClick={() => { setStationToUpdate(null); setIsStationProfileOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" />Create Station</Button>
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
                                    {waterStations?.map((station) => (
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
            </Card>
        </Tabs>
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
                                    <Button type="submit" size="sm">Save Changes</Button>
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
                                            <Button asChild type="button" variant="outline" size="sm" disabled={!stationToUpdate}>
                                                <Label className="cursor-pointer flex items-center">
                                                    <Upload className="mr-2 h-4 w-4" /> Upload
                                                    <Input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleAttachPermit(field.key, e.target.files[0])} />
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
                                                 <Button asChild type="button" variant="outline" size="sm" disabled={!stationToUpdate}>
                                                    <Label className="cursor-pointer flex items-center">
                                                        <Upload className="mr-2 h-4 w-4" /> Upload
                                                        <Input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleAttachPermit(field.key, e.target.files[0])} />
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
                            <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> View & Sign Agreement</Button>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="mt-4 pt-4 border-t">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={() => { setStationToUpdate(null); stationForm.reset();}}>Close</Button>
                    </DialogClose>
                    {!stationToUpdate && (
                        <Button onClick={stationForm.handleSubmit(handleSaveStation)}>Create Station</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
