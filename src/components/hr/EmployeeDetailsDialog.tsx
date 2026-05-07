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
  CalendarDays,
  Clock,
  LayoutDashboard
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
      <DialogContent className="sm:max-w-4xl rounded-[2.5rem] border-none p-0 overflow-hidden flex flex-col max-h-[90vh] bg-white">
        <div className="p-8 pb-4">
            <DialogHeader>
                <div className="flex items-center gap-6 mb-6">
                    <div className="h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400 shadow-inner">
                        {employee.name?.split(' ').map(n => n[0]).join('') || '?'}
                    </div>
                    <div className="space-y-1">
                        <DialogTitle className="text-3xl font-bold tracking-tight text-slate-900">{employee.name || 'Anonymous'}</DialogTitle>
                        <div className="flex items-center gap-3">
                            <Badge className={cn(
                                "border-none text-[10px] font-bold px-3 py-1",
                                profile?.status === 'Active' ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                            )}>
                                {profile?.status || 'Active'}
                            </Badge>
                            <span className="text-sm font-medium text-slate-500">
                                {profile?.position || 'Unassigned'} • {profile?.department || 'General'}
                            </span>
                        </div>
                    </div>
                </div>
                <DialogDescription className="sr-only">360-Degree Employment Overview For {employee.name}</DialogDescription>
            </DialogHeader>
        </div>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
            <div className="px-8 border-b border-slate-50">
                <TabsList className="bg-transparent h-12 p-0 gap-8">
                    <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-semibold text-sm tracking-tight px-0">Overview</TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-semibold text-sm tracking-tight px-0">Attendance Logs</TabsTrigger>
                    <TabsTrigger value="leaves" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-semibold text-sm tracking-tight px-0">Leave History</TabsTrigger>
                </TabsList>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-8">
                    <TabsContent value="overview" className="mt-0 space-y-10 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <UserCircle className="h-4 w-4" /> Personal & Contact
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 group">
                                        <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors"><Mail className="h-4 w-4" /></div>
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Primary Email</p>
                                            <p className="text-sm font-semibold text-slate-700">{employee.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 group">
                                        <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors"><Phone className="h-4 w-4" /></div>
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Contact Number</p>
                                            <p className="text-sm font-semibold text-slate-700">{employee.contactNumber || 'No Record'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" /> Compensation Profile
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl border border-slate-50 bg-slate-50/30 space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Pay Rate</p>
                                        <p className="text-lg font-bold text-slate-900">₱{(Number(profile?.rate) || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl border border-slate-50 bg-slate-50/30 space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Cycle</p>
                                        <p className="text-lg font-bold text-slate-900 capitalize">{profile?.salaryType || 'Monthly'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-slate-50" />

                        <div className="space-y-6">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> Employment Intelligence
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center text-center gap-4 bg-white shadow-sm hover:shadow-md transition-all">
                                    <div className="p-3 rounded-2xl bg-blue-50 text-primary">
                                        <Calendar className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">Date Signed</p>
                                        <p className="text-xs font-medium text-slate-400 mt-1">{profile?.startDate ? format(new Date(profile.startDate), 'MMMM do, yyyy') : 'Pending'}</p>
                                    </div>
                                </div>
                                <div className="p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center text-center gap-4 bg-white shadow-sm hover:shadow-md transition-all">
                                    <div className="p-3 rounded-2xl bg-green-50 text-green-600">
                                        <Clock className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">Shift Coverage</p>
                                        <p className="text-xs font-medium text-slate-400 mt-1">9:00 AM - 6:00 PM</p>
                                    </div>
                                </div>
                                <div className="p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center text-center gap-4 bg-white shadow-sm hover:shadow-md transition-all">
                                    <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
                                        <LayoutDashboard className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">Workstation</p>
                                        <p className="text-xs font-medium text-slate-400 mt-1">{profile?.department || 'Main Hub'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="attendance" className="mt-0 animate-in fade-in duration-500">
                         <div className="rounded-3xl border border-slate-50 overflow-hidden bg-slate-50/20">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-none">
                                        <TableHead className="text-xs font-bold text-slate-400 pl-6">Work Date</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-400">Entry Time</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-400">Exit Time</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-400 text-right pr-6">Performance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendanceLogs && attendanceLogs.length > 0 ? (
                                        attendanceLogs.map(log => {
                                            const timeIn = log.timeIn instanceof Timestamp ? log.timeIn.toDate() : (log.timeIn ? new Date(log.timeIn) : null);
                                            const timeOut = log.timeOut instanceof Timestamp ? log.timeOut.toDate() : (log.timeOut ? new Date(log.timeOut) : null);
                                            return (
                                                <TableRow key={log.id} className="hover:bg-white transition-colors border-b border-slate-50 last:border-0 group">
                                                    <TableCell className="text-sm font-bold text-slate-600 pl-6 py-5 group-hover:text-slate-900">{log.date ? format(new Date(log.date), 'MMM d, yyyy') : 'No Date'}</TableCell>
                                                    <TableCell className="text-sm font-semibold text-slate-700">{timeIn ? format(timeIn, 'hh:mm a') : '--:--'}</TableCell>
                                                    <TableCell className="text-sm font-semibold text-slate-700">{timeOut ? format(timeOut, 'hh:mm a') : '--:--'}</TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Badge className={cn(
                                                            "text-[10px] font-bold uppercase border-none px-3 py-1",
                                                            log.status === 'present' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                                                        )}>
                                                            {log.status || 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-20 text-sm font-medium text-slate-300">
                                                No Attendance Data Has Been Logged For This Period.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         </div>
                    </TabsContent>

                    <TabsContent value="leaves" className="mt-0 animate-in fade-in duration-500">
                         <div className="space-y-4">
                            {leaveRequests && leaveRequests.length > 0 ? (
                                leaveRequests.map(request => (
                                    <div key={request.id} className="p-6 rounded-[2rem] border border-slate-50 bg-slate-50/30 flex items-center justify-between hover:bg-white hover:border-slate-100 transition-all shadow-none hover:shadow-md">
                                        <div className="flex items-center gap-5">
                                            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-50 flex items-center justify-center text-slate-400 shadow-sm">
                                                <CalendarDays className="h-6 w-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-base font-bold text-slate-900">{request.type || 'Leave'}</p>
                                                <p className="text-xs font-semibold text-slate-400">
                                                    {request.startDate ? format(new Date(request.startDate), 'MMM d') : '?'} — {request.endDate ? format(new Date(request.endDate), 'MMM d, yyyy') : '?'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-2">
                                            <Badge className={cn(
                                                "text-[10px] font-bold uppercase border-none px-4 py-1",
                                                request.status === 'approved' ? "bg-green-50 text-green-700" : 
                                                request.status === 'pending' ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                                            )}>
                                                {request.status || 'Pending'}
                                            </Badge>
                                            <p className="text-[10px] text-slate-400 font-medium italic">Applied {request.appliedAt ? format(request.appliedAt.toDate(), 'PP') : 'Today'}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-24 text-center flex flex-col items-center gap-4 opacity-20">
                                    <CalendarDays className="h-12 w-12 text-slate-400" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Request History Is Clear</p>
                                </div>
                            )}
                         </div>
                    </TabsContent>
                </div>
            </ScrollArea>
        </Tabs>

        <div className="p-8 pt-4 border-t bg-slate-50/20">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex items-center gap-3 opacity-60">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Secure Corporate Resource — Confidential
                    </p>
                </div>
                <div className="flex gap-3 shrink-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-sm font-bold h-11 px-8 rounded-2xl">Dismiss</Button>
                    <Button className="rounded-2xl h-11 px-10 font-bold text-sm shadow-lg">
                        Edit Employment Profile
                    </Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
