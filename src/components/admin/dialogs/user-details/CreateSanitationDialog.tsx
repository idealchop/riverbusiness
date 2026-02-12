'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AppUser, SanitationVisit } from '@/lib/types';
import { useAuth, useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, writeBatch, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, PlusCircle, MinusCircle, Trash2, Camera, XCircle } from 'lucide-react';
import { DocumentReference } from 'firebase/firestore';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';

const dispenserReportSchema = z.object({
    dispenserId: z.string(),
    dispenserName: z.string().min(1, "Dispenser name is required."),
    dispenserCode: z.string().optional(),
    checklist: z.array(z.object({
        item: z.string(),
        checked: z.boolean(),
        remarks: z.string().optional(),
    })),
});

const sanitationVisitSchema = z.object({
    scheduledDate: z.date({ required_error: "A date is required." }),
    assignedTo: z.string().min(1, "Please assign an officer."),
    status: z.enum(['Completed', 'Scheduled', 'Cancelled']),
    dispenserReports: z.array(dispenserReportSchema),
});
type SanitationVisitFormValues = z.infer<typeof sanitationVisitSchema>;

const defaultChecklist = [
    { item: 'Wipe down and sanitize the entire exterior of the unit.', checked: false, remarks: '' },
    { item: 'Remove, clean, and sanitize the drip tray.', checked: false, remarks: '' },
    { item: 'Sanitize and wipe all water dispensing points (faucets/taps).', checked: false, remarks: '' },
    { item: 'Flush the system with a cleaning solution to sanitize internal water lines.', checked: false, remarks: '' },
    { item: 'Thoroughly rinse the system to remove all cleaning solution.', checked: false, remarks: '' },
    { item: 'Inspect all connections and lines for any signs of leaks.', checked: false, remarks: '' },
    { item: 'Verify that hot and cold water are at appropriate temperatures (if applicable).', checked: false, remarks: '' },
    { item: 'Inspect and note the status of the water filter (if applicable).', checked: false, remarks: '' },
];


interface CreateSanitationDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    userDocRef: DocumentReference | null;
    user: AppUser;
    visitToEdit: SanitationVisit | null;
    setVisitToEdit: (visit: SanitationVisit | null) => void;
}

