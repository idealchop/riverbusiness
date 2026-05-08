'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { AppUser, HRAttendanceLog, HRLeaveRequest } from '@/lib/types';
import { 
  Briefcase, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  UserCircle,
  CalendarDays,
  Clock,
  LayoutDashboard,
  TrendingUp,
  Activity,
  AlertCircle,
  Save,
  UserCog,
  CheckCircle2,
  Edit,
  HeartPulse,
  Landmark,
  FileText,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Safe date conversion helper
const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
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

interface EmployeeDetailsDialogProps {
  employee: AppUser | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: string;
}

export function EmployeeDetailsDialog({ employee, isOpen, onOpenChange, initialTab = 'overview' }: EmployeeDetailsDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const companyId = employee?.companyId || 'default';
  
  const attendanceQuery = useMemoFirebase(
    () => (firestore && employee?.id && companyId) ? query(
        collection(firestore, 'hr_companies', companyId, 'attendance'),
        where('employeeId', '==', employee.id),
        orderBy('date', 'desc')
    ) : null,
    [firestore, employee?.id, companyId]
  );
  const { data: attendanceLogs, isLoading: loadingAttendance } = useCollection<HRAttendanceLog>(attendanceQuery);

  const leaveQuery = useMemoFirebase(
    () => (firestore && employee?.id && companyId) ? query(
        collection(firestore, 'hr_companies', companyId, 'leaveRequests'),
        where('employeeId', '==', employee.id),
        orderBy('appliedAt', 'desc')
    ) : null,
    [firestore, employee?.id, companyId]
  );
  const { data: leaveRequests, isLoading: loadingLeaves } = useCollection<HRLeaveRequest>(leaveQuery);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
      if (isOpen && employee) {
          setActiveTab(initialTab);
          setEditData({
              position: employee.hrProfile?.position || '',
              department: employee.hrProfile?.department || '',
              rate: employee.hrProfile?.rate || 0,
              salaryType: employee.hrProfile?.salaryType || 'monthly',
              status: employee.hrProfile?.status || 'Active',
              sssNumber: employee.hrProfile?.sssNumber || '',
              philhealthNumber: employee.hrProfile?.philhealthNumber || '',
              pagibigNumber: employee.hrProfile?.pagibigNumber || '',
              tinNumber: employee.hrProfile?.tinNumber || '',
              sssDeduction: employee.hrProfile?.sssDeduction || 0,
              philhealthDeduction: employee.hrProfile?.philhealthDeduction || 0,
              pagibigDeduction: employee.hrProfile?.pagibigDeduction || 0,
              taxDeduction: employee.hrProfile?.taxDeduction || 0
          });
          setIsEditing(false);
      }
  }, [isOpen, employee, initialTab]);

  const metrics = useMemo(() => {
    const logs = attendanceLogs || [];
    const total = logs.length;
    if (total === 0) return { punctuality: 100, hoursWorked: 0, attendanceCount: 0 };
    
    const onTime = logs.filter(l => l.status === 'present').length;
    const punctuality = (onTime / total) * 100;
    const hours = logs.reduce((sum, l) => sum + (l.totalMinutes || 0), 0) / 60;
    
    return { punctuality, hoursWorked: hours, attendanceCount: total };
  }, [attendanceLogs]);

  const handleSaveProfile = async () => {
    if (!firestore || !employee) return;
    setIsSaving(true);
    try {
        const userRef = doc(firestore, 'users', employee.id);
        const updatePayload = {
            'hrProfile.position': editData.position,
            'hrProfile.department': editData.department,
            'hrProfile.rate': Number(editData.rate),
            'hrProfile.salaryType': editData.salaryType,
            'hrProfile.status': editData.status,
            'hrProfile.sssNumber': editData.sssNumber,
            'hrProfile.philhealthNumber': editData.philhealthNumber,
            'hrProfile.pagibigNumber': editData.pagibigNumber,
            'hrProfile.tinNumber': editData.tinNumber,
            'hrProfile.sssDeduction': Number(editData.sssDeduction),
            'hrProfile.philhealthDeduction': Number(editData.philhealthDeduction),
            'hrProfile.pagibigDeduction': Number(editData.pagibigDeduction),
            'hrProfile.taxDeduction': Number(editData.taxDeduction)
        };
        await updateDoc(userRef, updatePayload);
        toast({ title: 'Profile Updated', description: 'Employment and benefit details have been saved.' });
        setIsEditing(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save changes.' });
    } finally {
        setIsSaving(false);
    }
  };

  if (!employee) return null;

  const profile = employee.hrProfile;
  const initials = employee.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-[2.5rem] border-none p-0 overflow-hidden flex flex-col h-[90vh] bg-white shadow-3xl">
        {/* Header - Fixed */}
        <div className="p-8 pb-4 shrink-0">
            <DialogHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400 shadow-inner">
                            {initials}
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-3xl font-bold tracking-tight text-slate-900">{employee.name || 'Anonymous'}</DialogTitle>
                            <div className="flex items-center gap-3">
                                <Badge className={cn(
                                    "border-none text-[10px] font-bold px-3 py-1",
                                    profile?.status === 'Active' ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                                )}>
                                    {profile?.status || 'Active'}
                                </Badge>
                                <span className="text-sm font-medium text-slate-500">
                                    {profile?.employeeNumber || 'ID Pending'} • {profile?.position || 'Unassigned'} • {profile?.department || 'General'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogHeader>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            {/* Tabs List - Fixed */}
            <div className="px-8 border-b border-slate-50 shrink-0">
                <TabsList className="bg-transparent h-12 p-0 gap-8">
                    <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-semibold text-sm tracking-tight px-0">Overview</TabsTrigger>
                    <TabsTrigger value="performance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-semibold text-sm tracking-tight px-0">Performance</TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-semibold text-sm tracking-tight px-0">Attendance</TabsTrigger>
                    <TabsTrigger value="leaves" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none font-semibold text-sm tracking-tight px-0">Leaves</TabsTrigger>
                </TabsList>
            </div>

            {/* Content Area - Scrollable */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-8">
                    <TabsContent value="overview" className="mt-0 space-y-10 animate-in fade-in duration-500">
                        {isEditing ? (
                            <div className="space-y-12 pb-10">
                                <div className="space-y-6">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Briefcase className="h-4 w-4" /> Employment Configuration
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Position Title</Label>
                                            <Input value={editData.position} onChange={(e) => setEditData({...editData, position: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-slate-100" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Department</Label>
                                            <Select value={editData.department} onValueChange={(v) => setEditData({...editData, department: v})}>
                                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="Logistics">Logistics</SelectItem>
                                                    <SelectItem value="Support">Support</SelectItem>
                                                    <SelectItem value="Fleet">Fleet</SelectItem>
                                                    <SelectItem value="Admin">Admin</SelectItem>
                                                    <SelectItem value="Compliance">Compliance</SelectItem>
                                                    <SelectItem value="Operations">Operations</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Salary Type</Label>
                                            <Select value={editData.salaryType} onValueChange={(v) => setEditData({...editData, salaryType: v})}>
                                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="daily">Daily Rate</SelectItem>
                                                    <SelectItem value="weekly">Weekly Rate</SelectItem>
                                                    <SelectItem value="bimonthly">Bimonthly Rate</SelectItem>
                                                    <SelectItem value="monthly">Monthly Fixed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pay Rate (PHP)</Label>
                                            <Input type="number" value={editData.rate} onChange={(e) => setEditData({...editData, rate: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-slate-100" />
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-slate-50" />

                                <div className="space-y-6">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                        <HeartPulse className="h-3.5 w-3.5" /> Benefits & Statutory Details
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ID Credentials</p>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold">SSS Number</Label>
                                                    <Input value={editData.sssNumber} onChange={(e) => setEditData({...editData, sssNumber: e.target.value})} className="h-10 rounded-xl" placeholder="00-0000000-0" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold">PhilHealth ID</Label>
                                                    <Input value={editData.philhealthNumber} onChange={(e) => setEditData({...editData, philhealthNumber: e.target.value})} className="h-10 rounded-xl" placeholder="00-000000000-0" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold">Pag-IBIG MID</Label>
                                                    <Input value={editData.pagibigNumber} onChange={(e) => setEditData({...editData, pagibigNumber: e.target.value})} className="h-10 rounded-xl" placeholder="0000-0000-0000" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold">TIN</Label>
                                                    <Input value={editData.tinNumber} onChange={(e) => setEditData({...editData, tinNumber: e.target.value})} className="h-10 rounded-xl" placeholder="000-000-000-000" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Monthly Deductions (PHP)</p>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold">SSS Deduction</Label>
                                                    <Input type="number" value={editData.sssDeduction} onChange={(e) => setEditData({...editData, sssDeduction: e.target.value})} className="h-10 rounded-xl" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold">PhilHealth Deduction</Label>
                                                    <Input type="number" value={editData.philhealthDeduction} onChange={(e) => setEditData({...editData, philhealthDeduction: e.target.value})} className="h-10 rounded-xl" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold">Pag-IBIG Deduction</Label>
                                                    <Input type="number" value={editData.pagibigDeduction} onChange={(e) => setEditData({...editData, pagibigDeduction: e.target.value})} className="h-10 rounded-xl" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold">Withholding Tax</Label>
                                                    <Input type="number" value={editData.taxDeduction} onChange={(e) => setEditData({...editData, taxDeduction: e.target.value})} className="h-10 rounded-xl" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-8">
                                        <div className="space-y-6">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <UserCircle className="h-4 w-4" /> Personal & Contact
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4 group">
                                                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors"><Mail className="h-4 w-4" /></div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Login Email</p>
                                                        <p className="text-sm font-semibold text-slate-700">{employee.email || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 group">
                                                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors"><Phone className="h-4 w-4" /></div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Contact Number</p>
                                                        <p className="text-sm font-semibold text-slate-700">{employee.contactNumber || 'No Record'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4" /> Statutory Accounts
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Card className="border-none bg-slate-50/50 p-4 space-y-1">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase">SSS</p>
                                                    <p className="text-xs font-bold text-slate-900">{profile?.sssNumber || 'Unset'}</p>
                                                </Card>
                                                <Card className="border-none bg-slate-50/50 p-4 space-y-1">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase">PhilHealth</p>
                                                    <p className="text-xs font-bold text-slate-900">{profile?.philhealthNumber || 'Unset'}</p>
                                                </Card>
                                                <Card className="border-none bg-slate-50/50 p-4 space-y-1">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase">Pag-IBIG</p>
                                                    <p className="text-xs font-bold text-slate-900">{profile?.pagibigNumber || 'Unset'}</p>
                                                </Card>
                                                <Card className="border-none bg-slate-50/50 p-4 space-y-1">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase">TIN</p>
                                                    <p className="text-xs font-bold text-slate-900">{profile?.tinNumber || 'Unset'}</p>
                                                </Card>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-6">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <DollarSign className="h-4 w-4" /> Compensation Profile
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-2xl border border-slate-50 bg-slate-50/30 space-y-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Pay Rate</p>
                                                    <p className="text-lg font-bold text-slate-900">₱{(Number(profile?.rate) || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl border border-slate-50 bg-slate-50/30 space-y-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Cycle</p>
                                                    <p className="text-lg font-bold text-slate-900 capitalize">{profile?.salaryType || 'Monthly'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <Landmark className="h-4 w-4" /> Monthly Deductions
                                            </h4>
                                            <div className="p-6 rounded-[2rem] border border-slate-100 bg-white shadow-sm space-y-4">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">SSS Contribution</span>
                                                    <span className="font-bold text-slate-900">₱{(profile?.sssDeduction || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">PhilHealth</span>
                                                    <span className="font-bold text-slate-900">₱{(profile?.philhealthDeduction || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">Pag-IBIG</span>
                                                    <span className="font-bold text-slate-900">₱{(profile?.pagibigDeduction || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">Withholding Tax</span>
                                                    <span className="font-bold text-slate-900">₱{(profile?.taxDeduction || 0).toLocaleString()}</span>
                                                </div>
                                                <Separator className="bg-slate-50" />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black uppercase text-slate-400">Total Deductions</span>
                                                    <span className="text-sm font-black text-primary">₱{((profile?.sssDeduction || 0) + (profile?.philhealthDeduction || 0) + (profile?.pagibigDeduction || 0) + (profile?.taxDeduction || 0)).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="performance" className="mt-0 space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card className="rounded-3xl border-none bg-slate-50/50 p-6 space-y-4">
                                <CardContent className="p-0 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="p-2 rounded-xl bg-white shadow-sm text-green-600"><TrendingUp className="h-5 w-5" /></div>
                                        <p className="text-[10px] font-bold text-green-600 uppercase">Punctuality</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-3xl font-bold tracking-tight text-slate-900">{metrics.punctuality.toFixed(0)}%</p>
                                        <p className="text-xs font-medium text-slate-400">On-time rate</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="rounded-3xl border-none bg-slate-50/50 p-6 space-y-4">
                                <CardContent className="p-0 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="p-2 rounded-xl bg-white shadow-sm text-primary"><Activity className="h-5 w-5" /></div>
                                        <p className="text-[10px] font-bold text-primary uppercase">Volume</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-3xl font-bold tracking-tight text-slate-900">{metrics.hoursWorked.toFixed(1)}h</p>
                                        <p className="text-xs font-medium text-slate-400">Hours logged</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="rounded-3xl border-none bg-slate-50/50 p-6 space-y-4">
                                <CardContent className="p-0 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="p-2 rounded-xl bg-white shadow-sm text-amber-600"><AlertCircle className="h-5 w-5" /></div>
                                        <p className="text-[10px] font-bold text-amber-600 uppercase">Records</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-3xl font-bold tracking-tight text-slate-900">{metrics.attendanceCount}</p>
                                        <p className="text-xs font-medium text-slate-400">Total shifts</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="attendance" className="mt-0 animate-in fade-in duration-500">
                         <div className="rounded-3xl border border-slate-50 overflow-hidden bg-slate-50/20">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-none">
                                        <TableHead className="text-xs font-bold text-slate-400 pl-6">Work Date</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-400">Clock In</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-400">Clock Out</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-400">Duration</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-400 text-right pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingAttendance ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-12 opacity-50 font-bold uppercase text-[10px]">Syncing logs...</TableCell></TableRow>
                                    ) : attendanceLogs && attendanceLogs.length > 0 ? (
                                        attendanceLogs.map(log => {
                                            const workDate = toSafeDate(log.date);
                                            const timeIn = toSafeDate(log.timeIn);
                                            const timeOut = toSafeDate(log.timeOut);
                                            return (
                                                <TableRow key={log.id} className="hover:bg-white transition-colors border-b border-slate-50 last:border-0 group">
                                                    <TableCell className="text-sm font-bold text-slate-600 pl-6 py-5 group-hover:text-slate-900">
                                                      {workDate ? format(workDate, 'MMM d, yyyy') : 'No Date'}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-semibold text-slate-700">{timeIn ? format(timeIn, 'hh:mm a') : '--:--'}</TableCell>
                                                    <TableCell className="text-sm font-semibold text-slate-700">{timeOut ? format(timeOut, 'hh:mm a') : '--:--'}</TableCell>
                                                    <TableCell className="text-xs font-black text-primary uppercase tracking-tighter">
                                                        {formatDuration(log.totalMinutes)}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Badge className={cn(
                                                            "text-[10px] font-bold uppercase border-none px-3 py-1 shadow-none",
                                                            log.status === 'present' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                                                        )}>
                                                            {log.status || 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="text-center py-20 text-sm font-medium text-slate-300 uppercase tracking-widest">No Logs Found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         </div>
                    </TabsContent>

                    <TabsContent value="leaves" className="mt-0 animate-in fade-in duration-500">
                         <div className="space-y-4">
                            {loadingLeaves ? (
                                <p className="text-center py-20 text-xs font-bold uppercase tracking-widest text-slate-300">Syncing history...</p>
                            ) : leaveRequests && leaveRequests.length > 0 ? (
                                leaveRequests.map(request => {
                                    const start = toSafeDate(request.startDate);
                                    const end = toSafeDate(request.endDate);
                                    return (
                                        <div key={request.id} className="p-6 rounded-[2rem] border border-slate-50 bg-slate-50/30 flex items-center justify-between hover:bg-white hover:border-slate-100 transition-all shadow-none">
                                            <div className="flex items-center gap-5">
                                                <div className="h-12 w-12 rounded-2xl bg-white border border-slate-50 flex items-center justify-center text-slate-400 shadow-sm">
                                                    <CalendarDays className="h-6 w-6" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-base font-bold text-slate-900">{request.type || 'Leave'}</p>
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        {start ? format(start, 'MMM d') : '?'} — {end ? format(end, 'MMM d, yyyy') : '?'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge className={cn(
                                                "text-[10px] font-bold uppercase border-none px-4 py-1",
                                                request.status === 'approved' ? "bg-green-50 text-green-700" : 
                                                request.status === 'pending' ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                                            )}>
                                                {request.status}
                                            </Badge>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-24 text-center opacity-20">
                                    <p className="text-sm font-bold uppercase tracking-widest">History Clear</p>
                                </div>
                            )}
                         </div>
                    </TabsContent>
                </div>
            </ScrollArea>
        </Tabs>

        {/* Footer - Fixed */}
        <div className="p-8 pt-4 border-t bg-slate-50/20 shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confidential Workforce Data — Unauthorized Access Prohibited</p>
                </div>
                <div className="flex items-center gap-3">
                    {isEditing ? (
                        <>
                            <Button variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl h-11 px-8 font-bold text-xs" disabled={isSaving}>Cancel</Button>
                            <Button onClick={handleSaveProfile} disabled={isSaving} className="rounded-xl h-11 px-10 font-bold text-xs shadow-xl shadow-primary/20">
                                {isSaving ? 'Processing...' : 'Save Profile Changes'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" className="rounded-xl font-bold text-xs h-11 px-8 border-slate-200 bg-white" onClick={() => setIsEditing(true)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Profile
                            </Button>
                            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-sm font-bold h-11 px-8 rounded-2xl">Dismiss</Button>
                        </>
                    )}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
