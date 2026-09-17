'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Folder,
    Layout,
    MoreVertical,
    Globe,
    Star,
    StarOff,
    Pencil,
    Trash2,
    FolderInput,
    FolderOpen,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CollabPage } from '@/lib/types';
import { canMoveToFolder, folderChildren, moveDestinations } from '@/lib/collab-folders';

function movePage(pageId: string, targetParentId: string | null) {
    window.dispatchEvent(new CustomEvent('request-move-collab-page', {
        detail: { pageId, targetParentId },
    }));
}

export function HubAssetCard({
    page,
    pages,
    viewMode,
    accent = 'blue',
    untitledLabel = 'Untitled',
    rootLabel = 'Home',
    onOpenFolder,
}: {
    page: CollabPage;
    pages: CollabPage[];
    viewMode: 'grid' | 'list';
    accent?: 'blue' | 'purple';
    untitledLabel?: string;
    rootLabel?: string;
    onOpenFolder: (id: string) => void;
}) {
    const router = useRouter();
    const [isOver, setIsOver] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [renameValue, setRenameValue] = useState(page.title || '');
    const [peekOpen, setPeekOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const showTimer = useRef<number | null>(null);
    const hideTimer = useRef<number | null>(null);

    const isFolder = page.type === 'folder';
    const accentClass = accent === 'purple' ? 'text-purple-500' : 'text-blue-500';
    const children = useMemo(() => (isFolder ? folderChildren(pages, page.id) : []), [isFolder, pages, page.id]);
    const destinations = useMemo(() => moveDestinations(pages, page), [pages, page]);
    const atRoot = !page.parentId;

    const clearTimers = () => {
        if (showTimer.current) window.clearTimeout(showTimer.current);
        if (hideTimer.current) window.clearTimeout(hideTimer.current);
        showTimer.current = null;
        hideTimer.current = null;
    };

    useEffect(() => () => clearTimers(), []);

    const schedulePeek = () => {
        if (!isFolder) return;
        if (hideTimer.current) window.clearTimeout(hideTimer.current);
        showTimer.current = window.setTimeout(() => setPeekOpen(true), 260);
    };

    const scheduleHidePeek = () => {
        if (showTimer.current) window.clearTimeout(showTimer.current);
        hideTimer.current = window.setTimeout(() => setPeekOpen(false), 160);
    };

    const handleDragStart = (e: React.DragEvent) => {
        setPeekOpen(false);
        e.dataTransfer.setData('pageId', page.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        if (!isFolder) return;
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
        const sourceId = e.dataTransfer.getData('pageId');
        if (sourceId && canMoveToFolder(pages, sourceId, page.id)) {
            movePage(sourceId, page.id);
        }
    };

    const typeIcon = page.icon ? (
        <span className="text-base leading-none">{page.icon}</span>
    ) : isFolder ? (
        <Folder className={cn('h-4 w-4', accentClass)} />
    ) : accent === 'purple' ? (
        <Layout className={cn('h-4 w-4', accentClass)} />
    ) : (
        <FileText className={cn('h-4 w-4', accentClass)} />
    );

    const actionsMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="h-8 w-7 rounded-lg text-slate-300 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center shrink-0"
                    aria-label="Actions"
                >
                    <MoreVertical className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1" onClick={(e) => e.stopPropagation()}>
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
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 font-semibold text-xs rounded-lg cursor-pointer">
                        <FolderInput className="h-4 w-4" /> Move to
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56 rounded-xl p-1 max-h-72 overflow-y-auto">
                        <DropdownMenuItem
                            disabled={atRoot}
                            onClick={(e) => {
                                e.preventDefault();
                                if (!atRoot) movePage(page.id, null);
                            }}
                            className="gap-2 font-semibold text-xs rounded-lg cursor-pointer"
                        >
                            <FolderOpen className="h-4 w-4" /> {rootLabel}
                        </DropdownMenuItem>
                        {destinations.length > 0 && <DropdownMenuSeparator />}
                        {destinations.map((folder) => (
                            <DropdownMenuItem
                                key={folder.id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    movePage(page.id, folder.id);
                                }}
                                className="gap-2 font-semibold text-xs rounded-lg cursor-pointer"
                            >
                                <Folder className="h-4 w-4 text-slate-400" />
                                <span className="truncate">{folder.title || 'Untitled folder'}</span>
                            </DropdownMenuItem>
                        ))}
                        {atRoot && destinations.length === 0 && (
                            <div className="px-2 py-2 text-[11px] text-slate-400">No other folders</div>
                        )}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
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
            draggable={!page.isTrashed}
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
                            accentClass,
                            page.coverImage && "bg-white/90 backdrop-blur-md border-white/50"
                        )}>
                            {isFolder ? <Folder className="h-8 w-8 fill-current" /> : accent === 'purple' ? <Layout className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                        </div>
                    )}
                </div>
            </div>
            <CardContent className="p-4">
                <div className="flex items-center gap-2">
                    <h3 className="flex-1 min-w-0 text-sm font-bold text-slate-900 truncate tracking-tight">
                        {page.title || untitledLabel}
                    </h3>
                    {actionsMenu}
                </div>
            </CardContent>
        </Card>
    ) : (
        <Card
            draggable={!page.isTrashed}
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
                        {page.title || untitledLabel}
                    </h3>
                    {actionsMenu}
                </div>
            </CardContent>
        </Card>
    );

    const peek = peekOpen && isFolder ? (
        <FolderPeekPanel
            anchorRef={wrapRef}
            items={children}
            onStay={schedulePeek}
            onLeave={scheduleHidePeek}
            onOpenFolder={() => {
                setPeekOpen(false);
                onOpenFolder(page.id);
            }}
            onOpenItem={(item) => {
                setPeekOpen(false);
                if (item.type === 'folder') onOpenFolder(item.id);
                else router.push(`/workspace/${item.id}`);
            }}
        />
    ) : null;

    const inner = isFolder ? (
        <button type="button" onClick={() => onOpenFolder(page.id)} className="group block text-left outline-none w-full">
            {cardContent}
        </button>
    ) : (
        <Link href={`/workspace/${page.id}`} className="group block">
            {cardContent}
        </Link>
    );

    return (
        <>
            <div
                ref={wrapRef}
                className="relative"
                onMouseEnter={schedulePeek}
                onMouseLeave={scheduleHidePeek}
            >
                {inner}
            </div>
            {peek}
            <RenameDialog
                open={renameOpen}
                onOpenChange={setRenameOpen}
                value={renameValue}
                onChange={setRenameValue}
                onSave={() => {
                    window.dispatchEvent(new CustomEvent('request-rename-collab-page', { detail: { pageId: page.id, title: renameValue } }));
                    setRenameOpen(false);
                }}
            />
        </>
    );
}

