
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
  CheckCircle2,
  AlertCircle,
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

export default function AttendanceDatabasePage() {
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

  if (isUserLoading) return <FullScreenLoader text="Accessing workforce vault..." />;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
             Workforce <span className="text-primary">Ledger</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">
             Historical record database • {isManagement ? 'Company-wide' : 'Personal Profile'}
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl font-bold text-xs uppercase tracking-widest h-11 border-slate-200">
                <Download className="mr-2 h-4 w-4" /> Export DB
            </Button>
            <Button className="rounded-xl font-bold text-xs uppercase tracking-widest h-11 shadow-lg shadow-primary/20">
                <Filter className="mr-2 h-4 w-4" /> Advanced Filter
            </Button>
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 border shadow-inner w-full md:w-auto">
          <TabsTrigger value="attendance" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <History className="mr-2 h-4 w-4" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CalendarDays className="mr-2 h-4 w-4" /> Leave Logs
          </TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <DollarSign className="mr-2 h-4 w-4" /> Payroll
          </TabsTrigger>
        </TabsList>

        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/30 p-6 border-b">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search records by name, date or ID..." 
                  className="pl-10 h-11 bg-white border-slate-200 rounded-xl font-medium shadow-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50/50 rounded-xl border border-blue-100">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Live Data Stream Active</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* --- ATTENDANCE CONTENT --- */}
            <TabsContent value="attendance" className="m-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none">
                    <TableHead className="pl-6 font-black text-[10px] uppercase tracking-wider text-slate-400">Log Date</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-400">Employee</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-400">Time-In</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-400">Time-Out</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-400">Duration</TableHead>
                    <TableHead className="text-right pr-6 font-black text-[10px] uppercase tracking-wider text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAttendance ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 animate-pulse font-bold text-slate-300 uppercase tracking-widest">Processing Logs...</TableCell></TableRow>
                  ) : filteredAttendance.length > 0 ? (
                    filteredAttendance.map((log) => {
                      const timeIn = toSafeDate(log.timeIn);
                      const timeOut = toSafeDate(log.timeOut);
                      return (
                        <TableRow key={log.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0 group">
                          <TableCell className="pl-6 py-5">
                             <div className="flex flex-col">
                                <span className="font-bold text-slate-900 text-sm">{format(new Date(log.date), 'MMM d, yyyy')}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">REF: {log.id.substring(0, 8)}</span>
                             </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs uppercase">
                                {log.employeeName?.charAt(0) || 'E'}
                              </div>
                              <p className="text-sm font-bold text-slate-700">{log.employeeName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-semibold text-slate-600">{timeIn ? format(timeIn, 'hh:mm a') : '--:--'}</TableCell>
                          <TableCell className="text-sm font-semibold text-slate-600">{timeOut ? format(timeOut, 'hh:mm a') : '--:--'}</TableCell>
                          <TableCell>
                            <span className="text-[10px] font-black tabular-nums text-slate-900">
                                {log.totalMinutes ? `${Math.floor(log.totalMinutes / 60)}h ${log.totalMinutes % 60}m` : '--'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Badge className={cn(
                              "text-[9px] font-bold uppercase border-none px-3 h-6 shadow-sm",
                              log.status === 'present' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                            )}>
                              {log.status === 'present' ? 'Standard' : (log.status || 'N/A')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-32 opacity-20">
                        <Clock className="h-12 w-12 mx-auto mb-4" />
                        <p className="font-black uppercase tracking-widest text-sm">No Attendance records found</p>
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
                  <TableRow className="border-none">
                    <TableHead className="pl-6 font-black text-[10px] uppercase tracking-wider text-slate-400">Period</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-400">Employee</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-400">Category</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-400">Reason</TableHead>
                    <TableHead className="text-right pr-6 font-black text-[10px] uppercase tracking-wider text-slate-400">Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLeaves ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 animate-pulse font-bold text-slate-300 uppercase tracking-widest">Processing Data...</TableCell></TableRow>
                  ) : leaveRequests && leaveRequests.length > 0 ? (
                    leaveRequests.map(req => (
                      <TableRow key={req.id} className="hover:bg-slate-50/30 border-b border-slate-50 last:border-0 group">
                        <TableCell className="pl-6 py-5">
                          <p className="text-sm font-bold text-slate-900">{format(new Date(req.startDate), 'MMM d')} - {format(new Date(req.endDate), 'MMM d')}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Applied {req.appliedAt ? format(toSafeDate(req.appliedAt) || new Date(), 'PP') : ''}</p>
                        </TableCell>
                        <TableCell className="text-sm font-bold text-slate-700">{req.employeeName}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase bg-slate-50">{req.type}</Badge></TableCell>
                        <TableCell className="max-w-xs"><p className="text-xs text-slate-500 italic truncate">"{req.reason}"</p></TableCell>
                        <TableCell className="text-right pr-6">
                            <Badge className={cn(
                                "text-[9px] font-bold uppercase border-none px-3 h-6",
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
                        <p className="font-black uppercase tracking-widest text-sm">No leave history found</p>
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
                  <TableRow className="border-none">
                    <TableHead className="pl-6 font-black text-[10px] uppercase tracking-wider text-slate-400">Statement Period</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-400">Total Net Disbursed</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-400">Processing Date</TableHead>
                    <TableHead className="text-right pr-6 font-black text-[10px] uppercase tracking-wider text-slate-400">Payslips</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPayroll ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 animate-pulse font-bold text-slate-300 uppercase tracking-widest">Accessing Ledger...</TableCell></TableRow>
                  ) : payrollRuns && payrollRuns.length > 0 ? (
                    payrollRuns.map(run => (
                      <TableRow key={run.id} className="hover:bg-slate-50/30 border-b border-slate-50 last:border-0 group">
                        <TableCell className="pl-6 py-5">
                          <p className="text-sm font-bold text-slate-900">{format(new Date(run.periodStart), 'MMM d')} - {format(new Date(run.periodEnd), 'MMM d, yyyy')}</p>
                          <Badge variant="outline" className="text-[8px] font-black uppercase bg-green-50 text-green-700 border-green-100">Settled</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-base font-black text-slate-900 tabular-nums">₱{run.totalNetSalary.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-400 uppercase">
                           {run.createdAt ? format(toSafeDate(run.createdAt) || new Date(), 'MMM d, p') : 'Pending'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            <Button size="sm" variant="ghost" className="h-9 font-black uppercase text-[10px] tracking-widest gap-2 text-primary hover:bg-primary/5">
                                <FileText className="h-3.5 w-3.5" />
                                View Payslips
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-32 opacity-20">
                        <DollarSign className="h-12 w-12 mx-auto mb-4" />
                        <p className="font-black uppercase tracking-widest text-sm">No payroll history found</p>
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
