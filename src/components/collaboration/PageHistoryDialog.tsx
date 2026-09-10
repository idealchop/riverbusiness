'use client';

import React, { useMemo, useState } from 'react';
import { addDoc, collection, query, where, limit, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Camera, History, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { stripUndefinedForFirestore } from '@/lib/utils';
import type { CollabPage, CollabSnapshot } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

export async function saveCollabSnapshot(
  firestore: any,
  page: Pick<CollabPage, 'id' | 'companyId' | 'type' | 'title' | 'content'>,
  createdBy: string
) {
  await addDoc(collection(firestore, 'collaboration_snapshots'), stripUndefinedForFirestore({
    companyId: page.companyId,
    pageId: page.id,
    type: page.type || 'doc',
    title: page.title || 'Untitled',
    content: page.content ?? null,
    createdBy,
    createdAt: serverTimestamp(),
  }));
}

export function PageHistoryDialog({
  open,
  onOpenChange,
  page,
  userId,
  latestContent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: CollabPage;
  userId?: string;
  latestContent: any;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const snapshotsQuery = useMemoFirebase(
    () => (firestore && page.id)
      ? query(
          collection(firestore, 'collaboration_snapshots'),
          where('pageId', '==', page.id),
          limit(40)
        )
      : null,
    [firestore, page.id]
  );
  const { data: snapshots, isLoading } = useCollection<CollabSnapshot>(snapshotsQuery);

  const takeSnapshot = async () => {
    if (!firestore || !userId) return;
    setSaving(true);
    try {
      await saveCollabSnapshot(firestore, { ...page, content: latestContent ?? page.content }, userId);
      toast({ title: 'Snapshot saved' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not save snapshot',
        description: error?.message || 'Try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const restore = async (snap: CollabSnapshot) => {
    if (!firestore) return;
    setRestoringId(snap.id);
    try {
      await updateDoc(doc(firestore, 'collaboration_pages', page.id), stripUndefinedForFirestore({
        title: snap.title || page.title,
        content: snap.content ?? null,
        updatedAt: serverTimestamp(),
      }));
      toast({ title: 'Version restored', description: 'Reload the page if the editor does not update.' });
      onOpenChange(false);
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not restore',
        description: error?.message || 'Try again.',
      });
    } finally {
      setRestoringId(null);
    }
  };

  const items = useMemo(() => {
    return [...(snapshots || [])].sort((a, b) => {
      const at = a.createdAt?.toMillis?.() || 0;
      const bt = b.createdAt?.toMillis?.() || 0;
      return bt - at;
    });
  }, [snapshots]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Version snapshots</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Save a copy of this {page.type === 'board' ? 'canvas' : 'document'} so it can be restored later, even after it is moved to trash.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={takeSnapshot} disabled={saving} className="w-full h-9 rounded-xl text-xs font-bold gap-2">
          <Camera className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : 'Save snapshot now'}
        </Button>
        <ScrollArea className="max-h-[320px] mt-2">
          <div className="space-y-1.5 pr-2">
            {isLoading && <p className="text-xs text-slate-400 py-6 text-center">Loading…</p>}
            {!isLoading && items.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center">No snapshots yet.</p>
            )}
            {items.map((snap) => (
              <div key={snap.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{snap.title || 'Untitled'}</p>
                  <p className="text-[10px] text-slate-400">
                    {snap.createdAt?.toDate
                      ? formatDistanceToNow(snap.createdAt.toDate(), { addSuffix: true })
                      : 'Just now'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={restoringId === snap.id}
                  onClick={() => restore(snap)}
                  className="h-7 px-2 text-[10px] font-bold gap-1 shrink-0"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function SnapshotHeaderButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Version snapshots"
      title="Version snapshots"
      className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center"
    >
      <History className="h-4 w-4" />
    </button>
  );
}
