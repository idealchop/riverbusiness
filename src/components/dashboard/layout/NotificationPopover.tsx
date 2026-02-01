
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
import { Bell, Truck, ShieldCheck, FileHeart, Receipt, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp, doc, writeBatch } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';

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
            if (notif.id) { // Ensure the notification has an ID
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
          variant="outline"
          size="icon"
          className="relative rounded-full"
        >
          <Bell className="h-4 w-4" />
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
            Your recent account updates.
          </p>
        </div>
        <Separator className="my-4" />
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification) => {
              const Icon = ICONS[notification.type] || Info;
              const date = notification.date instanceof Timestamp ? notification.date.toDate() : null;
              const isActionable = ['payment', 'delivery', 'sanitation', 'compliance'].includes(notification.type);

              return (
                <div key={notification.id} className="grid grid-cols-[25px_1fr] items-start gap-4">
                  <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.description}</p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-1">
                      <p>{date ? formatDistanceToNow(date, { addSuffix: true }) : 'Just now'}</p>
                      {isActionable &&
                        <button onClick={() => onNotificationClick(notification)} className="font-medium text-primary hover:underline">View details</button>
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
  );
}
