
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { appUsers as initialAppUsers, loginLogs, paymentHistory } from '@/lib/data';
import { ArrowRight, ChevronRight, UserCog, UserPlus, KeyRound, Trash2, ShieldCheck, View, MoreHorizontal, Users, DollarSign, Activity, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminPage() {
    const [appUsers, setAppUsers] = useState(initialAppUsers);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const areaChartData = [
        { date: 'Mar 1', value: 20000 },
        { date: 'Mar 3', value: 35000 },
        { date: 'Mar 5', value: 28000 },
        { date: 'Mar 7', value: 32000 },
        { date: 'Mar 9', value: 25000 },
        { date: 'Mar 11', value: 38000 },
        { date: 'Mar 13', value: 42000 },
    ];

    const barChartData = [
        { month: 'January', value: 5000 },
        { month: 'February', value: 8000 },
        { month: 'March', value: 7000 },
        { month: 'April', value: 10000 },
        { month: 'May', value: 12000 },
        { month: 'June', value: 18000 },
    ];

    const latestUsers = initialAppUsers.slice(0, 5);


  return (
    <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                    <CardTitle>Primary Card</CardTitle>
                </CardHeader>
                <CardFooter>
                    <a href="#" className="flex items-center text-sm hover:underline">
                        View Details <ChevronRight className="h-4 w-4 ml-1" />
                    </a>
                </CardFooter>
            </Card>
            <Card className="bg-yellow-400 text-white">
                <CardHeader>
                    <CardTitle>Warning Card</CardTitle>
                </CardHeader>
                 <CardFooter>
                    <a href="#" className="flex items-center text-sm hover:underline">
                        View Details <ChevronRight className="h-4 w-4 ml-1" />
                    </a>
                </CardFooter>
            </Card>
            <Card className="bg-green-500 text-white">
                <CardHeader>
                    <CardTitle>Success Card</CardTitle>
                </CardHeader>
                 <CardFooter>
                    <a href="#" className="flex items-center text-sm hover:underline">
                        View Details <ChevronRight className="h-4 w-4 ml-1" />
                    </a>
                </CardFooter>
            </Card>
            <Card className="bg-red-500 text-white">
                <CardHeader>
                    <CardTitle>Danger Card</CardTitle>
                </CardHeader>
                <CardFooter>
                    <a href="#" className="flex items-center text-sm hover:underline">
                        View Details <ChevronRight className="h-4 w-4 ml-1" />
                    </a>
                </CardFooter>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Area Chart Example</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={areaChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                             <defs>
                                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                }}
                            />
                            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorArea)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Bar Chart Example</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                }}
                            />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Datatable Example</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Login</TableHead>
                             <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {latestUsers.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.accountStatus}</TableCell>
                                <TableCell>{new Date(user.lastLogin).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>
                                                <UserCog className="mr-2 h-4 w-4" />
                                                Edit User
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                                Assign Permissions
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <KeyRound className="mr-2 h-4 w-4" />
                                                Reset Password
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete User
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
