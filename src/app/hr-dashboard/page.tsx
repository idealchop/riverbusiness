'use client';

import React, { useMemo } from 'react';
import { 
  Users, 
  Clock, 
  CalendarDays, 
  TrendingUp, 
  TrendingDown,
  Timer,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function HRDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const companyId = user?.companyId || user?.clientId || 'default';

  // Real data fetching for dashboard stats
  const employeesQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'users'), where('companyId', '==', companyId)) : null,
    [firestore, companyId]
  );
  const { data: employees } = useCollection(employeesQuery);

  const leavesQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'hr_companies', companyId, 'leaveRequests'), where('status', '==', 'pending')) : null,
    [firestore, companyId]
  );
  const { data: pendingLeaves } = useCollection(leavesQuery);
  
  const attendanceQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'hr_companies', companyId, 'attendance'), where('date', '==', format(new Date(), 'yyyy-MM-dd'))) : null,
    [firestore, companyId]
  );
  const { data: todayAttendance } = useCollection(attendanceQuery);

  const stats = useMemo(() => [
    { label: 'Total Workforce', value: employees?.length || 0, icon: Users, trend: 'Managed staff', trendType: 'up' },
    { label: 'Present Today', value: todayAttendance?.length || 0, icon: Clock, trend: 'Live attendance', trendType: 'up' },
    { label: 'On Leave', value: '0', icon: CalendarDays, trend: 'Scheduled away', trendType: 'down' },
    { label: 'Pending Requests', value: pendingLeaves?.length || 0, icon: AlertCircle, trend: 'Action required', trendType: 'warn' },
  ], [employees, todayAttendance, pendingLeaves]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
            Workforce <span className="text-green-600">Intelligence</span>
          </h1>
          <p className="text-slate-500 font-bold text-lg">Central control for {user?.businessName || 'your organization'}.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => router.push('/hr-dashboard/payroll')}
            className="rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-green-200/50 bg-green-600 hover:bg-green-700"
          >
            Run Quick Payroll
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-sm rounded-3xl group hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-slate-50 text-slate-900 group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest",
                  stat.trendType === 'up' ? "text-green-600" : stat.trendType === 'warn' ? "text-amber-600" : "text-slate-400"
                )}>
                  {stat.trendType === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stat.trend}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black text-slate-900 tabular-nums">{stat.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 pb-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight text-slate-900">Attendance Stream</CardTitle>
                <CardDescription className="text-xs font-bold uppercase text-slate-400">Live operational log</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/hr-dashboard/attendance')} className="text-[10px] font-black uppercase tracking-widest">
                Full Log <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
                {todayAttendance && todayAttendance.length > 0 ? todayAttendance.map((log) => (
                   <div key={log.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 uppercase">
                            {log.employeeName.charAt(0)}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-slate-900">{log.employeeName}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Time-In • {log.method} ID</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{log.timeIn ? format(log.timeIn.toDate(), 'hh:mm a') : '--:--'}</p>
                        <Badge variant="outline" className={cn(
                            "text-[8px] h-4 font-black uppercase",
                            log.status === 'present' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                            {log.status === 'present' ? 'On Time' : 'Late'}
                        </Badge>
                      </div>
                   </div>
                )) : (
                    <div className="p-20 text-center opacity-20">
                        <Clock className="h-10 w-10 mx-auto mb-2" />
                        <p className="text-xs font-black uppercase tracking-widest">No attendance records yet today</p>
                    </div>
                )}
             </div>
          </CardContent>
        </Card>

        {/* Reminders / Actions Column */}
        <div className="space-y-8">
           <Card className="border-none shadow-sm rounded-3xl bg-green-600 text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-20 transition-transform group-hover:scale-110">
                <Timer className="h-24 w-24 -mr-8 -mt-8" />
              </div>
              <CardHeader className="relative z-10">
                <CardTitle className="text-lg font-black tracking-tight uppercase">Payroll Window</CardTitle>
                <CardDescription className="text-green-100 font-bold">Standard Work Period</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span>Cycle Status</span>
                  <span>Active</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-3/4" />
                </div>
                <Button onClick={() => router.push('/hr-dashboard/payroll')} className="w-full bg-white text-green-700 hover:bg-green-50 font-black text-[10px] uppercase tracking-widest h-10 rounded-2xl">
                  Run Computation
                </Button>
              </CardContent>
           </Card>

           <Card className="border-none shadow-sm rounded-3xl overflow-hidden border border-slate-100">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 pt-0">
                <Button onClick={() => router.push('/hr-dashboard/employees')} variant="outline" className="justify-between border-slate-100 rounded-2xl h-12 text-sm font-bold group">
                   Add New Staff <Users className="h-4 w-4 text-slate-300 group-hover:text-green-600" />
                </Button>
                <Button onClick={() => router.push('/hr-dashboard/attendance')} variant="outline" className="justify-between border-slate-100 rounded-2xl h-12 text-sm font-bold group">
                   Station Clock <Clock className="h-4 w-4 text-slate-300 group-hover:text-blue-600" />
                </Button>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
