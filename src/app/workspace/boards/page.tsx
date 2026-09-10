'use client';

import React, { useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    Clock,
    Sparkles,
    Folder,
    Home,
    ArrowLeft,
    ChevronRight,
    Trash2
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import type { CollabPage, AppUser } from '@/lib/types';
import { getWorkspaceCompanyId } from '@/lib/workspace-access';
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
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogClose 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

function BoardsHubContent() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user } = useDoc<AppUser>(userDocRef);
  const companyId = getWorkspaceCompanyId(user);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('me');
  const currentFolderId = searchParams.get('folder');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const pagesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(
        collection(firestore, 'collaboration_pages'), 
        where('companyId', '==', companyId),
        where('isTrashed', '==', false)
    ) : null, 
    [firestore, companyId]
  );
  const { data: allPages, isLoading } = useCollection<CollabPage>(pagesQuery);

  const teamQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'users'), where('companyId', '==', companyId)) : null,
    [firestore, companyId]
  );
  const { data: teamMembers } = useCollection<AppUser>(teamQuery);

  const folderPath = useMemo(() => {
    if (!currentFolderId || !allPages) return [];
    const path = [];
    let curr: any = allPages.find(p => p.id === currentFolderId);
    while (curr) {
        path.unshift(curr);
        const parentId = curr.parentId;
        curr = allPages.find(p => p.id === parentId);
    }
    return path;
  }, [currentFolderId, allPages]);

  const goToFolder = (id: string | null) => {
    if (id) router.push(`/workspace/boards?folder=${encodeURIComponent(id)}`);
    else router.push('/workspace/boards');
  };

  const goBack = () => {
    if (!currentFolderId) {
      router.push('/workspace');
      return;
    }
    const parentId = folderPath.length >= 2 ? folderPath[folderPath.length - 2].id : null;
    goToFolder(parentId);
  };

  const filteredAssets = useMemo(() => {
    if (!allPages || !authUser) return [];
    let list = allPages.filter(p => p.parentId === currentFolderId);

    // Boards and Folders only
    list = list.filter(p => p.type === 'board' || p.type === 'folder');

    if (selectedMemberId === 'me') {
        list = list.filter(p => p.createdBy === authUser.uid);
    } else if (selectedMemberId !== 'all') {
        list = list.filter(p => p.createdBy === selectedMemberId);
    }

    if (searchTerm) {
        list = list.filter(p => p.title?.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return list.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;

        const dateA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
        const timeA = dateA || (a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0);
        const dateB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
        const timeB = dateB || (b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0);
        return timeB - timeA;
    });
  }, [allPages, searchTerm, selectedMemberId, authUser, currentFolderId]);

  const handleCreate = () => {
    window.dispatchEvent(new CustomEvent('request-new-collab-page', {
        detail: { type: 'board', parentId: currentFolderId }
    }));
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    window.dispatchEvent(new CustomEvent('request-new-collab-page', {
        detail: { type: 'folder', title: newFolderName.trim(), parentId: currentFolderId }
    }));
    setNewFolderName('');
    setIsNewFolderOpen(false);
  };

  const currentFilterLabel = useMemo(() => {
    if (selectedMemberId === 'me') return 'Mine';
    if (selectedMemberId === 'all') return 'Everyone';
    return teamMembers?.find(m => m.id === selectedMemberId)?.name || 'Member';
  }, [selectedMemberId, teamMembers]);

  return (
    <div className="min-h-full bg-white flex flex-col font-sans">
        <div className="px-8 py-6 space-y-6 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <button onClick={() => goToFolder(null)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400" title="Canvas home">
                            <Home className="h-4 w-4" />
                        </button>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        <button onClick={() => goToFolder(null)} className={cn("text-[10px] font-bold uppercase tracking-widest leading-none", folderPath.length === 0 ? "text-slate-900" : "text-slate-400 hover:text-slate-900")}>Canvas</button>
                        {folderPath.map((folder, idx) => (
                            <React.Fragment key={folder.id}>
                                <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                <button onClick={() => goToFolder(folder.id)} className={cn("text-[10px] font-bold uppercase tracking-widest whitespace-nowrap truncate max-w-[120px]", idx === folderPath.length - 1 ? "text-slate-900" : "text-slate-400 hover:text-slate-900")}>{folder.title}</button>
                            </React.Fragment>
                        ))}
                        <Button variant="ghost" size="sm" onClick={goBack} className="h-8 rounded-xl px-2 gap-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 ml-1">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="text-xs font-bold">Back</span>
                        </Button>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {currentFolderId ? folderPath[folderPath.length - 1]?.title : 'Canvases'}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setIsNewFolderOpen(true)} className="h-10 rounded-xl px-4 font-bold text-xs gap-2 border-slate-200 bg-white">
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-purple-600" />
                        <Input 
                            placeholder="Search..." 
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
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest border-b mb-1">Filter</DropdownMenuLabel>
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
                            <div key={i} className="aspect-[4/5] rounded-[1.5rem] bg-slate-50" />
                        ))
                    ) : filteredAssets.map(asset => (
                        <AssetCard 
                            key={asset.id} 
                            page={asset} 
                            onNavigate={() => asset.type === 'folder' ? goToFolder(asset.id) : null}
                        />
                    ))}
                    {!isLoading && filteredAssets.length === 0 && (
                        <div className="col-span-full py-40 text-center flex flex-col items-center gap-6 opacity-30 grayscale">
                            <div className="p-10 rounded-[3rem] bg-slate-50 border border-slate-100 shadow-inner">
                                <Layout className="h-16 w-16 text-slate-200" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900 leading-none">No canvases yet</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ScrollArea>

        {/* New Folder Dialog */}
        <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
            <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-3xl p-8 bg-white">
                <DialogHeader className="space-y-4">
                    <div className="p-3 w-fit rounded-xl bg-blue-50 text-blue-600">
                        <FolderPlus className="h-5 w-5" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">New folder</DialogTitle>
                        <DialogDescription className="sr-only">Create a folder</DialogDescription>
                    </div>
                </DialogHeader>
                <div className="py-6">
                    <Label className="text-[10px] font-bold text-slate-400 ml-1">Folder name</Label>
                    <Input 
                        autoFocus
                        placeholder="Folder name" 
                        className="h-12 rounded-xl bg-slate-50 border-slate-100 font-semibold px-4 mt-2 text-sm shadow-inner"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setIsNewFolderOpen(false)} className="rounded-xl h-10 font-bold text-xs text-slate-400">Cancel</Button>
                    <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="rounded-xl h-10 px-8 font-bold text-xs shadow-lg">
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

export default function BoardsHubPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-white" />}>
      <BoardsHubContent />
    </Suspense>
  );
}

