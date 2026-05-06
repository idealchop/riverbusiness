'use client';

import React, { useMemo } from 'react';
import { 
  Users, 
  Clock, 
  CalendarDays, 
  Timer,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { AppUser, HRAttendanceLog, HRLeaveRequest } from '@/lib/types';

export default function HRDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const companyId = user?.companyId || user?.clientId || 'default';
  const isManagement = user?.hrRole === 'owner' || user?.hrRole === 'admin';

  // Management Queries
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
  
  const attendanceQuery = useMemoFirebase(
    () => (firestore && companyId && isManagement) ? query(collection(firestore, 'hr_companies', companyId, 'attendance'), where('date', '==', format(new Date(), 'yyyy-MM-dd'))) : null,
    [firestore, companyId, isManagement]
  );
  const { data: todayAttendance } = useCollection(attendanceQuery);

  // Employee Specific Queries
  const myAttendanceQuery = useMemoFirebase(
    () => (firestore && companyId && !isManagement && user?.id) ? query(
        collection(firestore, 'hr_companies', companyId, 'attendance'), 
        where('employeeId', '==', user.id),
        orderBy('date', 'desc')
    ) : null,
    [firestore, companyId, isManagement, user?.id]
  );
  const { data: myAttendance } = useCollection<HRAttendanceLog>(myAttendanceQuery);

  const myLeavesQuery = useMemoFirebase(
    () => (firestore && companyId && !isManagement && user?.id) ? query(
        collection(firestore, 'hr_companies', companyId, 'leaveRequests'),
        where('employeeId', '==', user.id)
    ) : null,
    [firestore, companyId, isManagement, user?.id]
  );
  const { data: myLeaves } = useCollection<HRLeaveRequest>(myLeavesQuery);

  const stats = useMemo(() => {
    if (isManagement) {
        return [
            { label: 'Total workforce', value: employees?.length || 0, icon: Users, trend: 'Managed staff', trendType: 'up' },
            { label: 'Present today', value: todayAttendance?.length || 0, icon: Clock, trend: 'Live attendance', trendType: 'up' },
            { label: 'On leave', value: '0', icon: CalendarDays, trend: 'Scheduled away', trendType: 'down' },
            { label: 'Pending requests', value: pendingLeaves?.length || 0, icon: AlertCircle, trend: 'Action required', trendType: 'warn' },
        ];
    } else {
        const streak = myAttendance?.filter(a => a.status === 'present').length || 0;
        const pending = myLeaves?.filter(l => l.status === 'pending').length || 0;
        const approved = myLeaves?.filter(l => l.status === 'approved').length || 0;
        return [
            { label: 'Attendance streak', value: streak, icon: TrendingUp, trend: 'Days present', trendType: 'up' },
            { label: 'Leave status', value: approved, icon: FileCheck, trend: 'Approved requests', trendType: 'up' },
            { label: 'Pending leaves', value: pending, icon: Clock, trend: 'Awaiting review', trendType: 'warn' },
            { label: 'Personal profile', value: '360°', icon: UserCircle, trend: 'Secure records', trendType: 'up' },
        ];
    }
  }, [isManagement, employees, todayAttendance, pendingLeaves, myAttendance, myLeaves]);

  const UserCircle = () => <Users className="h-5 w-5" />; // Fallback icon

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {isManagement ? 'Workforce Intelligence' : 'My Workspace'}
          </h1>
          <p className="text-slate-500 font-medium text-base">
            {isManagement ? `Central control for ${user?.businessName || 'your organization'}.` : `Hello, ${user?.name?.split(' ')[0] || 'Employee'}. Here is your shift summary.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isManagement ? (
            <Button 
                onClick={() => router.push('/hr-dashboard/payroll')}
                className="rounded-xl h-11 px-6 font-bold shadow-sm"
            >
                Run quick payroll
            </Button>
          ) : (
            <Button 
                onClick={() => router.push('/hr-dashboard/attendance')}
                className="rounded-xl h-11 px-6 font-bold shadow-sm"
            >
                Station clock
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-sm rounded-2xl group hover:shadow-md transition-all bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-900 group-hover:bg-primary group-hover:text-white transition-colors">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className={cn(
                  "text-[9px] font-bold uppercase tracking-wider",
                  stat.trendType === 'up' ? "text-green-600" : stat.trendType === 'warn' ? "text-amber-600" : "text-slate-400"
                )}>
                  {stat.trend}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-slate-900 tabular-nums">{stat.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/30 pb-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                    {isManagement ? 'Attendance Stream' : 'My Recent Logs'}
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500">
                    {isManagement ? 'Live operational log for today' : 'Your shift history summary'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/hr-dashboard/attendance')} className="text-xs font-bold text-primary">
                Full log <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y divide-slate-50">
                {(isManagement ? todayAttendance : myAttendance?.slice(0, 5))?.length ? (isManagement ? todayAttendance : myAttendance?.slice(0, 5))?.map((log) => (
                   <div key={log.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 uppercase text-sm">
                            {log.employeeName.charAt(0)}
                        </div>
                        <div>
                           <p className="text-sm font-semibold text-slate-900">{isManagement ? log.employeeName : format(new Date(log.date), 'MMM d, yyyy')}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase">{log.method} Verification</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{log.timeIn ? (typeof log.timeIn.toDate === 'function' ? format(log.timeIn.toDate(), 'hh:mm a') : '--:--') : '--:--'}</p>
                        <Badge variant="outline" className={cn(
                            "text-[9px] h-5 font-bold uppercase px-2",
                            log.status === 'present' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-amber-50 text-amber-700 border-amber-100"
                        )}>
                            {log.status === 'present' ? 'On time' : 'Late'}
                        </Badge>
                      </div>
                   </div>
                )) : (
                    <div className="p-20 text-center opacity-30">
                        <Clock className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-400">No records found</p>
                    </div>
                )}
             </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
           {isManagement ? (
               <Card className="border-none shadow-sm rounded-2xl bg-slate-900 text-white overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
                    <Timer className="h-24 w-24 -mr-8 -mt-8" />
                  </div>
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-lg font-bold tracking-tight">Payroll Window</CardTitle>
                    <CardDescription className="text-slate-400 font-medium">Standard work period</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Cycle status</span>
                      <span className="text-green-400">Active</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-3/4" />
                    </div>
                    <Button onClick={() => router.push('/hr-dashboard/payroll')} className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold text-[10px] uppercase tracking-widest h-10 rounded-xl">
                      Run computation
                    </Button>
                  </CardContent>
               </Card>
           ) : (
               <Card className="border-none shadow-sm rounded-2xl bg-slate-900 text-white overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
                    <CalendarDays className="h-24 w-24 -mr-8 -mt-8" />
                  </div>
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-lg font-bold tracking-tight">Leave Balance</CardTitle>
                    <CardDescription className="text-slate-400 font-medium">Annual availability</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Credits used</span>
                      <span className="text-primary-light">{myLeaves?.filter(l => l.status === 'approved').length || 0} / 12</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-1/4" />
                    </div>
                    <Button onClick={() => router.push('/hr-dashboard/leave')} className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold text-[10px] uppercase tracking-widest h-10 rounded-xl">
                      File Leave Application
                    </Button>
                  </CardContent>
               </Card>
           )}

           <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 pt-0">
                {isManagement && (
                    <Button onClick={() => router.push('/hr-dashboard/employees')} variant="outline" className="justify-between border-slate-100 rounded-xl h-11 text-sm font-semibold group bg-slate-50/50 hover:bg-white transition-all">
                        Add New Staff <Users className="h-4 w-4 text-slate-300 group-hover:text-primary" />
                    </Button>
                )}
                <Button onClick={() => router.push('/hr-dashboard/attendance')} variant="outline" className="justify-between border-slate-100 rounded-xl h-11 text-sm font-semibold group bg-slate-50/50 hover:bg-white transition-all">
                   Station Clock <Clock className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                </Button>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
