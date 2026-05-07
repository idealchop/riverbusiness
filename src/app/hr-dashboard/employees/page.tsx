'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Briefcase, 
  Calendar,
  Filter,
  ArrowRight
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
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { HREmployeeDialog } from '@/components/hr/HREmployeeDialog';
import { EmployeeDetailsDialog } from '@/components/hr/EmployeeDetailsDialog';
import { cn } from '@/lib/utils';
import type { AppUser } from '@/lib/types';
import { FullScreenLoader } from '@/components/ui/loader';

const DEMO_EMPLOYEES: Partial<AppUser>[] = [
    { id: 'demo1', name: 'John Doe', email: 'john@riverph.com', hrProfile: { firstName: 'John', lastName: 'Doe', position: 'Operations Manager', department: 'Management', salaryType: 'monthly', rate: 45000, startDate: '2024-01-15', status: 'Active' } },
    { id: 'demo2', name: 'Jane Smith', email: 'jane@riverph.com', hrProfile: { firstName: 'Jane', lastName: 'Smith', position: 'Customer Success', department: 'Service', salaryType: 'monthly', rate: 35000, startDate: '2024-02-10', status: 'Active' } },
    { id: 'demo3', name: 'Robert Johnson', email: 'robert@riverph.com', hrProfile: { firstName: 'Robert', lastName: 'Johnson', position: 'Logistics Lead', department: 'Operations', salaryType: 'daily', rate: 1200, startDate: '2024-03-01', status: 'Active' } },
    { id: 'demo4', name: 'Maria Garcia', email: 'maria@riverph.com', hrProfile: { firstName: 'Maria', lastName: 'Garcia', position: 'Quality Officer', department: 'Compliance', salaryType: 'monthly', rate: 32000, startDate: '2024-04-15', status: 'Active' } },
    { id: 'demo5', name: 'David Wilson', email: 'david@riverph.com', hrProfile: { firstName: 'David', lastName: 'Wilson', position: 'Delivery Driver', department: 'Operations', salaryType: 'daily', rate: 800, startDate: '2024-05-20', status: 'Active' } },
];

export default function EmployeesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<AppUser | null>(null);

  const companyId = user?.companyId || user?.clientId || 'default';
  const isManagement = user?.hrRole === 'owner' || user?.hrRole === 'admin';

  useEffect(() => {
    if (!isUserLoading && user && !isManagement) {
      router.replace('/hr-dashboard');
    }
  }, [user, isUserLoading, isManagement, router]);

  const employeesQuery = useMemoFirebase(
    () => (firestore && companyId && isManagement) ? query(collection(firestore, 'users'), where('companyId', '==', companyId)) : null,
    [firestore, companyId, isManagement]
  );
  const { data: employees, isLoading } = useCollection<AppUser>(employeesQuery);

  const filteredEmployees = useMemo(() => {
    const list = employees && employees.length > 0 ? employees : (DEMO_EMPLOYEES as AppUser[]);
    const search = searchTerm.toLowerCase().trim();
    if (!search) return list;
    return list.filter(emp => {
      return (
        emp.name?.toLowerCase().includes(search) ||
        emp.hrProfile?.position?.toLowerCase().includes(search) ||
        emp.email?.toLowerCase().includes(search)
      );
    });
  }, [employees, searchTerm]);

  if (isUserLoading || (user && !isManagement)) {
    return <FullScreenLoader text="Verifying Credentials..." />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Employees</h1>
          <p className="text-slate-500 font-medium">Manage Your Workforce And Employment Details.</p>
        </div>
        <Button 
            onClick={() => setIsAddDialogOpen(true)}
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
            <Button variant="outline" size="sm" className="rounded-lg font-semibold text-xs gap-2 border-slate-200">
                <Filter className="h-3.5 w-3.5" /> Filter
            </Button>
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
                  <TableRow><TableCell colSpan={5} className="text-center py-10 opacity-50 font-medium">Syncing Directory...</TableCell></TableRow>
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
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest gap-2" onClick={() => setSelectedEmployee(emp)}>
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
                            <DropdownMenuItem className="gap-2 font-semibold text-sm py-2.5 cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
                                <Briefcase className="h-4 w-4 opacity-50" /> View Full Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 font-semibold text-sm py-2.5 cursor-pointer">
                                <Calendar className="h-4 w-4 opacity-50" /> Attendance Record
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-50" />
                            <DropdownMenuItem className="gap-2 font-semibold text-sm py-2.5 text-red-600 focus:text-red-600 cursor-pointer">
                                Terminate
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <HREmployeeDialog 
        isOpen={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
        companyId={companyId}
      />

      <EmployeeDetailsDialog
        employee={selectedEmployee}
        isOpen={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
      />
    </div>
  );
}
