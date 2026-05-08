
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, UserCog, HeartPulse } from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const employeeSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  position: z.string().min(1, 'Position is required'),
  department: z.string().min(1, 'Department is required'),
  salaryType: z.enum(['daily', 'monthly']),
  rate: z.coerce.number().min(1, 'Rate must be greater than zero'),
  startDate: z.string().min(1, 'Start date is required'),
  contactNumber: z.string().optional(),
  // Benefits
  sssNumber: z.string().optional(),
  philhealthNumber: z.string().optional(),
  pagibigNumber: z.string().optional(),
  tinNumber: z.string().optional(),
  // Deductions
  sssDeduction: z.coerce.number().default(0),
  philhealthDeduction: z.coerce.number().default(0),
  pagibigDeduction: z.coerce.number().default(0),
  taxDeduction: z.coerce.number().default(0),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface HREmployeeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  inviterBusinessName?: string;
  employeeToEdit?: AppUser | null;
}

export function HREmployeeDialog({ isOpen, onOpenChange, companyId, inviterBusinessName, employeeToEdit }: HREmployeeDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      email: '',
      position: '',
      department: '',
      salaryType: 'monthly',
      rate: 0,
      startDate: new Date().toISOString().split('T')[0],
      contactNumber: '',
      sssNumber: '',
      philhealthNumber: '',
      pagibigNumber: '',
      tinNumber: '',
      sssDeduction: 0,
      philhealthDeduction: 0,
      pagibigDeduction: 0,
      taxDeduction: 0
    }
  });

  React.useEffect(() => {
    if (isOpen && employeeToEdit) {
      form.reset({
        name: employeeToEdit.name || '',
        email: employeeToEdit.email || '',
        position: employeeToEdit.hrProfile?.position || '',
        department: employeeToEdit.hrProfile?.department || '',
        salaryType: employeeToEdit.hrProfile?.salaryType || 'monthly',
        rate: employeeToEdit.hrProfile?.rate || 0,
        startDate: employeeToEdit.hrProfile?.startDate || new Date().toISOString().split('T')[0],
        contactNumber: employeeToEdit.contactNumber || '',
        sssNumber: employeeToEdit.hrProfile?.sssNumber || '',
        philhealthNumber: employeeToEdit.hrProfile?.philhealthNumber || '',
        pagibigNumber: employeeToEdit.hrProfile?.pagibigNumber || '',
        tinNumber: employeeToEdit.hrProfile?.tinNumber || '',
        sssDeduction: employeeToEdit.hrProfile?.sssDeduction || 0,
        philhealthDeduction: employeeToEdit.hrProfile?.philhealthDeduction || 0,
        pagibigDeduction: employeeToEdit.hrProfile?.pagibigDeduction || 0,
        taxDeduction: employeeToEdit.hrProfile?.taxDeduction || 0,
      });
    } else if (isOpen) {
      form.reset({
          name: '',
          email: '',
          position: '',
          department: '',
          salaryType: 'monthly',
          rate: 0,
          startDate: new Date().toISOString().split('T')[0],
          contactNumber: '',
          sssNumber: '',
          philhealthNumber: '',
          pagibigNumber: '',
          tinNumber: '',
          sssDeduction: 0,
          philhealthDeduction: 0,
          pagibigDeduction: 0,
          taxDeduction: 0
      });
    }
  }, [isOpen, employeeToEdit, form]);

  const onSubmit = (values: EmployeeFormValues) => {
    if (!firestore || !companyId) return;
    setIsSubmitting(true);
    
    const hrProfileData = {
        firstName: values.name?.split(' ')[0] ?? '',
        lastName: values.name?.split(' ').slice(1).join(' ') || '',
        position: values.position ?? 'Staff',
        department: values.department ?? 'General',
        salaryType: values.salaryType ?? 'monthly',
        rate: Number(values.rate) || 0,
        startDate: values.startDate ?? new Date().toISOString().split('T')[0],
        status: 'Active',
        sssNumber: values.sssNumber || '',
        philhealthNumber: values.philhealthNumber || '',
        pagibigNumber: values.pagibigNumber || '',
        tinNumber: values.tinNumber || '',
        sssDeduction: Number(values.sssDeduction) || 0,
        philhealthDeduction: Number(values.philhealthDeduction) || 0,
        pagibigDeduction: Number(values.pagibigDeduction) || 0,
        taxDeduction: Number(values.taxDeduction) || 0
    };

    if (employeeToEdit) {
      const userRef = doc(firestore, 'users', employeeToEdit.id);
      const updateData = {
          name: values.name,
          email: values.email?.toLowerCase().trim(),
          contactNumber: values.contactNumber ?? '',
          hrProfile: hrProfileData
      };
      
      updateDoc(userRef, updateData)
        .then(() => {
            toast({ title: 'Profile Updated', description: 'Employee credentials have been saved.' });
            setIsSubmitting(false);
            onOpenChange(false);
        })
        .catch(async (err) => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
            setIsSubmitting(false);
        });
      return;
    }

    const invitationRef = doc(collection(firestore, 'unclaimedEmployees'));
    const invitationData = {
      id: invitationRef.id,
      name: values.name ?? '',
      email: values.email?.toLowerCase().trim() ?? '',
      contactNumber: values.contactNumber ?? '',
      businessName: 'Employee Profile',
      inviterBusinessName: inviterBusinessName || 'Your Team',
      companyId: companyId,
      hrRole: 'employee',
      role: 'User',
      accountStatus: 'Active',
      createdAt: serverTimestamp(),
      totalConsumptionLiters: 0,
      hrProfile: hrProfileData
    };

    setDoc(invitationRef, invitationData)
      .then(() => {
        setIsSuccess(true);
        setIsSubmitting(false);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: invitationRef.path,
            operation: 'create',
            requestResourceData: invitationData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsSubmitting(false);
      });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
        setIsSuccess(false);
        form.reset();
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-3xl rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        {isSuccess ? (
          <div className="p-12 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Invitation dispatched</h3>
            <p className="text-slate-500 mb-8 max-w-sm">
                We've sent a secure signup link to <span className="font-bold text-slate-900">{form.getValues('email')}</span>. They can now join your workspace.
            </p>
            <Button onClick={handleClose} className="rounded-xl h-11 px-10 font-bold shadow-lg shadow-primary/10">
                Continue to directory
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full max-h-[85vh]">
            <div className="p-8 pb-4">
                <DialogHeader className="mb-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2 rounded-lg bg-blue-50 text-primary">
                            <UserCog className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">
                            {employeeToEdit ? 'Edit credentials' : 'Add new employee'}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-500 font-medium">
                        {employeeToEdit ? 'Update core credentials and profile metadata.' : 'Create an employment profile and dispatch an invitation.'}
                    </DialogDescription>
                </DialogHeader>
            </div>
            
            <ScrollArea className="flex-1 px-8 pb-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Employment Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-600">Full name</FormLabel>
                                        <FormControl><Input placeholder="John Doe" className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-600">Email address</FormLabel>
                                        <FormControl><Input placeholder="john@company.com" className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="position"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-600">Position</FormLabel>
                                        <FormControl><Input placeholder="Operations lead" className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="department"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-600">Department</FormLabel>
                                        <FormControl><Input placeholder="Logistics" className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <FormField
                                    control={form.control}
                                    name="salaryType"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-600">Pay cycle</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary"><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-xl"><SelectItem value="daily">Daily rate</SelectItem><SelectItem value="monthly">Monthly fixed</SelectItem></SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="rate"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-600">Rate (PHP)</FormLabel>
                                        <FormControl><Input type="number" className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-600">Start date</FormLabel>
                                        <FormControl><Input type="date" className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <Separator className="bg-slate-50" />

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                <HeartPulse className="h-3.5 w-3.5" /> Benefits & Statutory Credentials
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                <div className="space-y-5">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Account Identifiers</p>
                                    <FormField control={form.control} name="sssNumber" render={({ field }) => (
                                        <FormItem className="space-y-1.5"><FormLabel className="text-xs font-medium">SSS Number</FormLabel><FormControl><Input placeholder="00-0000000-0" className="h-10 rounded-xl" {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="philhealthNumber" render={({ field }) => (
                                        <FormItem className="space-y-1.5"><FormLabel className="text-xs font-medium">PhilHealth ID</FormLabel><FormControl><Input placeholder="00-000000000-0" className="h-10 rounded-xl" {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="pagibigNumber" render={({ field }) => (
                                        <FormItem className="space-y-1.5"><FormLabel className="text-xs font-medium">Pag-IBIG MID</FormLabel><FormControl><Input placeholder="0000-0000-0000" className="h-10 rounded-xl" {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="tinNumber" render={({ field }) => (
                                        <FormItem className="space-y-1.5"><FormLabel className="text-xs font-medium">TIN</FormLabel><FormControl><Input placeholder="000-000-000-000" className="h-10 rounded-xl" {...field} /></FormControl></FormItem>
                                    )} />
                                </div>
                                <div className="space-y-5">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Monthly Deductions (PHP)</p>
                                    <FormField control={form.control} name="sssDeduction" render={({ field }) => (
                                        <FormItem className="space-y-1.5"><FormLabel className="text-xs font-medium">SSS Premium</FormLabel><FormControl><Input type="number" className="h-10 rounded-xl" {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="philhealthDeduction" render={({ field }) => (
                                        <FormItem className="space-y-1.5"><FormLabel className="text-xs font-medium">PhilHealth Premium</FormLabel><FormControl><Input type="number" className="h-10 rounded-xl" {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="pagibigDeduction" render={({ field }) => (
                                        <FormItem className="space-y-1.5"><FormLabel className="text-xs font-medium">Pag-IBIG Monthly</FormLabel><FormControl><Input type="number" className="h-10 rounded-xl" {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="taxDeduction" render={({ field }) => (
                                        <FormItem className="space-y-1.5"><FormLabel className="text-xs font-medium">Withholding Tax</FormLabel><FormControl><Input type="number" className="h-10 rounded-xl" {...field} /></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-8 border-t sticky bottom-0 bg-white">
                            <Button type="button" variant="ghost" onClick={handleClose} className="text-sm font-semibold px-6 rounded-xl h-12">Cancel</Button>
                            <Button type="submit" disabled={isSubmitting} className="rounded-2xl h-12 px-12 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all active:scale-95">
                                {isSubmitting ? 'Syncing...' : employeeToEdit ? 'Save updates' : 'Authorize invitation'}
                            </Button>
                        </DialogFooter>
                    </form>
                </巧>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
