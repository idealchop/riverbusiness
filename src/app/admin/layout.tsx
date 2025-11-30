'use client';
import React from 'react';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminSidebar } from '@/components/admin-sidebar';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon">
        <AdminSidebar />
      </Sidebar>
      <SidebarInset>
         <div className="flex flex-col h-screen">
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
            <SidebarTrigger />
            <div className="flex-1" />
            </header>
            <main className="flex-1 overflow-auto p-4 sm:p-6">
              {children}
            </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
