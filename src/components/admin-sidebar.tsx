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
import { Shield, Users, LogIn, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/admin', label: 'User Management', icon: Users },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <Link href="/admin" className="flex items-center gap-2 font-semibold text-lg justify-center">
          <Logo className="h-9 w-9 group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11" />
          <span className="font-headline font-bold group-data-[collapsible=icon]:opacity-0">Admin Panel</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
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
