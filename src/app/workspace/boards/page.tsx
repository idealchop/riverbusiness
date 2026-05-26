'use client';

import React, { useMemo, useState } from 'react';
import { useUser, useDoc, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { 
    Layout, 
    Plus, 
    Search, 
    UserCircle, 
    FolderPlus, 
    ChevronDown, 
    MoreHorizontal, 
    Globe, 
    Lock, 
    Users, 
    Palette, 
    Filter,
    Check,
    Separator,
    Clock,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import type { CollabPage, AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function BoardsHubPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user } = useDoc<AppUser>(userDocRef);
  const companyId = user?.companyId || null;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('me');

  const pagesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(
        collection(firestore, 'collaboration_pages'), 
        where('companyId', '==', companyId),
        where('type', '==', 'board'),
        where('isTrashed', '==', false)
    ) : null, 
    [firestore, companyId]
  );
  const { data: allPages, isLoading } = useCollection<CollabPage>(pagesQuery);

  // Fetch team members for the filter
  const teamQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'users'), where('companyId', '==', companyId)) : null,
    [firestore, companyId]
  );
  const { data: teamMembers } = useCollection<AppUser>(teamQuery);

  const filteredBoards = useMemo(() => {
    if (!allPages || !authUser) return [];
    let list = [...allPages];

    // Apply Member Filter
    if (selectedMemberId === 'me') {
        list = list.filter(p => p.createdBy === authUser.uid);
    } else if (selectedMemberId !== 'all') {
        list = list.filter(p => p.createdBy === selectedMemberId);
    }

    if (searchTerm) {
        list = list.filter(p => p.title?.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return list.sort((a, b) => {
        const dateA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
        const timeA = dateA || (a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0);
        const dateB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
        const timeB = dateB || (b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0);
        return timeB - timeA;
    });
  }, [allPages, searchTerm, selectedMemberId, authUser]);

  const handleCreate = () => {
    window.dispatchEvent(new CustomEvent('request-new-collab-page', {
        detail: { type: 'board' }
    }));
  };

  const currentFilterLabel = useMemo(() => {
    if (selectedMemberId === 'me') return 'My Work';
    if (selectedMemberId === 'all') return 'Entire Team';
    return teamMembers?.find(m => m.id === selectedMemberId)?.name || 'Member';
  }, [selectedMemberId, teamMembers]);

  return (
    <div className="min-h-full bg-white flex flex-col font-sans">
        <div className="px-8 py-6 space-y-6 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Library</p>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Canvases</h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-10 rounded-xl px-4 font-bold text-xs gap-2 border-slate-200 bg-white">
                        <FolderPlus className="h-4 w-4" /> New folder
                    </Button>
                    <Button onClick={handleCreate} className="h-10 rounded-xl px-6 font-bold text-xs gap-2 shadow-lg shadow-primary/20 bg-purple-600 hover:bg-purple-700 text-white border-none">
                        <Plus className="h-4 w-4" /> New canvas
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-purple-600 transition-colors" />
                        <Input 
                            placeholder="Search visual boards..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-10 pl-10 rounded-xl bg-slate-50 border-none shadow-inner font-medium text-sm"
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-10 rounded-xl px-4 font-bold text-[10px] uppercase tracking-widest gap-2 border-slate-200 bg-white min-w-[140px]">
                                <Filter className="h-3.5 w-3.5 text-purple-600" />
                                {currentFilterLabel}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64 p-1 rounded-2xl shadow-3xl border-slate-100 bg-white z-50">
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest border-b mb-1">Filter Library</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setSelectedMemberId('me')} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600"><UserCircle className="h-4 w-4" /></div>
                                My Canvases
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedMemberId('all')} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400"><Users className="h-4 w-4" /></div>
                                All Team Work
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-50" />
                            <ScrollArea className="h-48">
                                {teamMembers?.filter(m => m.id !== authUser?.uid).map(member => (
                                    <DropdownMenuItem key={member.id} onClick={() => setSelectedMemberId(member.id)} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={member.photoURL} />
                                            <AvatarFallback className="text-[8px]">{member.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="truncate flex-1 font-bold">{member.name}</span>
                                        {selectedMemberId === member.id && <Check className="h-3.5 w-3.5 text-purple-600" />}
                                    </DropdownMenuItem>
                                ))}
                            </ScrollArea>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-9 px-3 gap-2 font-bold text-[11px] text-slate-500 uppercase tracking-widest hover:bg-slate-50">
                        Date <ChevronDown className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>

        <Separator className="bg-slate-50" />

        <ScrollArea className="flex-1">
            <div className="p-8 pb-32">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {isLoading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="aspect-[4/5] rounded-[1.5rem] bg-slate-50 animate-pulse" />
                        ))
                    ) : filteredBoards.map(page => (
                        <AssetCard key={page.id} page={page} />
                    ))}
                    {!isLoading && filteredBoards.length === 0 && (
                        <div className="col-span-full py-40 text-center flex flex-col items-center gap-6 opacity-30 grayscale">
                            <div className="p-10 rounded-[3rem] bg-slate-50 border border-slate-100 shadow-inner">
                                <Layout className="h-16 w-16 text-slate-200" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-900 leading-none">Canvas clear</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No canvases match this filter</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ScrollArea>
    </div>
  );
}

function AssetCard({ page }: { page: CollabPage }) {
    const firestore = useFirestore();
    const creatorQuery = useMemoFirebase(() => (firestore && page.createdBy) ? doc(firestore, 'users', page.createdBy) : null, [firestore, page.createdBy]);
    const { data: creator } = useDoc<AppUser>(creatorQuery);

    const timeAgo = page.updatedAt 
        ? formatDistanceToNow((page.updatedAt as Timestamp).toDate(), { addSuffix: true })
        : page.createdAt 
            ? formatDistanceToNow((page.createdAt as Timestamp).toDate(), { addSuffix: true })
            : 'Recently';

    return (
        <Link href={`/workspace/${page.id}`} className="group block">
            <Card className="border-none shadow-none bg-white rounded-2xl overflow-hidden transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-slate-200">
                <div className="relative aspect-[1.4/1] w-full bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center transition-all group-hover:border-purple-600/20 group-hover:bg-slate-50/30 overflow-hidden">
                    {page.coverImage ? (
                        <Image src={page.coverImage} alt={page.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-50" />
                    )}

                    <div className="relative z-10 transition-transform duration-500 group-hover:scale-110">
                        {page.icon ? (
                            <span className="text-5xl drop-shadow-xl select-none">{page.icon}</span>
                        ) : (
                            <div className={cn(
                                "h-16 w-16 rounded-[1.25rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center text-purple-600 transition-all",
                                page.coverImage && "bg-white/90 backdrop-blur-md border-white/50"
                            )}>
                                <Layout className="h-8 w-8" />
                            </div>
                        )}
                    </div>
                </div>

                <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight group-hover:text-purple-600 transition-colors">
                                {page.title || 'Untitled canvas'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Avatar className="h-4 w-4 shadow-sm shrink-0 border border-white ring-1 ring-slate-100">
                                    <AvatarImage src={creator?.photoURL} />
                                    <AvatarFallback className="text-[6px] font-black">{creator?.name?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                                <p className="text-[10px] font-bold text-slate-400 truncate">
                                    {creator?.name || 'Designer'} • {timeAgo}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400">
                            {page.isPrivate ? (
                                <><Lock className="h-2.5 w-2.5" /> Private</>
                            ) : (
                                <><Users className="h-2.5 w-2.5" /> Team View</>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-purple-600">
                            <Sparkles className="h-2.5 w-2.5" /> Creative
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
