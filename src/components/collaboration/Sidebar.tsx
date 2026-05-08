
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
    ChevronRight, 
    ChevronDown, 
    Plus, 
    FileText, 
    Home, 
    Search, 
    Clock, 
    Star, 
    Trash2, 
    Settings,
    MoreHorizontal,
    LayoutGrid,
    Layout,
    PanelLeftClose,
    PanelLeftOpen,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { CollabPage, AppUser } from '@/lib/types';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { LogoBlack } from '@/components/icons';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  pages: CollabPage[];
  activePageId: string | null;
  onCreatePage: (parentId: string | null) => void;
  user: AppUser | null;
}

export function Sidebar({ isOpen, onToggle, pages, activePageId, onCreatePage, user }: SidebarProps) {
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});

  const toggleExpand = (e: React.MouseEvent, pageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedPages(prev => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const rootPages = pages.filter(p => !p.parentId);

  const NavItem = ({ page, level = 0 }: { page: CollabPage, level?: number }) => {
    const isExpanded = expandedPages[page.id];
    const isActive = activePageId === page.id;
    const children = pages.filter(p => p.parentId === page.id);
    const hasChildren = children.length > 0;

    return (
      <div className="space-y-0.5">
        <Link href={`/workspace/${page.id}`}>
          <div className={cn(
            "group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer relative",
            isActive ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )} style={{ paddingLeft: `${(level * 16) + 12}px` }}>
            
            <button 
                onClick={(e) => toggleExpand(e, page.id)}
                className={cn(
                    "h-5 w-5 rounded hover:bg-slate-200 flex items-center justify-center transition-colors",
                    !hasChildren && "opacity-0 pointer-events-none"
                )}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>

            <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                <span className="text-sm font-semibold truncate leading-none pt-0.5">{page.title || 'Untitled'}</span>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 rounded-xl">
                    <DropdownMenuItem onClick={() => onCreatePage(page.id)} className="gap-2 text-xs font-bold uppercase">
                        <Plus className="h-3.5 w-3.5" /> Add Subpage
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-xs font-bold uppercase text-red-600">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Link>
        {isExpanded && hasChildren && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            {children.map(child => <NavItem key={child.id} page={child} level={level + 1} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "bg-slate-50/80 border-r transition-all duration-300 flex flex-col h-full group/sidebar shrink-0",
      isOpen ? "w-72" : "w-0 overflow-hidden border-none"
    )}>
      {/* Sidebar Header */}
      <div className="p-6 shrink-0 space-y-6">
        <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
                <LogoBlack className="h-10 w-10" />
                <div className="flex flex-col">
                    <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 leading-tight">Collab</span>
                    <span className="font-bold text-[10px] uppercase tracking-widest text-slate-400 leading-tight">Intelligence</span>
                </div>
            </Link>
            <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-lg">
                <PanelLeftClose className="h-4 w-4" />
            </Button>
        </div>

        <div className="space-y-1">
            <Button variant="outline" className="w-full justify-start h-10 rounded-xl border-slate-200 bg-white shadow-sm gap-3 font-bold text-xs">
                <Search className="h-4 w-4 text-slate-400" />
                Quick Find
            </Button>
            <Button variant="ghost" className="w-full justify-start h-10 rounded-xl gap-3 font-bold text-xs text-slate-600">
                <Settings className="h-4 w-4" />
                Settings
            </Button>
        </div>
      </div>

      {/* Pages Navigation */}
      <ScrollArea className="flex-1 px-4 pb-10">
        <div className="space-y-6">
            <div className="space-y-1">
                <h4 className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-2">Company Workspace</h4>
                <div className="space-y-0.5">
                    {rootPages.map(page => <NavItem key={page.id} page={page} />)}
                    {rootPages.length === 0 && (
                        <div className="px-3 py-4 text-center border-2 border-dashed rounded-xl border-slate-100 opacity-40">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Empty Workspace</p>
                        </div>
                    )}
                </div>
                <Button 
                    variant="ghost" 
                    onClick={() => onCreatePage(null)}
                    className="w-full justify-start h-9 rounded-lg gap-2 text-xs font-bold text-slate-400 hover:text-primary hover:bg-primary/5 mt-2"
                >
                    <Plus className="h-3.5 w-3.5" />
                    New Page
                </Button>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-1">
                <h4 className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-2">Internal Hub</h4>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs text-slate-500">
                    <Star className="h-4 w-4" /> Favorites
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs text-slate-500">
                    <History className="h-4 w-4" /> Recent
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs text-slate-500">
                    <Trash2 className="h-4 w-4" /> Trash
                </Button>
            </div>
        </div>
      </ScrollArea>

      {/* Sidebar Footer */}
      <div className="p-4 mt-auto border-t bg-slate-50/50">
        <div className="p-4 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-primary font-bold text-sm">
                {user?.businessName?.charAt(0) || 'W'}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate uppercase tracking-tighter">{user?.businessName}</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mt-1">Enterprise Workspace</p>
            </div>
        </div>
      </div>
    </div>
  );
}
