'use client';

import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Layout, Clock, History, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { CollabPage, AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function BoardsHubPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user } = useDoc<AppUser>(userDocRef);
  const companyId = user?.companyId || null;

  // Fetch only 'board' types SCOPED by companyId
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

  return (
    <div className="min-h-full bg-white p-8 md:p-12">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-1">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
                    <Layout className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recent Canvases</h1>
                    <p className="text-sm font-medium text-slate-500">Jump into your team's visual whiteboards and flow charts.</p>
                </div>
            </div>
        </div>

        <div className="grid gap-3">
            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="border-none bg-slate-50 animate-pulse h-16 rounded-xl" />
                ))
            ) : recentBoards.length > 0 ? (
                recentBoards.map(page => (
                    <Card key={page.id} className="border border-slate-100 shadow-none group hover:border-primary/20 transition-all duration-300 rounded-2xl bg-white">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors shrink-0">
                                    <Layout className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 truncate">{page.title || 'Untitled canvas'}</h3>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                        <Clock className="h-3.5 w-3.5" />
                                        Modified {page.updatedAt ? formatDistanceToNow((page.updatedAt as Timestamp).toDate(), { addSuffix: true }) : 'Recently'}
                                    </div>
                                </div>
                            </div>
                            <Button asChild variant="ghost" className="rounded-xl h-10 px-5 font-bold text-sm gap-2 text-primary hover:bg-primary/5">
                                <Link href={`/workspace/${page.id}`}>
                                    Open <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4 border-2 border-dashed rounded-3xl">
                    <Layout className="h-12 w-12 text-slate-300" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No canvases found</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
