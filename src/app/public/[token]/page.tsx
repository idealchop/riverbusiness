'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { collection, query, where, limit, Timestamp, doc, getDoc, getDocs } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LogoBlack } from '@/components/icons';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { FullScreenLoader } from '@/components/ui/loader';
import { Editor } from '@/components/collaboration/Editor';
import { BoardEditor } from '@/components/collaboration/BoardEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';

export default function PublicPage() {
    const { token } = useParams();
    const firestore = useFirestore();
    
    const [page, setPage] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [authError, setAuthError] = useState(false);

    useEffect(() => {
        if (!firestore || !token || typeof token !== 'string') return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const byId = await getDoc(doc(firestore, 'collaboration_pages', token));
                let found: any | null = null;

                if (byId.exists()) {
                    found = { id: byId.id, ...byId.data() };
                } else {
                    const snap = await getDocs(query(
                        collection(firestore, 'collaboration_pages'),
                        where('isPublic', '==', true),
                        where('shareToken', '==', token),
                        limit(1)
                    ));
                    if (!snap.empty) {
                        const d = snap.docs[0];
                        found = { id: d.id, ...d.data() };
                    }
                }

                if (cancelled) return;

                if (!found || found.isPublic !== true) {
                    setError('Document not found or is no longer public.');
                    setLoading(false);
                    return;
                }

                const expiresAt = found.expiresAt
                    ? (found.expiresAt instanceof Timestamp ? found.expiresAt.toDate() : new Date(found.expiresAt))
                    : null;
                if (expiresAt && expiresAt < new Date()) {
                    setError('This document link has expired.');
                    setLoading(false);
                    return;
                }

                setPage(found);
                setIsUnlocked(!found.sharePassword);
                setLoading(false);
            } catch (err: any) {
                if (cancelled) return;
                if (err?.code === 'permission-denied') {
                    setError('You do not have permission to open this shared document. Ask the owner to turn on “Anyone with the link”, or sign in with the same team account.');
                } else {
                    setError(err?.message || 'Could not open this document.');
                }
                setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [firestore, token]);

    const handleAuthenticate = () => {
        if (page && page.sharePassword === password) {
            setIsUnlocked(true);
            setAuthError(false);
        } else {
            setAuthError(true);
        }
    };

    if (loading) return <FullScreenLoader text="Verifying Link..." />;

    if (error) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <Card className="max-w-md w-full border-none shadow-2xl rounded-[2.5rem] p-4 text-center">
                    <CardHeader className="pt-10">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 rounded-full bg-red-50 text-red-500">
                                <AlertTriangle className="h-10 w-10" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight text-slate-900">Access Restricted</CardTitle>
                        <CardDescription className="text-sm font-medium pt-2">{error}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pb-10 justify-center">
                        <Button asChild variant="outline" className="rounded-xl px-10 h-11 font-bold border-slate-200">
                            <a href="/">Go to Home</a>
                        </Button>
                    </CardFooter>
                </Card>
            </main>
        );
    }

    if (!isUnlocked) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="text-center">
                        <LogoBlack className="h-12 w-12 mx-auto mb-6" />
                        <h2 className="text-3xl font-black tracking-tight text-slate-900">Encrypted Document</h2>
                        <p className="text-slate-500 font-bold mt-2">This document is protected by an access key.</p>
                    </div>

                    <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                        <div className="p-10 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Document Access Key</Label>
                                <Input 
                                    type="password" 
                                    placeholder="Enter password..." 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-5 focus-visible:ring-primary/20"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAuthenticate()}
                                />
                                {authError && <p className="text-[10px] font-black text-destructive mt-2 uppercase tracking-tighter ml-1">Incorrect access key</p>}
                            </div>
                            <Button onClick={handleAuthenticate} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/10">
                                Verify and Open <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                </div>
            </main>
        );
    }

    const isBoard = page.type === 'board';
    const typeLabel = isBoard ? 'Canvas' : 'Documents';

    return (
        <main className="min-h-screen bg-[#f1f3f4]">
            <header className="h-16 bg-white border-b border-slate-200 flex items-center px-5 shrink-0">
                <div className="flex items-center gap-3">
                    <LogoBlack className="h-10 w-10 shrink-0" />
                    <div className="flex flex-col">
                        <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 leading-tight">Collab</span>
                        <span className="font-bold text-[10px] uppercase tracking-widest text-slate-400 leading-tight">{typeLabel}</span>
                    </div>
                </div>
            </header>
            {isBoard ? (
                <div className="h-[calc(100vh-64px)]">
                    <BoardEditor initialData={page.content} onContentChange={() => {}} editable={false} />
                </div>
            ) : (
            <ScrollArea className="h-[calc(100vh-64px)] docs-canvas">
                {page.coverImage && (
                    <div className="h-[30vh] w-full relative">
                        <img src={page.coverImage} alt="" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="px-4 sm:px-10">
                    <div className="docs-paper w-full">
                        {page.icon && <div className="text-5xl select-none pt-2 mb-4">{page.icon}</div>}
                        <h1 className="docs-doc-title mb-6">{page.title || 'Untitled'}</h1>
                        <Editor
                            initialContent={page.content}
                            onContentChange={() => {}}
                            editable={false}
                        />
                    </div>
                </div>
            </ScrollArea>
            )}
        </main>
    );
}
