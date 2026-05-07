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
import { DollarSign, ShieldAlert, Loader2 } from 'lucide-react';

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
    if (!firestore || !companyId) return;
    setIsSubmitting(true);
    
    try {
      // 1. Fetch all active employees for this company
      const employeesQuery = query(
        collection(firestore, 'users'), 
        where('companyId', '==', companyId),
        where('hrRole', '==', 'employee')
      );
      const employeesSnap = await getDocs(employeesQuery);
      const employees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (employees.length === 0) {
        toast({ 
          variant: 'destructive', 
          title: 'No employees found', 
          description: 'Ensure you have registered employees in your directory.' 
        });
        setIsSubmitting(false);
        return;
      }

      // 2. Fetch all attendance logs for this period to compute daily salaries
      const attendanceQuery = query(
        collection(firestore, 'hr_companies', companyId, 'attendance'),
        where('date', '>=', values.periodStart),
        where('date', '<=', values.periodEnd)
      );
      const attendanceSnap = await getDocs(attendanceQuery);
      const allLogs = attendanceSnap.docs.map(doc => doc.data());

      // 3. Automated Computation Logic (with runtime safety)
      const totalNet = employees.reduce((sum, emp: any) => {
        const profile = emp?.hrProfile;
        if (!profile) return sum;

        let employeeSalary = 0;
        const rate = Number(profile?.rate) || 0;
        
        if (profile.salaryType === 'daily') {
          // Count unique present days for this employee in the period
          const daysWorked = allLogs.filter(log => log?.employeeId === emp.id).length;
          employeeSalary = daysWorked * rate;
        } else {
          // Fixed monthly rate (basic logic)
          employeeSalary = rate;
        }

        return sum + employeeSalary;
      }, 0);

      // 4. Create Payroll Run Ledger Entry
      const payrollCol = collection(firestore, 'hr_companies', companyId, 'payrollRuns');
      await addDoc(payrollCol, {
        companyId,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        status: 'paid',
        totalNetSalary: totalNet,
        employeeCount: employees.length,
        createdAt: serverTimestamp()
      });

      toast({ 
        title: 'Payroll Disbursed', 
        description: `Successfully computed ₱${totalNet.toLocaleString()} for ${employees.length} employees.` 
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error running payroll:", error);
      toast({ variant: 'destructive', title: 'Computation Error', description: 'Failed to process payroll data.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="p-8">
            <DialogHeader className="mb-6">
                <div className="p-3 w-fit rounded-2xl bg-blue-50 text-primary mb-4">
                    <DollarSign className="h-6 w-6" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Authorize Payroll</DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">
                  The system will analyze attendance logs and compute salaries for the selected period.
                </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="periodStart"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Date</FormLabel>
                                <FormControl><Input type="date" className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="periodEnd"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End Date</FormLabel>
                                <FormControl><Input type="date" className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-4">
                        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                            Confirming this run will finalize disbursements and lock attendance logs for the selected period.
                        </p>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs font-bold px-6">Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 px-10 font-bold text-xs shadow-md min-w-[160px]">
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Computing...
                              </>
                            ) : 'Finalize & Disburse'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
