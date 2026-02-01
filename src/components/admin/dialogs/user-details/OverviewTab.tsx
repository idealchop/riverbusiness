'use client';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AppUser, WaterStation, Payment } from '@/lib/types';
import { FileText, Eye, ArrowUp, ArrowDown, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

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
    onSetIsChangePlanOpen,
}: OverviewTabProps) {

    const planDetails = user.customPlanDetails || {};
    const monthlyPlanLiters = planDetails.litersPerMonth || 0;
    const bonusLiters = planDetails.bonusLiters || 0;
    const rolloverLiters = user.customPlanDetails?.lastMonthRollover || 0;
    const totalAllocation = monthlyPlanLiters + bonusLiters + rolloverLiters;
    const availableLiters = totalAllocation - consumedLitersThisMonth;

    return (
        <div className="relative px-8">
            <Carousel className="w-full">
                <CarouselContent>
                    <CarouselItem>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-1">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Client Profile</CardTitle>
                                    <Badge variant={user.accountType === 'Parent' ? 'default' : user.accountType === 'Branch' ? 'secondary' : 'outline'}>{user.accountType || 'Single'}</Badge>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-16 w-16">
                                            <AvatarImage src={user.photoURL || undefined} alt={user.name} />
                                            <AvatarFallback>{user.businessName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="text-lg font-semibold">{user.businessName}</h3>
                                            <p className="text-sm text-muted-foreground">{user.name} - {user.clientId}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-y-2 text-sm pt-4">
                                        <div><span className="font-medium text-muted-foreground">Email:</span> {user.email}</div>
                                        <div><span className="font-medium text-muted-foreground">Contact:</span> {user.contactNumber}</div>
                                        <div><span className="font-medium text-muted-foreground">Address:</span> {user.address}</div>
                                        {user.accountType === 'Branch' && user.parentId && <div><span className="font-medium text-muted-foreground">Parent Account:</span> {allUsers.find(u => u.id === user.parentId)?.businessName || 'N/A'}</div>}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>Current Month Snapshot</CardTitle>
                                    <CardDescription>A real-time look at this month's activity.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1">
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Estimated Bill</Label>
                                        <p className="text-2xl font-bold">₱{currentMonthInvoice?.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
                                    </div>
                                    <div className="border-t pt-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm text-muted-foreground">Monthly Water Credits</Label>
                                            {user.plan?.isConsumptionBased || user.accountType === 'Branch' ? (
                                                <>
                                                    <p className="text-xl font-bold">N/A</p>
                                                    <p className="text-xs text-muted-foreground">Not applicable for flow plans.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-xl font-bold">
                                                        {availableLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })} L
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        from {totalAllocation.toLocaleString(undefined, { maximumFractionDigits: 0 })} L total
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            <Label className="text-sm text-muted-foreground">Consumption</Label>
                                            <p className="text-xl font-bold">{consumedLitersThisMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })} L</p>
                                            <div className={cn(
                                                "flex items-center text-xs",
                                                consumptionComparison.changeType === 'increase' && 'text-red-500',
                                                consumptionComparison.changeType === 'decrease' && 'text-green-500',
                                            )}>
                                                {consumptionComparison.changeType === 'increase' && <ArrowUp className="h-4 w-4" />}
                                                {consumptionComparison.changeType === 'decrease' && <ArrowDown className="h-4 w-4" />}
                                                <span>{consumptionComparison.percentageChange.toFixed(0)}% vs last month</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                     <Button variant="outline" size="sm" className="w-full" onClick={() => onSetIsYearlyConsumptionOpen(true)}>
                                        View Consumption History
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </CarouselItem>
                    <CarouselItem>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-1">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Plan & Station</CardTitle>
                                    <Button variant="outline" size="sm" onClick={() => onSetIsChangePlanOpen(true)}>
                                        <Edit className="mr-2 h-4 w-4" /> Change Plan
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h4 className="font-medium">Current Plan</h4>
                                        <p className="text-sm text-muted-foreground">{user.plan?.name || 'Not set'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Assigned Water Station</Label>
                                        <Select onValueChange={onAssignStation} defaultValue={user.assignedWaterStationId}>
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
                                                <FileText className="h-6 w-6" />
                                                <div className="flex-1">
                                                    <p>Contract on File</p>
                                                    <p className="text-xs text-muted-foreground">Uploaded on: {user.contractUploadedDate ? toSafeDate(user.contractUploadedDate)?.toLocaleDateString() : 'N/A'}</p>
                                                </div>
                                                <Button asChild variant="outline">
                                                    <a href={user.currentContractUrl} target="_blank" rel="noopener noreferrer"><Eye className="mr-2 h-4 w-4" /> View</a>
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="text-center w-full text-muted-foreground text-sm">No contract uploaded.</div>
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <Label>Upload New/Updated Contract</Label>
                                        <div className="flex gap-2">
                                            <Input type="file" onChange={(e) => onContractFileChange(e.target.files?.[0] || null)} disabled={isUploadingContract} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                                            <Button onClick={onContractUpload} disabled={!contractFile || isUploadingContract}>{isUploadingContract ? 'Uploading...' : 'Upload'}</Button>
                                        </div>
                                        {isUploadingContract && <Progress value={uploadProgress} className="mt-2" />}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CarouselItem>
                </CarouselContent>
                <CarouselPrevious className="absolute -left-8 top-1/2 -translate-y-1/2 hidden sm:flex" />
                <CarouselNext className="absolute -right-8 top-1/2 -translate-y-1/2 hidden sm:flex" />
            </Carousel>
        </div>
    );
}
