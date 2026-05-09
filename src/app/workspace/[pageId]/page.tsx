'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
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
  Trash2
} from 'lucide-react';
import type { CollabPage } from '@/lib/types';
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

  // Presence Query - Sync other users looking at the same page
  const presenceQuery = useMemoFirebase(() => (firestore && pageId) ? collection(firestore, 'collaboration_pages', pageId as string, 'presence') : null, [firestore, pageId]);
  const { data: collaborators } = useCollection(presenceQuery);

  useEffect(() => {
    if (!firestore || !pageId || !user) return;

    // Set local presence
    const presenceRef = doc(firestore, 'collaboration_pages', pageId as string, 'presence', user.uid);
    setDoc(presenceRef, {
        userId: user.uid,
        name: user.displayName || 'Contributor',
        photoURL: user.photoURL,
        lastActive: serverTimestamp()
    });

    const pageRef = doc(firestore, 'collaboration_pages', pageId as string);
    const unsub = onSnapshot(pageRef, (snapshot) => {
      if (snapshot.exists()) {
        setPage({ id: snapshot.id, ...snapshot.data() } as CollabPage);
      } else {
        // Only redirect if we haven't already navigated away
        if (window.location.pathname.includes(pageId as string)) {
          router.push('/workspace');
        }
      }
      setLoading(false);
    });

    return () => {
        unsub();
        deleteDoc(presenceRef).catch(() => {}); // Cleanup presence
    };
  }, [firestore, pageId, router, user]);

  const handleUpdateTitle = async (title: string) => {
    if (!firestore || !pageId) return;
    try {
      const pageRef = doc(firestore, 'collaboration_pages', pageId as string);
      await updateDoc(pageRef, { title });
    } catch (error) {
      console.error("Error updating title:", error);
    }
  };

  const handleUpdateContent = async (json: any) => {
    if (!firestore || !pageId) return;
    setIsSaving(true);
    try {
      const pageRef = doc(firestore, 'collaboration_pages', pageId as string);
      await updateDoc(pageRef, { 
        content: json,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating content:", error);
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const toggleFavorite = async () => {
    if (!firestore || !page) return;
    try {
        const pageRef = doc(firestore, 'collaboration_pages', page.id);
        await updateDoc(pageRef, { isFavorite: !page.isFavorite });
        toast({ title: page.isFavorite ? 'Removed from favorites' : 'Added to favorites' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Action failed' });
    }
  };

  const handleDelete = () => {
      if (!page) return;
      // Trigger the centralized delete event that layout.tsx listens to
      window.dispatchEvent(new CustomEvent('request-delete-collab-page', { detail: { pageId: page.id } }));
  };

  if (loading) return <FullScreenLoader text="Opening Document" />;
  if (!page) return null;

  return (
    <div className="min-h-full flex flex-col bg-white animate-in fade-in duration-700">
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

          {isSaving && (
             <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse mr-2">Syncing...</span>
          )}
          
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
          
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-1 shadow-2xl border-slate-100">
                  <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)} className="gap-3 font-semibold text-xs py-3 rounded-lg cursor-pointer">
                      <Share2 className="h-4 w-4 opacity-50" /> Public Sharing Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleFavorite} className="gap-3 font-semibold text-xs py-3 rounded-lg cursor-pointer">
                      <Star className="h-4 w-4 opacity-50" /> {page.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-50" />
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="gap-3 font-semibold text-xs py-3 text-red-600 focus:text-red-600 rounded-lg cursor-pointer">
                      <Trash2 className="h-4 w-4 opacity-50" /> Delete Document
                  </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto py-20 px-8 space-y-12">
            {/* Cover and Icon Placeholder */}
            <div className="space-y-6 group">
                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:bg-slate-50">
                        <Smile className="mr-1.5 h-3.5 w-3.5" /> Add Icon
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:bg-slate-50">
                        <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Add Cover
                    </Button>
                </div>
                <Input 
                    value={page.title} 
                    placeholder="Untitled"
                    onChange={(e) => handleUpdateTitle(e.target.value)}
                    className="border-none shadow-none focus-visible:ring-0 p-0 font-black text-5xl h-auto bg-transparent placeholder:text-slate-100"
                />
            </div>

            {/* Block Editor */}
            <Editor 
                initialContent={page.content} 
                onContentChange={handleUpdateContent} 
            />
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
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-900">Delete Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-bold leading-relaxed pt-2">
              This action is permanent and will delete this document and any potential subpages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-xl h-11 px-8 font-bold text-xs uppercase tracking-widest">Keep</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-11 px-10 font-bold text-xs uppercase tracking-widest"
            >
                Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
