'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AppUser, WaterStation, Payment } from '@/lib/types';
import { FileText, Eye, ArrowUp, ArrowDown, Repeat, Plus, Trash2, Mail, ShieldCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Timestamp, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { format } from 'date-fns';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

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

interface OverviewTabProps {
    user: AppUser;
    allUsers: AppUser[];
    waterStations: WaterStation[];
    consumedLitersThisMonth: number;
    consumptionComparison: { percentageChange: number; changeType: string; };
    currentMonthInvoice: Payment | null;
    contractFile: File | null;
    isUploadingContract: boolean;
    uploadProgress: number;
    onAssignStation: (stationId: string) => void;
    onContractFileChange: (file: File | null) => void;
    onContractUpload: () => void;
    onSetIsYearlyConsumptionOpen: (isOpen: boolean) => void;
    onAssignParent: (parentId: string) => void;
    onSetIsChangePlanOpen: (isOpen: boolean) => void;
}

export function OverviewTab({
    user,
    allUsers,
    waterStations,
    consumedLitersThisMonth,
    consumptionComparison,
    currentMonthInvoice,
    contractFile,
    isUploadingContract,
    uploadProgress,
    onAssignStation,
    onContractFileChange,
    onContractUpload,
    onSetIsYearlyConsumptionOpen,
    onAssignParent,
    onSetIsChangePlanOpen,
}: OverviewTabProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newNotifEmail, setNewNotifEmail] = useState('');
    const [isUpdatingEmails, setIsUpdatingEmails] = useState(false);

    const planDetails = user.customPlanDetails || {};
    const monthlyPlanLiters = planDetails.litersPerMonth || 0;
    const bonusLiters = planDetails.bonusLiters || 0;
    const rolloverLiters = user.customPlanDetails?.lastMonthRollover || 0;
    const totalAllocation = monthlyPlanLiters + bonusLiters + rolloverLiters;
    const availableLiters = totalAllocation - consumedLitersThisMonth;

    const handleAddNotifEmail = async () => {
        if (!newNotifEmail || !newNotifEmail.includes('@') || !firestore) {
            toast({ variant: 'destructive', title: 'Invalid Email' });
            return;
        }
        setIsUpdatingEmails(true);
        try {
            const userRef = doc(firestore, 'users', user.id);
            await updateDoc(userRef, { notificationEmails: arrayUnion(newNotifEmail.trim().toLowerCase()) });
            setNewNotifEmail('');
            toast({ title: 'Recipient Added' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        } finally {
            setIsUpdatingEmails(false);
        }
    };

    const handleRemoveNotifEmail = async (email: string) => {
        if (!firestore) return;
        setIsUpdatingEmails(true);
        try {
            const userRef = doc(firestore, 'users', user.id);
            await updateDoc(userRef, { notificationEmails: arrayRemove(email) });
            toast({ title: 'Recipient Removed' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        } finally {
            setIsUpdatingEmails(false);
        }
    };

    return (
        <div className="relative px-8">
            <Carousel className="w-full">
                <CarouselContent>
                    <CarouselItem>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-1">
                            {/* Identity Card */}
                            <Card className="border-none shadow-sm bg-muted/20">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Client Profile</CardTitle>
                                    <Badge variant={user.accountType === 'Parent' ? 'default' : user.accountType === 'Branch' ? 'secondary' : 'outline'} className="shadow-sm">
                                        {user.accountType || 'Single Account'}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                                            <AvatarImage src={user.photoURL || undefined} alt={user.name} />
                                            <AvatarFallback className="text-xl font-bold">{user.businessName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="text-lg font-bold leading-none">{user.businessName}</h3>
                                            <p className="text-sm text-muted-foreground mt-1.5">{user.name} • <span className="font-mono text-xs">{user.clientId}</span></p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-y-3 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Business Contact</span>
                                            <p className="font-medium">{user.email}</p>
                                            <p className="text-muted-foreground">{user.contactNumber}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 pt-1">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Service Address</span>
                                            <p className="text-muted-foreground line-clamp-2">{user.address}</p>
                                        </div>
                                        {user.accountType === 'Branch' && (
                                            <div className="pt-2 border-t mt-2">
                                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Linked Parent Account</Label>
                                                {user.parentId ? (
                                                    <p className="font-bold text-primary flex items-center gap-1 mt-1">
                                                        <ShieldCheck className="h-3 w-3" />
                                                        {allUsers.find(u => u.id === user.parentId)?.businessName || 'Parent Account'}
                                                    </p>
                                                ) : (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Select onValueChange={onAssignParent}>
                                                            <SelectTrigger className="w-full h-8 text-xs bg-background">
                                                                <SelectValue placeholder="Assign a Parent..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {allUsers.filter(u => u.accountType === 'Parent').map(parent => (
                                                                    <SelectItem key={parent.id} value={parent.id}>{parent.businessName} ({parent.clientId})</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Monthly Snapshot Card */}
                            <Card className="flex flex-col border-none shadow-sm bg-gradient-to-br from-blue-50 to-white">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">This Month's Activity</CardTitle>
                                    <CardDescription className="text-xs">Live usage and estimated overhead.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 flex-1">
                                    <div className="p-4 rounded-xl bg-white/60 border border-white shadow-sm">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estimated Overhead ({format(new Date(), 'MMMM')})</Label>
                                        <p className="text-3xl font-extrabold text-blue-900 mt-1">₱{currentMonthInvoice?.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 pt-2">
                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Water Credits</Label>
                                                {user.plan?.isConsumptionBased || user.accountType === 'Branch' ? (
                                                    <p className="text-xl font-bold mt-1">Unlimited</p>
                                                ) : (
                                                    <div className="mt-1">
                                                        <p className="text-xl font-bold">{availableLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-medium text-muted-foreground">L</span></p>
                                                        <Progress value={(availableLiters / totalAllocation) * 100} className="h-1 mt-2 bg-blue-100" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Liters Consumed</Label>
                                                <p className="text-xl font-bold mt-1">{consumedLitersThisMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-medium text-muted-foreground">L</span></p>
                                                <div className={cn(
                                                    "flex items-center text-[10px] font-bold uppercase mt-1",
                                                    consumptionComparison.changeType === 'increase' && 'text-red-500',
                                                    consumptionComparison.changeType === 'decrease' && 'text-green-500',
                                                )}>
                                                    {consumptionComparison.changeType === 'increase' ? <ArrowUp className="h-3 w-3 mr-0.5" /> : <ArrowDown className="h-3 w-3 mr-0.5" />}
                                                    <span>{consumptionComparison.percentageChange.toFixed(0)}% vs last month</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0">
                                     <Button variant="outline" size="sm" className="w-full h-8 text-[10px] font-bold uppercase tracking-widest bg-white/50 hover:bg-white transition-colors shadow-sm" onClick={() => onSetIsYearlyConsumptionOpen(true)}>
                                        Full Consumption History
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </CarouselItem>

                    <CarouselItem>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-1">
                            {/* Email Automation Recipients */}
                            <Card className="flex flex-col border-none shadow-sm">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Mail className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold uppercase tracking-wider">Automated Notifications</CardTitle>
                                            <CardDescription className="text-xs">Recipients for billing and delivery alerts.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1">
                                    <div className="flex gap-2">
                                        <Input 
                                            placeholder="accounting@client.com" 
                                            value={newNotifEmail}
                                            onChange={(e) => setNewNotifEmail(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddNotifEmail()}
                                            disabled={isUpdatingEmails}
                                            className="h-9 text-sm"
                                        />
                                        <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleAddNotifEmail} disabled={isUpdatingEmails || !newNotifEmail}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Broadcasters</Label>
                                        <div className="rounded-lg border bg-muted/10 max-h-40 overflow-y-auto scrollbar-thin">
                                            {user.notificationEmails && user.notificationEmails.length > 0 ? (
                                                <ul className="divide-y">
                                                    {user.notificationEmails.map((email) => (
                                                        <li key={email} className="flex items-center justify-between p-2.5 text-sm group hover:bg-muted/30 transition-colors">
                                                            <span className="truncate font-medium">{email}</span>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => handleRemoveNotifEmail(email)}
                                                                disabled={isUpdatingEmails}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="p-8 flex flex-col items-center justify-center text-center gap-2 opacity-50">
                                                    <Info className="h-6 w-6" />
                                                    <p className="text-[10px] font-medium leading-relaxed">No specific recipients set. Notifications default to the primary login email.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-2 bg-muted/10 rounded-b-lg">
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">Adding recipients here replaces the primary login email for all automated broadcast triggers.</p>
                                </CardFooter>
                            </Card>

                            {/* Plan & Station Management */}
                            <Card className="border-none shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Repeat className="h-4 w-4 text-primary" />
                                        </div>
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider">Plan & Fulfillment</CardTitle>
                                    </div>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => onSetIsChangePlanOpen(true)}>
                                        Immediate Switch
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="p-3 rounded-lg border bg-background">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Active Plan</Label>
                                        <p className="font-bold text-sm mt-1">{user.plan?.name || 'Manual Plan Selection Required'}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{user.plan?.isConsumptionBased ? 'Consumption-based pricing' : 'Set monthly allocation'}</p>
                                    </div>
                                    <div className="space-y-2 pt-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assigned Fulfillment Station</Label>
                                        <Select onValueChange={onAssignStation} defaultValue={user.assignedWaterStationId}>
                                            <SelectTrigger className="w-full bg-background">
                                                <SelectValue placeholder="Assign a station..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(waterStations || []).map(station => (
                                                    <SelectItem key={station.id} value={station.id}>{station.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground italic">Fulfillment station updates are applied instantly to the next delivery dispatch.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CarouselItem>

                    <CarouselItem>
                        <div className="grid grid-cols-1 gap-6 p-1">
                            {/* Contract Management Card */}
                            <Card className="border-none shadow-sm overflow-hidden">
                                <CardHeader className="bg-primary/5 pb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <FileText className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold">Partnership Contract</CardTitle>
                                            <CardDescription>Legal agreement and terms of service documentation.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="flex flex-col md:flex-row items-center gap-6">
                                        <div className="flex-1 w-full p-6 rounded-xl border-2 border-dashed bg-muted/10 flex flex-col items-center justify-center text-center gap-3">
                                            {user.currentContractUrl ? (
                                                <>
                                                    <div className="p-3 rounded-full bg-green-50 text-green-600 shadow-sm border border-green-100">
                                                        <ShieldCheck className="h-8 w-8" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">Contract Verified & Active</p>
                                                        <p className="text-xs text-muted-foreground mt-1">Uploaded: {user.contractUploadedDate ? format(toSafeDate(user.contractUploadedDate)!, 'PPP') : 'N/A'}</p>
                                                    </div>
                                                    <Button asChild variant="outline" size="sm" className="mt-2 h-8 px-6 text-xs uppercase font-bold tracking-widest bg-white shadow-sm hover:bg-white/80">
                                                        <a href={user.currentContractUrl} target="_blank" rel="noopener noreferrer"><Eye className="mr-2 h-4 w-4" /> Open Document</a>
                                                    </Button>
                                                </>
                                            ) : (
                                                <div className="py-4">
                                                    <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No Contract on File</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 w-full space-y-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Upload Signed Contract</Label>
                                                <div className="flex gap-2">
                                                    <Input type="file" onChange={(e) => onContractFileChange(e.target.files?.[0] || null)} disabled={isUploadingContract} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="h-9 text-xs bg-muted/5 border-muted-foreground/20" />
                                                    <Button onClick={onContractUpload} disabled={!contractFile || isUploadingContract} size="sm" className="h-9 shadow-sm">
                                                        {isUploadingContract ? 'Processing...' : 'Upload'}
                                                    </Button>
                                                </div>
                                            </div>
                                            {isUploadingContract && (
                                                <div className="space-y-1">
                                                    <Progress value={uploadProgress} className="h-1 bg-blue-100" />
                                                    <p className="text-[10px] text-right font-medium text-primary uppercase tracking-widest">{uploadProgress.toFixed(0)}% uploaded</p>
                                                </div>
                                            )}
                                            <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-100/50 flex gap-3 items-start">
                                                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-amber-800/80 leading-relaxed font-medium uppercase tracking-tight">
                                                    Ensure the document includes the company seal and wet signatures of both authorized representatives for legal compliance.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CarouselItem>
                </CarouselContent>
                <CarouselPrevious className="absolute -left-10 top-1/2 -translate-y-1/2 hidden sm:flex h-10 w-10 border-none shadow-md bg-white hover:bg-blue-50 text-primary transition-all" />
                <CarouselNext className="absolute -right-10 top-1/2 -translate-y-1/2 hidden sm:flex h-10 w-10 border-none shadow-md bg-white hover:bg-blue-50 text-primary transition-all" />
            </Carousel>
        </div>
    );
}
