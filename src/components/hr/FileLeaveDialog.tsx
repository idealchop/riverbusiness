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
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

const leaveSchema = z.object({
  type: z.enum(['Vacation', 'Sick', 'Emergency', 'Maternity/Paternity']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(1, 'Reason is required'),
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

interface FileLeaveDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function FileLeaveDialog({ isOpen, onOpenChange, user }: FileLeaveDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      type: 'Vacation',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: ''
    }
  });

  const onSubmit = async (values: LeaveFormValues) => {
    if (!firestore || !user) return;
    setIsSubmitting(true);
    
    const companyId = user.companyId || user.clientId;
    if (!companyId) {
        toast({ variant: 'destructive', title: 'Action blocked', description: 'User company profile is not initialized.' });
        setIsSubmitting(false);
        return;
    }
    
    try {
      const leaveRequestsCol = collection(firestore, 'hr_companies', companyId, 'leaveRequests');
      
      await addDoc(leaveRequestsCol, {
        companyId,
        employeeId: user.id,
        employeeName: user.name,
        type: values.type,
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason,
        status: 'pending',
        appliedAt: serverTimestamp()
      });

      toast({ title: 'Leave filed', description: 'Your application has been sent for review.' });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error filing leave:", error);
      toast({ variant: 'destructive', title: 'Operation failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[2rem] border-none p-0 overflow-hidden bg-white shadow-2xl">
        <div className="p-8">
            <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">File Leave</DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">Submit a time-off request for review.</DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100"><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl">
                                <SelectItem value="Vacation">Vacation</SelectItem>
                                <SelectItem value="Sick">Sick Leave</SelectItem>
                                <SelectItem value="Emergency">Emergency</SelectItem>
                                <SelectItem value="Maternity/Paternity">Maternity/Paternity</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                {field.value ? format(parseISO(field.value), "MMM d, yyyy") : <span>Pick date</span>}
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value ? parseISO(field.value) : undefined}
                                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
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
                            name="endDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                {field.value ? format(parseISO(field.value), "MMM d, yyyy") : <span>Pick date</span>}
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value ? parseISO(field.value) : undefined}
                                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="reason"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason</FormLabel>
                            <FormControl><Textarea placeholder="Briefly explain your request..." className="rounded-xl min-h-[100px] bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs font-bold px-6">Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 px-10 font-bold text-xs shadow-md">
                            {isSubmitting ? 'Processing...' : 'Submit Application'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
