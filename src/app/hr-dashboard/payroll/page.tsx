'use client';

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  PlayCircle,
  FileText,
  TrendingUp,
  History,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { RunPayrollDialog } from '@/components/hr/RunPayrollDialog';
import { cn } from '@/lib/utils';
import { FullScreenLoader } from '@/components/ui/loader';

const DEMO_RUNS = [
    { id: 'pr1', periodStart: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), periodEnd: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), status: 'paid', totalNetSalary: 385000, createdAt: Timestamp.now() },
    { id: 'pr2', periodStart: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'), periodEnd: format(endOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'), status: 'paid', totalNetSalary: 372000, createdAt: Timestamp.now() },
    { id: 'pr3', periodStart: format(startOfMonth(subMonths(new Date(), 3)), 'yyyy-MM-dd'), periodEnd: format(endOfMonth(subMonths(new Date(), 3)), 'yyyy-MM-dd'), status: 'paid', totalNetSalary: 391500, createdAt: Timestamp.now() },
];

export default function PayrollPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  
  const companyId = user?.companyId || user?.clientId || 'default';

  const payrollQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'hr_companies', companyId, 'payrollRuns'), orderBy('createdAt', 'desc')) : null,
    [firestore, companyId]
  );
  const { data: payrollRuns, isLoading } = useCollection(payrollQuery);

  const displayPayroll = useMemo(() => {
    return payrollRuns && payrollRuns.length > 0 ? payrollRuns : DEMO_RUNS;
  }, [payrollRuns]);

  const totalDisbursed = useMemo(() => {
    return displayPayroll.reduce((sum, run) => sum + (Number(run?.totalNetSalary) || 0), 0);
  }, [displayPayroll]);

  if (isUserLoading) {
    return <FullScreenLoader text="Verifying credentials..." />;
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payroll</h1>
          <p className="text-slate-500 font-medium text-sm">Collaborative Salary Computation and Organizational Disbursement Logs.</p>
        </div>
        <Button 
            onClick={() => setIsPayrollDialogOpen(true)}
            className="rounded-xl h-11 px-6 font-bold shadow-md"
        >
        <PlayCircle className="mr-2 h-4 w-4" /> Run New Period
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm rounded-2xl bg-slate-900 text-white overflow-hidden group">
            <CardContent className="p-6 space-y-4">
                <div className="p-2.5 rounded-xl bg-white/10 w-fit">
                    <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div className="space-y-1">
                    <p className="text-2xl font-bold tracking-tight">₱{totalDisbursed.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Lifetime Disbursements</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <TrendingUp className="h-3 w-3 text-green-400" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Verified Ledger</span>
                </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 border-none shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/20 border-b p-6">
               <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">Historical Cycles</CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-500">Company-wide payment logs</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">
                    Export Ledger (CSV)
                  </Button>
               </div>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-slate-50/50">
                   <TableRow>
                     <TableHead className="pl-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">Period</TableHead>
                     <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Status</TableHead>
                     <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Total Net</TableHead>
                     <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-50 font-medium">Accessing secure records...</TableCell></TableRow>
                   ) : displayPayroll.map(run => (
                        <TableRow key={run.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0">
                          <TableCell className="pl-6 py-4">
                            <p className="text-sm font-semibold text-slate-900">{run.periodStart ? format(new Date(run.periodStart), 'MMM d') : 'N/A'} - {run.periodEnd ? format(new Date(run.periodEnd), 'MMM d, yyyy') : 'N/A'}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Processed {run.createdAt instanceof Timestamp ? format(run.createdAt.toDate(), 'PP') : (run.createdAt ? format(new Date(run.createdAt), 'PP') : 'Recently')}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[10px] font-bold uppercase border-none px-2 h-5",
                              run.status === 'paid' ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                            )}>
                              {run.status || 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-bold text-slate-900 tabular-nums">₱{(Number(run.totalNetSalary) || 0).toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="outline" size="sm" className="rounded-lg h-8 text-[10px] font-bold uppercase tracking-wider border-slate-200">
                               <FileText className="mr-1.5 h-3 w-3 opacity-50" /> Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
      </div>

      <RunPayrollDialog
        isOpen={isPayrollDialogOpen}
        onOpenChange={setIsPayrollDialogOpen}
        companyId={companyId}
      />
    </div>
  );
}
