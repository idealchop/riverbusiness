
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  CalendarDays, 
  Activity,
  LogOut,
  LogIn,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Megaphone,
  Plus,
  Info,
  Calendar as CalendarIcon,
  Search,
  Bell,
  Send
} from 'lucide-react';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { HRAttendanceLog } from '@/lib/types';
import { Calendar } from '@/components/ui/calendar';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

function subHours(date: Date, hours: number) {
    const result = new Date(date);
    result.setHours(result.getHours() - hours);
    return result;
}

// Philippine Holidays 2024/2025 Mock Data
const PHILIPPINE_HOLIDAYS = [
    { date: new Date(2024, 0, 1), name: "New Year's Day" },
    { date: new Date(2024, 1, 9), name: "Chinese New Year" },
    { date: new Date(2024, 2, 28), name: "Maundy Thursday" },
    { date: new Date(2024, 2, 29), name: "Good Friday" },
    { date: new Date(2024, 3, 9), name: "Araw ng Kagitingan" },
    { date: new Date(2024, 4, 1), name: "Labor Day" },
    { date: new Date(2024, 5, 12), name: "Independence Day" },
    { date: new Date(2024, 7, 21), name: "Ninoy Aquino Day" },
    { date: new Date(2024, 7, 26), name: "National Heroes Day" },
    { date: new Date(2024, 10, 1), name: "All Saints' Day" },
    { date: new Date(2024, 11, 25), name: "Christmas Day" },
    { date: new Date(2024, 11, 30), name: "Rizal Day" },
    // 2025
    { date: new Date(2025, 0, 1), name: "New Year's Day" },
    { date: new Date(2025, 4, 1), name: "Labor Day" },
    { date: new Date(2025, 5, 12), name: "Independence Day" },
];

// Mock Leave Data for Visual Highlighting
const MOCK_LEAVES = [
    new Date(2024, 4, 15),
    new Date(2024, 4, 16),
    new Date(2024, 4, 22),
];

// Demo data for activity feed
const DEMO_FEED = [
    { id: 'd1', employeeName: 'Marcus Rivera', action: 'Clock In', time: subHours(new Date(), 2), status: 'present', method: 'QR' },
    { id: 'd2', employeeName: 'Sarah Jenkins', action: 'Clock In', time: subHours(new Date(), 1.5), status: 'present', method: 'QR' },
    { id: 'd3', employeeName: 'Leo Castelo', action: 'Clock In', time: subHours(new Date(), 1.2), status: 'late', method: 'Manual' },
    { id: 'd4', employeeName: 'Elena Cruz', action: 'Clock Out', time: subHours(new Date(), 0.5), status: 'present', method: 'QR' },
];

