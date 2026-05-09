'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { Editor } from '@/components/collaboration/Editor';
import { FullScreenLoader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { LogoBlack } from '@/components/icons';
import { Globe, Clock, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import type { CollabPage } from '@/lib/types';

export default function PublicPageViewer() {
  const { token } = useParams();
  const firestore = useFirestore();

  const publicPageQuery = useMemoFirebase(() => {
    if (!firestore || !token) return null;
    return query(
      collection(firestore, 'collaboration_pages'),
      where('isPublic', '==', true),
      where('shareToken', '==', token),
      limit(1)
    );
  }, [firestore, token]);

  const { data: pages, isLoading } = useCollection<CollabPage>(publicPageQuery);
  const page = pages?.[0];

  if (isLoading) return <FullScreenLoader text="Fetching Document" />;

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-6">
            <FileText className="h-8 w-8 text-slate-300" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Document Unavailable</h1>
        <p className="text-slate-500 max-w-sm mx-auto font-medium">
          This link may have expired or public access has been restricted by the organization owner.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <header className="sticky top-0 z-10 h-16 border-b bg-white/95 backdrop-blur-md px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoBlack className="h-8 w-8" />
          <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 leading-tight">Public</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">Viewer</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-slate-200">Read Only Mode</Badge>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto py-20 px-8">
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                         <Badge className="bg-primary/5 text-primary border-none font-bold uppercase text-[9px] tracking-widest px-3 h-6">Published Intelligence</Badge>
                         <div className="h-1 w-1 rounded-full bg-slate-200" />
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Globe className="h-3 w-3" /> External Access
                         </span>
                    </div>
                    
                    <h1 className="text-5xl font-black tracking-tight text-slate-900 leading-tight">
                        {page.title}
                    </h1>

                    <div className="flex items-center gap-6 py-4 border-y border-slate-50">
                        <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Updated {page.updatedAt ? format(page.updatedAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="pb-40">
                    <Editor 
                        initialContent={page.content} 
                        onContentChange={() => {}} 
                        editable={false} 
                    />
                </div>
            </div>
        </div>
      </ScrollArea>

      <footer className="fixed bottom-0 left-0 right-0 p-4 text-center bg-white/80 backdrop-blur-sm border-t z-20">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">River Philippines Ecosystem</p>
      </footer>
    </div>
  );
}
