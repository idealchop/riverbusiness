'use client';

import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Clock, History, Sparkles, BookOpen, Search, Plus, UserCircle, Files, Milestone, ShieldCheck, Newspaper } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { CollabPage, AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function DocsHubPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user } = useDoc<AppUser>(userDocRef);
  const companyId = user?.companyId || null;

  const pagesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(
        collection(firestore, 'collaboration_pages'), 
        where('companyId', '==', companyId),
        where('type', '==', 'doc')
    ) : null, 
    [firestore, companyId]
  );

  const { data: allPages, isLoading } = useCollection<CollabPage>(pagesQuery);

  const recentDocs = useMemo(() => {
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
        detail: { type: 'doc' }
    }));
  };

  const blueprints = [
    { title: 'Corporate Playbook', desc: 'Standardized operational procedures.', icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-50' },
    { title: 'Project Roadmap', desc: 'Strategic milestones and delivery dates.', icon: Milestone, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { title: 'Release Notes', desc: 'Internal system upgrade documentation.', icon: Newspaper, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="min-h-full bg-white flex flex-col animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto w-full px-8 py-12 md:py-20 space-y-16">
        
        {/* Billion Dollar Hero Section */}
        <section className="space-y-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-primary text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-left duration-500">
                <BookOpen className="h-3 w-3" />
                Knowledge Base Hub
            </div>
            <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-[0.95]">
                    Rich text for <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">collective intelligence.</span>
                </h1>
                <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl">
                    High-fidelity documentation infrastructure for modern teams. Draft, iterate, and authorize organizational knowledge in a unified workspace.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-4">
                <Button onClick={handleCreate} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" /> Start drafting
                </Button>
                <div className="h-10 w-px bg-slate-100 hidden sm:block" />
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Files className="h-3.5 w-3.5" />
                    {recentDocs.length} Active assets in ledger
                </div>
            </div>
        </section>

        {/* Blueprint Showcase */}
        <section className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black tracking-[0.3em] text-slate-300 uppercase">Recommended Blueprints</h2>
                <div className="h-px flex-1 mx-8 bg-slate-50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {blueprints.map((bp, i) => (
                    <Card key={i} className="group border-none shadow-none bg-slate-50/50 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all duration-500 cursor-pointer overflow-hidden border-2 border-transparent hover:border-blue-500/10" onClick={handleCreate}>
                        <CardContent className="p-8 space-y-6">
                            <div className={cn("p-4 rounded-2xl w-fit shadow-inner group-hover:scale-110 transition-transform duration-500", bp.bg, bp.color)}>
                                <bp.icon className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-none">{bp.title}</h4>
                                <p className="text-xs font-medium text-slate-500 leading-relaxed">{bp.desc}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>

        {/* Ledger Section */}
        <section className="space-y-8 pt-10 border-t border-slate-50">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">Recent Documents</h2>
                <Badge variant="outline" className="bg-slate-50 border-slate-100 text-slate-400 font-black text-[9px] uppercase tracking-widest px-3 h-6">Audit View</Badge>
            </div>

            <div className="grid gap-3">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-20 rounded-2xl bg-slate-50 animate-pulse" />
                    ))
                ) : recentDocs.length > 0 ? (
                    recentDocs.map(page => (
                        <Link key={page.id} href={`/workspace/${page.id}`} className="group">
                            <Card className="border border-slate-100 shadow-none group-hover:border-primary/20 transition-all duration-300 rounded-[1.5rem] bg-white group-hover:shadow-2xl group-hover:shadow-slate-200/50">
                                <CardContent className="p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-5 min-w-0">
                                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-primary transition-all shrink-0 shadow-inner group-hover:scale-110 duration-500">
                                            {page.icon ? <span className="text-xl leading-none">{page.icon}</span> : <FileText className="h-5 w-5" />}
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-primary transition-colors">{page.title || 'Untitled document'}</h3>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {page.updatedAt ? formatDistanceToNow((page.updatedAt as Timestamp).toDate(), { addSuffix: true }) : 'Recently'}</span>
                                                <div className="h-1 w-1 rounded-full bg-slate-200" />
                                                <span className="flex items-center gap-1.5"><UserCircle className="h-3 w-3" /> Authorized Sync</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ArrowUpRight className="h-5 w-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all mr-2" />
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                ) : (
                    <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4 border-2 border-dashed rounded-[2.5rem] bg-slate-50/50 border-slate-200">
                        <div className="p-6 rounded-full bg-white shadow-sm border border-slate-100">
                            <FileText className="h-12 w-12 text-slate-200" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Library Empty</p>
                            <p className="text-xs font-bold text-slate-300 uppercase">Authorize your first rich text asset</p>
                        </div>
                    </div>
                )}
            </div>
        </section>
      </div>
    </div>
  );
}

function ArrowUpRight({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
        </svg>
    );
}