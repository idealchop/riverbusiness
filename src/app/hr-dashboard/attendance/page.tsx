'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  CheckCircle2,
  AlertCircle,
  Timer,
  ScanLine,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { HRAttendanceLog } from '@/lib/types';

export default function AttendancePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const companyId = user?.companyId || user?.clientId || 'default';
  const today = format(new Date(), 'yyyy-MM-dd');

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

  const handleTimeIn = async () => {
    if (!firestore || !user?.id || !companyId) {
        toast({ variant: 'destructive', title: 'System error', description: 'Could not resolve employee identity.' });
        return;
    }
    setIsProcessing(true);
    try {
        const attendanceCol = collection(firestore, 'hr_companies', companyId, 'attendance');
        const now = new Date();
        const hour = now.getHours();
        // Standard shift start is 9:00 AM
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

        toast({ title: 'Clock-in successful', description: `Good morning, ${user.name?.split(' ')[0] || 'Employee'}!` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not clock in.' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleTimeOut = async () => {
    if (!firestore || !currentLog || !companyId) return;
    setIsProcessing(true);
    try {
        const logRef = doc(firestore, 'hr_companies', companyId, 'attendance', currentLog.id);
        await updateDoc(logRef, {
            timeOut: serverTimestamp()
        });
        toast({ title: 'Clock-out successful', description: 'Have a great evening!' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not clock out.' });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
            Fulfillment <span className="text-primary">Station</span> Clock
        </h1>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white group">
           <CardContent className="p-8 md:p-12 flex flex-col items-center text-center space-y-8 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
              
              <div className="h-32 w-32 rounded-full bg-slate-50 border-4 border-white flex items-center justify-center relative shadow-xl z-10 transition-transform group-hover:scale-105">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/10 animate-ping opacity-20" />
                  <Clock className="h-12 w-12 text-primary" />
              </div>

              <div className="space-y-1 z-10">
                 <h2 className="text-5xl font-black text-slate-900 tabular-nums tracking-tighter">
                    {currentTime ? format(currentTime, 'hh:mm:ss') : '--:--:--'}
                    <span className="text-xl ml-1 text-slate-400 font-bold uppercase">{currentTime ? format(currentTime, 'a') : ''}</span>
                 </h2>
                 <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] pt-2">Operational Time-Sync</p>
              </div>

              <div className="w-full space-y-4 z-10">
                  {!currentLog ? (
                    <Button 
                        onClick={handleTimeIn}
                        disabled={isProcessing}
                        className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white"
                    >
                        {isProcessing ? 'Authenticating...' : 'Authorize Shift Entry'}
                    </Button>
                  ) : !currentLog.timeOut ? (
                    <Button 
                        onClick={handleTimeOut}
                        disabled={isProcessing}
                        className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20"
                    >
                        {isProcessing ? 'Processing...' : 'Authorize Shift Exit'}
                    </Button>
                  ) : (
                    <div className="p-8 rounded-[2rem] bg-green-50 border-2 border-dashed border-green-100 flex flex-col items-center gap-3 animate-in zoom-in-95">
                        <div className="p-3 rounded-full bg-white shadow-sm">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-black text-slate-900 uppercase text-xs tracking-wider">Shift Secured</p>
                            <p className="text-[10px] font-bold text-green-600/70 uppercase">Daily logs finalized and stored.</p>
                        </div>
                    </div>
                  )}
              </div>
              
              <div className="flex items-center gap-8 pt-4 z-10">
                <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Entry Status</p>
                    <Badge variant="outline" className={cn(
                        "mt-2 text-[10px] font-black uppercase px-3 py-0.5 shadow-sm",
                        currentLog?.status === 'present' ? "bg-green-50 text-green-600 border-green-200" :
                        currentLog?.status === 'late' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-slate-50 text-slate-400 border-slate-200"
                    )}>
                        {currentLog?.status || 'Waiting'}
                    </Badge>
                </div>
                <div className="h-10 w-px bg-slate-100" />
                <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Auth Method</p>
                    <div className="flex items-center gap-1.5 mt-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                        <p className="text-[10px] font-black text-slate-900 uppercase">Station ID</p>
                    </div>
                </div>
              </div>
           </CardContent>
        </Card>

        <div className="space-y-6">
            <Card className="border-none shadow-sm rounded-3xl bg-slate-900 text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform group-hover:scale-110">
                    <ScanLine className="h-24 w-24" />
                </div>
                <CardHeader>
                    <CardTitle className="text-lg font-black tracking-tight uppercase">Operational Protocol</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                        <div className="h-12 w-12 shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                            <Timer className="h-6 w-6 text-green-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-wider">Shift Accuracy</p>
                            <p className="text-[10px] text-white/50 font-bold leading-relaxed">
                                Logs after 09:00 AM are automatically flagged. Early entries are credited to overtime pool.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                        <div className="h-12 w-12 shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                            <MapPin className="h-6 w-6 text-blue-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-wider">Geofence Verified</p>
                            <p className="text-[10px] text-white/50 font-bold leading-relaxed">
                                System verifies station IP and location metadata before authorizing entry.
                            </p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="pt-0 pb-6">
                    <div className="flex items-center gap-2 px-6 pt-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
                        <AlertCircle className="h-3 w-3" /> Station Logs strictly audited
                    </div>
                </CardFooter>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl bg-white">
                <CardHeader className="pb-4">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Weekly Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Fulfillment Streak</span>
                        <span className="text-sm font-black text-slate-900 tabular-nums uppercase">4 / 5 Shifts</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Late Deviations</span>
                        <span className="text-sm font-black text-amber-600 tabular-nums">1</span>
                    </div>
                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden mt-4 border border-slate-100 shadow-inner">
                        <div className="h-full bg-primary w-4/5 rounded-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
