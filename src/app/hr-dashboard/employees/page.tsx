'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Filter,
  ArrowRight,
  Trash2,
  UserCog,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { HREmployeeDialog } from '@/components/hr/HREmployeeDialog';
import { EmployeeDetailsDialog } from '@/components/hr/EmployeeDetailsDialog';
import { cn } from '@/lib/utils';
import type { AppUser } from '@/lib/types';
import { FullScreenLoader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';

const DEPARTMENTS = ['All Departments', 'Logistics', 'Support', 'Fleet', 'Admin', 'Compliance', 'Operations'];
const ITEMS_PER_PAGE = 10;

const DEMO_EMPLOYEES: Partial<AppUser>[] = [
    { id: 'e1', name: 'Marcus Rivera', email: 'marcus@riverph.com', hrProfile: { position: 'Operations Lead', department: 'Logistics', status: 'Active', salaryType: 'monthly', rate: 45000, startDate: '2024-01-15', firstName: 'Marcus', lastName: 'Rivera' } },
    { id: 'e2', name: 'Sarah Jenkins', email: 'sarah.j@riverph.com', hrProfile: { position: 'Customer Success', department: 'Support', status: 'Active', salaryType: 'monthly', rate: 38000, startDate: '2024-02-01', firstName: 'Sarah', lastName: 'Jenkins' } },
    { id: 'e3', name: 'Leo Castelo', email: 'leo.c@riverph.com', hrProfile: { position: 'Delivery Officer', department: 'Fleet', status: 'Active', salaryType: 'daily', rate: 850, startDate: '2024-03-10', firstName: 'Leo', lastName: 'Castelo' } },
    { id: 'e4', name: 'Elena Cruz', email: 'elena@riverph.com', hrProfile: { position: 'Admin Assistant', department: 'Admin', status: 'Active', salaryType: 'monthly', rate: 30000, startDate: '2023-11-20', firstName: 'Elena', lastName: 'Cruz' } },
    { id: 'e5', name: 'David Sy', email: 'david.sy@riverph.com', hrProfile: { position: 'Quality Inspector', department: 'Compliance', status: 'Active', salaryType: 'monthly', rate: 42000, startDate: '2024-01-05', firstName: 'David', lastName: 'Sy' } },
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
  const [currentPage, setCurrentPage] = useState(1);

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

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEmployees.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEmployees, currentPage]);

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);

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
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Workforce Directory</h1>
          <p className="text-slate-500 font-medium text-sm">Unified view of all employee profiles and performance intelligence.</p>
        </div>
        <Button 
            onClick={() => { setEmployeeToEdit(null); setIsAddDialogOpen(true); }}
            className="rounded-xl h-11 px-6 font-bold shadow-md shadow-primary/10"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Team Member
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/30 p-6 border-b">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search By Name, Email, Or Position..." 
                className="pl-10 h-10 bg-white border-slate-200 rounded-xl font-medium shadow-none focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-lg font-bold text-[10px] uppercase tracking-widest gap-2 border-slate-200 bg-white h-9 shadow-sm">
                            <Filter className="h-3.5 w-3.5" /> {selectedDept}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-slate-200 p-1 shadow-2xl">
                        <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400 p-2">Filter by Department</DropdownMenuLabel>
                        {DEPARTMENTS.map(dept => (
                            <DropdownMenuItem 
                                key={dept} 
                                onClick={() => {
                                    setSelectedDept(dept);
                                    setCurrentPage(1);
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
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none">
                <TableHead className="pl-6 font-bold text-[10px] uppercase tracking-wider text-slate-400 py-4">Employee</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Position</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Status</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Salary Configuration</TableHead>
                <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">Management</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-40 font-bold uppercase text-[10px] tracking-widest">Synchronizing records...</TableCell></TableRow>
              ) : paginatedEmployees.map((emp) => {
                const nameInitials = emp.name?.split(' ').map(n => n[0]).join('') || '?';
                return (
                  <TableRow key={emp.id} className="hover:bg-slate-50/30 transition-colors group border-b border-slate-50 last:border-0">
                    <TableCell className="pl-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase shadow-inner">
                          {nameInitials}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{emp.name || 'Untitled Profile'}</p>
                          <p className="text-[10px] font-bold text-slate-400 lowercase">{emp.email || 'No Email'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <p className="text-sm font-bold text-slate-700">{emp.hrProfile?.position || 'N/A'}</p>
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mt-0.5">{emp.hrProfile?.department || 'General'}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-bold uppercase border-none px-3 py-1 shadow-sm",
                        emp.hrProfile?.status === 'Active' ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                      )}>
                        {emp.hrProfile?.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-900">₱{(Number(emp.hrProfile?.rate) || 0).toLocaleString()}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{emp.hrProfile?.salaryType || 'Monthly'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest gap-2 bg-white border-slate-200" onClick={() => handleOpenDetails(emp as AppUser)}>
                              Profile <ArrowRight className="h-3 w-3" />
                          </Button>
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-xl border-slate-200 p-1 shadow-2xl">
                              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest font-bold text-slate-400 py-2.5 px-3">Management</DropdownMenuLabel>
                              <DropdownMenuItem className="gap-3 font-semibold text-xs py-3 rounded-lg cursor-pointer" onClick={() => handleOpenDetails(emp as AppUser, 'performance')}>
                                  <Activity className="h-4 w-4 opacity-50" /> Performance Analysis
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 font-semibold text-xs py-3 rounded-lg cursor-pointer" onClick={() => handleOpenDetails(emp as AppUser, 'attendance')}>
                                  <Activity className="h-4 w-4 opacity-50" /> Attendance Record
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 font-semibold text-xs py-3 rounded-lg cursor-pointer" onClick={() => { setEmployeeToEdit(emp as AppUser); setIsAddDialogOpen(true); }}>
                                  <UserCog className="h-4 w-4 opacity-50" /> Edit Credentials
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-50" />
                              <DropdownMenuItem className="gap-3 font-semibold text-xs py-3 text-red-600 focus:text-red-600 rounded-lg cursor-pointer" onClick={() => setEmployeeToDelete(emp as AppUser)}>
                                  <Trash2 className="h-4 w-4 opacity-50" /> Terminate Access
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && filteredEmployees.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 font-bold text-slate-300 italic uppercase text-[10px] tracking-[0.3em]">No Employee Profiles Found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <PaginationFooter 
            totalItems={filteredEmployees.length}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
        />
      </Card>
      
      <HREmployeeDialog 
        isOpen={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
        companyId={companyId}
        inviterBusinessName={user?.businessName}
        employeeToEdit={employeeToEdit}
      />

      <EmployeeDetailsDialog
        employee={selectedEmployee}
        isOpen={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
        initialTab={initialDialogTab}
      />

      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
          <AlertDialogContent className="rounded-3xl border-none p-10 shadow-3xl">
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Confirm Termination?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed pt-2">
                      This will permanently remove <span className="font-bold text-slate-900">{employeeToDelete?.name}</span> from your company directory. They will lose all access to the HR workspace and attendance terminal. This action is recorded in the audit trail.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="pt-6">
                  <AlertDialogCancel className="rounded-xl font-bold text-xs uppercase tracking-widest h-11 px-8">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold text-xs uppercase tracking-widest h-11 px-8">Authorize Removal</AlertDialogAction>
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