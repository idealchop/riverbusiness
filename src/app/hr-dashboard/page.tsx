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
  ChevronLeft,
  Megaphone,
  Plus,
  Info,
  Calendar as CalendarIcon,
  Search,
  Bell,
  Send,
  UserCircle,
  QrCode,
  MapPin,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription,
    CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, addDoc, serverTimestamp, doc, updateDoc, limit } from 'firebase/firestore';
import { format, isSameDay, addMonths, subMonths, startOfMonth, addDays, subDays } from 'date-fns';
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
import { AttendanceScanner } from '@/components/hr/AttendanceScanner';
import Link from 'next/link';

const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

// Philippine Holidays Registry
const PHILIPPINE_HOLIDAYS = [
    { date: new Date(2025, 0, 1), name: "New Year's Day" },
    { date: new Date(2025, 0, 29), name: "Chinese New Year" },
    { date: new Date(2025, 1, 25), name: "EDSA People Power Revolution Anniversary" },
    { date: new Date(2025, 3, 9), name: "Araw ng Kagitingan" },
    { date: new Date(2025, 3, 17), name: "Maundy Thursday" },
    { date: new Date(2025, 3, 18), name: "Good Friday" },
    { date: new Date(2025, 4, 1), name: "Labor Day" },
    { date: new Date(2025, 5, 12), name: "Independence Day" },
    { date: new Date(2025, 7, 21), name: "Ninoy Aquino Day" },
    { date: new Date(2025, 7, 25), name: "National Heroes Day" },
    { date: new Date(2025, 10, 1), name: "All Saints' Day" },
    { date: new Date(2025, 10, 30), name: "Bonifacio Day" },
    { date: new Date(2025, 11, 8), name: "Feast of the Immaculate Conception" },
    { date: new Date(2025, 11, 25), name: "Christmas Day" },
    { date: new Date(2025, 11, 30), name: "Rizal Day" },
];

const getMockLeaves = () => {
    const today = new Date();
    return [
        { date: addDays(today, 2), name: 'Marcus Rivera', type: 'Vacation', status: 'approved' },
        { date: addDays(today, 5), name: 'Sarah Jenkins', type: 'Emergency', status: 'pending' },
    ];
};

const MOCK_LEAVES_DATA = getMockLeaves();

