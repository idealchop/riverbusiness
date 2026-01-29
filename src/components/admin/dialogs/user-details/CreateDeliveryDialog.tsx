
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AppUser, Delivery } from '@/lib/types';
import { useAuth, useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, FileText } from 'lucide-react';
import Image from 'next/image';
import { createClientNotification } from '@/lib/notifications';

const deliverySchema = z.object({
    id: z.string().min(1, "Tracking # is required."),
    date: z.date({ required_error: "A date is required." }),
    volumeContainers: z.coerce.number().min(1, "Must be at least 1."),
    status: z.enum(['Delivered', 'In Transit', 'Pending']),
    adminNotes: z.string().optional(),
});
type DeliveryFormValues = z.infer<typeof deliverySchema>;

interface CreateDeliveryDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    deliveryToEdit: Delivery | null;
    user: AppUser;
}

export function CreateDeliveryDialog({ isOpen, onOpenChange, deliveryToEdit, user }: CreateDeliveryDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const storage = useStorage();
    const auth = useAuth();

    const [proofFile, setProofFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const deliveryForm = useForm<DeliveryFormValues>({ resolver: zodResolver(deliverySchema), defaultValues: { status: 'Pending', volumeContainers: 1 } });

    useEffect(() => {
        if (isOpen) {
            if (deliveryToEdit) {
                deliveryForm.reset({ ...deliveryToEdit, date: new Date(deliveryToEdit.date) });
            } else {
                const defaultId = `D-${Date.now().toString().slice(-6)}`;
                deliveryForm.reset({ id: defaultId, status: 'Pending', volumeContainers: 1, date: new Date(), adminNotes: '' });
            }
        } else {
            setProofFile(null);
            setIsSubmitting(false);
        }
    }, [isOpen, deliveryToEdit, deliveryForm]);

    const handleCreateDelivery = async (values: DeliveryFormValues) => {
        if (!firestore || !auth?.currentUser || !storage) return;
        setIsSubmitting(true);

        const userDocRef = doc(firestore, 'users', user.id);
        const { id: deliveryId, ...restOfValues } = values;
        const isUpdate = !!deliveryToEdit;
        const statusChanged = isUpdate && deliveryToEdit.status !== values.status;

        try {
            if (!isUpdate) {
                const newDocRef = doc(userDocRef, 'deliveries', deliveryId);
                const docSnap = await getDoc(newDocRef);
                if (docSnap.exists()) {
                    toast({
                        variant: 'destructive',
                        title: 'Tracking # Exists',
                        description: `A delivery with ID ${deliveryId} already exists. Please use a unique ID.`,
                    });
                    setIsSubmitting(false);
                    return;
                }
            }

            const deliveryRef = doc(userDocRef, 'deliveries', deliveryId);
            const deliveryData: Partial<Delivery> = {
                ...restOfValues,
                id: deliveryId,
                userId: user.id,
                date: values.date.toISOString(),
            };
            
            if (user.accountType === 'Branch' && user.parentId) {
                deliveryData.parentId = user.parentId;
            }

            if (proofFile) {
                setUploadProgress(0);
                const filePath = `admin_uploads/${auth.currentUser.uid}/proofs_for/${user.id}/${deliveryId}-${Date.now()}-${proofFile.name}`;
                const downloadURL = await uploadFileWithProgress(storage, auth, filePath, proofFile, {}, setUploadProgress);
                deliveryData.proofOfDeliveryUrl = downloadURL;
                toast({ title: 'Proof upload complete.' });
            }

            await setDoc(deliveryRef, deliveryData, { merge: true });

            const adminId = auth.currentUser.uid;

            if (statusChanged) {
                // Send UPDATE notifications
                await createClientNotification(firestore, user.id, {
                    type: 'delivery',
                    title: `Delivery ${values.status}`,
                    description: `Your delivery of ${values.volumeContainers} containers is now ${values.status}.`,
                    data: { deliveryId: deliveryId }
                });
                await createClientNotification(firestore, adminId, {
                    type: 'delivery',
                    title: 'Delivery Status Updated',
                    description: `Delivery for ${user.businessName} is now ${values.status}.`,
                    data: { userId: user.id, deliveryId: deliveryId }
                });
            } else if (!isUpdate) {
                // Send CREATE notifications
                 await createClientNotification(firestore, user.id, {
                    type: 'delivery',
                    title: 'Delivery Scheduled',
                    description: `A new delivery of ${values.volumeContainers} containers has been scheduled.`,
                    data: { deliveryId },
                });
                 await createClientNotification(firestore, adminId, {
                    type: 'delivery',
                    title: `Delivery Created`,
                    description: `A delivery for ${user.businessName} (${user.accountType || 'Single'}) has been scheduled.`,
                    data: { deliveryId, userId: user.id },
                });
            }

            toast({ title: isUpdate ? "Delivery Updated" : "Delivery Created" });
            onOpenChange(false);

        } catch (error) {
            console.error("Delivery operation failed:", error);
            toast({ variant: 'destructive', title: "Operation Failed" });
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
            setProofFile(null);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{deliveryToEdit ? 'Edit' : 'Create'} Delivery</DialogTitle>
                </DialogHeader>
                <form onSubmit={deliveryForm.handleSubmit(handleCreateDelivery)} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="trackingNumber">Tracking Number</Label>
                        <Input id="trackingNumber" {...deliveryForm.register('id')} disabled={!!deliveryToEdit || isSubmitting} />
                        {deliveryForm.formState.errors.id && <p className="text-sm text-destructive">{deliveryForm.formState.errors.id.message}</p>}
                    </div>
                    <div>
                        <Label>Delivery Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !deliveryForm.watch('date') && "text-muted-foreground")}
                                    disabled={isSubmitting}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {deliveryForm.watch('date') ? format(deliveryForm.watch('date'), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={deliveryForm.watch('date')} onSelect={(date) => deliveryForm.setValue('date', date as Date)} initialFocus disabled={isSubmitting}/>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label htmlFor="volumeContainers">Volume (containers)</Label>
                        <Input id="volumeContainers" type="number" {...deliveryForm.register('volumeContainers')} disabled={isSubmitting}/>
                        {deliveryForm.formState.errors.volumeContainers && <p className="text-sm text-destructive">{deliveryForm.formState.errors.volumeContainers.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="status">Status</Label>
                        <Select onValueChange={(value) => deliveryForm.setValue('status', value as any)} defaultValue={deliveryForm.getValues('status')} disabled={isSubmitting}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="In Transit">In Transit</SelectItem>
                                <SelectItem value="Delivered">Delivered</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="adminNotes">Admin Notes</Label>
                        <Textarea id="adminNotes" {...deliveryForm.register('adminNotes')} disabled={isSubmitting}/>
                    </div>
                    <div>
                        <Label>Proof of Delivery</Label>
                        {deliveryToEdit?.proofOfDeliveryUrl && !proofFile ? (
                            <div className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md">
                                <FileText className="h-4 w-4" />
                                <a href={deliveryToEdit.proofOfDeliveryUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex-1 truncate">View current proof</a>
                            </div>
                        ) : <p className="text-xs text-muted-foreground mt-1">No proof uploaded yet.</p>}
                        <Input
                            id="proof-upload"
                            type="file"
                            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                            className="mt-2"
                            disabled={isSubmitting}
                        />
                        {uploadProgress > 0 && <Progress value={uploadProgress} className="mt-2 h-1" />}
                        {proofFile && <p className="text-xs text-muted-foreground mt-1">New file selected: {proofFile.name}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Delivery'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
