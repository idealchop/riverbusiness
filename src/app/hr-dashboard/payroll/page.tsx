
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
  UserCircle,
  Eye,
  ChevronRight,
  Printer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, limit } from 'firebase/firestore';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { RunPayrollDialog } from '@/components/hr/RunPayrollDialog';
import { cn } from '@/lib/utils';
import { FullScreenLoader } from '@/components/ui/loader';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AppUser, HRPayrollRun, HRPayrollBreakdownItem } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

// Demo data for the payroll engine with breakdown
const DEMO_PAYROLL: HRPayrollRun[] = [
    { 
        id: 'PR-2025-05-SR', 
        companyId: 'demo', 
        periodStart: format(startOfMonth(subMonths(new Date(), 0)), 'yyyy-MM-dd'), 
        periodEnd: format(endOfMonth(subMonths(new Date(), 0)), 'yyyy-MM-dd'), 
        status: 'paid', 
        totalNetSalary: 385000, 
        employeeCount: 3,
        createdAt: Timestamp.now(),
        breakdown: [
            { employeeId: 'e1', employeeName: 'Marcus Rivera', amount: 45000, rate: 45000, type: 'monthly' },
            { employeeId: 'e2', employeeName: 'Sarah Jenkins', amount: 38000, rate: 38000, type: 'monthly' },
            { employeeId: 'e3', employeeName: 'Leo Castelo', amount: 18700, rate: 850, daysWorked: 22, type: 'daily' },
        ]
    },
    { 
        id: 'PR-2025-04-SR', 
        companyId: 'demo', 
        periodStart: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), 
        periodEnd: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), 
        status: 'paid', 
        totalNetSalary: 372400, 
        employeeCount: 2,
        createdAt: Timestamp.fromDate(subMonths(new Date(), 1)),
        breakdown: [
            { employeeId: 'e1', employeeName: 'Marcus Rivera', amount: 45000, rate: 45000, type: 'monthly' },
            { employeeId: 'e4', employeeName: 'Elena Cruz', amount: 30000, rate: 30000, type: 'monthly' },
        ]
    },
];

