'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
    ChevronRight, 
    ChevronDown, 
    Plus, 
    Home, 
    Trash2, 
    Star,
    Folder,
    Image as ImageIcon,
    Video,
    FileText,
    Upload,
    FolderPlus,
    HardDrive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogoBlack } from '@/components/icons';
import { getHomePath } from '@/lib/workspace-access';
import type { CloudFolder, AppUser } from '@/lib/types';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export type FilesView = 'all' | 'images' | 'videos' | 'documents' | 'favorites' | 'trash';

interface FilesSidebarProps {
  isOpen: boolean;
  view: FilesView;
  onViewChange: (view: FilesView) => void;
  folders: CloudFolder[];
  currentFolderId: string | null;
  onOpenFolder: (id: string | null) => void;
  onUpload: () => void;
  onNewFolder: () => void;
  storageLabel: string;
  storagePercent: number;
  user?: AppUser | null;
}

export function FilesSidebar({
  isOpen,
  view,
  onViewChange,
  folders,
  currentFolderId,
  onOpenFolder,
  onUpload,
  onNewFolder,
  storageLabel,
  storagePercent,
  user,
}: FilesSidebarProps) {
  const [isHomeExpanded, setIsHomeExpanded] = useState(true);

  const rootFolders = folders.filter(f => !f.isTrashed && f.parentId == null);

  return (
    <div className={cn(
      "bg-slate-50/80 border-r flex flex-col h-full shrink-0 relative",
      isOpen ? "w-72" : "w-0 overflow-hidden border-none"
    )}>
      <div className="p-6 shrink-0">
        <Link href={getHomePath(user)} className="flex items-center gap-3">
          <LogoBlack className="h-10 w-10" />
          <div className="flex flex-col">
            <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 leading-tight">Files</span>
            <span className="font-bold text-[10px] uppercase tracking-widest text-slate-400 leading-tight">Workspace</span>
          </div>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-4 pb-10">
        <div className="space-y-8">
          <div className="space-y-1">
            <div className={cn(
              "flex items-center h-8 rounded-lg pr-1",
              view === 'all' && !currentFolderId ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:bg-slate-50"
            )}>
              <button
                type="button"
                onClick={() => { onViewChange('all'); onOpenFolder(null); }}
                className="flex-1 flex items-center gap-3 px-3 h-full min-w-0 text-left"
              >
                <Home className={cn("h-3.5 w-3.5", view === 'all' && !currentFolderId ? "text-primary" : "text-slate-400")} />
                <span className="text-sm font-bold truncate">Home</span>
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-7 w-7 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-primary">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1 shadow-2xl border-slate-100 bg-white z-[60]">
                    <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-2 tracking-[0.2em]">Add</DropdownMenuLabel>
                    <DropdownMenuItem onClick={onUpload} className="gap-3 font-bold text-xs py-2.5 rounded-xl cursor-pointer">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><Upload className="h-4 w-4" /></div>
                      Upload files
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-50" />
                    <DropdownMenuItem onClick={onNewFolder} className="gap-3 font-bold text-xs py-2.5 rounded-xl cursor-pointer">
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-500"><FolderPlus className="h-4 w-4" /></div>
                      New folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  type="button"
                  onClick={() => setIsHomeExpanded(!isHomeExpanded)}
                  className="h-7 w-7 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400"
                >
                  {isHomeExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {isHomeExpanded && (
              <div className="pl-6 space-y-0.5">
                <NavRow icon={<ImageIcon className="h-3.5 w-3.5 text-purple-500" />} label="Images" active={view === 'images'} onClick={() => onViewChange('images')} />
                <NavRow icon={<Video className="h-3.5 w-3.5 text-red-500" />} label="Videos" active={view === 'videos'} onClick={() => onViewChange('videos')} />
                <NavRow icon={<FileText className="h-3.5 w-3.5 text-orange-500" />} label="Documents" active={view === 'documents'} onClick={() => onViewChange('documents')} />
                {rootFolders.map(folder => (
                  <NavRow
                    key={folder.id}
                    icon={<Folder className="h-3.5 w-3.5 text-blue-500 fill-current" />}
                    label={folder.name}
                    active={currentFolderId === folder.id && view === 'all'}
                    onClick={() => { onViewChange('all'); onOpenFolder(folder.id); }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto border-t bg-slate-50/50 space-y-3">
        <Button
          variant="ghost"
          onClick={() => onViewChange('favorites')}
          className={cn("w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs", view === 'favorites' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}
        >
          <Star className="h-4 w-4" /> Starred
        </Button>
        <Button
          variant="ghost"
          onClick={() => onViewChange('trash')}
          className={cn("w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs", view === 'trash' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}
        >
          <Trash2 className="h-4 w-4" /> Trash
        </Button>
        <div className="px-3 pt-2 space-y-2">
          <div className="flex items-center gap-2 text-slate-400">
            <HardDrive className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{storageLabel}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, storagePercent)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function NavRow({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center h-8 gap-3 px-3 rounded-lg text-xs font-semibold text-left",
        active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
