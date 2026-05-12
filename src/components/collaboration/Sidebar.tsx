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
    Search, 
    Star, 
    Trash2, 
    Settings,
    MoreHorizontal,
    LayoutGrid,
    PanelLeftClose,
    History,
    FilePlus,
    X,
    Share2,
    Sparkles,
    Zap,
    Info,
    ShieldAlert
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
import { Input } from '@/components/ui/input';
import { LogoBlack } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  pages: CollabPage[];
  activePageId: string | null;
  onCreatePage: (parentId: string | null) => void;
  user: AppUser | null;
}

export function Sidebar({ isOpen, onToggle, pages, activePageId, onCreatePage, user }: SidebarProps) {
  const pathname = usePathname();
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [pageToTrash, setPageToTrash] = useState<string | null>(null);
  const [isAiUsageOpen, setIsAiUsageOpen] = useState(false);

  const toggleExpand = (e: React.MouseEvent, pageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedPages(prev => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const filteredPages = useMemo(() => {
      if (!searchQuery) return pages;
      return pages.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [pages, searchQuery]);

  const favorites = pages.filter(p => p.isFavorite);
  const rootPages = filteredPages.filter(p => !p.parentId);

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
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                    {page.icon ? (
                        <span className="text-xs leading-none select-none">{page.icon}</span>
                    ) : (
                        <FileText className={cn("h-4 w-4", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                    )}
                </div>
                <span className="text-sm font-semibold truncate leading-none pt-0.5">{page.title || 'Untitled'}</span>
            </div>

            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCreatePage(page.id); }}
                    className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                    title="Add subpage"
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
                <button 
                    onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        window.dispatchEvent(new CustomEvent('request-favorite-collab-page', { detail: { pageId: page.id, isFavorite: !page.isFavorite } }));
                    }}
                    className={cn(
                        "h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center transition-colors",
                        page.isFavorite ? "text-amber-500" : "text-slate-400 hover:text-amber-500"
                    )}
                    title={page.isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                    <Star className={cn("h-3.5 w-3.5", page.isFavorite && "fill-current")} />
                </button>
                <button 
                    onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        window.dispatchEvent(new CustomEvent('request-share-collab-page', { detail: { pageId: page.id } }));
                    }}
                    className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                    title="Share document"
                >
                    <Share2 className="h-3.5 w-3.5" />
                </button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center">
                            <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 rounded-xl p-1 shadow-2xl border-slate-100">
                        <DropdownMenuItem onClick={(e) => { e.preventDefault(); onCreatePage(page.id); }} className="gap-2 text-xs font-semibold rounded-lg cursor-pointer">
                            <Plus className="h-3.5 w-3.5" /> Add subpage
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.preventDefault(); setPageToTrash(page.id); }} className="gap-2 text-xs font-semibold text-red-600 rounded-lg cursor-pointer">
                            <Trash2 className="h-3.5 w-3.5" /> Move to trash
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
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
      "bg-slate-50/80 border-r transition-all duration-300 flex flex-col h-full group/sidebar shrink-0 relative",
      isOpen ? "w-72" : "w-0 overflow-hidden border-none"
    )}>
      {/* Sidebar Header */}
      <div className="p-6 shrink-0 space-y-6">
        <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
                <LogoBlack className="h-10 w-10" />
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
            <div className="relative group/search">
                <Button 
                    variant="outline" 
                    onClick={() => setIsSearching(true)}
                    className="w-full justify-start h-10 rounded-xl border-slate-200 bg-white shadow-sm gap-3 font-bold text-xs"
                >
                    <Search className="h-4 w-4 text-slate-400" />
                    {isSearching ? '' : 'Quick find'}
                </Button>
                {isSearching && (
                    <div className="absolute inset-0 z-50">
                        <Input 
                            autoFocus
                            placeholder="Type to filter..." 
                            value={searchQuery}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onBlur={() => !searchQuery && setIsSearching(false)}
                            className="h-10 rounded-xl bg-white shadow-lg border-primary pr-8"
                        />
                        <button 
                            onClick={() => { setSearchTerm(''); setIsSearching(false); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100"
                        >
                            <X className="h-3 w-3 text-slate-400" />
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Pages Navigation */}
      <ScrollArea className="flex-1 px-4 pb-10">
        <div className="space-y-8">
            {favorites.length > 0 && !searchQuery && (
                <div className="space-y-1">
                    <h4 className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-2">Favorites</h4>
                    <div className="space-y-0.5">
                        {favorites.map(p => (
                             <Link key={p.id} href={`/workspace/${p.id}`}>
                                <div className={cn(
                                    "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                                    activePageId === p.id ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                                )}>
                                    <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                                        {p.icon ? (
                                            <span className="text-[10px] leading-none">{p.icon}</span>
                                        ) : (
                                            <Star className="h-3.5 w-3.5 text-amber-500 fill-current" />
                                        )}
                                    </div>
                                    <span className="truncate">{p.title || 'Untitled'}</span>
                                </div>
                             </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <h4 className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-2">Workspace</h4>
                <div className="space-y-0.5">
                    {rootPages.map(page => <NavItem key={page.id} page={page} />)}
                    {rootPages.length === 0 && !searchQuery && (
                        <div className="px-3 py-10 text-center border-2 border-dashed rounded-2xl border-slate-100 opacity-40">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Empty workspace</p>
                        </div>
                    )}
                </div>
                <Button 
                    variant="ghost" 
                    onClick={() => onCreatePage(null)}
                    className="w-full justify-start h-9 rounded-lg gap-2 text-xs font-bold text-slate-400 hover:text-primary hover:bg-primary/5 mt-2"
                >
                    <Plus className="h-3.5 w-3.5" />
                    New page
                </Button>
            </div>

            {/* Management Section at bottom */}
            <div className="space-y-1 pt-4">
                <h4 className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-2">Management</h4>
                <Link href="/workspace/recent">
                    <Button variant="ghost" className={cn("w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs", pathname === '/workspace/recent' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900')}>
                        <History className="h-4 w-4" /> Recently edited
                    </Button>
                </Link>
                <Link href="/workspace/trash">
                    <Button variant="ghost" className={cn("w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs", pathname === '/workspace/trash' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900')}>
                        <Trash2 className="h-4 w-4" /> Trash bin
                    </Button>
                </Link>
            </div>
        </div>
      </ScrollArea>

      {/* Sidebar Footer - AI Usage */}
      <div className="p-4 mt-auto border-t bg-slate-50/50">
        <button 
            onClick={() => setIsAiUsageOpen(true)}
            className="w-full p-4 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm flex items-center gap-4 hover:border-primary/20 hover:shadow-md transition-all group text-left"
        >
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Capacity</p>
                    <span className="text-[9px] font-black text-primary">34%</span>
                </div>
                <Progress value={34} className="h-1 bg-slate-100" />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1.5 leading-none">
                    34 / 100 Monthly Credits
                </p>
            </div>
        </button>
      </div>

      <Dialog open={isAiUsageOpen} onOpenChange={setIsAiUsageOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-3xl">
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Sparkles className="h-24 w-24" />
                </div>
                <DialogHeader className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                            <Zap className="h-6 w-6 text-primary-light" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight uppercase">AI Engine Status</DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Enterprise Computational Resources
                    </DialogDescription>
                </DialogHeader>
            </div>

            <div className="p-8 space-y-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Usage quota</Label>
                            <Badge variant="outline" className="bg-blue-50 text-primary border-blue-100 font-black text-[10px] uppercase">Active</Badge>
                        </div>
                        <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4 shadow-inner">
                            <div className="flex items-baseline justify-between">
                                <p className="text-4xl font-black text-slate-900 tabular-nums">34 <span className="text-lg text-slate-400">/ 100</span></p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Credits Used</p>
                            </div>
                            <Progress value={34} className="h-2 bg-white" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">System Limitations</h4>
                        <div className="grid gap-3">
                            <div className="flex items-start gap-4 group">
                                <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-primary transition-colors">
                                    <History className="h-4 w-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-slate-900">Monthly Reset</p>
                                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed">Computational tokens reset on the 1st of every month at 00:00 UTC.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 group">
                                <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-primary transition-colors">
                                    <ShieldAlert className="h-4 w-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-slate-900">Safe Output Filter</p>
                                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed">AI drafting is strictly audited for corporate compliance and professional safety standards.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 group">
                                <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-primary transition-colors">
                                    <LayoutGrid className="h-4 w-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-slate-900">Batch Processing</p>
                                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed">Complex drafting requests may consume multiple credits based on the generated block count.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3 animate-pulse">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold uppercase tracking-tight text-amber-800/80 leading-relaxed">
                        Notice: You are currently on the base enterprise tier. Higher throughput tiers are available via the RiverPH sales portal.
                    </p>
                </div>
            </div>

            <DialogFooter className="p-8 pt-0 flex justify-center border-t border-slate-50 bg-slate-50/30">
                <DialogClose asChild>
                    <Button variant="ghost" className="rounded-xl h-12 px-10 font-bold uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-900">
                        Dismiss Detail
                    </Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pageToTrash} onOpenChange={() => setPageToTrash(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-3xl p-10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-900">Move to trash?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-bold leading-relaxed pt-2">
              This document will be removed from your workspace but can be restored from the trash folder within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-xl h-11 px-8 font-bold text-xs uppercase tracking-widest">Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={() => {
                    if (pageToTrash) {
                        window.dispatchEvent(new CustomEvent('request-delete-collab-page', { detail: { pageId: pageToTrash } }));
                        setPageToTrash(null);
                    }
                }}
                className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-11 px-10 font-bold text-xs uppercase tracking-widest"
            >
                Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
