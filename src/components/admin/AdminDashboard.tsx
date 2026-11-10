'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus, Building, PlusCircle, Users, Droplets, Receipt, Activity, ArrowUpRight, DollarSign, TrendingUp, TrendingDown, Minus, Contact, Tag, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AppUser, WaterStation, RefillRequest, Payment, Delivery, PricingHistory } from '@/lib/types';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, collectionGroup, doc, Timestamp, orderBy, limit } from 'firebase/firestore';
import { WeekDeliveries } from '@/components/river/admin-week';
import { formatPeso } from '@/lib/format-money';
import { AdminMyAccountDialog } from '@/components/AdminMyAccountDialog';
import { AdminDashboardSkeleton } from './AdminDashboardSkeleton';
import { startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';

import { UserManagementTab } from './tabs/UserManagementTab';
import { EmployeeManagementTab } from './tabs/EmployeeManagementTab';
import { StationManagementTab } from './tabs/StationManagementTab';
import { CreateUserDialog } from './dialogs/CreateUserDialog';
import { StationProfileDialog } from './dialogs/StationProfileDialog';
import { UserDetailsDialog } from './dialogs/UserDetailsDialog';
import { GlobalPricingDialog } from './dialogs/GlobalPricingDialog';
import { LogisticsCalendar } from './LogisticsCalendar';
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

    const refillRequestsQuery = useMemoFirebase(() => (firestore && isAdmin) ? query(
        collectionGroup(firestore, 'refillRequests'),
        where('status', 'in', ['Requested', 'In Production', 'Out for Delivery']),
        orderBy('requestedAt', 'desc'),
        limit(50),
    ) : null, [firestore, isAdmin]);
    const { data: refillRequests, isLoading: refillRequestsLoading } = useCollection<RefillRequest>(refillRequestsQuery);
    
    const allDeliveriesQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'deliveries') : null, [firestore]);
    const { data: allDeliveries, isLoading: allDeliveriesLoading } = useCollection<Delivery>(allDeliveriesQuery);

    const allPaymentsQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'payments') : null, [firestore]);
    const { data: allPayments, isLoading: allPaymentsLoading } = useCollection<Payment & { parentId: string }>(allPaymentsQuery, {
        idField: 'parentId'
    });

    const pricingQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricing_history'), orderBy('updatedAt', 'desc'), limit(1)) : null, [firestore]);
    const { data: latestPricing } = useCollection<PricingHistory>(pricingQuery);

    const [isUserDetailOpen, setIsUserDetailOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<AppUser | null>(null);
    const [initialUserDetailTab, setInitialUserDetailTab] = React.useState<string | undefined>();
    
    const [stationToUpdate, setStationToUpdate] = React.useState<WaterStation | null>(null);
    const [isStationProfileOpen, setIsStationProfileOpen] = React.useState(false);
    
    const [isCreateUserOpen, setIsCreateUserOpen] = React.useState(false);
    const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
    const [isPricingDialogOpen, setIsPricingDialogOpen] = React.useState(false);

    const adminUserDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
    const { data: adminUser } = useDoc<AppUser>(adminUserDocRef);

    const currentGlobalPrice = latestPricing?.[0]?.containerPrice || 0;

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
        const totalClients = clients.length + (unclaimedProfiles?.length || 0);

        return [
            { 
                id: 'clients',
                title: 'Total Clients', 
                value: totalClients.toLocaleString(), 
                icon: Building, 
                color: 'text-blue-500', 
                bg: 'bg-blue-50',
                description: 'Business accounts'
            },
            { 
                id: 'pricing',
                title: 'Global Container Rate', 
                value: formatPeso(currentGlobalPrice), 
                icon: Tag, 
                color: 'text-indigo-500', 
                bg: 'bg-indigo-50',
                description: 'Standardized rate'
            },
            { 
                id: 'sales-mtd',
                title: 'Sales (MTD)', 
                value: formatPeso(salesMetrics.currentMonthSales), 
                icon: DollarSign, 
                color: 'text-purple-500', 
                bg: 'bg-purple-50',
                trend: salesMetrics.trend,
                diff: salesMetrics.diff,
                description: salesMetrics.trend === 'increase' ? 'Up vs last month' : 'Growth tracking'
            },
            { 
                id: 'sales-lifetime',
                title: 'Lifetime Sales', 
                value: formatPeso(salesMetrics.lifetimeSales), 
                icon: TrendingUp, 
                color: 'text-emerald-500', 
                bg: 'bg-emerald-50',
                description: 'All-time volume'
            },
        ];
    }, [allUsers, unclaimedProfiles, salesMetrics, currentGlobalPrice]);

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
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Clients</h1>
                <Button onClick={() => setIsCreateUserOpen(true)} className="h-9 rounded-xl bg-[#1A2C49] px-3 text-[13.5px] font-bold md:h-[46px] md:px-5 md:text-[15px]">
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    <span className="md:hidden">Add</span>
                    <span className="hidden md:inline">Add new client</span>
                </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map((stat) => (
                    <button
                        key={stat.id}
                        type="button"
                        onClick={() => stat.id === 'pricing' && setIsPricingDialogOpen(true)}
                        className="rounded-[24px] bg-white px-[18px] py-4 text-left shadow-[0_1px_2px_rgba(16,16,24,0.04),0_10px_28px_-10px_rgba(16,16,24,0.12)]"
                    >
                        <p className="text-[13px] font-semibold text-[#8A8A94]">{stat.id === 'clients' ? 'Total clients' : stat.id === 'pricing' ? 'Container rate' : stat.id === 'sales-mtd' ? 'Sales (MTD)' : 'Lifetime sales'}</p>
                        <p className="mt-1.5 text-[24px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{stat.value}</p>
                    </button>
                ))}
            </div>

            <div className="md:hidden">
                {(refillRequests || []).filter((request) => request.status !== 'Completed' && request.status !== 'Cancelled').slice(0, 1).map((request) => (
                    <button key={request.id} type="button" onClick={() => {
                        const match = allUsers?.find((user) => user.id === request.userId);
                        if (match) handleOpenUserDetails(match);
                    }} className="flex min-h-[72px] w-full items-center rounded-[28px] bg-[#EEF2F7] px-4 text-left">
                        <span>
                            <b className="block text-[16px]">{request.businessName}</b>
                            <span className="text-[14px] font-semibold text-[#8A8A94]">{request.volumeContainers ? `${request.volumeContainers} containers` : 'ASAP'}</span>
                        </span>
                    </button>
                ))}
            </div>

            <div className="hidden md:block">
                <WeekDeliveries users={allUsers || []} onOpenUser={(user) => handleOpenUserDetails(user)} />
            </div>

            <details className="hidden rounded-[24px] bg-white p-4 md:block">
                <summary className="cursor-pointer text-[14px] font-bold text-[#8A8A94]">Full month calendar</summary>
                <div className="pt-4">
                    <LogisticsCalendar users={allUsers || []} refillRequests={refillRequests || []} />
                </div>
            </details>

            <Tabs defaultValue="user-management" className="space-y-4">
                <TabsList className="grid h-12 w-full grid-cols-3 rounded-[16px] bg-[#F4F4F6] p-1 md:w-[320px]">
                    <TabsTrigger value="user-management" className="rounded-[12px] text-[13.5px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Clients</TabsTrigger>
                    <TabsTrigger value="employee-management" className="rounded-[12px] text-[13.5px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Employees</TabsTrigger>
                    <TabsTrigger value="station-management" className="rounded-[12px] text-[13.5px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Stations</TabsTrigger>
                </TabsList>
                
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

        <GlobalPricingDialog
            isOpen={isPricingDialogOpen}
            onOpenChange={setIsPricingDialogOpen}
            allActiveUsers={(allUsers || []).filter(u => u.subscriptionStatus === 'activated')}
            currentGlobalPrice={currentGlobalPrice}
            adminUser={adminUser}
        />

        <AdminMyAccountDialog
            adminUser={adminUser}
            isOpen={isAccountDialogOpen}
            onOpenChange={setIsAccountDialogOpen}
        />
    </>
  );
}