'use client';

import React from 'react';
import { useUser } from '@/firebase';
import { AdminDashboardSkeleton } from '@/components/admin/AdminDashboardSkeleton';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function AdminPage() {
    const { isUserLoading } = useUser();
    const [greeting, setGreeting] = React.useState('');
    
    // NOTE: Redirection logic for unauthorized identities is managed at the layout level
    // to provide universal protection for all routes under /admin/*.

    React.useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    if (isUserLoading) {
      return (
        <div className="flex flex-col gap-6 font-sans">
            <AdminDashboardSkeleton />
        </div>
      );
    }

    return (
        <div className="flex flex-col gap-8 font-sans pb-10">
            <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">{greeting}, Admin!</h1>
                <p className="text-slate-500 font-medium">Authorized Command Center Access Active.</p>
            </div>
            <AdminDashboard isAdmin={true} />
        </div>
    )
}
