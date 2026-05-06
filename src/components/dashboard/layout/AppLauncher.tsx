'use client';

import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { 
  LayoutGrid, 
  Droplets, 
  Briefcase, 
  Users, 
  Target, 
  Sun, 
  Umbrella, 
  CheckCircle2,
  Pencil
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const apps = [
  { id: '01', name: 'Water Logistic', href: '/dashboard', icon: Droplets, color: 'text-blue-500' },
  { id: '02', name: 'Workspace', href: '/workspace', icon: Briefcase, color: 'text-slate-600' },
  { id: '03', name: 'HR & Employee', href: '/hr-employee', icon: Users, color: 'text-green-600' },
  { id: '04', name: 'Customers', href: '/customers', icon: Target, color: 'text-red-500' },
  { id: '05', name: 'Solar Upgrades', href: '/solar-upgrades', icon: Sun, color: 'text-amber-500' },
  { id: '06', name: 'Business Insurance', href: '/business-insurance', icon: Umbrella, color: 'text-indigo-600' },
];

export function AppLauncher() {
  const pathname = usePathname();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-slate-100 h-10 w-10 shrink-0"
        >
          <LayoutGrid className="h-5 w-5 text-slate-600" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-none rounded-[2.5rem] bg-[#f8faff]">
        <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-medium text-slate-800 tracking-tight">Your apps</h3>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                <Pencil className="h-5 w-5" />
            </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-y-8 gap-x-2">
          {apps.map((app) => {
            const Icon = app.icon;
            const isActive = pathname === app.href || (app.href === '/dashboard' && pathname.startsWith('/admin'));
            
            return (
              <Link key={app.id} href={app.href} className="group outline-none">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className={cn(
                    "flex items-center justify-center h-16 w-16 rounded-full transition-all duration-300 relative",
                    isActive ? "bg-primary/20" : "group-hover:bg-slate-200/50 group-focus:bg-slate-200/50"
                  )}>
                    <div className={cn(
                      "transition-transform duration-300 group-hover:scale-110",
                      isActive ? "text-primary" : app.color
                    )}>
                      <Icon className="h-8 w-8" />
                    </div>
                    {isActive && (
                      <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="text-center px-1">
                    <p className={cn(
                      "text-xs font-medium leading-tight tracking-tight text-slate-700 transition-colors",
                      isActive && "text-primary font-bold"
                    )}>
                      {app.name}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        
        <div className="mt-10 pt-4 border-t border-slate-100 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400">
                River Command Center
            </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
