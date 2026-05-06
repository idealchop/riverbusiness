'use client';

import React, { useState } from 'react';
import { 
  Clock, 
  MapPin, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Timer,
  ScanLine
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function AttendancePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const companyId = user?.companyId || user?.clientId || 'default';
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch today's log for the current user
  const todayLogQuery = useMemoFirebase(
    () => firestore ? query(
        collection(firestore, 'hr_companies', companyId, 'attendance'),
        where('employeeId', '==', user?.id),
        where('date', '==', today)
    ) : null,
    [firestore, companyId, user?.id, today]
  );
  const { data: attendanceLogs } = useCollection(todayLogQuery);
  const currentLog = attendanceLogs && attendanceLogs.length > 0 ? attendanceLogs[0] : null;

  const handleTimeIn = async () => {
    if (!firestore || !user) return;
    setIsProcessing(true);
    try {
        const attendanceCol = collection(firestore, 'hr_companies', companyId, 'attendance');
        const now = new Date();
        const hour = now.getHours();
        const status = hour >= 9 ? 'late' : 'present'; // Simple rule: after 9am is late

        await addDoc(attendanceCol, {
            companyId,
            employeeId: user.id,
            employeeName: user.name,
            date: today,
            timeIn: serverTimestamp(),
            method: 'QR',
            status: status
        });

        toast({ title: 'Clock-In Successful', description: `Good morning, ${user.name.split(' ')[0]}!` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not clock in.' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleTimeOut = async () => {
    if (!firestore || !currentLog) return;
    setIsProcessing(true);
    try {
        const logRef = doc(firestore, 'hr_companies', companyId, 'attendance', currentLog.id);
        await updateDoc(logRef, {
            timeOut: serverTimestamp()
        });
        toast({ title: 'Clock-Out Successful', description: 'Have a great evening!' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not clock out.' });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Fulfillment Station Clock</h1>
        <p className="text-slate-500 font-bold">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Time Clock Action Card */}
        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
           <div className="h-2 bg-green-600 w-full" />
           <CardContent className="p-8 md:p-10 flex flex-col items-center text-center space-y-8">
              <div className="h-24 w-24 rounded-full bg-slate-50 border-4 border-slate-100 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-green-600/20 animate-[spin_10s_linear_infinite]" />
                  <Clock className="h-10 w-10 text-green-600" />
              </div>

              <div className="space-y-1">
                 <h2 className="text-4xl font-black text-slate-900 tabular-nums">
                    {format(new Date(), 'hh:mm a')}
                 </h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Standard Time Zone</p>
              </div>

              <div className="w-full space-y-4">
                  {!currentLog ? (
                    <Button 
                        onClick={handleTimeIn}
                        disabled={isProcessing}
                        className="w-full h-16 rounded-3xl bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-green-200/50"
                    >
                        {isProcessing ? 'Authenticating...' : 'Authorize Time-In'}
                    </Button>
                  ) : !currentLog.timeOut ? (
                    <Button 
                        onClick={handleTimeOut}
                        disabled={isProcessing}
                        className="w-full h-16 rounded-3xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200/50"
                    >
                        {isProcessing ? 'Processing...' : 'Time-Out Session'}
                    </Button>
                  ) : (
                    <div className="p-6 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                        <p className="font-bold text-slate-900 text-sm">Shift Completed</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase">You have clocked out for today.</p>
                    </div>
                  )}
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Status</p>
                    <Badge className="bg-blue-50 text-blue-700 border-none text-[10px] font-black uppercase mt-1">
                        {currentLog?.status || 'Waiting'}
                    </Badge>
                </div>
                <div className="h-8 w-px bg-slate-100" />
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Method</p>
                    <p className="text-[10px] font-black text-slate-900 uppercase mt-1">Biometric ID</p>
                </div>
              </div>
           </CardContent>
        </Card>

        {/* Info & Rules Card */}
        <div className="space-y-6">
            <Card className="border-none shadow-sm rounded-3xl bg-slate-900 text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
                    <ScanLine className="h-20 w-20" />
                </div>
                <CardHeader>
                    <CardTitle className="text-lg font-black tracking-tight uppercase">Operational Protocol</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                            <Timer className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold">Standard Shift Start</p>
                            <p className="text-[10px] text-white/50 font-medium">Logs after 09:00 AM are flagged as late.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold">Location Verified</p>
                            <p className="text-[10px] text-white/50 font-medium">Auth required from registered station IP.</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="pt-0 pb-6 bg-slate-800/50">
                    <div className="flex items-center gap-2 px-6 pt-4 text-[9px] font-black uppercase tracking-widest text-white/40">
                        <AlertCircle className="h-3 w-3" /> System Logs strictly audited
                    </div>
                </CardFooter>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Weekly Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Days Present</span>
                        <span className="text-xs font-black text-slate-900 tabular-nums">4 / 5</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Late Entries</span>
                        <span className="text-xs font-black text-amber-600 tabular-nums">1</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-4">
                        <div className="h-full bg-green-500 w-4/5" />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}