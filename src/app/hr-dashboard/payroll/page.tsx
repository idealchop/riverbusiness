'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  Printer,
  Search,
  ArrowRight
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
import { useUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, limit, doc } from 'firebase/firestore';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { RunPayrollDialog } from '@/components/hr/RunPayrollDialog';
import { cn } from '@/lib/utils';
import { FullScreenLoader } from '@/components/ui/loader';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AppUser, HRPayrollRun } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const ITEMS_PER_PAGE = 10;

const DEMO_PAYROLL: HRPayrollRun[] = [
    { 
        id: 'PR-2025-05-SR', 
        companyId: 'demo', 
        periodStart: format(startOfMonth(new Date()), 'yyyy-MM-dd'), 
        periodEnd: format(endOfMonth(new Date()), 'yyyy-MM-dd'), 
        status: 'paid', 
        totalNetSalary: 385000, 
        employeeCount: 3,
        createdAt: Timestamp.now(),
        breakdown: [
            { employeeId: 'e1', employeeName: 'Marcus Rivera', amount: 45000, rate: 45000, type: 'monthly' },
            { employeeId: 'e2', employeeName: 'Sarah Jenkins', amount: 38000, rate: 38000, type: 'monthly' },
            { employeeId: 'e3', employeeName: 'Leo Castelo', amount: 18700, rate: 850, daysWorked: 22, type: 'daily' },
        ]
    }
];

