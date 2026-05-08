'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Clock, 
  CalendarDays, 
  DollarSign, 
  Download,
  FileText,
  TrendingUp,
  History,
  ChevronRight,
  ShieldCheck,
  Building,
  CheckCircle2,
  Printer,
  MapPin,
  Briefcase,
  UserCircle,
  Filter,
  Mail,
  Loader2,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, where, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { format, subDays, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { FullScreenLoader } from '@/components/ui/loader';
import type { AppUser, HRAttendanceLog, HRLeaveRequest, HRPayrollRun } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmployeeDetailsDialog } from '@/components/hr/EmployeeDetailsDialog';
import { useToast } from '@/hooks/use-toast';

const DEPARTMENTS = ['All Departments', 'Logistics', 'Support', 'Fleet', 'Admin', 'Compliance', 'Operations'];

const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const formatDuration = (minutes?: number) => {
    if (!minutes) return '--:--';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
};

const DEMO_ATTENDANCE: HRAttendanceLog[] = [
    { id: 'att1', companyId: 'demo', employeeId: 'e1', employeeName: 'Marcus Rivera', date: format(new Date(), 'yyyy-MM-dd'), timeIn: Timestamp.now(), status: 'present', method: 'QR', validation_status: 'Valid', action: 'IN' },
    { id: 'att2', companyId: 'demo', employeeId: 'e2', employeeName: 'Sarah Jenkins', date: format(new Date(), 'yyyy-MM-dd'), timeIn: Timestamp.now(), status: 'present', method: 'QR', validation_status: 'Valid', action: 'IN' },
    { id: 'att3', companyId: 'demo', employeeId: 'e3', employeeName: 'Leo Castelo', date: format(new Date(), 'yyyy-MM-dd'), timeIn: Timestamp.now(), status: 'present', method: 'manual', validation_status: 'Valid', action: 'IN' },
];

const DEMO_LEAVES: HRLeaveRequest[] = [
    { id: 'l1', companyId: 'demo', employeeId: 'e4', employeeName: 'Elena Cruz', type: 'Vacation', startDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'), reason: 'Family Reunion', status: 'pending', appliedAt: Timestamp.now() },
    { id: 'l2', companyId: 'demo', employeeId: 'e2', employeeName: 'Sarah Jenkins', type: 'Sick', startDate: format(subDays(new Date(), 2), 'yyyy-MM-dd'), endDate: format(subDays(new Date(), 2), 'yyyy-MM-dd'), reason: 'Fever', status: 'approved', appliedAt: Timestamp.now() },
];

const DEMO_PAYROLL: HRPayrollRun[] = [
    { 
        id: 'PR-2025-05', 
        companyId: 'demo', 
        periodStart: format(startOfMonth(new Date()), 'yyyy-MM-dd'), 
        periodEnd: format(endOfMonth(new Date()), 'yyyy-MM-dd'), 
        status: 'paid', 
        totalNetSalary: 385000, 
        createdAt: Timestamp.now(),
        breakdown: [
            { employeeId: 'e1', employeeName: 'Marcus Rivera', amount: 45000, rate: 45000, type: 'monthly' },
            { employeeId: 'e2', employeeName: 'Sarah Jenkins', amount: 38000, rate: 38000, type: 'monthly' },
            { employeeId: 'e3', employeeName: 'Leo Castelo', amount: 18700, rate: 850, daysWorked: 22, type: 'daily' },
        ]
    },
    { 
        id: 'PR-2025-04', 
        companyId: 'demo', 
        periodStart: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), 
        periodEnd: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), 
        status: 'paid', 
        totalNetSalary: 372000, 
        createdAt: Timestamp.now(),
        breakdown: [
            { employeeId: 'e1', employeeName: 'Marcus Rivera', amount: 45000, rate: 45000, type: 'monthly' },
            { employeeId: 'e4', employeeName: 'Elena Cruz', amount: 30000, rate: 30000, type: 'monthly' },
        ]
    },
];

const ITEMS_PER_PAGE = 10;

