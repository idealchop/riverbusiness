
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, doc, onSnapshot } from 'firebase/firestore';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { FullScreenLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowRight, Building, Globe, Lock } from 'lucide-react';
import type { CollabPage } from '@/lib/types';
import Link from 'next/link';
import { LogoBlack } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PublicPageViewer() {
  const { token } = useParams();
  const firestore = useFirestore();
  const [page, setPage] = useState<CollabPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: null,
    editable: false,
    editorProps: {
        attributes: {
            class: 'prose prose-slate max-w-none text-slate-700 leading-loose text-lg font-medium outline-none'
        }
    }
  });

  useEffect(() => {
    if (!firestore || !token) return;

    const findPage = async () => {
        try {
            const q = query(
                collection(firestore, 'collaboration_pages'), 
                where('shareToken', '==', token),
                limit(1)
            );
            const snap = await getDocs(q);
            
            if (snap.empty) {
                setError('This link is invalid or has been disabled.');
                setLoading(false);
                return;
            }

            const pageData = snap.docs[0].data() as CollabPage;
            if (!pageData.isPublic) {
                setError('This document is private.');
                setLoading(false);
                return;
            }

            setPage({ id: snap.docs[0].id, ...pageData });
            if (editor) {
                editor.commands.setContent(pageData.content);
            }
            setLoading(false);
        } catch (err) {
            setError('Could not access document.');
            setLoading(false);
        }
    };

    findPage();
  }, [firestore, token, editor]);

  if (loading) return <FullScreenLoader text="Fetching Document" />;

  if (error) {
    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-[2rem] bg-white shadow-xl flex items-center justify-center text-red-500 border border-red-50">
                        <Lock className="h-8 w-8" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Access Restricted</h1>
                    <p className="text-slate-500 font-bold">{error}</p>
                </div>
                <Button asChild className="rounded-2xl h-14 w-full font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
                    <Link href="/login">Launch Command Center</Link>
                </Button>
            </div>
        </main>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col animate-in fade-in duration-1000">
        {/* Public Header */}
        <header className="h-16 border-b flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <LogoBlack className="h-8 w-8" />
                <span className="font-black text-[10px] uppercase tracking-[0.4em] text-slate-900">River Public</span>
            </div>
            <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-2 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Verified Document</span>
                </div>
                <Button asChild variant="outline" className="rounded-xl h-10 px-6 font-bold text-xs gap-2 border-slate-200">
                    <Link href="/login">
                        Login <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </header>

        <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto py-24 px-8 space-y-12">
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                         <Badge className="bg-primary/5 text-primary border-none font-bold uppercase text-[9px] tracking-widest px-3 h-6">Published Intelligence</Badge>
                         <div className="h-1 w-1 rounded-full bg-slate-200" />
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Globe className="h-3 w-3" /> External Access
                         </span>
                    </div>
                    <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-[1.1]">{page?.title}</h1>
                </div>

                <div className="pt-10 border-t border-slate-100">
                    <EditorContent editor={editor} />
                </div>
            </div>

            <footer className="max-w-4xl mx-auto py-20 px-8 border-t border-slate-50 flex flex-col items-center gap-10 opacity-30 group grayscale hover:opacity-100 transition-all duration-700">
                <LogoBlack className="h-12 w-12" />
                <div className="text-center space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900">The Business Operating System</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Propelled by River Philippines</p>
                </div>
            </footer>
        </ScrollArea>
    </div>
  );
}
