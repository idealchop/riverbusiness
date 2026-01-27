'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useAuth, useCollection, useFirestore, useStorage, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, addDoc, deleteDoc, DocumentReference, serverTimestamp } from 'firebase/firestore';
import { WaterStation, ComplianceReport } from '@/lib/types';
import { PlusCircle, Trash2, Edit, Eye, MoreHorizontal, FileText, AlertTriangle, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import Image from 'next/image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';


const newStationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    location: z.string().min(1, 'Location is required'),
    status: z.enum(['Operational', 'Under Maintenance']).default('Operational'),
    statusMessage: z.string().optional(),
});
type NewStationFormValues = z.infer<typeof newStationSchema>;

const complianceReportSchema = z.object({
    reportType: z.enum(['DOH Bacteriological Test (Monthly)', 'DOH Bacteriological Test (Semi-Annual)', 'Sanitary Permit', 'Business Permit']),
    resultId: z.string().min(1, 'Result ID is required.'),
    status: z.enum(['Passed', 'Failed', 'Pending Review']),
    results: z.string().optional(),
    reportFile: z.any().optional(),
});
type ComplianceReportFormValues = z.infer<typeof complianceReportSchema>;

interface StationProfileDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    station: WaterStation | null;
    isAdmin: boolean;
}

export function StationProfileDialog({ isOpen, onOpenChange, station, isAdmin }: StationProfileDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const storage = useStorage();
    const auth = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedAgreementUrl, setUploadedAgreementUrl] = useState<string | null>(null);
    const [stationToDelete, setStationToDelete] = useState<WaterStation | null>(null);
    const [isComplianceReportDialogOpen, setIsComplianceReportDialogOpen] = useState(false);
    const [complianceReportToEdit, setComplianceReportToEdit] = useState<ComplianceReport | null>(null);
    const [complianceReportToDelete, setComplianceReportToDelete] = useState<ComplianceReport | null>(null);
    const [complianceAttachmentUrl, setComplianceAttachmentUrl] = useState<string | null>(null);
    
    const [complianceRefresher, setComplianceRefresher] = useState(0);
    const complianceReportsQuery = useMemoFirebase(
        () => (firestore && station?.id) ? collection(firestore, 'waterStations', station.id, 'complianceReports') : null,
        [firestore, station?.id, complianceRefresher]
    );
    const { data: complianceReports } = useCollection<ComplianceReport>(complianceReportsQuery);
    
    const stationForm = useForm<NewStationFormValues>({
        resolver: zodResolver(newStationSchema),
        defaultValues: { name: '', location: '', status: 'Operational', statusMessage: '' },
    });
    
    const complianceReportForm = useForm<ComplianceReportFormValues>({
        resolver: zodResolver(complianceReportSchema),
        defaultValues: { reportType: 'DOH Bacteriological Test (Monthly)', resultId: '', status: 'Pending Review', results: '' },
    });

    useEffect(() => {
        if (isOpen) {
            if (station) {
                stationForm.reset({ 
                    name: station.name, 
                    location: station.location,
                    status: station.status,
                    statusMessage: station.statusMessage || ''
                });
                setIsEditing(false);
            } else {
                stationForm.reset({ name: '', location: '', status: 'Operational', statusMessage: '' });
                setIsEditing(true); // Start in edit mode for new stations
                setUploadedAgreementUrl(null);
            }
        }
    }, [station, stationForm, isOpen]);

    useEffect(() => {
        if (isComplianceReportDialogOpen) {
            if (complianceReportToEdit) {
                complianceReportForm.reset({ ...complianceReportToEdit });
            } else {
                complianceReportForm.reset({ reportType: 'DOH Bacteriological Test (Monthly)', resultId: '', status: 'Pending Review', results: '', reportFile: null });
            }
        }
    }, [complianceReportToEdit, isComplianceReportDialogOpen, complianceReportForm]);

    const handleStationSubmit = async (values: NewStationFormValues) => {
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            if (station) {
                const stationRef = doc(firestore, 'waterStations', station.id);
                await updateDoc(stationRef, values);
                toast({ title: 'Station Updated' });
                setIsEditing(false);
            } else {
                await addDoc(collection(firestore, 'waterStations'), { ...values, partnershipAgreementUrl: uploadedAgreementUrl });
                toast({ title: "Station Created" });
                onOpenChange(false);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Operation Failed' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteStation = async () => {
        if (!stationToDelete || !firestore) return;
        await deleteDoc(doc(firestore, 'waterStations', stationToDelete.id));
        toast({ title: 'Station Deleted' });
        setStationToDelete(null);
        onOpenChange(false);
    };

    const handleAgreementFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !auth || !storage) return;
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const path = `stations/temp_agreements/${Date.now()}-${file.name}`;
            const downloadURL = await uploadFileWithProgress(storage, auth, path, file, {}, setUploadProgress);
            setUploadedAgreementUrl(downloadURL);
            toast({ title: "Upload Complete" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleComplianceReportSubmit = async (values: ComplianceReportFormValues) => {
        if (!firestore || !station || !auth || !storage) return;
        setIsSubmitting(true);
        try {
            const reportData: any = { ...values, name: `${values.reportType} - ${format(new Date(), 'MMM yyyy')}`, date: serverTimestamp() };
            const file = values.reportFile?.[0];
            if (file) {
                 const path = `stations/${station.id}/compliance/${complianceReportToEdit?.id || Date.now()}-${file.name}`;
                 reportData.reportUrl = await uploadFileWithProgress(storage, auth, path, file, {}, setUploadProgress);
            }
            delete reportData.reportFile;
            if (complianceReportToEdit) {
                await updateDoc(doc(firestore, 'waterStations', station.id, 'complianceReports', complianceReportToEdit.id), reportData);
                toast({ title: 'Report Updated' });
            } else {
                await addDoc(collection(firestore, 'waterStations', station.id, 'complianceReports'), reportData);
                toast({ title: 'Report Created' });
            }
            setIsComplianceReportDialogOpen(false);
            setComplianceReportToEdit(null);
            setComplianceRefresher(c => c + 1);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Operation Failed' });
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    const handleDeleteComplianceReport = async () => {
        if (!firestore || !station || !complianceReportToDelete) return;
        await deleteDoc(doc(firestore, 'waterStations', station.id, 'complianceReports', complianceReportToDelete.id));
        toast({ title: "Report Deleted" });
        setComplianceReportToDelete(null);
        setComplianceRefresher(c => c + 1);
    };
    
    const cancelEdit = () => {
        setIsEditing(false);
        if (station) {
             stationForm.reset({ 
                name: station.name, 
                location: station.location,
                status: station.status,
                statusMessage: station.statusMessage || ''
            });
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-3xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{station ? 'Station Profile' : 'Create New Station'}</DialogTitle>
                        <DialogDescription>{station ? `Manage compliance for ${station.name}.` : "Set up a new water refilling station."}</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="pr-6 -mr-6">
                        <div className="space-y-8 p-4">
                            <Form {...stationForm}>
                                <form className="space-y-4" onSubmit={stationForm.handleSubmit(handleStationSubmit)}>
                                     <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-semibold text-base">Station Details</h3>
                                        {station && !isEditing && (
                                            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)} disabled={!isAdmin}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit Details
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <FormField control={stationForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Station Name</FormLabel><FormControl><Input {...field} disabled={!isEditing || !isAdmin} /></FormControl><FormMessage /></FormItem>)}/>
                                      <FormField control={stationForm.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} disabled={!isEditing || !isAdmin} /></FormControl><FormMessage /></FormItem>)}/>
                                    </div>
                                    {station && ( <>
                                        <FormField control={stationForm.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isEditing || !isAdmin}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Operational">Operational</SelectItem><SelectItem value="Under Maintenance">Under Maintenance</SelectItem></SelectContent></Select></FormItem>)}/>
                                        {stationForm.watch('status') === 'Under Maintenance' && (<FormField control={stationForm.control} name="statusMessage" render={({ field }) => (<FormItem><FormLabel>Status Message</FormLabel><FormControl><Textarea {...field} disabled={!isEditing || !isAdmin} /></FormControl></FormItem>)}/>)}
                                    </>)}
                                    {isEditing && station && (
                                        <div className="flex justify-end gap-2">
                                            <Button type="button" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                                            <Button type="submit" size="sm" disabled={!isAdmin || isSubmitting}>Save Details</Button>
                                        </div>
                                    )}
                                </form>
                            </Form>
                            <Separator />
                            {station && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <div><h3 className="font-semibold text-base">Compliance Docs</h3><p className="text-sm text-muted-foreground">Manage compliance reports.</p></div>
                                        <Button size="sm" onClick={() => setIsComplianceReportDialogOpen(true)} disabled={!station}><PlusCircle className="mr-2 h-4 w-4" /> Create Report</Button>
                                    </div>
                                    <Table className="hidden md:table">
                                        <TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Month</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {complianceReports?.map((report) => (
                                                <TableRow key={report.id}>
                                                    <TableCell>{report.name}</TableCell>
                                                    <TableCell>{report.date ? format((report.date as any).toDate(), 'MMM yyyy') : 'N/A'}</TableCell>
                                                    <TableCell><Badge variant={report.status === 'Passed' ? 'default' : report.status === 'Failed' ? 'destructive' : 'secondary'} className={cn('text-xs', report.status === 'Passed' && 'bg-green-100 text-green-800', report.status === 'Failed' && 'bg-red-100 text-red-800', report.status === 'Pending Review' && 'bg-yellow-100 text-yellow-800')}>{report.status}</Badge></TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => setComplianceAttachmentUrl(report.reportUrl!)} disabled={!report.reportUrl}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => { setComplianceReportToEdit(report); setIsComplianceReportDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                                                <DropdownMenuItem className="text-destructive" onClick={() => setComplianceReportToDelete(report)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(complianceReports?.length === 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center">No compliance reports yet.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                    <div className="space-y-4 md:hidden">
                                        {(complianceReports && complianceReports.length > 0) ? complianceReports.map((report) => (
                                            <Card key={report.id}>
                                                <CardContent className="p-4 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold">{report.name}</p>
                                                            <p className="text-xs text-muted-foreground">{report.date ? format((report.date as any).toDate(), 'MMM yyyy') : 'N/A'}</p>
                                                        </div>
                                                        <Badge variant={report.status === 'Passed' ? 'default' : report.status === 'Failed' ? 'destructive' : 'secondary'} className={cn('text-xs', report.status === 'Passed' && 'bg-green-100 text-green-800', report.status === 'Failed' && 'bg-red-100 text-red-800', report.status === 'Pending Review' && 'bg-yellow-100 text-yellow-800')}>{report.status}</Badge>
                                                    </div>
                                                    <div className="flex gap-2 pt-2">
                                                        <Button variant="outline" size="sm" className="w-full" onClick={() => setComplianceAttachmentUrl(report.reportUrl!)} disabled={!report.reportUrl}><Eye className="mr-2 h-4 w-4" />View</Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="secondary" size="sm" className="w-full">Actions</Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => { setComplianceReportToEdit(report); setIsComplianceReportDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                                                <DropdownMenuItem className="text-destructive" onClick={() => setComplianceReportToDelete(report)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )) : (
                                            <p className="text-center py-10 text-muted-foreground">No compliance reports found.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                            <Separator />
                            <div>
                                <h3 className="font-semibold text-base mb-1">Partnership Agreement</h3>
                                <div className="flex items-center gap-4 p-4 border rounded-lg">
                                    {station?.partnershipAgreementUrl ? (<><FileText className="h-6 w-6"/><div className="flex-1"><p>Agreement on File</p></div><Button asChild variant="outline"><a href={station.partnershipAgreementUrl} target="_blank" rel="noopener noreferrer"><Eye className="mr-2 h-4 w-4" /> View</a></Button></>)
                                    : (<div className="w-full"><Label>Attach Signed Agreement</Label><Input type="file" onChange={handleAgreementFileChange} disabled={isUploading}/>{isUploading && <Progress value={uploadProgress} className="mt-2" />}</div>)}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="mt-4 pt-4 border-t flex justify-between w-full">
                        <div>{station && (<Button variant="destructive" onClick={() => setStationToDelete(station)} disabled={!isAdmin || isSubmitting}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>)}</div>
                        <div className="flex gap-2"><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>{!station && (<Button onClick={stationForm.handleSubmit(handleStationSubmit)} disabled={isSubmitting || isUploading || !stationForm.formState.isValid}>{isSubmitting ? "Creating..." : "Create"}</Button>)}</div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isComplianceReportDialogOpen} onOpenChange={setIsComplianceReportDialogOpen}>
                 <DialogContent><DialogHeader><DialogTitle>{complianceReportToEdit ? 'Edit' : 'Create'} Compliance Report</DialogTitle><DialogDescription>Fill out the report details.</DialogDescription></DialogHeader>
                 <Form {...complianceReportForm}><form onSubmit={complianceReportForm.handleSubmit(handleComplianceReportSubmit)} className="space-y-4 py-4"><FormField control={complianceReportForm.control} name="reportType" render={({ field }) => (<FormItem><FormLabel>Report Type</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="DOH Bacteriological Test (Monthly)">DOH Bacteriological Test (Monthly)</SelectItem><SelectItem value="DOH Bacteriological Test (Semi-Annual)">DOH Bacteriological Test (Semi-Annual)</SelectItem><SelectItem value="Sanitary Permit">Sanitary Permit</SelectItem><SelectItem value="Business Permit">Business Permit</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={complianceReportForm.control} name="resultId" render={({ field }) => (<FormItem><FormLabel>Result ID</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} /><FormField control={complianceReportForm.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Passed">Passed</SelectItem><SelectItem value="Failed">Failed</SelectItem><SelectItem value="Pending Review">Pending Review</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={complianceReportForm.control} name="results" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} /><FormField control={complianceReportForm.control} name="reportFile" render={({ field }) => (<FormItem><FormLabel>Attach File</FormLabel><FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files)} disabled={isSubmitting} /></FormControl>{isSubmitting && (<Progress value={uploadProgress} className="mt-2" />)}<FormDescription>{complianceReportToEdit?.reportUrl && "Attaching a new file will replace the existing one."}</FormDescription><FormMessage /></FormItem>)} /><DialogFooter><DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button></DialogFooter></form></Form></DialogContent>
            </Dialog>

            <AlertDialog open={!!complianceReportToDelete} onOpenChange={(open) => !open && setComplianceReportToDelete(null)}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete the report: <span className="font-semibold">{complianceReportToDelete?.name}</span>.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteComplianceReport}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={!!complianceAttachmentUrl} onOpenChange={(open) => !open && setComplianceAttachmentUrl(null)}>
                <DialogContent><DialogHeader><DialogTitle>Compliance Document</DialogTitle></DialogHeader>{complianceAttachmentUrl && (<div className="py-4"><Image src={complianceAttachmentUrl} alt="Compliance Document" width={400} height={600} className="rounded-md mx-auto" /></div>)}<DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter></DialogContent>
            </Dialog>

             <AlertDialog open={!!stationToDelete} onOpenChange={(open) => !open && setStationToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action will permanently delete the water station <span className="font-semibold">{stationToDelete?.name}</span>.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setStationToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStation}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
