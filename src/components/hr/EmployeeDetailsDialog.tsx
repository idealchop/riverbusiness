'use client';

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
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
  Clock,
  CalendarDays
} from 'lucide-react';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
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
    () => (firestore && employee) ? query(
        collection(firestore, 'hr_companies', companyId, 'attendance'),
        where('employeeId', '==', employee.id),
        orderBy('date', 'desc')
    ) : null,
    [firestore, employee, companyId]
  );
  const { data: attendanceLogs } = useCollection<HRAttendanceLog>(attendanceQuery);

  const leaveQuery = useMemoFirebase(
    () => (firestore && employee) ? query(
        collection(firestore, 'hr_companies', companyId, 'leaveRequests'),
        where('employeeId', '==', employee.id),
        orderBy('appliedAt', 'desc')
    ) : null,
    [firestore, employee, companyId]
  );
  const { data: leaveRequests } = useCollection<HRLeaveRequest>(leaveQuery);

  if (!employee) return null;

  const profile = employee.hrProfile;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-3xl border-none p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 pb-4">
            <DialogHeader>
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black tracking-tight uppercase">{employee.name}</DialogTitle>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-green-50 text-green-600 border-none uppercase text-[8px] font-black">
                                {profile?.status || 'Active'}
                            </Badge>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {profile?.position} • {profile?.department}
                            </span>
                        </div>
                    </div>
                </div>
                <DialogDescription className="sr-only">Detailed employment information for {employee.name}</DialogDescription>
            </DialogHeader>
        </div>

        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
            <div className="px-8 border-b">
                <TabsList className="bg-transparent h-12 p-0 gap-8">
                    <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-bold text-xs uppercase tracking-widest">General Info</TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-bold text-xs uppercase tracking-widest">Attendance Logs</TabsTrigger>
                    <TabsTrigger value="leaves" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-bold text-xs uppercase tracking-widest">Leave History</TabsTrigger>
                </TabsList>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-8">
                    <TabsContent value="info" className="mt-0 space-y-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <UserCircle className="h-3 w-3" /> Contact Information
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-slate-300" />
                                        <p className="text-sm font-bold text-slate-600">{employee.email}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-slate-300" />
                                        <p className="text-sm font-bold text-slate-600">{employee.contactNumber || 'No number set'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <DollarSign className="h-3 w-3" /> Compensation
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Rate (PHP)</span>
                                        <span className="text-sm font-black text-slate-900">₱{profile?.rate.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Type</span>
                                        <span className="text-sm font-black text-slate-900 capitalize">{profile?.salaryType}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Briefcase className="h-3 w-3" /> Employment History
                            </h4>
                            <div className="p-5 rounded-3xl border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900">Hired On</p>
                                        <p className="text-xs font-bold text-slate-400">{profile?.startDate ? format(new Date(profile.startDate), 'MMMM do, yyyy') : 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">Permanent</Badge>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="attendance" className="mt-0 animate-in fade-in duration-300">
                         <div className="rounded-2xl border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Date</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Clock-In</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Clock-Out</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendanceLogs && attendanceLogs.length > 0 ? (
                                        attendanceLogs.map(log => (
                                            <TableRow key={log.id} className="hover:bg-slate-50/50">
                                                <TableCell className="text-xs font-bold text-slate-600">{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                                                <TableCell className="text-xs font-black text-slate-900">{log.timeIn ? format(log.timeIn.toDate(), 'hh:mm a') : '--'}</TableCell>
                                                <TableCell className="text-xs font-black text-slate-900">{log.timeOut ? format(log.timeOut.toDate(), 'hh:mm a') : '--'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge className={cn(
                                                        "text-[8px] font-black uppercase border-none px-2",
                                                        log.status === 'present' ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                                                    )}>
                                                        {log.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12 text-xs font-bold text-slate-400 uppercase tracking-widest opacity-50">
                                                No attendance logs found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         </div>
                    </TabsContent>

                    <TabsContent value="leaves" className="mt-0 animate-in fade-in duration-300">
                         <div className="space-y-4">
                            {leaveRequests && leaveRequests.length > 0 ? (
                                leaveRequests.map(request => (
                                    <div key={request.id} className="p-5 rounded-3xl border border-slate-100 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                <CalendarDays className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{request.type}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                    {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge className={cn(
                                                "text-[8px] font-black uppercase border-none px-3",
                                                request.status === 'approved' ? "bg-green-100 text-green-700" : 
                                                request.status === 'pending' ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                                            )}>
                                                {request.status}
                                            </Badge>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                                Applied {format(request.appliedAt.toDate(), 'MMM d')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center flex flex-col items-center gap-3 opacity-20">
                                    <CalendarDays className="h-10 w-10 text-slate-400" />
                                    <p className="text-xs font-black uppercase tracking-widest">No leave history found</p>
                                </div>
                            )}
                         </div>
                    </TabsContent>
                </div>
            </ScrollArea>
        </Tabs>

        <div className="p-8 pt-4 border-t bg-slate-50/50">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center gap-3 flex-1">
                    <ShieldCheck className="h-5 w-5 text-green-400 shrink-0" />
                    <p className="text-[9px] font-bold leading-relaxed uppercase tracking-tight text-white/70">
                        This profile is encrypted and isolated by company protocol. only authorized personnel can modify this data.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase tracking-widest h-12">Dismiss</Button>
                    <Button className="rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-slate-900 shadow-xl shadow-slate-200/50">
                        Edit Record
                    </Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
