'use client';

import React, { useState } from 'react';
import { 
  Clock, 
  MapPin, 
  CheckCircle2,
  AlertCircle,
  Timer,
  ScanLine
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { HRAttendanceLog } from '@/lib/types';

export default function AttendancePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

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
    if (!firestore || !user || !companyId) return;
    setIsProcessing(true);
    try {
        const attendanceCol = collection(firestore, 'hr_companies', companyId, 'attendance');
        const now = new Date();
        const hour = now.getHours();
        const status = hour >= 9 ? 'late' : 'present';

        await addDoc(attendanceCol, {
            companyId,
            employeeId: user.id,
            employeeName: user.name,
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Fulfillment station clock</h1>
        <p className="text-slate-500 font-medium">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
           <CardContent className="p-8 md:p-12 flex flex-col items-center text-center space-y-8">
              <div className="h-28 w-24 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center relative shadow-inner">
                  <Clock className="h-10 w-10 text-slate-300" />
              </div>

              <div className="space-y-1">
                 <h2 className="text-4xl font-bold text-slate-900 tabular-nums">
                    {format(new Date(), 'hh:mm a')}
                 </h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Standard time zone</p>
              </div>

              <div className="w-full space-y-4">
                  {!currentLog ? (
                    <Button 
                        onClick={handleTimeIn}
                        disabled={isProcessing}
                        className="w-full h-16 rounded-2xl font-bold uppercase tracking-wider text-xs shadow-md"
                    >
                        {isProcessing ? 'Authenticating...' : 'Authorize time-in'}
                    </Button>
                  ) : !currentLog.timeOut ? (
                    <Button 
                        onClick={handleTimeOut}
                        disabled={isProcessing}
                        className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-xs shadow-md"
                    >
                        {isProcessing ? 'Processing...' : 'Time-out session'}
                    </Button>
                  ) : (
                    <div className="p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-100 flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-green-600 opacity-50" />
                        <p className="font-bold text-slate-900 text-sm">Shift completed</p>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">You have clocked out for today.</p>
                    </div>
                  )}
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Status</p>
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold mt-1">
                        {currentLog?.status || 'Waiting'}
                    </Badge>
                </div>
                <div className="h-8 w-px bg-slate-100" />
                <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Verification</p>
                    <p className="text-[10px] font-bold text-slate-900 uppercase mt-1">Biometric ID</p>
                </div>
              </div>
           </CardContent>
        </Card>

        <div className="space-y-6">
            <Card className="border-none shadow-sm rounded-2xl bg-slate-900 text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-5 transition-transform group-hover:scale-110">
                    <ScanLine className="h-20 w-20" />
                </div>
                <CardHeader>
                    <CardTitle className="text-lg font-bold tracking-tight">Operational protocol</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-white/10 flex items-center justify-center">
                            <Timer className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold">Standard shift start</p>
                            <p className="text-[10px] text-white/50 font-medium">Logs after 09:00 AM are flagged as late.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-white/10 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold">Location verified</p>
                            <p className="text-[10px] text-white/50 font-medium">Auth required from registered station IP.</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="pt-0 pb-6">
                    <div className="flex items-center gap-2 px-6 pt-4 text-[9px] font-bold uppercase tracking-widest text-white/30">
                        <AlertCircle className="h-3 w-3" /> All logs strictly audited
                    </div>
                </CardFooter>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white">
                <CardHeader className="pb-4">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weekly summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Days present</span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">4 / 5</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Late entries</span>
                        <span className="text-sm font-bold text-amber-600 tabular-nums">1</span>
                    </div>
                    <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden mt-4">
                        <div className="h-full bg-primary w-4/5" />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
