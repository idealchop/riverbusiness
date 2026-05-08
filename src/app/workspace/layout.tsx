
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { FullScreenLoader } from '@/components/ui/loader';
import { Sidebar } from '@/components/collaboration/Sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Menu, ChevronRight, LayoutGrid, Search, Bell, Settings, LogOut } from 'lucide-react';
import type { CollabWorkspace, CollabPage, AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import { UserMenu } from '@/components/dashboard/layout/UserMenu';
import { LogoBlack } from '@/components/icons';
import { NotificationPopover } from '@/components/dashboard/layout/NotificationPopover';
import { MyAccountDialog } from '@/components/MyAccountDialog';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useMounted } from '@/hooks/use-mounted';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const isMounted = useMounted();
  const { toast } = useToast();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Re-fetch current user doc to get companyId and role
  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user } = useDoc<AppUser>(userDocRef);

  const companyId = user?.companyId || 'default';

  // Fetch all pages for the current company
  const pagesQuery = useMemoFirebase(() => (firestore && companyId) ? query(
    collection(firestore, 'collaboration_pages'),
    where('companyId', '==', companyId),
    orderBy('createdAt', 'desc')
  ) : null, [firestore, companyId]);

  const { data: pages, isLoading: loadingPages } = useCollection<CollabPage>(pagesQuery);

  useEffect(() => {
    if (!isUserLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isUserLoading, router]);

  const handleCreatePage = async (parentId: string | null = null) => {
    if (!firestore || !authUser || !companyId) return;

    try {
      const pageRef = collection(firestore, 'collaboration_pages');
      const newPage = {
        companyId,
        workspaceId: 'default',
        parentId,
        title: 'Untitled',
        createdBy: authUser.uid,
        createdAt: serverTimestamp(),
        content: null,
      };

      const docRef = await addDoc(pageRef, newPage);
      router.push(`/workspace/${docRef.id}`);
      toast({ title: 'Page created' });
    } catch (error) {
      console.error("Error creating page:", error);
      toast({ variant: 'destructive', title: 'Action failed' });
    }
  };

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
  };

  if (!isMounted || isUserLoading || !authUser || isLoggingOut) {
    return <FullScreenLoader text={isLoggingOut ? "Signing out..." : "Initializing Workspace"} />;
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar - Panel 1 */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        pages={pages || []}
        activePageId={pathname.split('/').pop() || null}
        onCreatePage={handleCreatePage}
        user={user}
      />

      {/* Main Content - Panel 2 */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
             {!isSidebarOpen && (
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="h-8 w-8 rounded-lg">
                    <Menu className="h-4 w-4" />
                </Button>
             )}
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {user?.businessName || 'Your Workspace'}
                </span>
             </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationPopover 
                notifications={[]}
                onNotificationClick={() => {}}
            />
            <AppLauncher />
            <Separator orientation="vertical" className="h-6 bg-slate-200" />
            <UserMenu 
                user={user} 
                onOpenSettings={() => setIsAccountDialogOpen(true)} 
                onLogout={handleLogout} 
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto relative">
          {children}
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

function useDoc<T>(ref: any) {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        if (!ref) return;
        const { onSnapshot } = require('firebase/firestore');
        const unsub = onSnapshot(ref, (doc: any) => {
            if (doc.exists()) setData({ id: doc.id, ...doc.data() } as T);
            setIsLoading(false);
        });
        return () => unsub();
    }, [ref]);
    return { data, isLoading };
}
