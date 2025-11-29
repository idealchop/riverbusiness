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
import { Home, CreditCard, Droplet, Target, BarChart, FileCheck2, User, HelpCircle, Truck, TrendingUp, CheckSquare, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { 
    label: 'Water Management', 
    icon: Droplet,
    subItems: [
      { href: '/dashboard/deliveries', label: 'Deliveries', icon: Truck },
      { href: '/dashboard/quality', label: 'Quality', icon: CheckSquare },
      { href: '/dashboard/predict', label: 'Predictive Analytics', icon: TrendingUp },
    ]
  },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/support', label: 'Support', icon: HelpCircle },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg justify-center">
          <Logo className="h-8 w-8 text-primary group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10" />
          <span className="font-headline group-data-[collapsible=icon]:opacity-0">River Business</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
             item.subItems ? (
              <Accordion type="single" collapsible key={item.label} className="w-full">
                <AccordionItem value="item-1" className="border-none">
                  <AccordionTrigger className="w-full justify-start hover:no-underline [&[data-state=open]>svg]:-rotate-90">
                     <SidebarMenuButton
                        isActive={item.subItems.some(sub => pathname.startsWith(sub.href))}
                        className={cn("w-full justify-start")}
                        asChild
                      >
                        <div>
                          <item.icon className="h-5 w-5" />
                          <span className="group-data-[collapsible=icon]:opacity-0">{item.label}</span>
                        </div>
                      </SidebarMenuButton>
                  </AccordionTrigger>
                  <AccordionContent className="p-0 pl-7 group-data-[collapsible=icon]:hidden">
                     <SidebarMenu className="gap-0">
                      {item.subItems.map(subItem => (
                        <SidebarMenuItem key={subItem.href}>
                           <Link href={subItem.href}>
                              <SidebarMenuButton
                                isActive={pathname.startsWith(subItem.href)}
                                className={cn("justify-start w-full")}
                                tooltip={subItem.label}
                                size="sm"
                              >
                                <subItem.icon className="h-4 w-4" />
                                <span>{subItem.label}</span>
                              </SidebarMenuButton>
                           </Link>
                        </SidebarMenuItem>
                      ))}
                     </SidebarMenu>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
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
            )
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
