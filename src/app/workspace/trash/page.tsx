'use client';

import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Trash2, RotateCcw, XCircle, Info, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import type { CollabPage, AppUser } from '@/lib/types';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';

export default function TrashPages() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  // Get full user profile to retrieve the correct companyId
  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: userProfile } = useDoc<AppUser>(userDocRef);

  const companyId = userProfile?.companyId || 'default';

  // Fetch all pages for the company to filter locally (prevents index errors)
  const pagesQuery = useMemoFirebase(() => (firestore && companyId) ? query(
    collection(firestore, 'collaboration_pages'),
    where('companyId', '==', companyId)
  ) : null, [firestore, companyId]);

  const { data: allPages, isLoading } = useCollection<CollabPage>(pagesQuery);

  // Filter for trashed pages and sort locally
  const trashedPages = useMemo(() => {
    if (!allPages) return [];
    return [...allPages]
      .filter(p => p.isTrashed === true)
      .sort((a, b) => {
        const timeA = a.trashedAt instanceof Timestamp ? a.trashedAt.toMillis() : (a.trashedAt?.seconds ? a.trashedAt.seconds * 1000 : 0);
        const timeB = b.trashedAt instanceof Timestamp ? b.trashedAt.toMillis() : (b.trashedAt?.seconds ? b.trashedAt.seconds * 1000 : 0);
        return timeB - timeA;
      });
  }, [allPages]);

  const handleRestore = (pageId: string) => {
    window.dispatchEvent(new CustomEvent('request-restore-collab-page', { detail: { pageId } }));
  };

  const handlePermanentDelete = (pageId: string) => {
    window.dispatchEvent(new CustomEvent('request-permanent-delete-page', { detail: { pageId } }));
  };

  return (
    <div className="min-h-full bg-white p-8 md:p-12 animate-in fade-in duration-700">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-4">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-2xl bg-red-50 text-red-600">
                    <Trash2 className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Trash Bin</h1>
                    <p className="text-sm font-medium text-slate-500">Restore discarded documents or delete them forever.</p>
                </div>
            </div>
            
            <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-start gap-4">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                    Documents in the trash are strictly read-only. You must restore them to resume collaborative editing.
                </p>
            </div>
        </div>

        <div className="grid gap-4">
            {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="border-none bg-slate-50 animate-pulse h-16 rounded-xl" />
                ))
            ) : trashedPages.length > 0 ? (
                trashedPages.map(page => (
                    <Card key={page.id} className="border border-slate-100 shadow-none rounded-2xl bg-white overflow-hidden group">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 transition-colors shrink-0">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 truncate">{page.title || 'Untitled Document'}</h3>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Discarded on {page.trashedAt ? format((page.trashedAt as Timestamp).toDate(), 'MMM d, yyyy') : 'Recently'}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleRestore(page.id)}
                                    className="h-10 rounded-xl font-bold text-sm border-slate-200 gap-2 hover:bg-primary/5 hover:text-primary transition-all px-6"
                                >
                                    <RotateCcw className="h-4 w-4" /> Restore
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl">
                                            <XCircle className="h-5 w-5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[2.5rem] border-none shadow-3xl p-10">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Purge Permanently?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-slate-500 font-bold leading-relaxed pt-2">
                                                This action is irreversible. This document and its full collaborative block history will be erased from the secure cloud infrastructure.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="pt-6">
                                            <AlertDialogCancel className="rounded-xl h-11 px-8 font-bold text-sm">Cancel</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={() => handlePermanentDelete(page.id)}
                                                className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-11 px-10 font-bold text-sm"
                                            >
                                                Confirm Purge
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div className="py-24 text-center opacity-20 flex flex-col items-center gap-4">
                    <Trash2 className="h-12 w-12 text-slate-400" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Trash bin is empty</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
