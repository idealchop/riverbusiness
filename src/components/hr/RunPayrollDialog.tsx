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
import { Label } from '@/components/ui/label';
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
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { DollarSign, ShieldAlert } from 'lucide-react';

const payrollSchema = z.object({
  periodStart: z.string().min(1, 'Start date is required'),
  periodEnd: z.string().min(1, 'End date is required'),
});

type PayrollFormValues = z.infer<typeof payrollSchema>;

interface RunPayrollDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export function RunPayrollDialog({ isOpen, onOpenChange, companyId }: RunPayrollDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollSchema),
    defaultValues: {
      periodStart: new Date(new Date().setDate(1)).toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
    }
  });

  const onSubmit = async (values: PayrollFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
      // 1. Fetch all active employees for this company
      const employeesQuery = query(collection(firestore, 'users'), where('companyId', '==', companyId));
      const employeesSnap = await getDocs(employeesQuery);
      const employees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (employees.length === 0) {
        toast({ variant: 'destructive', title: 'No Employees', description: 'No active staff found for this cycle.' });
        setIsSubmitting(false);
        return;
      }

      // 2. Simulated Computation (In a real system, you'd fetch attendance logs here)
      // For the prototype, we calculate based on the employee's base rate.
      const totalNet = employees.reduce((sum, emp: any) => sum + (emp.hrProfile?.rate || 0), 0);

      // 3. Create Payroll Run Record
      const payrollCol = collection(firestore, 'hr_companies', companyId, 'payrollRuns');
      await addDoc(payrollCol, {
        companyId,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        status: 'paid',
        totalNetSalary: totalNet,
        createdAt: serverTimestamp()
      });

      toast({ title: 'Payroll Authorized', description: `Successfully processed disbursements for ${employees.length} employees.` });
      onOpenChange(false);
    } catch (error) {
      console.error("Error running payroll:", error);
      toast({ variant: 'destructive', title: 'Action Failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none">
        <DialogHeader>
          <div className="p-3 w-fit rounded-2xl bg-blue-50 text-blue-600 mb-4">
            <DollarSign className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-black tracking-tight uppercase">Authorize Payroll</DialogTitle>
          <DialogDescription className="text-slate-500 font-bold">Initiate salary computation for the current work period.</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="periodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Period Start</FormLabel>
                    <FormControl><Input type="date" className="h-11 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="periodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Period End</FormLabel>
                    <FormControl><Input type="date" className="h-11 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-800/80 leading-relaxed uppercase tracking-tight">
                    Running payroll will generate disbursement orders and finalize attendance logs for this period. this action is logged for audit.
                </p>
            </div>

            <DialogFooter className="pt-6">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase tracking-widest">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-2xl h-11 px-8 font-black uppercase tracking-widest text-[10px] bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200/50">
                {isSubmitting ? 'Computing...' : 'Finalize & Disburse'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
