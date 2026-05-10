
'use client';

import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Trash2, RotateCcw, XCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import type { CollabPage } from '@/lib/types';
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
  const { user } = useUser();
  const firestore = useFirestore();

  const companyId = user?.companyId || 'default';

  const trashQuery = useMemoFirebase(() => (firestore && companyId) ? query(
    collection(firestore, 'collaboration_pages'),
    where('companyId', '==', companyId),
    where('isTrashed', '==', true),
    orderBy('trashedAt', 'desc')
  ) : null, [firestore, companyId]);

  const { data: trashedPages, isLoading } = useCollection<CollabPage>(trashQuery);

  const handleRestore = (pageId: string) => {
    window.dispatchEvent(new CustomEvent('request-restore-collab-page', { detail: { pageId } }));
  };

  const handlePermanentDelete = (pageId: string) => {
    window.dispatchEvent(new CustomEvent('request-permanent-delete-page', { detail: { pageId } }));
  };

  return (
    <div className="min-h-full bg-slate-50/30 p-8 md:p-12 animate-in fade-in duration-700">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-4">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-2xl bg-red-50 text-red-600 shadow-inner">
                    <Trash2 className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Trash Bin</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Content Quarantine</p>
                </div>
            </div>
            
            <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-start gap-3 shadow-sm">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500 leading-relaxed">
                    Documents in the trash are strictly read-only and hidden from collaborative feeds. Restore them to resume team editing.
                </p>
            </div>
        </div>

        <div className="grid gap-4">
            {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="border-none bg-white/50 animate-pulse h-20 rounded-2xl" />
                ))
            ) : trashedPages && trashedPages.length > 0 ? (
                trashedPages.map(page => (
                    <Card key={page.id} className="border-none shadow-sm bg-white group hover:shadow-md transition-all duration-300 rounded-2xl">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-red-400 transition-colors">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="font-bold text-slate-900">{page.title || 'Untitled'}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                        Deleted {page.trashedAt ? format((page.trashedAt as Timestamp).toDate(), 'MMM d, yyyy • p') : 'Recently'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleRestore(page.id)}
                                    className="h-8 rounded-xl font-black uppercase tracking-widest text-[9px] border-slate-100 gap-2 hover:bg-primary/5 hover:text-primary transition-all"
                                >
                                    <RotateCcw className="h-3 w-3" /> Restore
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[2rem] border-none shadow-3xl p-10">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-900">Purge Permanently?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-slate-500 font-bold leading-relaxed pt-2">
                                                This action is irreversible. The document and its full block history will be erased from the secure cloud infrastructure.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="pt-6">
                                            <AlertDialogCancel className="rounded-xl h-11 px-8 font-bold text-xs uppercase tracking-widest">Cancel</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={() => handlePermanentDelete(page.id)}
                                                className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-11 px-10 font-bold text-xs uppercase tracking-widest"
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
                <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
                    <Trash2 className="h-12 w-12 text-slate-200" />
                    <p className="text-xs font-black uppercase tracking-[0.3em]">Trash bin is empty</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
