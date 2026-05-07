
'use client';

import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Search, 
  Clock, 
  CalendarDays, 
  DollarSign, 
  Filter,
  Download,
  FileText,
  History,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FullScreenLoader } from '@/components/ui/loader';
import type { HRAttendanceLog, HRLeaveRequest, HRPayrollRun } from '@/lib/types';

const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

export default function AttendancePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveTab] = useState('attendance');

  const companyId = user?.companyId || user?.clientId || 'default';
  const isManagement = user?.hrRole === 'owner' || user?.hrRole === 'admin';

  // --- Data Queries ---
  const attendanceQuery = useMemoFirebase(
    () => {
        if (!firestore || !companyId) return null;
        const col = collection(firestore, 'hr_companies', companyId, 'attendance');
        if (isManagement) return query(col, orderBy('date', 'desc'));
        return query(col, where('employeeId', '==', user?.id || ''), orderBy('date', 'desc'));
    },
    [firestore, companyId, isManagement, user?.id]
  );
  const { data: attendanceLogs, isLoading: loadingAttendance } = useCollection<HRAttendanceLog>(attendanceQuery);

  const leaveQuery = useMemoFirebase(
    () => {
        if (!firestore || !companyId) return null;
        const col = collection(firestore, 'hr_companies', companyId, 'leaveRequests');
        if (isManagement) return query(col, orderBy('appliedAt', 'desc'));
        return query(col, where('employeeId', '==', user?.id || ''), orderBy('appliedAt', 'desc'));
    },
    [firestore, companyId, isManagement, user?.id]
  );
  const { data: leaveRequests, isLoading: loadingLeaves } = useCollection<HRLeaveRequest>(leaveQuery);

  const payrollQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'hr_companies', companyId, 'payrollRuns'), orderBy('createdAt', 'desc')) : null,
    [firestore, companyId]
  );
  const { data: payrollRuns, isLoading: loadingPayroll } = useCollection<HRPayrollRun>(payrollQuery);

  // --- Filtering Logic ---
  const filteredAttendance = useMemo(() => {
    if (!attendanceLogs) return [];
    if (!searchTerm) return attendanceLogs;
    return attendanceLogs.filter(log => 
        log.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.date.includes(searchTerm)
    );
  }, [attendanceLogs, searchTerm]);

  if (isUserLoading) return <FullScreenLoader text="loading records..." />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
             Attendance history
          </h1>
          <p className="text-slate-500 font-medium text-sm">
             view your records for work, leave, and payments
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl font-bold text-xs h-10 border-slate-200 shadow-sm" onClick={() => window.print()}>
                <Download className="mr-2 h-4 w-4" /> export records
            </Button>
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-2xl h-12 border shadow-inner w-full md:w-auto">
          <TabsTrigger value="attendance" className="rounded-xl px-6 font-bold text-xs tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
            attendance
          </TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-xl px-6 font-bold text-xs tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
            leave logs
          </TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-xl px-6 font-bold text-xs tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
            payroll
          </TabsTrigger>
        </TabsList>

        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/30 p-6 border-b">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="search by name or date..." 
                  className="pl-10 h-10 bg-white border-slate-200 rounded-xl font-medium shadow-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 rounded-lg border border-blue-100">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">live update active</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* --- ATTENDANCE CONTENT --- */}
            <TabsContent value="attendance" className="m-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="pl-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">date</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">employee</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">time-in</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">time-out</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">duration</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAttendance ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 animate-pulse font-medium text-slate-400">loading logs...</TableCell></TableRow>
                  ) : filteredAttendance.length > 0 ? (
                    filteredAttendance.map((log) => {
                      const timeIn = toSafeDate(log.timeIn);
                      const timeOut = toSafeDate(log.timeOut);
                      return (
                        <TableRow key={log.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0 group">
                          <TableCell className="pl-6 py-4">
                             <div className="flex flex-col">
                                <span className="font-bold text-slate-900 text-sm">{format(new Date(log.date), 'MMM d, yyyy')}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">id: {log.id.substring(0, 6)}</span>
                             </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs uppercase">
                                {log.employeeName?.charAt(0) || 'E'}
                              </div>
                              <p className="text-sm font-semibold text-slate-700">{log.employeeName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-600">{timeIn ? format(timeIn, 'hh:mm a') : '--:--'}</TableCell>
                          <TableCell className="text-sm font-medium text-slate-600">{timeOut ? format(timeOut, 'hh:mm a') : '--:--'}</TableCell>
                          <TableCell>
                            <span className="text-xs font-bold tabular-nums text-slate-900">
                                {log.totalMinutes ? `${Math.floor(log.totalMinutes / 60)}h ${log.totalMinutes % 60}m` : '--'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Badge className={cn(
                              "text-[10px] font-bold uppercase border-none px-3 h-6 shadow-sm",
                              log.status === 'present' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                            )}>
                              {log.status || 'n/a'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-32 opacity-20">
                        <Clock className="h-12 w-12 mx-auto mb-4" />
                        <p className="font-bold uppercase tracking-widest text-xs">no records found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* --- LEAVES CONTENT --- */}
            <TabsContent value="leaves" className="m-0">
               <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="pl-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">period</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">employee</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">category</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">reason</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLeaves ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 animate-pulse font-medium text-slate-400">loading logs...</TableCell></TableRow>
                  ) : leaveRequests && leaveRequests.length > 0 ? (
                    leaveRequests.map(req => (
                      <TableRow key={req.id} className="hover:bg-slate-50/30 border-b border-slate-50 last:border-0 group">
                        <TableCell className="pl-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{format(new Date(req.startDate), 'MMM d')} - {format(new Date(req.endDate), 'MMM d')}</p>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">applied {req.appliedAt ? format(toSafeDate(req.appliedAt) || new Date(), 'PP') : ''}</p>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-slate-700">{req.employeeName}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] font-bold uppercase bg-slate-50">{req.type}</Badge></TableCell>
                        <TableCell className="max-w-xs"><p className="text-xs text-slate-500 italic truncate">"{req.reason}"</p></TableCell>
                        <TableCell className="text-right pr-6">
                            <Badge className={cn(
                                "text-[10px] font-bold uppercase border-none px-3 h-6 shadow-sm",
                                req.status === 'approved' ? "bg-green-50 text-green-700" : 
                                req.status === 'pending' ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                            )}>
                                {req.status}
                            </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-32 opacity-20">
                        <CalendarDays className="h-12 w-12 mx-auto mb-4" />
                        <p className="font-bold uppercase tracking-widest text-xs">no leave history found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* --- PAYROLL CONTENT --- */}
            <TabsContent value="payroll" className="m-0">
               <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="pl-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">period</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">total salary</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">date processed</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPayroll ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 animate-pulse font-medium text-slate-400">loading records...</TableCell></TableRow>
                  ) : payrollRuns && payrollRuns.length > 0 ? (
                    payrollRuns.map(run => (
                      <TableRow key={run.id} className="hover:bg-slate-50/30 border-b border-slate-50 last:border-0 group">
                        <TableCell className="pl-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{format(new Date(run.periodStart), 'MMM d')} - {format(new Date(run.periodEnd), 'MMM d, yyyy')}</p>
                          <Badge variant="outline" className="text-[8px] font-bold uppercase bg-green-50 text-green-700 border-green-100">settled</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-bold text-slate-900 tabular-nums">₱{run.totalNetSalary.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-400 uppercase">
                           {run.createdAt ? format(toSafeDate(run.createdAt) || new Date(), 'MMM d, p') : 'pending'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            <Button size="sm" variant="ghost" className="h-8 font-bold text-[10px] uppercase tracking-widest gap-2 text-primary hover:bg-primary/5">
                                <FileText className="h-3.5 w-3.5" />
                                payslips
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-32 opacity-20">
                        <DollarSign className="h-12 w-12 mx-auto mb-4" />
                        <p className="font-bold uppercase tracking-widest text-xs">no payment history found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
