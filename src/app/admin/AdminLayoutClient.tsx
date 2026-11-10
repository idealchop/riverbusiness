
'use client';
import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bell, User, Receipt, Info, MessageSquare } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { AppUser, Notification as NotificationType } from '@/lib/types';
import { doc, collection, query, writeBatch, Timestamp, where, orderBy, limit } from 'firebase/firestore';
import { useMounted } from '@/hooks/use-mounted';
import { FullScreenLoader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Wordmark } from '@/components/river/ui';
import { writeLastScreen } from '@/lib/screen-cache';
import { isWaterAdminEmail } from '@/lib/admin-access';
import { AdminMyAccountDialog } from '@/components/AdminMyAccountDialog';
import { NotificationPopover } from '@/components/dashboard/layout/NotificationPopover';
import { signOut } from 'firebase/auth';

export default function AdminLayoutClient({
  children,
  devAdminEmails = [],
}: {
  children: React.ReactNode;
  devAdminEmails?: readonly string[];
}) {
  const router = useRouter();
  const pathname = usePathname() || '/admin';
  const auth = useAuth();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isMounted = useMounted();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const adminUserDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: adminUser } = useDoc<AppUser>(adminUserDocRef);

  const notificationsQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'users', authUser.uid, 'notifications'), orderBy('date', 'desc'), limit(40)) : null, [firestore, authUser]);
  const { data: notifications } = useCollection<NotificationType>(notificationsQuery);
  
  const usersWithUnreadQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), where('hasUnreadUserMessages', '==', true)) : null, [firestore]);
  const { data: usersWithUnreadMessages } = useCollection(usersWithUnreadQuery);

  const hasUnreadChatMessages = useMemo(() => (usersWithUnreadMessages?.length || 0) > 0, [usersWithUnreadMessages]);
  
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);

  useEffect(() => {
    writeLastScreen(pathname);
  }, [pathname]);
  
  React.useEffect(() => {
    if (isUserLoading || isLoggingOut) return;

    if (!authUser) {
      router.push('/login');
      return;
    }

    // REDIRECTION PROTOCOL: If not the authorized admin identity, route to client dashboard
    if (!isWaterAdminEmail(authUser.email, devAdminEmails)) {
      router.push('/dashboard');
    }
  }, [authUser, isUserLoading, router, isLoggingOut, devAdminEmails]);

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

  // Prevent rendering content for unauthorized identities to ensure zero visual leak
  const isAuthorized = isWaterAdminEmail(authUser?.email, devAdminEmails);

  if (!isMounted || !auth || isUserLoading || isLoggingOut || !isAuthorized) {
    return <FullScreenLoader text={isLoggingOut ? "Signing out..." : "Verifying credentials..."} />;
  }

  return (
    <div className="rb-app flex h-dvh flex-col overflow-hidden bg-[#F5F5F7]">
      <header className="flex h-16 shrink-0 items-center gap-2 px-4 md:px-8">
        <Link href="/admin" className="mr-auto flex items-center" aria-label="River">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-full" asChild>
            <Link href="/admin/live-chat" aria-label="Live chat">
                <MessageSquare className="h-5 w-5" strokeWidth={1.85} />
                {hasUnreadChatMessages && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#F5F5F7] bg-[#DC2626]" />
                )}
            </Link>
          </Button>

          <NotificationPopover
            appearance="plain"
            notifications={notifications || []}
            onNotificationClick={handleNotificationClick}
          />

          <Button variant="ghost" className="hidden h-9 rounded-xl px-3 text-[13.5px] font-bold md:inline-flex" onClick={() => router.push('/admin/settings')}>
            Account
          </Button>
          <button type="button" aria-label="Account" onClick={() => router.push('/admin/settings')} className="grid h-11 w-11 place-items-center rounded-full bg-[#1A2C49] text-[13px] font-extrabold text-white">
            {(adminUser?.supportDisplayName || adminUser?.name || 'A').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
          </button>
          
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
