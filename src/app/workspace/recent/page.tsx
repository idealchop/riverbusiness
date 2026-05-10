'use client';

import React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Clock, ChevronRight, History, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { CollabPage } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function RecentPages() {
  const { user } = useUser();
  const firestore = useFirestore();

  const companyId = user?.companyId || 'default';

  // Fetch 10 most recently updated documents that are not trashed
  const recentQuery = useMemoFirebase(() => (firestore && companyId) ? query(
    collection(firestore, 'collaboration_pages'),
    where('companyId', '==', companyId),
    where('isTrashed', '!=', true),
    orderBy('isTrashed'),
    orderBy('updatedAt', 'desc'),
    limit(10)
  ) : null, [firestore, companyId]);

  const { data: recentPages, isLoading } = useCollection<CollabPage>(recentQuery);

  return (
    <div className="min-h-full bg-slate-50/30 p-8 md:p-12 animate-in fade-in duration-700">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-2">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-2xl bg-blue-50 text-primary shadow-inner">
                    <History className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Recently Edited</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Activity Intelligence Feed</p>
                </div>
            </div>
        </div>

        <div className="grid gap-3">
            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="border-none bg-white/50 animate-pulse h-16 rounded-xl" />
                ))
            ) : recentPages && recentPages.length > 0 ? (
                recentPages.map(page => (
                    <Card key={page.id} className="border-none shadow-sm bg-white group hover:shadow-md transition-all duration-300 rounded-xl">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors shrink-0">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 truncate">{page.title || 'Untitled'}</h3>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                        <Clock className="h-3 w-3" />
                                        {page.updatedAt ? formatDistanceToNow((page.updatedAt as Timestamp).toDate(), { addSuffix: true }) : 'Recently'}
                                    </div>
                                </div>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="rounded-lg h-9 font-bold text-xs gap-2 text-primary hover:bg-primary/5">
                                <Link href={`/workspace/${page.id}`}>
                                    Open Document <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
                    <History className="h-12 w-12 text-slate-300" />
                    <p className="text-xs font-black uppercase tracking-[0.3em]">No recent activity logged</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
