'use client';
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Delivery } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { PlusCircle, Edit, Eye, PackageCheck, Truck, Package, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

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
    const [searchTerm, setSearchTerm] = useState('');
    const DELIVERIES_PER_PAGE = 5;

    const filteredDeliveries = useMemo(() => {
        if (!userDeliveriesData) return [];
        if (!searchTerm) return userDeliveriesData;
        return userDeliveriesData.filter(d => 
            d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [userDeliveriesData, searchTerm]);

    const totalDeliveryPages = Math.ceil(filteredDeliveries.length / DELIVERIES_PER_PAGE);

    const paginatedDeliveries = useMemo(() => {
        const startIndex = (deliveriesCurrentPage - 1) * DELIVERIES_PER_PAGE;
        return filteredDeliveries.slice(startIndex, startIndex + DELIVERIES_PER_PAGE);
    }, [filteredDeliveries, deliveriesCurrentPage]);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'Delivered': return { color: 'bg-green-50 text-green-700 border-green-200', icon: PackageCheck };
            case 'In Transit': return { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Truck };
            default: return { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Package };
        }
    };

    return (
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 bg-muted/20">
                <div>
                    <CardTitle className="text-xl">Delivery Logistics</CardTitle>
                    <CardDescription>Comprehensive log of fulfillment and supply replenishment.</CardDescription>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                            placeholder="Find by ID..." 
                            className="pl-8 h-9 text-xs" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => { onSetDeliveryToEdit(null); onSetIsCreateDeliveryOpen(true); }} size="sm" className="shadow-md h-9">
                        <PlusCircle className="mr-2 h-4 w-4" /> New Delivery
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Desktop Table View */}
                <Table className="hidden md:table">
                    <TableHeader className="bg-muted/10">
                        <TableRow>
                            <TableHead className="pl-6 py-4">Tracking #</TableHead>
                            <TableHead>Service Date</TableHead>
                            <TableHead>Volume Detail</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right pr-6">Proof & Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedDeliveries.map(delivery => {
                            const status = getStatusInfo(delivery.status);
                            return (
                                <TableRow key={delivery.id} className="group hover:bg-muted/30 transition-colors">
                                    <TableCell className="pl-6 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{delivery.id}</TableCell>
                                    <TableCell className="text-sm font-medium">{toSafeDate(delivery.date)?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
                                    <TableCell>
                                        <div className="font-bold text-sm">{delivery.volumeContainers} <span className="text-[10px] font-normal text-muted-foreground uppercase">containers</span></div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">({containerToLiter(delivery.volumeContainers).toLocaleString(undefined, { maximumFractionDigits: 0 })} Liters)</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 gap-1.5", status.color)}>
                                            <status.icon className="h-3 w-3" />
                                            {delivery.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {delivery.proofOfDeliveryUrl ? (
                                                <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold border-muted-foreground/20 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => onSetProofToViewUrl(delivery.proofOfDeliveryUrl!)}>
                                                    <Eye className="mr-1.5 h-3 w-3" /> View Proof
                                                </Button>
                                            ) : (
                                                <div className="h-7 px-3 flex items-center text-[10px] text-muted-foreground font-bold uppercase italic opacity-40">No Proof</div>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { onSetDeliveryToEdit(delivery); onSetIsCreateDeliveryOpen(true); }}>
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {paginatedDeliveries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2 opacity-30">
                                        <Package className="h-10 w-10" />
                                        <p className="text-sm font-bold uppercase tracking-widest">No logistics data found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                
                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden p-4">
                    {paginatedDeliveries.map(delivery => {
                        const status = getStatusInfo(delivery.status);
                        return (
                        <Card key={delivery.id} className="shadow-none border bg-muted/10">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">#{delivery.id}</p>
                                        <p className="font-bold text-sm">{toSafeDate(delivery.date)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                    <Badge variant="outline" className={cn("text-[9px] uppercase font-bold tracking-widest border px-2", status.color)}>
                                        {delivery.status}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-baseline border-y py-3">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Supply Volume:</span>
                                    <div className="text-right">
                                        <p className="font-extrabold text-sm">{delivery.volumeContainers} containers</p>
                                        <p className="text-[10px] text-muted-foreground">{containerToLiter(delivery.volumeContainers).toLocaleString()} Liters</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {delivery.proofOfDeliveryUrl ? (
                                        <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px] uppercase font-bold" onClick={() => onSetProofToViewUrl(delivery.proofOfDeliveryUrl!)}>
                                            <Eye className="mr-1.5 h-3 w-3" /> Proof
                                        </Button>
                                    ) : null}
                                    <Button variant="secondary" size="sm" className={cn("h-8 text-[10px] uppercase font-bold", !delivery.proofOfDeliveryUrl ? "w-full" : "flex-1")} onClick={() => { onSetDeliveryToEdit(delivery); onSetIsCreateDeliveryOpen(true); }}>
                                        <Edit className="mr-1.5 h-3 w-3" /> Edit
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )})}
                    {paginatedDeliveries.length === 0 && (
                        <p className="text-center text-muted-foreground py-10 text-xs font-bold uppercase tracking-widest opacity-30">No delivery history</p>
                    )}
                </div>
            </CardContent>
            <CardFooter className="bg-muted/5 py-4 flex items-center justify-between border-t">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Log {filteredDeliveries.length} entries
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] uppercase font-bold"
                        onClick={() => setDeliveriesCurrentPage(p => Math.max(1, p - 1))}
                        disabled={deliveriesCurrentPage === 1}
                    >
                        Prev
                    </Button>
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground px-2">
                        {deliveriesCurrentPage} / {totalDeliveryPages || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] uppercase font-bold"
                        onClick={() => setDeliveriesCurrentPage(p => Math.min(totalDeliveryPages, p + 1))}
                        disabled={deliveriesCurrentPage === totalDeliveryPages || totalDeliveryPages === 0}
                    >
                        Next
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
