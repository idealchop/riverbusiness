
'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SanitationVisit } from '@/lib/types';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SanitationHistoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    visit: SanitationVisit | null;
}

export function SanitationHistoryDialog({ isOpen, onOpenChange, visit }: SanitationHistoryDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Sanitation Visit Details</DialogTitle>
                    <DialogDescription>
                        Details for the visit on {visit ? format(new Date(visit.scheduledDate), 'PP') : ''}.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <div className="py-4 pr-4 space-y-4">
                        {visit?.dispenserReports?.map(report => (
                            <Card key={report.dispenserId}>
                                <CardHeader>
                                    <CardTitle className="text-base">{report.dispenserName}</CardTitle>
                                    {report.dispenserCode && <CardDescription>Code: {report.dispenserCode}</CardDescription>}
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Checklist Item</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Remarks</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.checklist.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.item}</TableCell>
                                                    <TableCell>{item.checked ? 'Passed' : 'Failed'}</TableCell>
                                                    <TableCell>{item.remarks || 'N/A'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
