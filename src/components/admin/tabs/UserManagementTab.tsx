'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, BellRing, Search, AlertTriangle, Filter, MoreHorizontal, ChevronRight, Building, Repeat, Clock, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppUser, RefillRequest, Payment } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useAuth } from '@/firebase';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { PaymentReviewDialog } from '../dialogs/user-details/PaymentReviewDialog';
import { createClientNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { dispatchWindowLabel } from '@/lib/refill-display';

const toSafeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    if (typeof timestamp === 'object' && 'seconds' in timestamp) {
        return new Date(timestamp.seconds * 1000);
    }
    return null;
};

interface UserManagementTabProps {
    appUsers: AppUser[] | null;
    unclaimedProfiles: any[] | null;
    refillRequests: RefillRequest[] | null;
    refillRequestsLoading: boolean;
    allPayments: Payment[] | null;
    onUserClick: (user: AppUser, tab?: string) => void;
    onAddNewClientClick: () => void;
}

export function UserManagementTab({
    appUsers,
    unclaimedProfiles,
    refillRequests,
    refillRequestsLoading,
    allPayments,
    onUserClick,
    onAddNewClientClick,
}: UserManagementTabProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const auth = useAuth();
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const [isPaymentReviewOpen, setIsPaymentReviewOpen] = useState(false);
    const [paymentToReview, setPaymentToReview] = useState<Payment | null>(null);
    const [selectedUserForPayment, setSelectedUserForPayment] = useState<AppUser | null>(null);

    const paymentStatusesByUser = useMemo(() => {
        if (!allPayments) return {};
        return allPayments.reduce((acc, payment) => {
            const userId = payment.parentId;
            if (!userId) return acc;
    
            if (!acc[userId]) {
                acc[userId] = { pending: 0, overdue: 0, firstPending: null, firstOverdue: null };
            }
    
            if (payment.status === 'Pending Review') {
                acc[userId].pending += 1;
                 if (!acc[userId].firstPending) acc[userId].firstPending = payment;
            } else if (payment.status === 'Overdue') {
                acc[userId].overdue += 1;
                if (!acc[userId].firstOverdue) acc[userId].firstOverdue = payment;
            }
            return acc;
        }, {} as Record<string, { pending: number; overdue: number; firstPending: Payment | null; firstOverdue: Payment | null; }>);
    }, [allPayments]);

    const handleRefillStatusUpdate = async (request: RefillRequest, newStatus: RefillRequest['status']) => {
        if (!firestore || !auth?.currentUser) return;
        const adminId = auth.currentUser.uid;
        const requestRef = doc(firestore, 'users', request.userId, 'refillRequests', request.id);
        
        try {
            await updateDoc(requestRef, {
                status: newStatus,
                statusHistory: arrayUnion({ status: newStatus, timestamp: Timestamp.now() })
            });

            await createClientNotification(firestore, request.userId, {
                type: 'delivery',
                title: `Refill Status: ${newStatus}`,
                description: `Your refill request is now ${newStatus}.`,
                data: { requestId: request.id },
            });

            await createClientNotification(firestore, adminId, {
                type: 'delivery',
                title: 'Refill Status Updated',
                description: `Request for ${request.businessName} is now ${newStatus}.`,
                data: { userId: request.userId, requestId: request.id },
            });

            toast({ title: 'Request Updated' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const activeRefillRequests = useMemo(() => {
        return refillRequests?.filter(req => req.status !== 'Completed' && req.status !== 'Cancelled') || [];
    }, [refillRequests]);

    const filteredUsers = useMemo(() => {
        // Filter for Clients (Not employees and not system admin)
        const allUsers = (appUsers || []).filter(u => u.email !== 'admin@riverph.com' && u.hrRole !== 'employee');
        
        if (!localSearchTerm) return allUsers;
        return allUsers.filter(user =>
            user.clientId?.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
            user.businessName?.toLowerCase().includes(localSearchTerm.toLowerCase())
        );
    }, [appUsers, localSearchTerm]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredUsers, currentPage, itemsPerPage]);

    const handleOpenPaymentReview = (e: React.MouseEvent, user: AppUser, payment: Payment | null) => {
        if (!payment) return;
        e.stopPropagation();
        setSelectedUserForPayment(user);
        setPaymentToReview(payment);
        setIsPaymentReviewOpen(true);
    };

    return (
        <>
            <div className="space-y-8">
                {activeRefillRequests.length > 0 && (
                    <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-white overflow-hidden">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-100">
                                        <BellRing className="h-5 w-5 text-amber-600 animate-pulse" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Refill Priority Queue</CardTitle>
                                        <CardDescription>Immediate action required for client requests.</CardDescription>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 font-bold px-3">
                                    {activeRefillRequests.length} Pending
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto border-t">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="pl-6 py-4">Client</TableHead>
                                            <TableHead>Requested</TableHead>
                                            <TableHead>Target Date / Qty</TableHead>
                                            <TableHead>Current Status</TableHead>
                                            <TableHead className="text-right pr-6">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {refillRequestsLoading ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-10">Loading requests...</TableCell></TableRow>
                                        ) : activeRefillRequests.map((request) => {
                                            const requestedAtDate = toSafeDate(request.requestedAt);
                                            const requestedForDate = toSafeDate(request.requestedDate);
                                            return (
                                                <TableRow key={request.id} className="hover:bg-amber-50/30 transition-colors">
                                                    <TableCell className="pl-6 py-4">
                                                        <div className="font-semibold text-sm">{request.businessName}</div>
                                                        <div className="text-[10px] text-muted-foreground font-mono">{request.clientId}</div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {requestedAtDate ? formatDistanceToNow(requestedAtDate, { addSuffix: true }) : 'Just now'}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="font-medium">{requestedForDate ? requestedForDate.toLocaleDateString() : 'ASAP'}</div>
                                                        {request.volumeContainers && <div className="text-muted-foreground">{request.volumeContainers} containers</div>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="bg-white/50 text-[10px] font-bold uppercase tracking-wider">{request.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button size="sm" variant="outline" className="h-8 shadow-sm">Manage</Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuItem onClick={() => handleRefillStatusUpdate(request, 'In Production')} disabled={request.status !== 'Requested'}>Start Production</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleRefillStatusUpdate(request, 'Out for Delivery')} disabled={request.status !== 'In Production'}>Dispatch Driver</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleRefillStatusUpdate(request, 'Completed')}>Mark as Delivered</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleRefillStatusUpdate(request, 'Cancelled')} className="text-destructive">Cancel Request</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Tabs defaultValue="active-users" className="w-full">
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <TabsList className="bg-muted/50 p-1">
                                    <TabsTrigger value="active-users" className="data-[state=active]:bg-background">Active Clients</TabsTrigger>
                                    <TabsTrigger value="unclaimed-profiles" className="relative data-[state=active]:bg-background">
                                        Pending Setup
                                        {unclaimedProfiles && unclaimedProfiles.length > 0 && (
                                            <Badge className="ml-2 h-4 min-w-4 px-1 flex justify-center bg-primary text-[10px]">{unclaimedProfiles.length}</Badge>
                                        )}
                                    </TabsTrigger>
                                </TabsList>
                                <Button onClick={onAddNewClientClick} className="hidden">
                                    Add
                                </Button>
                            </div>
                        </CardHeader>
                        
                        <TabsContent value="active-users" className="mt-0">
                            <CardContent className="space-y-6 pt-0">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by client name or ID..."
                                        value={localSearchTerm}
                                        onChange={(e) => {
                                            setLocalSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="h-12 rounded-[16px] border-0 bg-[#F4F4F6] pl-10 text-[16px] font-semibold shadow-none"
                                    />
                                </div>
                                
                                <div className="overflow-x-auto hidden md:block rounded-lg border">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow>
                                                <TableHead className="pl-6">Business</TableHead>
                                                <TableHead>Refill</TableHead>
                                                <TableHead>Window</TableHead>
                                                <TableHead className="text-right pr-6">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedUsers.map((user) => {
                                                const paymentStatus = paymentStatusesByUser[user.id];
                                                const details = user.customPlanDetails || {};
                                                const isAuto = details.autoRefillEnabled ?? true;
                                                const hasRequest = (refillRequests || []).some((request) => request.userId === user.id && request.status !== 'Completed' && request.status !== 'Cancelled');
                                                const statusLabel = hasRequest ? 'Requested' : (paymentStatus?.pending || paymentStatus?.overdue) ? 'Review' : 'Active';

                                                return (
                                                    <TableRow key={user.id} onClick={() => onUserClick(user)} className="group cursor-pointer hover:bg-muted/30 transition-colors">
                                                        <TableCell className="pl-6 py-4">
                                                            <div className="font-extrabold text-[15px] text-[#0A0A0A]">{user.businessName}</div>
                                                        </TableCell>
                                                        <TableCell className="text-[14px] font-semibold">{isAuto ? 'Auto' : 'Manual'}</TableCell>
                                                        <TableCell className="text-[14px] font-semibold text-[#3F3F46]">{dispatchWindowLabel(user)}</TableCell>
                                                        <TableCell className="text-right pr-6 text-[14px] font-bold">{statusLabel}</TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                            {paginatedUsers.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Building className="h-8 w-8 opacity-20" />
                                                            <p>No business clients match your search criteria.</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                
                                <div className="space-y-3 md:hidden">
                                    {paginatedUsers.map(user => {
                                        const paymentStatus = paymentStatusesByUser[user.id];
                                        const hasRequest = (refillRequests || []).some((request) => request.userId === user.id && request.status !== 'Completed' && request.status !== 'Cancelled');
                                        const statusLabel = hasRequest ? 'Requested' : (paymentStatus?.pending || paymentStatus?.overdue) ? 'Review' : 'Active';
                                        const letter = (user.businessName || '?').trim().charAt(0).toUpperCase();
                                        return (
                                            <button key={user.id} type="button" onClick={() => onUserClick(user)} className="flex min-h-16 w-full items-center gap-3 rounded-[24px] bg-white px-3.5 text-left shadow-[0_1px_2px_rgba(16,16,24,0.04),0_10px_28px_-10px_rgba(16,16,24,0.12)]">
                                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] bg-[#F4F4F6] text-[15px] font-extrabold text-[#1A2C49]">{letter}</span>
                                                <span className="min-w-0 flex-1">
                                                    <b className="block truncate text-[15.5px]">{user.businessName}</b>
                                                    <span className="text-[13px] font-medium text-[#8A8A94]">{statusLabel}</span>
                                                </span>
                                                <ChevronRight className="text-[#B4B4BC]" />
                                            </button>
                                        )
                                    })}
                                </div>
                                
                                <div className="flex items-center justify-end space-x-2 py-4">
                                    <div className="flex items-center gap-2 mr-auto">
                                        <Label htmlFor="items-per-page" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Page Size:</Label>
                                        <Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                                            <SelectTrigger id="items-per-page" className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="20">20</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages || 1}</span>
                                    <Button variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                                    <Button variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>Next</Button>
                                </div>
                            </CardContent>
                        </TabsContent>

                        <TabsContent value="unclaimed-profiles" className="mt-0">
                            <CardContent className="pt-0">
                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow>
                                                <TableHead className="pl-6">Client ID</TableHead>
                                                <TableHead>Business Name</TableHead>
                                                <TableHead>Plan</TableHead>
                                                <TableHead>Account Type</TableHead>
                                                <TableHead className="text-right pr-6">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(unclaimedProfiles && unclaimedProfiles.length > 0) ? (unclaimedProfiles || []).map((profile) => (
                                                <TableRow key={profile.id} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="pl-6 font-mono text-[10px] text-muted-foreground">{profile.clientId}</TableCell>
                                                    <TableCell className="font-semibold text-sm">{profile.businessName}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{profile.plan?.name}</TableCell>
                                                    <TableCell className="text-xs">{profile.accountType}</TableCell>
                                                    <TableCell className="text-right pr-6"><Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200 uppercase text-[10px] tracking-widest font-bold">Waiting for Claim</Badge></TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <UserPlus className="h-8 w-8 opacity-20" />
                                                        <p>No unclaimed client profiles waiting setup.</p>
                                                    </div>
                                                </TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </TabsContent>
                    </Card>
                </Tabs>
            </div>
            
            {firestore && (
                 <PaymentReviewDialog
                    isOpen={isPaymentReviewOpen}
                    onOpenChange={setIsPaymentReviewOpen}
                    paymentToReview={paymentToReview}
                    userDocRef={selectedUserForPayment ? doc(firestore, 'users', selectedUserForPayment.id) : null}
                    user={selectedUserForPayment}
                />
            )}
        </>
    );
}
