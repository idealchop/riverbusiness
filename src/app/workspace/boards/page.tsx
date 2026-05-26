'use client';

import React, { useMemo } from 'react';
import { useUser, useDoc, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Layout, Clock, History, Plus, Workflow, Target, Sparkles, Map, Compass, MousePointer2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { CollabPage, AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function BoardsHubPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user } = useDoc<AppUser>(userDocRef);
  const companyId = user?.companyId || null;

  const pagesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(
        collection(firestore, 'collaboration_pages'), 
        where('companyId', '==', companyId),
        where('type', '==', 'board')
    ) : null, 
    [firestore, companyId]
  );

  const { data: allPages, isLoading } = useCollection<CollabPage>(pagesQuery);

  const recentBoards = useMemo(() => {
    if (!allPages) return [];
    return [...allPages]
      .filter(p => !p.isTrashed)
      .sort((a, b) => {
        const dateA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
        const timeA = dateA || (a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0);
        const dateB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
        const timeB = dateB || (b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0);
        return timeB - timeA;
      });
  }, [allPages]);

  const handleCreate = () => {
    window.dispatchEvent(new CustomEvent('request-new-collab-page', {
        detail: { type: 'board' }
    }));
  };

  return (
    <div className="min-h-full bg-white flex flex-col animate-in fade-in duration-700 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full px-8 py-12 md:py-20 space-y-16">
        
        {/* Billion Dollar Hero Section */}
        <section className="space-y-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-left duration-500">
                <Layout className="h-3 w-3" />
                Visual Design Studio
            </div>
            <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-[0.95]">
                    Visualize your <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">strategic flow.</span>
                </h1>
                <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl">
                    High-fidelity whiteboard canvases for process mapping, user journeys, and organizational logic. Connect ideas at the speed of thought.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-4">
                <Button onClick={handleCreate} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-purple-500/20 bg-purple-600 hover:bg-purple-700">
                    <Plus className="mr-2 h-4 w-4" /> Start New Canvas
                </Button>
                <div className="h-10 w-px bg-slate-100 hidden sm:block" />
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <MousePointer2 className="h-3.5 w-3.5" />
                    {recentBoards.length} Diagrams authored
                </div>
            </div>
        </section>

        {/* Workspace Tiles */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <CanvasActionTile title="Workflows" icon={<Workflow className="h-5 w-5" />} color="text-blue-500" bg="bg-blue-50" onClick={handleCreate} />
            <CanvasActionTile title="Journeys" icon={<Map className="h-5 w-5" />} color="text-amber-500" bg="bg-amber-50" onClick={handleCreate} />
            <CanvasActionTile title="Strategies" icon={<Target className="h-5 w-5" />} color="text-red-500" bg="bg-red-50" onClick={handleCreate} />
            <CanvasActionTile title="Brainstorm" icon={<Sparkles className="h-5 w-5" />} color="text-purple-500" bg="bg-purple-50" onClick={handleCreate} />
        </section>

        {/* Board Ledger */}
        <section className="space-y-8 pt-10 border-t border-slate-50">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">Recent Canvases</h2>
                <Badge variant="outline" className="bg-slate-50 border-slate-100 text-slate-400 font-black text-[9px] uppercase tracking-widest px-3 h-6">Enterprise Hub</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-[2.5rem] bg-slate-50 animate-pulse" />
                    ))
                ) : recentBoards.length > 0 ? (
                    recentBoards.map(page => (
                        <Link key={page.id} href={`/workspace/${page.id}`} className="group">
                            <Card className="border-none shadow-none rounded-[2.5rem] bg-slate-50/50 group-hover:bg-white group-hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden border-2 border-transparent group-hover:border-purple-500/10">
                                <CardContent className="p-8 aspect-square flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <div className="h-14 w-14 rounded-3xl bg-white flex items-center justify-center text-slate-300 group-hover:text-purple-600 transition-all shadow-sm border border-slate-100 group-hover:scale-110 duration-500">
                                            {page.icon ? <span className="text-2xl">{page.icon}</span> : <Layout className="h-6 w-6" />}
                                        </div>
                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-200 group-hover:bg-purple-400 group-hover:animate-ping transition-colors" />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight uppercase line-clamp-2">{page.title || 'Untitled Canvas'}</h3>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <Clock className="h-3 w-3" />
                                            {page.updatedAt ? formatDistanceToNow((page.updatedAt as Timestamp).toDate(), { addSuffix: true }) : 'Just now'}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center opacity-20 flex flex-col items-center gap-6 border-2 border-dashed rounded-[3rem] border-slate-200">
                        <Layout className="h-16 w-16 text-slate-300" />
                        <div className="space-y-1">
                            <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-400 leading-none">Creative workspace clear</p>
                            <p className="text-xs font-bold text-slate-300 uppercase">Authorize new strategic whiteboard</p>
                        </div>
                    </div>
                )}
            </div>
        </section>
      </div>
    </div>
  );
}

function CanvasActionTile({ title, icon, color, bg, onClick }: any) {
    return (
        <button onClick={onClick} className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:border-primary/20 hover:-translate-y-1 group">
            <div className={cn("p-4 rounded-2xl shadow-inner group-hover:scale-110 transition-transform", bg, color)}>{icon}</div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-900 transition-colors">{title}</span>
        </button>
    );
}
