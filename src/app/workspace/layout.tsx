
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, useAuth, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, doc, addDoc, deleteDoc, serverTimestamp, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { FullScreenLoader } from '@/components/ui/loader';
import { Sidebar } from '@/components/collaboration/Sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import type { CollabPage, AppUser, SecurityRuleContext } from '@/lib/types';
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

  // Fetch all organizational pages (trashed or not)
  const pagesQuery = useMemoFirebase(() => (firestore && companyId) ? query(
    collection(firestore, 'collaboration_pages'),
    where('companyId', '==', companyId)
  ) : null, [firestore, companyId]);

  const { data: rawPages, isLoading: loadingPages } = useCollection<CollabPage>(pagesQuery);

  // Active pages for the main navigation
  const pages = useMemo(() => {
      if (!rawPages) return [];
      return [...rawPages]
        .filter(p => !p.isTrashed)
        .sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return timeB - timeA;
      });
  }, [rawPages]);

  const handleCreatePage = useCallback(async (parentId: string | null = null) => {
    if (!firestore || !authUser || !companyId) {
        toast({ title: "Initializing", description: "Please wait a moment while the workspace prepares." });
        return;
    }

    const pagesCol = collection(firestore, 'collaboration_pages');
    const newPage = {
      companyId,
      workspaceId: 'default',
      parentId,
      title: 'Untitled',
      createdBy: authUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      content: {
          type: "doc",
          content: [{ type: "paragraph" }]
      },
    };

    addDoc(pagesCol, newPage)
      .then((docRef) => {
        router.push(`/workspace/${docRef.id}`);
        toast({ title: 'New Document Created' });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
            path: pagesCol.path,
            operation: 'create',
            requestResourceData: newPage
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Creation Failed' });
      });
  }, [firestore, authUser, companyId, router, toast]);

  const handleSoftDelete = useCallback(async (pageId: string) => {
    if (!firestore) return;
    try {
        const pageRef = doc(firestore, 'collaboration_pages', pageId);
        await updateDoc(pageRef, {
            isTrashed: true,
            trashedAt: serverTimestamp()
        });
        
        if (pathname.includes(pageId)) {
            router.push('/workspace');
        }
        toast({ title: 'Moved to Trash' });
    } catch (error) {
        console.error("Error moving to trash:", error);
        toast({ variant: 'destructive', title: 'Action failed' });
    }
  }, [firestore, pathname, router, toast]);

  const handleRestorePage = useCallback(async (pageId: string) => {
    if (!firestore) return;
    try {
        const pageRef = doc(firestore, 'collaboration_pages', pageId);
        await updateDoc(pageRef, {
            isTrashed: false,
            trashedAt: null
        });
        toast({ title: 'Document Restored' });
    } catch (error) {
        console.error("Error restoring page:", error);
        toast({ variant: 'destructive', title: 'Action failed' });
    }
  }, [firestore, toast]);

  const handlePermanentDelete = useCallback(async (pageId: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'collaboration_pages', pageId));
        toast({ title: 'Deleted Permanently' });
    } catch (error) {
        console.error("Error deleting permanently:", error);
        toast({ variant: 'destructive', title: 'Action failed' });
    }
  }, [firestore, toast]);

  useEffect(() => {
    const handleRequestNewPage = (event: Event) => {
        const customEvent = event as CustomEvent;
        handleCreatePage(customEvent.detail?.parentId || null);
    };

    const handleRequestTrashPage = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.pageId) {
            handleSoftDelete(customEvent.detail.pageId);
        }
    };

    const handleRequestRestorePage = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.pageId) {
            handleRestorePage(customEvent.detail.pageId);
        }
    };

    const handleRequestPermanentDelete = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.pageId) {
            handlePermanentDelete(customEvent.detail.pageId);
        }
    };

    window.addEventListener('request-new-collab-page', handleRequestNewPage);
    window.addEventListener('request-delete-collab-page', handleRequestTrashPage);
    window.addEventListener('request-restore-collab-page', handleRequestRestorePage);
    window.addEventListener('request-permanent-delete-page', handleRequestPermanentDelete);
    
    return () => {
        window.removeEventListener('request-new-collab-page', handleRequestNewPage);
        window.removeEventListener('request-delete-collab-page', handleRequestTrashPage);
        window.removeEventListener('request-restore-collab-page', handleRequestRestorePage);
        window.removeEventListener('request-permanent-delete-page', handleRequestPermanentDelete);
    };
  }, [handleCreatePage, handleSoftDelete, handleRestorePage, handlePermanentDelete]);

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
