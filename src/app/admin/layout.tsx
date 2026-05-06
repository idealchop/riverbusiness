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
import { Logo } from '@/components/icons';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';

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
    <div className="flex flex-col h-screen bg-slate-50/50">
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md shadow-sm sm:h-16 sm:px-6">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-lg group">
            <div className="flex items-center gap-2">
                <Logo className="h-8 w-8 transition-transform group-hover:scale-110" />
                <span className="hidden sm:block text-slate-900">River Command</span>
                <Badge variant="outline" className="text-[10px] uppercase font-black bg-blue-50 text-blue-600 border-blue-200 px-2 py-0">Admin</Badge>
            </div>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="outline" className="rounded-full relative border-slate-200 shadow-sm h-10 px-4 group hover:bg-slate-50" asChild>
            <Link href="/admin/live-chat">
                <span className="relative flex items-center mr-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-700">Support Feed</span>
                {hasUnreadChatMessages && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-background shadow-sm" />
                )}
            </Link>
          </Button>

          <Popover onOpenChange={handleNotificationOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full hover:bg-slate-100"
              >
                <Bell className="h-5 w-5 text-slate-600" />
                 {unreadNotifications.length > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-[10px] font-bold border-2 border-background">
                        {unreadNotifications.length}
                    </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0 shadow-2xl border-none rounded-xl overflow-hidden">
               <div className="p-4 bg-muted/30 border-b">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-slate-900">Notifications</h4>
                    {unreadNotifications.length > 0 && (
                        <Badge className="bg-primary text-[10px] font-bold px-2 py-0.5">{unreadNotifications.length} New</Badge>
                    )}
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">Updates from your client network</p>
              </div>
              <div className="max-h-80 overflow-y-auto bg-background">
                  {notifications && notifications.length > 0 ? (
                      <div className="divide-y divide-slate-50">
                        {notifications.map((notification) => {
                            const Icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
                            const date = notification.date instanceof Timestamp ? notification.date.toDate() : null;
                            const isActionable = !!notification.data?.userId;

                            return (
                                <div 
                                  key={notification.id} 
                                  className={cn(
                                    "flex items-start gap-3 p-4 transition-colors", 
                                    isActionable ? "cursor-pointer hover:bg-slate-50" : "opacity-80"
                                  )} 
                                  onClick={() => isActionable && handleNotificationClick(notification)}
                                >
                                    <div className="p-2 rounded-full bg-slate-100">
                                      <Icon className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <p className="text-sm font-bold leading-tight text-slate-900">
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {notification.description}
                                        </p>
                                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{date ? formatDistanceToNow(date, { addSuffix: true }) : 'Just now'}</p>
                                          {isActionable && <span className="text-[10px] font-black uppercase text-primary tracking-widest">Details →</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                      </div>
                  ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-center px-8 opacity-40">
                        <Bell className="h-10 w-10 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">No activity alerts</p>
                      </div>
                  )}
              </div>
            </PopoverContent>
          </Popover>

          <AppLauncher />

          <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

          <Button
            variant="ghost"
            className="flex items-center p-1 rounded-full hover:bg-slate-100 transition-colors group"
            onClick={handleOpenMyAccount}
          >
            <Avatar className="h-8 w-8 border border-slate-200 shadow-sm transition-transform group-hover:scale-105">
              <AvatarImage src={adminUser?.photoURL ?? undefined} alt="Admin" />
              <AvatarFallback className="bg-slate-900 text-white font-bold text-xs"><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
          </Button>
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