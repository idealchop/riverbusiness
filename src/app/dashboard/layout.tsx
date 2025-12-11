
'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarRail } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin-sidebar';
import { DashboardSidebar } from '@/components/dashboard-sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <SidebarProvider>
      <Sidebar>
        {isAdminRoute ? <AdminSidebar /> : <DashboardSidebar />}
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <SidebarTrigger className="sm:hidden" />
          <div className="flex-1" />
          {/* Header content from old layouts can be merged here if needed */}
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="container mx-auto">
              {children}
            </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
