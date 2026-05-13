'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus, Building, PlusCircle, Users, Droplets, Receipt, Activity, ArrowUpRight, DollarSign, TrendingUp, TrendingDown, Minus, Contact } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AppUser, WaterStation, RefillRequest, Payment, Delivery } from '@/lib/types';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, collectionGroup, doc, Timestamp } from 'firebase/firestore';
import { AdminMyAccountDialog } from '@/components/AdminMyAccountDialog';
import { AdminDashboardSkeleton } from './AdminDashboardSkeleton';
import { startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';

import { UserManagementTab } from './tabs/UserManagementTab';
import { EmployeeManagementTab } from './tabs/EmployeeManagementTab';
import { StationManagementTab } from './tabs/StationManagementTab';
import { CreateUserDialog } from './dialogs/CreateUserDialog';
import { StationProfileDialog } from './dialogs/StationProfileDialog';
import { UserDetailsDialog } from './dialogs/UserDetailsDialog';
import { cn } from '@/lib/utils';

const toSafeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    if (typeof timestamp === 'object' && 'seconds' in timestamp) return new Date(timestamp.seconds * 1000);
    return null;
};

export function AdminDashboard({ isAdmin }: { isAdmin: boolean }) {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => (firestore && isAdmin) ? query(collection(firestore, 'users')) : null, [firestore, isAdmin]);
    const { data: allUsers, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);

    const unclaimedProfilesQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'unclaimedProfiles') : null, [firestore, isAdmin]);
    const { data: unclaimedProfiles, isLoading: unclaimedProfilesLoading } = useCollection<any>(unclaimedProfilesQuery);

    const unclaimedEmployeesQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'unclaimedEmployees') : null, [firestore, isAdmin]);
    const { data: unclaimedEmployees } = useCollection<any>(unclaimedEmployeesQuery);

    const waterStationsQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'waterStations') : null, [firestore, isAdmin]);
    const { data: waterStations, isLoading: stationsLoading } = useCollection<WaterStation>(waterStationsQuery);

    const refillRequestsQuery = useMemoFirebase(() => (firestore && isAdmin) ? query(collectionGroup(firestore, 'refillRequests')) : null, [firestore, isAdmin]);
    const { data: refillRequests, isLoading: refillRequestsLoading } = useCollection<RefillRequest>(refillRequestsQuery);
    
    const allDeliveriesQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'deliveries') : null, [firestore]);
    const { data: allDeliveries, isLoading: allDeliveriesLoading } = useCollection<Delivery>(allDeliveriesQuery);

    const allPaymentsQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'payments') : null, [firestore]);
    const { data: allPayments, isLoading: allPaymentsLoading } = useCollection<Payment & { parentId: string }>(allPaymentsQuery, {
        idField: 'parentId'
    });

    const [isUserDetailOpen, setIsUserDetailOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<AppUser | null>(null);
    const [initialUserDetailTab, setInitialUserDetailTab] = React.useState<string | undefined>();
    
    const [stationToUpdate, setStationToUpdate] = React.useState<WaterStation | null>(null);
    const [isStationProfileOpen, setIsStationProfileOpen] = React.useState(false);
    
    const [isCreateUserOpen, setIsCreateUserOpen] = React.useState(false);
    const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);

    const adminUserDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
    const { data: adminUser } = useDoc<AppUser>(adminUserDocRef);

    const salesMetrics = useMemo(() => {
        if (!allDeliveries) return { currentMonthSales: 0, lifetimeSales: 0, diff: 0, trend: 'same' };

        const now = new Date();
        const curStart = startOfMonth(now);
        const curEnd = endOfMonth(now);
        const lastStart = startOfMonth(subMonths(now, 1));
        const lastEnd = endOfMonth(subMonths(now, 1));

        let current = 0;
        let last = 0;
        let lifetime = 0;

        allDeliveries.forEach(d => {
            const dDate = toSafeDate(d.date);
            const amt = d.amount || 0;
            lifetime += amt;
            if (dDate) {
                if (isWithinInterval(dDate, { start: curStart, end: curEnd })) current += amt;
                if (isWithinInterval(dDate, { start: lastStart, end: lastEnd })) last += amt;
            }
        });

        const diff = last === 0 ? (current > 0 ? 100 : 0) : ((current - last) / last) * 100;
        const trend = diff > 0 ? 'increase' : (diff < 0 ? 'decrease' : 'same');

        return {
            currentMonthSales: current,
            lifetimeSales: lifetime,
            diff: Math.abs(diff),
            trend
        };
    }, [allDeliveries]);

    const stats = useMemo(() => {
        const clients = (allUsers || []).filter(u => u.email !== 'admin@riverph.com' && u.hrRole !== 'employee');
        const employees = (allUsers || []).filter(u => u.hrRole === 'employee');
        
        const totalClients = clients.length + (unclaimedProfiles?.length || 0);
        const activeRefills = refillRequests?.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled').length || 0;

        return [
            { 
                title: 'Total Clients', 
                value: totalClients.toLocaleString(), 
                icon: Building, 
                color: 'text-blue-500', 
                bg: 'bg-blue-50',
                description: 'Business accounts'
            },
            { 
                title: 'Managed Employees', 
                value: (employees.length + (unclaimedEmployees?.length || 0)).toLocaleString(), 
                icon: Users, 
                color: 'text-indigo-500', 
                bg: 'bg-indigo-50',
                description: 'Verified staff members'
            },
            { 
                title: 'Sales (MTD)', 
                value: `₱${salesMetrics.currentMonthSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 
                icon: DollarSign, 
                color: 'text-purple-500', 
                bg: 'bg-purple-50',
                trend: salesMetrics.trend,
                diff: salesMetrics.diff,
                description: salesMetrics.trend === 'increase' ? 'Up vs last month' : 'Growth tracking'
            },
            { 
                title: 'Refill Queue', 
                value: activeRefills, 
                icon: Droplets, 
                color: 'text-amber-500', 
                bg: 'bg-amber-50',
                description: 'Active requests'
            },
        ];
    }, [allUsers, unclaimedProfiles, unclaimedEmployees, refillRequests, salesMetrics]);

    React.useEffect(() => {
        const openAccountDialog = () => setIsAccountDialogOpen(true);
        const openUserDetail = (event: Event) => {
            const customEvent = event as CustomEvent;
            const userId = customEvent.detail.userId;
            if(userId) {
                const userToOpen = allUsers?.find(u => u.id === userId);
                if (userToOpen) {
                    setSelectedUser(userToOpen);
                    setIsUserDetailOpen(true);
                }
            }
        };
    
        window.addEventListener('admin-open-my-account', openAccountDialog);
        window.addEventListener('admin-open-user-detail', openUserDetail);
    
        return () => {
          window.removeEventListener('admin-open-my-account', openAccountDialog);
          window.removeEventListener('admin-open-user-detail', openUserDetail);
        };
    }, [allUsers]);
    
    const handleOpenUserDetails = (user: AppUser, tab?: string) => {
        setSelectedUser(user);
        setInitialUserDetailTab(tab);
        setIsUserDetailOpen(true);
    };

    return (
    <>
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                            <div className={cn("p-2 rounded-lg transition-colors", stat.bg)}>
                                <stat.icon className={cn("h-4 w-4", stat.color)} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <div className="flex items-center mt-1 gap-2">
                                {stat.trend && (
                                    <div className={cn(
                                        "flex items-center text-[10px] font-bold uppercase",
                                        stat.trend === 'increase' && 'text-green-600',
                                        stat.trend === 'decrease' && 'text-red-600',
                                        stat.trend === 'same' && 'text-muted-foreground'
                                    )}>
                                        {stat.trend === 'increase' && <TrendingUp className="h-3 w-3 mr-0.5" />}
                                        {stat.trend === 'decrease' && <TrendingDown className="h-3 w-3 mr-0.5" />}
                                        {stat.trend === 'same' && <Minus className="h-3 w-3 mr-0.5" />}
                                        {stat.diff !== undefined && `${stat.diff.toFixed(0)}%`}
                                    </div>
                                )}
                                <p className="text-[10px] text-muted-foreground truncate">
                                    {stat.description}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs defaultValue="user-management" className="space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="user-management" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Building className="mr-2 h-4 w-4"/>
                            Clients
                        </TabsTrigger>
                        <TabsTrigger value="employee-management" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Users className="mr-2 h-4 w-4"/>
                            Employees
                        </TabsTrigger>
                        <TabsTrigger value="station-management" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Droplets className="mr-2 h-4 w-4" />
                            Stations
                        </TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="user-management" className="mt-0">
                    <UserManagementTab 
                        appUsers={allUsers}
                        unclaimedProfiles={unclaimedProfiles}
                        refillRequests={refillRequests}
                        refillRequestsLoading={refillRequestsLoading}
                        allPayments={allPayments}
                        onUserClick={handleOpenUserDetails}
                        onAddNewClientClick={() => setIsCreateUserOpen(true)}
                    />
                </TabsContent>

                <TabsContent value="employee-management" className="mt-0">
                    <EmployeeManagementTab 
                        allUsers={allUsers}
                        unclaimedEmployees={unclaimedEmployees}
                        onUserClick={handleOpenUserDetails}
                    />
                </TabsContent>

                <TabsContent value="station-management" className="mt-0">
                   <StationManagementTab 
                        waterStations={waterStations}
                        isAdmin={isAdmin}
                        onStationClick={(s) => { setStationToUpdate(s); setIsStationProfileOpen(true); }}
                   />
                </TabsContent>
            </Tabs>
        </div>
        
        {selectedUser && (
            <UserDetailsDialog
                isOpen={isUserDetailOpen}
                onOpenChange={(open) => {
                    if (!open) setInitialUserDetailTab(undefined);
                    setIsUserDetailOpen(open);
                }}
                user={selectedUser}
                setSelectedUser={setSelectedUser}
                isAdmin={isAdmin}
                allUsers={allUsers || []}
                waterStations={waterStations || []}
                initialTab={initialUserDetailTab}
            />
        )}
        
        <CreateUserDialog
            isOpen={isCreateUserOpen}
            onOpenChange={setIsCreateUserOpen}
            parentUsers={allUsers?.filter(u => u.accountType === 'Parent') || []}
        />
       
        <StationProfileDialog
            isOpen={isStationProfileOpen}
            onOpenChange={setIsStationProfileOpen}
            station={stationToUpdate}
            isAdmin={isAdmin}
        />

        <AdminMyAccountDialog
            adminUser={adminUser}
            isOpen={isAccountDialogOpen}
            onOpenChange={setIsAccountDialogOpen}
        />
    </>
  );
}

