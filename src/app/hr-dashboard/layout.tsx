'use client';

import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Menu,
  GraduationCap,
  MapPin,
  Fingerprint
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { doc, collection, query, orderBy, where } from 'firebase/firestore';
import { FullScreenLoader } from '@/components/ui/loader';
import { LogoBlack } from '@/components/icons';
import { UserMenu } from '@/components/dashboard/layout/UserMenu';
import { MyAccountDialog } from '@/components/MyAccountDialog';
import { NotificationPopover } from '@/components/dashboard/layout/NotificationPopover';
import { OfficeLocationDialog } from '@/components/hr/OfficeLocationDialog';
import { signOut } from 'firebase/auth';
import type { Notification as NotificationType, AppUser } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useMounted } from '@/hooks/use-mounted';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isMounted = useMounted();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

  const notificationsQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'users', authUser.uid, 'notifications'), orderBy('date', 'desc')) : null, [firestore, authUser]);
  const { data: notifications } = useCollection<NotificationType>(notificationsQuery);

  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);

  useEffect(() => {
    const handleOpenOfficeSettings = () => setIsLocationDialogOpen(true);
    window.addEventListener('open-office-settings', handleOpenOfficeSettings);
    return () => window.removeEventListener('open-office-settings', handleOpenOfficeSettings);
  }, []);

  React.useEffect(() => {
    if (!isUserLoading && !authUser && !isLoggingOut) {
      router.push('/login');
    }
  }, [authUser, isUserLoading, router, isLoggingOut]);

  const handleLogout = async () => {
    if (!auth) return;
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
    }
  }

  if (isUserLoading || isUserDocLoading || !isMounted || isLoggingOut) {
    return <FullScreenLoader text={isLoggingOut ? "Signing out..." : undefined} />;
  }

  // IDENTIFIER: Workspace Owner is defined as the user with a "Current active plan"
  const isWorkspaceOwner = !!user?.plan;
  const isManagement = isWorkspaceOwner || user?.hrRole === 'admin';
  const companyId = user?.companyId || user?.clientId || 'default';

  // Dynamic Navigation based on Role
  const navItems = [
    { href: '/hr-dashboard', label: 'Overview', icon: LayoutDashboard, condition: true },
    { href: '/hr-dashboard/employees', label: 'Employees', icon: Users, condition: isManagement },
    { href: '/hr-dashboard/attendance', label: 'Attendance', icon: Database, condition: true },
    { href: '/hr-dashboard/payroll', label: 'Payroll Engine', icon: DollarSign, condition: isManagement },
    { href: '/hr-dashboard/leave', label: 'Leave Review', icon: CalendarDays, condition: isManagement },
  ].filter(item => item.condition);

  const SidebarContentArea = () => (
    <div className="flex flex-col h-full overflow-hidden">
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
                    <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
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

        <div className="mt-auto space-y-3 p-6">
            <Card asChild className="border-none shadow-2xl rounded-[2rem] bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white overflow-hidden relative cursor-pointer group hover:shadow-primary/20 transition-all duration-500 aspect-square flex flex-col items-center justify-center text-center p-0">
                <Link href="/hr-dashboard/modules" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-700">
                        <GraduationCap className="h-16 w-16" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="p-4 rounded-2xl bg-white/20 shadow-lg backdrop-blur-md border border-white/30 group-hover:bg-white/30 transition-colors">
                            <BookOpen className="h-7 w-7 text-white" />
                        </div>
                        <div className="space-y-1.5 px-4">
                            <CardTitle className="text-lg font-black tracking-tighter text-white uppercase leading-none">Learning Hub</CardTitle>
                            <CardDescription className="text-blue-100 font-bold text-[10px] uppercase tracking-[0.2em] opacity-80">Training Resources</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest pt-2 bg-black/10 px-4 py-1.5 rounded-full border border-white/10 group-hover:bg-black/20 transition-colors">
                            Open <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                    
                    <div className="absolute -bottom-6 -left-6 h-24 w-24 bg-white/10 rounded-full blur-3xl" />
                </Link>
            </Card>

            {isWorkspaceOwner && (
                <Card 
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-office-settings'));
                        setIsMobileMenuOpen(false);
                    }}
                    className="border-none shadow-md rounded-2xl bg-slate-900 text-white cursor-pointer group hover:bg-slate-800 transition-all p-4 flex items-center justify-between overflow-hidden relative h-16 shrink-0"
                >
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/10 text-primary-light group-hover:bg-white/20 transition-colors">
                            <MapPin className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none">QR Attendance</p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest opacity-80">Geo-Fence Config</p>
                        </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-700 group-hover:text-white transition-colors relative z-10" />
                    <div className="absolute -top-1 -right-1 p-2 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <MapPin className="h-10 w-10" />
                    </div>
                </Card>
            )}
        </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50/30 overflow-hidden font-sans">
      <aside className="hidden md:flex w-72 flex-col border-r bg-white shrink-0">
        <SidebarContentArea />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="md:hidden">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-72 border-none">
                        <SheetHeader className="sr-only">
                            <SheetTitle>Navigation Menu</SheetTitle>
                        </SheetHeader>
                        <SidebarContentArea />
                    </SheetContent>
                </Sheet>
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
              showOfficeSetup={isWorkspaceOwner}
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

      <OfficeLocationDialog 
        isOpen={isLocationDialogOpen} 
        onOpenChange={setIsLocationDialogOpen} 
        companyId={companyId} 
      />
    </div>
  );
}
