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
  CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const apps = [
  { id: '01', name: 'Water Logistic', href: '/dashboard', icon: Droplets, color: 'text-blue-500' },
  { id: '02', name: 'Workspace', href: '/workspace', icon: Briefcase, color: 'text-slate-600' },
  { id: '03', name: 'HR & Employee', href: '/hr-employee', icon: Users, color: 'text-blue-600' },
  { id: '04', name: 'Customers', href: '/customers', icon: Target, color: 'text-blue-400' },
  { id: '05', name: 'Solar Upgrades', href: '/solar-upgrades', icon: Sun, color: 'text-amber-500' },
  { id: '06', name: 'Business Insurance', href: '/business-insurance', icon: Umbrella, color: 'text-blue-700' },
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
      <PopoverContent align="end" className="w-[320px] p-4 shadow-2xl border-none rounded-3xl bg-white/95 backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-2">
          {apps.map((app) => {
            const Icon = app.icon;
            const isActive = pathname === app.href || (app.href === '/dashboard' && pathname.startsWith('/admin'));
            
            return (
              <Link key={app.id} href={app.href} className="group">
                <div className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 aspect-square text-center relative",
                  isActive ? "bg-primary/10" : "hover:bg-slate-50"
                )}>
                  <div className={cn(
                    "mb-2 transition-transform duration-300 group-hover:scale-110",
                    isActive ? "text-primary" : app.color
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 font-mono">
                      {app.id}
                    </p>
                    <p className={cn(
                      "text-[9px] font-black uppercase leading-tight tracking-tighter",
                      isActive ? "text-primary" : "text-slate-600"
                    )}>
                      {app.name}
                    </p>
                  </div>
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle2 className="h-2.5 w-2.5 text-primary" />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100">
           <div className="flex items-center justify-center gap-2">
             <div className="h-1 w-1 rounded-full bg-slate-300" />
             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">River Command Center</span>
             <div className="h-1 w-1 rounded-full bg-slate-300" />
           </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
