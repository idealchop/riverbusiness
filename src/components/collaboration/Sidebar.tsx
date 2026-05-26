'use client';

import React, { useState, useMemo, memo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    ChevronRight, 
    ChevronDown, 
    Plus, 
    FileText, 
    Home, 
    Search, 
    Star, 
    Trash2, 
    MoreHorizontal,
    PanelLeftClose,
    X,
    Grid,
    Layout,
    UserCircle,
    Users,
    Check,
    History,
    Lock,
    Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { CollabPage, AppUser, CollabPageType } from '@/lib/types';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { LogoBlack } from '@/components/icons';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  pages: CollabPage[];
  activePageId: string | null;
  onCreatePage: (parentId: string | null, title: string, type: CollabPageType) => void;
  user: AppUser | null;
}

const NavItem = memo(({ 
    page, 
    level = 0, 
    pages, 
    activePageId, 
    expandedPages, 
    onToggleExpand, 
    onCreatePage,
    onFavorite,
    onTrash,
    onDuplicate
}: { 
    page: CollabPage, 
    level?: number, 
    pages: CollabPage[], 
    activePageId: string | null,
    expandedPages: Record<string, boolean>,
    onToggleExpand: (id: string) => void,
    onCreatePage: (parentId: string | null, title: string, type: CollabPageType) => void,
    onFavorite: (id: string, isFavorite: boolean) => void,
    onTrash: (id: string) => void,
    onDuplicate: (id: string) => void
}) => {
    const isExpanded = expandedPages[page.id];
    const isActive = activePageId === page.id;
    const children = pages.filter(p => p.parentId === page.id);
    const hasChildren = children.length > 0;

    const getPageIcon = () => {
        if (page.isPrivate) return <Lock className="h-3.5 w-3.5 text-amber-500" />;
        if (page.icon) return <span className="text-xs leading-none select-none">{page.icon}</span>;
        switch (page.type) {
            case 'sheet': return <Grid className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-slate-400")} />;
            case 'board': return <Layout className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-slate-400")} />;
            default: return <FileText className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-slate-400")} />;
        }
    };

    return (
        <div className="space-y-0.5">
            <div 
                className={cn(
                    "group/menu-item flex items-center h-8 rounded-lg transition-all relative pr-2",
                    isActive ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                style={{ paddingLeft: `${(level * 12) + 8}px` }}
            >
                <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleExpand(page.id); }}
                    className={cn(
                        "h-6 w-6 rounded-md hover:bg-slate-200/50 flex items-center justify-center transition-colors shrink-0",
                        !hasChildren && "opacity-0 pointer-events-none"
                    )}
                >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>

                <Link 
                    href={`/workspace/${page.id}`} 
                    className="flex-1 flex items-center gap-2 min-w-0 h-full outline-none"
                >
                    <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {getPageIcon()}
                    </div>
                    <span className="text-sm font-semibold truncate leading-none pt-0.5">{page.title || 'Untitled'}</span>
                </Link>

                <div className="flex items-center opacity-0 group-hover/menu-item:opacity-100 transition-opacity gap-0.5 shrink-0 bg-inherit pl-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 rounded-xl p-1 shadow-2xl border-slate-100 bg-white">
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-2 py-1.5 tracking-widest">New Sub-Item</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onCreatePage(page.id, 'New Doc', 'doc')} className="gap-2 text-xs font-semibold rounded-lg cursor-pointer py-2.5">
                                <FileText className="h-3.5 w-3.5 text-blue-500" /> New Doc
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCreatePage(page.id, 'New Sheet', 'sheet')} className="gap-2 text-xs font-semibold rounded-lg cursor-pointer py-2.5">
                                <Grid className="h-3.5 w-3.5 text-green-500" /> New Sheet
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCreatePage(page.id, 'New Board', 'board')} className="gap-2 text-xs font-semibold rounded-lg cursor-pointer py-2.5">
                                <Layout className="h-3.5 w-3.5 text-purple-500" /> New Board
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <button 
                        onClick={(e) => { e.preventDefault(); onFavorite(page.id, !page.isFavorite); }}
                        className={cn(
                            "h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center transition-colors",
                            page.isFavorite ? "text-amber-500" : "text-slate-400 hover:text-amber-500"
                        )}
                    >
                        <Star className={cn("h-3.5 w-3.5", page.isFavorite && "fill-current")} />
                    </button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-400">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 rounded-xl p-1 shadow-2xl border-slate-100 bg-white">
                            <DropdownMenuItem onClick={() => onDuplicate(page.id)} className="gap-2 text-xs font-semibold rounded-lg cursor-pointer py-2.5">
                                <Copy className="h-3.5 w-3.5 text-slate-500" /> Duplicate Document
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-50" />
                            <DropdownMenuItem onClick={() => onTrash(page.id)} className="gap-2 text-xs font-semibold text-red-600 rounded-lg cursor-pointer py-2.5">
                                <Trash2 className="h-3.5 w-3.5" /> Move to trash
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div>
                    {children.map(child => (
                        <NavItem 
                            key={child.id} 
                            page={child} 
                            level={level + 1} 
                            pages={pages}
                            activePageId={activePageId}
                            expandedPages={expandedPages}
                            onToggleExpand={onToggleExpand}
                            onCreatePage={onCreatePage}
                            onFavorite={onFavorite}
                            onTrash={onTrash}
                            onDuplicate={onDuplicate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});
NavItem.displayName = 'NavItem';

export function Sidebar({ isOpen, onToggle, pages, activePageId, onCreatePage, user }: SidebarProps) {
  const firestore = useFirestore();
  const companyId = user?.companyId || null;
  const pathname = usePathname();

  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isHomeExpanded, setIsHomeExpanded] = useState(true);
  
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const hasSetDefault = useRef(false);

  // Set default contributor filter to current user only once upon load
  useEffect(() => {
    if (user?.id && !hasSetDefault.current) {
        setSelectedMemberId(user.id);
        hasSetDefault.current = true;
    }
  }, [user?.id]);

  const teamQuery = useMemoFirebase(() => (firestore && companyId) ? query(collection(firestore, 'users'), where('companyId', '==', companyId)) : null, [firestore, companyId]);
  const { data: teamMembers } = useCollection<AppUser>(teamQuery);

  const toggleExpand = useCallback((pageId: string) => {
    setExpandedPages(prev => ({ ...prev, [pageId]: !prev[pageId] }));
  }, []);

  const handleFavorite = useCallback((pageId: string, isFavorite: boolean) => {
    window.dispatchEvent(new CustomEvent('request-favorite-collab-page', { detail: { pageId, isFavorite } }));
  }, []);

  const onTrash = useCallback((pageId: string) => {
    window.dispatchEvent(new CustomEvent('request-delete-collab-page', { detail: { pageId } }));
  }, []);

  const onDuplicate = useCallback((pageId: string) => {
    window.dispatchEvent(new CustomEvent('request-duplicate-collab-page', { detail: { pageId } }));
  }, []);

  const filteredPages = useMemo(() => {
      let list = pages;
      if (selectedMemberId !== 'all') {
          list = list.filter(p => p.createdBy === selectedMemberId);
      }
      if (searchQuery) {
          list = list.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      return list;
  }, [pages, searchQuery, selectedMemberId]);

  const favorites = pages.filter(p => p.isFavorite);
  const rootPages = filteredPages.filter(p => !p.parentId);

  const isWorkspaceHomeActive = pathname === '/workspace';

  return (
    <div className={cn(
      "bg-slate-50/80 border-r transition-all duration-300 flex flex-col h-full group/sidebar shrink-0 relative",
      isOpen ? "w-72" : "w-0 overflow-hidden border-none"
    )}>
      <div className="p-6 shrink-0 space-y-6">
        <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
                <LogoBlack className="h-10 w-10 transition-transform group-hover:scale-105" />
                <div className="flex flex-col">
                    <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 leading-tight">Collab</span>
                    <span className="font-bold text-[10px] uppercase tracking-widest text-slate-400 leading-tight">Documents</span>
                </div>
            </Link>
            <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-lg">
                <PanelLeftClose className="h-4 w-4" />
            </Button>
        </div>

        <div className="space-y-1">
            <div className="flex items-center gap-1.5">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="outline" 
                            className="flex-1 justify-start h-8 rounded-xl border-slate-200 bg-white shadow-sm gap-2 font-bold text-[10px] uppercase tracking-widest px-3"
                        >
                            <UserCircle className="h-3.5 w-3.5 text-primary" />
                            <span className="truncate max-w-[120px]">
                                {selectedMemberId === 'all' ? 'Team library' : teamMembers?.find(m => m.id === selectedMemberId)?.name || 'Member'}
                            </span>
                            <ChevronDown className="h-3 w-3 ml-auto text-slate-300" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64 p-1 rounded-2xl shadow-3xl border-slate-100 bg-white z-[60]">
                        <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-2 tracking-[0.2em] border-b mb-1">Contributor Filter</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSelectedMemberId('all')} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                            <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400"><Users className="h-3.5 w-3.5" /></div>
                            All Team Documents
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <ScrollArea className="h-48">
                            {teamMembers?.map(member => (
                                <DropdownMenuItem key={member.id} onClick={() => setSelectedMemberId(member.id)} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={member.photoURL} />
                                        <AvatarFallback className="text-[8px]">{member.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="truncate flex-1 font-bold">{member.name} {member.id === user?.id && '(You)'}</span>
                                    {selectedMemberId === member.id && <Check className="h-3 w-3 text-primary" />}
                                </DropdownMenuItem>
                            ))}
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsSearching(!isSearching)}
                    className={cn("h-8 w-8 rounded-xl shrink-0 transition-colors", isSearching ? "text-primary bg-primary/10" : "text-slate-400 hover:text-slate-900")}
                >
                    <Search className="h-3.5 w-3.5" />
                </Button>
            </div>
            
            {isSearching && (
                <div className="px-1 py-1">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <Input 
                            autoFocus
                            placeholder="Type to filter..." 
                            value={searchQuery}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 rounded-xl bg-white border-slate-200 pr-7 text-[10px] font-bold uppercase tracking-widest pl-8 shadow-inner"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100">
                                <X className="h-3 w-3 text-slate-400" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 pb-10">
        <div className="space-y-8">
            {/* Collapsible Home Section */}
            <div className="space-y-1">
                <div className={cn(
                    "group/home flex items-center h-8 rounded-lg transition-all pr-1",
                    isWorkspaceHomeActive ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:bg-slate-50"
                )}>
                    <Link href="/workspace" className="flex-1 flex items-center gap-3 px-3 h-full min-w-0">
                        <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                            <Home className={cn("h-3.5 w-3.5", isWorkspaceHomeActive ? "text-primary" : "text-slate-400")} />
                        </div>
                        <span className="text-sm font-bold truncate pt-0.5">Home</span>
                    </Link>
                    
                    <div className="flex items-center gap-0.5 shrink-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="h-7 w-7 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-primary transition-all">
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1 shadow-2xl border-slate-100 bg-white z-[60]">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-2 tracking-[0.2em]">New Document</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => onCreatePage(null, 'Untitled Doc', 'doc')} className="gap-3 font-bold text-xs py-2.5 rounded-xl cursor-pointer">
                                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-500"><FileText className="h-4 w-4" /></div>
                                    Rich Text Document
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onCreatePage(null, 'Untitled Sheet', 'sheet')} className="gap-3 font-bold text-xs py-2.5 rounded-xl cursor-pointer">
                                    <div className="p-1.5 rounded-lg bg-green-50 text-green-600"><Grid className="h-4 w-4" /></div>
                                    Operational Sheet
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onCreatePage(null, 'Untitled Board', 'board')} className="gap-3 font-bold text-xs py-2.5 rounded-xl cursor-pointer">
                                    <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600"><Layout className="h-4 w-4" /></div>
                                    Visual Whiteboard
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <button 
                            onClick={() => setIsHomeExpanded(!isHomeExpanded)}
                            className="h-7 w-7 rounded-lg hover:bg-slate-200/50 flex items-center justify-center transition-colors text-slate-400"
                        >
                            {isHomeExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>
                
                {isHomeExpanded && (
                    <div className="pl-6 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                        <Link href="/workspace/docs">
                            <div className={cn(
                                "flex items-center h-8 gap-3 px-3 rounded-lg text-xs font-semibold transition-all",
                                pathname === '/workspace/docs' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                            )}>
                                <FileText className="h-3 w-3 text-blue-500" />
                                <span>Docs</span>
                            </div>
                        </Link>
                        <Link href="/workspace/sheets">
                            <div className={cn(
                                "flex items-center h-8 gap-3 px-3 rounded-lg text-xs font-semibold transition-all",
                                pathname === '/workspace/sheets' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                            )}>
                                <Grid className="h-3 w-3 text-green-600" />
                                <span>Sheets</span>
                            </div>
                        </Link>
                        <Link href="/workspace/boards">
                            <div className={cn(
                                "flex items-center h-8 gap-3 px-3 rounded-lg text-xs font-semibold transition-all",
                                pathname === '/workspace/boards' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                            )}>
                                <Layout className="h-3 w-3 text-purple-600" />
                                <span>Canvases</span>
                            </div>
                        </Link>
                    </div>
                )}
            </div>

            {favorites.length > 0 && !searchQuery && selectedMemberId === user?.id && (
                <div className="space-y-1">
                    <h4 className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-2">Favorites</h4>
                    <div className="space-y-0.5">
                        {favorites.map(p => (
                             <Link key={p.id} href={`/workspace/${p.id}`}>
                                <div className={cn(
                                    "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                                    activePageId === p.id ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:bg-slate-50"
                                )}>
                                    <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                                        <Star className={cn("h-3.5 w-3.5", activePageId === p.id ? "fill-primary text-primary" : "fill-amber-400 text-amber-400")} />
                                    </div>
                                    <span className="truncate">{p.title || 'Untitled'}</span>
                                </div>
                             </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <h4 className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-2">
                    {selectedMemberId === 'all' ? 'Team library' : (selectedMemberId === user?.id ? 'My Workspace' : 'Documents')}
                </h4>
                <div className="space-y-0.5">
                    {rootPages.map(page => (
                        <NavItem 
                            key={page.id} 
                            page={page} 
                            pages={pages}
                            activePageId={activePageId}
                            expandedPages={expandedPages}
                            onToggleExpand={toggleExpand}
                            onCreatePage={onCreatePage}
                            onFavorite={handleFavorite}
                            onTrash={onTrash}
                            onDuplicate={onDuplicate}
                        />
                    ))}
                    {rootPages.length === 0 && (
                        <div className="px-3 py-10 text-center border-2 border-dashed rounded-2xl border-slate-100 opacity-40">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {selectedMemberId === 'all' ? 'Empty library' : 'No records found'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto border-t bg-slate-50/50 space-y-1">
        <Link href="/workspace/recent">
            <Button variant="ghost" className={cn("w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs", pathname === '/workspace/recent' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}>
                <History className="h-4 w-4" /> Recent edits
            </Button>
        </Link>
        <Link href="/workspace/trash">
            <Button variant="ghost" className={cn("w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs", pathname === '/workspace/trash' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}>
                <Trash2 className="h-4 w-4" /> Trash bin
            </Button>
        </Link>
      </div>
    </div>
  );
}