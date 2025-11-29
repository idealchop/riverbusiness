

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { appUsers as initialAppUsers, loginLogs, feedbackLogs as initialFeedbackLogs, paymentHistory } from '@/lib/data';
import { MoreHorizontal, UserCog, UserPlus, KeyRound, Trash2, ShieldCheck, View, ClipboardCopy, Eye, EyeOff, Users, LogIn, MessageSquare, Star, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppUser, Permission, Feedback } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


const allPermissions: { id: Permission, label: string, description: string }[] = [
    { id: 'view_dashboard', label: 'View Dashboard', description: 'Can view the main dashboard.' },
    { id: 'view_payments', label: 'View Payments', description: 'Can view payment history and billing.' },
    { id: 'manage_deliveries', label: 'Manage Deliveries', description: 'Can track and manage water deliveries.' },
    { id: 'view_quality_reports', label: 'View Quality Reports', description: 'Can access water quality and compliance reports.' },
    { id: 'manage_users', label: 'Manage Users', description: 'Can add, edit, and delete other users.' },
    { id: 'access_admin_panel', label: 'Access Admin Panel', description: 'Can access the administrative section.' },
];

const generatePassword = () => {
    return Math.random().toString(36).slice(-8);
}

export default function AdminPage() {
    const { toast } = useToast();
    const [appUsers, setAppUsers] = useState(initialAppUsers.map(u => ({...u, permissions: u.role === 'Admin' ? allPermissions.map(p => p.id) : ['view_dashboard', 'view_payments']})));
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
    const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser & { permissions: Permission[] } | null>(null);
    const [activeTab, setActiveTab] = useState('users');
    
    const [newUser, setNewUser] = useState({ 
        id: '',
        name: '', 
        accountStatus: 'Active' as 'Active' | 'Inactive', 
        lastLogin: new Date().toISOString(), 
        totalConsumptionLiters: 0, 
        permissions: ['view_dashboard'] as Permission[],
        password: ''
    });
    
    const [createdUserInfo, setCreatedUserInfo] = useState<{ id: string, name: string, password: string} | null>(null);
    const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
    const [resetPasswordInfo, setResetPasswordInfo] = useState<{ name: string, password: string} | null>(null);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);

    const [feedbackLogs, setFeedbackLogs] = useState<Feedback[]>(initialFeedbackLogs);

    const toggleFeedbackRead = (feedbackId: string) => {
        setFeedbackLogs(feedbackLogs.map(log => 
            log.id === feedbackId ? { ...log, read: !log.read } : log
        ));
    };


    const getStatusBadgeVariant = (status: 'Active' | 'Inactive'): 'default' | 'secondary' => {
        switch (status) {
            case 'Active':
                return 'default';
            case 'Inactive':
                return 'secondary';
            default:
                return 'secondary';
        }
    };
    
    const getLoginStatusBadgeVariant = (status: 'Success' | 'Failure'): 'default' | 'destructive' => {
        return status === 'Success' ? 'default' : 'destructive';
    }

    const openAddUserDialog = () => {
        const id = `USR-${(appUsers.length + 1).toString().padStart(3, '0')}`;
        const password = generatePassword();
        setNewUser({
            id: id,
            name: '',
            accountStatus: 'Active',
            lastLogin: new Date().toISOString(),
            totalConsumptionLiters: 0,
            permissions: ['view_dashboard'],
            password: password
        });
        setShowNewPassword(false);
        setIsAddUserOpen(true);
    };

    const handleAddUser = () => {
        const userToAdd = {
            ...newUser,
            email: `${newUser.name.toLowerCase().replace(/\s/g, '.')}@example.com`,
        };
        setAppUsers([...appUsers, userToAdd]);
        setCreatedUserInfo({ id: userToAdd.id, name: userToAdd.name, password: userToAdd.password });
        setShowNewPassword(false);
        setIsAddUserOpen(false);
        setIsUserInfoOpen(true);
    };

    const handleEditUser = () => {
        if (selectedUser) {
            setAppUsers(appUsers.map(u => u.id === selectedUser.id ? selectedUser : u));
            setIsEditUserOpen(false);
            setSelectedUser(null);
        }
    };

    const handleDeleteUser = () => {
        if (selectedUser) {
            setAppUsers(appUsers.filter(u => u.id !== selectedUser.id));
            setIsDeleteUserOpen(false);
            setSelectedUser(null);
        }
    };

    const handleSavePermissions = () => {
        if (selectedUser) {
            setAppUsers(appUsers.map(u => u.id === selectedUser.id ? selectedUser : u));
            setIsPermissionsOpen(false);
            setSelectedUser(null);
        }
    };

    const openEditDialog = (user: AppUser & { permissions: Permission[] }) => {
        setSelectedUser({ ...user });
        setIsEditUserOpen(true);
    }
    
    const openDeleteDialog = (user: AppUser) => {
        setSelectedUser(user as AppUser & { permissions: Permission[] });
        setIsDeleteUserOpen(true);
    }

    const openPermissionsDialog = (user: AppUser & { permissions: Permission[] }) => {
        setSelectedUser({ ...user });
        setIsPermissionsOpen(true);
    }

    const openResetPasswordDialog = (user: AppUser) => {
        const newPassword = generatePassword();
        const updatedUser = { ...user, password: newPassword };

        setAppUsers(appUsers.map(u => (u.id === user.id ? updatedUser : u)));
        setSelectedUser(updatedUser as AppUser & { permissions: Permission[] });
        setResetPasswordInfo({ name: user.name, password: newPassword });
        setShowResetPassword(false);
        setIsResetPasswordOpen(true);
    };


    const handlePermissionChange = (permissionId: Permission, checked: boolean) => {
        if (selectedUser) {
            const newPermissions = checked
                ? [...selectedUser.permissions, permissionId]
                : selectedUser.permissions.filter(p => p !== permissionId);
            setSelectedUser({ ...selectedUser, permissions: newPermissions });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied to clipboard!",
        });
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                ))}
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full gap-4">
            <Tabs defaultValue="users" onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-full max-w-lg grid-cols-3 p-0 bg-transparent gap-2">
                    <TabsTrigger 
                        value="users"
                        className={cn(
                            "data-[state=active]:shadow-none transition-all duration-200",
                            activeTab === 'users' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'
                        )}
                    >
                        <Users className="mr-2 h-4 w-4" />User Management
                    </TabsTrigger>
                    <TabsTrigger 
                        value="logs"
                        className={cn(
                            "data-[state=active]:shadow-none transition-all duration-200",
                            activeTab === 'logs' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'
                        )}
                    >
                        <LogIn className="mr-2 h-4 w-4" />Login Logs
                    </TabsTrigger>
                    <TabsTrigger 
                        value="transactions"
                        className={cn(
                            "data-[state=active]:shadow-none transition-all duration-200",
                            activeTab === 'transactions' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'
                        )}
                    >
                        <Receipt className="mr-2 h-4 w-4" />Transactions
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="users" className="flex-1 mt-4">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>User Management</CardTitle>
                                    <CardDescription>Monitor and manage all {appUsers.length} application users.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button className="bg-primary/90 hover:bg-primary" onClick={() => setIsFeedbackOpen(true)}>
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        View Feedback
                                    </Button>
                                    <Button onClick={openAddUserDialog} className="bg-primary/90 hover:bg-primary">
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Add User
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last Login</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {appUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.id}</TableCell>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={getStatusBadgeVariant(user.accountStatus)}
                                                    className={
                                                        user.accountStatus === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                                        : user.accountStatus === 'Inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-200'
                                                        : ''
                                                    }
                                                >
                                                    {user.accountStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(user.lastLogin).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
                                            <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button className="bg-primary/10 hover:bg-primary/20 text-primary" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                                    <UserCog className="mr-2 h-4 w-4" />
                                                    Edit User
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openPermissionsDialog(user)}>
                                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                                    Assign Permissions
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openResetPasswordDialog(user)}>
                                                    <KeyRound className="mr-2 h-4 w-4" />
                                                    Reset Password
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>
                                                    <View className="mr-2 h-4 w-4" />
                                                    View as User
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(user)}>
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
                </TabsContent>
                <TabsContent value="logs" className="flex-1 mt-4">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Login Logs</CardTitle>
                            <CardDescription>View a history of user login attempts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loginLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <div className="font-medium">{log.userName}</div>
                                                <div className="text-sm text-muted-foreground">{log.userId}</div>
                                            </TableCell>
                                            <TableCell>{log.ipAddress}</TableCell>
                                            <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={getLoginStatusBadgeVariant(log.status)}
                                                    className={
                                                        log.status === 'Success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                                    }
                                                >
                                                    {log.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="transactions" className="flex-1 mt-4">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>View a history of all transactions.</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

             <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>Fill in the details to create a new user.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="col-span-3" />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Password</Label>
                            <div className="col-span-3 flex items-center gap-2 relative">
                                <Input value={newUser.password} readOnly type={showNewPassword ? 'text' : 'password'} />
                                <Button size="icon" variant="ghost" className="absolute right-1" onClick={() => setShowNewPassword(!showNewPassword)}>
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleAddUser}>Add User</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isUserInfoOpen} onOpenChange={setIsUserInfoOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>User Created Successfully</DialogTitle>
                        <DialogDescription>
                            Please save the following credentials for the new user: <span className="font-bold">{createdUserInfo?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    {createdUserInfo && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">User ID</Label>
                                <div className="col-span-3 flex items-center gap-2">
                                    <Input value={createdUserInfo.id} readOnly />
                                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(createdUserInfo.id)}><ClipboardCopy className="h-4 w-4" /></Button>
                                </div>
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Password</Label>
                                <div className="col-span-3 flex items-center gap-2 relative">
                                    <Input value={createdUserInfo.password} readOnly type={showNewPassword ? 'text' : 'password'} />
                                    <Button size="icon" variant="ghost" className="absolute right-10" onClick={() => setShowNewPassword(!showNewPassword)}>
                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                     <Button size="icon" variant="ghost" onClick={() => copyToClipboard(createdUserInfo.password)}><ClipboardCopy className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button onClick={() => setIsUserInfoOpen(false)}>Done</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Password Reset</DialogTitle>
                        <DialogDescription>
                            A new password has been generated for <span className="font-bold">{resetPasswordInfo?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    {resetPasswordInfo && (
                        <div className="grid gap-4 py-4">
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">New Password</Label>
                                <div className="col-span-3 flex items-center gap-2 relative">
                                    <Input value={resetPasswordInfo.password} readOnly type={showResetPassword ? 'text' : 'password'} />
                                    <Button size="icon" variant="ghost" className="absolute right-10" onClick={() => setShowResetPassword(!showResetPassword)}>
                                        {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                     <Button size="icon" variant="ghost" onClick={() => copyToClipboard(resetPasswordInfo.password)}><ClipboardCopy className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button onClick={() => { setIsResetPasswordOpen(false); setSelectedUser(null); }}>Done</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>Update the details for {selectedUser?.name}.</DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                         <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">Name</Label>
                                <Input id="edit-name" value={selectedUser.name} onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-status" className="text-right">Status</Label>
                                <Select value={selectedUser.accountStatus} onValueChange={(value: 'Active' | 'Inactive') => setSelectedUser({...selectedUser, accountStatus: value})}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary" onClick={() => setSelectedUser(null)}>Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleEditUser}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the user account for <span className="font-bold">{selectedUser?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary" onClick={() => setSelectedUser(null)}>Cancel</Button>
                        </DialogClose>
                        <Button variant="destructive" onClick={handleDeleteUser}>Delete User</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Assign Permissions</DialogTitle>
                        <DialogDescription>
                            Manage permissions for <span className="font-bold">{selectedUser?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="py-4 space-y-6">
                            <div className="space-y-4">
                                <Label>Permissions</Label>
                                <div className="space-y-4">
                                    {allPermissions.map((permission) => (
                                        <div key={permission.id} className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">{permission.label}</Label>
                                                <p className="text-sm text-muted-foreground">{permission.description}</p>
                                            </div>
                                            <Switch
                                                checked={selectedUser.permissions.includes(permission.id)}
                                                onCheckedChange={(checked) => handlePermissionChange(permission.id, checked)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary" onClick={() => setSelectedUser(null)}>Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSavePermissions}>Save Permissions</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>User Feedback</DialogTitle>
                        <DialogDescription>
                            Here's what your users are saying. Click a row to mark it as read.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Feedback</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Timestamp</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {feedbackLogs.map((log) => (
                                    <TableRow 
                                        key={log.id} 
                                        onClick={() => toggleFeedbackRead(log.id)}
                                        className={cn("cursor-pointer", log.read && "bg-muted/50 text-muted-foreground")}
                                    >
                                        <TableCell>
                                            <div className="font-medium">{log.userName}</div>
                                            <div className="text-sm">{log.userId}</div>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">{log.feedback}</TableCell>
                                        <TableCell>{renderStars(log.rating)}</TableCell>
                                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                     <DialogFooter>
                        <DialogClose asChild>
                            <Button>Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
