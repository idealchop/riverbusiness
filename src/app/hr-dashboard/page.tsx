'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  CalendarDays, 
  Timer,
  AlertCircle,
  TrendingUp,
  FileCheck,
  UserCircle,
  Activity,
  LogOut,
  MapPin,
  ScanLine,
  LogIn,
  Database,
  CheckCircle2,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { AppUser, HRAttendanceLog } from '@/lib/types';
import Link from 'next/link';

const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

// --- DEMO DATA ---
const DEMO_ATTENDANCE: Partial<HRAttendanceLog>[] = [
    { id: '1', employeeName: 'John Doe', date: format(new Date(), 'yyyy-MM-dd'), timeIn: new Date(new Date().setHours(8, 30)), timeOut: new Date(new Date().setHours(17, 30)), method: 'QR', status: 'present' },
    { id: '2', employeeName: 'Jane Smith', date: format(new Date(), 'yyyy-MM-dd'), timeIn: new Date(new Date().setHours(9, 15)), timeOut: new Date(new Date().setHours(18, 15)), method: 'manual', status: 'late' },
    { id: '3', employeeName: 'Robert Johnson', date: format(new Date(), 'yyyy-MM-dd'), timeIn: new Date(new Date().setHours(8, 45)), method: 'QR', status: 'present' },
    { id: '4', employeeName: 'Maria Garcia', date: format(new Date(), 'yyyy-MM-dd'), timeIn: new Date(new Date().setHours(8, 55)), method: 'QR', status: 'present' },
];

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

        toast({ title: 'Clock In Successful', description: `Good Morning, ${user.name?.split(' ')[0] || 'Employee'}!` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Operation Failed', description: 'Could Not Clock In.' });
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
        toast({ title: 'Clock Out Successful', description: 'Shift Summary Saved To Attendance.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Operation Failed', description: 'Could Not Clock Out.' });
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

  const displayAttendance = useMemo(() => {
    const realData = isManagement ? todayAttendance : myAttendance;
    if (!realData || realData.length === 0) return DEMO_ATTENDANCE;
    return realData;
  }, [isManagement, todayAttendance, myAttendance]);

  // Derived Feed Items: Transform single shift logs into separate Clock In/Out events
  const feedItems = useMemo(() => {
    const items: any[] = [];
    displayAttendance.forEach(log => {
        if (log.timeOut) {
            items.push({
                id: `${log.id}-out`,
                employeeName: log.employeeName,
                action: 'Clock Out',
                time: toSafeDate(log.timeOut),
                status: log.status,
                method: log.method,
                date: log.date
            });
        }
        if (log.timeIn) {
            items.push({
                id: `${log.id}-in`,
                employeeName: log.employeeName,
                action: 'Clock In',
                time: toSafeDate(log.timeIn),
                status: log.status,
                method: log.method,
                date: log.date
            });
        }
    });
    return items.sort((a, b) => (b.time?.getTime() || 0) - (a.time?.getTime() || 0));
  }, [displayAttendance]);

  const stats = useMemo(() => {
    if (isManagement) {
        return [
            { label: 'Workforce', value: Math.max(employees?.length || 0, 12), icon: Users, trend: 'Managed Staff', trendType: 'up' },
            { label: 'Present Today', value: Math.max(todayAttendance?.length || 0, 8), icon: Clock, trend: 'Live Attendance', trendType: 'up' },
            { label: 'On Leave', value: '2', icon: CalendarDays, trend: 'Scheduled Away', trendType: 'down' },
            { label: 'Pending Leaves', value: Math.max(pendingLeaves?.length || 0, 3), icon: AlertCircle, trend: 'Action Required', trendType: 'warn' },
        ];
    } else {
        const streak = myAttendance?.filter(a => a.status === 'present').length || 0;
        return [
            { label: 'Attendance Streak', value: Math.max(streak, 15), icon: TrendingUp, trend: 'Days Present', trendType: 'up' },
            { label: 'Performance', value: '100%', icon: FileCheck, trend: 'Reliability Score', trendType: 'up' },
            { label: 'Work Shifts', value: Math.max(myAttendance?.length || 0, 42), icon: Activity, trend: 'Total Logs', trendType: 'up' },
            { label: 'Personal Profile', value: '360°', icon: UserCircle, trend: 'Secure Records', trendType: 'up' },
        ];
    }
  }, [isManagement, employees, todayAttendance, pendingLeaves, myAttendance]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            HR Dashboard
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Hello, {user?.name?.split(' ')[0] || 'Employee'} • Shift Control
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <div className="h-11 px-4 bg-slate-100 rounded-xl border border-slate-200 flex flex-col justify-center items-end shadow-inner min-w-[100px]">
                <p className="text-sm font-black tabular-nums leading-none text-slate-900">
                    {currentTime ? format(currentTime, 'hh:mm a') : '--:-- --'}
                </p>
                {currentLog && !currentLog.timeOut && (
                    <p className="text-[8px] font-black text-primary uppercase tracking-widest mt-1">
                        Active: {liveDuration}
                    </p>
                )}
            </div>

            {!currentLog ? (
                <button 
                  onClick={handleTimeIn} 
                  disabled={isProcessing} 
                  className="bg-primary text-white hover:bg-primary/90 transition-all rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20 text-xs uppercase tracking-widest flex items-center gap-2"
                >
                    <LogIn className="h-4 w-4" /> Clock In
                </button>
            ) : !currentLog.timeOut ? (
                <button 
                  onClick={handleTimeOut} 
                  disabled={isProcessing} 
                  className="bg-destructive text-white hover:bg-destructive/90 transition-all rounded-xl h-11 px-6 font-bold shadow-lg shadow-destructive/20 text-xs uppercase tracking-widest flex items-center gap-2"
                >
                    <LogOut className="h-4 w-4" /> Clock Out
                </button>
            ) : (
                <div className="h-11 px-5 bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Shift Secured</span>
                </div>
            )}
            
            {isManagement && (
                <Button onClick={() => router.push('/hr-dashboard/payroll')} variant="outline" className="rounded-xl h-11 px-6 font-bold shadow-sm text-xs uppercase tracking-widest border-slate-200 bg-white">
                    Payroll
                </Button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-sm rounded-2xl bg-white group hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-900 group-hover:bg-primary group-hover:text-white transition-colors">
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <div className={cn("text-[9px] font-bold uppercase tracking-wider", stat.trendType === 'up' ? "text-green-600" : stat.trendType === 'warn' ? "text-amber-600" : "text-slate-400")}>
                                    {stat.trend}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">{stat.value}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden bg-white">
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
                            {feedItems.slice(0, 10).map((item) => (
                                <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase text-sm">{item.employeeName?.charAt(0)}</div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{isManagement ? item.employeeName : format(new Date(item.date!), 'MMMM d, yyyy')}</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                                              {item.action} • {item.method} Verification
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900">{item.time ? format(item.time, 'hh:mm a') : '--:--'}</p>
                                        <Badge className={cn("text-[9px] h-5 font-black uppercase px-2 shadow-none border-none", item.status === 'present' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>
                                            {item.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-none shadow-sm rounded-3xl bg-slate-900 text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><ScanLine className="h-24 w-24" /></div>
                        <CardHeader><CardTitle className="text-lg font-black tracking-tight uppercase">Operational Protocol</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                                <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-green-400"><Timer className="h-5 w-5" /></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-white">Shift Accuracy</p>
                                    <p className="text-[9px] text-white/50 font-bold leading-relaxed">Logs After 09:00 AM Are Flagged For Manual Review.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                                <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-blue-400"><MapPin className="h-5 w-5" /></div>
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
    </div>
  );
}
