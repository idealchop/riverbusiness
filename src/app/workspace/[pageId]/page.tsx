
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useMemoFirebase, useCollection, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc, onSnapshot, serverTimestamp, setDoc, deleteDoc, collection } from 'firebase/firestore';
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
  RotateCcw
} from 'lucide-react';
import type { CollabPage, SecurityRuleContext } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShareDialog } from '@/components/collaboration/ShareDialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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

export default function PageEditor() {
  const { pageId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [page, setPage] = useState<CollabPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Use refs to keep track of the latest content for immediate saving on unmount
  const latestContentRef = useRef<any>(null);
  const latestTitleRef = useRef<string>('');

  // Debounce refs
  const contentUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Presence Query - Sync other users looking at the same page
  const presenceQuery = useMemoFirebase(() => (firestore && pageId) ? collection(firestore, 'collaboration_pages', pageId as string, 'presence') : null, [firestore, pageId]);
  const { data: collaborators } = useCollection(presenceQuery);

  const forceSave = useCallback(async () => {
    if (!firestore || !pageId || !latestContentRef.current) return;
    
    // Clear existing debounce timeouts
    if (contentUpdateTimeoutRef.current) clearTimeout(contentUpdateTimeoutRef.current);
    if (titleUpdateTimeoutRef.current) clearTimeout(titleUpdateTimeoutRef.current);

    const pageRef = doc(firestore, 'collaboration_pages', pageId as string);
    const updateData = { 
        title: latestTitleRef.current,
        content: latestContentRef.current,
        updatedAt: serverTimestamp()
    };
    
    // Fire and forget update on unmount
    updateDoc(pageRef, updateData).catch(() => {});
  }, [firestore, pageId]);

  useEffect(() => {
    if (!firestore || !pageId || !user) return;

    setLoading(true);
    setPage(null);
    setIsSaving(false);

    // Set local presence
    const presenceRef = doc(firestore, 'collaboration_pages', pageId as string, 'presence', user.uid);
    const presenceData = {
        userId: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Contributor',
        photoURL: user.photoURL || null,
        lastActive: serverTimestamp()
    };
    
    setDoc(presenceRef, presenceData).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
            path: presenceRef.path,
            operation: 'create',
            requestResourceData: presenceData
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    const pageRef = doc(firestore, 'collaboration_pages', pageId as string);
    const unsub = onSnapshot(pageRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPage({ id: snapshot.id, ...data } as CollabPage);
        latestContentRef.current = data.content;
        latestTitleRef.current = data.title;
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
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    return () => {
        unsub();
        forceSave(); // Immediate sync on navigation
        deleteDoc(presenceRef).catch(() => {}); 
    };
  }, [firestore, pageId, router, user, forceSave]);

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
                });
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
            });
            errorEmitter.emit('permission-error', permissionError);
            setIsSaving(false);
        });
    }, 1000);
  }, [firestore, pageId, page?.isTrashed]);

  const toggleFavorite = async () => {
    if (!firestore || !page) return;
    const pageRef = doc(firestore, 'collaboration_pages', page.id);
    const updateData = { isFavorite: !page.isFavorite };
    
    updateDoc(pageRef, updateData)
        .then(() => {
            toast({ title: !page.isFavorite ? 'Added to favorites' : 'Removed from favorites' });
        })
        .catch(async (err) => {
            const permissionError = new FirestorePermissionError({
                path: pageRef.path,
                operation: 'update',
                requestResourceData: updateData
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleTrash = () => {
      if (!page) return;
      window.dispatchEvent(new CustomEvent('request-delete-collab-page', { detail: { pageId: page.id } }));
  };

  const handleRestore = () => {
      if (!page) return;
      window.dispatchEvent(new CustomEvent('request-restore-collab-page', { detail: { pageId: page.id } }));
  }

  if (loading && !page) return <FullScreenLoader text="Opening Document" />;
  if (!page) return null;

  return (
    <div className="min-h-full flex flex-col bg-white animate-in fade-in duration-700">
      
      {page.isTrashed && (
          <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between px-8 animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-xs font-bold text-red-900 uppercase tracking-tight">This document is in the trash bin</p>
              </div>
              <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRestore} className="h-8 rounded-xl bg-white border-red-200 text-red-700 font-bold text-[10px] uppercase gap-2 hover:bg-red-50">
                      <RotateCcw className="h-3 w-3" /> Restore document
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsDeleteDialogOpen(true)} className="h-8 rounded-xl text-red-400 font-bold text-[10px] uppercase">
                      Delete permanently
                  </Button>
              </div>
          </div>
      )}

      {/* Document Meta Header */}
      <div className="sticky top-0 z-10 px-8 py-3 flex items-center justify-between bg-white/95 border-b backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 cursor-pointer">
             <Layout className="h-4 w-4" />
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <Input 
            value={page.title} 
            onChange={(e) => handleUpdateTitle(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 p-0 font-bold text-sm h-auto bg-transparent truncate max-w-[200px]"
            readOnly={page.isTrashed}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-2 mr-2">
              {collaborators?.filter(c => c.id !== user?.uid).map(collab => (
                  <Avatar key={collab.id} className="h-7 w-7 border-2 border-white shadow-sm ring-1 ring-slate-100">
                      <AvatarImage src={collab.photoURL} />
                      <AvatarFallback className="text-[10px] font-bold">{collab.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
              ))}
              {collaborators && collaborators.length > 3 && (
                  <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border-2 border-white z-10">
                      +{collaborators.length - 3}
                  </div>
              )}
          </div>

          <div className="w-20 flex justify-center">
            {isSaving ? (
               <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                 <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Syncing</span>
               </div>
            ) : (
               <div className="flex items-center gap-1.5 opacity-40">
                 <CheckCircle className="h-3 w-3 text-slate-400" />
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Saved</span>
               </div>
            )}
          </div>
          
          {!page.isTrashed && (
            <>
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
                            <Share2 className="h-4 w-4 opacity-50" /> Public Sharing Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={toggleFavorite} className="gap-3 font-semibold text-xs py-3 rounded-lg cursor-pointer">
                            <Star className="h-4 w-4 opacity-50" /> {page.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={handleTrash} className="gap-3 font-semibold text-xs py-3 text-red-600 focus:text-red-600 rounded-lg cursor-pointer">
                            <Trash2 className="h-4 w-4 opacity-50" /> Move to Trash
                        </DropdownMenuItem>
                      </>
                  ) : (
                      <>
                        <DropdownMenuItem onClick={handleRestore} className="gap-3 font-semibold text-xs py-3 rounded-lg cursor-pointer">
                            <RotateCcw className="h-4 w-4 opacity-50" /> Restore Document
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="gap-3 font-semibold text-xs py-3 text-red-600 focus:text-red-600 rounded-lg cursor-pointer">
                            <Trash2 className="h-4 w-4 opacity-50" /> Delete Permanently
                        </DropdownMenuItem>
                      </>
                  )}
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto py-12 px-8 space-y-2">
            {!page.isTrashed && (
                <div className="flex items-center gap-4 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity mb-4">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:bg-slate-50">
                        <Smile className="mr-1.5 h-3.5 w-3.5" /> Add Icon
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:bg-slate-50">
                        <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Add Cover
                    </Button>
                </div>
            )}
            
            {/* Title Section */}
            <Input 
                value={page.title} 
                placeholder="Untitled"
                onChange={(e) => handleUpdateTitle(e.target.value)}
                className="border-none shadow-none focus-visible:ring-0 p-0 font-black text-5xl h-auto bg-transparent placeholder:text-slate-100 mb-6"
                readOnly={page.isTrashed}
            />

            {/* Block Editor */}
            <div className="pt-2">
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
        <AlertDialogContent className="rounded-[2rem] border-none shadow-3xl p-10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                {page.isTrashed ? 'Purge Permanently?' : 'Delete Document?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-bold leading-relaxed pt-2">
              {page.isTrashed 
                ? 'This action is irreversible. The document and its full block history will be erased from the secure cloud infrastructure.'
                : 'This action will move the document to the Trash. You can restore it later if needed.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-xl h-11 px-8 font-bold text-xs uppercase tracking-widest">Cancel</AlertDialogCancel>
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
                {page.isTrashed ? 'Confirm Purge' : 'Move to Trash'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