export default function PayrollPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [viewingRun, setViewingRun] = useState<HRPayrollRun | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
    const live = payrollRuns || [];
    return live.length > 0 ? live : DEMO_PAYROLL;
  }, [payrollRuns]);

  // Computed Pagination
  const totalPages = Math.ceil(displayPayroll.length / itemsPerPage);
  const paginatedPayroll = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayPayroll.slice(start, start + itemsPerPage);
  }, [displayPayroll, currentPage, itemsPerPage]);

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
    doc.text(`Authorized signatory: ${user?.name || 'Administrator'}`, margin, 87);
    doc.text(`Role: ${user?.hrRole || 'Admin'}`, margin, 99);

    // Document Title
    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Certificate of payroll disbursement', margin, 160);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Transaction reference: ${run.id}`, margin, 185);
    doc.text(`Statement period: ${format(new Date(run.periodStart), 'MMM d')} - ${format(new Date(run.periodEnd), 'MMM d, yyyy')}`, margin, 200);
    doc.text(`Processed date: ${run.createdAt ? format(toSafeDate(run.createdAt)!, 'PPP p') : 'Recently'}`, margin, 215);

    // Summary Table
    autoTable(doc, {
        startY: 245,
        head: [['Disbursement item', 'Currency', 'Amount']],
        body: [
            ['Total net salaries', 'PHP', run.totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })],
            ['Employee headcount', '-', run.employeeCount || 'N/A'],
            ['Payment status', '-', run.status.toUpperCase()],
            ['Organization', '-', companyName],
        ],
        theme: 'striped',
        headStyles: { fillColor: [83, 142, 194], textColor: 255 },
        margin: { left: margin, right: margin },
    });

    // Employee Breakdown Table
    if (run.breakdown && run.breakdown.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Employee disbursement breakdown', margin, (doc as any).lastAutoTable.finalY + 40);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 55,
            head: [['Employee', 'Type', 'Rate', 'Workload', 'Total payout']],
            body: run.breakdown.map(item => [
                item.employeeName,
                item.type.charAt(0).toUpperCase() + item.type.slice(1),
                `P${item.rate.toLocaleString()}`,
                item.type === 'daily' ? `${item.daysWorked} days` : 'Full month',
                `P${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
            bodyStyles: { fontSize: 8 },
            margin: { left: margin, right: margin },
        });
    }

    // Signatory Area
    const finalY = (doc as any).lastAutoTable.finalY + 60;
    doc.setDrawColor(200);
    doc.line(margin, finalY, margin + 200, finalY);
    doc.setFontSize(8);
    doc.text('Authorized signature', margin, finalY + 15);
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
                     <TableHead>Headcount</TableHead>
                     <TableHead>Total Disbursement</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead className="text-right pr-8">Action</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-50 font-bold text-xs uppercase tracking-[0.2em]">Accessing records...</TableCell></TableRow>
                   ) : paginatedPayroll.map(run => (
                        <TableRow key={run.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0 group">
                          <TableCell className="pl-8 py-5">
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900">{run.periodStart ? format(new Date(run.periodStart), 'MMM d') : 'N/A'} - {run.periodEnd ? format(new Date(run.periodEnd), 'MMM d, yyyy') : 'N/A'}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Processed {run.createdAt instanceof Timestamp ? format(run.createdAt.toDate(), 'PP') : (run.createdAt ? format(new Date(run.createdAt), 'PP') : 'Recently')}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-semibold text-slate-500">{run.employeeCount || 0} Staff</span>
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
                            <div className="flex items-center justify-end gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setViewingRun(run)}
                                    className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white hover:bg-slate-50 hover:text-primary transition-all shadow-none"
                                >
                                <Eye className="mr-2 h-3.5 w-3.5" /> View
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => handleDownloadStatement(run)}
                                    className="rounded-xl h-9 w-9 border-slate-200 bg-white hover:bg-slate-50 hover:text-primary transition-all group/btn shadow-none"
                                    title="Download Statement"
                                >
                                <Download className="h-3.5 w-3.5 opacity-50 group-hover/btn:opacity-100" />
                                </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!isLoading && displayPayroll.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={5} className="text-center py-24">
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
            <CardFooter className="bg-muted/5 py-4 flex items-center justify-between border-t">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Showing {paginatedPayroll.length} of {displayPayroll.length} runs
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400 px-2">{currentPage} / {totalPages || 1}</span>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>Next</Button>
                </div>
            </CardFooter>
          </Card>
      </div>

      <RunPayrollDialog
        isOpen={isPayrollDialogOpen}
        onOpenChange={setIsPayrollDialogOpen}
        companyId={companyId}
      />

      {/* Disbursement Detail View Dialog */}
      <Dialog open={!!viewingRun} onOpenChange={(open) => { if (!open) setViewingRun(null); }}>
        <DialogContent className="sm:max-w-3xl rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-3xl">
             <div className="bg-slate-900 text-white p-8">
                <DialogHeader>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                                <DollarSign className="h-6 w-6 text-primary-light" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black tracking-tight uppercase">Disbursement detail</DialogTitle>
                                <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">
                                    Ref: {viewingRun?.id} • {viewingRun ? format(new Date(viewingRun.periodStart), 'MMM d') : ''} - {viewingRun ? format(new Date(viewingRun.periodEnd), 'MMM d, yyyy') : ''}
                                </DialogDescription>
                            </div>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 font-black uppercase text-[10px] tracking-widest h-7 px-4">
                            Settled
                        </Badge>
                    </div>
                </DialogHeader>
            </div>

            <ScrollArea className="max-h-[60vh]">
                <div className="p-8 space-y-8">
                    {/* Organization Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 pb-8">
                         <div className="space-y-4">
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client organization</h4>
                                <p className="text-sm font-bold text-slate-900">{companyName}</p>
                                <p className="text-xs text-slate-500 leading-relaxed">{companyAddress}</p>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authorized signatory</h4>
                                <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end justify-center">
                            <div className="text-right p-6 rounded-[2rem] bg-slate-50 border border-slate-100 w-full md:w-auto min-w-[200px]">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total disbursement</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tight">₱{viewingRun?.totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>

                    {/* Employee List */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Employee breakdown</h4>
                            <span className="text-[10px] font-bold text-primary">{viewingRun?.employeeCount} Staff members</span>
                        </div>
                        
                        <div className="rounded-2xl border border-slate-50 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-none">
                                        <TableHead className="text-[10px] font-black uppercase text-slate-400">Member</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-slate-400">Type</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-slate-400">Workload</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-400 pr-6">Net amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {viewingRun?.breakdown?.map((item, idx) => (
                                        <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">
                                                        {item.employeeName.charAt(0)}
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900">{item.employeeName}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-100 bg-white shadow-none">
                                                    {item.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-500">
                                                {item.type === 'daily' ? `${item.daysWorked} days` : 'Fixed monthly'}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <span className="text-sm font-black text-slate-900">₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </ScrollArea>

            <DialogFooter className="p-8 pt-4 bg-white border-t flex flex-col md:flex-row justify-between items-center gap-4">
                <Button 
                    variant="outline" 
                    onClick={() => viewingRun && handleDownloadStatement(viewingRun)}
                    className="w-full md:w-auto rounded-xl h-11 px-8 font-black uppercase tracking-widest text-[10px] shadow-sm border-slate-200"
                >
                    <Printer className="mr-2 h-4 w-4" /> Download professional PDF
                </Button>
                <DialogClose asChild>
                    <Button variant="ghost" className="w-full md:w-auto rounded-xl h-11 px-10 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-900">Close detail</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
