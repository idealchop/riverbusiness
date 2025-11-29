import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { appUsers, loginLogs } from '@/lib/data';
import { MoreHorizontal, UserCog, UserPlus, KeyRound, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminPage() {
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

    const getRoleBadgeVariant = (role: 'Admin' | 'Member'): 'default' | 'secondary' => {
        return role === 'Admin' ? 'default' : 'secondary';
    }
    
    const getLoginStatusBadgeVariant = (status: 'Success' | 'Failure'): 'default' | 'destructive' => {
        return status === 'Success' ? 'default' : 'destructive';
    }

    return (
        <Tabs defaultValue="users" className="flex flex-col h-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="logs">Login Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="flex-1">
                <Card className="h-full">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>User Management</CardTitle>
                                <CardDescription>Monitor and manage application users.</CardDescription>
                            </div>
                            <Button>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add User
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
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
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={getRoleBadgeVariant(user.role)}
                                                className={
                                                    user.role === 'Admin' ? 'border-primary text-primary' : ''
                                                }
                                            >
                                                {user.role}
                                            </Badge>
                                        </TableCell>
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
                                            <DropdownMenuItem>
                                                <UserCog className="mr-2 h-4 w-4" />
                                                Edit User
                                            </DropdownMenuItem>
                                             <DropdownMenuItem>
                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                                Assign Roles/Permissions
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
            </TabsContent>
            <TabsContent value="logs" className="flex-1">
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
    );
}
