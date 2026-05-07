'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Briefcase, 
  Calendar,
  Filter,
  ArrowRight,
  Trash2,
  UserCog
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
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
import { collection, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { HREmployeeDialog } from '@/components/hr/HREmployeeDialog';
import { EmployeeDetailsDialog } from '@/components/hr/EmployeeDetailsDialog';
import { cn } from '@/lib/utils';
import type { AppUser } from '@/lib/types';
import { FullScreenLoader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';

const DEPARTMENTS = ['All Departments', 'Logistics', 'Support', 'Fleet', 'Admin', 'Compliance', 'Operations'];

const DEMO_EMPLOYEES: Partial<AppUser>[] = [
    { id: 'e1', name: 'Marcus Rivera', email: 'marcus@riverph.com', hrProfile: { position: 'Operations Lead', department: 'Logistics', status: 'Active', salaryType: 'monthly', rate: 45000, startDate: '2024-01-15' } },
    { id: 'e2', name: 'Sarah Jenkins', email: 'sarah.j@riverph.com', hrProfile: { position: 'Customer Success', department: 'Support', status: 'Active', salaryType: 'monthly', rate: 38000, startDate: '2024-02-01' } },
    { id: 'e3', name: 'Leo Castelo', email: 'leo.c@riverph.com', hrProfile: { position: 'Delivery Officer', department: 'Fleet', status: 'Active', salaryType: 'daily', rate: 850, startDate: '2024-03-10' } },
    { id: 'e4', name: 'Elena Cruz', email: 'elena@riverph.com', hrProfile: { position: 'Admin Assistant', department: 'Admin', status: 'Active', salaryType: 'monthly', rate: 30000, startDate: '2023-11-20' } },
    { id: 'e5', name: 'David Sy', email: 'david.sy@riverph.com', hrProfile: { position: 'Quality Inspector', department: 'Compliance', status: 'Active', salaryType: 'monthly', rate: 42000, startDate: '2024-01-05' } },
];

export default function EmployeesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<AppUser | null>(null);
  const [initialDialogTab, setInitialDialogTab] = useState<string>('overview');
  const [employeeToDelete, setEmployeeToDelete] = useState<AppUser | null>(null);
  const [employeeToEdit, setEmployeeToEdit] = useState<AppUser | null>(null);

  const companyId = user?.companyId || user?.clientId || 'default';

  const employeesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'users'), where('companyId', '==', companyId)) : null,
    [firestore, companyId]
  );
  const { data: employees, isLoading } = useCollection<AppUser>(employeesQuery);

  const filteredEmployees = useMemo(() => {
    const list = employees && employees.length > 0 ? employees : (DEMO_EMPLOYEES as AppUser[]);
    const search = searchTerm.toLowerCase().trim();
    
    return list.filter(emp => {
      const matchesSearch = !search || 
        emp.name?.toLowerCase().includes(search) ||
        emp.hrProfile?.position?.toLowerCase().includes(search) ||
        emp.email?.toLowerCase().includes(search);
        
      const matchesDept = selectedDept === 'All Departments' || emp.hrProfile?.department === selectedDept;
      
      return matchesSearch && matchesDept;
    });
  }, [employees, searchTerm, selectedDept]);

  const handleDeleteEmployee = async () => {
    if (!firestore || !employeeToDelete) return;
    try {
        await deleteDoc(doc(firestore, 'users', employeeToDelete.id));
        toast({ title: 'Profile Removed', description: `${employeeToDelete.name} has been removed from the directory.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Action Failed', description: 'Permission error or network issue.' });
    } finally {
        setEmployeeToDelete(null);
    }
  };

  const handleOpenDetails = (emp: AppUser, tab: string = 'overview') => {
      setSelectedEmployee(emp);
      setInitialDialogTab(tab);
  };

  if (isUserLoading) {
    return <FullScreenLoader text="Syncing Directory..." />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Employees</h1>
          <p className="text-slate-500 font-medium">Collaboratively Manage Your Team and Workforce Profiles.</p>
        </div>
        <Button 
            onClick={() => { setEmployeeToEdit(null); setIsAddDialogOpen(true); }}
            className="rounded-xl h-11 px-6 font-bold shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/20 p-6 border-b">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search By Name, Email, Or Position..." 
                className="pl-10 h-10 bg-white border-slate-200 rounded-xl font-medium shadow-none focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-lg font-semibold text-xs gap-2 border-slate-200 bg-white">
                            <Filter className="h-3.5 w-3.5" /> {selectedDept}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-slate-200 p-1">
                        <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400 p-2">Filter by Dept</DropdownMenuLabel>
                        {DEPARTMENTS.map(dept => (
                            <DropdownMenuItem 
                                key={dept} 
                                onClick={() => setSelectedDept(dept)}
                                className={cn("rounded-lg font-medium py-2 cursor-pointer", selectedDept === dept && "bg-slate-50")}
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
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none">
                <TableHead className="pl-6 font-bold text-xs text-slate-400">Employee</TableHead>
                <TableHead className="font-bold text-xs text-slate-400">Position</TableHead>
                <TableHead className="font-bold text-xs text-slate-400">Status</TableHead>
                <TableHead className="font-bold text-xs text-slate-400">Salary Type</TableHead>
                <TableHead className="text-right pr-6 font-bold text-xs text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 opacity-50 font-medium">Synchronizing records...</TableCell></TableRow>
              ) : filteredEmployees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-slate-50/30 transition-colors group border-b border-slate-50 last:border-0">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                        {emp.name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-slate-900">{emp.name || 'Untitled Profile'}</p>
                        <p className="text-xs font-medium text-slate-400 lowercase">{emp.email || 'No Email'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                     <p className="text-sm font-bold text-slate-700">{emp.hrProfile?.position || 'N/A'}</p>
                     <p className="text-[10px] text-slate-400 font-semibold uppercase">{emp.hrProfile?.department || 'General'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "text-[9px] font-bold uppercase border-none px-2 py-0.5",
                      emp.hrProfile?.status === 'Active' ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {emp.hrProfile?.status || 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                       {emp.hrProfile?.salaryType || 'Monthly'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest gap-2 bg-white" onClick={() => handleOpenDetails(emp)}>
                            Details <ArrowRight className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900">
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl border-slate-200 p-1">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest font-bold text-slate-400 py-2">Management</DropdownMenuLabel>
                            <DropdownMenuItem className="gap-2 font-semibold text-sm py-2.5 cursor-pointer" onClick={() => handleOpenDetails(emp)}>
                                <Briefcase className="h-4 w-4 opacity-50" /> View Full Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 font-semibold text-sm py-2.5 cursor-pointer" onClick={() => handleOpenDetails(emp, 'attendance')}>
                                <Calendar className="h-4 w-4 opacity-50" /> Attendance Record
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 font-semibold text-sm py-2.5 cursor-pointer" onClick={() => { setEmployeeToEdit(emp); setIsAddDialogOpen(true); }}>
                                <UserCog className="h-4 w-4 opacity-50" /> Edit Credentials
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-50" />
                            <DropdownMenuItem className="gap-2 font-semibold text-sm py-2.5 text-red-600 focus:text-red-600 cursor-pointer" onClick={() => setEmployeeToDelete(emp)}>
                                <Trash2 className="h-4 w-4 opacity-50" /> Remove Access
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredEmployees.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 font-medium text-slate-300 italic uppercase text-[10px] tracking-widest">No Employees Found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <HREmployeeDialog 
        isOpen={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
        companyId={companyId}
        employeeToEdit={employeeToEdit}
      />

      <EmployeeDetailsDialog
        employee={selectedEmployee}
        isOpen={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
        initialTab={initialDialogTab}
      />

      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
          <AlertDialogContent className="rounded-3xl border-none p-8">
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-bold tracking-tight">Remove Access?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed">
                      This will permanently remove <span className="font-bold text-slate-900">{employeeToDelete?.name}</span> from your company directory. They will no longer be able to access the HR workspace.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="pt-4">
                  <AlertDialogCancel className="rounded-xl font-bold text-xs uppercase tracking-widest">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold text-xs uppercase tracking-widest">Confirm Removal</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
