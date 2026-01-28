
'use client';
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Delivery, AppUser } from '@/lib/types';
import { Timestamp, collectionGroup, query, where } from 'firebase/firestore';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';

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

interface BranchDeliveriesTabProps {
    user: AppUser;
    onSetProofToViewUrl: (url: string | null) => void;
    allUsers: AppUser[];
}

export function BranchDeliveriesTab({
    user,
    onSetProofToViewUrl,
    allUsers,
}: BranchDeliveriesTabProps) {
    const firestore = useFirestore();

    const branchIds = useMemo(() => {
        return allUsers.filter(u => u.parentId === user.id).map(u => u.id);
    }, [allUsers, user.id]);

    // Firestore `in` queries are limited to 30 items. If there are more branches, this will need pagination or a different approach.
    const branchDeliveriesQuery = useMemoFirebase(() => {
        if (!firestore || branchIds.length === 0) return null;
        if (branchIds.length > 30) {
            console.warn("Branch delivery query is limited to 30 branches.");
        }
        return query(collectionGroup(firestore, 'deliveries'), where('userId', 'in', branchIds.slice(0, 30)));
    }, [firestore, branchIds]);
    
    const { data: branchDeliveriesData, isLoading: deliveriesLoading } = useCollection<Delivery>(branchDeliveriesQuery);

    const [deliveriesCurrentPage, setDeliveriesCurrentPage] = useState(1);
    const DELIVERIES_PER_PAGE = 5;

    const totalDeliveryPages = useMemo(() => {
        if (!branchDeliveriesData) return 0;
        return Math.ceil(branchDeliveriesData.length / DELIVERIES_PER_PAGE);
    }, [branchDeliveriesData]);

    const paginatedDeliveries = useMemo(() => {
        if (!branchDeliveriesData) return [];
        const sorted = branchDeliveriesData.sort((a, b) => {
            const dateA = toSafeDate(a.date);
            const dateB = toSafeDate(b.date);
            if (!dateA || !dateB) return 0;
            return dateB.getTime() - dateA.getTime();
        });
        const startIndex = (deliveriesCurrentPage - 1) * DELIVERIES_PER_PAGE;
        return sorted.slice(startIndex, startIndex + DELIVERIES_PER_PAGE);
    }, [branchDeliveriesData, deliveriesCurrentPage]);
    
    const branchIdToName = useMemo(() => {
        return allUsers.reduce((acc, u) => {
            if (u.parentId === user.id) {
                acc[u.id] = u.businessName;
            }
            return acc;
        }, {} as Record<string, string>);
    }, [allUsers, user.id]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Branch Delivery History</CardTitle>
                    <CardDescription>Consolidated log of all deliveries for this parent account's branches.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                {/* Desktop Table View */}
                <Table className="hidden md:table">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Branch Name</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Volume</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Proof</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deliveriesLoading && <TableRow><TableCell colSpan={5} className="text-center h-24">Loading deliveries...</TableCell></TableRow>}
                        {!deliveriesLoading && paginatedDeliveries.map(delivery => (
                            <TableRow key={delivery.id}>
                                <TableCell className="font-medium">{branchIdToName[delivery.userId] || delivery.userId}</TableCell>
                                <TableCell>{toSafeDate(delivery.date)?.toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <div>{delivery.volumeContainers} containers</div>
                                    <div className="text-xs text-muted-foreground">({containerToLiter(delivery.volumeContainers).toLocaleString(undefined, { maximumFractionDigits: 0 })} L)</div>
                                </TableCell>
                                <TableCell><Badge>{delivery.status}</Badge></TableCell>
                                <TableCell>
                                    {delivery.proofOfDeliveryUrl ? (
                                        <Button variant="link" className="p-0 h-auto" onClick={() => onSetProofToViewUrl(delivery.proofOfDeliveryUrl!)}>View</Button>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">None</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!deliveriesLoading && paginatedDeliveries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No branch deliveries found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                
                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden">
                    {deliveriesLoading && <p className="text-center text-muted-foreground py-10">Loading deliveries...</p>}
                    {!deliveriesLoading && paginatedDeliveries.map(delivery => (
                        <Card key={delivery.id}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{branchIdToName[delivery.userId] || delivery.userId}</p>
                                        <p className="text-xs text-muted-foreground">{toSafeDate(delivery.date)?.toLocaleDateString()}</p>
                                    </div>
                                    <Badge>{delivery.status}</Badge>
                                </div>
                                <div className="text-sm">
                                    <p><strong>Volume:</strong> {delivery.volumeContainers} containers ({containerToLiter(delivery.volumeContainers).toLocaleString(undefined, { maximumFractionDigits: 0 })} L)</p>
                                </div>
                                {delivery.proofOfDeliveryUrl && (
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => onSetProofToViewUrl(delivery.proofOfDeliveryUrl!)}>
                                        <Eye className="mr-2 h-4 w-4" /> View Proof
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                    {!deliveriesLoading && paginatedDeliveries.length === 0 && (
                        <p className="text-center text-muted-foreground py-10">No branch deliveries found.</p>
                    )}
                </div>

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
    );
}
