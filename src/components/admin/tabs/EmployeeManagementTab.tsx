'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, MoreHorizontal, ChevronRight, UserCircle, Mail, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EmployeeManagementTabProps {
    allUsers: AppUser[] | null;
    unclaimedEmployees: any[] | null;
    onUserClick: (user: AppUser, tab?: string) => void;
}

export function EmployeeManagementTab({
    allUsers,
    unclaimedEmployees,
    onUserClick,
}: EmployeeManagementTabProps) {
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const filteredEmployees = useMemo(() => {
        // Filter for Employees specifically
        const employees = (allUsers || []).filter(u => u.hrRole === 'employee');
        
        if (!localSearchTerm) return employees;
        const s = localSearchTerm.toLowerCase();
        return employees.filter(user =>
            user.name?.toLowerCase().includes(s) ||
            user.companyId?.toLowerCase().includes(s) ||
            user.hrProfile?.employeeNumber?.toLowerCase().includes(s)
        );
    }, [allUsers, localSearchTerm]);

    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const paginatedEmployees = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredEmployees, currentPage, itemsPerPage]);

    return (
        <div className="space-y-8">
            <Tabs defaultValue="active-staff" className="w-full">
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-4">
                        <TabsList className="bg-muted/50 p-1 w-fit">
                            <TabsTrigger value="active-staff" className="data-[state=active]:bg-background">Active Staff</TabsTrigger>
                            <TabsTrigger value="pending-invites" className="relative data-[state=active]:bg-background">
                                Invited
                                {unclaimedEmployees && unclaimedEmployees.length > 0 && (
                                    <Badge className="ml-2 h-4 min-w-4 px-1 flex justify-center bg-primary text-[10px]">{unclaimedEmployees.length}</Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </CardHeader>
                    
                    <TabsContent value="active-staff" className="mt-0">
                        <CardContent className="space-y-6 pt-0">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search staff by name, ID, or company..."
                                    value={localSearchTerm}
                                    onChange={(e) => {
                                        setLocalSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-10 h-10 shadow-sm border-muted-foreground/20"
                                />
                            </div>
                            
                            <div className="overflow-x-auto hidden md:block rounded-lg border">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="pl-6">Employee</TableHead>
                                            <TableHead>Staff ID</TableHead>
                                            <TableHead>Organization (Client ID)</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead className="text-right pr-6">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedEmployees.map((emp) => {
                                            const initials = emp.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
                                            return (
                                                <TableRow key={emp.id} onClick={() => onUserClick(emp)} className="group cursor-pointer hover:bg-muted/30 transition-colors">
                                                    <TableCell className="pl-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9 rounded-xl border-2 border-background shadow-sm">
                                                                <AvatarImage src={emp.photoURL} alt={emp.name} />
                                                                <AvatarFallback className="text-[10px] font-bold bg-slate-100 text-slate-400">{initials}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-bold text-sm text-slate-900 leading-none">{emp.name}</p>
                                                                <p className="text-[10px] text-muted-foreground mt-1">{emp.email}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                                                        {emp.hrProfile?.employeeNumber || 'UNSET'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                                                                <Building className="h-3 w-3" />
                                                            </div>
                                                            <span className="text-xs font-black uppercase tracking-tight text-slate-700">{emp.companyId}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">
                                                        {emp.hrProfile?.department || 'General'}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Badge variant="outline" className="text-[9px] font-black uppercase bg-green-50 text-green-700 border-green-200">
                                                                Verified
                                                            </Badge>
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                        {paginatedEmployees.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <UserCircle className="h-8 w-8 opacity-20" />
                                                        <p>No active employees found.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            <div className="flex items-center justify-end space-x-2 py-4">
                                <span className="text-xs text-muted-foreground mr-auto">
                                    Displaying {paginatedEmployees.length} profiles
                                </span>
                                <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages || 1}</span>
                                <Button variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                                <Button variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>Next</Button>
                            </div>
                        </CardContent>
                    </TabsContent>

                    <TabsContent value="pending-invites" className="mt-0">
                        <CardContent className="pt-0">
                            <div className="overflow-x-auto rounded-lg border">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="pl-6">Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Target Org (Client ID)</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead className="text-right pr-6">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(unclaimedEmployees && unclaimedEmployees.length > 0) ? (unclaimedEmployees || []).map((invite) => (
                                            <TableRow key={invite.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="pl-6 font-bold text-sm">{invite.name}</TableCell>
                                                <TableCell className="text-xs font-medium text-slate-600">{invite.email}</TableCell>
                                                <TableCell className="font-black text-[10px] uppercase text-blue-700">{invite.companyId}</TableCell>
                                                <TableCell className="text-xs">{invite.hrProfile?.department}</TableCell>
                                                <TableCell className="text-right pr-6"><Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[9px] tracking-widest font-bold">Awaiting Link</Badge></TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Mail className="h-8 w-8 opacity-20" />
                                                    <p>No active invitations pending.</p>
                                                </div>
                                            </TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </TabsContent>
                </Card>
            </Tabs>
        </div>
    );
}
