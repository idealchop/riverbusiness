'use client';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SanitationVisit } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { PlusCircle, Eye, Edit, ShieldCheck, ClipboardCheck, CalendarCheck, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface SanitationTabProps {
    sanitationVisitsData: SanitationVisit[] | null;
    onSetSelectedSanitationVisit: (visit: SanitationVisit | null) => void;
    onSetIsSanitationHistoryOpen: (isOpen: boolean) => void;
    onSetIsCreateSanitationOpen: (isOpen: boolean) => void;
    onSetVisitToEdit: (visit: SanitationVisit | null) => void;
}

export function SanitationTab({
    sanitationVisitsData,
    onSetSelectedSanitationVisit,
    onSetIsSanitationHistoryOpen,
    onSetIsCreateSanitationOpen,
    onSetVisitToEdit
}: SanitationTabProps) {

    const handleViewReport = (visit: SanitationVisit) => {
        onSetSelectedSanitationVisit(visit);
        onSetIsSanitationHistoryOpen(true);
    };

    const handleEditVisit = (visit: SanitationVisit) => {
        onSetVisitToEdit(visit);
        onSetIsCreateSanitationOpen(true);
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-green-50 text-green-700 border-green-200';
            case 'Scheduled': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Cancelled': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    return (
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 bg-muted/20">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Equipment Quality & Sanitation
                    </CardTitle>
                    <CardDescription>Maintain safe equipment with scheduled monthly cleaning logs.</CardDescription>
                </div>
                <Button onClick={() => { onSetVisitToEdit(null); onSetIsCreateSanitationOpen(true); }} size="sm" className="shadow-md h-9">
                    <PlusCircle className="mr-2 h-4 w-4" /> Schedule Visit
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                 {/* Desktop Table View */}
                <Table className="hidden md:table">
                    <TableHeader className="bg-muted/10">
                        <TableRow>
                            <TableHead className="pl-6 py-4">Scheduled Date</TableHead>
                            <TableHead>Health Status</TableHead>
                            <TableHead>Assigned Officer</TableHead>
                            <TableHead className="text-right pr-6">Management</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(sanitationVisitsData || []).map(visit => (
                            <TableRow key={visit.id} className="group hover:bg-muted/30 transition-colors">
                                <TableCell className="pl-6 py-4 font-semibold text-sm">
                                    {toSafeDate(visit.scheduledDate)?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5",
                                        getStatusStyles(visit.status)
                                    )}>
                                        {visit.status === 'Completed' ? <CalendarCheck className="h-3 w-3 mr-1.5" /> : null}
                                        {visit.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">{visit.assignedTo}</TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold border-muted-foreground/20 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => handleViewReport(visit)}>
                                            <Eye className="mr-1.5 h-3 w-3" /> Report
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEditVisit(visit)}>
                                            <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                         {(sanitationVisitsData?.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2 opacity-30">
                                        <ClipboardCheck className="h-10 w-10" />
                                        <p className="text-sm font-bold uppercase tracking-widest">No sanitation records scheduled</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden p-4">
                    {(sanitationVisitsData || []).map(visit => (
                        <Card key={visit.id} className="shadow-none border bg-muted/10">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-sm">{toSafeDate(visit.scheduledDate)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Officer: {visit.assignedTo}</p>
                                    </div>
                                    <Badge variant="outline" className={cn(
                                        "text-[9px] uppercase font-bold tracking-widest border px-2",
                                        getStatusStyles(visit.status)
                                    )}>{visit.status}</Badge>
                                </div>
                                <div className="flex gap-2">
                                     <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px] uppercase font-bold" onClick={() => handleViewReport(visit)}>
                                        <Eye className="mr-1.5 h-3 w-3" /> Full Report
                                    </Button>
                                    <Button variant="secondary" size="sm" className="flex-1 h-8 text-[10px] uppercase font-bold" onClick={() => handleEditVisit(visit)}>
                                        <Edit className="mr-1.5 h-3 w-3" /> Edit Visit
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {(sanitationVisitsData?.length === 0) && (
                        <p className="text-center text-muted-foreground py-10 text-xs font-bold uppercase tracking-widest opacity-30">No records found</p>
                    )}
                </div>
            </CardContent>
            <CardFooter className="bg-muted/5 py-4 flex items-center justify-between border-t">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Compliant Fulfillment History
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <ShieldCheck className="h-3 w-3" />
                    DOH STANDARDS ACTIVE
                </div>
            </CardFooter>
        </Card>
    );
}
