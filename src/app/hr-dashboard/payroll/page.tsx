'use client';

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
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
import { collection, query, where, orderBy } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { RunPayrollDialog } from '@/components/hr/RunPayrollDialog';
import { cn } from '@/lib/utils';

export default function PayrollPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  
  const companyId = user?.companyId || user?.clientId || 'default';

  const payrollQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'hr_companies', companyId, 'payrollRuns'), orderBy('createdAt', 'desc')) : null,
    [firestore, companyId]
  );
  const { data: payrollRuns, isLoading } = useCollection(payrollQuery);

  const totalDisbursed = useMemo(() => {
    if (!payrollRuns) return 0;
    return payrollRuns.reduce((sum, run) => sum + (run.totalNetSalary || 0), 0);
  }, [payrollRuns]);

  const isOwner = user?.hrRole === 'owner';

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Payroll Engine</h1>
          <p className="text-slate-500 font-medium">Automated salary computation and disbursement logs.</p>
        </div>
        {isOwner && (
            <Button 
                onClick={() => setIsPayrollDialogOpen(true)}
                className="rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-200/50 bg-blue-600 hover:bg-blue-700"
            >
            <PlayCircle className="mr-2 h-4 w-4" /> Run New Period
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm rounded-3xl bg-slate-900 text-white overflow-hidden group">
            <CardContent className="p-6 space-y-4">
                <div className="p-3 rounded-2xl bg-white/10 w-fit">
                    <DollarSign className="h-6 w-6 text-green-400" />
                </div>
                <div className="space-y-1">
                    <p className="text-2xl font-black tracking-tighter">₱{totalDisbursed.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Lifetime Disbursements</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <TrendingUp className="h-3 w-3 text-green-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Verified Cycles</span>
                </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-6">
               <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black tracking-tight text-slate-900">Historical Cycles</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase text-slate-400">Past payment logs</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest">
                    Export All CSV
                  </Button>
               </div>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-slate-50/50">
                   <TableRow>
                     <TableHead className="pl-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Payroll Period</TableHead>
                     <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Status</TableHead>
                     <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Total Net</TableHead>
                     <TableHead className="text-right pr-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-50 font-bold uppercase tracking-widest text-[10px]">Accessing Secure Records...</TableCell></TableRow>
                   ) : payrollRuns && payrollRuns.length > 0 ? (
                      payrollRuns.map(run => (
                        <TableRow key={run.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6 py-4">
                            <p className="text-sm font-bold text-slate-900">{format(new Date(run.periodStart), 'MMM d')} - {format(new Date(run.periodEnd), 'MMM d, yyyy')}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Processed: {run.createdAt ? format(run.createdAt.toDate(), 'PP') : 'Today'}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[8px] font-black uppercase border-none px-2",
                              run.status === 'paid' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {run.status === 'paid' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                              {run.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-black text-slate-900 tabular-nums">₱{run.totalNetSalary.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="outline" size="sm" className="rounded-xl h-8 text-[10px] font-black uppercase tracking-widest">
                               <FileText className="mr-2 h-3.5 w-3.5" /> Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                   ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20">
                         <div className="flex flex-col items-center gap-2 opacity-20">
                           <History className="h-10 w-10 text-slate-400" />
                           <p className="text-xs font-black uppercase tracking-widest">No payroll history found</p>
                         </div>
                      </TableCell>
                    </TableRow>
                   )}
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
