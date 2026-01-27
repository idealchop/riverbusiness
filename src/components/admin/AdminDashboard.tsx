

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Building, PlusCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AppUser, WaterStation, RefillRequest, Payment } from '@/lib/types';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, collectionGroup, doc } from 'firebase/firestore';
import { AdminMyAccountDialog } from '@/components/AdminMyAccountDialog';
import { AdminDashboardSkeleton } from './AdminDashboardSkeleton';

import { UserManagementTab } from './tabs/UserManagementTab';
import { StationManagementTab } from './tabs/StationManagementTab';
import { CreateUserDialog } from './dialogs/CreateUserDialog';
import { StationProfileDialog } from './dialogs/StationProfileDialog';
import { UserDetailsDialog } from './dialogs/UserDetailsDialog';


export function AdminDashboard({ isAdmin }: { isAdmin: boolean }) {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => (firestore && isAdmin) ? query(collection(firestore, 'users'), where('role', '==', 'User')) : null, [firestore, isAdmin]);
    const { data: appUsers, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);

    const unclaimedProfilesQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'unclaimedProfiles') : null, [firestore, isAdmin]);
    const { data: unclaimedProfiles, isLoading: unclaimedProfilesLoading } = useCollection<any>(unclaimedProfilesQuery);

    const waterStationsQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'waterStations') : null, [firestore, isAdmin]);
    const { data: waterStations, isLoading: stationsLoading } = useCollection<WaterStation>(waterStationsQuery);

    const refillRequestsQuery = useMemoFirebase(() => (firestore && isAdmin) ? query(collectionGroup(firestore, 'refillRequests')) : null, [firestore, isAdmin]);
    const { data: refillRequests, isLoading: refillRequestsLoading } = useCollection<RefillRequest>(refillRequestsQuery);
    
    const allPaymentsQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'payments') : null, [firestore]);
    const { data: allPayments, isLoading: allPaymentsLoading } = useCollection<Payment & { parentId: string }>(allPaymentsQuery, {
        idField: 'parentId'
    });

    const [isUserDetailOpen, setIsUserDetailOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<AppUser | null>(null);
    
    const [stationToUpdate, setStationToUpdate] = React.useState<WaterStation | null>(null);
    const [isStationProfileOpen, setIsStationProfileOpen] = React.useState(false);
    
    const [isCreateUserOpen, setIsCreateUserOpen] = React.useState(false);
    const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);

    const adminUserDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
    const { data: adminUser } = useDoc<AppUser>(adminUserDocRef);

    React.useEffect(() => {
        const openAccountDialog = () => setIsAccountDialogOpen(true);
        const openUserDetail = (event: Event) => {
            const customEvent = event as CustomEvent;
            const userId = customEvent.detail.userId;
            if(userId) {
                const userToOpen = appUsers?.find(u => u.id === userId);
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
    }, [appUsers]);
    
    const handleOpenUserDetails = (user: AppUser) => {
        setSelectedUser(user);
        setIsUserDetailOpen(true);
    };

    const handleOpenStationProfile = (station: WaterStation | null) => {
        setStationToUpdate(station);
        setIsStationProfileOpen(true);
    };


    if (usersLoading || stationsLoading || unclaimedProfilesLoading) {
        return <AdminDashboardSkeleton />;
    }

  return (
    <>
        <div className="space-y-6">
            <Tabs defaultValue="user-management">
                <TabsList>
                    <TabsTrigger value="user-management"><Users className="mr-2 h-4 w-4"/>User Management</TabsTrigger>
                    <TabsTrigger value="station-management"><Building className="mr-2 h-4 w-4" />Station Management</TabsTrigger>
                </TabsList>
                <TabsContent value="user-management">
                    <UserManagementTab 
                        appUsers={appUsers}
                        unclaimedProfiles={unclaimedProfiles}
                        refillRequests={refillRequests}
                        refillRequestsLoading={refillRequestsLoading}
                        allPayments={allPayments}
                        onUserClick={handleOpenUserDetails}
                        onAddNewClientClick={() => setIsCreateUserOpen(true)}
                    />
                </TabsContent>
                <TabsContent value="station-management">
                   <StationManagementTab 
                        waterStations={waterStations}
                        isAdmin={isAdmin}
                        onStationClick={handleOpenStationProfile}
                   />
                </TabsContent>
            </Tabs>
        </div>
        
        {selectedUser && (
            <UserDetailsDialog
                isOpen={isUserDetailOpen}
                onOpenChange={setIsUserDetailOpen}
                user={selectedUser}
                setSelectedUser={setSelectedUser}
                isAdmin={isAdmin}
                allUsers={appUsers || []}
                waterStations={waterStations || []}
            />
        )}
        
        <CreateUserDialog
            isOpen={isCreateUserOpen}
            onOpenChange={setIsCreateUserOpen}
            parentUsers={appUsers?.filter(u => u.accountType === 'Parent') || []}
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
