'use client';

import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Grid, Clock, History, Search, Plus, BarChart3, Database, ShieldCheck, CheckCircle2, TrendingUp, Boxes, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { CollabPage, AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function SheetsHubPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user } = useDoc<AppUser>(userDocRef);
  const companyId = user?.companyId || null;

  const pagesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(
        collection(firestore, 'collaboration_pages'), 
        where('companyId', '==', companyId),
        where('type', '==', 'sheet')
    ) : null, 
    [firestore, companyId]
  );

  const { data: allPages, isLoading } = useCollection<CollabPage>(pagesQuery);

  const recentSheets = useMemo(() => {
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
        detail: { type: 'sheet' }
    }));
  };

  const engines = [
      { title: 'Global Supply Matrix', desc: 'Track inventory nodes across regions.', icon: Boxes, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      { title: 'Q3 Financial Ledger', desc: 'Consolidated fiscal reporting and audit.', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
      { title: 'Operations Tracker', desc: 'Real-time task and resource distribution.', icon: Briefcase, color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  return (
    <div className="min-h-full bg-white flex flex-col animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto w-full px-8 py-12 md:py-20 space-y-16">
        
        {/* Billion Dollar Hero Section */}
        <section className="space-y-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-left duration-500">
                <Database className="h-3 w-3" />
                Operational Data Ledger
            </div>
            <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-[0.95]">
                    Structure your <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">business logic.</span>
                </h1>
                <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl">
                    High-performance collaborative grids designed for resource tracking, project timelines, and operational analytics. Synchronize your organizational data instantly.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-4">
                <Button onClick={handleCreate} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="mr-2 h-4 w-4" /> Create Ledger
                </Button>
                <div className="h-10 w-px bg-slate-100 hidden sm:block" />
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {recentSheets.length} Data nodes mapped
                </div>
            </div>
        </section>

        {/* Engine Showcase */}
        <section className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black tracking-[0.3em] text-slate-300 uppercase">Standard Data Frameworks</h2>
                <div className="h-px flex-1 mx-8 bg-slate-50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {engines.map((eng, i) => (
                    <Card key={i} className="group border-none shadow-none bg-slate-50/50 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all duration-500 cursor-pointer overflow-hidden border-2 border-transparent hover:border-emerald-500/10" onClick={handleCreate}>
                        <CardContent className="p-8 space-y-6 text-center md:text-left">
                            <div className={cn("p-4 rounded-2xl w-fit shadow-inner group-hover:scale-110 transition-transform duration-500 mx-auto md:mx-0", eng.bg, eng.color)}>
                                <eng.icon className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-none">{eng.title}</h4>
                                <p className="text-xs font-medium text-slate-500 leading-relaxed">{eng.desc}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>

        {/* Activity Ledger */}
        <section className="space-y-8 pt-10 border-t border-slate-50">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">Recent Sheets</h2>
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Ledger Sync</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 rounded-3xl bg-slate-50 animate-pulse" />
                    ))
                ) : recentSheets.length > 0 ? (
                    recentSheets.map(page => (
                        <Link key={page.id} href={`/workspace/${page.id}`} className="group">
                            <Card className="border border-slate-100 shadow-none group-hover:border-emerald-500/20 transition-all duration-300 rounded-[2rem] bg-white group-hover:shadow-2xl group-hover:shadow-emerald-900/5">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-6 min-w-0">
                                        <div className="h-14 w-14 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all shrink-0 shadow-inner group-hover:scale-105 duration-500">
                                            <Grid className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0 space-y-1.5">
                                            <h3 className="text-lg font-black text-slate-900 truncate tracking-tight uppercase leading-none">{page.title || 'Untitled ledger'}</h3>
                                            <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Updated {page.updatedAt ? formatDistanceToNow((page.updatedAt as Timestamp).toDate(), { addSuffix: true }) : 'Recently'}</span>
                                                <div className="h-1 w-1 rounded-full bg-slate-200" />
                                                <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Synchronized</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-10 px-6 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500 transition-all flex items-center justify-center font-black text-[10px] uppercase tracking-widest">
                                        Open Ledger
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                ) : (
                    <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4 border-2 border-dashed rounded-[3rem] bg-slate-50/50">
                        <Grid className="h-12 w-12 text-slate-300" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">No active operational grids</p>
                    </div>
                )}
            </div>
        </section>
      </div>
    </div>
  );
}