'use client';

import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Clock, History, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { CollabPage, AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function RecentPages() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  // Get full user profile to retrieve the correct companyId
  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: userProfile } = useDoc<AppUser>(userDocRef);

  const companyId = userProfile?.companyId || 'default';

  // Fetch all pages for the company to filter/sort locally (prevents index errors)
  const pagesQuery = useMemoFirebase(() => (firestore && companyId) ? query(
    collection(firestore, 'collaboration_pages'),
    where('companyId', '==', companyId)
  ) : null, [firestore, companyId]);

  const { data: allPages, isLoading } = useCollection<CollabPage>(pagesQuery);

  // Filter for non-trashed and sort by updatedAt on the client
  const recentPages = useMemo(() => {
    if (!allPages) return [];
    return [...allPages]
      .filter(p => !p.isTrashed)
      .sort((a, b) => {
        const dateA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
        const timeA = dateA || (a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0);
        
        const dateB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
        const timeB = dateB || (b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0);
        
        return timeB - timeA;
      })
      .slice(0, 15);
  }, [allPages]);

  return (
    <div className="min-h-full bg-white p-8 md:p-12 animate-in fade-in duration-700">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-1">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-2xl bg-blue-50 text-primary">
                    <History className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recently Edited</h1>
                    <p className="text-sm font-medium text-slate-500">Jump back into your most active documents.</p>
                </div>
            </div>
        </div>

        <div className="grid gap-3">
            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="border-none bg-slate-50 animate-pulse h-16 rounded-xl" />
                ))
            ) : recentPages.length > 0 ? (
                recentPages.map(page => (
                    <Card key={page.id} className="border border-slate-100 shadow-none group hover:border-primary/20 transition-all duration-300 rounded-2xl bg-white">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors shrink-0">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 truncate">{page.title || 'Untitled Document'}</h3>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                        <Clock className="h-3.5 w-3.5" />
                                        Modified {page.updatedAt ? formatDistanceToNow((page.updatedAt as Timestamp).toDate(), { addSuffix: true }) : 'recently'}
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
                <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
                    <History className="h-12 w-12 text-slate-300" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No recent activity logged</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
