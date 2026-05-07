'use client';
import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bell, User, Receipt, Info, MessageSquare } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { AppUser, Notification as NotificationType } from '@/lib/types';
import { doc, collection, query, writeBatch, Timestamp, where, orderBy } from 'firebase/firestore';
import { useMounted } from '@/hooks/use-mounted';
import { FullScreenLoader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { LogoBlack } from '@/components/icons';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import { UserMenu } from '@/components/dashboard/layout/UserMenu';
import { AdminMyAccountDialog } from '@/components/AdminMyAccountDialog';
import { NotificationPopover } from '@/components/dashboard/layout/NotificationPopover';
import { signOut } from 'firebase/auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const auth = useAuth();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isMounted = useMounted();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const adminUserDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: adminUser } = useDoc<AppUser>(adminUserDocRef);

  const notificationsQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'users', authUser.uid, 'notifications'), orderBy('date', 'desc')) : null, [firestore, authUser]);
  const { data: notifications } = useCollection<NotificationType>(notificationsQuery);
  
  const usersWithUnreadQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), where('hasUnreadUserMessages', '==', true)) : null, [firestore]);
  const { data: usersWithUnreadMessages } = useCollection(usersWithUnreadQuery);

  const hasUnreadChatMessages = useMemo(() => (usersWithUnreadMessages?.length || 0) > 0, [usersWithUnreadMessages]);
  
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  
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

  const handleNotificationClick = (notification: NotificationType) => {
    if (notification.data?.userId) {
        window.dispatchEvent(new CustomEvent('admin-open-user-detail', { detail: { userId: notification.data.userId } }));
    }
  };

  if (!isMounted || !auth || isUserLoading || isLoggingOut) {
    return <FullScreenLoader text={isLoggingOut ? "Signing out..." : undefined} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50/50">
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md shadow-sm sm:h-16 sm:px-6">
        <Link href="/admin" className="flex items-center gap-3 group">
          <LogoBlack className="h-10 w-10 transition-transform group-hover:scale-105" />
          <div className="flex flex-col">
              <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 leading-tight">Command</span>
              <span className="font-bold text-[10px] uppercase tracking-widest text-slate-400 leading-tight">Center</span>
          </div>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="rounded-full relative border-slate-200 h-10 w-10 group hover:bg-slate-50" asChild>
            <Link href="/admin/live-chat">
                <MessageSquare className="h-5 w-5 text-slate-600" />
                {hasUnreadChatMessages && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background shadow-sm" />
                )}
            </Link>
          </Button>

          <NotificationPopover 
            notifications={notifications || []}
            onNotificationClick={handleNotificationClick}
          />

          <AppLauncher />

          <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

          <UserMenu 
            user={adminUser} 
            onOpenSettings={() => setIsAccountDialogOpen(true)} 
            onLogout={handleLogout} 
          />
          
          <AdminMyAccountDialog
            adminUser={adminUser}
            isOpen={isAccountDialogOpen}
            onOpenChange={setIsAccountDialogOpen}
          />
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        <div className="container mx-auto max-w-7xl">
            {children}
        </div>
      </main>
    </div>
  );
}