export default function PayrollPage() {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [viewingRun, setViewingRun] = useState<HRPayrollRun | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const companyId = user?.companyId || user?.clientId || 'default';

  const payrollQuery = useMemoFirebase(
    () => (firestore && companyId !== 'default') ? query(collection(firestore, 'hr_companies', companyId, 'payrollRuns'), orderBy('createdAt', 'desc')) : null,
    [firestore, companyId]
  );
  const { data: payrollRuns, isLoading } = useCollection<HRPayrollRun>(payrollQuery);

  const ownerQuery = useMemoFirebase(
    () => (firestore && companyId !== 'default') ? query(collection(firestore, 'users'), where('companyId', '==', companyId), where('hrRole', '==', 'owner'), limit(1)) : null,
    [firestore, companyId]
  );
  const { data: owners } = useCollection<AppUser>(ownerQuery);
  const owner = owners?.[0];

  const companyName = owner?.businessName || user?.businessName || 'River Philippines';
  const companyAddress = owner?.address || user?.address || 'Authorized Business Entity';

  const filteredPayroll = useMemo(() => {
    const list = payrollRuns && payrollRuns.length > 0 ? payrollRuns : (companyId === 'demo' || !payrollRuns ? DEMO_PAYROLL : []);
    if (!searchTerm) return list;
    const s = searchTerm.toLowerCase();
    return list.filter(run => 
        run.id.toLowerCase().includes(s) || 
        run.periodStart.includes(s) ||
        run.periodEnd.includes(s)
    );
  }, [payrollRuns, searchTerm, companyId]);

  const totalPages = Math.ceil(filteredPayroll.length / ITEMS_PER_PAGE);
  const paginatedPayroll = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayroll.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPayroll, currentPage]);

  const totalDisbursed = useMemo(() => {
    return filteredPayroll.reduce((sum, run) => sum + (Number(run?.totalNetSalary) || 0), 0);
  }, [filteredPayroll]);

  const handleDownloadStatement = (run: HRPayrollRun) => {
    const doc = new jsPDF('p', 'pt');
    const pageWidth = doc.internal.pageSize.width;
    const margin = 40;

    doc.setFillColor(83, 142, 194);
    doc.rect(0, 0, pageWidth, 120, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, margin, 55);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(companyAddress, margin, 75);
    doc.text(`Authorized signatory: ${user?.name || 'Administrator'}`, margin, 87);

    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Certificate of payroll disbursement', margin, 160);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Transaction reference: ${run.id}`, margin, 185);
    doc.text(`Statement period: ${format(new Date(run.periodStart), 'MMM d')} - ${format(new Date(run.periodEnd), 'MMM d, yyyy')}`, margin, 200);

    autoTable(doc, {
        startY: 230,
        head: [['Disbursement item', 'Currency', 'Amount']],
        body: [
            ['Total net salaries', 'PHP', run.totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })],
            ['Employee headcount', '-', run.employeeCount || 'N/A'],
            ['Payment status', '-', run.status.toUpperCase()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [83, 142, 194], textColor: 255 },
        margin: { left: margin, right: margin },
    });

    if (run.breakdown && run.breakdown.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Employee breakdown', margin, (doc as any).lastAutoTable.finalY + 30);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 45,
            head: [['Employee', 'Type', 'Workload', 'Net payout']],
            body: run.breakdown.map(item => [
                item.employeeName,
                item.type.charAt(0).toUpperCase() + item.type.slice(1),
                item.type === 'daily' ? `${item.daysWorked} days` : 'Fixed',
                `P${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: 0 },
            margin: { left: margin, right: margin },
        });
    }

    doc.save(`Payroll_Statement_${run.id}.pdf`);
  };

  if (isAuthLoading || isUserDocLoading) return <FullScreenLoader text="Syncing Engine..." />;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payroll Engine</h1>
          <p className="text-slate-500 font-medium text-sm">Automated salary computation and disbursement intelligence.</p>
        </div>
        <Button 
            onClick={() => setIsPayrollDialogOpen(true)}
            className="rounded-xl h-11 px-8 font-bold shadow-xl shadow-primary/20"
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
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/30 border-b p-6 md:p-8">
               <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">Transaction History</CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-500 uppercase mt-1 tracking-widest">Authorized audit trail</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-widest px-3 h-6">
                      {filteredPayroll.length} Cycles Logged
                  </Badge>
               </div>
            </CardHeader>
            <CardContent className="p-0">
               {/* Desktop Table */}
               <div className="hidden md:block">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-none">
                        <TableHead className="pl-8 font-bold text-[10px] uppercase tracking-wider text-slate-400 py-4">Statement Cycle</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Headcount</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Net Total</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Status</TableHead>
                        <TableHead className="text-right pr-8 font-bold text-[10px] uppercase tracking-wider text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-50 font-bold text-xs uppercase tracking-widest">Accessing records...</TableCell></TableRow>
                      ) : paginatedPayroll.map(run => (
                        <TableRow key={run.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0 group">
                          <TableCell className="pl-8 py-5">
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-slate-900">{run.periodStart ? format(new Date(run.periodStart), 'MMM d') : 'N/A'} - {run.periodEnd ? format(new Date(run.periodEnd), 'MMM d, yyyy') : 'N/A'}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {run.id}</p>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-xs font-semibold text-slate-500">{run.employeeCount || 0} Staff</span></TableCell>
                          <TableCell><span className="text-sm font-black text-slate-900 tabular-nums">₱{(run.totalNetSalary || 0).toLocaleString()}</span></TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[10px] font-bold uppercase border-none px-3 h-6",
                              run.status === 'paid' ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                            )}>
                              {run.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setViewingRun(run)} className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest bg-white border-slate-200">
                                    <Eye className="mr-2 h-3 w-3" /> View
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDownloadStatement(run)} className="rounded-xl h-9 w-9 text-slate-400 hover:text-primary transition-all">
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
               </div>

               {/* Mobile Cards */}
               <div className="md:hidden divide-y divide-slate-50">
                  {isLoading ? (
                    <div className="py-20 text-center opacity-40 font-bold uppercase text-[10px]">Synchronizing...</div>
                  ) : paginatedPayroll.map(run => (
                    <div key={run.id} className="p-4 space-y-4 hover:bg-slate-50/50 transition-colors" onClick={() => setViewingRun(run)}>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-slate-900">{run.periodStart ? format(new Date(run.periodStart), 'MMM d') : 'N/A'} - {run.periodEnd ? format(new Date(run.periodEnd), 'MMM d, y') : 'N/A'}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{run.id}</p>
                            </div>
                            <Badge className={cn(
                              "text-[9px] font-bold uppercase px-3 h-6",
                              run.status === 'paid' ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                            )}>{run.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Headcount</p>
                                <p className="text-xs font-bold text-slate-700">{run.employeeCount || 0} Staff</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Net Disbursed</p>
                                <p className="text-sm font-black text-slate-900">₱{(run.totalNetSalary || 0).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button variant="outline" className="flex-1 h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest">View Detail</Button>
                            <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl border-slate-200" onClick={(e) => { e.stopPropagation(); handleDownloadStatement(run); }}>
                                <Download className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                  ))}
               </div>

               {!isLoading && filteredPayroll.length === 0 && (
                  <div className="py-24 text-center opacity-20 flex flex-col items-center gap-4">
                      <DollarSign className="h-12 w-12" />
                      <p className="text-xs font-black uppercase tracking-[0.3em]">No Payroll Data Found</p>
                  </div>
               )}
            </CardContent>
            <PaginationFooter 
                totalItems={filteredPayroll.length}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
            />
          </Card>
      </div>

      <RunPayrollDialog
        isOpen={isPayrollDialogOpen}
        onOpenChange={setIsPayrollDialogOpen}
        companyId={companyId}
      />

      {/* Disbursement Detail Dialog */}
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
                                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs uppercase">
                                                        {item.employeeName.charAt(0)}
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900">{item.employeeName}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-100 bg-white shadow-none capitalize">
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

function PaginationFooter({ totalItems, currentPage, onPageChange }: { totalItems: number, currentPage: number, onPageChange: (p: number) => void }) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    if (totalItems === 0) return null;

    return (
        <CardFooter className="bg-slate-50/30 py-4 flex items-center justify-between border-t">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Showing {Math.min(totalItems, (currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(totalItems, currentPage * ITEMS_PER_PAGE)} of {totalItems} entries
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] uppercase font-bold" 
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))} 
                    disabled={currentPage === 1}
                >
                    Prev
                </Button>
                <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400 px-2">{currentPage} / {totalPages || 1}</span>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] uppercase font-bold" 
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} 
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    Next
                </Button>
            </div>
        </CardFooter>
    );
}
