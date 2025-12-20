'use client';

import React from 'react';
import { useUser } from '@/firebase';
import { ShieldX } from 'lucide-react';
import { AdminDashboardSkeleton } from '@/components/admin/AdminDashboardSkeleton';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function AdminPage() {
    const { user: authUser, isUserLoading } = useUser();
    const [isAdmin, setIsAdmin] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    
    React.useEffect(() => {
        if (isUserLoading) return;
        if (!authUser) {
            setIsLoading(false);
            return;
        };

        if (authUser.email === 'admin@riverph.com') {
            setIsAdmin(true);
        }
        setIsLoading(false);
    }, [authUser, isUserLoading]);
    
    const [greeting, setGreeting] = React.useState('');
    React.useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    if (isLoading || isUserLoading) {
      return (
        <div className="flex flex-col gap-6 font-sans">
            <AdminDashboardSkeleton />
        </div>
      );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
                <ShieldX className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-3xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-6 font-sans">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{greeting}, Admin!</h1>
            </div>
            <AdminDashboard isAdmin={isAdmin} />
        </div>
    )
}
