'use client';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SanitationVisit } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { PlusCircle, Eye, Edit } from 'lucide-react';
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
}

export function SanitationTab({
    sanitationVisitsData,
    onSetSelectedSanitationVisit,
    onSetIsSanitationHistoryOpen,
    onSetIsCreateSanitationOpen
}: SanitationTabProps) {

    const handleViewReport = (visit: SanitationVisit) => {
        onSetSelectedSanitationVisit(visit);
        onSetIsSanitationHistoryOpen(true);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Sanitation Schedule</CardTitle>
                    <CardDescription>Manage office sanitation visits.</CardDescription>
                </div>
                <Button onClick={() => onSetIsCreateSanitationOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Schedule Visit
                </Button>
            </CardHeader>
            <CardContent>
                 {/* Desktop Table View */}
                <Table className="hidden md:table">
                    <TableHeader><TableRow><TableHead>Scheduled Date</TableHead><TableHead>Status</TableHead><TableHead>Assigned To</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {(sanitationVisitsData || []).map(visit => (
                            <TableRow key={visit.id}>
                                <TableCell>{toSafeDate(visit.scheduledDate)?.toLocaleDateString()}</TableCell>
                                <TableCell><Badge className={cn(
                                    visit.status === 'Completed' && 'bg-green-100 text-green-800',
                                    visit.status === 'Scheduled' && 'bg-blue-100 text-blue-800',
                                    visit.status === 'Cancelled' && 'bg-gray-100 text-gray-800'
                                )}>{visit.status}</Badge></TableCell>
                                <TableCell>{visit.assignedTo}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleViewReport(visit)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                     <Button variant="ghost" size="sm" onClick={() => {}}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                         {(sanitationVisitsData?.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No sanitation visits found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden">
                    {(sanitationVisitsData || []).map(visit => (
                        <Card key={visit.id}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{toSafeDate(visit.scheduledDate)?.toLocaleDateString()}</p>
                                        <p className="text-xs text-muted-foreground">Officer: {visit.assignedTo}</p>
                                    </div>
                                    <Badge className={cn(
                                        visit.status === 'Completed' && 'bg-green-100 text-green-800',
                                        visit.status === 'Scheduled' && 'bg-blue-100 text-blue-800',
                                        visit.status === 'Cancelled' && 'bg-gray-100 text-gray-800'
                                    )}>{visit.status}</Badge>
                                </div>
                                <div className="flex gap-2 pt-2">
                                     <Button variant="outline" size="sm" className="w-full" onClick={() => handleViewReport(visit)}>
                                        <Eye className="mr-2 h-4 w-4" /> View Report
                                    </Button>
                                    <Button variant="secondary" size="sm" className="w-full" onClick={() => {}}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit Visit
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {(sanitationVisitsData?.length === 0) && (
                        <p className="text-center text-muted-foreground py-10">No sanitation visits found.</p>
                    )}
                </div>

            </CardContent>
        </Card>
    );
}
