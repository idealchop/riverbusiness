
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { appUsers as initialAppUsers, loginLogs, paymentHistory } from '@/lib/data';
import { ArrowRight, ChevronRight, UserCog, UserPlus, KeyRound, Trash2, ShieldCheck, View, MoreHorizontal, Users, DollarSign, Activity, AlertTriangle, Monitor, Receipt, LogIn, Handshake, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const newUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Admin', 'User']),
});

type NewUserFormValues = z.infer<typeof newUserSchema>;


export default function AdminPage() {
    const [appUsers, setAppUsers] = useState(initialAppUsers);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<NewUserFormValues>({
        resolver: zodResolver(newUserSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            role: 'User',
        },
    });

    const handleCreateUser = (values: NewUserFormValues) => {
        const newUser = {
            id: `USR-${String(appUsers.length + 1).padStart(3, '0')}`,
            ...values,
            totalConsumptionLiters: 0,
            accountStatus: 'Active' as 'Active' | 'Inactive',
            lastLogin: new Date().toISOString(),
        };
        setAppUsers([...appUsers, newUser]);
        form.reset();
        setIsCreateUserOpen(false);
    };

    const barChartData = [
        { month: 'January', value: 5000 },
        { month: 'February', value: 8000 },
        { month: 'March', value: 7000 },
        { month: 'April', value: 10000 },
        { month: 'May', value: 12000 },
        { month: 'June', value: 18000 },
    ];


  return (
    <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                <DialogTrigger asChild>
                     <Card className="bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90">
                        <CardHeader>
                            <CardTitle>Make an Account</CardTitle>
                        </CardHeader>
                        <CardFooter>
                            <p className="flex items-center text-sm">
                                Create User <UserPlus className="h-4 w-4 ml-1" />
                            </p>
                        </CardFooter>
                    </Card>
                </DialogTrigger>
                <DialogContent>
                     <DialogHeader>
                        <DialogTitle>Create a New User</DialogTitle>
                        <DialogDescription>
                            Fill in the details to create a new user account.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl><Input placeholder="Juan dela Cruz" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                     <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? 'text' : 'password'} placeholder="******" {...field} />
                                                <Button size="icon" variant="ghost" type="button" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="User">User</SelectItem>
                                        <SelectItem value="Admin">Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button variant="secondary" onClick={() => setIsCreateUserOpen(false)}>Cancel</Button>
                                <Button type="submit">Create User</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                    <CardTitle>Warning Card</CardTitle>
                </CardHeader>
                 <CardFooter>
                    <a href="#" className="flex items-center text-sm hover:underline">
                        View Details <ChevronRight className="h-4 w-4 ml-1" />
                    </a>
                </CardFooter>
            </Card>
            <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                    <CardTitle>Success Card</CardTitle>
                </CardHeader>
                 <CardFooter>
                    <a href="#" className="flex items-center text-sm hover:underline">
                        View Details <ChevronRight className="h-4 w-4 ml-1" />
                    </a>
                </CardFooter>
            </Card>
            <Card className="bg-primary text-primary-foreground">
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
        
        <Tabs defaultValue="user-management">
             <Card>
                <CardHeader>
                     <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="user-management"><Users className="mr-2"/>User Management</TabsTrigger>
                        <TabsTrigger value="login-logs"><LogIn className="mr-2"/>Login Logs</TabsTrigger>
                        <TabsTrigger value="transactions"><Handshake className="mr-2"/>Transactions</TabsTrigger>
                    </TabsList>
                </CardHeader>
                 <CardContent>
                    <TabsContent value="user-management">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Login</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {appUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.id}</TableCell>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.accountStatus === 'Active' ? 'default' : 'destructive'} className={user.accountStatus === 'Active' ? 'bg-green-500' : 'bg-red-500'}>
                                                {user.accountStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(user.lastLogin).toLocaleDateString()}</TableCell>
                                        <TableCell>{user.role}</TableCell>
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
                    </TabsContent>
                     <TabsContent value="login-logs">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Log ID</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loginLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>{log.id}</TableCell>
                                    <TableCell>{log.userName}</TableCell>
                                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                    <TableCell>{log.ipAddress}</TableCell>
                                    <TableCell>
                                    <Badge variant={log.status === 'Success' ? 'default' : 'destructive'} className={log.status === 'Success' ? 'bg-green-500' : 'bg-red-500'}>
                                        {log.status}
                                    </Badge>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="transactions">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Invoice ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paymentHistory.map((payment) => (
                            <TableRow key={payment.id}>
                                <TableCell className="font-medium">{payment.id}</TableCell>
                                <TableCell>{new Date(payment.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
                                <TableCell>{payment.description}</TableCell>
                                <TableCell>
                                <Badge
                                    variant={
                                    payment.status === 'Paid' ? 'default' : (payment.status === 'Upcoming' ? 'secondary' : 'outline')
                                    }
                                    className={
                                    payment.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                    : payment.status === 'Upcoming' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-200'
                                    }
                                >
                                    {payment.status}
                                </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                ₱{payment.amount.toFixed(2)}
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </TabsContent>
                </CardContent>
            </Card>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Login</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {appUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.id}</TableCell>
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
                    </div>
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
    </div>
  );
}
