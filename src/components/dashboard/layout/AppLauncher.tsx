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
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const apps = [
  { 
    id: '01', 
    name: 'Water Logistic', 
    href: '/dashboard', 
    iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2Fwater.svg?alt=media&token=fe3a77fb-7ae5-4568-93f7-7a3e2340288f' 
  },
  { 
    id: '02', 
    name: 'Collaboration', 
    href: '/workspace', 
    iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FCollaboration.svg?alt=media&token=6d687bc0-125b-4ad1-ad48-fc2ceb1b07d9' 
  },
  { 
    id: '03', 
    name: 'HR & Employee', 
    href: '/hr-dashboard', 
    iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FEmployee.svg?alt=media&token=f56983da-df57-429c-b67e-e57faa2ce2a6' 
  },
  { 
    id: '04', 
    name: 'Customers', 
    href: '/customers', 
    iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2Fcustomers.svg?alt=media&token=33c27f8f-7a05-4133-bf25-ec3949110bcb' 
  },
  { 
    id: '05', 
    name: 'Solar Upgrades', 
    href: '/solar-upgrades', 
    iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2Fsolar-energy.svg?alt=media&token=2afce575-87ba-40c8-b7f9-5ebd6c5ee284' 
  },
  { 
    id: '06', 
    name: 'Benefits', 
    href: '/business-insurance', 
    iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FBenefits.svg?alt=media&token=e0a007ac-1929-4a32-afda-8e91c416b62c' 
  },
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
      <PopoverContent align="end" className="w-[360px] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-none rounded-[2.8rem] bg-slate-100">
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8 px-1">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Your apps</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-y-10 gap-x-2">
            {apps.map((app) => {
              const isActive = pathname === app.href || (app.href === '/dashboard' && pathname.startsWith('/admin'));
              
              return (
                <Link key={app.id} href={app.href} className="group outline-none">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className={cn(
                      "flex items-center justify-center h-16 w-16 rounded-full transition-all duration-300 relative",
                      isActive ? "bg-primary/10" : "bg-slate-50 group-hover:bg-slate-100 group-focus:bg-slate-100"
                    )}>
                      <div className="relative h-8 w-8 transition-transform duration-300 group-hover:scale-110">
                        <Image 
                          src={app.iconUrl} 
                          alt={app.name} 
                          fill 
                          className="object-contain"
                        />
                      </div>
                      {isActive && (
                        <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-primary/20">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="text-center px-1">
                      <p className={cn(
                        "text-[10px] font-black leading-tight tracking-[0.05em] uppercase text-slate-700 transition-colors",
                        isActive && "text-primary"
                      )}>
                        {app.name}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          
          <div className="mt-12 pt-4 border-t border-slate-100 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-400">
                  River Command Center
              </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
