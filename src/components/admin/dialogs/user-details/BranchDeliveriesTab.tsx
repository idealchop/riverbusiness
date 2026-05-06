'use client';
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Delivery, AppUser } from '@/lib/types';
import { Timestamp, collection, query, orderBy } from 'firebase/firestore';
import { Eye, MapPin, Truck, PackageCheck, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
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

interface BranchDeliveriesTabProps {
    user: AppUser; // The parent user
    onSetProofToViewUrl: (url: string | null) => void;
    allUsers: AppUser[];
}

export function BranchDeliveriesTab({
    user,
    onSetProofToViewUrl,
    allUsers,
}: BranchDeliveriesTabProps) {
    const firestore = useFirestore();
    const [deliveriesCurrentPage, setDeliveriesCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const DELIVERIES_PER_PAGE = 5;

    const parentDeliveriesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'users', user.id, 'branchDeliveries'), orderBy('date', 'desc'));
    }, [firestore, user]);

    const { data: branchDeliveriesData, isLoading: deliveriesLoading } = useCollection<Delivery>(parentDeliveriesQuery);

    const branchIdToName = useMemo(() => {
        return allUsers.reduce((acc, u) => {
            acc[u.id] = u.businessName;
            return acc;
        }, {} as Record<string, string>);
    }, [allUsers]);

    const filteredDeliveries = useMemo(() => {
        if (!branchDeliveriesData) return [];
        if (!searchTerm) return branchDeliveriesData;
        return branchDeliveriesData.filter(d => {
            const branchName = branchIdToName[d.userId] || '';
            return branchName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   d.id.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [branchDeliveriesData, searchTerm, branchIdToName]);

    const totalDeliveryPages = Math.ceil(filteredDeliveries.length / DELIVERIES_PER_PAGE);

    const paginatedDeliveries = useMemo(() => {
        const startIndex = (deliveriesCurrentPage - 1) * DELIVERIES_PER_PAGE;
        return filteredDeliveries.slice(startIndex, startIndex + DELIVERIES_PER_PAGE);
    }, [filteredDeliveries, deliveriesCurrentPage]);
    
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Delivered': return 'bg-green-50 text-green-700 border-green-200';
            case 'In Transit': return 'bg-blue-50 text-blue-700 border-blue-200';
            default: return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    return (
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 bg-muted/20">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Multi-Branch Supply Log
                    </CardTitle>
                    <CardDescription>Consolidated fulfillment tracking across all linked business locations.</CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                        placeholder="Search by branch or ID..." 
                        className="pl-8 h-9 text-xs bg-background" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Desktop Table View */}
                <Table className="hidden md:table">
                    <TableHeader className="bg-muted/10">
                        <TableRow>
                            <TableHead className="pl-6 py-4">Business Location</TableHead>
                            <TableHead>Dispatch Date</TableHead>
                            <TableHead>Volume Detail</TableHead>
                            <TableHead>Fulfillment</TableHead>
                            <TableHead className="text-right pr-6">Proof</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deliveriesLoading && <TableRow><TableCell colSpan={5} className="text-center h-40 opacity-50 font-bold uppercase tracking-widest text-[10px]">Scanning Ledger...</TableCell></TableRow>}
                        {!deliveriesLoading && paginatedDeliveries.map(delivery => (
                            <TableRow key={delivery.id} className="group hover:bg-muted/30 transition-colors">
                                <TableCell className="pl-6 py-4">
                                    <div className="font-bold text-sm">{branchIdToName[delivery.userId] || 'External Branch'}</div>
                                    <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">#{delivery.id}</div>
                                </TableCell>
                                <TableCell className="text-sm font-medium">{toSafeDate(delivery.date)?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
                                <TableCell>
                                    <div className="font-bold text-sm">{delivery.volumeContainers} <span className="text-[10px] font-normal text-muted-foreground uppercase">units</span></div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">({containerToLiter(delivery.volumeContainers).toLocaleString(undefined, { maximumFractionDigits: 0 })} Liters)</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5", getStatusStyles(delivery.status))}>
                                        {delivery.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex items-center justify-end gap-2">
                                        {delivery.proofOfDeliveryUrl ? (
                                            <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold border-muted-foreground/20 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => onSetProofToViewUrl(delivery.proofOfDeliveryUrl!)}>
                                                <Eye className="mr-1.5 h-3 w-3" /> View
                                            </Button>
                                        ) : (
                                            <div className="h-7 px-3 flex items-center text-[10px] text-muted-foreground font-bold uppercase italic opacity-40">No Proof</div>
                                        )}
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!deliveriesLoading && paginatedDeliveries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-24 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2 opacity-30">
                                        <Truck className="h-10 w-10" />
                                        <p className="text-sm font-bold uppercase tracking-widest">No branch deliveries found in ledger</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                
                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden p-4">
                    {deliveriesLoading && <p className="text-center text-muted-foreground py-10 text-[10px] font-bold uppercase tracking-widest">Scanning Ledger...</p>}
                    {!deliveriesLoading && paginatedDeliveries.map(delivery => (
                        <Card key={delivery.id} className="shadow-none border bg-muted/10">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-sm">{branchIdToName[delivery.userId] || 'Branch'}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-1">Ref: {delivery.id}</p>
                                    </div>
                                    <Badge variant="outline" className={cn("text-[9px] uppercase font-bold border px-2", getStatusStyles(delivery.status))}>
                                        {delivery.status}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-baseline border-y py-3">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Volume Supplied:</span>
                                    <div className="text-right">
                                        <p className="font-extrabold text-sm">{delivery.volumeContainers} containers</p>
                                        <p className="text-[10px] text-muted-foreground">{toSafeDate(delivery.date)?.toLocaleDateString()}</p>
                                    </div>
                                </div>
                                {delivery.proofOfDeliveryUrl && (
                                    <Button variant="outline" size="sm" className="w-full h-8 text-[10px] uppercase font-bold" onClick={() => onSetProofToViewUrl(delivery.proofOfDeliveryUrl!)}>
                                        <Eye className="mr-1.5 h-3 w-3" /> View Confirmation Proof
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                    {!deliveriesLoading && paginatedDeliveries.length === 0 && (
                        <p className="text-center text-muted-foreground py-10 text-xs font-bold uppercase tracking-widest opacity-30">No data found</p>
                    )}
                </div>
            </CardContent>
            <CardFooter className="bg-muted/5 py-4 flex items-center justify-between border-t">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Consolidated {filteredDeliveries.length} entries
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setDeliveriesCurrentPage(p => Math.max(1, p - 1))} disabled={deliveriesCurrentPage === 1}>Prev</Button>
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground px-2">{deliveriesCurrentPage} / {totalDeliveryPages || 1}</span>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setDeliveriesCurrentPage(p => Math.min(totalDeliveryPages, p + 1))} disabled={deliveriesCurrentPage === totalDeliveryPages || totalDeliveryPages === 0}>Next</Button>
                </div>
            </CardFooter>
        </Card>
    );
}
