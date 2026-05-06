'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, BellRing, Search, AlertTriangle, Filter, MoreHorizontal, ChevronRight } from 'lucide-react';
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

            // User Notification
            await createClientNotification(firestore, request.userId, {
                type: 'delivery',
                title: `Refill Status: ${newStatus}`,
                description: `Your refill request is now ${newStatus}.`,
                data: { requestId: request.id },
            });

            // Admin Notification
            await createClientNotification(firestore, adminId, {
                type: 'delivery',
                title: 'Refill Status Updated',
                description: `Request for ${request.businessName} is now ${newStatus}.`,
                data: { userId: request.userId, requestId: request.id },
            });

            toast({ title: 'Request Updated', description: `The refill request has been moved to "${newStatus}" and the user has been notified.` });
        } catch (error) {
            console.error("Error updating refill request:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update the request status.' });
        }
    };

    const activeRefillRequests = useMemo(() => {
        return refillRequests?.filter(req => req.status !== 'Completed' && req.status !== 'Cancelled') || [];
    }, [refillRequests]);

    const filteredUsers = useMemo(() => {
        const allUsers = appUsers || [];
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
        e.stopPropagation(); // Prevent row click
        setSelectedUserForPayment(user);
        setPaymentToReview(payment);
        setIsPaymentReviewOpen(true);
    };

    return (
        <>
            <div className="space-y-8">
                {/* Refill Queue Section */}
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
                                        <CardDescription>Immediate action required for these production and delivery requests.</CardDescription>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-bold px-3">
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

                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <Tabs defaultValue="active-users" className="w-full">
                                <TabsList className="bg-muted/50 p-1 mb-4 sm:mb-0">
                                    <TabsTrigger value="active-users" className="data-[state=active]:bg-background">Active Clients</TabsTrigger>
                                    <TabsTrigger value="unclaimed-profiles" className="relative data-[state=active]:bg-background">
                                        Pending Setup
                                        {unclaimedProfiles && unclaimedProfiles.length > 0 && (
                                            <Badge className="ml-2 h-4 min-w-4 px-1 flex justify-center bg-primary text-[10px]">{unclaimedProfiles.length}</Badge>
                                        )}
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="active-users" className="mt-6 space-y-6">
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <div className="relative flex-1 w-full">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search by name or ID..."
                                                value={localSearchTerm}
                                                onChange={(e) => {
                                                    setLocalSearchTerm(e.target.value);
                                                    setCurrentPage(1);
                                                }}
                                                className="pl-10 h-10 shadow-sm border-muted-foreground/20"
                                            />
                                        </div>
                                        <Button onClick={onAddNewClientClick} className="w-full sm:w-auto h-10 shadow-md">
                                            <UserPlus className="mr-2 h-4 w-4" /> Add New Client
                                        </Button>
                                    </div>
                                    
                                    {/* Desktop Table View */}
                                    <div className="overflow-x-auto hidden md:block rounded-lg border">
                                        <Table>
                                            <TableHeader className="bg-muted/30">
                                                <TableRow>
                                                    <TableHead className="pl-6">ID</TableHead>
                                                    <TableHead>Business Name</TableHead>
                                                    <TableHead>Account Type</TableHead>
                                                    <TableHead>Current Plan</TableHead>
                                                    <TableHead className="text-right pr-6">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginatedUsers.map((user) => {
                                                    const paymentStatus = paymentStatusesByUser[user.id];
                                                    return (
                                                        <TableRow key={user.id} onClick={() => onUserClick(user)} className="group cursor-pointer hover:bg-muted/30 transition-colors">
                                                            <TableCell className="pl-6 font-mono text-[10px] text-muted-foreground">{user.clientId}</TableCell>
                                                            <TableCell className="font-semibold text-sm">{user.businessName}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={cn(
                                                                    "text-[10px] uppercase tracking-wide px-2",
                                                                    user.accountType === 'Parent' ? 'border-primary text-primary' :
                                                                    user.accountType === 'Branch' ? 'border-purple-300 text-purple-700' : 'text-muted-foreground'
                                                                )}>
                                                                    {user.accountType || 'Single'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">{user.plan?.name || 'No Plan'}</TableCell>
                                                            <TableCell className="text-right pr-6">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {paymentStatus?.overdue > 0 ? (
                                                                        <Badge variant="destructive" onClick={(e) => handleOpenPaymentReview(e, user, paymentStatus.firstOverdue)} className="cursor-pointer shadow-sm hover:opacity-90">{paymentStatus.overdue} Overdue</Badge>
                                                                    ) : paymentStatus?.pending > 0 ? (
                                                                        <Badge className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white shadow-sm" onClick={(e) => handleOpenPaymentReview(e, user, paymentStatus.firstPending)}>Review Payment</Badge>
                                                                    ) : (
                                                                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 cursor-pointer" onClick={(e) => { e.stopPropagation(); onUserClick(user, 'billing'); }}>Up to date</Badge>
                                                                    )}
                                                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                                {paginatedUsers.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <Search className="h-8 w-8 opacity-20" />
                                                                <p>No clients match your search criteria.</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    
                                    {/* Mobile Card View */}
                                    <div className="space-y-4 md:hidden">
                                        {paginatedUsers.map(user => {
                                            const paymentStatus = paymentStatusesByUser[user.id];
                                            return (
                                                <Card key={user.id} onClick={() => onUserClick(user)} className="shadow-sm active:scale-[0.98] transition-transform">
                                                    <CardContent className="p-4 space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-bold text-base">{user.businessName}</p>
                                                                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{user.clientId}</p>
                                                            </div>
                                                            <Badge variant="outline" className="text-[10px] uppercase">{user.accountType || 'Single'}</Badge>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-muted-foreground">Plan:</span>
                                                            <span className="font-medium text-foreground">{user.plan?.name || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs pt-2 border-t mt-1">
                                                            <span className="text-muted-foreground">Billing:</span>
                                                            {paymentStatus?.overdue > 0 ? (
                                                                <Badge variant="destructive" className="text-[10px]">{paymentStatus.overdue} Overdue</Badge>
                                                            ) : paymentStatus?.pending > 0 ? (
                                                                <Badge className="bg-blue-500 text-white text-[10px]">Review Payment</Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px]">Up to date</Badge>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                    
                                    <div className="flex items-center justify-end space-x-2 py-4">
                                        <div className="flex items-center gap-2 mr-auto">
                                            <Label htmlFor="items-per-page" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rows per page:</Label>
                                            <Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                                                <SelectTrigger id="items-per-page" className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="20">20</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                    <SelectItem value="100">100</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
                                        <Button variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                                        <Button variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                                    </div>
                                </TabsContent>

                                <TabsContent value="unclaimed-profiles" className="mt-6">
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
                                                            <p>No unclaimed profiles waiting setup.</p>
                                                        </div>
                                                    </TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </CardContent>
                </Card>
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