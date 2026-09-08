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
  CheckCircle2,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { getAppAvailability, type RiverAppId } from '@/lib/workspace-access';

const apps: { id: RiverAppId; name: string; href: string; iconUrl: string; disabledHint: string }[] = [
  { 
    id: 'water', 
    name: 'Water Refill', 
    href: '/dashboard', 
    iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2Fwater.svg?alt=media&token=fe3a77fb-7ae5-4568-93f7-7a3e2340288f',
    disabledHint: 'Company plans only',
  },
  { 
    id: 'teams', 
    name: 'Team Hub', 
    href: '/hr-dashboard', 
    iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FEmployee.svg?alt=media&token=f56983da-df57-429c-b67e-e57faa2ce2a6',
    disabledHint: 'Company plans only',
  },
  { 
    id: 'collab', 
    name: 'Documents', 
    href: '/workspace', 
    iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FCollaboration.svg?alt=media&token=6d687bc0-125b-4ad1-ad48-fc2ceb1b07d9',
    disabledHint: 'Unavailable',
  },
  { 
    id: 'files', 
    name: 'Files', 
    href: '/files', 
    iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FFiles.svg?alt=media&token=7f746199-877e-455f-a96f-91b619f9c66a',
    disabledHint: 'Unavailable',
  },
];

export function AppLauncher() {
  const pathname = usePathname();
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user } = useDoc<AppUser>(userDocRef);
  const availability = getAppAvailability(user);

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
      <PopoverContent align="end" className="w-[360px] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-none rounded-[2.8rem] bg-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-8 px-1">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Your Apps</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-y-10 gap-x-2">
            {apps.map((app) => {
              const status = availability[app.id];
              if (status === 'hidden') return null;

              const isActive = pathname === app.href || (app.href === '/dashboard' && pathname.startsWith('/admin')) || (app.href === '/hr-dashboard' && pathname.startsWith('/hr-dashboard')) || (app.href === '/workspace' && pathname.startsWith('/workspace')) || (app.href === '/files' && pathname.startsWith('/files'));
              const isDisabled = status === 'disabled';

              const content = (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className={cn(
                      "flex items-center justify-center h-16 w-16 rounded-full transition-all duration-300 relative",
                      isDisabled
                        ? "bg-slate-100"
                        : isActive 
                          ? "bg-primary/10" 
                          : "bg-slate-50 group-hover:bg-slate-100 group-hover:scale-105 group-focus:bg-slate-100"
                    )}>
                      <div className={cn("relative h-8 w-8 transition-transform duration-300", isDisabled && "grayscale opacity-40")}>
                        <Image 
                          src={app.iconUrl} 
                          alt={app.name} 
                          fill 
                          className="object-contain"
                        />
                      </div>
                      {isActive && !isDisabled && (
                        <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-md border border-primary/20 animate-in zoom-in-50">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      {isDisabled && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-200">
                          <Lock className="h-3 w-3 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="text-center px-1">
                      <p className={cn(
                        "text-[10px] font-bold leading-tight tracking-[0.02em] transition-colors",
                        isDisabled ? "text-slate-400" : isActive ? "text-primary" : "text-slate-700 group-hover:text-slate-900"
                      )}>
                        {app.name}
                      </p>
                      {isDisabled && (
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mt-1">{app.disabledHint}</p>
                      )}
                    </div>
                  </div>
              );

              if (isDisabled) {
                return (
                  <div key={app.id} className="opacity-70 cursor-not-allowed select-none" aria-disabled="true" title={app.disabledHint}>
                    {content}
                  </div>
                );
              }
              
              return (
                <Link key={app.id} href={app.href} className="group outline-none">
                  {content}
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
