'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { 
    DollarSign, 
    Loader2, 
    Calendar as CalendarIcon, 
    ChevronRight, 
    ArrowLeft, 
    CheckCircle2, 
    CheckCircle,
    Calculator, 
    Plus, 
    X, 
    ChevronLeft, 
    UserCircle, 
    Briefcase, 
    Clock, 
    AlertTriangle, 
    ShieldAlert 
} from 'lucide-react';
import type { HRPayrollBreakdownItem, AppUser, HRAttendanceLog } from '@/lib/types';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, parseISO, eachDayOfInterval, isSunday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

const payrollSchema = z.object({
  periodStart: z.string().min(1, 'Start date is required'),
  periodEnd: z.string().min(1, 'End date is required'),
});

type PayrollFormValues = z.infer<typeof payrollSchema>;

const ITEMS_PER_PAGE = 5;

interface RunPayrollDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export function RunPayrollDialog({ isOpen, onOpenChange, companyId }: RunPayrollDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const [step, setStep] = useState(0); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: startOfMonth(new Date()),
      to: new Date()
  });

  const [computedBreakdown, setComputedBreakdown] = useState<HRPayrollBreakdownItem[]>([]);

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollSchema),
    defaultValues: {
      periodStart: startOfMonth(new Date()).toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
    }
  });

  useEffect(() => {
      if (dateRange?.from) {
          form.setValue('periodStart', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
          form.setValue('periodEnd', format(dateRange.to, 'yyyy-MM-dd'));
      }
  }, [dateRange, form]);

  const handleCompute = async () => {
    if (!firestore || !companyId) return;
    setIsComputing(true);
    
    try {
      const values = form.getValues();
      const start = parseISO(values.periodStart);
      const end = parseISO(values.periodEnd);
      
      // Calculate all potential workdays (excluding Sundays)
      const allDaysInRange = eachDayOfInterval({ start, end });
      const workdaysInRange = allDaysInRange.filter(day => !isSunday(day));
      const totalWorkdaysCount = workdaysInRange.length;

      // 1. Fetch all active employees
      const employeesQuery = query(
        collection(firestore, 'users'), 
        where('companyId', '==', companyId),
        where('hrRole', '==', 'employee')
      );
      const employeesSnap = await getDocs(employeesQuery);
      const employees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as AppUser }));

      if (employees.length === 0) {
        toast({ 
          variant: 'destructive', 
          title: 'No employees found', 
          description: 'Ensure you have registered employees in your workforce directory.' 
        });
        setIsComputing(false);
        return;
      }

      // 2. Fetch all attendance logs for this period
      const attendanceQuery = query(
        collection(firestore, 'hr_companies', companyId, 'attendance'),
        where('date', '>=', values.periodStart),
        where('date', '<=', values.periodEnd)
      );
      const attendanceSnap = await getDocs(attendanceQuery);
      const allLogs = attendanceSnap.docs.map(doc => doc.data() as HRAttendanceLog);

      const breakdown: HRPayrollBreakdownItem[] = [];

      // 3. Compute per-employee logic with Absence Detection
      employees.forEach((emp) => {
        const profile = emp?.hrProfile;
        if (!profile) return;

        const rate = Number(profile?.rate) || 0;
        const employeeLogs = allLogs.filter(log => log.employeeId === emp.id);
        
        let daysWorked = 0;
        let absentDays = 0;

        workdaysInRange.forEach(workday => {
            const hasLog = employeeLogs.some(log => {
                const logDate = parseISO(log.date);
                return isSameDay(logDate, workday);
            });

            if (hasLog) {
                daysWorked++;
            } else {
                absentDays++;
            }
        });

        let computedAmount = 0;
        if (profile.salaryType === 'daily') {
            // Daily employees only get paid for days they worked
            computedAmount = daysWorked * rate;
        } else {
            // Monthly/Fixed employees have a base rate, but we deduct for absences
            // Assuming the rate provided is the rate for the whole cycle (e.g. monthly or bimonthly)
            const dailyRateEquivalent = totalWorkdaysCount > 0 ? rate / totalWorkdaysCount : 0;
            const totalDeduction = absentDays * dailyRateEquivalent;
            computedAmount = Math.max(0, rate - totalDeduction);
        }

        breakdown.push({
            employeeId: emp.id,
            employeeName: emp.name || 'Anonymous',
            employeeNumber: profile.employeeNumber || 'ID Pending',
            amount: computedAmount,
            rate: rate,
            type: profile.salaryType,
            daysWorked,
            absentDays,
            adjustment: 0,
            adjustmentRemarks: ''
        });
      });

      setComputedBreakdown(breakdown);
      setStep(1);
      setCurrentPage(1);
      toast({ title: 'Computation Complete', description: `Verified logs for ${breakdown.length} staff members. Found absences automatically deducted.` });
    } catch (error) {
      console.error("Error computing payroll:", error);
      toast({ variant: 'destructive', title: 'Computation Error' });
    } finally {
      setIsComputing(false);
    }
  };

  const handleAdjustmentChange = (employeeId: string, value: string) => {
      const num = parseFloat(value) || 0;
      setComputedBreakdown(prev => prev.map(item => 
          item.employeeId === employeeId ? { ...item, adjustment: num } : item
      ));
  };

  const handleRemoveEmployee = (employeeId: string) => {
      setComputedBreakdown(prev => prev.filter(item => item.employeeId !== employeeId));
  };

  const onSubmit = async () => {
    if (!firestore || !companyId || computedBreakdown.length === 0) return;
    setIsSubmitting(true);
    
    try {
      const values = form.getValues();
      const totalNet = computedBreakdown.reduce((sum, item) => sum + (item.amount + (item.adjustment || 0)), 0);

      const payrollCol = collection(firestore, 'hr_companies', companyId, 'payrollRuns');
      await addDoc(payrollCol, {
        companyId,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        status: 'paid',
        totalNetSalary: totalNet,
        employeeCount: computedBreakdown.length,
        breakdown: computedBreakdown,
        createdAt: serverTimestamp()
      });

      toast({ 
        title: 'Payroll Disbursed', 
        description: `Successfully computed ₱${totalNet.toLocaleString()} for ${computedBreakdown.length} employees.` 
      });
      onOpenChange(false);
      handleReset();
    } catch (error) {
      console.error("Error saving payroll:", error);
      toast({ variant: 'destructive', title: 'Action Failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setComputedBreakdown([]);
    setCurrentPage(1);
    form.reset();
  };

  const totalRunDisbursement = useMemo(() => {
      return computedBreakdown.reduce((sum, item) => sum + (item.amount + (item.adjustment || 0)), 0);
  }, [computedBreakdown]);

  const totalPages = Math.ceil(computedBreakdown.length / ITEMS_PER_PAGE);

  const paginatedBreakdown = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return computedBreakdown.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [computedBreakdown, currentPage]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleReset(); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-4xl rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-3xl flex flex-col h-[90vh]">
        <div className="p-8 border-b bg-slate-50/50 shrink-0">
            <DialogHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 w-fit rounded-2xl bg-blue-50 text-primary">
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Payroll Engine</DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium">
                                {step === 0 ? "Automated salary computation with absence deduction protocol." : "Verify individual computations and handle final adjustments."}
                            </DialogDescription>
                        </div>
                    </div>
                    {step > 0 && (
                        <div className="text-right">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Run Value</p>
                             <p className="text-2xl font-black text-primary tabular-nums">₱{totalRunDisbursement.toLocaleString()}</p>
                        </div>
                    )}
                </div>
            </DialogHeader>
        </div>

        <ScrollArea className="flex-1">
            <div className="p-8">
                {step === 0 && (
                    <Form {...form}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                    <CalendarIcon className="h-3.5 w-3.5" /> 1. Boundary Matrix
                                </Label>
                                <div className="border rounded-[2rem] p-4 bg-slate-50 shadow-inner flex justify-center">
                                    <Calendar
                                        mode="range"
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        className="rounded-xl border-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">2. Period Authentication</Label>
                                    <div className="grid gap-4">
                                        <FormField
                                            control={form.control}
                                            name="periodStart"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel className="text-xs font-bold text-slate-600">Start date</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" className="h-12 justify-start text-left font-bold rounded-xl bg-slate-50 border-slate-100 shadow-none">
                                                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                                {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar mode="single" selected={field.value ? parseISO(field.value) : undefined} onSelect={(date) => { if (date) { field.onChange(format(date, 'yyyy-MM-dd')); setDateRange(prev => ({ ...prev, from: date })); } }} initialFocus />
                                                        </PopoverContent>
                                                    </Popover>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="periodEnd"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel className="text-xs font-bold text-slate-600">End date</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" className="h-12 justify-start text-left font-bold rounded-xl bg-slate-50 border-slate-100 shadow-none">
                                                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                                {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar mode="single" selected={field.value ? parseISO(field.value) : undefined} onSelect={(date) => { if (date) { field.onChange(format(date, 'yyyy-MM-dd')); setDateRange(prev => ({ ...prev, to: date })); } }} initialFocus />
                                                        </PopoverContent>
                                                    </Popover>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                                <div className="p-6 rounded-[2rem] bg-blue-50 border border-blue-100 space-y-4">
                                    <div className="flex items-center gap-3 text-blue-900">
                                        <ShieldAlert className="h-5 w-5" />
                                        <p className="text-sm font-black uppercase tracking-tight">Audit Logic Active</p>
                                    </div>
                                    <ul className="space-y-2">
                                        <li className="flex items-start gap-2 text-xs font-medium text-blue-800/70">
                                            <div className="h-1 w-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                            <span>Reviews all <strong>Terminal Logs</strong> for "Time In" verification.</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-xs font-medium text-blue-800/70">
                                            <div className="h-1 w-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                            <span>Identifies <strong>Absences</strong> (Mon-Sat) with automated deductions.</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-xs font-medium text-blue-800/70">
                                            <div className="h-1 w-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                            <span>Synchronizes with individual <strong>Benefit Deductions</strong>.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Form>
                )}

                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
                         <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Individual Audit Breakdown</h4>
                            <Badge className="bg-primary/10 text-primary border-none font-bold uppercase text-[9px] tracking-widest px-3 h-6">
                                {computedBreakdown.length} Disbursable Profiles
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            {paginatedBreakdown.map((item) => (
                                <Card key={item.employeeId} className="border border-slate-100 shadow-none rounded-[2rem] overflow-hidden group hover:border-primary/20 transition-all relative">
                                    <button 
                                        onClick={() => handleRemoveEmployee(item.employeeId)}
                                        className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors z-10"
                                        title="Exclude from run"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                    
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                        <div className="md:col-span-4 flex items-center gap-4">
                                            <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
                                                <UserCircle className="h-6 w-6" />
                                            </div>
                                            <div className="space-y-0.5 overflow-hidden">
                                                <p className="text-sm font-black text-slate-900 leading-tight truncate">{item.employeeName}</p>
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">{item.employeeNumber}</p>
                                                <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-100 bg-slate-50 px-2 h-4">{item.type}</Badge>
                                            </div>
                                        </div>
                                        <div className="md:col-span-3 grid grid-cols-2 gap-4 border-x border-slate-50 px-6">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter flex items-center gap-1.5">
                                                    <CheckCircle className="h-2.5 w-2.5 text-green-500" /> Pres.
                                                </p>
                                                <p className="text-sm font-black text-slate-900 tabular-nums">{item.daysWorked}d</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter flex items-center gap-1.5">
                                                    <AlertTriangle className="h-2.5 w-2.5 text-red-500" /> Abs.
                                                </p>
                                                <p className={cn("text-sm font-black tabular-nums", (item.absentDays || 0) > 0 ? "text-red-500" : "text-slate-900")}>
                                                    {item.absentDays}d
                                                </p>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-2 px-2">
                                             <div className="relative group">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40 group-focus-within:opacity-100">
                                                     <span className="text-[10px] font-black text-slate-400">₱</span>
                                                </div>
                                                <Input 
                                                    type="number" 
                                                    placeholder="Adjust" 
                                                    value={item.adjustment || ''} 
                                                    onChange={(e) => handleAdjustmentChange(item.employeeId, e.target.value)}
                                                    className="h-9 pl-6 rounded-xl bg-slate-50 border-none font-bold text-xs shadow-inner"
                                                />
                                             </div>
                                        </div>
                                        <div className="md:col-span-3 text-right">
                                            <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mb-1">Audit Approved</p>
                                            <p className="text-xl font-black text-slate-900 tabular-nums">
                                                ₱{(item.amount + (item.adjustment || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            {computedBreakdown.length === 0 && (
                                <div className="py-24 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100 grayscale opacity-40">
                                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No integrated profiles</p>
                                    <Button variant="link" onClick={() => setStep(0)} className="text-primary mt-2">Modify Period Parameters</Button>
                                </div>
                            )}
                        </div>

                        {computedBreakdown.length > ITEMS_PER_PAGE && (
                            <div className="flex items-center justify-between px-2 pt-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    Displaying page {currentPage} of {totalPages}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-4 rounded-xl font-bold text-[10px] uppercase shadow-sm bg-white"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Prev
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-4 rounded-xl font-bold text-[10px] uppercase shadow-sm bg-white"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ScrollArea>

        <DialogFooter className="p-8 bg-white border-t flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
                <div className={cn("h-1.5 w-1.5 rounded-full transition-all duration-500", step >= 0 ? "bg-primary w-6" : "bg-slate-200")} />
                <div className={cn("h-1.5 w-1.5 rounded-full transition-all duration-500", step >= 1 ? "bg-primary w-6" : "bg-slate-200")} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Phase {step + 1} of 2</span>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)} className="rounded-xl h-12 px-8 font-bold text-xs" disabled={isSubmitting || isComputing}>
                    {step === 0 ? "Discard" : <><ArrowLeft className="mr-2 h-4 w-4" /> Reset</>}
                </Button>
                
                {step === 0 ? (
                    <Button onClick={handleCompute} disabled={isComputing} className="flex-1 md:flex-none rounded-2xl h-12 px-12 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 min-w-[200px] bg-primary text-white">
                        {isComputing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                        {isComputing ? "Analyzing logs..." : "Compute Ledger"}
                    </Button>
                ) : (
                    <Button onClick={onSubmit} disabled={isSubmitting || computedBreakdown.length === 0} className="flex-1 md:flex-none rounded-2xl h-12 px-16 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/30 bg-primary hover:bg-primary/90 text-white min-w-[240px]">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        {isSubmitting ? "Syncing..." : "Finalize & Disburse"}
                    </Button>
                )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
