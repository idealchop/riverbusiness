
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { Editor } from '@/components/collaboration/Editor';
import { FullScreenLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  ChevronRight, 
  Star, 
  MoreHorizontal, 
  Share2, 
  History,
  Smile,
  ImageIcon,
  Layout
} from 'lucide-react';
import type { CollabPage } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function PageEditor() {
  const { pageId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [page, setPage] = useState<CollabPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!firestore || !pageId) return;

    const pageRef = doc(firestore, 'collaboration_pages', pageId as string);
    const unsub = onSnapshot(pageRef, (snapshot) => {
      if (snapshot.exists()) {
        setPage({ id: snapshot.id, ...snapshot.data() } as CollabPage);
      } else {
        router.push('/workspace');
      }
      setLoading(false);
    });

    return () => unsub();
  }, [firestore, pageId, router]);

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
      setIsSaving(false);
    }
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
            className="border-none shadow-none focus-visible:ring-0 p-0 font-bold text-sm h-auto bg-transparent truncate"
          />
        </div>

        <div className="flex items-center gap-3">
          {isSaving && (
             <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Syncing...</span>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900">
            <Star className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto py-20 px-8 space-y-12">
            {/* Cover and Icon Placeholder */}
            <div className="space-y-6 group">
                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        <Smile className="mr-1.5 h-3.5 w-3.5" /> Add Icon
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest text-slate-400">
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
    </div>
  );
}

function serverTimestamp() {
    const { serverTimestamp } = require('firebase/firestore');
    return serverTimestamp();
}
