'use server';

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
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';

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

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      salaryType: 'monthly',
      rate: 0,
      startDate: new Date().toISOString().split('T')[0],
      contactNumber: '',
    }
  });

  const onSubmit = async (values: EmployeeFormValues) => {
    if (!firestore || !companyId) return;
    setIsSubmitting(true);
    
    try {
      const employeeId = `EMP-${Date.now()}`;
      const employeeRef = doc(firestore, 'users', employeeId);
      
      const employeeData = {
        id: employeeId,
        name: values.name,
        email: values.email,
        contactNumber: values.contactNumber,
        businessName: 'Employee Profile',
        companyId: companyId,
        hrRole: 'employee',
        role: 'User' as const,
        accountStatus: 'Active' as const,
        createdAt: serverTimestamp(),
        totalConsumptionLiters: 0,
        lastLogin: new Date().toISOString(),
        hrProfile: {
          firstName: values.name.split(' ')[0],
          lastName: values.name.split(' ').slice(1).join(' '),
          position: values.position,
          department: values.department,
          salaryType: values.salaryType,
          rate: values.rate,
          startDate: values.startDate,
          status: 'Active' as const
        }
      };

      await setDoc(employeeRef, employeeData);
      
      toast({ title: 'New hire authorized', description: `${values.name} has been added to the directory.` });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error creating employee:", error);
      toast({ variant: 'destructive', title: 'Operation failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="p-8">
            <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Add New Employee</DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">Register a new member and initialize their workspace profile.</DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-400">Full Name</FormLabel>
                                <FormControl><Input placeholder="John Doe" className="h-11 rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-400">Email Address</FormLabel>
                                <FormControl><Input placeholder="john@company.com" className="h-11 rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl>
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
                                <FormLabel className="text-xs font-semibold text-slate-400">Position</FormLabel>
                                <FormControl><Input placeholder="Operations Manager" className="h-11 rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="department"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-400">Department</FormLabel>
                                <FormControl><Input placeholder="Logistics" className="h-11 rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>

                    <Separator className="bg-slate-100" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <FormField
                            control={form.control}
                            name="salaryType"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-400">Pay Cycle</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100"><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl"><SelectItem value="daily">Daily Rate</SelectItem><SelectItem value="monthly">Monthly Fixed</SelectItem></SelectContent>
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
                                <FormLabel className="text-xs font-semibold text-slate-400">Rate (PHP)</FormLabel>
                                <FormControl><Input type="number" className="h-11 rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-400">Join Date</FormLabel>
                                <FormControl><Input type="date" className="h-11 rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-sm font-semibold px-6">Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 px-10 font-bold text-sm shadow-md">
                            {isSubmitting ? 'Syncing...' : 'Add to Directory'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
