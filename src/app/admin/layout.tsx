
'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { AppUser } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useMounted } from '@/hooks/use-mounted';

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

  React.useEffect(() => {
    if (!isUserLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isUserLoading, router]);

  const handleOpenMyAccount = () => {
    window.dispatchEvent(new CustomEvent('admin-open-my-account'));
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col h-screen">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative overflow-hidden rounded-full"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  You have 0 new notifications.
                </p>
              </div>
              <Separator className="my-4" />
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
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
