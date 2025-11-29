import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { appUsers } from '@/lib/data';
import { MoreHorizontal, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Monitor and manage application users.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Total Consumption (Liters)</TableHead>
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
                                <TableCell>{user.totalConsumptionLiters.toLocaleString()}</TableCell>
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
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
