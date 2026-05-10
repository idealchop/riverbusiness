
'use client';

import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Clock, ChevronRight, History } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { CollabPage } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

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
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Recently Modified</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Activity Intelligence Feed</p>
                </div>
            </div>
        </div>

        <div className="grid gap-4">
            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="border-none bg-white/50 animate-pulse h-20 rounded-2xl" />
                ))
            ) : recentPages && recentPages.length > 0 ? (
                recentPages.map(page => (
                    <Link key={page.id} href={`/workspace/${page.id}`}>
                        <Card className="border-none shadow-sm bg-white group hover:shadow-xl transition-all duration-500 rounded-2xl active:scale-[0.99] cursor-pointer">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-slate-900">{page.title || 'Untitled'}</h3>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                <Clock className="h-3 w-3" />
                                                {page.updatedAt ? formatDistanceToNow((page.updatedAt as Timestamp).toDate(), { addSuffix: true }) : 'Recently'}
                                            </div>
                                            {page.isFavorite && (
                                                <Badge className="bg-amber-50 text-amber-600 border-none text-[8px] font-black uppercase h-4">Favorite</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-200 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </CardContent>
                        </Card>
                    </Link>
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