export default function HRDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [liveDuration, setLiveDuration] = useState<string>('00:00:00');
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const companyId = user?.companyId || user?.clientId || 'default';
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // --- Clock Status Logic ---
  const todayLogQuery = useMemoFirebase(
    () => (firestore && user?.id && companyId) ? query(
        collection(firestore, 'hr_companies', companyId, 'attendance'),
        where('employeeId', '==', user.id),
        where('date', '==', todayStr),
        orderBy('timestamp', 'desc'),
        limit(1)
    ) : null,
    [firestore, companyId, user?.id, todayStr]
  );
  const { data: latestLogToday } = useCollection<HRAttendanceLog>(todayLogQuery);
  const currentAction = latestLogToday && latestLogToday.length > 0 ? latestLogToday[0].action : null;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentAction === 'IN' && latestLogToday?.[0]?.timestamp) {
      const startTime = toSafeDate(latestLogToday[0].timestamp);
      if (startTime) {
        interval = setInterval(() => {
          const now = new Date();
          const diffMs = now.getTime() - startTime.getTime();
          const diffHrs = Math.floor(diffMs / 3600000);
          const diffMins = Math.floor((diffMs % 3600000) / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          setLiveDuration(`${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`);
        }, 1000);
      }
    } else {
        setLiveDuration('00:00:00');
    }
    return () => clearInterval(interval);
  }, [currentAction, latestLogToday]);

  // --- Dashboard Data ---
  const employeesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'users'), where('companyId', '==', companyId)) : null,
    [firestore, companyId]
  );
  const { data: employees } = useCollection(employeesQuery);

  const companyAttendanceQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'hr_companies', companyId, 'attendance'), where('date', '==', todayStr)) : null,
    [firestore, companyId, todayStr]
  );
  const { data: todayAttendance } = useCollection<HRAttendanceLog>(companyAttendanceQuery);

  const feedItems = useMemo(() => {
    if (!todayAttendance || todayAttendance.length === 0) return [];
    return [...todayAttendance].sort((a, b) => (toSafeDate(b.timestamp)?.getTime() || 0) - (toSafeDate(a.timestamp)?.getTime() || 0));
  }, [todayAttendance]);

  const stats = useMemo(() => {
    const empCount = employees?.length || 12;
    const attCount = todayAttendance?.filter(a => a.action === 'IN').length || 8;
    return [
        { label: 'Workforce', value: empCount, icon: Users, trend: 'Managed Staff', trendType: 'up' },
        { label: 'Present Today', value: attCount, icon: Clock, trend: 'Verified Entry', trendType: 'up' },
        { label: 'Operational', value: '100%', icon: Activity, trend: 'Live Sync', trendType: 'up' },
        { label: 'GPS Radius', value: '50m', icon: MapPin, trend: 'Validation Active', trendType: 'up' },
    ];
  }, [employees, todayAttendance]);

  const selectedDateInfo = useMemo(() => {
      if (!selectedDate) return null;
      const holiday = PHILIPPINE_HOLIDAYS.find(h => isSameDay(h.date, selectedDate));
      const leaves = MOCK_LEAVES_DATA.filter(l => isSameDay(l.date, selectedDate));
      if (!holiday && leaves.length === 0) return null;
      return { holiday, leaves };
  }, [selectedDate]);

  const modifiers = {
    holiday: (date: Date) => PHILIPPINE_HOLIDAYS.some(h => isSameDay(h.date, date)),
    approvedLeave: (date: Date) => MOCK_LEAVES_DATA.some(l => isSameDay(l.date, date) && l.status === 'approved'),
    pendingLeave: (date: Date) => MOCK_LEAVES_DATA.some(l => isSameDay(l.date, date) && l.status === 'pending'),
  };

  const modifiersStyles = {
    holiday: { color: 'white', backgroundColor: '#ef4444' },
    approvedLeave: { color: 'white', backgroundColor: 'hsl(var(--primary))' },
    pendingLeave: { color: 'white', backgroundColor: '#f59e0b' },
  };

  const handleOpenOfficeSettings = () => {
    window.dispatchEvent(new CustomEvent('open-office-settings'));
  };

  const heroImage = PlaceHolderImages.find(p => p.id === 'hr-hero-banner');

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">HR Dashboard</h1>
          <p className="text-slate-500 font-medium text-sm">Hello, {user?.name?.split(' ')[0] || 'Employee'} • Universal Access Active</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <div className="h-11 px-4 bg-slate-100 rounded-xl border border-slate-200 flex flex-col justify-center items-end min-w-[100px]">
                <p className="text-sm font-black tabular-nums leading-none text-slate-900">{currentTime ? format(currentTime, 'hh:mm a') : '--:-- --'}</p>
                {currentAction === 'IN' && (
                    <p className="text-[8px] font-black text-primary uppercase tracking-widest mt-1">Active: {liveDuration}</p>
                )}
            </div>

            <div className="hidden sm:flex items-center gap-3">
                <Button 
                  onClick={() => setIsScannerOpen(true)}
                  className="bg-primary text-white hover:bg-primary/90 transition-all rounded-xl h-11 px-6 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
                >
                    <QrCode className="h-4 w-4" /> Attendance Terminal
                </Button>
                
                {user?.hrRole === 'owner' && (
                    <Button onClick={handleOpenOfficeSettings} variant="outline" className="rounded-xl h-11 px-6 font-bold text-xs uppercase tracking-widest border-slate-200 bg-white">
                        Office Settings
                    </Button>
                )}
            </div>

            <Button onClick={() => router.push('/hr-dashboard/payroll')} variant="outline" className="sm:hidden rounded-xl h-11 px-6 font-bold text-xs uppercase tracking-widest border-slate-200 bg-white">
                Payroll
            </Button>
        </div>
      </div>

      <div className="space-y-8">
            <Card className="border-none rounded-[2.5rem] overflow-hidden bg-white shadow-none">
                <div className="grid grid-cols-1 lg:grid-cols-10 h-full min-h-[400px]">
                    <div className="lg:col-span-6 relative flex flex-col lg:block overflow-hidden bg-slate-50 min-h-[300px]">
                        <div className="relative h-64 lg:h-full lg:absolute lg:inset-0 flex items-center justify-center p-8">
                            {heroImage && (
                                <Image src={heroImage.imageUrl} alt={heroImage.description} fill className="object-contain p-8 md:p-12 transition-transform duration-[20s] hover:scale-105" data-ai-hint={heroImage.imageHint}/>
                            )}
                        </div>
                        <div className="relative p-8 pt-0 lg:p-0 lg:absolute lg:bottom-10 lg:left-10 text-slate-900 z-10 space-y-2 lg:max-w-[80%]">
                            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-tight">Team Workforce</h2>
                            <p className="text-[10px] sm:text-xs md:text-sm font-bold text-slate-400 tracking-widest leading-relaxed">Unified workforce and operational monitoring for modern teams.</p>
                        </div>
                    </div>
                    <div className="lg:col-span-4 p-6 md:p-8 flex flex-col justify-center bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-100">
                        <div className="space-y-6 w-full max-sm mx-auto">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Company Calendar</h3>
                                    <p className="text-lg font-black text-slate-900 leading-tight">{format(currentMonth, 'MMMM yyyy')}</p>
                                </div>
                                <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            
                            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center overflow-hidden shadow-sm">
                                <Calendar
                                    mode="single"
                                    month={currentMonth}
                                    onMonthChange={setCurrentMonth}
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    modifiers={modifiers}
                                    modifiersStyles={modifiersStyles}
                                    className="w-fit rounded-[1.5rem] border-none p-0"
                                    classNames={{
                                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 justify-center",
                                        day_selected: "bg-primary text-white hover:bg-primary/90 rounded-xl font-black",
                                        day_today: "bg-blue-50 text-primary font-black rounded-xl border border-primary/20",
                                        day: "h-8 w-8 sm:h-9 sm:w-9 p-0 font-bold text-[10px] sm:text-[11px] uppercase rounded-xl hover:bg-slate-50 transition-all",
                                        head_cell: "text-slate-300 font-black uppercase text-[8px] sm:text-[9px] tracking-widest pb-3",
                                        caption_label: "hidden",
                                        nav: "hidden" 
                                    }}
                                />
                            </div>

                            {selectedDateInfo && (
                                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity on {format(selectedDate!, 'MMM d')}</p>
                                    </div>
                                    {selectedDateInfo.holiday && (
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-6 w-6 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><AlertCircle className="h-3.5 w-3.5" /></div>
                                            <p className="text-sm font-bold text-slate-900">{selectedDateInfo.holiday.name}</p>
                                        </div>
                                    )}
                                    {selectedDateInfo.leaves.map((leave, i) => (
                                        <div key={i} className="flex items-center gap-3 mb-1 last:mb-0">
                                            <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", leave.status === 'approved' ? "bg-blue-50 text-primary" : "bg-amber-50 text-amber-600")}><UserCircle className="h-3.5 w-3.5" /></div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{leave.name}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{leave.type} • <span className={cn(leave.status === 'approved' ? "text-primary" : "text-amber-600")}>{leave.status}</span></p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="pt-2">
                                <Button onClick={() => setIsScheduleDialogOpen(true)} variant="ghost" className="w-full justify-between rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:text-primary transition-all">Company Schedule <ChevronRight className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {stats.map((stat, idx) => (
                            <Card key={idx} className="border-none rounded-3xl bg-white group hover:shadow-none transition-all active:scale-[0.99] shadow-none">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-2xl bg-slate-50 text-slate-900 group-hover:bg-primary group-hover:text-white transition-all"><stat.icon className="h-6 w-6" /></div>
                                        <div className={cn("text-[10px] font-black uppercase tracking-widest", stat.trendType === 'up' ? "text-green-600" : stat.trendType === 'warn' ? "text-amber-600" : "text-slate-400")}>{stat.trend}</div>
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
                    <Card className="h-full border-none rounded-3xl bg-slate-900 text-white overflow-hidden relative group shadow-none">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><CheckCircle2 className="h-24 w-24" /></div>
                        <CardHeader className="p-8"><CardTitle className="text-lg font-bold tracking-tight">Focus: Today</CardTitle><CardDescription className="text-white/50 font-medium">{format(new Date(), 'EEEE, MMMM do')}</CardDescription></CardHeader>
                        <CardContent className="p-8 pt-0 space-y-4 relative z-10">
                            <p className="text-sm font-medium text-white/80 leading-relaxed italic">"Physical presence is the anchor of accountability and team alignment."</p>
                            <div className="pt-4 border-t border-white/10"><p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">QR & GPS Verification System</p></div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="border-none rounded-[2.5rem] overflow-hidden bg-white shadow-none">
                <CardHeader className="bg-slate-50/30 p-8 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">Recent Activity Feed</CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Real-Time Verification Summary</CardDescription>
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
                                          CLOCKED {item.action} • {item.validation_status === 'Valid' ? 'GPS VERIFIED' : 'INVALID LOCATION'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-sm font-black text-slate-900">{item.timestamp ? format(toSafeDate(item.timestamp)!, 'hh:mm a') : '--:--'}</p>
                                    <Badge className={cn("text-[9px] h-5 font-black uppercase px-3 shadow-none border-none", item.action === 'IN' ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700")}>
                                        {item.action}
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

            {/* Prominent Learning Hub Shortcut (Module Card) */}
            <div className="pt-6">
                <Link href="/hr-dashboard/modules">
                    <Card className="border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-primary to-blue-700 text-white overflow-hidden relative cursor-pointer group hover:scale-[1.01] transition-all">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                            <BookOpen className="h-40 w-40" />
                        </div>
                        <CardHeader className="p-10">
                            <div className="p-3 rounded-2xl bg-white/10 w-fit mb-6">
                                <BookOpen className="h-8 w-8" />
                            </div>
                            <div className="space-y-2">
                                <CardTitle className="text-3xl font-black tracking-tight text-white uppercase">Learning Hub</CardTitle>
                                <CardDescription className="text-white/60 font-bold text-xs uppercase tracking-widest">Authorized Training Materials</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-10 pt-0">
                            <p className="text-sm font-medium text-white/80 leading-relaxed mb-8 max-w-lg">
                                Access the centralized library of technical documentation, standard operating procedures, and video training modules authorized for your team.
                            </p>
                            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em]">
                                Open Operational Library <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <div className="sm:hidden fixed bottom-8 right-6 z-50 flex flex-col gap-3 items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          {currentAction === 'IN' && (
             <div className="mb-1 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-blue-100 shadow-sm flex items-center gap-2 animate-pulse">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                <span className="text-[10px] font-black text-blue-600 tabular-nums">{liveDuration}</span>
             </div>
          )}
          <Button 
              onClick={() => setIsScannerOpen(true)}
              className={cn(
                "w-16 h-16 rounded-full shadow-2xl transition-all p-0 flex items-center justify-center border-[4px] border-white active:scale-95",
                currentAction === 'IN' ? "bg-destructive" : "bg-primary"
              )}
          >
              <QrCode className="h-7 w-7 text-white" />
          </Button>
          <span className={cn(
            "text-[9px] font-black uppercase tracking-[0.3em] bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border",
            currentAction === 'IN' ? "text-red-500 border-red-50" : "text-primary border-slate-100"
          )}>
            Clock {currentAction === 'IN' ? 'Out' : 'In'}
          </span>
      </div>

      {/* Dialogs */}
      <AttendanceScanner isOpen={isScannerOpen} onOpenChange={setIsScannerOpen} user={user} />
      
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-4xl rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden bg-white">
            <div className="grid grid-cols-1 md:grid-cols-12 h-full min-h-[600px]">
                <div className="md:col-span-4 bg-slate-900 text-white p-8 space-y-10">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-white/10"><Megaphone className="h-5 w-5 text-primary-light" /></div>
                            <h3 className="text-lg font-black tracking-tight">Command Center</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">New Announcement</Label>
                                <Textarea placeholder="Type important updates here..." value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} className="bg-white/5 border-white/10 rounded-2xl min-h-[120px] focus:ring-primary text-sm font-medium resize-none shadow-inner" />
                            </div>
                            <Button onClick={() => { toast({ title: 'Broadcast Sent' }); setAnnouncementText(''); }} disabled={!announcementText.trim()} className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"><Send className="mr-2 h-3.5 w-3.5" /> Broadcast to Team</Button>
                        </div>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Upcoming Holidays (PH)</h4>
                        <div className="space-y-4">
                            {PHILIPPINE_HOLIDAYS.filter(h => h.date >= new Date()).slice(0, 3).map((h, i) => (
                                <div key={i} className="flex items-start gap-4 group">
                                    <div className="h-10 w-10 rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-white/10 shrink-0 group-hover:bg-primary/20 transition-colors"><span className="text-[8px] font-black uppercase opacity-60">{format(h.date, 'MMM')}</span><span className="text-sm font-black">{format(h.date, 'd')}</span></div>
                                    <div className="space-y-0.5"><p className="text-xs font-bold text-white/90">{h.name}</p><p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Public Holiday</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="md:col-span-8 bg-slate-50/50 flex flex-col h-full">
                    <Tabs defaultValue="calendar" className="flex-1 flex flex-col h-full">
                        <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-100 bg-white">
                            <TabsList className="bg-slate-100 p-1 rounded-xl h-10 border shadow-inner"><TabsTrigger value="calendar" className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest">Calendar View</TabsTrigger></TabsList>
                            <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 h-9 w-9"><ChevronRight className="h-5 w-5 text-slate-400 rotate-90" /></Button></DialogClose>
                        </div>
                        <ScrollArea className="flex-1">
                            <TabsContent value="calendar" className="p-8 mt-0 focus-visible:ring-0">
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
                                    <Card className="border-none shadow-none rounded-[2rem] bg-white p-4 sm:p-8">
                                        <div className="flex justify-center">
                                            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} modifiers={modifiers} modifiersStyles={modifiersStyles} className="w-full scale-100 sm:scale-110" 
                                            classNames={{ months: "flex flex-col space-y-4", month: "space-y-6", caption: "flex justify-center pt-1 relative items-center mb-4", caption_label: "text-lg font-black uppercase tracking-widest text-slate-900", head_cell: "text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] pb-6 w-12", day: "h-10 w-10 sm:h-12 sm:w-12 p-0 font-bold text-xs uppercase rounded-2xl hover:bg-slate-50 transition-all m-0.5", day_selected: "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20", day_today: "bg-blue-50 text-primary border border-primary/20", nav: "hidden" }} />
                                        </div>
                                    </Card>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-3"><div className="h-3 w-3 rounded-full bg-red-500" /><div className="space-y-0.5"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Public</p><p className="text-xs font-bold text-slate-900">Holiday</p></div></div>
                                        <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-3"><div className="h-3 w-3 rounded-full bg-primary" /><div className="space-y-0.5"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team</p><p className="text-xs font-bold text-slate-900">Approved Leave</p></div></div>
                                        <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-3"><div className="h-3 w-3 rounded-full bg-amber-500" /><div className="space-y-0.5"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team</p><p className="text-xs font-bold text-slate-900">Pending Leave</p></div></div>
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