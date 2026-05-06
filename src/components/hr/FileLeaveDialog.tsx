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
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
    }
  });

  const onSubmit = async (values: LeaveFormValues) => {
    if (!firestore || !user) return;
    setIsSubmitting(true);
    
    const companyId = user.companyId || user.clientId;
    
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

      toast({ title: 'Leave Filed', description: 'Your application has been sent for review.' });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error filing leave:", error);
      toast({ variant: 'destructive', title: 'Action Failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight uppercase">File Leave</DialogTitle>
          <DialogDescription className="text-slate-500 font-bold">Submit a time-off request for review.</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Leave Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Date</FormLabel>
                    <FormControl><Input type="date" className="h-11 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Date</FormLabel>
                    <FormControl><Input type="date" className="h-11 rounded-xl" {...field} /></FormControl>
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
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Reason</FormLabel>
                  <FormControl><Textarea placeholder="Explain your request..." className="rounded-xl min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-6">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase tracking-widest">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-2xl h-11 px-8 font-black uppercase tracking-widest text-[10px] bg-slate-900">
                {isSubmitting ? 'Processing...' : 'Submit Application'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
