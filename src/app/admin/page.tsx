
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { appUsers as initialAppUsers, loginLogs, feedbackLogs as initialFeedbackLogs, deliveries as initialDeliveries, waterStations as initialWaterStations } from '@/lib/data';
import { UserCog, UserPlus, KeyRound, Trash2, ShieldCheck, MoreHorizontal, Users, Handshake, LogIn, Eye, EyeOff, FileText, Users2, UserCheck, FileClock, MessageSquare, Star, Truck, Package, PackageCheck, History, Edit, Paperclip, Building, Upload, MinusCircle, Info, Download, Calendar as CalendarIcon, PlusCircle } from 'lucide-react';
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
import type { AppUser, Feedback, Delivery, WaterStation } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';

const newUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Admin', 'User']),
});

type NewUserFormValues = z.infer<typeof newUserSchema>;

interface InvoiceRequest {
  id: string;
  userName: string;
  userId: string;
  dateRange: string;
  status: 'Pending' | 'Sent';
}

const adjustConsumptionSchema = z.object({
    amount: z.coerce.number().min(0, 'Amount must be a positive number'),
});
type AdjustConsumptionFormValues = z.infer<typeof adjustConsumptionSchema>;


export default function AdminPage() {
    const [appUsers, setAppUsers] = useState<AppUser[]>([]);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [greeting, setGreeting] = useState('');
    const [invoiceRequests, setInvoiceRequests] = useState<InvoiceRequest[]>([]);
    const { toast } = useToast();
    const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isDeliveryHistoryOpen, setIsDeliveryHistoryOpen] = useState(false);
    const [userForHistory, setUserForHistory] = useState<AppUser | null>(null);
    const [activeTab, setActiveTab] = useState('user-management');
    const [userFilter, setUserFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [feedbackLogs, setFeedbackLogs] = useState<Feedback[]>(initialFeedbackLogs);
    const [waterStations, setWaterStations] = useState<WaterStation[]>(initialWaterStations);
    const [stationToUpdate, setStationToUpdate] = useState<WaterStation | null>(null);
    const [isAdjustConsumptionOpen, setIsAdjustConsumptionOpen] = useState(false);
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct'>('deduct');
    const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
    const [deliveryToUpdate, setDeliveryToUpdate] = useState<Delivery | null>(null);
    const [deliveryDateRange, setDeliveryDateRange] = React.useState<DateRange | undefined>()

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
        const storedUsers = localStorage.getItem('appUsers');
        const users = storedUsers ? JSON.parse(storedUsers) : initialAppUsers;

        const onboardingDataString = localStorage.getItem('onboardingData');
        if (onboardingDataString) {
            const onboardingData = JSON.parse(onboardingDataString);
            const userExists = users.some((u: AppUser) => u.id === onboardingData.formData.clientId);

            if (!userExists) {
                const newUserFromOnboarding: AppUser = {
                    id: onboardingData.formData.clientId,
                    name: onboardingData.formData.fullName,
                    totalConsumptionLiters: 0,
                    accountStatus: 'Active',
                    lastLogin: new Date().toISOString(),
                    role: 'User'
                };
                users.push(newUserFromOnboarding);
            }
        }
        setAppUsers(users);

        const storedRequests = localStorage.getItem('invoiceRequests');
        if (storedRequests) {
            setInvoiceRequests(JSON.parse(storedRequests));
        }

        const storedFeedback = localStorage.getItem('feedbackLogs');
        if (storedFeedback) {
            setFeedbackLogs(JSON.parse(storedFeedback));
        } else {
            localStorage.setItem('feedbackLogs', JSON.stringify(initialFeedbackLogs));
        }
        
        const storedWaterStations = localStorage.getItem('waterStations');
        if (storedWaterStations) {
            setWaterStations(JSON.parse(storedWaterStations));
        } else {
            localStorage.setItem('waterStations', JSON.stringify(initialWaterStations));
        }

        const storedDeliveries = localStorage.getItem('deliveries');
        if (storedDeliveries) {
            setDeliveries(JSON.parse(storedDeliveries));
        } else {
            localStorage.setItem('deliveries', JSON.stringify(initialDeliveries));
        }

    }, []);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) {
            setGreeting('Good morning');
        } else if (hour < 18) {
            setGreeting('Good afternoon');
        } else {
            setGreeting('Good evening');
        }
    }, []);

    const form = useForm<NewUserFormValues>({
        resolver: zodResolver(newUserSchema),
        defaultValues: {
            name: '',
            password: '',
            role: 'User',
        },
    });

    const adjustConsumptionForm = useForm<AdjustConsumptionFormValues>({
        resolver: zodResolver(adjustConsumptionSchema),
        defaultValues: {
            amount: 0,
        },
    });

    const handleCreateUser = (values: NewUserFormValues) => {
        const newUser: AppUser = {
            id: `USR-${String(appUsers.length + 1).padStart(3, '0')}`,
            ...values,
            totalConsumptionLiters: 0,
            accountStatus: 'Active' as 'Active' | 'Inactive',
            lastLogin: new Date().toISOString(),
        };
        const updatedUsers = [...appUsers, newUser];
        setAppUsers(updatedUsers);
        localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
        form.reset();
        setIsCreateUserOpen(false);
        toast({
            title: 'User Created',
            description: `User ${newUser.name} has been created successfully.`,
        });
    };
    
    const handleResetPassword = (userId: string) => {
        const newPassword = Math.random().toString(36).slice(-8);
        const updatedUsers = appUsers.map(user => 
            user.id === userId ? { ...user, password: newPassword } : user
        );
        setAppUsers(updatedUsers);
        localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
        toast({
            title: "Password Reset",
            description: `New password for ${selectedUser?.name} is: ${newPassword}`,
        });
    };

    const handleAdjustConsumption = (values: AdjustConsumptionFormValues) => {
        if (!selectedUser) return;

        const amount = adjustmentType === 'deduct' ? values.amount : -values.amount;

        const updatedUsers = appUsers.map(user => 
            user.id === selectedUser.id 
            ? { ...user, totalConsumptionLiters: user.totalConsumptionLiters + amount } 
            : user
        );
        setAppUsers(updatedUsers);
        localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
        
        toast({
            title: `Consumption ${adjustmentType === 'deduct' ? 'Deducted' : 'Added'}`,
            description: `${values.amount.toLocaleString()} liters ${adjustmentType === 'deduct' ? 'deducted from' : 'added to'} ${selectedUser.name}'s balance.`
        });
        
        setIsAdjustConsumptionOpen(false);
        adjustConsumptionForm.reset();
    };

    const handleDeductFromDelivery = (userId: string, gallons: number) => {
        const litersToDeduct = gallons * 3.785;
        const updatedUsers = appUsers.map(user => 
            user.id === userId
            ? { ...user, totalConsumptionLiters: user.totalConsumptionLiters + litersToDeduct }
            : user
        );
        setAppUsers(updatedUsers);
        localStorage.setItem('appUsers', JSON.stringify(updatedUsers));

        toast({
            title: "Consumption Deducted",
            description: `${litersToDeduct.toLocaleString(undefined, {maximumFractionDigits: 2})} liters deducted from user's balance based on delivery.`
        })
    };

    const handleToggleFeedbackRead = (feedbackId: string) => {
        const updatedFeedback = feedbackLogs.map(fb => 
            fb.id === feedbackId ? { ...fb, read: !fb.read } : fb
        );
        setFeedbackLogs(updatedFeedback);
        localStorage.setItem('feedbackLogs', JSON.stringify(updatedFeedback));
    };

    const handleAttachPermit = () => {
        if (!stationToUpdate) return;
        const samplePermitUrl = 'https://firebasestorage.googleapis.com/v0/b/digital-wallet-napas.appspot.com/o/permit-sample.jpg?alt=media&token=c8b2512a-3636-4c44-884c-354336c9d2f6';

        const updatedStations = waterStations.map(station =>
            station.id === stationToUpdate.id ? { ...station, permitUrl: samplePermitUrl } : station
        );

        setWaterStations(updatedStations);
        localStorage.setItem('waterStations', JSON.stringify(updatedStations));

        toast({
            title: 'Permit Attached',
            description: `A sample permit has been attached to station ${stationToUpdate.name}.`,
        });
        setStationToUpdate(null);
    };

    const handleUploadProof = () => {
        if (!deliveryToUpdate) return;
        const sampleProofUrl = 'https://firebasestorage.googleapis.com/v0/b/digital-wallet-napas.appspot.com/o/proof-of-delivery-sample.jpg?alt=media&token=29994c64-7f21-4f10-9110-3889146522c7';
        
        const updatedDeliveries = deliveries.map(d => 
            d.id === deliveryToUpdate.id ? { ...d, proofOfDeliveryUrl: sampleProofUrl } : d
        );
        setDeliveries(updatedDeliveries);
        localStorage.setItem('deliveries', JSON.stringify(updatedDeliveries));
        
        toast({
            title: "Proof Uploaded",
            description: `Proof of delivery for ${deliveryToUpdate.id} has been attached.`,
        });
        
        setDeliveryToUpdate(null);
    };


    const adminUser = appUsers.find(user => user.role === 'Admin');

    const totalUsers = appUsers.length;
    const activeUsers = appUsers.filter(u => u.accountStatus === 'Active').length;
    const unreadFeedback = feedbackLogs.filter(fb => !fb.read).length;

    const filteredUsers = appUsers.filter(user => {
        if (userFilter === 'all') return true;
        if (userFilter === 'active') return user.accountStatus === 'Active';
        if (userFilter === 'inactive') return user.accountStatus === 'Inactive';
        return true;
    });

    const handleFilterClick = (filter: 'all' | 'active' | 'inactive') => {
        setUserFilter(filter);
        setActiveTab('user-management');
    };

    const getLatestDelivery = (userId: string): Delivery | undefined => {
        return deliveries
            .filter(d => d.userId === userId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    };

    const getStatusInfo = (status: Delivery['status'] | undefined) => {
        if (!status) return { variant: 'outline', icon: null, label: 'No Deliveries' };
        switch (status) {
            case 'Delivered':
                return { variant: 'default', icon: PackageCheck, label: 'Delivered' };
            case 'In Transit':
                return { variant: 'secondary', icon: Truck, label: 'In Transit' };
            case 'Pending':
                return { variant: 'outline', icon: Package, label: 'Pending' };
            default:
                return { variant: 'outline', icon: null, label: 'No Deliveries' };
        }
    };
    
    const userDeliveries = userForHistory 
        ? deliveries
            .filter(d => d.userId === userForHistory.id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) 
        : [];
    
    const filteredDeliveries = userDeliveries.filter(delivery => {
        if (!deliveryDateRange?.from) return true;
        const fromDate = deliveryDateRange.from;
        const toDate = deliveryDateRange.to || fromDate;
        const deliveryDate = new Date(delivery.date);
        return deliveryDate >= fromDate && deliveryDate <= toDate;
    });

    const handleDownloadDeliveries = () => {
        const headers = ["ID", "Date", "Volume (Liters)", "Bottles", "Status", "Proof of Delivery URL"];
        const csvRows = [headers.join(',')];

        filteredDeliveries.forEach(delivery => {
            const liters = delivery.volumeGallons * 3.785;
            const bottles = Math.round(liters / 19);
            const row = [
                delivery.id,
                format(new Date(delivery.date), 'PP'),
                liters.toFixed(2),
                bottles,
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
                                 <p>{selectedUser.totalConsumptionLiters.toLocaleString()} Liters</p>
                             </div>
                             <div>
                                 <p className="font-medium text-muted-foreground">Role</p>
                                 <p>{selectedUser.role}</p>
                             </div>
                             <div>
                                 <p className="font-medium text-muted-foreground">Last Login</p>
                                 <p>{format(new Date(selectedUser.lastLogin), 'PP')}</p>
                             </div>
                         </div>
                         <Separator className="my-4" />
                         <div className="flex flex-col space-y-2">
                             <Button variant="outline" onClick={() => handleResetPassword(selectedUser.id)}><KeyRound className="mr-2 h-4 w-4" /> Reset Password</Button>
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
                    <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Delivery History for {userForHistory?.name}</DialogTitle>
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
                                const statusInfo = getStatusInfo(delivery.status);
                                const liters = delivery.volumeGallons * 3.785;
                                const bottles = Math.round(liters / 19);
                                return (
                                <TableRow key={delivery.id}>
                                    <TableCell>{delivery.id}</TableCell>
                                    <TableCell>{format(new Date(delivery.date), 'PP')}</TableCell>
                                    <TableCell>{liters.toLocaleString(undefined, {maximumFractionDigits: 0})}L / {bottles} bottles</TableCell>
                                    <TableCell>
                                         <Badge variant={statusInfo.variant} className={cn(
                                            statusInfo.variant === 'default' && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
                                            statusInfo.variant === 'secondary' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
                                            statusInfo.variant === 'outline' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                        )}>
                                            {statusInfo.label}
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
                    <Input type="file" />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setDeliveryToUpdate(null)}>Cancel</Button>
                    <Button onClick={handleUploadProof}>Upload</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        <Dialog open={isAdjustConsumptionOpen} onOpenChange={setIsAdjustConsumptionOpen}>
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


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
             <Card className="cursor-pointer hover:bg-muted" onClick={() => setActiveTab('feedback')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unread Feedback</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{unreadFeedback}</div>
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
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl><Input placeholder="Juan dela Cruz" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
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
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
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
                                )}
                            />
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
                     <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                        <TabsTrigger value="user-management"><Users className="mr-2 h-4 w-4"/>User Management</TabsTrigger>
                        <TabsTrigger value="feedback"><MessageSquare className="mr-2 h-4 w-4" />Feedback</TabsTrigger>
                        <TabsTrigger value="water-stations"><Building className="mr-2 h-4 w-4" />Water Stations</TabsTrigger>
                    </TabsList>
                </CardHeader>
                 <CardContent>
                    <TabsContent value="user-management">
                         <div className="overflow-x-auto">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last Login</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Delivery Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => {
                                        const latestDelivery = getLatestDelivery(user.id);
                                        const statusInfo = getStatusInfo(latestDelivery?.status);
                                        const StatusIcon = statusInfo.icon;
                                        return (
                                        <TableRow key={user.id}>
                                            <TableCell className="whitespace-nowrap">{user.id}</TableCell>
                                            <TableCell className="whitespace-nowrap">{user.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.accountStatus === 'Active' ? 'default' : 'destructive'}>
                                                    {user.accountStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{format(new Date(user.lastLogin), 'PP')}</TableCell>
                                            <TableCell>{user.role}</TableCell>
                                            <TableCell>
                                                <div onClick={() => { setUserForHistory(user); setIsDeliveryHistoryOpen(true); }} className="cursor-pointer">
                                                    <Badge variant={statusInfo.variant} className={cn(
                                                        'w-full justify-center',
                                                        statusInfo.variant === 'default' && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
                                                        statusInfo.variant === 'secondary' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
                                                        statusInfo.variant === 'outline' && latestDelivery && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                                    )}>
                                                        {StatusIcon && <StatusIcon className="mr-1 h-3 w-3" />}
                                                        {statusInfo.label}
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
                                                        <DropdownMenuItem onClick={() => { setSelectedUser(user); setAdjustmentType('add'); setIsAdjustConsumptionOpen(true); }}>
                                                            <PlusCircle className="mr-2 h-4 w-4" />
                                                            Add Consumption
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setSelectedUser(user); setAdjustmentType('deduct'); setIsAdjustConsumptionOpen(true); }}>
                                                            <MinusCircle className="mr-2 h-4 w-4" />
                                                            Deduct Consumption
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                                            Assign Permissions
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setSelectedUser(user); handleResetPassword(user.id); }}>
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
                    
                     <TabsContent value="feedback">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Rating</TableHead>
                                        <TableHead>Feedback</TableHead>
                                        <TableHead className="text-center">Read</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {feedbackLogs.map((fb) => (
                                        <TableRow key={fb.id}>
                                            <TableCell className="font-medium">{fb.userName}</TableCell>
                                            <TableCell>{format(new Date(fb.timestamp), 'PPpp')}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={cn(
                                                                'h-4 w-4',
                                                                i < fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-sm whitespace-pre-wrap">{fb.feedback}</TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={fb.read}
                                                    onCheckedChange={() => handleToggleFeedbackRead(fb.id)}
                                                    aria-label="Mark as read"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {feedbackLogs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center">No feedback yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                    <TabsContent value="water-stations">
                        <div className="overflow-x-auto">
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Station ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Permit Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {waterStations.map((station) => (
                                        <TableRow key={station.id}>
                                            <TableCell>{station.id}</TableCell>
                                            <TableCell>{station.name}</TableCell>
                                            <TableCell>{station.location}</TableCell>
                                            <TableCell>
                                                <Badge variant={station.permitUrl && station.permitUrl !== '#' ? 'default' : 'outline'}
                                                  className={station.permitUrl && station.permitUrl !== '#' ? 'bg-green-100 text-green-800' : ''}
                                                >
                                                    {station.permitUrl && station.permitUrl !== '#' ? 'Attached' : 'Missing'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Dialog onOpenChange={(open) => !open && setStationToUpdate(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" onClick={() => setStationToUpdate(station)}>
                                                            <Paperclip className="mr-2 h-4 w-4"/>
                                                            Attach Permit
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-md">
                                                        <DialogHeader>
                                                            <DialogTitle>Attach Permit for {station.name}</DialogTitle>
                                                            <DialogDescription>
                                                                Upload the permit document for this water station.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                                                <Label htmlFor="permit-file">Permit File</Label>
                                                                <Input id="permit-file" type="file" />
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <DialogClose asChild>
                                                                <Button type="button" variant="secondary">Cancel</Button>
                                                            </DialogClose>
                                                          
                                                            <Button type="button" onClick={handleAttachPermit}>
                                                                <Upload className="mr-2 h-4 w-4" />
                                                                Attach
                                                            </Button>
                                                            
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
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
    </div>
  );
}


    