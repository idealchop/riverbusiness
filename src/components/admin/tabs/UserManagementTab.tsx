

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, BellRing, Search, AlertTriangle } from 'lucide-react';
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
import { useFirestore } from '@/firebase';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { PaymentReviewDialog } from '../dialogs/user-details/PaymentReviewDialog';

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
        if (!firestore) return;
        const requestRef = doc(firestore, 'users', request.userId, 'refillRequests', request.id);
        await updateDoc(requestRef, {
            status: newStatus,
            statusHistory: arrayUnion({ status: newStatus, timestamp: Timestamp.now() })
        });
        toast({ title: 'Request Updated', description: `The refill request has been moved to "${newStatus}".` });
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
        <Card>
            <CardHeader>
                <CardTitle>Client Accounts ({filteredUsers.length})</CardTitle>
                <CardDescription>Manage all active and pending user accounts.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="active-users">
                    <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                        <TabsTrigger value="active-users">Active Users</TabsTrigger>
                        <TabsTrigger value="unclaimed-profiles" className="relative">
                            Unclaimed Profiles
                            {unclaimedProfiles && unclaimedProfiles.length > 0 && (
                                <Badge className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">{unclaimedProfiles.length}</Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="active-users" className="space-y-6 pt-4">
                        {activeRefillRequests.length > 0 && (
                            <Card className="bg-amber-50 border-amber-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base"><BellRing className="h-5 w-5 text-amber-600" />Active Refill Requests</CardTitle>
                                    <CardDescription>This is the queue for the refill team. Update the status as the request progresses.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Client ID</TableHead>
                                                <TableHead>Business Name</TableHead>
                                                <TableHead>Requested</TableHead>
                                                <TableHead>Date / Qty</TableHead>
                                                <TableHead>Current Status</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {refillRequestsLoading ? (
                                                <TableRow><TableCell colSpan={6} className="text-center">Loading requests...</TableCell></TableRow>
                                            ) : activeRefillRequests.map((request) => {
                                                const requestedAtDate = toSafeDate(request.requestedAt);
                                                const requestedForDate = toSafeDate(request.requestedDate);
                                                return (
                                                    <TableRow key={request.id}>
                                                        <TableCell>{request.clientId}</TableCell>
                                                        <TableCell>{request.businessName}</TableCell>
                                                        <TableCell>
                                                            {requestedAtDate ? formatDistanceToNow(requestedAtDate, { addSuffix: true }) : 'Just now'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {requestedForDate ? requestedForDate.toLocaleDateString() : 'ASAP'}
                                                            {request.volumeContainers && ` (${request.volumeContainers} cont.)`}
                                                        </TableCell>
                                                        <TableCell><Badge variant="secondary">{request.status}</Badge></TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild><Button size="sm">Update Status</Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent>
                                                                    <DropdownMenuItem onClick={() => handleRefillStatusUpdate(request, 'In Production')} disabled={request.status !== 'Requested'}>Move to Production</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleRefillStatusUpdate(request, 'Out for Delivery')} disabled={request.status !== 'In Production'}>Set to Delivery</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleRefillStatusUpdate(request, 'Completed')}>Mark as Completed</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleRefillStatusUpdate(request, 'Cancelled')} className="text-destructive">Cancel Request</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                        <div className="flex items-center gap-2">
                             <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by Client ID or Business Name..."
                                    value={localSearchTerm}
                                    onChange={(e) => {
                                        setLocalSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-10 max-w-sm"
                                />
                            </div>
                        </div>
                        
                        {/* Desktop Table View */}
                        <div className="overflow-x-auto hidden md:block">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Client ID</TableHead>
                                        <TableHead>Business Name</TableHead>
                                        <TableHead>Account Type</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead className="text-right">Payment Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedUsers.map((user) => {
                                        const paymentStatus = paymentStatusesByUser[user.id];
                                        return (
                                            <TableRow key={user.id} onClick={() => onUserClick(user)} className="cursor-pointer">
                                                <TableCell>{user.clientId}</TableCell>
                                                <TableCell>{user.businessName}</TableCell>
                                                <TableCell><Badge variant={user.accountType === 'Parent' ? 'default' : user.accountType === 'Branch' ? 'secondary' : 'outline'}>{user.accountType || 'Single'}</Badge></TableCell>
                                                <TableCell>{user.plan?.name || 'N/A'}</TableCell>
                                                <TableCell className="text-right">
                                                    {paymentStatus?.overdue > 0 ? (
                                                        <Badge variant="destructive" onClick={(e) => handleOpenPaymentReview(e, user, paymentStatus.firstOverdue)} className="cursor-pointer">{paymentStatus.overdue} Overdue</Badge>
                                                    ) : paymentStatus?.pending > 0 ? (
                                                        <Badge className="cursor-pointer bg-blue-100 text-blue-800 hover:bg-blue-200" onClick={(e) => handleOpenPaymentReview(e, user, paymentStatus.firstPending)}>{paymentStatus.pending} Pending</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-green-100 text-green-800 cursor-pointer" onClick={(e) => { e.stopPropagation(); onUserClick(user, 'billing'); }}>Up to date</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        
                        {/* Mobile Card View */}
                        <div className="space-y-4 md:hidden">
                            {paginatedUsers.map(user => {
                                const paymentStatus = paymentStatusesByUser[user.id];
                                return (
                                    <Card key={user.id} onClick={() => onUserClick(user)} className="cursor-pointer">
                                        <CardContent className="p-4 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">{user.businessName}</p>
                                                    <p className="text-xs text-muted-foreground">ID: {user.clientId}</p>
                                                </div>
                                                <Badge variant={user.accountType === 'Parent' ? 'default' : user.accountType === 'Branch' ? 'secondary' : 'outline'}>{user.accountType || 'Single'}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Plan:</span>
                                                <span className="font-medium">{user.plan?.name || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm pt-2">
                                                <span className="text-muted-foreground">Payment Status:</span>
                                                {paymentStatus?.overdue > 0 ? (
                                                    <Badge variant="destructive" onClick={(e) => handleOpenPaymentReview(e, user, paymentStatus.firstOverdue)} className="cursor-pointer">{paymentStatus.overdue} Overdue</Badge>
                                                ) : paymentStatus?.pending > 0 ? (
                                                    <Badge className="cursor-pointer bg-blue-100 text-blue-800" onClick={(e) => handleOpenPaymentReview(e, user, paymentStatus.firstPending)}>{paymentStatus.pending} Pending</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800 cursor-pointer" onClick={(e) => { e.stopPropagation(); onUserClick(user, 'billing'); }}>Up to date</Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                        
                         <div className="flex items-center justify-end space-x-2 py-4">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="items-per-page" className="text-sm font-normal">Rows per page:</Label>
                                <Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                                    <SelectTrigger id="items-per-page" className="w-20 h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                        </div>
                    </TabsContent>
                    <TabsContent value="unclaimed-profiles" className="space-y-6 pt-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">These profiles are waiting for users to claim them.</p>
                            <Button onClick={onAddNewClientClick}><UserPlus className="mr-2 h-4 w-4" /> Add New Client</Button>
                        </div>
                        
                        {/* Desktop Table View */}
                        <div className="overflow-x-auto hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Client ID</TableHead>
                                        <TableHead>Business Name</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Account Type</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(unclaimedProfiles && unclaimedProfiles.length > 0) ? (unclaimedProfiles || []).map((profile) => (
                                        <TableRow key={profile.id}>
                                            <TableCell>{profile.clientId}</TableCell>
                                            <TableCell>{profile.businessName}</TableCell>
                                            <TableCell>{profile.plan?.name}</TableCell>
                                            <TableCell>{profile.accountType}</TableCell>
                                            <TableCell><Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Claim</Badge></TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No unclaimed profiles found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="space-y-4 md:hidden">
                            {(unclaimedProfiles && unclaimedProfiles.length > 0) ? unclaimedProfiles.map(profile => (
                                <Card key={profile.id}>
                                    <CardContent className="p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{profile.businessName}</p>
                                                <p className="text-xs text-muted-foreground">ID: {profile.clientId}</p>
                                            </div>
                                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Claim</Badge>
                                        </div>
                                        <div className="flex justify-between items-center text-sm pt-2">
                                            <span className="text-muted-foreground">Plan:</span>
                                            <span className="font-medium">{profile.plan?.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Account Type:</span>
                                            <span className="font-medium">{profile.accountType}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )) : (
                                <div className="text-center text-muted-foreground py-10">
                                    <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
                                    <p className="mt-2">No unclaimed profiles found.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
        
        {firestore && (
             <PaymentReviewDialog
                isOpen={isPaymentReviewOpen}
                onOpenChange={setIsPaymentReviewOpen}
                paymentToReview={paymentToReview}
                userDocRef={selectedUserForPayment ? doc(firestore, 'users', selectedUserForPayment.id) : null}
            />
        )}
       
        </>
    );
}
