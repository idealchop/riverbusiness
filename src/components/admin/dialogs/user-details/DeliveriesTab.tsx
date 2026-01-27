'use client';
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Delivery } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { PlusCircle, Edit, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface DeliveriesTabProps {
    userDeliveriesData: Delivery[] | null;
    onSetDeliveryToEdit: (delivery: Delivery | null) => void;
    onSetIsCreateDeliveryOpen: (isOpen: boolean) => void;
    onSetProofToViewUrl: (url: string | null) => void;
}

export function DeliveriesTab({
    userDeliveriesData,
    onSetDeliveryToEdit,
    onSetIsCreateDeliveryOpen,
    onSetProofToViewUrl,
}: DeliveriesTabProps) {
    const [deliveriesCurrentPage, setDeliveriesCurrentPage] = useState(1);
    const DELIVERIES_PER_PAGE = 5;

    const totalDeliveryPages = useMemo(() => {
        if (!userDeliveriesData) return 0;
        return Math.ceil(userDeliveriesData.length / DELIVERIES_PER_PAGE);
    }, [userDeliveriesData]);

    const paginatedDeliveries = useMemo(() => {
        if (!userDeliveriesData) return [];
        const startIndex = (deliveriesCurrentPage - 1) * DELIVERIES_PER_PAGE;
        return userDeliveriesData.slice(startIndex, startIndex + DELIVERIES_PER_PAGE);
    }, [userDeliveriesData, deliveriesCurrentPage]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Delivery History</CardTitle>
                    <CardDescription>Log of all deliveries for this user.</CardDescription>
                </div>
                <Button onClick={() => { onSetDeliveryToEdit(null); onSetIsCreateDeliveryOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Delivery
                </Button>
            </CardHeader>
            <CardContent>
                {/* Desktop Table View */}
                <Table className="hidden md:table">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tracking #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Volume</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Proof</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedDeliveries.map(delivery => (
                            <TableRow key={delivery.id}>
                                <TableCell className="font-mono text-xs">{delivery.id}</TableCell>
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
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => { onSetDeliveryToEdit(delivery); onSetIsCreateDeliveryOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {paginatedDeliveries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No deliveries found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                
                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden">
                    {paginatedDeliveries.map(delivery => (
                        <Card key={delivery.id}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{toSafeDate(delivery.date)?.toLocaleDateString()}</p>
                                        <p className="text-xs text-muted-foreground">ID: {delivery.id}</p>
                                    </div>
                                    <Badge>{delivery.status}</Badge>
                                </div>
                                <div className="text-sm">
                                    <p><strong>Volume:</strong> {delivery.volumeContainers} containers ({containerToLiter(delivery.volumeContainers).toLocaleString(undefined, { maximumFractionDigits: 0 })} L)</p>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    {delivery.proofOfDeliveryUrl ? (
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => onSetProofToViewUrl(delivery.proofOfDeliveryUrl!)}>
                                            <Eye className="mr-2 h-4 w-4" /> View Proof
                                        </Button>
                                    ) : (
                                        <div className="flex-1" />
                                    )}
                                    <Button variant="secondary" size="sm" className="w-full" onClick={() => { onSetDeliveryToEdit(delivery); onSetIsCreateDeliveryOpen(true); }}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {paginatedDeliveries.length === 0 && (
                        <p className="text-center text-muted-foreground py-10">No deliveries found.</p>
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
