
'use client';

import React from 'react';
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
import { AppUser } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, PlusCircle, MinusCircle } from 'lucide-react';

const dispenserReportSchema = z.object({
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

interface CreateSanitationDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    userDocRef: DocumentReference | null;
    user: AppUser;
}

export function CreateSanitationDialog({ isOpen, onOpenChange, userDocRef, user }: CreateSanitationDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();

    const sanitationVisitForm = useForm<SanitationVisitFormValues>({ resolver: zodResolver(sanitationVisitSchema), defaultValues: { status: 'Scheduled', dispenserReports: [{ dispenserName: 'Main Unit', checklist: [{ item: 'Cleaned exterior', checked: false, remarks: '' }, { item: 'Flushed lines', checked: false, remarks: '' }, { item: 'Checked for leaks', checked: false, remarks: '' }] }] } });
    const { fields, append, remove } = useFieldArray({ control: sanitationVisitForm.control, name: "dispenserReports" });

    const handleSanitationVisitSubmit = async (values: SanitationVisitFormValues) => {
        if (!userDocRef || !firestore) return;
        const visitsCol = collection(userDocRef, 'sanitationVisits');
        const newVisitRef = doc(visitsCol);
        const linkRef = doc(collection(firestore, 'publicSanitationLinks'));

        const visitData = {
            ...values,
            id: newVisitRef.id,
            userId: user.id,
            scheduledDate: values.scheduledDate.toISOString(),
            shareableLink: `${window.location.origin}/sanitation-report/${linkRef.id}`
        };

        const batch = writeBatch(firestore);
        batch.set(newVisitRef, visitData);
        batch.set(linkRef, { userId: user.id, visitId: newVisitRef.id });

        await batch.commit();

        toast({ title: "Sanitation Visit Scheduled" });
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader><DialogTitle>Schedule Sanitation Visit</DialogTitle></DialogHeader>
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
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><MinusCircle className="h-4 w-4 text-destructive" /></Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input {...sanitationVisitForm.register(`dispenserReports.${index}.dispenserName`)} placeholder="Dispenser Name (e.g., Lobby)" />
                                    <Input {...sanitationVisitForm.register(`dispenserReports.${index}.dispenserCode`)} placeholder="Dispenser Code (Optional)" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    <Button type="button" variant="outline" onClick={() => append({ dispenserName: `Unit #${fields.length + 1}`, checklist: [{ item: 'Cleaned exterior', checked: false, remarks: '' }, { item: 'Flushed lines', checked: false, remarks: '' }, { item: 'Checked for leaks', checked: false, remarks: '' }] })}><PlusCircle className="mr-2 h-4 w-4" />Add Another Dispenser</Button>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Schedule Visit</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
