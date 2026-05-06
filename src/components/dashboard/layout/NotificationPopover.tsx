'use client';

import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Notification as NotificationType } from '@/lib/types';
import { Bell, Truck, ShieldCheck, FileHeart, Receipt, Info, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp, doc, writeBatch } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';

const ICONS: { [key: string]: React.ElementType } = {
  delivery: Truck,
  compliance: ShieldCheck,
  sanitation: FileHeart,
  payment: Receipt,
  general: Info,
  'top-up': Info,
};

interface NotificationPopoverProps {
  notifications: NotificationType[];
  onNotificationClick: (notification: NotificationType) => void;
}

export function NotificationPopover({ notifications, onNotificationClick }: NotificationPopoverProps) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const [unreadNotifications, setUnreadNotifications] = React.useState<NotificationType[]>([]);

  React.useEffect(() => {
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

  return (
    <Popover onOpenChange={handleNotificationOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-slate-100"
        >
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadNotifications.length > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-[10px] font-bold border-2 border-background shadow-sm">
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
              <Badge className="bg-primary text-[10px] font-bold px-2 py-0.5">
                {unreadNotifications.length} New
              </Badge>
            )}
          </div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">
            Stay updated on your account activity
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto bg-background">
          {notifications && notifications.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {notifications.map((notification) => {
                const Icon = ICONS[notification.type] || Info;
                const date = notification.date instanceof Timestamp ? notification.date.toDate() : null;
                const isActionable = ['payment', 'delivery', 'sanitation', 'compliance'].includes(notification.type);

                return (
                  <div 
                    key={notification.id} 
                    className={cn(
                      "flex items-start gap-3 p-4 transition-colors",
                      isActionable ? "cursor-pointer hover:bg-slate-50" : "opacity-80"
                    )}
                    onClick={() => isActionable && onNotificationClick(notification)}
                  >
                    <div className="p-2 rounded-full bg-slate-100 shrink-0">
                      <Icon className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-bold leading-tight text-slate-900">{notification.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{notification.description}</p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {date ? formatDistanceToNow(date, { addSuffix: true }) : 'Just now'}
                        </p>
                        {isActionable && (
                          <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1">
                            Action Required <ChevronRight className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center px-8 opacity-40">
              <Bell className="h-10 w-10 mb-2" />
              <p className="text-xs font-bold uppercase tracking-widest">No unread alerts</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
