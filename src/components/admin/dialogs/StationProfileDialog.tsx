'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter, 
    DialogClose 
} from '@/components/ui/dialog';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogFooter 
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Form, 
    FormControl, 
    FormField, 
    FormItem, 
    FormLabel, 
    FormMessage, 
    FormDescription 
} from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useAuth, useCollection, useFirestore, useStorage, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { WaterStation, ComplianceReport } from '@/lib/types';
import { 
    PlusCircle, 
    Trash2, 
    Edit, 
    Eye, 
    MoreHorizontal, 
    FileText, 
    AlertTriangle, 
    ShieldCheck,
    MapPin,
    Mail,
    Phone,
    CheckCircle,
    Loader2,
    Save,
    ChevronRight,
    Activity,
    Landmark,
    Droplets,
    X,
    XCircle
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import Image from 'next/image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';

const newStationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    location: z.string().min(1, 'Location is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    contactNumber: z.string().min(1, 'Contact number is required').optional().or(z.literal('')),
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

    const [activeTab, setActiveTab] = useState('profile');
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

    const [complianceCurrentPage, setComplianceCurrentPage] = useState(1);
    const COMPLIANCE_ITEMS_PER_PAGE = 5;

    const totalCompliancePages = useMemo(() => {
        if (!complianceReports) return 0;
        return Math.ceil(complianceReports.length / COMPLIANCE_ITEMS_PER_PAGE);
    }, [complianceReports]);

    const paginatedComplianceReports = useMemo(() => {
        if (!complianceReports) return [];
        const startIndex = (complianceCurrentPage - 1) * COMPLIANCE_ITEMS_PER_PAGE;
        return complianceReports.slice(startIndex, startIndex + COMPLIANCE_ITEMS_PER_PAGE);
    }, [complianceReports, complianceCurrentPage]);
    
    const stationForm = useForm<NewStationFormValues>({
        resolver: zodResolver(newStationSchema),
        defaultValues: { 
            name: '', 
            location: '', 
            email: '', 
            contactNumber: '', 
            status: 'Operational', 
            statusMessage: '' 
        },
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
                    email: station.email || '',
                    contactNumber: station.contactNumber || '',
                    status: station.status,
                    statusMessage: station.statusMessage || ''
                });
                setIsEditing(false);
                setActiveTab('profile');
            } else {
                stationForm.reset({ name: '', location: '', email: '', contactNumber: '', status: 'Operational', statusMessage: '' });
                setIsEditing(true);
                setUploadedAgreementUrl(null);
                setActiveTab('profile');
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
                email: station.email || '',
                contactNumber: station.contactNumber || '',
                status: station.status,
                statusMessage: station.statusMessage || ''
            });
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-4xl rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-3xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col">
                    <div className="bg-slate-900 text-white p-8 shrink-0">
                        <DialogHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                                        <Droplets className="h-6 w-6 text-primary-light" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-2xl font-black tracking-tight uppercase">
                                            {station ? station.name : 'Initialize Station'}
                                        </DialogTitle>
                                        <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">
                                            {station ? `Network Hub: ${station.id.substring(0, 8).toUpperCase()}` : 'Network Infrastructure Setup'}
                                        </DialogDescription>
                                    </div>
                                </div>
                                {station && (
                                    <Badge className={cn(
                                        "h-7 px-4 font-black uppercase text-[10px] tracking-widest border-none shadow-none",
                                        station.status === 'Operational' ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    )}>
                                        <Activity className="mr-2 h-3.5 w-3.5" />
                                        {station.status}
                                    </Badge>
                                )}
                            </div>
                        </DialogHeader>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
                        <div className="px-8 border-b bg-white shrink-0">
                            <TabsList className="bg-transparent h-12 p-0 gap-8">
                                <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-black text-[10px] uppercase tracking-widest px-0">Station Profile</TabsTrigger>
                                {station && (
                                    <TabsTrigger value="compliance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-black text-[10px] uppercase tracking-widest px-0">Compliance Ledger</TabsTrigger>
                                )}
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1 min-h-0">
                            <div className="p-8">
                                <TabsContent value="profile" className="m-0 space-y-8 animate-in fade-in duration-500">
                                    <Form {...stationForm}>
                                        <form onSubmit={stationForm.handleSubmit(handleStationSubmit)} className="space-y-8">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Hub Credentials</h4>
                                                {station && !isEditing && isAdmin && (
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)} className="rounded-xl h-8 text-[9px] font-black uppercase tracking-widest border-slate-200">
                                                        <Edit className="mr-2 h-3 w-3" /> Unlock Edit
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                                                <FormField control={stationForm.control} name="name" render={({ field }) => (
                                                    <FormItem className="space-y-1.5">
                                                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Fulfillment center name</FormLabel>
                                                        <FormControl><Input {...field} disabled={!isEditing || !isAdmin} className="h-12 rounded-xl bg-white border-slate-200 font-bold px-4 shadow-sm" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>)} 
                                                />
                                                <FormField control={stationForm.control} name="location" render={({ field }) => (
                                                    <FormItem className="space-y-1.5">
                                                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Geographic location</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                                                <Input {...field} disabled={!isEditing || !isAdmin} className="h-12 rounded-xl bg-white border-slate-200 font-bold pl-10 shadow-sm" />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>)} 
                                                />
                                                <FormField control={stationForm.control} name="email" render={({ field }) => (
                                                    <FormItem className="space-y-1.5">
                                                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Administrative Email</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                                                <Input type="email" {...field} disabled={!isEditing || !isAdmin} className="h-12 rounded-xl bg-white border-slate-200 font-bold pl-10 shadow-sm" />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>)} 
                                                />
                                                <FormField control={stationForm.control} name="contactNumber" render={({ field }) => (
                                                    <FormItem className="space-y-1.5">
                                                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Dispatch Contact</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                                                <Input {...field} disabled={!isEditing || !isAdmin} className="h-12 rounded-xl bg-white border-slate-200 font-bold pl-10 shadow-sm" />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>)} 
                                                />
                                            </div>

                                            {station && (
                                                <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm space-y-6">
                                                    <FormField control={stationForm.control} name="status" render={({ field }) => (
                                                        <FormItem className="space-y-1.5">
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operational protocol</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing || !isAdmin}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="rounded-xl">
                                                                    <SelectItem value="Operational">Operational</SelectItem>
                                                                    <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>)} 
                                                    />
                                                    {stationForm.watch('status') === 'Under Maintenance' && (
                                                        <FormField control={stationForm.control} name="statusMessage" render={({ field }) => (
                                                            <FormItem className="space-y-1.5">
                                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Maintenance Broadcast</FormLabel>
                                                                <FormControl><Textarea {...field} disabled={!isEditing || !isAdmin} placeholder="Details for affected clients..." className="rounded-xl bg-slate-50 border-slate-100 min-h-[100px] font-medium resize-none shadow-inner" /></FormControl>
                                                            </FormItem>)} 
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {isEditing && (
                                                <div className="flex justify-end gap-3 pt-4 border-t animate-in slide-in-from-top-2">
                                                    {station && <Button type="button" variant="ghost" onClick={cancelEdit} className="rounded-xl h-10 font-bold text-xs">Discard</Button>}
                                                    <Button type="submit" disabled={isSubmitting} className="rounded-xl h-10 px-8 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                                                        {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                                                        {station ? 'Apply Changes' : 'Initialize Hub'}
                                                    </Button>
                                                </div>
                                            )}
                                        </form>
                                    </Form>

                                    <div className="space-y-6 pt-10">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Administrative Assets</h4>
                                        <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden group">
                                            <CardContent className="p-0">
                                                <div className="flex flex-col sm:flex-row items-center gap-6 p-6">
                                                    <div className={cn(
                                                        "p-5 rounded-2xl shadow-inner border transition-colors",
                                                        station?.partnershipAgreementUrl ? "bg-green-50 text-green-600 border-green-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                                    )}>
                                                        <Landmark className="h-8 w-8" />
                                                    </div>
                                                    <div className="flex-1 space-y-1 text-center sm:text-left">
                                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Partnership Agreement</p>
                                                        <p className="text-xs font-medium text-slate-500">Authorized legal documentation on secure file.</p>
                                                    </div>
                                                    <div className="shrink-0 w-full sm:w-auto">
                                                        {station?.partnershipAgreementUrl ? (
                                                            <Button asChild variant="outline" className="w-full rounded-xl h-10 font-bold text-[10px] uppercase tracking-widest gap-2 bg-white border-slate-200 hover:bg-slate-50 transition-all">
                                                                <a href={station.partnershipAgreementUrl} target="_blank" rel="noopener noreferrer">
                                                                    <Eye className="h-3.5 w-3.5" /> Open Document
                                                                </a>
                                                            </Button>
                                                        ) : (
                                                            <div className="space-y-4 w-full">
                                                                <Label htmlFor="agreement-upload" className="block text-center sm:text-right text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-light cursor-pointer transition-colors">
                                                                    Upload signed PDF
                                                                </Label>
                                                                <input id="agreement-upload" type="file" onChange={handleAgreementFileChange} disabled={isUploading} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                                                                {isUploading && (
                                                                    <div className="space-y-1">
                                                                        <Progress value={uploadProgress} className="h-1 bg-slate-100" />
                                                                        <p className="text-[8px] font-black text-right text-primary uppercase">Synchronizing {uploadProgress.toFixed(0)}%</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>

                                {station && (
                                    <TabsContent value="compliance" className="m-0 space-y-8 animate-in fade-in duration-500">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Compliance Ledger</h4>
                                                <p className="text-sm font-bold text-slate-900 mt-1">Audit trail for laboratory results and permits.</p>
                                            </div>
                                            <Button size="sm" onClick={() => setIsComplianceReportDialogOpen(true)} className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-primary/20">
                                                <PlusCircle className="h-4 w-4" /> Create Record
                                            </Button>
                                        </div>

                                        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader className="bg-slate-50/50">
                                                        <TableRow className="border-none">
                                                            <TableHead className="pl-6 py-4 font-bold text-[10px] uppercase tracking-widest text-slate-400">Document Classification</TableHead>
                                                            <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Valid period</TableHead>
                                                            <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                                                            <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-widest text-slate-400">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {paginatedComplianceReports?.map((report) => (
                                                            <TableRow key={report.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                                                <TableCell className="pl-6 py-5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                                                            <ShieldCheck className="h-4 w-4" />
                                                                        </div>
                                                                        <span className="font-bold text-sm text-slate-900">{report.name}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-xs font-semibold text-slate-500 uppercase tracking-tight">
                                                                    {report.date ? format((report.date as any).toDate(), 'MMM yyyy') : 'N/A'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge className={cn(
                                                                        "text-[9px] font-black uppercase tracking-widest border-none px-3 h-6",
                                                                        report.status === 'Passed' ? "bg-green-50 text-green-700 shadow-sm" : 
                                                                        report.status === 'Failed' ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                                                                    )}>
                                                                        {report.status}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right pr-6">
                                                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5" onClick={() => setComplianceAttachmentUrl(report.reportUrl!)} disabled={!report.reportUrl}>
                                                                            <Eye className="h-4 w-4" />
                                                                        </Button>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900"><MoreHorizontal className="h-4 w-4" /></Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-2xl border-slate-100">
                                                                                <DropdownMenuItem onClick={() => { setComplianceReportToEdit(report); setIsComplianceReportDialogOpen(true); }} className="gap-2 font-semibold text-xs py-2.5 rounded-lg cursor-pointer">
                                                                                    <Edit className="h-3.5 w-3.5" /> Update Record
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem className="gap-2 font-semibold text-xs py-2.5 text-red-600 focus:text-red-600 rounded-lg cursor-pointer" onClick={() => setComplianceReportToDelete(report)}>
                                                                                    <Trash2 className="h-3.5 w-3.5" /> Purge Entry
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {(!paginatedComplianceReports || paginatedComplianceReports.length === 0) && (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="h-40 text-center opacity-30 font-bold uppercase text-[10px] tracking-[0.3em]">No records in ledger</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            {totalCompliancePages > 1 && (
                                                <CardFooter className="p-4 border-t bg-slate-50/30 flex items-center justify-between">
                                                    <span className="text-[9px] font-black uppercase text-slate-400">Page {complianceCurrentPage} of {totalCompliancePages}</span>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase px-4 rounded-lg bg-white" onClick={() => setComplianceCurrentPage(p => Math.max(1, p - 1))} disabled={complianceCurrentPage === 1}>Prev</Button>
                                                        <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase px-4 rounded-lg bg-white" onClick={() => setComplianceCurrentPage(p => Math.min(totalCompliancePages, p + 1))} disabled={complianceCurrentPage === totalCompliancePages}>Next</Button>
                                                    </div>
                                                </CardFooter>
                                            )}
                                        </Card>
                                    </TabsContent>
                                )}
                            </div>
                        </ScrollArea>
                    </Tabs>

                    <DialogFooter className="p-6 md:p-8 pt-4 border-t bg-white flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
                        <div className="w-full md:w-auto">
                            {station && isAdmin && (
                                <Button variant="ghost" onClick={() => setStationToDelete(station)} className="w-full md:w-auto rounded-xl h-11 px-8 font-black uppercase tracking-widest text-[9px] text-red-400 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 className="mr-2 h-4 w-4" /> Decommission Hub
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <DialogClose asChild>
                                <Button variant="outline" className="flex-1 md:flex-none rounded-xl h-11 px-10 font-black uppercase tracking-widest text-[10px] border-slate-200 shadow-sm bg-white">Close Detail</Button>
                            </DialogClose>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isComplianceReportDialogOpen} onOpenChange={setIsComplianceReportDialogOpen}>
                 <DialogContent className="rounded-3xl border-none shadow-3xl bg-white p-8 sm:max-w-lg">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-xl font-bold tracking-tight">{complianceReportToEdit ? 'Adjust' : 'Generate'} Compliance Record</DialogTitle>
                        <DialogDescription className="text-xs font-medium text-slate-500">Official quality and permit synchronization protocol.</DialogDescription>
                    </DialogHeader>
                    <Form {...complianceReportForm}>
                        <form onSubmit={complianceReportForm.handleSubmit(handleComplianceReportSubmit)} className="space-y-6">
                            <FormField control={complianceReportForm.control} name="reportType" render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Report Classification</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold shadow-none">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-xl shadow-2xl">
                                            <SelectItem value="DOH Bacteriological Test (Monthly)">DOH Bacteriological Test (Monthly)</SelectItem>
                                            <SelectItem value="DOH Bacteriological Test (Semi-Annual)">DOH Bacteriological Test (Semi-Annual)</SelectItem>
                                            <SelectItem value="Sanitary Permit">Sanitary Permit</SelectItem>
                                            <SelectItem value="Business Permit">Business Permit</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>)} 
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={complianceReportForm.control} name="resultId" render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Laboratory Ref #</FormLabel>
                                        <FormControl><Input {...field} disabled={isSubmitting} className="h-11 rounded-xl bg-slate-50 border-slate-100 font-mono text-xs uppercase" /></FormControl>
                                        <FormMessage />
                                    </FormItem>)} 
                                />
                                <FormField control={complianceReportForm.control} name="status" render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Resolution</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                            <FormControl>
                                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold shadow-none">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="Passed">Passed</SelectItem>
                                                <SelectItem value="Failed">Failed</SelectItem>
                                                <SelectItem value="Pending Review">Pending Review</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>)} 
                                />
                            </div>
                            <FormField control={complianceReportForm.control} name="results" render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Protocol Notes</FormLabel>
                                    <FormControl><Textarea {...field} value={field.value ?? ''} disabled={isSubmitting} className="rounded-xl bg-slate-50 border-slate-100 min-h-[80px] font-medium resize-none shadow-inner" /></FormControl>
                                    <FormMessage />
                                </FormItem>)} 
                            />
                            <FormField control={complianceReportForm.control} name="reportFile" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Supporting attachment (PDF/Image)</FormLabel>
                                    <FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files)} disabled={isSubmitting} className="h-11 rounded-xl bg-slate-50 border-slate-100" /></FormControl>
                                    {isSubmitting && uploadProgress > 0 && (<Progress value={uploadProgress} className="h-1" />)}
                                    <FormDescription className="text-[9px] font-bold text-amber-500 uppercase">{complianceReportToEdit?.reportUrl && "Replacing existing file..."}</FormDescription>
                                    <FormMessage />
                                </FormItem>)} 
                            />
                            <DialogFooter className="pt-6 border-t gap-3">
                                <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => setIsComplianceReportDialogOpen(false)} className="rounded-xl h-11 px-6 font-bold text-xs uppercase tracking-widest text-slate-400">Cancel</Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl h-11 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                                    Commit Record
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!complianceReportToDelete} onOpenChange={(open) => !open && setComplianceReportToDelete(null)}>
                <AlertDialogContent className="rounded-3xl border-none shadow-3xl p-10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Purge entry?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed pt-2">
                            This will permanently remove the record: <span className="font-bold text-slate-900">{complianceReportToDelete?.name}</span> from the station's history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-6">
                        <AlertDialogCancel className="rounded-xl font-bold text-xs uppercase tracking-widest h-11 px-8">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteComplianceReport} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold text-xs uppercase tracking-widest h-11 px-8">Authorize Purge</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={!!complianceAttachmentUrl} onOpenChange={(open) => !open && setComplianceAttachmentUrl(null)}>
                <DialogContent className="sm:max-w-2xl lg:max-w-4xl p-0 overflow-hidden border-none shadow-3xl bg-slate-950 rounded-[2.5rem] h-[85vh] flex flex-col">
                    <div className="p-6 bg-black/20 backdrop-blur-md flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white/10 text-white"><FileText className="h-4 w-4" /></div>
                            <h4 className="text-sm font-black text-white uppercase tracking-tight">Record Evidence</h4>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setComplianceAttachmentUrl(null)} className="h-8 w-8 rounded-full text-white/40 hover:text-white hover:bg-white/10"><X className="h-5 w-5" /></Button>
                    </div>
                    <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-black/20">
                        {complianceAttachmentUrl && (
                            <Image src={complianceAttachmentUrl} alt="Compliance Document" width={800} height={1200} className="rounded-xl shadow-2xl object-contain h-full w-full" unoptimized />
                        )}
                    </div>
                    <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">River Infrastructure Audit Record</p>
                    </div>
                </DialogContent>
            </Dialog>

             <AlertDialog open={!!stationToDelete} onOpenChange={(open) => !open && setStationToDelete(null)}>
                <AlertDialogContent className="rounded-3xl border-none shadow-3xl p-10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Decommission center?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed pt-2">
                            This action will permanently purge the water station <span className="font-bold text-slate-900">{stationToDelete?.name}</span> and all associated historical records from the active network infrastructure.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-6">
                        <AlertDialogCancel onClick={() => setStationToDelete(null)} className="rounded-xl font-bold text-xs uppercase tracking-widest h-11 px-8">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStation} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold text-xs uppercase tracking-widest h-11 px-8">Decommission</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}