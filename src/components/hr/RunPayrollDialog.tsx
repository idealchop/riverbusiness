'use client';

import React, { useState, useEffect } from 'react';
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
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { DollarSign, ShieldAlert, Loader2, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import type { HRPayrollBreakdownItem } from '@/lib/types';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: startOfMonth(new Date()),
      to: new Date()
  });

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollSchema),
    defaultValues: {
      periodStart: startOfMonth(new Date()).toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
    }
  });

  // Sync Calendar Range with Input Fields
  useEffect(() => {
      if (dateRange?.from) {
          form.setValue('periodStart', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
          form.setValue('periodEnd', format(dateRange.to, 'yyyy-MM-dd'));
      }
  }, [dateRange, form]);

  const onSubmit = async (values: PayrollFormValues) => {
    if (!firestore || !companyId) return;
    setIsSubmitting(true);
    
    try {
      const employeesQuery = query(
        collection(firestore, 'users'), 
        where('companyId', '==', companyId),
        where('hrRole', '==', 'employee')
      );
      const employeesSnap = await getDocs(employeesQuery);
      const employees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      if (employees.length === 0) {
        toast({ 
          variant: 'destructive', 
          title: 'No employees found', 
          description: 'Ensure you have registered employees in your directory.' 
        });
        setIsSubmitting(false);
        return;
      }

      const attendanceQuery = query(
        collection(firestore, 'hr_companies', companyId, 'attendance'),
        where('date', '>=', values.periodStart),
        where('date', '<=', values.periodEnd)
      );
      const attendanceSnap = await getDocs(attendanceQuery);
      const allLogs = attendanceSnap.docs.map(doc => doc.data());

      const breakdown: HRPayrollBreakdownItem[] = [];
      let totalNet = 0;

      employees.forEach((emp: any) => {
        const profile = emp?.hrProfile;
        if (!profile) return;

        let employeeSalary = 0;
        const rate = Number(profile?.rate) || 0;
        let daysWorked = 0;
        
        if (profile.salaryType === 'daily') {
          daysWorked = allLogs.filter(log => log?.employeeId === emp.id).length;
          employeeSalary = daysWorked * rate;
        } else {
          employeeSalary = rate;
        }

        if (employeeSalary > 0) {
            breakdown.push({
                employeeId: emp.id,
                employeeName: emp.name || 'Anonymous',
                amount: employeeSalary,
                rate: rate,
                type: profile.salaryType,
                daysWorked: profile.salaryType === 'daily' ? daysWorked : undefined
            });
            totalNet += employeeSalary;
        }
      });

      const payrollCol = collection(firestore, 'hr_companies', companyId, 'payrollRuns');
      await addDoc(payrollCol, {
        companyId,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        status: 'paid',
        totalNetSalary: totalNet,
        employeeCount: breakdown.length,
        breakdown,
        createdAt: serverTimestamp()
      });

      toast({ 
        title: 'Payroll Disbursed', 
        description: `Successfully computed ₱${totalNet.toLocaleString()} for ${breakdown.length} employees.` 
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
      <DialogContent className="sm:max-w-3xl rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-3xl">
        <div className="p-8">
            <DialogHeader className="mb-6">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 w-fit rounded-2xl bg-blue-50 text-primary">
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Run payroll</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                          Select the disbursement period to compute team salaries.
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* Visual Calendar */}
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <CalendarIcon className="h-3.5 w-3.5" /> 1. Select Range
                            </Label>
                            <div className="border rounded-[2rem] p-1 bg-slate-50/50 flex justify-center shadow-inner">
                                <Calendar
                                    mode="range"
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    className="rounded-xl border-none"
                                />
                            </div>
                        </div>

                        {/* Manual Dropdowns & Verification */}
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">2. Review Boundaries</Label>
                                <div className="grid gap-4">
                                    <FormField
                                        control={form.control}
                                        name="periodStart"
                                        render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-xs font-semibold text-slate-600">Start Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full h-11 justify-start text-left font-bold rounded-xl bg-slate-50 border-slate-100 shadow-none",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                        {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value ? parseISO(field.value) : undefined}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                field.onChange(format(date, 'yyyy-MM-dd'));
                                                                setDateRange(prev => ({ ...prev, from: date }));
                                                            }
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="periodEnd"
                                        render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-xs font-semibold text-slate-600">End Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full h-11 justify-start text-left font-bold rounded-xl bg-slate-50 border-slate-100 shadow-none",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                        {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value ? parseISO(field.value) : undefined}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                field.onChange(format(date, 'yyyy-MM-dd'));
                                                                setDateRange(prev => ({ ...prev, to: date }));
                                                            }
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-4">
                                <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] font-bold text-amber-900/70 leading-relaxed uppercase tracking-tight">
                                    Finalizing this run will compute disbursements based on confirmed presence logs and update the organizational ledger.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-6 border-t flex items-center justify-between">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs font-bold px-8 rounded-xl h-12">Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-2xl h-12 px-12 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 min-w-[200px]">
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Computing...
                              </>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Finalize & Disburse <ChevronRight className="h-4 w-4" />
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
