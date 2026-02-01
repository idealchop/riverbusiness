
'use client';
import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bell, User, Receipt, FileUp, Info, MessageSquare } from 'lucide-react';
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


const NOTIFICATION_ICONS: { [key: string]: React.ElementType } = {
  payment: Receipt,
  general: Info,
  delivery: Info,
  'top-up': Info,
  compliance: Info,
  sanitation: Info,
  default: Bell,
};

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

  const adminUserDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: adminUser } = useDoc<AppUser>(adminUserDocRef);

  const notificationsQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'users', authUser.uid, 'notifications'), orderBy('date', 'desc')) : null, [firestore, authUser]);
  const { data: notifications } = useCollection<NotificationType>(notificationsQuery);
  
  const usersWithUnreadQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), where('hasUnreadUserMessages', '==', true)) : null, [firestore]);
  const { data: usersWithUnreadMessages } = useCollection(usersWithUnreadQuery);

  const hasUnreadChatMessages = useMemo(() => (usersWithUnreadMessages?.length || 0) > 0, [usersWithUnreadMessages]);
  
  const [unreadNotifications, setUnreadNotifications] = useState<NotificationType[]>([]);
  
  useEffect(() => {
    if (notifications) {
      setUnreadNotifications(notifications.filter(n => !n.isRead));
    }
  }, [notifications]);

  const handleNotificationOpenChange = (open: boolean) => {
    if (!open && unreadNotifications.length > 0 && firestore && authUser) {
        const batch = writeBatch(firestore);
        unreadNotifications.forEach(notif => {
            if (notif.id) {
                const notifRef = doc(firestore, 'users', authUser.uid, 'notifications', notif.id);
                batch.update(notifRef, { isRead: true });
            }
        });
        batch.commit().catch(err => console.error("Failed to mark notifications as read:", err));
    }
  };

  const handleNotificationClick = (notification: NotificationType) => {
    if (notification.data?.userId) {
        window.dispatchEvent(new CustomEvent('admin-open-user-detail', { detail: { userId: notification.data.userId } }));
    }
  };

  React.useEffect(() => {
    if (!isUserLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isUserLoading, router]);

  const handleOpenMyAccount = () => {
    window.dispatchEvent(new CustomEvent('admin-open-my-account'));
  };

  if (!isMounted || !auth || isUserLoading) {
    return <FullScreenLoader />;
  }

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
        <Link href="/admin" className="flex items-center gap-2 font-semibold text-lg">
            <div className="flex items-center">
                <span className="font-bold">River Business</span>
            </div>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <Button variant="outline" className="rounded-full relative" asChild>
            <Link href="/admin/live-chat">
                <span className="relative flex items-center mr-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                </span>
                <span className="mr-2 hidden sm:inline">Live Support</span>
                {hasUnreadChatMessages && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background" />
                )}
            </Link>
          </Button>

          <Popover onOpenChange={handleNotificationOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative overflow-hidden rounded-full"
              >
                <Bell className="h-5 w-5" />
                 {unreadNotifications.length > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">
                        {unreadNotifications.length}
                    </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96">
               <div className="space-y-2">
                  <div className="flex justify-between items-center">
                  <h4 className="font-medium text-sm">Notifications</h4>
                   {unreadNotifications.length > 0 && (
                      <Badge variant="secondary" className="rounded-sm">
                          {unreadNotifications.length} New
                      </Badge>
                   )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recent updates from your clients.
                  </p>
              </div>
              <Separator className="my-4" />
                <div className="space-y-4 max-h-80 overflow-y-auto">
                    {notifications && notifications.length > 0 ? (
                        notifications.map((notification) => {
                            const Icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
                            const date = notification.date instanceof Timestamp ? notification.date.toDate() : null;
                             const isActionable = !!notification.data?.userId;

                            return (
                                <div key={notification.id} className={cn("grid grid-cols-[25px_1fr] items-start gap-4", isActionable && "cursor-pointer hover:bg-accent -mx-2 px-2 py-1 rounded-md")} onClick={() => isActionable && handleNotificationClick(notification)}>
                                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {notification.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {notification.description}
                                        </p>
                                        <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                           <p>{date ? formatDistanceToNow(date, { addSuffix: true }) : 'Just now'}</p>
                                           {isActionable && 
                                             <span className="font-medium text-primary">View details</span>
                                           }
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No new notifications.</p>
                    )}
                </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="overflow-hidden rounded-full"
            onClick={handleOpenMyAccount}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={adminUser?.photoURL ?? undefined} alt="Admin" />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <div className="container mx-auto max-w-7xl">
            {children}
        </div>
      </main>
    </div>
  );
}
