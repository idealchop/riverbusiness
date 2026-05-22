
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useDoc, useCollection, useMemoFirebase, useFirestore, useAuth, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, doc, addDoc, deleteDoc, serverTimestamp, updateDoc, or, and, getDoc } from 'firebase/firestore';
import { FullScreenLoader } from '@/components/ui/loader';
import { Sidebar } from '@/components/collaboration/Sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Menu, Building2 } from 'lucide-react';
import type { CollabPage, AppUser, SecurityRuleContext, CollabPageType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import { UserMenu } from '@/components/dashboard/layout/UserMenu';
import { NotificationPopover } from '@/components/dashboard/layout/NotificationPopover';
import { MyAccountDialog } from '@/components/MyAccountDialog';
import { ShareDialog } from '@/components/collaboration/ShareDialog';
import { signOut } from 'firebase/auth';
import { useMounted } from '@/hooks/use-mounted';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { LogoBlack } from '@/components/icons';

export default function WorkspaceLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const isMounted = useMounted();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sharingPageId, setSharingPageId] = useState<string | null>(null);

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user } = useDoc<AppUser>(userDocRef);

  const companyId = user?.companyId || null;

  // Fetch organizational pages scoped by companyId
  // Shows pages that are NOT private OR pages created by the current user
  const pagesQuery = useMemoFirebase(
    () => (firestore && companyId && authUser) ? query(
        collection(firestore, 'collaboration_pages'), 
        and(
            where('companyId', '==', companyId),
            or(
                where('isPrivate', '==', false),
                where('createdBy', '==', authUser.uid)
            )
        )
    ) : null, 
    [firestore, companyId, authUser]
  );

  const { data: rawPages, isLoading: loadingPages } = useCollection<CollabPage>(pagesQuery);

  // Active pages for the main navigation
  const pages = useMemo(() => {
      if (!rawPages) return [];
      return [...rawPages]
        .filter(p => !p.isTrashed)
        .sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
          return timeB - timeA;
      });
  }, [rawPages]);

  const sharingPage = useMemo(() => {
      if (!sharingPageId || !rawPages) return null;
      return rawPages.find(p => p.id === sharingPageId) || null;
  }, [sharingPageId, rawPages]);

  const handleCreatePage = useCallback(async (parentId: string | null = null, title: string = 'Untitled', type: CollabPageType = 'doc', initialPrompt?: string) => {
    if (!firestore || !authUser || !companyId) {
        toast({ title: "Initializing", description: "Please wait a moment while the workspace prepares your environment." });
        return;
    }

    const pagesCol = collection(firestore, 'collaboration_pages');
    
    // Initialize content based on type
    let initialContent: any = { type: "doc", content: [{ type: "paragraph" }] };
    if (type === 'sheet') initialContent = { rows: 20, cols: 10, data: {} };
    if (type === 'board') initialContent = { elements: [] };

    const newPage = {
      companyId,
      workspaceId: 'default',
      parentId,
      type,
      title: title || 'Untitled',
      createdBy: authUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isTrashed: false,
      isPrivate: false, 
      content: initialContent,
    };

    addDoc(pagesCol, newPage)
      .then((docRef) => {
        const redirectUrl = `/workspace/${docRef.id}${initialPrompt ? `?prompt=${encodeURIComponent(initialPrompt)}` : ''}`;
        router.push(redirectUrl);
        setIsMobileSidebarOpen(false);
        
        if (!initialPrompt) {
            toast({ 
                title: 'Asset initialized', 
                description: `A new ${type} workspace has been established for your organization.` 
            });
        }
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: pagesCol.path,
            operation: 'create',
            requestResourceData: newPage
        } satisfies SecurityRuleContext));
      });
  }, [firestore, authUser, companyId, router, toast]);

  const handleDuplicatePage = useCallback(async (pageId: string) => {
    if (!firestore || !authUser || !companyId) return;
    
    try {
      const sourceRef = doc(firestore, 'collaboration_pages', pageId);
      const sourceSnap = await getDoc(sourceRef);
      
      if (sourceSnap.exists()) {
        const sourceData = sourceSnap.data() as CollabPage;
        const newPage = {
          ...sourceData,
          title: `Copy of ${sourceData.title || 'Untitled'}`,
          createdBy: authUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isFavorite: false,
          isTrashed: false,
          parentId: null, // Clones are created at root for clear access
        };
        
        const docRef = await addDoc(collection(firestore, 'collaboration_pages'), newPage);
        router.push(`/workspace/${docRef.id}`);
        toast({ 
            title: 'Document duplicated', 
            description: 'A professional copy has been created and attributed to you.' 
        });
      }
    } catch (error) {
      console.error("Duplication failed:", error);
      toast({ variant: 'destructive', title: 'Action failed', description: 'The server was unable to clone this document.' });
    }
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
        toast({ 
            title: 'Document archived', 
            description: 'The file has been moved to the trash bin.' 
        });
    } catch (error) {
        console.error("Error moving to trash:", error);
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
        toast({ 
            title: 'Asset restored', 
            description: 'The document has been successfully moved back to the active directory.' 
        });
    } catch (error) {
        console.error("Error restoring page:", error);
    }
  }, [firestore, toast]);

  const handlePermanentDelete = useCallback(async (pageId: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'collaboration_pages', pageId));
        toast({ 
            title: 'Protocol: Data Purge', 
            description: 'This document has been permanently removed.' 
        });
    } catch (error) {
        console.error("Error deleting permanently:", error);
    }
  }, [firestore, toast]);

  const handleFavoriteToggle = useCallback(async (pageId: string, isFavorite: boolean) => {
    if (!firestore) return;
    try {
        const pageRef = doc(firestore, 'collaboration_pages', pageId);
        await updateDoc(pageRef, { isFavorite });
        toast({ 
            title: isFavorite ? 'Added to favorites' : 'Removed from favorites'
        });
    } catch (error) {
        console.error("Error toggling favorite:", error);
    }
  }, [firestore, toast]);

  useEffect(() => {
    const handleRequestNewPage = (event: Event) => {
        const customEvent = event as CustomEvent;
        handleCreatePage(
            customEvent.detail?.parentId || null, 
            customEvent.detail?.title || 'Untitled',
            customEvent.detail?.type || 'doc',
            customEvent.detail?.initialPrompt
        );
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

    const handleRequestFavorite = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.pageId) {
            handleFavoriteToggle(customEvent.detail.pageId, customEvent.detail.isFavorite);
        }
    };

    const handleRequestShare = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.pageId) {
            setSharingPageId(customEvent.detail.pageId);
        }
    };

    const handleRequestDuplicate = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.pageId) {
            handleDuplicatePage(customEvent.detail.pageId);
        }
    };

    window.addEventListener('request-new-collab-page', handleRequestNewPage);
    window.addEventListener('request-delete-collab-page', handleRequestTrashPage);
    window.addEventListener('request-restore-collab-page', handleRequestRestorePage);
    window.addEventListener('request-permanent-delete-page', handleRequestPermanentDelete);
    window.addEventListener('request-favorite-collab-page', handleRequestFavorite);
    window.addEventListener('request-share-collab-page', handleRequestShare);
    window.addEventListener('request-duplicate-collab-page', handleRequestDuplicate);
    
    return () => {
        window.removeEventListener('request-new-collab-page', handleRequestNewPage);
        window.removeEventListener('request-delete-collab-page', handleRequestTrashPage);
        window.removeEventListener('request-restore-collab-page', handleRequestRestorePage);
        window.removeEventListener('request-permanent-delete-page', handleRequestPermanentDelete);
        window.removeEventListener('request-favorite-collab-page', handleRequestFavorite);
        window.removeEventListener('request-share-collab-page', handleRequestShare);
        window.removeEventListener('request-duplicate-collab-page', handleRequestDuplicate);
    };
  }, [handleCreatePage, handleSoftDelete, handleRestorePage, handlePermanentDelete, handleFavoriteToggle, handleDuplicatePage]);

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

  const sidebarContent = (
    <Sidebar 
      isOpen={isSidebarOpen || isMobile} 
      onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      pages={pages || []}
      activePageId={pathname.split('/').pop() || null}
      onCreatePage={handleCreatePage}
      user={user || null}
    />
  );

  if (!isMounted || isUserLoading || !authUser || isLoggingOut) {
    return <FullScreenLoader text={isLoggingOut ? "Signing out..." : "Initializing workspace"} />;
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {!isMobile && sidebarContent}

      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-14 border-b flex items-center justify-between px-4 sm:px-6 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-4">
             {isMobile ? (
                <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-72 border-none">
                        <SheetHeader className="sr-only">
                            <SheetTitle>Workspace Navigation</SheetTitle>
                        </SheetHeader>
                        {sidebarContent}
                    </SheetContent>
                </Sheet>
             ) : (
                !isSidebarOpen && (
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="h-8 w-8 rounded-lg">
                        <Menu className="h-5 w-5" />
                    </Button>
                )
             )}
             <Link href="/dashboard" className={cn("items-center gap-2 font-bold text-sm hidden", isMobile ? "flex" : "hidden")}>
                <LogoBlack className="h-7 w-7" />
             </Link>
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

      {sharingPage && (
          <ShareDialog 
            isOpen={!!sharingPageId} 
            onOpenChange={(open) => !open && setSharingPageId(null)} 
            page={sharingPage} 
          />
      )}
    </div>
  );
}
