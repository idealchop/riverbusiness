'use client';

import React, { useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { 
    FileText, 
    Plus, 
    Search, 
    UserCircle, 
    FolderPlus, 
    ChevronDown, 
    MoreVertical, 
    Globe, 
    Users,
    Check,
    Filter,
    Folder,
    ChevronRight,
    Home,
    ArrowLeft,
    FolderOpen,
    Loader2,
    Star,
    StarOff,
    Pencil,
    Trash2,
    LayoutGrid,
    List
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import Image from 'next/image';
import type { CollabPage, AppUser } from '@/lib/types';
import { getWorkspaceCompanyId } from '@/lib/workspace-access';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { NamePromptPopover } from '@/components/collaboration/NamePromptPopover';

function DocsHubContent() {
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
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Fetch all pages (docs and folders) for the company
  const pagesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(
        collection(firestore, 'collaboration_pages'), 
        where('companyId', '==', companyId),
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

  // Hierarchical Breadcrumb Navigation
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
    if (id) router.push(`/workspace/docs?folder=${encodeURIComponent(id)}`);
    else router.push('/workspace/docs');
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
    
    // 1. Level Filter: Only show items in current folder
    let list = allPages.filter(p => p.parentId === currentFolderId);

    // 2. Type Filter: Docs and Folders only for this hub
    list = list.filter(p => p.type === 'doc' || p.type === 'folder');
    
    // 3. Member Filter
    if (selectedMemberId === 'me') {
        list = list.filter(p => p.createdBy === authUser.uid);
    } else if (selectedMemberId !== 'all') {
        list = list.filter(p => p.createdBy === selectedMemberId);
    }

    // 4. Search Filter
    if (searchTerm) {
        list = list.filter(p => p.title?.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return list.sort((a, b) => {
        // Folders first
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;

        const dateA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
        const timeA = dateA || (a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0);
        const dateB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
        const timeB = dateB || (b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0);
        return timeB - timeA;
    });
  }, [allPages, searchTerm, selectedMemberId, authUser, currentFolderId]);

  const handleCreateDoc = () => {
    if (!newDocName.trim()) return;
    window.dispatchEvent(new CustomEvent('request-new-collab-page', {
        detail: { type: 'doc', title: newDocName.trim(), parentId: currentFolderId }
    }));
    setNewDocName('');
    setIsNewDocOpen(false);
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
            {/* Header with Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <button onClick={() => goToFolder(null)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400" title="Documents home">
                            <Home className="h-4 w-4" />
                        </button>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        <button onClick={() => goToFolder(null)} className={cn("text-[10px] font-bold uppercase tracking-widest leading-none", folderPath.length === 0 ? "text-slate-900" : "text-slate-400 hover:text-slate-900")}>Documents</button>
                        {folderPath.map((folder, idx) => (
                            <React.Fragment key={folder.id}>
                                <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                <button 
                                    onClick={() => goToFolder(folder.id)}
                                    className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest whitespace-nowrap truncate max-w-[120px]",
                                        idx === folderPath.length - 1 ? "text-slate-900" : "text-slate-400 hover:text-slate-900"
                                    )}
                                >
                                    {folder.title}
                                </button>
                            </React.Fragment>
                        ))}
                        <Button variant="ghost" size="sm" onClick={goBack} className="h-8 rounded-xl px-2 gap-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 ml-1">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="text-xs font-bold">Back</span>
                        </Button>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {currentFolderId ? folderPath[folderPath.length - 1]?.title : 'Documents'}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <NamePromptPopover
                        open={isNewFolderOpen}
                        onOpenChange={(open) => {
                            setIsNewFolderOpen(open);
                            if (!open) setNewFolderName('');
                        }}
                        title="Folder name"
                        placeholder="Folder name"
                        value={newFolderName}
                        onChange={setNewFolderName}
                        onSubmit={handleCreateFolder}
                        trigger={
                            <Button variant="outline" className="h-10 rounded-xl px-4 font-bold text-xs gap-2 border-slate-200 bg-white">
                                <FolderPlus className="h-4 w-4" /> New folder
                            </Button>
                        }
                    />
                    <NamePromptPopover
                        open={isNewDocOpen}
                        onOpenChange={(open) => {
                            setIsNewDocOpen(open);
                            if (!open) setNewDocName('');
                        }}
                        title="Document name"
                        placeholder="Document name"
                        value={newDocName}
                        onChange={setNewDocName}
                        onSubmit={handleCreateDoc}
                        trigger={
                            <Button className="h-10 rounded-xl px-6 font-bold text-xs gap-2 shadow-lg shadow-primary/20">
                                <Plus className="h-4 w-4" /> New document
                            </Button>
                        }
                    />
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary" />
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
                                <Filter className="h-3.5 w-3.5 text-primary" />
                                {currentFilterLabel}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64 p-1 rounded-2xl shadow-3xl border-slate-100 bg-white z-50">
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest border-b mb-1">Filter</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setSelectedMemberId('me')} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><UserCircle className="h-4 w-4" /></div>
                                My Documents
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
                                        {selectedMemberId === member.id && <Check className="h-3.5 w-3.5 text-primary" />}
                                    </DropdownMenuItem>
                                ))}
                            </ScrollArea>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-3">
                    <HubViewToggle view={viewMode} onChange={setViewMode} />
                    <Button variant="ghost" size="sm" className="h-9 px-3 gap-2 font-bold text-[11px] text-slate-500 uppercase tracking-widest hover:bg-slate-50">
                        Date <ChevronDown className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>

        <Separator className="bg-slate-50" />

        <ScrollArea className="flex-1">
            <div className="p-8 pb-32">
                <div className={cn(
                    "grid",
                    viewMode === 'list'
                        ? "grid-cols-1 rounded-2xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                )}>
                    {isLoading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className={cn("bg-slate-50", viewMode === 'list' ? "h-12" : "aspect-[4/5] rounded-[1.5rem]")} />
                        ))
                    ) : filteredAssets.map(asset => (
                        <AssetCard 
                            key={asset.id} 
                            page={asset}
                            viewMode={viewMode}
                            onNavigate={() => asset.type === 'folder' ? goToFolder(asset.id) : null}
                        />
                    ))}
                    {!isLoading && filteredAssets.length === 0 && (
                        <div className="col-span-full py-40 text-center flex flex-col items-center gap-6 opacity-30 grayscale">
                            <div className="p-10 rounded-[3rem] bg-slate-50 border border-slate-100 shadow-inner">
                                <FileText className="h-16 w-16 text-slate-200" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900 leading-none">No documents yet</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ScrollArea>
    </div>
  );
}

export default function DocsHubPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-white" />}>
      <DocsHubContent />
    </Suspense>
  );
}

function HubViewToggle({ view, onChange }: { view: 'grid' | 'list'; onChange: (view: 'grid' | 'list') => void }) {
    return (
        <div className="flex items-center rounded-2xl bg-white border border-slate-200 p-1 shadow-sm">
            <button
                type="button"
                aria-label="Grid view"
                onClick={() => onChange('grid')}
                className={cn(
                    "h-8 w-9 rounded-xl flex items-center justify-center transition-colors",
                    view === 'grid' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-700"
                )}
            >
                <LayoutGrid className="h-4 w-4" />
            </button>
            <button
                type="button"
                aria-label="List view"
                onClick={() => onChange('list')}
                className={cn(
                    "h-8 w-9 rounded-xl flex items-center justify-center transition-colors",
                    view === 'list' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-700"
                )}
            >
                <List className="h-4 w-4" />
            </button>
        </div>
    );
}

function AssetCard({ page, onNavigate, viewMode }: { page: CollabPage, onNavigate?: () => void, viewMode: 'grid' | 'list' }) {
    const [isOver, setIsOver] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [renameValue, setRenameValue] = useState(page.title || '');

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

    const typeIcon = page.icon ? (
        <span className="text-base leading-none">{page.icon}</span>
    ) : isFolder ? (
        <Folder className="h-4 w-4 text-blue-500" />
    ) : (
        <FileText className="h-4 w-4 text-blue-500" />
    );

    const actionsMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="h-8 w-7 rounded-lg text-slate-300 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center shrink-0"
                    aria-label="Document actions"
                >
                    <MoreVertical className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                    onClick={(e) => {
                        e.preventDefault();
                        setRenameValue(page.title || '');
                        setRenameOpen(true);
                    }}
                    className="gap-2 font-semibold text-xs rounded-lg cursor-pointer"
                >
                    <Pencil className="h-4 w-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(e) => {
                        e.preventDefault();
                        window.dispatchEvent(new CustomEvent('request-favorite-collab-page', { detail: { pageId: page.id, isFavorite: !page.isFavorite } }));
                    }}
                    className="gap-2 font-semibold text-xs rounded-lg cursor-pointer"
                >
                    {page.isFavorite ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                    {page.isFavorite ? 'Unfavorite' : 'Favorite'}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(e) => {
                        e.preventDefault();
                        window.dispatchEvent(new CustomEvent('request-share-collab-page', { detail: { pageId: page.id } }));
                    }}
                    className="gap-2 font-semibold text-xs rounded-lg cursor-pointer"
                >
                    <Globe className="h-4 w-4" /> Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={(e) => {
                        e.preventDefault();
                        window.dispatchEvent(new CustomEvent('request-delete-collab-page', { detail: { pageId: page.id } }));
                    }}
                    className="gap-2 font-semibold text-xs rounded-lg cursor-pointer text-red-600 focus:text-red-600"
                >
                    <Trash2 className="h-4 w-4" /> Move to trash
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const cardContent = viewMode === 'grid' ? (
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
                    <Image src={page.coverImage} alt={page.title} fill className="object-cover" unoptimized />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-50" />
                )}
                <div className="relative z-10">
                    {page.icon ? (
                        <span className="text-5xl drop-shadow-xl select-none">{page.icon}</span>
                    ) : (
                        <div className={cn(
                            "h-16 w-16 rounded-[1.25rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center",
                            isFolder ? "text-blue-600" : "text-blue-500",
                            page.coverImage && "bg-white/90 backdrop-blur-md border-white/50"
                        )}>
                            {isFolder ? <Folder className="h-8 w-8 fill-current" /> : <FileText className="h-8 w-8" />}
                        </div>
                    )}
                </div>
            </div>
            <CardContent className="p-4">
                <div className="flex items-center gap-2">
                    <h3 className="flex-1 min-w-0 text-sm font-bold text-slate-900 truncate tracking-tight">
                        {page.title || 'Untitled'}
                    </h3>
                    {actionsMenu}
                </div>
            </CardContent>
        </Card>
    ) : (
        <Card
            draggable={!isFolder && !page.isTrashed}
            onDragStart={handleDragStart}
            onDragOver={(e) => { if (isFolder) { e.preventDefault(); setIsOver(true); } }}
            onDragLeave={() => setIsOver(false)}
            onDrop={handleDrop}
            className={cn(
                "border-none shadow-none bg-transparent rounded-none overflow-hidden",
                isOver && "bg-blue-50/40"
            )}
        >
            <CardContent className="p-0">
                <div className="flex items-center gap-3 h-12 px-3 hover:bg-slate-50 transition-colors">
                    <span className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0" aria-hidden>
                        {typeIcon}
                    </span>
                    <h3 className="flex-1 min-w-0 text-sm font-semibold text-slate-800 truncate tracking-tight">
                        {page.title || 'Untitled'}
                    </h3>
                    {actionsMenu}
                </div>
            </CardContent>
        </Card>
    );

    if (isFolder) {
        return (
            <>
            <button onClick={onNavigate} className="group block text-left outline-none">
                {cardContent}
            </button>
            <RenameDialog open={renameOpen} onOpenChange={setRenameOpen} value={renameValue} onChange={setRenameValue} onSave={() => {
                window.dispatchEvent(new CustomEvent('request-rename-collab-page', { detail: { pageId: page.id, title: renameValue } }));
                setRenameOpen(false);
            }} />
            </>
        );
    }

    return (
        <>
        <Link href={`/workspace/${page.id}`} className="group block">
            {cardContent}
        </Link>
        <RenameDialog open={renameOpen} onOpenChange={setRenameOpen} value={renameValue} onChange={setRenameValue} onSave={() => {
            window.dispatchEvent(new CustomEvent('request-rename-collab-page', { detail: { pageId: page.id, title: renameValue } }));
            setRenameOpen(false);
        }} />
        </>
    );
}

function RenameDialog({
  open,
  onOpenChange,
  value,
  onChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-3xl p-8 bg-white" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">Rename</DialogTitle>
          <DialogDescription className="sr-only">Enter a new name</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label className="text-[10px] font-bold text-slate-400 ml-1">Name</Label>
          <Input
            autoFocus
            className="h-12 rounded-xl bg-slate-50 border-slate-100 font-semibold px-4 mt-2 text-sm shadow-inner focus-visible:ring-primary"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-10 font-bold text-xs text-slate-400">Cancel</Button>
          <Button onClick={onSave} className="rounded-xl h-10 px-8 font-bold text-xs shadow-lg">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
