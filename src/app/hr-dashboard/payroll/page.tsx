'use client';

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  PlayCircle,
  FileText,
  TrendingUp,
  History,
  CheckCircle2,
  AlertTriangle,
  Download,
  Building,
  UserCircle
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
import { collection, query, where, orderBy, Timestamp, limit } from 'firebase/firestore';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { RunPayrollDialog } from '@/components/hr/RunPayrollDialog';
import { cn } from '@/lib/utils';
import { FullScreenLoader } from '@/components/ui/loader';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AppUser, HRPayrollRun } from '@/lib/types';

const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

export default function PayrollPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  
  const companyId = user?.companyId || user?.clientId || 'default';

  // --- Data Fetching ---
  const payrollQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'hr_companies', companyId, 'payrollRuns'), orderBy('createdAt', 'desc')) : null,
    [firestore, companyId]
  );
  const { data: payrollRuns, isLoading } = useCollection<HRPayrollRun>(payrollQuery);

  // Fetch the owner's profile to get official branding (Business Name and Address)
  const ownerQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'users'), where('companyId', '==', companyId), where('hrRole', '==', 'owner'), limit(1)) : null,
    [firestore, companyId]
  );
  const { data: owners } = useCollection<AppUser>(ownerQuery);
  const owner = owners?.[0];

  const companyName = owner?.businessName || user?.businessName || 'River Philippines';
  const companyAddress = owner?.address || user?.address || 'Authorized Business Entity';

  const displayPayroll = useMemo(() => {
    return payrollRuns || [];
  }, [payrollRuns]);

  const totalDisbursed = useMemo(() => {
    return displayPayroll.reduce((sum, run) => sum + (Number(run?.totalNetSalary) || 0), 0);
  }, [displayPayroll]);

  const handleDownloadStatement = (run: HRPayrollRun) => {
    const doc = new jsPDF('p', 'pt');
    const pageWidth = doc.internal.pageSize.width;
    const margin = 40;

    // Header Background
    doc.setFillColor(83, 142, 194);
    doc.rect(0, 0, pageWidth, 120, 'F');
    
    // Header Content
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, margin, 55);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(companyAddress, margin, 75);
    doc.text(`Authorized Signatory: ${user?.name || 'Administrator'}`, margin, 87);
    doc.text(`Role: ${user?.hrRole || 'Admin'}`, margin, 99);

    // Document Title
    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Certificate of Payroll Disbursement', margin, 160);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Transaction Reference: ${run.id}`, margin, 185);
    doc.text(`Statement Period: ${format(new Date(run.periodStart), 'MMM d')} - ${format(new Date(run.periodEnd), 'MMM d, yyyy')}`, margin, 200);
    doc.text(`Processed Date: ${run.createdAt ? format(toSafeDate(run.createdAt)!, 'PPP p') : 'Recently'}`, margin, 215);

    // Table Content
    autoTable(doc, {
        startY: 245,
        head: [['Disbursement Item', 'Currency', 'Amount']],
        body: [
            ['Total Net Salaries', 'PHP', run.totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })],
            ['Employee Headcount', '-', run.employeeCount || 'N/A'],
            ['Payment Status', '-', run.status.toUpperCase()],
            ['Organization', '-', companyName],
        ],
        theme: 'striped',
        headStyles: { fillColor: [83, 142, 194], textColor: 255 },
        margin: { left: margin, right: margin },
    });

    // Signatory Area (Required for Bank)
    const finalY = (doc as any).lastAutoTable.finalY + 80;
    doc.setDrawColor(200);
    doc.line(margin, finalY, margin + 200, finalY);
    doc.setFontSize(8);
    doc.text('Authorized Signature', margin, finalY + 15);
    doc.text(format(new Date(), 'PP p'), margin, finalY + 28);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text('This document is electronically generated and serves as a formal confirmation for bank withdrawal and auditing purposes.', margin, finalY + 70);

    doc.save(`Payroll_Statement_${run.id}.pdf`);
  };

  if (isUserLoading) {
    return <FullScreenLoader text="Synchronizing Ledger..." />;
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payroll Engine</h1>
          <p className="text-slate-500 font-medium text-sm">Automated salary computation and disbursement reporting.</p>
        </div>
        <Button 
            onClick={() => setIsPayrollDialogOpen(true)}
            className="rounded-xl h-11 px-6 font-bold shadow-md shadow-primary/10"
        >
        <PlayCircle className="mr-2 h-4 w-4" /> Run New Period
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm rounded-[2rem] bg-slate-900 text-white overflow-hidden group relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <DollarSign className="h-20 w-20" />
            </div>
            <CardContent className="p-8 space-y-6">
                <div className="p-3 rounded-2xl bg-white/10 w-fit">
                    <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
                <div className="space-y-1">
                    <p className="text-3xl font-black tracking-tight tabular-nums">₱{totalDisbursed.toLocaleString()}</p>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">All-Time Disbursements</p>
                </div>
                <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Bank Confirmed Ledger</span>
                    </div>
                </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/30 border-b p-8">
               <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">Transaction History</CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-widest">Digital Audit Trail</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-widest px-3 h-6">
                      {displayPayroll.length} Cycles Logged
                  </Badge>
               </div>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-slate-50/50">
                   <TableRow className="border-none">
                     <TableHead className="pl-8 font-bold text-[10px] uppercase tracking-wider text-slate-400 py-4">Statement Cycle</TableHead>
                     <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Total Disbursement</TableHead>
                     <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Status</TableHead>
                     <TableHead className="text-right pr-8 font-bold text-[10px] uppercase tracking-wider text-slate-400">Action</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 opacity-50 font-bold text-xs uppercase tracking-[0.2em]">Accessing records...</TableCell></TableRow>
                   ) : displayPayroll.map(run => (
                        <TableRow key={run.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0 group">
                          <TableCell className="pl-8 py-5">
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900">{run.periodStart ? format(new Date(run.periodStart), 'MMM d') : 'N/A'} - {run.periodEnd ? format(new Date(run.periodEnd), 'MMM d, yyyy') : 'N/A'}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Processed {run.createdAt instanceof Timestamp ? format(run.createdAt.toDate(), 'PP') : (run.createdAt ? format(new Date(run.createdAt), 'PP') : 'Recently')}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-black text-slate-900 tabular-nums">₱{(Number(run.totalNetSalary) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[10px] font-bold uppercase border-none px-3 h-6 shadow-sm",
                              run.status === 'paid' ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                            )}>
                              {run.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDownloadStatement(run)}
                                className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white hover:bg-slate-50 hover:text-primary transition-all group/btn"
                            >
                               <Download className="mr-2 h-3.5 w-3.5 opacity-50 group-hover/btn:opacity-100" /> Statement
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!isLoading && displayPayroll.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={4} className="text-center py-24">
                                  <div className="flex flex-col items-center gap-4 opacity-20">
                                      <DollarSign className="h-12 w-12" />
                                      <p className="text-xs font-black uppercase tracking-[0.3em]">No Payroll Records Found</p>
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

