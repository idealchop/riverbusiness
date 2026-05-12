'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, limit, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LogoBlack } from '@/components/icons';
import { Lock, FileText, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { FullScreenLoader } from '@/components/ui/loader';
import { Editor } from '@/components/collaboration/Editor';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';

export default function PublicPage() {
    const { token } = useParams();
    const firestore = useFirestore();
    
    const [page, setPage] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState(false);

    // Query for public page by token
    const publicQuery = useMemoFirebase(() => {
        if (!firestore || !token) return null;
        return query(
            collection(firestore, 'collaboration_pages'),
            where('isPublic', '==', true),
            where('shareToken', '==', token),
            limit(1)
        );
    }, [firestore, token]);

    const { data: pages, isLoading: queryLoading } = useCollection(publicQuery);

    useEffect(() => {
        if (queryLoading) return;

        if (pages && pages.length > 0) {
            const p = pages[0];
            const expiresAt = p.expiresAt ? (p.expiresAt instanceof Timestamp ? p.expiresAt.toDate() : new Date(p.expiresAt)) : null;
            
            if (expiresAt && expiresAt < new Date()) {
                setError("This document link has expired.");
                setLoading(false);
            } else {
                setPage(p);
                if (!p.sharePassword) {
                    setIsAuthenticated(true);
                }
                setLoading(false);
            }
        } else {
            setError("Document not found or is no longer public.");
            setLoading(false);
        }
    }, [pages, queryLoading]);

    const handleAuthenticate = () => {
        if (page && page.sharePassword === password) {
            setIsAuthenticated(true);
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

    if (!isAuthenticated) {
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

    return (
        <main className="min-h-screen bg-white">
            <header className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <LogoBlack className="h-10 w-10" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Public Shared Document</span>
                        <h1 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{page.title}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 border-slate-100 gap-1.5 px-3">
                        <Lock className="h-3 w-3 text-slate-400" /> Secure Link
                    </Badge>
                </div>
            </header>

            <ScrollArea className="h-[calc(100vh-64px)]">
                {page.coverImage && (
                    <div className="h-[30vh] w-full relative">
                        <img src={page.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="max-w-4xl mx-auto px-8 pt-12 pb-40">
                    <div className="flex flex-col gap-6">
                        {page.icon && <div className="text-6xl">{page.icon}</div>}
                        <h1 className="text-4xl font-black text-slate-900 leading-tight">{page.title}</h1>
                        <Separator className="bg-slate-100" />
                        <div className="prose prose-slate max-w-none">
                            <Editor 
                                initialContent={page.content} 
                                onContentChange={() => {}} 
                                editable={false}
                            />
                        </div>
                    </div>
                </div>
                <footer className="max-w-4xl mx-auto px-8 pb-20 border-t border-slate-50 pt-10 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                        Document managed by River Philippines
                    </p>
                </footer>
            </ScrollArea>
        </main>
    );
}
