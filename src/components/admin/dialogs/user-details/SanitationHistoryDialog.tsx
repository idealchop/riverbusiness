'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SanitationVisit } from '@/lib/types';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Share2, Signature } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface SanitationHistoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    visit: SanitationVisit | null;
}

export function SanitationHistoryDialog({ isOpen, onOpenChange, visit }: SanitationHistoryDialogProps) {
    const { toast } = useToast();

    const handleShare = () => {
        if (visit?.shareableLink) {
            navigator.clipboard.writeText(visit.shareableLink);
            toast({
                title: 'Link Copied!',
                description: 'The shareable report link has been copied to your clipboard.',
            });
        }
    };

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
                        {visit?.dispenserReports && visit.dispenserReports.length > 0 ? (
                            visit.dispenserReports.map((report, reportIndex) => (
                            <Card key={report.dispenserId || reportIndex}>
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
                        ))
                        ) : (
                            <div className="text-center text-muted-foreground py-10">
                                <p>No checklist data has been recorded for this visit yet.</p>
                            </div>
                        )}

                        {visit?.status === 'Completed' && (visit.officerSignature || visit.clientSignature) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Signature className="h-5 w-5" />
                                        Signatures
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {visit.officerSignature && (
                                        <div className="space-y-2 text-center">
                                            <p className="text-xs font-semibold">Quality Officer</p>
                                            <Image src={visit.officerSignature} alt="Officer Signature" width={200} height={75} className="rounded-md border bg-white mx-auto"/>
                                            <div className="text-xs text-muted-foreground">
                                                <p>{visit.assignedTo}</p>
                                                <p>{visit.officerSignatureDate ? format(new Date(visit.officerSignatureDate), 'PP') : ''}</p>
                                            </div>
                                        </div>
                                    )}
                                    {visit.clientSignature && (
                                        <div className="space-y-2 text-center">
                                            <p className="text-xs font-semibold">Client Representative</p>
                                            <Image src={visit.clientSignature} alt="Client Signature" width={200} height={75} className="rounded-md border bg-white mx-auto"/>
                                            <div className="text-xs text-muted-foreground">
                                                <p>{visit.clientRepName}</p>
                                                <p>{visit.clientSignatureDate ? format(new Date(visit.clientSignatureDate), 'PP') : ''}</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="justify-between">
                     {visit?.shareableLink ? (
                        <Button variant="outline" onClick={handleShare}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share Report
                        </Button>
                    ) : (
                        <div /> 
                    )}
                    <DialogClose asChild>
                        <Button>Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
