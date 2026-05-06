'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Mail, 
  Phone,
  Briefcase,
  Calendar,
  Filter,
  DollarSign
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
import { collection, query, where, orderBy } from 'firebase/firestore';
import { HREmployeeDialog } from '@/components/hr/HREmployeeDialog';
import { cn } from '@/lib/utils';

export default function EmployeesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const companyId = user?.clientId || 'default';

  const employeesQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'users'), where('companyId', '==', companyId)) : null,
    [firestore, companyId]
  );
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const filteredEmployees = employees?.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.hrProfile?.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Employee Directory</h1>
          <p className="text-slate-500 font-medium">Manage your workforce and employment details.</p>
        </div>
        <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="rounded-2xl h-11 px-6 font-black uppercase tracking-widest text-[10px] bg-slate-900"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/30 p-6 border-b">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by name or position..." 
                className="pl-10 h-10 bg-white border-slate-200 rounded-xl font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs gap-2">
                <Filter className="h-3.5 w-3.5" /> Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Employee</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Position</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Status</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Salary Type</TableHead>
                <TableHead className="text-right pr-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 opacity-50">Syncing directory...</TableCell></TableRow>
              ) : filteredEmployees && filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-900">{emp.name}</p>
                        <p className="text-[10px] font-medium text-slate-400 lowercase">{emp.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                     <p className="text-sm font-bold text-slate-700">{emp.hrProfile?.position || 'N/A'}</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{emp.hrProfile?.department || 'General'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "text-[8px] font-black uppercase border-none px-2 py-0.5",
                      emp.hrProfile?.status === 'Active' ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {emp.hrProfile?.status || 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                       <DollarSign className="h-3 w-3 text-slate-400" />
                       {emp.hrProfile?.salaryType || 'Monthly'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest font-black text-slate-400">Employee Management</DropdownMenuLabel>
                        <DropdownMenuItem className="gap-2 font-bold text-xs py-2.5">
                            <Briefcase className="h-3.5 w-3.5" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 font-bold text-xs py-2.5">
                            <Clock className="h-3.5 w-3.5" /> Attendance Record
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 font-bold text-xs py-2.5 text-red-600 focus:text-red-600">
                            Terminated
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                        <Users className="h-10 w-10" />
                        <p className="text-sm font-black uppercase tracking-widest">No employees found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <HREmployeeDialog 
        isOpen={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
        companyId={companyId}
      />
    </div>
  );
}