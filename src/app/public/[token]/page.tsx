'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, limit, Timestamp } from 'firebase/firestore';
import { Editor } from '@/components/collaboration/Editor';
import { FullScreenLoader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LogoBlack } from '@/components/icons';
import { 
    Globe, 
    Lock, 
    AlertTriangle, 
    Calendar, 
    Clock, 
    ArrowRight,
    FileX,
    CheckCircle2
} from 'lucide-react';
import { format, isAfter } from 'date-fns';
import type { CollabPage } from '@/lib/types';
import Image from 'next/image';

export default function PublicDocumentViewer() {
    const { token } = useParams();
    const firestore = useFirestore();
    
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState(false);
    
    const pagesQuery = useMemoFirebase(() => {
        if (!firestore || !token) return null;
        return query(
            collection(firestore, 'collaboration_pages'),
            where('shareToken', '==', token),
            limit(1)
        );
    }, [firestore, token]);

    const { data: results, isLoading } = useCollection<CollabPage>(pagesQuery);
    const page = results?.[0];

    const isExpired = useMemo(() => {
        if (!page?.expiresAt) return false;
        const expiryDate = (page.expiresAt as Timestamp).toDate();
        return isAfter(new Date(), expiryDate);
    }, [page]);

    const needsPassword = !!page?.sharePassword;

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === page?.sharePassword) {
            setIsAuthenticated(true);
            setAuthError(false);
        } else {
            setAuthError(true);
        }
    };

    if (isLoading) return <FullScreenLoader text="Verifying Access Token" />;

    if (!page || !page.isPublic) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
                <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] p-4">
                    <CardHeader className="text-center">
                        <div className="p-4 rounded-full bg-slate-100 w-fit mx-auto mb-6">
                            <FileX className="h-10 w-10 text-slate-400" />
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight">Access Denied</CardTitle>
                        <CardDescription className="text-slate-500 font-medium pt-2 leading-relaxed">
                            This document is private or the sharing link has been deactivated by the owner.
                        </CardDescription>
                    </CardHeader>
                    <div className="p-6 pt-0">
                        <Button asChild className="w-full rounded-xl h-12 font-bold uppercase tracking-widest text-[10px]" variant="outline">
                            <a href="/">Go to River Dashboard</a>
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (isExpired) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
                <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] p-4">
                    <CardHeader className="text-center">
                        <div className="p-4 rounded-full bg-amber-50 w-fit mx-auto mb-6">
                            <Clock className="h-10 w-10 text-amber-500" />
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight">Link Expired</CardTitle>
                        <CardDescription className="text-slate-500 font-medium pt-2 leading-relaxed">
                            The temporary access window for this document has closed. Please request a new link from the sender.
                        </CardDescription>
                    </CardHeader>
                    <div className="p-6 pt-0">
                        <Button asChild className="w-full rounded-xl h-12 font-bold uppercase tracking-widest text-[10px]" variant="outline">
                            <a href="/">Return Home</a>
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (needsPassword && !isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6">
                <Card className="w-full max-w-md border-none shadow-3xl rounded-[2.5rem] p-6 bg-white overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-primary" />
                    <CardHeader className="text-center space-y-4">
                        <LogoBlack className="h-12 w-12 mx-auto" />
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black tracking-tight">Encrypted Document</CardTitle>
                            <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                                Authorization Required
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handlePasswordSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Access Key</Label>
                                <Input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4 focus:ring-primary shadow-inner"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                {authError && (
                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight ml-1 animate-in fade-in slide-in-from-top-1">
                                        Incorrect security key. Please verify with the sender.
                                    </p>
                                )}
                            </div>
                            <Button type="submit" className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
                                Verify Access <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col animate-in fade-in duration-1000">
            <header className="sticky top-0 z-50 h-16 bg-white/80 backdrop-blur-md border-b px-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <LogoBlack className="h-10 w-10" />
                    <div className="flex flex-col">
                        <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-900 leading-tight">Public</span>
                        <span className="font-bold text-[9px] uppercase tracking-widest text-slate-400 leading-tight">Document Hub</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="h-6 gap-2 bg-blue-50 text-primary border-blue-100 font-bold uppercase text-[9px] tracking-widest">
                        <Globe className="h-3 w-3" /> Shared via River
                    </Badge>
                </div>
            </header>

            <main className="flex-1">
                {page.coverImage && (
                    <div className="h-[35vh] w-full relative">
                        <Image src={page.coverImage} alt="Cover" fill className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                    </div>
                )}

                <div className="max-w-4xl mx-auto px-8 pt-12 pb-32">
                    {page.icon && (
                        <div className="text-6xl mb-8 select-none animate-in zoom-in-95 duration-700">{page.icon}</div>
                    )}
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-12 leading-tight uppercase">
                        {page.title || 'Untitled Document'}
                    </h1>

                    <div className="prose prose-slate max-w-none">
                        <Editor 
                            initialContent={page.content} 
                            onContentChange={() => {}} 
                            editable={false} 
                        />
                    </div>
                </div>
            </main>

            <footer className="p-12 bg-slate-50 border-t flex flex-col items-center gap-6">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verified Organizational Document</p>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">
                    River Tech Inc • Manila, Philippines
                </p>
            </footer>
        </div>
    );
}