function AssetCard({ page, onNavigate }: { page: CollabPage, onNavigate?: () => void }) {
    const firestore = useFirestore();
    const creatorQuery = useMemoFirebase(() => (firestore && page.createdBy) ? doc(firestore, 'users', page.createdBy) : null, [firestore, page.createdBy]);
    const { data: creator } = useDoc<AppUser>(creatorQuery);
    
    const [isOver, setIsOver] = useState(false);

    const timeAgo = page.updatedAt 
        ? formatDistanceToNow((page.updatedAt as Timestamp).toDate(), { addSuffix: true })
        : page.createdAt 
            ? formatDistanceToNow((page.createdAt as Timestamp).toDate(), { addSuffix: true })
            : 'Recently';

    const isFolder = page.type === 'folder';

    const handleDragStart = (e: React.DragEvent) => {
        if (isFolder) return;
        e.dataTransfer.setData('pageId', page.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        if (!isFolder) return;
        e.preventDefault();
        setIsOver(false);
        const sourceId = e.dataTransfer.getData('pageId');
        if (sourceId && sourceId !== page.id) {
            window.dispatchEvent(new CustomEvent('request-move-collab-page', {
                detail: { pageId: sourceId, targetParentId: page.id }
            }));
        }
    };

    const cardContent = (
        <Card 
            draggable={!isFolder && !page.isTrashed}
            onDragStart={handleDragStart}
            onDragOver={(e) => { if (isFolder) { e.preventDefault(); setIsOver(true); } }}
            onDragLeave={() => setIsOver(false)}
            onDrop={handleDrop}
            className={cn(
                "border-none shadow-none bg-white rounded-2xl overflow-hidden",
                isOver && "ring-2 ring-primary ring-offset-2 bg-blue-50/30"
            )}
        >
            <div className={cn(
                "relative aspect-[1.4/1] w-full border border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden",
                isFolder ? "bg-slate-100" : "bg-slate-50"
            )}>
                {page.coverImage ? (
                    <Image src={page.coverImage} alt={page.title} fill className="object-cover" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-50" />
                )}

                <div className="relative z-10">
                    {page.icon ? (
                        <span className="text-5xl drop-shadow-xl select-none">{page.icon}</span>
                    ) : (
                        <div className={cn(
                            "h-16 w-16 rounded-[1.25rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center text-purple-600",
                            page.coverImage && "bg-white/90 backdrop-blur-md border-white/50"
                        )}>
                            {isFolder ? <Folder className="h-8 w-8 fill-current" /> : <Layout className="h-8 w-8" />}
                        </div>
                    )}
                </div>
            </div>

            <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight">
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

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-4 min-w-0">
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
                    <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!window.confirm(`Delete this ${isFolder ? 'folder' : 'canvas'}? You can restore it from Trash.`)) return;
                            window.dispatchEvent(new CustomEvent('request-delete-collab-page', { detail: { pageId: page.id } }));
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-red-600 shrink-0"
                    >
                        <Trash2 className="h-3 w-3" />
                        Delete
                    </button>
                </div>
            </CardContent>
        </Card>
    );

    if (isFolder) {
        return (
            <button onClick={onNavigate} className="group block text-left outline-none">
                {cardContent}
            </button>
        );
    }

    return (
        <Link href={`/workspace/${page.id}`} className="group block">
            {cardContent}
        </Link>
    );
}
