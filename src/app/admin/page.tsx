
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { appUsers as initialAppUsers, loginLogs } from '@/lib/data';
import { MoreHorizontal, UserCog, UserPlus, KeyRound, Trash2, ShieldCheck, View } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppUser, Permission } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const allPermissions: { id: Permission, label: string, description: string }[] = [
    { id: 'view_dashboard', label: 'View Dashboard', description: 'Can view the main dashboard.' },
    { id: 'view_payments', label: 'View Payments', description: 'Can view payment history and billing.' },
    { id: 'manage_deliveries', label: 'Manage Deliveries', description: 'Can track and manage water deliveries.' },
    { id: 'view_quality_reports', label: 'View Quality Reports', description: 'Can access water quality and compliance reports.' },
    { id: 'manage_users', label: 'Manage Users', description: 'Can add, edit, and delete other users.' },
    { id: 'access_admin_panel', label: 'Access Admin Panel', description: 'Can access the administrative section.' },
];

export default function AdminPage() {
    const [appUsers, setAppUsers] = useState(initialAppUsers.map(u => ({...u, permissions: u.role === 'Admin' ? allPermissions.map(p => p.id) : ['view_dashboard', 'view_payments']})));
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
    const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser & { permissions: Permission[] } | null>(null);
    const [newUser, setNewUser] = useState({ id: `USR-${(appUsers.length + 1).toString().padStart(3, '0')}`, name: '', role: 'Member' as 'Admin' | 'Member', accountStatus: 'Active' as 'Active' | 'Suspended', lastLogin: new Date().toISOString(), totalConsumptionLiters: 0, permissions: ['view_dashboard'] as Permission[] });

    const getStatusBadgeVariant = (status: 'Active' | 'Inactive' | 'Suspended'): 'default' | 'secondary' | 'destructive' => {
        switch (status) {
            case 'Active':
                return 'default';
            case 'Inactive':
                return 'secondary';
            case 'Suspended':
                return 'destructive';
            default:
                return 'secondary';
        }
    };
    
    const getLoginStatusBadgeVariant = (status: 'Success' | 'Failure'): 'default' | 'destructive' => {
        return status === 'Success' ? 'default' : 'destructive';
    }

    const handleAddUser = () => {
        setAppUsers([...appUsers, { ...newUser, id: `USR-${(appUsers.length + 1).toString().padStart(3, '0')}` }]);
        setIsAddUserOpen(false);
        setNewUser({ id: `USR-${(appUsers.length + 2).toString().padStart(3, '0')}`, name: '', role: 'Member', accountStatus: 'Active', lastLogin: new Date().toISOString(), totalConsumptionLiters: 0, permissions: ['view_dashboard'] });
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

    const handlePermissionChange = (permissionId: Permission, checked: boolean) => {
        if (selectedUser) {
            const newPermissions = checked
                ? [...selectedUser.permissions, permissionId]
                : selectedUser.permissions.filter(p => p !== permissionId);
            setSelectedUser({ ...selectedUser, permissions: newPermissions });
        }
    };


    return (
        <div className="flex flex-col h-full gap-4">
            <Tabs defaultValue="users" className="flex flex-col flex-1">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="users">User Management</TabsTrigger>
                    <TabsTrigger value="logs">Login Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="users" className="flex-1 mt-4">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>User Management</CardTitle>
                                    <CardDescription>Monitor and manage all {appUsers.length} application users.</CardDescription>
                                </div>
                                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Add User
                                        </Button>
                                    </DialogTrigger>
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
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant="outline">Cancel</Button>
                                            </DialogClose>
                                            <Button onClick={handleAddUser}>Add User</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
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
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                                    }
                                                >
                                                    {user.accountStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(user.lastLogin).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
                                            <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
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
                                                <DropdownMenuItem>
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
            </Tabs>
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
                                <Select value={selectedUser.accountStatus} onValueChange={(value: 'Active' | 'Inactive' | 'Suspended') => setSelectedUser({...selectedUser, accountStatus: value})}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                        <SelectItem value="Suspended">Suspended</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
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
                            <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
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
                            <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSavePermissions}>Save Permissions</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


    