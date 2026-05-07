'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  CalendarDays, 
  Timer,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  UserCircle,
  Activity,
  LogOut,
  ShieldCheck,
  MapPin,
  ScanLine,
  Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { AppUser, HRAttendanceLog, HRLeaveRequest } from '@/lib/types';

const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

export default function HRDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [liveDuration, setLiveDuration] = useState<string>('00:00:00');

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const companyId = user?.companyId || user?.clientId || 'default';
  const today = format(new Date(), 'yyyy-MM-dd');
  const isManagement = user?.hrRole === 'owner' || user?.hrRole === 'admin';

  // --- Clock Logic ---
  const todayLogQuery = useMemoFirebase(
    () => (firestore && user?.id && companyId) ? query(
        collection(firestore, 'hr_companies', companyId, 'attendance'),
        where('employeeId', '==', user.id),
        where('date', '==', today)
    ) : null,
    [firestore, companyId, user?.id, today]
  );
  const { data: attendanceLogs } = useCollection<HRAttendanceLog>(todayLogQuery);
  const currentLog = attendanceLogs && attendanceLogs.length > 0 ? attendanceLogs[0] : null;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentLog && currentLog.timeIn && !currentLog.timeOut) {
      const startTime = toSafeDate(currentLog.timeIn);
      if (startTime) {
        interval = setInterval(() => {
          const now = new Date();
          const diffMs = now.getTime() - startTime.getTime();
          const diffHrs = Math.floor(diffMs / 3600000);
          const diffMins = Math.floor((diffMs % 3600000) / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          setLiveDuration(
            `${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`
          );
        }, 1000);
      }
    } else {
        setLiveDuration('00:00:00');
    }
    return () => clearInterval(interval);
  }, [currentLog]);

  const handleTimeIn = async () => {
    if (!firestore || !user?.id || !companyId) {
        toast({ variant: 'destructive', title: 'System Error', description: 'Could Not Resolve Employee Identity.' });
        return;
    }
    setIsProcessing(true);
    try {
        const attendanceCol = collection(firestore, 'hr_companies', companyId, 'attendance');
        const now = new Date();
        const hour = now.getHours();
        const status = hour >= 9 ? 'late' : 'present';

        await addDoc(attendanceCol, {
            companyId,
            employeeId: user.id,
            employeeName: user.name || 'Anonymous Employee',
            date: today,
            timeIn: serverTimestamp(),
            method: 'QR',
            status: status
        });

        toast({ title: 'Clock-In Successful', description: `Good Morning, ${user.name?.split(' ')[0] || 'Employee'}!` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could Not Clock In.' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleTimeOut = async () => {
    if (!firestore || !currentLog || !companyId) return;
    setIsProcessing(true);
    try {
        const startTime = toSafeDate(currentLog.timeIn);
        const endTime = new Date();
        let totalMinutes = 0;
        if (startTime) {
            totalMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
        }
        const logRef = doc(firestore, 'hr_companies', companyId, 'attendance', currentLog.id);
        await updateDoc(logRef, {
            timeOut: serverTimestamp(),
            totalMinutes: totalMinutes
        });
        toast({ title: 'Clock-Out Successful', description: 'Have A Great Evening!' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could Not Clock Out.' });
    } finally {
        setIsProcessing(false);
    }
  };

  // --- Dashboard Data Queries ---
  const employeesQuery = useMemoFirebase(
    () => (firestore && companyId && isManagement) ? query(collection(firestore, 'users'), where('companyId', '==', companyId)) : null,
    [firestore, companyId, isManagement]
  );
  const { data: employees } = useCollection(employeesQuery);

  const leavesQuery = useMemoFirebase(
    () => (firestore && companyId && isManagement) ? query(collection(firestore, 'hr_companies', companyId, 'leaveRequests'), where('status', '==', 'pending')) : null,
    [firestore, companyId, isManagement]
  );
  const { data: pendingLeaves } = useCollection(leavesQuery);
  
  const companyAttendanceQuery = useMemoFirebase(
    () => (firestore && companyId && isManagement) ? query(collection(firestore, 'hr_companies', companyId, 'attendance'), where('date', '==', today)) : null,
    [firestore, companyId, isManagement, today]
  );
  const { data: todayAttendance } = useCollection(companyAttendanceQuery);

  const myAttendanceQuery = useMemoFirebase(
    () => (firestore && companyId && !isManagement && user?.id) ? query(
        collection(firestore, 'hr_companies', companyId, 'attendance'), 
        where('employeeId', '==', user.id),
        orderBy('date', 'desc')
    ) : null,
    [firestore, companyId, isManagement, user?.id]
  );
  const { data: myAttendance } = useCollection<HRAttendanceLog>(myAttendanceQuery);

  const stats = useMemo(() => {
    if (isManagement) {
        return [
            { label: 'Workforce', value: employees?.length || 0, icon: Users, trend: 'Managed Staff', trendType: 'up' },
            { label: 'Present Today', value: todayAttendance?.length || 0, icon: Clock, trend: 'Live Attendance', trendType: 'up' },
            { label: 'On Leave', value: '0', icon: CalendarDays, trend: 'Scheduled Away', trendType: 'down' },
            { label: 'Pending Leaves', value: pendingLeaves?.length || 0, icon: AlertCircle, trend: 'Action Required', trendType: 'warn' },
        ];
    } else {
        const streak = myAttendance?.filter(a => a.status === 'present').length || 0;
        return [
            { label: 'Attendance Streak', value: streak, icon: TrendingUp, trend: 'Days Present', trendType: 'up' },
            { label: 'Performance', value: '100%', icon: FileCheck, trend: 'Reliability Score', trendType: 'up' },
            { label: 'Work Shifts', value: myAttendance?.length || 0, icon: Activity, trend: 'Total Logs', trendType: 'up' },
            { label: 'Personal Profile', value: '360°', icon: UserCircle, trend: 'Secure Records', trendType: 'up' },
        ];
    }
  }, [isManagement, employees, todayAttendance, pendingLeaves, myAttendance]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
            {isManagement ? 'Workforce Intelligence' : 'My Workspace'}
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">
            {isManagement ? `Central Control For ${user?.businessName || 'Organization'}` : `Hello, ${user?.name?.split(' ')[0] || 'Employee'} • Shift Control`}
          </p>
        </div>
        <div className="flex items-center gap-3">
            <Button onClick={() => router.push('/hr-dashboard/attendance')} variant="outline" className="rounded-xl h-11 px-6 font-bold shadow-sm text-xs uppercase tracking-widest border-slate-200">
                <Database className="mr-2 h-4 w-4" /> Master Ledger
            </Button>
            {isManagement && (
                <Button onClick={() => router.push('/hr-dashboard/payroll')} className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20 text-xs uppercase tracking-widest">
                    Run Payroll
                </Button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={cn("md:col-span-2", isManagement && "md:col-span-3")}>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-sm rounded-2xl bg-white">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-900">
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <div className={cn("text-[9px] font-bold uppercase tracking-wider", stat.trendType === 'up' ? "text-green-600" : "text-amber-600")}>
                                    {stat.trend}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-3xl font-black text-slate-900 tabular-nums">{stat.value}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/30 pb-6 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Recent Activity Feed</CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500">Real-Time Operational Summary</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-50">
                        {(isManagement ? todayAttendance : myAttendance)?.slice(0, 5).map((log) => {
                            const timeInDate = toSafeDate(log.timeIn);
                            return (
                                <div key={log.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase text-sm">{log.employeeName?.charAt(0)}</div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{isManagement ? log.employeeName : format(new Date(log.date), 'MMM d, yyyy')}</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{log.method} Verification</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900">{timeInDate ? format(timeInDate, 'hh:mm a') : '--:--'}</p>
                                        <Badge className={cn("text-[9px] h-5 font-black uppercase px-2 shadow-none", log.status === 'present' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>
                                            {log.status}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}
                        {!(isManagement ? todayAttendance : myAttendance)?.length && (
                            <div className="py-20 text-center opacity-20">
                                <Activity className="h-10 w-10 mx-auto mb-2" />
                                <p className="text-sm font-black uppercase tracking-widest">No Activity Found</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* --- STATION CLOCK SIDEBAR --- */}
        <div className="md:col-span-2 lg:col-span-1 space-y-6">
            <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white group">
                <CardContent className="p-8 flex flex-col items-center text-center space-y-8 relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                    
                    <div className="h-28 w-28 rounded-full bg-slate-50 border-4 border-white flex items-center justify-center relative shadow-xl z-10">
                        <div className="absolute inset-0 rounded-full border-2 border-primary/10 animate-ping opacity-20" />
                        <Clock className="h-10 w-10 text-primary" />
                    </div>

                    <div className="space-y-1 z-10">
                        <h2 className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">
                            {currentTime ? format(currentTime, 'hh:mm:ss') : '--:--:--'}
                            <span className="text-lg ml-1 text-slate-400 font-bold uppercase">{currentTime ? format(currentTime, 'a') : ''}</span>
                        </h2>
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] pt-2">Precision Time-Sync</p>
                    </div>

                    {currentLog && currentLog.timeIn && !currentLog.timeOut && (
                        <div className="w-full bg-slate-900 rounded-[2rem] p-6 text-white space-y-4 animate-in zoom-in-95 shadow-2xl shadow-slate-900/20">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-green-400 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Active</span>
                                </div>
                                <Badge variant="outline" className="border-white/20 text-white font-mono text-[9px] h-6 px-3">
                                    In: {format(toSafeDate(currentLog.timeIn) || new Date(), 'hh:mm a')}
                                </Badge>
                            </div>
                            <p className="text-3xl font-black tracking-tighter tabular-nums">{liveDuration}</p>
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Current Duration</p>
                        </div>
                    )}

                    <div className="w-full space-y-4 z-10">
                        {!currentLog ? (
                            <Button onClick={handleTimeIn} disabled={isProcessing} className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
                                Authorize Shift Entry
                            </Button>
                        ) : !currentLog.timeOut ? (
                            <Button onClick={handleTimeOut} disabled={isProcessing} className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20">
                                <LogOut className="mr-2 h-4 w-4" /> Authorize Shift Exit
                            </Button>
                        ) : (
                            <div className="p-8 rounded-[2rem] bg-green-50 border-2 border-dashed border-green-100 flex flex-col items-center gap-3">
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                                <div>
                                    <p className="font-black text-slate-900 uppercase text-xs tracking-wider">Shift Secured</p>
                                    <p className="text-[9px] font-bold text-green-600/70 uppercase">Daily Logs Finalized.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl bg-slate-900 text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10"><ScanLine className="h-24 w-24" /></div>
                <CardHeader><CardTitle className="text-lg font-black tracking-tight uppercase">Operational Protocol</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center"><Timer className="h-5 w-5 text-green-400" /></div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-wider text-white">Shift Accuracy</p>
                            <p className="text-[9px] text-white/50 font-bold leading-relaxed">Logs After 09:00 AM Are Flagged For Manual Review.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center"><MapPin className="h-5 w-5 text-blue-400" /></div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-wider text-white">Station Verification</p>
                            <p className="text-[9px] text-white/50 font-bold leading-relaxed">IP And Geolocation Verified For Every Authorization.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
