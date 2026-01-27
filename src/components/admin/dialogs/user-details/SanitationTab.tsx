
'use client';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SanitationVisit } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { PlusCircle, Eye } from 'lucide-react';

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
                <Table>
                    <TableHeader><TableRow><TableHead>Scheduled Date</TableHead><TableHead>Status</TableHead><TableHead>Assigned To</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {(sanitationVisitsData || []).map(visit => (
                            <TableRow key={visit.id}>
                                <TableCell>{toSafeDate(visit.scheduledDate)?.toLocaleDateString()}</TableCell>
                                <TableCell><Badge>{visit.status}</Badge></TableCell>
                                <TableCell>{visit.assignedTo}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => { onSetSelectedSanitationVisit(visit); onSetIsSanitationHistoryOpen(true); }}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
