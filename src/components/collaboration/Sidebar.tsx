'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    ChevronRight, 
    ChevronDown, 
    Plus, 
    FileText, 
    Home, 
    Trash2, 
    Layout,
    TrendingUp,
    Clock,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CollabPage, AppUser, CollabPageType } from '@/lib/types';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { LogoBlack } from '@/components/icons';
import { getHomePath } from '@/lib/workspace-access';
import { useMemoFirebase, useFirestore, useDoc } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  pages: CollabPage[];
  activePageId: string | null;
  onCreatePage: (parentId: string | null, title: string, type: CollabPageType) => void;
  user: AppUser | null;
}

export function Sidebar({ isOpen, pages, activePageId, onCreatePage, user }: SidebarProps) {
  const pathname = usePathname();
  const [isHomeExpanded, setIsHomeExpanded] = useState(true);
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);

  const trendingPages = useMemo(() => {
    return [...pages]
      .filter(p => !p.isTrashed && p.updatedAt)
      .sort((a, b) => {
        const dateA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
        const timeA = dateA || 0;
        const dateB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
        const timeB = dateB || 0;
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [pages]);

  const isWorkspaceHomeActive = pathname === '/workspace';

  return (
    <div className={cn(
      "bg-slate-50/80 border-r flex flex-col h-full shrink-0 relative",
      isOpen ? "w-72" : "w-0 overflow-hidden border-none"
    )}>
      <div className="p-6 shrink-0 space-y-6">
        <div className="flex items-center justify-between">
            <Link href={getHomePath(user)} className="flex items-center gap-3">
                <LogoBlack className="h-10 w-10" />
                <div className="flex flex-col">
                    <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 leading-tight">Collab</span>
                    <span className="font-bold text-[10px] uppercase tracking-widest text-slate-400 leading-tight">Workspace</span>
                </div>
            </Link>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 pb-10">
        <div className="space-y-10">
            <div className="space-y-1">
                <div className={cn(
                    "flex items-center h-8 rounded-lg pr-1",
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
                                <button className="h-7 w-7 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1 shadow-2xl border-slate-100 bg-white z-[60]">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-2 tracking-[0.2em]">New</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => onCreatePage(null, 'Untitled Doc', 'doc')} className="gap-3 font-bold text-xs py-2.5 rounded-xl cursor-pointer">
                                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-500"><FileText className="h-4 w-4" /></div>
                                    Rich Text Document
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onCreatePage(null, 'Untitled Board', 'board')} className="gap-3 font-bold text-xs py-2.5 rounded-xl cursor-pointer">
                                    <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600"><Layout className="h-4 w-4" /></div>
                                    Visual Whiteboard
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <button 
                            onClick={() => setIsHomeExpanded(!isHomeExpanded)}
                            className="h-7 w-7 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400"
                        >
                            {isHomeExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>
                
                {isHomeExpanded && (
                    <div className="pl-6 space-y-0.5">
                        <Link href="/workspace/docs">
                            <div className={cn(
                                "flex items-center h-8 gap-3 px-3 rounded-lg text-xs font-semibold",
                                pathname === '/workspace/docs' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                            )}>
                                <FileText className="h-3.5 w-3.5 text-blue-500" />
                                <span>Documents</span>
                            </div>
                        </Link>
                        <Link href="/workspace/boards">
                            <div className={cn(
                                "flex items-center h-8 gap-3 px-3 rounded-lg text-xs font-semibold",
                                pathname === '/workspace/boards' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                            )}>
                                <Layout className="h-3.5 w-3.5 text-purple-600" />
                                <span>Canvases</span>
                            </div>
                        </Link>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <button 
                    onClick={() => setIsActivityExpanded(!isActivityExpanded)}
                    className="w-full px-3 flex items-center justify-between group outline-none"
                >
                    <div className="flex items-center gap-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 group-hover:text-slate-600 transition-colors">Active now</h4>
                        <TrendingUp className="h-3 w-3 text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="h-6 w-6 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-300">
                        {isActivityExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </div>
                </button>
                
                {isActivityExpanded && (
                    <div className="space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-300">
                        {trendingPages.length > 0 ? trendingPages.map(page => (
                            <TrendingItem 
                                key={page.id} 
                                page={page} 
                                isActive={activePageId === page.id} 
                            />
                        )) : (
                            <div className="px-3 py-10 text-center border-2 border-dashed rounded-2xl border-slate-100 opacity-40 grayscale">
                                <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-relaxed max-w-[120px] mx-auto">
                                    No recent pages
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto border-t bg-slate-50/50 space-y-1">
        <Link href="/workspace/recent">
            <Button variant="ghost" className={cn("w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs transition-none", pathname === '/workspace/recent' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}>
                <History className="h-4 w-4" /> Recent edits
            </Button>
        </Link>
        <Link href="/workspace/trash">
            <Button variant="ghost" className={cn("w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs transition-none", pathname === '/workspace/trash' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}>
                <Trash2 className="h-4 w-4" /> Trash
            </Button>
        </Link>
      </div>
    </div>
  );
}

function TrendingItem({ page, isActive }: { page: CollabPage, isActive: boolean }) {
    const firestore = useFirestore();
    const creatorQuery = useMemoFirebase(() => (firestore && page.createdBy) ? doc(firestore, 'users', page.createdBy) : null, [firestore, page.createdBy]);
    const { data: creator } = useDoc<AppUser>(creatorQuery);

    const getIcon = () => {
        if (page.icon) return <span className="text-sm leading-none">{page.icon}</span>;
        switch (page.type) {
            case 'board': return <Layout className="h-3.5 w-3.5 text-purple-600" />;
            default: return <FileText className="h-3.5 w-3.5 text-blue-500" />;
        }
    };

    return (
        <Link href={`/workspace/${page.id}`}>
            <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl",
                isActive ? "bg-white shadow-sm ring-1 ring-slate-100" : "hover:bg-white hover:shadow-sm transition-none"
            )}>
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={cn(
                        "text-[13px] font-bold truncate leading-none",
                        isActive ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"
                    )}>
                        {page.title || 'Untitled'}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Avatar className="h-4 w-4 border border-white shadow-sm ring-1 ring-slate-100">
                        <AvatarImage src={creator?.photoURL} />
                        <AvatarFallback className="text-[6px] font-bold bg-slate-100 text-slate-400">{creator?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </Link>
    );
}