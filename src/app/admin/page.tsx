'use client';

import React from 'react';
import { useUser } from '@/firebase';
import { AdminDashboardSkeleton } from '@/components/admin/AdminDashboardSkeleton';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function AdminPage() {
    const { isUserLoading } = useUser();

    if (isUserLoading) {
      return (
        <div className="flex flex-col gap-6 font-sans">
            <AdminDashboardSkeleton />
        </div>
      );
    }

    return (
        <div className="pb-10">
            <AdminDashboard isAdmin={true} />
        </div>
    )
}