export default function HRDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [liveDuration, setLiveDuration] = useState<string>('00:00:00');
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const companyId = user?.companyId || user?.clientId || 'default';
  const today = format(new Date(), 'yyyy-MM-dd');

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

  const handlePostAnnouncement = () => {
      if (!announcementText.trim()) return;
      toast({ title: 'Broadcast Sent', description: 'Your announcement is now live for all team members.' });
      setAnnouncementText('');
  };

  // --- Dashboard Data Queries ---
  const employeesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'users'), where('companyId', '==', companyId)) : null,
    [firestore, companyId]
  );
  const { data: employees } = useCollection(employeesQuery);

  const leavesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'hr_companies', companyId, 'leaveRequests'), where('status', '==', 'pending')) : null,
    [firestore, companyId]
  );
  const { data: pendingLeaves } = useCollection(leavesQuery);
  
  const companyAttendanceQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'hr_companies', companyId, 'attendance'), where('date', '==', today)) : null,
    [firestore, companyId, today]
  );
  const { data: todayAttendance } = useCollection<HRAttendanceLog>(companyAttendanceQuery);

  const feedItems = useMemo(() => {
    const items: any[] = [];
    if (todayAttendance && todayAttendance.length > 0) {
        todayAttendance.forEach(log => {
            if (log.timeOut) {
                items.push({ id: `${log.id}-out`, employeeName: log.employeeName, action: 'Clock Out', time: toSafeDate(log.timeOut), status: log.status, method: log.method, date: log.date });
            }
            if (log.timeIn) {
                items.push({ id: `${log.id}-in`, employeeName: log.employeeName, action: 'Clock In', time: toSafeDate(log.timeIn), status: log.status, method: log.method, date: log.date });
            }
        });
    } else {
        return DEMO_FEED;
    }
    return items.sort((a, b) => (b.time?.getTime() || 0) - (a.time?.getTime() || 0));
  }, [todayAttendance]);

  const stats = useMemo(() => {
    const empCount = employees && employees.length > 0 ? employees.length : 12;
    const attCount = todayAttendance && todayAttendance.length > 0 ? todayAttendance.length : 8;
    const leaveCount = pendingLeaves && pendingLeaves.length > 0 ? pendingLeaves.length : 3;

    return [
        { label: 'Workforce', value: empCount, icon: Users, trend: 'Managed Staff', trendType: 'up' },
        { label: 'Present Today', value: attCount, icon: Clock, trend: 'Live Attendance', trendType: 'up' },
        { label: 'Pending Leaves', value: leaveCount, icon: AlertCircle, trend: 'Action Required', trendType: 'warn' },
        { label: 'Work Shifts', value: attCount, icon: Activity, trend: 'Total Logs Today', trendType: 'up' },
    ];
  }, [employees, todayAttendance, pendingLeaves]);

  const heroImage = PlaceHolderImages.find(p => p.id === 'hr-hero-banner');

  // Calendar modifiers for holiday and leave support
  const modifiers = {
    holiday: (date: Date) => PHILIPPINE_HOLIDAYS.some(h => isSameDay(h.date, date)),
    leave: (date: Date) => MOCK_LEAVES.some(l => isSameDay(l, date)),
  };

  const modifiersStyles = {
    holiday: { color: 'white', backgroundColor: '#ef4444' }, // Red for holidays
    leave: { color: 'white', backgroundColor: 'hsl(var(--primary))' }, // Blue for leaves
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            HR Dashboard
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Hello, {user?.name?.split(' ')[0] || 'Employee'} • Universal Access Active
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <div className="h-11 px-4 bg-slate-100 rounded-xl border border-slate-200 flex flex-col justify-center items-end shadow-none min-w-[100px]">
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
                  className="bg-primary text-white hover:bg-primary/90 transition-all rounded-xl h-11 px-6 font-bold shadow-none text-xs uppercase tracking-widest flex items-center gap-2"
                >
                    <LogIn className="h-4 w-4" /> Clock In
                </button>
            ) : !currentLog.timeOut ? (
                <button 
                  onClick={handleTimeOut} 
                  disabled={isProcessing} 
                  className="bg-destructive text-white hover:bg-destructive/90 transition-all rounded-xl h-11 px-6 font-bold shadow-none text-xs uppercase tracking-widest flex items-center gap-2"
                >
                    <LogOut className="h-4 w-4" /> Clock Out
                </button>
            ) : (
                <div className="h-11 px-5 bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Shift Secured</span>
                </div>
            )}
            
            <Button onClick={() => router.push('/hr-dashboard/payroll')} variant="outline" className="rounded-xl h-11 px-6 font-bold shadow-none text-xs uppercase tracking-widest border-slate-200 bg-white">
                Payroll
            </Button>
        </div>
      </div>

      <div className="space-y-8">
            <Card className="border-none shadow-none rounded-[2.5rem] overflow-hidden bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-10 h-full min-h-[380px]">
                    <div className="lg:col-span-6 relative h-64 lg:h-auto overflow-hidden bg-slate-50 flex items-center justify-center p-8">
                        {heroImage && (
                            <Image 
                                src={heroImage.imageUrl} 
                                alt={heroImage.description} 
                                fill 
                                className="object-contain p-12 transition-transform duration-[20s] hover:scale-105"
                                data-ai-hint={heroImage.imageHint}
                            />
                        )}
                        <div className="absolute bottom-10 left-10 text-slate-900 z-10 space-y-2">
                            <h2 className="text-6xl font-black tracking-tighter text-slate-900">
                                Team Workforce
                            </h2>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">
                                Unified workforce and operational monitoring.
                            </p>
                        </div>
                    </div>
                    <div className="lg:col-span-4 p-8 flex flex-col justify-center bg-slate-50/50 border-l border-slate-100">
                        <div className="space-y-6 w-full max-sm mx-auto">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Company Calendar</h3>
                                    <p className="text-lg font-black text-slate-900 leading-tight">
                                        {format(new Date(), 'MMMM yyyy')}
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-2xl bg-white shadow-none border border-slate-100 flex items-center justify-center">
                                    <CalendarDays className="h-5 w-5 text-primary" />
                                </div>
                            </div>
                            
                            <div className="bg-white p-4 rounded-[2rem] shadow-none border border-slate-100 flex justify-center overflow-hidden">
                                <Calendar
                                    mode="single"
                                    selected={new Date()}
                                    modifiers={modifiers}
                                    modifiersStyles={modifiersStyles}
                                    className="w-fit rounded-[1.5rem] border-none p-0"
                                    classNames={{
                                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 justify-center",
                                        day_selected: "bg-primary text-white hover:bg-primary/90 rounded-xl font-black",
                                        day_today: "bg-blue-50 text-primary font-black rounded-xl border border-blue-100",
                                        day: "h-9 w-9 p-0 font-bold text-[11px] uppercase rounded-xl hover:bg-slate-50 transition-all",
                                        head_cell: "text-slate-300 font-black uppercase text-[9px] tracking-widest pb-3",
                                        caption_label: "hidden",
                                        nav: "hidden" 
                                    }}
                                />
                            </div>
                            
                            <div className="pt-2">
                                <Button 
                                    onClick={() => setIsScheduleDialogOpen(true)}
                                    variant="ghost" 
                                    className="w-full justify-between rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:text-primary transition-all"
                                >
                                    Company Schedule <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {stats.map((stat, idx) => (
                            <Card key={idx} className="border-none shadow-none rounded-3xl bg-white group hover:shadow-none transition-all active:scale-[0.99]">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-2xl bg-slate-50 text-slate-900 group-hover:bg-primary group-hover:text-white transition-all">
                                            <stat.icon className="h-6 w-6" />
                                        </div>
                                        <div className={cn("text-[10px] font-black uppercase tracking-widest", stat.trendType === 'up' ? "text-green-600" : stat.trendType === 'warn' ? "text-amber-600" : "text-slate-400")}>
                                            {stat.trend}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">{stat.value}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <Card className="h-full border-none shadow-none rounded-3xl bg-slate-900 text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                             <CheckCircle2 className="h-24 w-24" />
                        </div>
                        <CardHeader className="p-8">
                            <CardTitle className="text-lg font-bold tracking-tight">Focus: Today</CardTitle>
                            <CardDescription className="text-white/50 font-medium">{format(new Date(), 'EEEE, MMMM do')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-4 relative z-10">
                            <p className="text-sm font-medium text-white/80 leading-relaxed italic">
                                "Efficiency is doing things right; effectiveness is doing the right things."
                            </p>
                            <div className="pt-4 border-t border-white/10">
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">River Workforce Management</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="border-none shadow-none rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/30 p-8 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">Recent Activity Feed</CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Real-Time Operational Summary</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-50">
                        {feedItems.length > 0 ? feedItems.slice(0, 10).map((item) => (
                            <div key={item.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-5">
                                    <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase text-lg shadow-inner">{item.employeeName?.charAt(0)}</div>
                                    <div>
                                        <p className="text-base font-bold text-slate-900">{item.employeeName}</p>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                                          {item.action} • {item.method} Verification
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-sm font-black text-slate-900">{item.time ? format(item.time, 'hh:mm a') : '--:--'}</p>
                                    <Badge className={cn("text-[9px] h-5 font-black uppercase px-3 shadow-none border-none", item.status === 'present' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>
                                        {item.status}
                                    </Badge>
                                </div>
                            </div>
                        )) : (
                            <div className="py-24 text-center flex flex-col items-center gap-4 opacity-30">
                                <Activity className="h-12 w-12 text-slate-300" />
                                <p className="text-xs font-black uppercase tracking-[0.3em]">Feed is quiet today</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
      </div>

      {/* Company Schedule Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-4xl rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden bg-white">
            <div className="grid grid-cols-1 md:grid-cols-12 h-full min-h-[600px]">
                {/* Left: Administrative Control Panel */}
                <div className="md:col-span-4 bg-slate-900 text-white p-8 space-y-10">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-white/10">
                                <Megaphone className="h-5 w-5 text-primary-light" />
                            </div>
                            <h3 className="text-lg font-black tracking-tight">Command Center</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">New Announcement</Label>
                                <Textarea 
                                    placeholder="Type important updates here..."
                                    value={announcementText}
                                    onChange={(e) => setAnnouncementText(e.target.value)}
                                    className="bg-white/5 border-white/10 rounded-2xl min-h-[120px] focus:ring-primary text-sm font-medium resize-none shadow-inner"
                                />
                            </div>
                            <Button 
                                onClick={handlePostAnnouncement}
                                disabled={!announcementText.trim()}
                                className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                            >
                                <Send className="mr-2 h-3.5 w-3.5" /> Broadcast to Team
                            </Button>
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Upcoming Holidays (PH)</h4>
                        <div className="space-y-4">
                            {PHILIPPINE_HOLIDAYS.filter(h => h.date >= new Date()).slice(0, 3).map((h, i) => (
                                <div key={i} className="flex items-start gap-4 group">
                                    <div className="h-10 w-10 rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-white/10 shrink-0 group-hover:bg-primary/20 transition-colors">
                                        <span className="text-[8px] font-black uppercase opacity-60">{format(h.date, 'MMM')}</span>
                                        <span className="text-sm font-black">{format(h.date, 'd')}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-white/90">{h.name}</p>
                                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Public Holiday</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full justify-between rounded-xl h-10 px-4 text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 hover:text-white transition-all">
                            Full Holiday List <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Right: Interactive Calendar & Timeline */}
                <div className="md:col-span-8 bg-slate-50/50 flex flex-col h-full">
                    <Tabs defaultValue="calendar" className="flex-1 flex flex-col h-full">
                        <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-100 bg-white">
                            <TabsList className="bg-slate-100 p-1 rounded-xl h-10 border shadow-inner">
                                <TabsTrigger value="calendar" className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest">Calendar View</TabsTrigger>
                                <TabsTrigger value="schedule" className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest">Team Availability</TabsTrigger>
                            </TabsList>
                            <DialogClose asChild>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 h-9 w-9">
                                    <ChevronRight className="h-5 w-5 text-slate-400 rotate-90" />
                                </Button>
                            </DialogClose>
                        </div>

                        <ScrollArea className="flex-1">
                            <TabsContent value="calendar" className="p-8 mt-0 focus-visible:ring-0">
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
                                    <Card className="border-none shadow-none rounded-[2rem] bg-white p-8">
                                        <div className="flex justify-center">
                                            <Calendar
                                                mode="single"
                                                selected={new Date()}
                                                modifiers={modifiers}
                                                modifiersStyles={modifiersStyles}
                                                className="w-full scale-110"
                                                classNames={{
                                                    months: "flex flex-col space-y-4",
                                                    month: "space-y-6",
                                                    caption: "flex justify-center pt-1 relative items-center mb-4",
                                                    caption_label: "text-lg font-black uppercase tracking-widest text-slate-900",
                                                    head_cell: "text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] pb-6 w-12",
                                                    day: "h-12 w-12 p-0 font-bold text-xs uppercase rounded-2xl hover:bg-slate-50 transition-all m-0.5",
                                                    day_selected: "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20",
                                                    day_today: "bg-blue-50 text-primary border border-blue-100",
                                                    nav: "hidden"
                                                }}
                                            />
                                        </div>
                                    </Card>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 rounded-2xl bg-white border border-slate-100 flex items-center gap-4">
                                            <div className="h-3 w-3 rounded-full bg-red-500" />
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legend</p>
                                                <p className="text-xs font-bold text-slate-900">National Holidays</p>
                                            </div>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-white border border-slate-100 flex items-center gap-4">
                                            <div className="h-3 w-3 rounded-full bg-primary" />
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legend</p>
                                                <p className="text-xs font-bold text-slate-900">Approved Leaves</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="schedule" className="p-8 mt-0 focus-visible:ring-0">
                                <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-500">
                                    <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-30">
                                        <Activity className="h-12 w-12 text-slate-300" />
                                        <p className="text-xs font-black uppercase tracking-[0.3em]">Timeline View Initializing</p>
                                    </div>
                                </div>
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
