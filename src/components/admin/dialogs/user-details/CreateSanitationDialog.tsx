
'use client';

import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AppUser, SanitationVisit } from '@/lib/types';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, PlusCircle, MinusCircle } from 'lucide-react';
import { createClientNotification } from '@/lib/notifications';
import { DocumentReference } from 'firebase/firestore';

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
    onOpenChange: (isOpen: boolean) => void;
    userDocRef: DocumentReference | null;
    user: AppUser;
    visitToEdit: SanitationVisit | null;
    setVisitToEdit: (visit: SanitationVisit | null) => void;
}

export function CreateSanitationDialog({ isOpen, onOpenChange, userDocRef, user, visitToEdit, setVisitToEdit }: CreateSanitationDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const auth = useAuth();

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
            }
        } else {
            setVisitToEdit(null);
        }
    }, [isOpen, visitToEdit, sanitationVisitForm, setVisitToEdit]);

    const handleSanitationVisitSubmit = async (values: SanitationVisitFormValues) => {
        if (!userDocRef || !firestore || !auth?.currentUser) return;
        const isUpdate = !!visitToEdit;
        const adminId = auth.currentUser.uid;
        const scheduledDate = values.scheduledDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        try {
            if (isUpdate) {
                const visitRef = doc(userDocRef, 'sanitationVisits', visitToEdit.id);
                const visitData = { ...values, scheduledDate: values.scheduledDate.toISOString() };
                await updateDoc(visitRef, visitData);

                await createClientNotification(firestore, user.id, {
                    type: 'sanitation',
                    title: `Sanitation Visit Updated`,
                    description: `Your sanitation visit for ${scheduledDate} is now ${values.status}.`,
                    data: { visitId: visitToEdit.id }
                });
                await createClientNotification(firestore, adminId, {
                    type: 'sanitation',
                    title: 'Sanitation Visit Updated',
                    description: `The visit for ${user.businessName} on ${scheduledDate} is now ${values.status}.`,
                    data: { userId: user.id, visitId: visitToEdit.id }
                });

                toast({ title: "Sanitation Visit Updated" });
            } else {
                const visitsCol = collection(userDocRef, 'sanitationVisits');
                const newVisitRef = doc(visitsCol);
                const linkRef = doc(collection(firestore, 'publicSanitationLinks'));
                const visitData = { ...values, id: newVisitRef.id, userId: user.id, scheduledDate: values.scheduledDate.toISOString(), shareableLink: `${window.location.origin}/sanitation-report/${linkRef.id}` };

                const batch = writeBatch(firestore);
                batch.set(newVisitRef, visitData);
                batch.set(linkRef, { userId: user.id, visitId: newVisitRef.id });
                await batch.commit();

                await createClientNotification(firestore, user.id, {
                    type: 'sanitation',
                    title: 'Sanitation Visit Scheduled',
                    description: `A sanitation visit is scheduled for your office on ${scheduledDate}.`,
                    data: { visitId: newVisitRef.id }
                });
                await createClientNotification(firestore, adminId, {
                    type: 'sanitation',
                    title: 'Sanitation Visit Scheduled',
                    description: `A visit for ${user.businessName} has been scheduled for ${scheduledDate}.`,
                    data: { userId: user.id, visitId: newVisitRef.id }
                });
                
                toast({ title: "Sanitation Visit Scheduled" });
            }
            onOpenChange(false);
        } catch (error) {
            console.error("Sanitation visit submission failed:", error);
            toast({ variant: 'destructive', title: "Operation Failed" });
        }
    };

    return (
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
                        <Input {...sanitationVisitForm.register('assignedTo')} />
                    </div>

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

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">{visitToEdit ? 'Save Changes' : 'Schedule Visit'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