function FolderPeekPanel({
    anchorRef,
    items,
    onStay,
    onLeave,
    onOpenFolder,
    onOpenItem,
}: {
    anchorRef: React.RefObject<HTMLDivElement | null>;
    items: CollabPage[];
    onStay: () => void;
    onLeave: () => void;
    onOpenFolder: () => void;
    onOpenItem: (item: CollabPage) => void;
}) {
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => {
        const el = anchorRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const width = Math.max(240, Math.min(320, rect.width));
        let top = rect.bottom + 6;
        const estimated = Math.min(320, 48 + items.length * 36);
        if (top + estimated > window.innerHeight - 12) {
            top = Math.max(12, rect.top - estimated - 6);
        }
        let left = rect.left;
        if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
        setPos({ top, left, width });
    }, [anchorRef, items.length]);

    if (!pos || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed z-[80] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            onMouseEnter={onStay}
            onMouseLeave={onLeave}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-medium text-slate-500">
                {items.length === 0 ? 'Empty folder' : `${items.length} inside`}
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
                {items.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-slate-400">Nothing in this folder yet.</p>
                ) : items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenItem(item)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
                    >
                        {item.type === 'folder' ? (
                            <Folder className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        ) : item.type === 'board' ? (
                            <Layout className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                        ) : (
                            <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        )}
                        <span className="truncate text-[13px] text-slate-800">{item.title || 'Untitled'}</span>
                    </button>
                ))}
            </div>
            <button
                type="button"
                onClick={onOpenFolder}
                className="w-full px-3 py-2 border-t border-slate-100 text-[12px] font-medium text-slate-600 hover:bg-slate-50 text-left"
            >
                Open folder
            </button>
        </div>,
        document.body
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
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(); }}
            className="mt-2 h-11 rounded-xl"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
