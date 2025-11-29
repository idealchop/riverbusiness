'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Logo } from '@/components/icons';
import { Shield, Users, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/admin', label: 'User Management', icon: Users },
  // In a real app, you would have more admin pages.
  // For now, the user management page has a tabs for login logs.
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <Link href="/admin" className="flex items-center gap-2 font-semibold text-lg justify-center">
          <Shield className="h-8 w-8 text-primary group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10" />
          <span className="font-headline group-data-[collapsible=icon]:opacity-0">Admin Panel</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href) && (item.href !== '/admin' || pathname === '/admin')}
                  className={cn("justify-start")}
                  tooltip={item.label}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:opacity-0">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
