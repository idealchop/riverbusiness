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
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Mail } from 'lucide-react';

const employeeSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  position: z.string().min(1, 'Position is required'),
  department: z.string().min(1, 'Department is required'),
  salaryType: z.enum(['daily', 'monthly']),
  rate: z.coerce.number().min(1, 'Rate must be greater than zero'),
  startDate: z.string().min(1, 'Start date is required'),
  contactNumber: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface HREmployeeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export function HREmployeeDialog({ isOpen, onOpenChange, companyId }: HREmployeeDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      salaryType: 'monthly',
      rate: 0,
      startDate: new Date().toISOString().split('T')[0],
      contactNumber: '',
    }
  });

  const onSubmit = (values: EmployeeFormValues) => {
    if (!firestore || !companyId) return;
    setIsSubmitting(true);
    
    const invitationRef = doc(collection(firestore, 'unclaimedEmployees'));
    
    const invitationData = {
      id: invitationRef.id,
      name: values.name ?? '',
      email: values.email?.toLowerCase().trim() ?? '',
      contactNumber: values.contactNumber ?? '',
      businessName: 'Employee Profile',
      companyId: companyId,
      hrRole: 'employee',
      role: 'User',
      accountStatus: 'Active',
      createdAt: serverTimestamp(),
      totalConsumptionLiters: 0,
      hrProfile: {
        firstName: values.name?.split(' ')[0] ?? '',
        lastName: values.name?.split(' ').slice(1).join(' ') || '',
        position: values.position ?? 'Staff',
        department: values.department ?? 'General',
        salaryType: values.salaryType ?? 'monthly',
        rate: Number(values.rate) || 0,
        startDate: values.startDate ?? new Date().toISOString().split('T')[0],
        status: 'Active'
      }
    };

    // Follow the Non-Blocking Mutation Pattern
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
      <DialogContent className="sm:max-w-xl rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
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
          <div className="p-8">
            <DialogHeader className="mb-8">
                <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Add new employee</DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">Create an employment profile and dispatch an invitation.</DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

                    <Separator className="bg-slate-50" />

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

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={handleClose} className="text-sm font-semibold px-6 rounded-xl">Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 px-10 font-bold text-sm shadow-lg shadow-blue-500/10">
                            {isSubmitting ? 'Processing...' : 'Send invitation'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
