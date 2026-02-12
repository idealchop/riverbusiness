'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { SanitationVisit } from '@/lib/types';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Share2, Signature, Hourglass, CheckCircle, AlertTriangle, Trash2, Camera, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';

interface SanitationHistoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    visit: SanitationVisit | null;
    isAdmin: boolean;
}

export function SanitationHistoryDialog({ isOpen, onOpenChange, visit, isAdmin }: SanitationHistoryDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isSharing, setIsSharing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedImg, setSelectedImg] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setIsSharing(false);
            setIsDeleting(false);
            setSelectedImg(null);
        }
    }, [isOpen]);

    const handleShare = () => {
        if (visit?.shareableLink && !isSharing) {
            setIsSharing(true);
            navigator.clipboard.writeText(visit.shareableLink)
                .then(() => {
                    toast({
                        title: 'Link Copied!',
                        description: 'The shareable report link has been copied to your clipboard.',
                    });
                })
                .catch(err => {
                    console.error("Failed to copy link:", err);
                    toast({
                        variant: 'destructive',
                        title: 'Copy Failed',
                        description: 'Could not copy the link to your clipboard.',
                    });
                })
                .finally(() => {
                    setIsSharing(false);
                });
        }
    };

    const handleDeleteVisit = async () => {
        if (!firestore || !visit) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            const visitRef = doc(firestore, 'users', visit.userId, 'sanitationVisits', visit.id);
            batch.delete(visitRef);

            if (visit.shareableLink) {
                const linkId = visit.shareableLink.split('/').pop();
                if (linkId) {
                    const linkRef = doc(firestore, 'publicSanitationLinks', linkId);
                    batch.delete(linkRef);
                }
            }
            
            await batch.commit();
            toast({ title: "Visit Deleted" });
            onOpenChange(false);
        } catch (error) {
            console.error("Error deleting visit:", error);
            toast({ variant: 'destructive', title: "Delete Failed" });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Sanitation Visit Details</DialogTitle>
                    <DialogDescription>
                        Details for the visit on {visit ? format(new Date(visit.scheduledDate), 'PP') : ''}.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <div className="py-4 pr-4 space-y-6">
                        {/* Proof Photos Gallery */}
                        {visit?.proofUrls && visit.proofUrls.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Camera className="h-4 w-4 text-primary" />
                                        Proof of Service
                                    </CardTitle>
                                    <CardDescription className="text-xs">Actual photos of the sanitized equipment.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-2">
                                        {visit.proofUrls.map((url, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-md overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setSelectedImg(url)}>
                                                <Image src={url} alt={`Proof ${idx + 1}`} fill className="object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                                                    <Eye className="h-5 w-5 text-white" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

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
                                                <TableHead className="text-right w-24">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.checklist.map((item, index) => (
                                                <TableRow key={index} className={cn(visit?.status === 'Completed' && !item.checked && "bg-destructive/5")}>
                                                    <TableCell className="font-medium text-xs w-full">
                                                        {item.item}
                                                        {visit?.status === 'Completed' && !item.checked && item.remarks && (
                                                            <p className="text-destructive text-xs mt-1 pl-2 border-l-2 border-destructive">
                                                                <span className="font-bold">Remarks:</span> {item.remarks}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {visit?.status === 'Scheduled' ? (
                                                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 whitespace-nowrap"><Hourglass className="h-3 w-3 mr-1" /> Pending</Badge>
                                                        ) : item.checked ? (
                                                            <Badge variant="secondary" className="bg-green-100 text-green-800 whitespace-nowrap"><CheckCircle className="h-3 w-3 mr-1" /> Passed</Badge>
                                                        ) : (
                                                            <Badge variant="destructive" className="whitespace-nowrap"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>
                                                        )}
                                                    </TableCell>
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
                <DialogFooter className="flex-row justify-between items-center">
                    <div className="flex gap-2">
                         {visit?.shareableLink && (
                            <Button variant="outline" onClick={handleShare} disabled={isSharing}>
                                {isSharing ? <Hourglass className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                                {isSharing ? 'Copying...' : 'Share Report'}
                            </Button>
                        )}
                        {isAdmin && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isDeleting}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action will permanently delete this sanitation visit and its associated public link. This cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteVisit}>
                                            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Local Image Zoom Dialog */}
        <Dialog open={!!selectedImg} onOpenChange={() => setSelectedImg(null)}>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>Image Preview</DialogTitle>
                    <DialogDescription>Full size preview of the sanitation proof image.</DialogDescription>
                </DialogHeader>
                {selectedImg && (
                    <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center">
                        <Image src={selectedImg} alt="Proof Large" fill className="object-contain" />
                    </div>
                )}
            </DialogContent>
        </Dialog>
        </>
    );
}