export default function AttendancePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveTab] = useState('attendance');
  const [selectedDisbursement, setSelectedDisbursement] = useState<any | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<AppUser | null>(null);
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<any | null>(null);

  // Pagination states for each tab
  const [attendancePage, setAttendancePage] = useState(1);
  const [leavePage, setLeavePage] = useState(1);
  const [payrollPage, setPayrollPage] = useState(1);

  const companyId = user?.companyId || user?.clientId || 'default';

  // --- Data Queries ---
  const attendanceQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'hr_companies', companyId, 'attendance'), orderBy('date', 'desc')) : null,
    [firestore, companyId]
  );
  const { data: attendanceLogs, isLoading: loadingAttendance } = useCollection<HRAttendanceLog>(attendanceQuery);

  const leaveQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'hr_companies', companyId, 'leaveRequests'), orderBy('appliedAt', 'desc')) : null,
    [firestore, companyId]
  );
  const { data: leaveRequests, isLoading: loadingLeaves } = useCollection<HRLeaveRequest>(leaveQuery);

  const payrollQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'hr_companies', companyId, 'payrollRuns'), orderBy('createdAt', 'desc')) : null,
    [firestore, companyId]
  );
  const { data: payrollRuns, isLoading: loadingPayroll } = useCollection<HRPayrollRun>(payrollQuery);

  const usersQuery = useMemoFirebase(
      () => (firestore && companyId) ? query(collection(firestore, 'users'), where('companyId', '==', companyId)) : null,
      [firestore, companyId]
  );
  const { data: allUsers } = useCollection<AppUser>(usersQuery);

  const ownerQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'users'), where('companyId', '==', companyId), where('hrRole', '==', 'owner'), limit(1)) : null,
    [firestore, companyId]
  );
  const { data: owners } = useCollection<AppUser>(ownerQuery);
  const owner = owners?.[0];

  const companyName = owner?.businessName || user?.businessName || 'River Philippines';
  const companyAddress = owner?.address || user?.address || 'Authorized Business Entity';

  // --- Filtering Logic ---
  
  const displayAttendance = useMemo(() => {
    let list = attendanceLogs && attendanceLogs.length > 0 ? attendanceLogs : DEMO_ATTENDANCE;
    const search = searchTerm.toLowerCase().trim();
    
    return list.filter(log => {
        const matchesSearch = !search || log.employeeName?.toLowerCase().includes(search) || log.date.includes(search);
        
        // Filter by department if selected
        const employee = allUsers?.find(u => u.id === log.employeeId);
        const matchesDept = selectedDept === 'All Departments' || employee?.hrProfile?.department === selectedDept;
        
        return matchesSearch && matchesDept;
    });
  }, [attendanceLogs, searchTerm, selectedDept, allUsers]);

  const displayLeaves = useMemo(() => {
    let list = leaveRequests && leaveRequests.length > 0 ? leaveRequests : DEMO_LEAVES;
    const search = searchTerm.toLowerCase().trim();
    
    return list.filter(req => {
        const matchesSearch = !search || req.employeeName?.toLowerCase().includes(search) || req.type.toLowerCase().includes(search);
        
        const employee = allUsers?.find(u => u.id === req.employeeId);
        const matchesDept = selectedDept === 'All Departments' || employee?.hrProfile?.department === selectedDept;
        
        return matchesSearch && matchesDept;
    });
  }, [leaveRequests, searchTerm, selectedDept, allUsers]);

  // Flattened Payroll - Each item is for one employee in one period
  const displayPayrollItems = useMemo(() => {
    const runs = payrollRuns && payrollRuns.length > 0 ? payrollRuns : DEMO_PAYROLL;
    const search = searchTerm.toLowerCase().trim();
    
    const flattened = runs.flatMap(run => 
        (run.breakdown || []).map(item => ({
            ...item,
            runId: run.id,
            periodStart: run.periodStart,
            periodEnd: run.periodEnd,
            status: run.status,
            createdAt: run.createdAt
        }))
    );

    return flattened.filter(item => {
        const matchesSearch = !search || 
            item.employeeName.toLowerCase().includes(search) || 
            item.runId.toLowerCase().includes(search);
            
        const employee = allUsers?.find(u => u.id === item.employeeId);
        const matchesDept = selectedDept === 'All Departments' || employee?.hrProfile?.department === selectedDept;
        
        return matchesSearch && matchesDept;
    });
  }, [payrollRuns, searchTerm, selectedDept, allUsers]);

  // --- Pagination Logic ---
  const paginatedAttendance = useMemo(() => {
    const start = (attendancePage - 1) * ITEMS_PER_PAGE;
    return displayAttendance.slice(start, start + ITEMS_PER_PAGE);
  }, [displayAttendance, attendancePage]);

  const paginatedLeaves = useMemo(() => {
    const start = (leavePage - 1) * ITEMS_PER_PAGE;
    return displayLeaves.slice(start, start + ITEMS_PER_PAGE);
  }, [displayLeaves, leavePage]);

  const paginatedPayroll = useMemo(() => {
    const start = (payrollPage - 1) * ITEMS_PER_PAGE;
    return displayPayrollItems.slice(start, start + ITEMS_PER_PAGE);
  }, [displayPayrollItems, payrollPage]);

  const handleOpenPayslip = (item: any) => {
    setSelectedDisbursement(item);
  };

  const handleEmployeeClick = (employeeId: string) => {
    const found = allUsers?.find(u => u.id === employeeId);
    if (found) {
        setSelectedEmployee(found);
    }
  };

  const handleSendEmail = async (item: any) => {
    if (!firestore || !companyId || !user) return;
    setSendingEmailId(`${item.runId}-${item.employeeId}`);
    
    try {
        const requestsCol = collection(firestore, 'hr_companies', companyId, 'payslipRequests');
        await addDoc(requestsCol, {
            ...item,
            companyId,
            adminName: user.name,
            requestedAt: serverTimestamp(),
            status: 'pending'
        });

        toast({ title: 'Dispatch Authorized', description: `Payslip for ${item.employeeName} is being prepared for delivery.` });
    } catch (error) {
        console.error("Failed to trigger payslip email:", error);
        toast({ variant: 'destructive', title: 'Action Failed' });
    } finally {
        setTimeout(() => setSendingEmailId(null), 2000);
        setConfirmItem(null);
    }
  };

  const handleDownloadIndividualPDF = (item: any) => {
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
    doc.text('Employee payslip certificate', margin, 160);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Statement period: ${format(new Date(item.periodStart), 'MMM d')} - ${format(new Date(item.periodEnd), 'MMM d, yyyy')}`, margin, 185);
    doc.text(`Employee: ${item.employeeName}`, margin, 200);

    autoTable(doc, {
        startY: 230,
        head: [['Component', 'Basis', 'Amount']],
        body: [
            ['Basic salary', item.type === 'daily' ? `${item.daysWorked} days at P${item.rate}` : 'Monthly fixed', `P${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
            ['Net payout', 'Total', `P${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
            ['Status', '-', 'Settled'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [83, 142, 194], textColor: 255 },
        margin: { left: margin, right: margin },
    });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    const footerY = (doc as any).lastAutoTable.finalY + 40;
    doc.text('This is an individual disbursement record authorized by the company administrator.', margin, footerY);

    doc.save(`Payslip_${item.employeeName.replace(/\s/g, '_')}_${item.runId}.pdf`);
  };

  if (isUserLoading) return <FullScreenLoader text="Loading Records..." />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
             Team Records
          </h1>
          <p className="text-slate-500 font-medium text-sm">
             Browse work, leave, and individual payment records across the organization.
          </p>
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-2xl h-12 border shadow-inner w-full md:w-auto">
          <TabsTrigger value="attendance" className="rounded-xl px-6 font-bold text-xs tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-xl px-6 font-bold text-xs tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Leave logs
          </TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-xl px-6 font-bold text-xs tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Payroll
          </TabsTrigger>
        </TabsList>

        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/30 p-6 border-b">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder={`Search by employee name...`} 
                  className="pl-10 h-11 bg-white border-slate-200 rounded-xl font-medium shadow-none focus-visible:ring-primary"
                  value={searchTerm}
                  onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setAttendancePage(1);
                      setLeavePage(1);
                      setPayrollPage(1);
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2 border-slate-200 bg-white h-11 px-4 shadow-sm">
                            <Filter className="h-3.5 w-3.5 text-primary" /> {selectedDept}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-slate-200 p-1 shadow-2xl">
                        <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400 p-2">Filter by Department</DropdownMenuLabel>
                        {DEPARTMENTS.map(dept => (
                            <DropdownMenuItem 
                                key={dept} 
                                onClick={() => {
                                    setSelectedDept(dept);
                                    setAttendancePage(1);
                                    setLeavePage(1);
                                    setPayrollPage(1);
                                }}
                                className={cn("rounded-lg font-semibold text-xs py-2 cursor-pointer", selectedDept === dept && "bg-slate-50")}
                            >
                                {dept}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <TabsContent value="attendance" className="m-0 focus-visible:ring-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="pl-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">Date</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Employee</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Time In</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Time Out</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Total Time</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAttendance ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 animate-pulse font-medium text-slate-400">Loading ledger...</TableCell></TableRow>
                  ) : paginatedAttendance.map((log) => {
                    const timeIn = toSafeDate(log.timeIn);
                    const timeOut = toSafeDate(log.timeOut);
                    return (
                      <TableRow key={log.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0 group">
                        <TableCell className="pl-6 py-4">
                           <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm">{log.date ? format(new Date(log.date), 'MMM d, yyyy') : 'N/A'}</span>
                           </div>
                        </TableCell>
                        <TableCell>
                          <button onClick={() => handleEmployeeClick(log.employeeId)} className="flex items-center gap-3 hover:text-primary transition-colors text-left outline-none group/name">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs uppercase group-hover/name:bg-primary/10 group-hover/name:text-primary">
                              {log.employeeName?.charAt(0) || 'E'}
                            </div>
                            <p className="text-sm font-bold text-slate-700 group-hover/name:text-primary underline-offset-4 group-hover/name:underline">{log.employeeName}</p>
                          </button>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-600">{timeIn ? format(timeIn, 'hh:mm a') : '--:--'}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-600">{timeOut ? format(timeOut, 'hh:mm a') : '--:--'}</TableCell>
                        <TableCell className="text-xs font-black text-primary uppercase tracking-tighter">{formatDuration(log.totalMinutes)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge className={cn(
                            "text-[10px] font-bold uppercase border-none px-3 h-6 shadow-sm",
                            log.validation_status === 'Valid' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                          )}>
                            {log.status || 'present'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <PaginationFooter 
                totalItems={displayAttendance.length}
                currentPage={attendancePage}
                onPageChange={setAttendancePage}
              />
            </TabsContent>

            <TabsContent value="leaves" className="m-0 focus-visible:ring-0">
               <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="pl-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">Period</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Employee</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Category</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Reason</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLeaves ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 animate-pulse font-medium text-slate-400">Loading history...</TableCell></TableRow>
                  ) : paginatedLeaves.map(req => (
                    <TableRow key={req.id} className="hover:bg-slate-50/30 border-b border-slate-50 last:border-0 group">
                      <TableCell className="pl-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{req.startDate ? format(new Date(req.startDate), 'MMM d') : ''} - {req.endDate ? format(new Date(req.endDate), 'MMM d, yyyy') : ''}</p>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handleEmployeeClick(req.employeeId)} className="text-sm font-bold text-slate-700 hover:text-primary transition-colors underline-offset-4 hover:underline">{req.employeeName}</button>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px] font-bold uppercase bg-slate-50">{req.type}</Badge></TableCell>
                      <TableCell className="max-w-xs"><p className="text-xs text-slate-500 italic truncate">"{req.reason}"</p></TableCell>
                      <TableCell className="text-right pr-6">
                          <Badge className={cn(
                              "text-[10px] font-bold uppercase border-none px-3 h-6 shadow-sm",
                              req.status === 'approved' ? "bg-green-50 text-green-700" : 
                              req.status === 'pending' ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                          )}>
                              {req.status}
                          </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationFooter 
                totalItems={displayLeaves.length}
                currentPage={leavePage}
                onPageChange={setLeavePage}
              />
            </TabsContent>

            <TabsContent value="payroll" className="m-0 focus-visible:ring-0">
               <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="pl-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">Employee</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Statement Cycle</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Basis</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Net Disbursement</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPayroll ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 animate-pulse font-medium text-slate-400">Loading disbursement data...</TableCell></TableRow>
                  ) : paginatedPayroll.map((item, idx) => {
                    const isSending = sendingEmailId === `${item.runId}-${item.employeeId}`;
                    return (
                    <TableRow key={`${item.runId}-${item.employeeId}-${idx}`} className="hover:bg-slate-50/30 border-b border-slate-50 last:border-0 group">
                      <TableCell className="pl-6 py-4">
                        <button onClick={() => handleEmployeeClick(item.employeeId)} className="text-sm font-bold text-slate-700 hover:text-primary transition-colors">{item.employeeName}</button>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{item.runId}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-semibold text-slate-600">{format(new Date(item.periodStart), 'MMM d')} - {format(new Date(item.periodEnd), 'MMM d, yyyy')}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-medium text-slate-500">
                            {item.type === 'daily' ? `${item.daysWorked} days at ₱${item.rate}` : `Fixed Monthly`}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">₱{item.amount?.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleOpenPayslip(item)} className="h-8 font-bold text-[10px] uppercase tracking-widest gap-2 text-primary hover:bg-primary/5">
                                <FileText className="h-3.5 w-3.5" />
                                Statement
                            </Button>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                disabled={isSending}
                                onClick={() => setConfirmItem(item)}
                                className={cn(
                                    "h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all",
                                    isSending && "opacity-50"
                                )}
                            >
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                          </div>
                      </TableCell>
                    </TableRow>
                  )})}
                  {!loadingPayroll && paginatedPayroll.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-300 font-bold uppercase text-[10px] tracking-widest">No individual disbursement logs found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <PaginationFooter 
                totalItems={displayPayrollItems.length}
                currentPage={payrollPage}
                onPageChange={setPayrollPage}
              />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Individual Disbursement View Dialog */}
      <Dialog open={!!selectedDisbursement} onOpenChange={(open) => { if (!open) setSelectedDisbursement(null); }}>
        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden bg-white">
            <div className="bg-slate-900 text-white p-8">
                <DialogHeader>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                                <DollarSign className="h-6 w-6 text-primary-light" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight">Individual statement</DialogTitle>
                                <DialogDescription className="text-slate-400 font-medium text-xs mt-1">
                                    Disbursement summary for {selectedDisbursement?.employeeName}.
                                </DialogDescription>
                            </div>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 font-bold uppercase text-[10px] tracking-widest h-7 px-4">
                            Settled
                        </Badge>
                    </div>
                </DialogHeader>
            </div>

            <ScrollArea className="max-h-[60vh]">
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8 border-b border-slate-100 pb-8">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-400">Statement reference</Label>
                            <p className="text-sm font-bold text-slate-900">{selectedDisbursement?.runId}</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <Label className="text-[10px] font-bold text-slate-400">Reporting period</Label>
                            <p className="text-sm font-bold text-slate-900">
                                {selectedDisbursement ? `${format(new Date(selectedDisbursement.periodStart), 'MMM d')} - ${format(new Date(selectedDisbursement.periodEnd), 'MMM d, yyyy')}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Building className="h-3.5 w-3.5" /> Client organization
                                </h4>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-slate-900">{companyName}</p>
                                    <p className="text-xs text-slate-500">{companyAddress}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <UserCircle className="h-3.5 w-3.5" /> Employee entity
                                </h4>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-slate-900">{selectedDisbursement?.employeeName}</p>
                                    <p className="text-xs text-slate-500 capitalize">{selectedDisbursement?.type} basis</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                             <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-[10px] font-bold text-slate-400">Net disbursement</p>
                                <p className="text-3xl font-bold text-slate-900 tabular-nums">₱{selectedDisbursement?.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                             <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                                <Briefcase className="h-4 w-4 text-primary" />
                                <p className="text-xs font-bold text-primary">Organizational disbursement active</p>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>

            <DialogFooter className="p-8 pt-4 bg-white border-t flex flex-col md:flex-row justify-end items-center gap-3">
                <Button 
                    variant="outline" 
                    onClick={() => selectedDisbursement && handleDownloadIndividualPDF(selectedDisbursement)}
                    className="w-full md:w-auto rounded-xl h-11 px-8 font-bold text-xs shadow-sm border-slate-200"
                >
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <DialogClose asChild>
                    <Button variant="ghost" className="w-full md:w-auto rounded-xl h-11 px-10 font-bold text-xs text-slate-400 hover:text-slate-900">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmployeeDetailsDialog 
        employee={selectedEmployee}
        isOpen={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
      />

      <AlertDialog open={!!confirmItem} onOpenChange={(open) => !open && setConfirmItem(null)}>
        <AlertDialogContent className="rounded-3xl border-none p-10 shadow-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Authorize Dispatch?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed pt-2">
              This will send the personalized payslip and statement for <span className="font-bold text-slate-900">{confirmItem?.employeeName}</span> to their registered email address. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-xl font-bold text-xs uppercase tracking-widest h-11 px-8">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSendEmail(confirmItem)} className="bg-primary text-white hover:bg-primary/90 rounded-xl font-bold text-xs uppercase tracking-widest h-11 px-8">Confirm & Send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
