'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, 
  Database, 
  DollarSign, 
  CalendarDays, 
  LayoutDashboard, 
  ChevronRight,
  ShieldCheck,
  UserCircle,
  Clock,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { FullScreenLoader } from '@/components/ui/loader';
import { LogoBlack } from '@/components/icons';
import { UserMenu } from '@/components/dashboard/layout/UserMenu';
import { MyAccountDialog } from '@/components/MyAccountDialog';
import { NotificationPopover } from '@/components/dashboard/layout/NotificationPopover';
import { signOut } from 'firebase/auth';
import type { Notification as NotificationType, AppUser } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const managerNavItems = [
  { href: '/hr-dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/hr-dashboard/employees', label: 'Employees', icon: Users },
  { href: '/hr-dashboard/attendance', label: 'Attendance', icon: Database },
  { href: '/hr-dashboard/payroll', label: 'Payroll Engine', icon: DollarSign },
  { href: '/hr-dashboard/leave', label: 'Leave Review', icon: CalendarDays },
];

const employeeNavItems = [
  { href: '/hr-dashboard', label: 'My Workspace', icon: LayoutDashboard },
  { href: '/hr-dashboard/attendance', label: 'My Records', icon: Database },
  { href: '/hr-dashboard/leave', label: 'File Leave', icon: CalendarDays },
];

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

  const notificationsQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'users', authUser.uid, 'notifications'), orderBy('date', 'desc')) : null, [firestore, authUser]);
  const { data: notifications } = useCollection<NotificationType>(notificationsQuery);

  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isUserLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isUserLoading, router]);

  if (isUserLoading || isUserDocLoading) {
    return <FullScreenLoader />;
  }

  const handleLogout = () => {
    if (!auth) return;
    signOut(auth).then(() => {
      router.push('/login');
    })
  }

  const isManagement = user?.hrRole === 'owner' || user?.hrRole === 'admin';
  const navItems = isManagement ? managerNavItems : employeeNavItems;

  return (
    <div className="flex h-screen bg-slate-50/30 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r bg-white shrink-0">
        <div className="flex flex-col h-full overflow-hidden">
            {/* Top Navigation area */}
            <div className="p-6 flex-1 overflow-y-auto">
                <Link href="/dashboard" className="flex items-center gap-3 group mb-8">
                    <LogoBlack className="h-10 w-10 transition-transform group-hover:scale-105" />
                    <div className="flex flex-col">
                    <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 leading-tight">HR</span>
                    <span className="font-bold text-[10px] uppercase tracking-widest text-slate-400 leading-tight">Management</span>
                    </div>
                </Link>

                <nav className="space-y-1">
                    {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                        <div className={cn(
                            "flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                            isActive 
                            ? "bg-slate-100 text-slate-900 shadow-sm" 
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}>
                            <div className="flex items-center gap-3">
                            <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "group-hover:text-slate-900")} />
                            <span className="text-sm font-semibold tracking-tight">{item.label}</span>
                            </div>
                            {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
                        </div>
                        </Link>
                    );
                    })}
                </nav>
            </div>

            {/* Bottom Card Area */}
            <div className="p-6 mt-auto">
                <Card asChild className="border-none shadow-xl rounded-3xl bg-gradient-to-br from-primary to-blue-700 text-white overflow-hidden relative cursor-pointer group hover:scale-[1.02] transition-all">
                    <Link href="/hr-dashboard/modules">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                            <BookOpen className="h-20 w-20" />
                        </div>
                        <CardHeader className="p-5">
                            <div className="p-2 rounded-xl bg-white/10 w-fit mb-3">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-base font-black uppercase tracking-tight leading-tight">Learning Hub</CardTitle>
                            <CardDescription className="text-white/60 font-bold text-[10px] uppercase tracking-widest">Training Modules</CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 pt-0">
                            <p className="text-[11px] font-medium text-white/80 leading-relaxed mb-4">
                                Access exclusive technical documentation and video training.
                            </p>
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                                Open Library <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="md:hidden flex items-center gap-2">
                <LogoBlack className="h-8 w-8" />
                <span className="font-black text-[10px] uppercase tracking-widest text-slate-900">HR Management</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Environment:</span>
                <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                    {user?.businessName || 'Standard'}
                </Badge>
             </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationPopover 
              notifications={notifications || []}
              onNotificationClick={() => {}}
            />
            
            <AppLauncher />

            <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

            <UserMenu 
              user={user} 
              onOpenSettings={() => setIsAccountDialogOpen(true)} 
              onLogout={handleLogout} 
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      <MyAccountDialog
        user={user}
        authUser={authUser}
        planImage={null}
        paymentHistory={[]}
        paymentsLoading={false}
        onLogout={handleLogout}
        onPayNow={() => {}}
        isOpen={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
      />
    </div>
  );
}