export function CreateSanitationDialog({ isOpen, onOpenChange, userDocRef, user, visitToEdit, setVisitToEdit }: CreateSanitationDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const storage = useStorage();
    const auth = useAuth();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [proofFiles, setProofFiles] = useState<File[]>([]);
    const [existingProofs, setExistingProofs] = useState<string[]>([]);

    const sanitationVisitForm = useForm<SanitationVisitFormValues>({
        resolver: zodResolver(sanitationVisitSchema),
        defaultValues: {
            status: 'Scheduled',
            dispenserReports: [{
                dispenserId: `disp-${Date.now()}`,
                dispenserName: 'Main Unit',
                checklist: defaultChecklist
            }]
        }
    });
    const { fields, append, remove } = useFieldArray({ control: sanitationVisitForm.control, name: "dispenserReports" });

    useEffect(() => {
        if (isOpen) {
            if (visitToEdit) {
                sanitationVisitForm.reset({
                    ...visitToEdit,
                    scheduledDate: new Date(visitToEdit.scheduledDate),
                });
                setExistingProofs(visitToEdit.proofUrls || []);
            } else {
                sanitationVisitForm.reset({
                    status: 'Scheduled',
                    assignedTo: '',
                    scheduledDate: new Date(),
                    dispenserReports: [{
                        dispenserId: `disp-${Date.now()}`,
                        dispenserName: 'Main Unit',
                        checklist: defaultChecklist,
                        dispenserCode: ''
                    }]
                });
                setExistingProofs([]);
            }
            setProofFiles([]);
        } else {
            setVisitToEdit(null);
        }
    }, [isOpen, visitToEdit, sanitationVisitForm, setVisitToEdit]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setProofFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeProofFile = (index: number) => {
        setProofFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingProof = (index: number) => {
        setExistingProofs(prev => prev.filter((_, i) => i !== index));
    };

    const handleSanitationVisitSubmit = async (values: SanitationVisitFormValues) => {
        if (!userDocRef || !firestore || !auth?.currentUser || !storage) return;
        setIsSubmitting(true);
        const isUpdate = !!visitToEdit;
        const adminId = auth.currentUser.uid;

        try {
            const batch = writeBatch(firestore);
            let uploadedUrls: string[] = [];
            
            if (proofFiles.length > 0) {
                const uploadPromises = proofFiles.map((file, idx) => {
                    const path = `admin_uploads/${adminId}/sanitation_proofs/${user.id}/${Date.now()}-${idx}-${file.name}`;
                    return uploadFileWithProgress(storage, auth, path, file, {}, (p) => setUploadProgress(p));
                });
                uploadedUrls = await Promise.all(uploadPromises);
            }

            const finalProofUrls = [...existingProofs, ...uploadedUrls];

            let visitId = visitToEdit?.id;
            if (!isUpdate) {
                const visitsCol = collection(userDocRef, 'sanitationVisits');
                const newVisitRef = doc(visitsCol);
                visitId = newVisitRef.id;
            }

            // Always update or create the public link entry with a fresh timestamp
            let shareableLink = visitToEdit?.shareableLink;
            let linkId = shareableLink?.split('/').pop();

            if (!shareableLink || !linkId) {
                const linkRef = doc(collection(firestore, 'publicSanitationLinks'));
                linkId = linkRef.id;
                shareableLink = `${window.location.origin}/sanitation-report/${linkId}`;
                batch.set(linkRef, { userId: user.id, visitId: visitId, createdAt: serverTimestamp() });
            } else {
                // Link exists, update the timestamp to "renew" its 7-day window
                const linkRef = doc(firestore, 'publicSanitationLinks', linkId);
                batch.set(linkRef, { userId: user.id, visitId: visitId!, createdAt: serverTimestamp() }, { merge: true });
            }

            const visitData = { 
                ...values, 
                id: visitId,
                userId: user.id,
                scheduledDate: values.scheduledDate.toISOString(),
                proofUrls: finalProofUrls,
                shareableLink: shareableLink
            };

            const visitRef = doc(userDocRef, 'sanitationVisits', visitId!);
            batch.set(visitRef, visitData, { merge: true });
            
            await batch.commit();
            toast({ title: isUpdate ? "Sanitation Visit Updated" : "Sanitation Visit Scheduled" });
            
            onOpenChange(false);
        } catch (error) {
            console.error("Sanitation visit submission failed:", error);
            toast({ variant: 'destructive', title: "Operation Failed" });
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };
    
    const handleDeleteVisit = async () => {
        if (!firestore || !visitToEdit) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            const visitRef = doc(firestore, 'users', visitToEdit.userId, 'sanitationVisits', visitToEdit.id);
            batch.delete(visitRef);

            if (visitToEdit.shareableLink) {
                const linkId = visitToEdit.shareableLink.split('/').pop();
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
        <AlertDialog>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader><DialogTitle>{visitToEdit ? 'Edit' : 'Schedule'} Sanitation Visit</DialogTitle></DialogHeader>
                    <form onSubmit={sanitationVisitForm.handleSubmit(handleSanitationVisitSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Scheduled Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !sanitationVisitForm.watch('scheduledDate') && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{sanitationVisitForm.watch('scheduledDate') ? format(sanitationVisitForm.watch('scheduledDate'), "PPP") : <span>Pick a date</span>}</Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={sanitationVisitForm.watch('scheduledDate')} onSelect={(date) => sanitationVisitForm.setValue('scheduledDate', date as Date)} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select onValueChange={(value) => sanitationVisitForm.setValue('status', value as any)} defaultValue={sanitationVisitForm.getValues('status')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label>Assigned To</Label>
                            <Input {...sanitationVisitForm.register('assignedTo')} placeholder="Enter officer name" />
                        </div>

                        <div className="space-y-4">
                            <Label className="flex items-center gap-2"><Camera className="h-4 w-4" /> Proof of Sanitation (Result Photos)</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {existingProofs.map((url, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border group">
                                        <Image src={url} alt={`Proof ${idx + 1}`} fill className="object-cover" />
                                        <button type="button" onClick={() => removeExistingProof(idx)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <XCircle className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                {proofFiles.map((file, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center group">
                                        <p className="text-[10px] text-center px-2 truncate">{file.name}</p>
                                        <button type="button" onClick={() => removeProofFile(idx)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <XCircle className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                                    <PlusCircle className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground mt-1">Add Photo</span>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                                </label>
                            </div>
                            {isSubmitting && uploadProgress > 0 && (
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Uploading files...</p>
                                    <Progress value={uploadProgress} className="h-1" />
                                </div>
                            )}
                        </div>

                        <Separator className="my-6" />

                        {fields.map((field, index) => (
                            <Card key={field.id}>
                                <CardHeader className="flex flex-row items-center justify-between py-4">
                                    <CardTitle className="text-base">Dispenser #{index + 1}</CardTitle>
                                    {fields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><MinusCircle className="h-4 w-4 text-destructive" /></Button>}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input {...sanitationVisitForm.register(`dispenserReports.${index}.dispenserName`)} placeholder="Dispenser Name (e.g., Lobby)" />
                                        <Input {...sanitationVisitForm.register(`dispenserReports.${index}.dispenserCode`)} placeholder="Dispenser Code (Optional)" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full border-dashed"
                            onClick={() => append({
                                dispenserId: `disp-${Date.now()}-${fields.length}`,
                                dispenserName: `Unit #${fields.length + 1}`,
                                checklist: defaultChecklist,
                                dispenserCode: ''
                            })}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Another Dispenser
                        </Button>
                        <DialogFooter className="pt-4 flex-row justify-between w-full">
                           <div>
                                {visitToEdit && (
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="destructive" disabled={isDeleting || isSubmitting}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Visit
                                        </Button>
                                    </AlertDialogTrigger>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : (visitToEdit ? 'Save Changes' : 'Schedule Visit')}</Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete this sanitation visit and its associated public link. This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteVisit} disabled={isDeleting}>
                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}