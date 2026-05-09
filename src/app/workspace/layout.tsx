'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, useAuth } from '@/firebase';
import { collection, query, where, orderBy, doc, addDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { FullScreenLoader } from '@/components/ui/loader';
import { Sidebar } from '@/components/collaboration/Sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import type { CollabPage, AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import { UserMenu } from '@/components/dashboard/layout/UserMenu';
import { NotificationPopover } from '@/components/dashboard/layout/NotificationPopover';
import { MyAccountDialog } from '@/components/MyAccountDialog';
import { signOut } from 'firebase/auth';
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

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user } = useDoc<AppUser>(userDocRef);

  const companyId = user?.companyId || 'default';

  const pagesQuery = useMemoFirebase(() => (firestore && companyId) ? query(
    collection(firestore, 'collaboration_pages'),
    where('companyId', '==', companyId),
    orderBy('createdAt', 'desc')
  ) : null, [firestore, companyId]);

  const { data: pages, isLoading: loadingPages } = useCollection<CollabPage>(pagesQuery);

  const handleCreatePage = useCallback(async (parentId: string | null = null) => {
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
  }, [firestore, authUser, companyId, router, toast]);

  const handleDeletePage = useCallback(async (pageId: string) => {
    if (!firestore || !companyId) return;
    try {
        // Recursive children deletion
        const childrenQuery = query(collection(firestore, 'collaboration_pages'), where('parentId', '==', pageId));
        const childrenSnap = await getDocs(childrenQuery);
        
        for (const childDoc of childrenSnap.docs) {
            await deleteDoc(childDoc.ref);
        }

        await deleteDoc(doc(firestore, 'collaboration_pages', pageId));
        
        if (pathname.includes(pageId)) {
            router.push('/workspace');
        }
        toast({ title: 'Page deleted' });
    } catch (error) {
        console.error("Error deleting page:", error);
        toast({ variant: 'destructive', title: 'Deletion failed' });
    }
  }, [firestore, companyId, pathname, router, toast]);

  useEffect(() => {
    const handleRequestNewPage = (event: Event) => {
        const customEvent = event as CustomEvent;
        handleCreatePage(customEvent.detail?.parentId || null);
    };

    const handleRequestDeletePage = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.pageId) {
            handleDeletePage(customEvent.detail.pageId);
        }
    };

    window.addEventListener('request-new-collab-page', handleRequestNewPage);
    window.addEventListener('request-delete-collab-page', handleRequestDeletePage);
    
    return () => {
        window.removeEventListener('request-new-collab-page', handleRequestNewPage);
        window.removeEventListener('request-delete-collab-page', handleRequestDeletePage);
    };
  }, [handleCreatePage, handleDeletePage]);

  useEffect(() => {
    if (!isUserLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isUserLoading, router]);

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
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        pages={pages || []}
        activePageId={pathname.split('/').pop() || null}
        onCreatePage={handleCreatePage}
        onDeletePage={handleDeletePage}
        user={user}
      />

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
        initialTab={undefined}
      />
    </div>
  );
}
