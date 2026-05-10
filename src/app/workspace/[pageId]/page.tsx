'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc, onSnapshot, serverTimestamp, setDoc, deleteDoc, collection, query, where, getDoc } from 'firebase/firestore';
import { Editor } from '@/components/collaboration/Editor';
import { FullScreenLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronRight, 
  Star, 
  MoreHorizontal, 
  Share2, 
  Smile,
  ImageIcon,
  Layout,
  Trash2,
  CheckCircle,
  Globe,
  AlertTriangle,
  RotateCcw,
  Users,
  FilePlus,
  FileText,
  Home,
  X,
  Palette
} from 'lucide-react';
import type { CollabPage, SecurityRuleContext, AppUser } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShareDialog } from '@/components/collaboration/ShareDialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const COMMON_EMOJIS = ['📄', '📝', '📂', '📁', '🚀', '💡', '✅', '⚠️', '🛠️', '📊', '📈', '🏢', '💧', '🌊', '📅', '👤', '👥', '🔐', '📌', '⭐'];

export default function PageEditor() {
  const { pageId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [page, setPage] = useState<CollabPage | null>(null);
  const [parentPage, setParentPage] = useState<CollabPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const userDocRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile } = useDoc<AppUser>(userDocRef);

  const latestContentRef = useRef<any>(null);
  const latestTitleRef = useRef<string>('');

  const contentUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Presence Query - Listen to all recent visitors
  const presenceQuery = useMemoFirebase(() => (firestore && pageId) ? collection(firestore, 'collaboration_pages', pageId as string, 'presence') : null, [firestore, pageId]);
  const { data: rawCollaborators } = useCollection(presenceQuery);

  // Sort and process collaborators for the face pile
  const collaborators = useMemo(() => {
    if (!rawCollaborators) return [];
    return [...rawCollaborators].sort((a, b) => {
        const timeA = a.lastActive?.seconds || 0;
        const timeB = b.lastActive?.seconds || 0;
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return timeB - timeA;
    });
  }, [rawCollaborators]);

  const forceSave = useCallback(async () => {
    if (!firestore || !pageId || !latestContentRef.current) return;
    
    if (contentUpdateTimeoutRef.current) clearTimeout(contentUpdateTimeoutRef.current);
    if (titleUpdateTimeoutRef.current) clearTimeout(titleUpdateTimeoutRef.current);

    const pageRef = doc(firestore, 'collaboration_pages', pageId as string);
    const updateData = { 
        title: latestTitleRef.current,
        content: latestContentRef.current,
        updatedAt: serverTimestamp()
    };
    
    updateDoc(pageRef, updateData).catch(() => {});
  }, [firestore, pageId]);

  useEffect(() => {
    if (!firestore || !pageId || !user || !userProfile) return;

    setLoading(true);
    setPage(null);
    setParentPage(null);
    setIsSaving(false);

    // Set local presence - Mark as Active
    const presenceRef = doc(firestore, 'collaboration_pages', pageId as string, 'presence', user.uid);
    const presenceData = {
        userId: user.uid,
        name: userProfile.name || user.displayName || user.email?.split('@')[0] || 'contributor',
        photoURL: userProfile.photoURL || user.photoURL || null,
        lastActive: serverTimestamp(),
        isActive: true
    };
    
    setDoc(presenceRef, presenceData).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
            path: presenceRef.path,
            operation: 'create',
            requestResourceData: presenceData
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });

    const pageRef = doc(firestore, 'collaboration_pages', pageId as string);
    const unsub = onSnapshot(pageRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const currentPage = { id: snapshot.id, ...data } as CollabPage;
        setPage(currentPage);
        latestContentRef.current = data.content;
        latestTitleRef.current = data.title;

        // Fetch parent for navigation breadcrumb
        if (data.parentId) {
            const parentRef = doc(firestore, 'collaboration_pages', data.parentId);
            const parentSnap = await getDoc(parentRef);
            if (parentSnap.exists()) {
                setParentPage({ id: parentSnap.id, ...parentSnap.data() } as CollabPage);
            }
        }
      } else {
        if (window.location.pathname.includes(pageId as string)) {
          router.push('/workspace');
        }
      }
      setLoading(false);
    }, async (err) => {
        const permissionError = new FirestorePermissionError({
            path: pageRef.path,
            operation: 'get'
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });

    return () => {
        unsub();
        forceSave();
        updateDoc(presenceRef, { 
            isActive: false, 
            lastActive: serverTimestamp() 
        }).catch(() => {}); 
    };
  }, [firestore, pageId, router, user, userProfile, forceSave]);

  const handleUpdateTitle = useCallback((newTitle: string) => {
    if (!firestore || !pageId || !page || page.isTrashed) return;
    
    latestTitleRef.current = newTitle;
    setPage(prev => prev ? { ...prev, title: newTitle } : null);

    if (titleUpdateTimeoutRef.current) clearTimeout(titleUpdateTimeoutRef.current);
    
    titleUpdateTimeoutRef.current = setTimeout(() => {
        setIsSaving(true);
        const pageRef = doc(firestore, 'collaboration_pages', pageId as string);
        const updateData = { title: newTitle, updatedAt: serverTimestamp() };
        
        updateDoc(pageRef, updateData)
            .then(() => {
                setTimeout(() => setIsSaving(false), 800);
            })
            .catch(async (err) => {
                const permissionError = new FirestorePermissionError({
                    path: pageRef.path,
                    operation: 'update',
                    requestResourceData: updateData
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
                setIsSaving(false);
            });
    }, 1000);
  }, [firestore, pageId, page]);

  const handleUpdateContent = useCallback((json: any) => {
    if (!firestore || !pageId || page?.isTrashed) return;
    
    latestContentRef.current = json;

    if (contentUpdateTimeoutRef.current) clearTimeout(contentUpdateTimeoutRef.current);

    contentUpdateTimeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      const pageRef = doc(firestore, 'collaboration_pages', pageId as string);
      const updateData = { 
        content: json,
        updatedAt: serverTimestamp()
      };
      
      updateDoc(pageRef, updateData)
        .then(() => {
            setTimeout(() => setIsSaving(false), 800);
        })
        .catch(async (err) => {
            const permissionError = new FirestorePermissionError({
                path: pageRef.path,
                operation: 'update',
                requestResourceData: updateData
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
            setIsSaving(false);
        });
    }, 1000);
  }, [firestore, pageId, page?.isTrashed]);

  const handleUpdateMeta = async (data: Partial<CollabPage>) => {
    if (!firestore || !page) return;
    const pageRef = doc(firestore, 'collaboration_pages', page.id);
    await updateDoc(pageRef, { ...data, updatedAt: serverTimestamp() });
  };

  const addRandomCover = () => {
    const seed = Math.floor(Math.random() * 1000);
    handleUpdateMeta({ coverImage: `https://picsum.photos/seed/${seed}/1200/400` });
  };

  const removeCover = () => handleUpdateMeta({ coverImage: '' });
  const setIcon = (icon: string) => handleUpdateMeta({ icon });
  const removeIcon = () => handleUpdateMeta({ icon: '' });

  const toggleFavorite = async () => {
    if (!firestore || !page) return;
    const pageRef = doc(firestore, 'collaboration_pages', page.id);
    const updateData = { isFavorite: !page.isFavorite };
    
    updateDoc(pageRef, updateData)
        .then(() => {
            toast({ title: !page.isFavorite ? 'added favorite' : 'removed favorite' });
        })
        .catch(async (err) => {
            const permissionError = new FirestorePermissionError({
                path: pageRef.path,
                operation: 'update',
                requestResourceData: updateData
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleCreateSubpage = () => {
      if (!page) return;
      window.dispatchEvent(new CustomEvent('request-new-collab-page', { detail: { parentId: page.id } }));
  };

  const handleTrash = () => {
      if (!page) return;
      window.dispatchEvent(new CustomEvent('request-delete-collab-page', { detail: { pageId: page.id } }));
  };

  const handleRestore = () => {
      if (!page) return;
      window.dispatchEvent(new CustomEvent('request-restore-collab-page', { detail: { pageId: page.id } }));
  }

  if (loading && !page) return <FullScreenLoader text="opening document" />;
  if (!page) return null;

  return (
    <div className="min-h-full flex flex-col bg-white animate-in fade-in duration-700">
      
      {page.isTrashed && (
          <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between px-8 animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-xs font-bold text-red-900 leading-none">this document is in the trash bin</p>
              </div>
              <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRestore} className="h-8 rounded-xl bg-white border-red-200 text-red-700 font-bold text-[10px] gap-2 hover:bg-red-50">
                      <RotateCcw className="h-3 w-3" /> restore document
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsDeleteDialogOpen(true)} className="h-8 rounded-xl text-red-400 font-bold text-[10px]">
                      delete permanently
                  </Button>
              </div>
          </div>
      )}

      {/* Document Meta Header / Breadcrumbs */}
      <div className="sticky top-0 z-20 px-8 py-3 flex items-center justify-between bg-white/95 border-b backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/workspace">
            <div className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors">
                <Home className="h-4 w-4" />
            </div>
          </Link>
          {parentPage && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              <Link href={`/workspace/${parentPage.id}`}>
                <span className="text-xs font-semibold text-slate-400 hover:text-slate-900 transition-colors max-w-[120px] truncate block">
                    {parentPage.title || 'untitled'}
                </span>
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <Input 
            value={page.title} 
            onChange={(e) => handleUpdateTitle(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 p-0 font-bold text-sm h-auto bg-transparent truncate max-w-[180px]"
            readOnly={page.isTrashed}
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Collaborative Presence - Face Pile */}
          <TooltipProvider delayDuration={0}>
             <div className="flex items-center gap-1 p-1 px-2 rounded-full bg-slate-50 border border-slate-100 mr-2 shadow-inner">
                <Users className="h-3 w-3 text-slate-400 mr-1" />
                <div className="flex -space-x-1.5">
                    {collaborators?.filter(c => c.id !== user?.uid).map(collab => {
                        const lastActiveDate = collab.lastActive?.toDate?.() || new Date();
                        const isOnline = collab.isActive;
                        return (
                        <Tooltip key={collab.id}>
                            <TooltipTrigger asChild>
                                <Avatar className={cn(
                                    "h-6 w-6 border-2 border-white shadow-sm hover:z-20 transition-all cursor-default",
                                    !isOnline && "grayscale opacity-50"
                                )}>
                                    <AvatarImage src={collab.photoURL} />
                                    <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">{collab.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="rounded-lg px-3 py-2 border-slate-100 shadow-xl bg-white">
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-xs font-bold text-slate-900 leading-none">
                                        {collab.name}
                                    </p>
                                    {!isOnline ? (
                                        <p className="text-[9px] font-medium text-slate-400 leading-none">
                                            last seen {formatDistanceToNow(lastActiveDate, { addSuffix: true })}
                                        </p>
                                    ) : (
                                        <p className="text-[9px] font-bold text-primary leading-none">
                                            viewing now
                                        </p>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    )})}
                    {(!collaborators || collaborators.length <= 1) && (
                         <span className="text-[9px] font-bold text-slate-300 px-1">alone</span>
                    )}
                </div>
            </div>

            <div className="w-20 flex justify-center">
                {isSaving ? (
                <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[9px] font-black text-primary">syncing</span>
                </div>
                ) : (
                <div className="flex items-center gap-1.5 opacity-40">
                    <CheckCircle className="h-3 w-3 text-slate-400" />
                    <span className="text-[9px] font-black text-slate-400">saved</span>
                </div>
                )}
            </div>
          </TooltipProvider>
          
          {!page.isTrashed && (
            <>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900"
                    onClick={handleCreateSubpage}
                    title="add subpage"
                >
                    <FilePlus className="h-4 w-4" />
                </Button>

                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-8 w-8 rounded-lg transition-colors", page.isFavorite ? "text-amber-500 hover:text-amber-600" : "text-slate-400 hover:text-slate-900")}
                    onClick={toggleFavorite}
                >
                    <Star className={cn("h-4 w-4", page.isFavorite && "fill-current")} />
                </Button>
                
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900"
                    onClick={() => setIsShareDialogOpen(true)}
                >
                    <Share2 className="h-4 w-4" />
                </Button>
            </>
          )}
          
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-1 shadow-2xl border-slate-100">
                  {!page.isTrashed ? (
                      <>
                        <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)} className="gap-3 font-semibold text-xs py-3 rounded-lg cursor-pointer">
                            <Share2 className="h-4 w-4 opacity-50" /> share settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={toggleFavorite} className="gap-3 font-semibold text-xs py-3 rounded-lg cursor-pointer">
                            <Star className="h-4 w-4 opacity-50" /> {page.isFavorite ? 'remove favorite' : 'add favorite'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCreateSubpage} className="gap-3 font-semibold text-xs py-3 rounded-lg cursor-pointer">
                            <FilePlus className="h-4 w-4 opacity-50" /> add subpage
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={handleTrash} className="gap-3 font-semibold text-xs py-3 text-red-600 focus:text-red-600 rounded-lg cursor-pointer">
                            <Trash2 className="h-4 w-4 opacity-50" /> move to trash
                        </DropdownMenuItem>
                      </>
                  ) : (
                      <>
                        <DropdownMenuItem onClick={handleRestore} className="gap-3 font-semibold text-xs py-3 rounded-lg cursor-pointer">
                            <RotateCcw className="h-4 w-4 opacity-50" /> restore
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="gap-3 font-semibold text-xs py-3 text-red-600 focus:text-red-600 rounded-lg cursor-pointer">
                            <Trash2 className="h-4 w-4 opacity-50" /> delete permanently
                        </DropdownMenuItem>
                      </>
                  )}
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Page Cover Image */}
        <div className="relative group/cover">
            {page.coverImage ? (
                <div className="h-[30vh] w-full relative group">
                    <Image src={page.coverImage} alt="Cover" fill className="object-cover" />
                    {!page.isTrashed && (
                        <div className="absolute bottom-6 right-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="secondary" size="sm" onClick={addRandomCover} className="h-8 rounded-lg bg-white/90 backdrop-blur-md font-bold text-[10px] uppercase tracking-widest border-none">
                                <Palette className="mr-1.5 h-3.5 w-3.5" /> change cover
                            </Button>
                            <Button variant="secondary" size="sm" onClick={removeCover} className="h-8 rounded-lg bg-white/90 backdrop-blur-md font-bold text-[10px] uppercase tracking-widest border-none text-red-600">
                                <X className="mr-1.5 h-3.5 w-3.5" /> remove
                            </Button>
                        </div>
                    )}
                </div>
            ) : null}
        </div>

        <div className="max-w-4xl mx-auto px-8 pt-10 pb-32 space-y-2">
            {/* Page Icon (Emoji) */}
            {page.icon && (
                <div className="relative group/icon -mt-12 z-10 w-fit">
                    <div className="text-6xl select-none">
                        {page.icon}
                    </div>
                    {!page.isTrashed && (
                        <div className="absolute -top-2 -right-6 opacity-0 group-hover/icon:opacity-100 transition-opacity">
                             <Button variant="secondary" size="icon" onClick={removeIcon} className="h-6 w-6 rounded-full bg-white shadow-lg border-none text-red-500">
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {!page.isTrashed && (
                <div className="flex items-center gap-4 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity mb-4">
                    {!page.icon && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-slate-400 hover:bg-slate-50">
                                    <Smile className="mr-1.5 h-3.5 w-3.5" /> add icon
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-64 p-2 rounded-2xl border-slate-100 shadow-3xl">
                                <div className="grid grid-cols-5 gap-1">
                                    {COMMON_EMOJIS.map(e => (
                                        <button key={e} onClick={() => setIcon(e)} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-2xl transition-all">
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    {!page.coverImage && (
                        <Button variant="ghost" size="sm" onClick={addRandomCover} className="h-7 text-[10px] font-bold text-slate-400 hover:bg-slate-50">
                            <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> add cover
                        </Button>
                    )}
                </div>
            )}
            
            <Input 
                value={page.title} 
                placeholder="untitled"
                onChange={(e) => handleUpdateTitle(e.target.value)}
                className="border-none shadow-none focus-visible:ring-0 p-0 font-black text-5xl h-auto bg-transparent placeholder:text-slate-100 mb-2 w-full"
                readOnly={page.isTrashed}
            />

            <div className="">
                <Editor 
                    key={page.id} 
                    initialContent={page.content} 
                    onContentChange={handleUpdateContent} 
                    editable={!page.isTrashed}
                />
            </div>
        </div>
      </ScrollArea>

      <ShareDialog 
        isOpen={isShareDialogOpen} 
        onOpenChange={setIsShareDialogOpen} 
        page={page} 
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-3xl p-10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                {page.isTrashed ? 'purge permanently?' : 'delete document?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-bold leading-relaxed pt-2">
              {page.isTrashed 
                ? 'this action is irreversible. the document and its full block history will be erased from the secure cloud infrastructure.'
                : 'this action will move the document to the trash. you can restore it later if needed.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-xl h-11 px-8 font-bold text-xs uppercase tracking-widest">cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={() => {
                    if (page.isTrashed) {
                        window.dispatchEvent(new CustomEvent('request-permanent-delete-page', { detail: { pageId: page.id } }));
                    } else {
                        handleTrash();
                    }
                }}
                className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-11 px-10 font-bold text-xs uppercase tracking-widest"
            >
                {page.isTrashed ? 'confirm purge' : 'move to trash'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}