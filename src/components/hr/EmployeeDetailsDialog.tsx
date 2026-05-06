'use client';

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AppUser, HRAttendanceLog, HRLeaveRequest } from '@/lib/types';
import { 
  Briefcase, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  UserCircle,
  CalendarDays
} from 'lucide-react';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface EmployeeDetailsDialogProps {
  employee: AppUser | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeDetailsDialog({ employee, isOpen, onOpenChange }: EmployeeDetailsDialogProps) {
  const firestore = useFirestore();

  const companyId = employee?.companyId || 'default';
  
  const attendanceQuery = useMemoFirebase(
    () => (firestore && employee?.id && companyId) ? query(
        collection(firestore, 'hr_companies', companyId, 'attendance'),
        where('employeeId', '==', employee.id),
        orderBy('date', 'desc')
    ) : null,
    [firestore, employee?.id, companyId]
  );
  const { data: attendanceLogs } = useCollection<HRAttendanceLog>(attendanceQuery);

  const leaveQuery = useMemoFirebase(
    () => (firestore && employee?.id && companyId) ? query(
        collection(firestore, 'hr_companies', companyId, 'leaveRequests'),
        where('employeeId', '==', employee.id),
        orderBy('appliedAt', 'desc')
    ) : null,
    [firestore, employee?.id, companyId]
  );
  const { data: leaveRequests } = useCollection<HRLeaveRequest>(leaveQuery);

  if (!employee) return null;

  const profile = employee.hrProfile;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-[2rem] border-none p-0 overflow-hidden flex flex-col max-h-[90vh] bg-white">
        <div className="p-8 pb-4">
            <DialogHeader>
                <div className="flex items-center gap-5 mb-4">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-400">
                        {employee.name?.split(' ').map(n => n[0]).join('') || '?'}
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-bold text-slate-900">{employee.name}</DialogTitle>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-green-50 text-green-700 border-none text-[10px] font-bold px-2 py-0.5">
                                {profile?.status || 'Active'}
                            </Badge>
                            <span className="text-xs font-medium text-slate-400">
                                {profile?.position || 'N/A'} • {profile?.department || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
                <DialogDescription className="sr-only">Detailed employment information for {employee.name}</DialogDescription>
            </DialogHeader>
        </div>

        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
            <div className="px-8 border-b border-slate-50">
                <TabsList className="bg-transparent h-12 p-0 gap-6">
                    <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-semibold text-xs tracking-tight">Information</TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-semibold text-xs tracking-tight">Attendance</TabsTrigger>
                    <TabsTrigger value="leaves" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-semibold text-xs tracking-tight">Leaves</TabsTrigger>
                </TabsList>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-8">
                    <TabsContent value="info" className="mt-0 space-y-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    Contact
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-slate-50"><Mail className="h-4 w-4 text-slate-400" /></div>
                                        <p className="text-sm font-semibold text-slate-700">{employee.email}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-slate-50"><Phone className="h-4 w-4 text-slate-400" /></div>
                                        <p className="text-sm font-semibold text-slate-700">{employee.contactNumber || 'No number set'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    Compensation
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-50 bg-slate-50/30">
                                        <span className="text-xs font-semibold text-slate-400">Pay Rate</span>
                                        <span className="text-sm font-bold text-slate-900">₱{profile?.rate?.toLocaleString() || '0'}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-50 bg-slate-50/30">
                                        <span className="text-xs font-semibold text-slate-400">Frequency</span>
                                        <span className="text-sm font-bold text-slate-900 capitalize">{profile?.salaryType || 'Monthly'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-slate-50" />

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employment Cycle</h4>
                            <div className="p-5 rounded-2xl border border-slate-100 flex items-center justify-between bg-white shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-blue-50 text-primary">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Signed On</p>
                                        <p className="text-xs font-medium text-slate-400">{profile?.startDate ? format(new Date(profile.startDate), 'MMMM do, yyyy') : 'N/A'}</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-bold px-2.5 h-6 border-slate-100">Permanent</Badge>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="attendance" className="mt-0 animate-in fade-in duration-300">
                         <div className="rounded-2xl border border-slate-50 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time-In</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time-Out</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendanceLogs && attendanceLogs.length > 0 ? (
                                        attendanceLogs.map(log => (
                                            <TableRow key={log.id} className="hover:bg-slate-50/30 border-b border-slate-50 last:border-0">
                                                <TableCell className="text-xs font-semibold text-slate-600">{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                                                <TableCell className="text-xs font-bold text-slate-900">{log.timeIn instanceof Timestamp ? format(log.timeIn.toDate(), 'hh:mm a') : '--'}</TableCell>
                                                <TableCell className="text-xs font-bold text-slate-900">{log.timeOut instanceof Timestamp ? format(log.timeOut.toDate(), 'hh:mm a') : '--'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge className={cn(
                                                        "text-[9px] font-bold uppercase border-none px-2 h-5",
                                                        log.status === 'present' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                                                    )}>
                                                        {log.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12 text-xs font-semibold text-slate-300 uppercase tracking-tight">
                                                No attendance logs found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         </div>
                    </TabsContent>

                    <TabsContent value="leaves" className="mt-0 animate-in fade-in duration-300">
                         <div className="space-y-3">
                            {leaveRequests && leaveRequests.length > 0 ? (
                                leaveRequests.map(request => (
                                    <div key={request.id} className="p-4 rounded-xl border border-slate-50 bg-slate-50/30 flex items-center justify-between hover:bg-white hover:border-slate-100 transition-all shadow-none hover:shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                                                <CalendarDays className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{request.type}</p>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">
                                                    {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge className={cn(
                                                "text-[9px] font-bold uppercase border-none px-2.5 h-5",
                                                request.status === 'approved' ? "bg-green-50 text-green-700" : 
                                                request.status === 'pending' ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                                            )}>
                                                {request.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center flex flex-col items-center gap-3 opacity-20">
                                    <CalendarDays className="h-10 w-10 text-slate-400" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No leave history found</p>
                                </div>
                            )}
                         </div>
                    </TabsContent>
                </div>
            </ScrollArea>
        </Tabs>

        <div className="p-8 pt-4 border-t bg-slate-50/30">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 opacity-60">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        Secure Employee Record 
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs font-bold h-10 px-6">Dismiss</Button>
                    <Button className="rounded-xl h-10 px-8 font-bold text-xs shadow-md">
                        Edit Record
                    </Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
