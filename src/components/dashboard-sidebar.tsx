
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
import { LayoutDashboard, Truck, CreditCard, Droplets, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Dialog, DialogTrigger } from './ui/dialog';


const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/deliveries', label: 'Deliveries', icon: Truck },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/water-stations', label: 'Water Stations', icon: Droplets },
  { href: '/dashboard/support', label: 'Support', icon: HelpCircle },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
          <Logo className="h-9 block group-data-[collapsible=icon]:hidden" />
          <Logo className="h-9 hidden group-data-[collapsible=icon]:block" />
          <span className="font-bold hidden group-data-[collapsible=icon]:hidden">River Business</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  className={cn("justify-start h-10 rounded-lg")}
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
        <div className="p-2 mt-auto">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-2 text-left h-auto"
              >
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} />
                    <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:opacity-0">
                    <span className="font-semibold text-sm">{user?.displayName}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </Button>
            </DialogTrigger>
            {/* The DialogContent for the user profile is in the main dashboard layout */}
          </Dialog>
        </div>
    </>
  );
}
