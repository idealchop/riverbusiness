'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, 
  Clock, 
  DollarSign, 
  CalendarDays, 
  LayoutDashboard, 
  ChevronRight,
  ShieldCheck,
  UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { FullScreenLoader } from '@/components/ui/loader';
import { Logo } from '@/components/icons';

const navItems = [
  { href: '/hr-dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/hr-dashboard/employees', label: 'Employees', icon: Users },
  { href: '/hr-dashboard/attendance', label: 'Attendance', icon: Clock },
  { href: '/hr-dashboard/payroll', label: 'Payroll', icon: DollarSign },
  { href: '/hr-dashboard/leave', label: 'Leaves', icon: CalendarDays },
];

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: user, isLoading: isUserDocLoading } = useDoc(userDocRef);

  React.useEffect(() => {
    if (!isUserLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isUserLoading, router]);

  if (isUserLoading || isUserDocLoading) {
    return <FullScreenLoader />;
  }

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r bg-white shrink-0">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2 group mb-8">
            <Logo className="h-8 w-8 transition-transform group-hover:scale-110" />
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-tight text-slate-900 leading-none">River Business</span>
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-1">HR & Employee</span>
            </div>
          </Link>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-2xl transition-all group",
                    isActive 
                      ? "bg-green-50 text-green-700 shadow-sm shadow-green-200/50" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}>
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-5 w-5", isActive ? "text-green-600" : "group-hover:text-slate-900")} />
                      <span className="text-sm font-bold tracking-tight">{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="h-4 w-4" />}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-3 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-16 w-16" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Your Security</p>
            <h4 className="text-xs font-bold leading-relaxed relative z-10">Data is isolated by Company Protocol.</h4>
            <Badge className="bg-green-500 text-white border-none text-[8px] font-black uppercase">Verified Tenant</Badge>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="md:hidden">
                <Logo className="h-8 w-8" />
             </div>
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Environment:</span>
                <Badge variant="outline" className="text-[10px] font-black bg-blue-50 text-blue-700 border-blue-200">
                    {user?.businessName || 'Standard'}
                </Badge>
             </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full border bg-slate-50">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-900 leading-none capitalize">{user?.hrRole || 'User'}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{user?.name}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-slate-600">
                 <UserCircle className="h-5 w-5" />
              </div>
            </div>
            <AppLauncher />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
