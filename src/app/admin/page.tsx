
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { appUsers as initialAppUsers, loginLogs } from '@/lib/data';
import { UserCog, UserPlus, KeyRound, Trash2, ShieldCheck, MoreHorizontal, Users, Handshake, LogIn, Eye, EyeOff, FileText, Users2, UserCheck, FileClock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AppUser } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

const newUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Admin', 'User']),
});

type NewUserFormValues = z.infer<typeof newUserSchema>;

interface InvoiceRequest {
  id: string;
  userName: string;
  userId: string;
  dateRange: string;
  status: 'Pending' | 'Sent';
}


export default function AdminPage() {
    const [appUsers, setAppUsers] = useState(initialAppUsers);
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [greeting, setGreeting] = useState('');
    const [invoiceRequests, setInvoiceRequests] = useState<InvoiceRequest[]>([]);
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

    const handleSearch = () => {
        if (!searchTerm) return;

        const foundUser = appUsers.find(user => 
            user.id.toLowerCase() === searchTerm.toLowerCase() || user.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (foundUser) {
            setSelectedUser(foundUser);
            setIsUserDetailOpen(true);
        } else {
            toast({
                variant: "destructive",
                title: "User not found",
                description: `No user found with ID or name: ${searchTerm}`,
            });
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };
    
    useEffect(() => {
        const storedRequests = localStorage.getItem('invoiceRequests');
        if (storedRequests) {
            setInvoiceRequests(JSON.parse(storedRequests));
        }
    }, []);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) {
            setGreeting('Good morning');
        } else if (hour < 18) {
            setGreeting('Good afternoon');
        } else {
            setGreeting('Good evening');
        }
    }, []);

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
        toast({
            title: 'User Created',
            description: `User ${newUser.name} has been created successfully.`,
        });
    };
    
    const handleResetPassword = (userId: string) => {
        const newPassword = Math.random().toString(36).slice(-8);
        setAppUsers(appUsers.map(user => 
            user.id === userId ? { ...user, password: newPassword } : user
        ));
        toast({
            title: "Password Reset",
            description: `New password for ${selectedUser?.name} is: ${newPassword}`,
        });
    };

    const adminUser = appUsers.find(user => user.role === 'Admin');

    const totalUsers = appUsers.length;
    const activeUsers = appUsers.filter(u => u.accountStatus === 'Active').length;
    const pendingRequests = invoiceRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className="flex flex-col gap-6 font-sans">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">{greeting}, {adminUser?.name || 'Admin'}!</h1>
            <div className="relative">
                <Input
                  type="search"
                  placeholder="Enter User ID or Name..."
                  className="w-full appearance-none bg-background pl-8 shadow-none md:w-64 lg:w-96"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                <Button onClick={handleSearch} size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>
        </div>

        <Dialog open={isUserDetailOpen} onOpenChange={setIsUserDetailOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>User Details</DialogTitle>
                    <DialogDescription>
                        Information for user ID: {selectedUser?.id}
                    </DialogDescription>
                </DialogHeader>
                {selectedUser && (
                     <div className="space-y-4 py-4">
                        <div className="flex items-center space-x-4">
                            <div>
                                <h4 className="font-semibold text-lg">{selectedUser.name}</h4>
                                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4 text-sm">
                             <div>
                                 <p className="font-medium text-muted-foreground">Account Status</p>
                                 <Badge variant={selectedUser.accountStatus === 'Active' ? 'default' : 'destructive'}>
                                     {selectedUser.accountStatus}
                                 </Badge>
                             </div>
                             <div>
                                 <p className="font-medium text-muted-foreground">Total Consumption</p>
                                 <p>{selectedUser.totalConsumptionLiters.toLocaleString()} Liters</p>
                             </div>
                             <div>
                                 <p className="font-medium text-muted-foreground">Role</p>
                                 <p>{selectedUser.role}</p>
                             </div>
                             <div>
                                 <p className="font-medium text-muted-foreground">Last Login</p>
                                 <p>{new Date(selectedUser.lastLogin).toLocaleString('default', { month: 'long' })}</p>
                             </div>
                         </div>
                         <Separator className="my-4" />
                         <div className="flex flex-col space-y-2">
                             <Button variant="outline" onClick={() => handleResetPassword(selectedUser.id)}><KeyRound className="mr-2 h-4 w-4" /> Reset Password</Button>
                             <Button variant="destructive" className="mt-4"><Trash2 className="mr-2 h-4 w-4" /> Delete User</Button>
                         </div>
                    </div>
                )}
                <DialogFooter>
                    <Button onClick={() => setIsUserDetailOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalUsers}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeUsers}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                    <FileClock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingRequests}</div>
                </CardContent>
            </Card>
            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                <DialogTrigger asChild>
                     <Card className="bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 flex flex-col justify-center items-center">
                        <CardHeader className="p-4 flex-row items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            <CardTitle className="text-lg font-bold">Create User</CardTitle>
                        </CardHeader>
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
                                <DialogClose asChild>
                                  <Button variant="secondary" className="bg-secondary text-secondary-foreground">Cancel</Button>
                                </DialogClose>
                                <Button type="submit" className="bg-primary text-primary-foreground">Create User</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
        
        <Tabs defaultValue="user-management">
             <Card>
                <CardHeader>
                     <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                        <TabsTrigger value="user-management"><Users className="mr-2 h-4 w-4"/>User Management</TabsTrigger>
                        <TabsTrigger value="login-logs"><LogIn className="mr-2 h-4 w-4"/>Login Logs</TabsTrigger>
                        <TabsTrigger value="transactions"><Handshake className="mr-2 h-4 w-4"/>Transactions</TabsTrigger>
                    </TabsList>
                </CardHeader>
                 <CardContent>
                    <TabsContent value="user-management">
                         <div className="overflow-x-auto">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last Login</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {appUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="whitespace-nowrap">{user.id}</TableCell>
                                            <TableCell className="whitespace-nowrap">{user.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.accountStatus === 'Active' ? 'default' : 'destructive'}>
                                                    {user.accountStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{new Date(user.lastLogin).toLocaleString('default', { month: 'long' })}</TableCell>
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
                                    {appUsers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center">No users found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         </div>
                    </TabsContent>
                     <TabsContent value="login-logs">
                        <div className="overflow-x-auto">
                            <Table className="min-w-full">
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
                                        <TableCell className="whitespace-nowrap">{log.id}</TableCell>
                                        <TableCell className="whitespace-nowrap">{log.userName}</TableCell>
                                        <TableCell className="whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</TableCell>
                                        <TableCell className="whitespace-nowrap">{log.ipAddress}</TableCell>
                                        <TableCell>
                                        <Badge variant={log.status === 'Success' ? 'default' : 'destructive'}>
                                            {log.status}
                                        </Badge>
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                    <TabsContent value="transactions">
                        <div className="overflow-x-auto">
                            <Table className="min-w-full">
                            <TableHeader>
                                <TableRow>
                                <TableHead>Request ID</TableHead>
                                <TableHead>User Name</TableHead>
                                <TableHead>Date Range</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoiceRequests.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell className="font-medium whitespace-nowrap">{request.id}</TableCell>
                                    <TableCell className="whitespace-nowrap">{request.userName}</TableCell>
                                    <TableCell className="whitespace-nowrap">{request.dateRange}</TableCell>
                                    <TableCell>
                                    <Badge
                                        variant={request.status === 'Sent' ? 'default' : 'secondary'}
                                    >
                                        {request.status}
                                    </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm">
                                            <FileText className="mr-2 h-4 w-4" />
                                            View Invoice
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                ))}
                                {invoiceRequests.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">No invoice requests yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </CardContent>
            </Card>
        </Tabs>
    </div>
  );
}
