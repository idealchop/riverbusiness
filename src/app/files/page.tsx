
'use client';

import React, { useState, useMemo } from 'react';
import { 
  FolderPlus, 
  Upload, 
  Search, 
  File, 
  Folder, 
  MoreVertical, 
  Star, 
  Trash2, 
  Clock, 
  LayoutGrid, 
  List as ListIcon,
  ChevronRight,
  HardDrive,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  ArrowLeft,
  Filter,
  Plus,
  Share2,
  Download,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  User as UserIcon,
  Recent,
  Globe,
  Settings,
  MoreHorizontal,
  StarOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useUser, useFirestore, useCollection, useMemoFirebase, useStorage, useAuth } from '@/firebase';
import { collection, query, where, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CloudFile, CloudFolder, AppUser } from '@/lib/types';
import { FullScreenLoader } from '@/components/ui/loader';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { useToast } from '@/hooks/use-toast';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const STORAGE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

export default function RiverFilesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const { toast } = useToast();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'trash'>('all');

  // Multi-tenant isolation
  const companyId = user?.companyId || 'unassigned';

  // --- Data Queries ---
  const foldersQuery = useMemoFirebase(
    () => (firestore) ? query(
        collection(firestore, 'cloud_folders'),
        where('companyId', '==', companyId),
        where('isTrashed', '==', activeTab === 'trash')
    ) : null,
    [firestore, companyId, activeTab]
  );
  const { data: allFolders, isLoading: loadingFolders } = useCollection<CloudFolder>(foldersQuery);

  const filesQuery = useMemoFirebase(
    () => (firestore) ? query(
        collection(firestore, 'cloud_files'),
        where('companyId', '==', companyId),
        where('isTrashed', '==', activeTab === 'trash')
    ) : null,
    [firestore, companyId, activeTab]
  );
  const { data: allFiles, isLoading: loadingFiles } = useCollection<CloudFile>(filesQuery);

  // --- Computed Views ---
  const currentFolders = useMemo(() => {
    if (!allFolders) return [];
    let list = allFolders;
    if (activeTab === 'all') {
        list = list.filter(f => f.parentId === currentFolderId);
    } else if (activeTab === 'favorites') {
        list = list.filter(f => f.isFavorite);
    }
    if (searchTerm) {
        list = list.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [allFolders, currentFolderId, searchTerm, activeTab]);

  const currentFiles = useMemo(() => {
    if (!allFiles) return [];
    let list = allFiles;
    if (activeTab === 'all') {
        list = list.filter(f => f.folderId === currentFolderId);
    } else if (activeTab === 'favorites') {
        list = list.filter(f => f.isFavorite);
    }
    if (searchTerm) {
        list = list.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [allFiles, currentFolderId, searchTerm, activeTab]);

  const currentFolderPath = useMemo(() => {
    if (!currentFolderId || !allFolders) return [];
    const path = [];
    let current = allFolders.find(f => f.id === currentFolderId);
    while (current) {
        path.unshift(current);
        const parentId = current.parentId;
        current = allFolders.find(f => f.id === parentId);
    }
    return path;
  }, [currentFolderId, allFolders]);

  const companyUsedStorage = useMemo(() => {
    if (!allFiles) return 0;
    return allFiles.filter(f => !f.isTrashed).reduce((acc, f) => acc + f.size, 0);
  }, [allFiles]);

  const storagePercentage = (companyUsedStorage / STORAGE_QUOTA_BYTES) * 100;

  // --- Handlers ---
  const handleCreateFolder = async () => {
    if (!firestore || !user || !newFolderName.trim()) return;
    try {
        await addDoc(collection(firestore, 'cloud_folders'), {
            name: newFolderName.trim(),
            parentId: currentFolderId,
            ownerId: user.id,
            ownerName: user.name,
            ownerPhoto: user.photoURL || '',
            companyId: companyId,
            isFavorite: false,
            isTrashed: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        toast({ title: 'Directory updated' });
        setIsNewFolderOpen(false);
        setNewFolderName('');
    } catch (e) {
        toast({ variant: 'destructive', title: 'Action blocked', description: 'Permission error.' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore || !storage || !auth || !user) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'destructive', title: 'Size limit exceeded', description: 'Max 500MB per file.' });
        return;
    }

    if (companyUsedStorage + file.size > STORAGE_QUOTA_BYTES) {
        toast({ variant: 'destructive', title: 'Shared quota full', description: '2GB organizational limit reached.' });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
        const path = `cloud_storage/${companyId}/${Date.now()}-${file.name}`;
        const url = await uploadFileWithProgress(storage, auth, path, file, {}, setUploadProgress);

        await addDoc(collection(firestore, 'cloud_files'), {
            name: file.name,
            type: file.type,
            size: file.size,
            url,
            folderId: currentFolderId,
            ownerId: user.id,
            ownerName: user.name,
            ownerPhoto: user.photoURL || '',
            companyId: companyId,
            isFavorite: false,
            isTrashed: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        toast({ title: 'Asset synchronized' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Synchronization failed' });
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
    }
  };

  const toggleFavorite = async (item: CloudFile | CloudFolder, collectionName: string) => {
    if (!firestore) return;
    try {
        await updateDoc(doc(firestore, collectionName, item.id), {
            isFavorite: !item.isFavorite,
            updatedAt: serverTimestamp()
        });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Update failed' });
    }
  };

  const moveToTrash = async (item: CloudFile | CloudFolder, collectionName: string) => {
    if (!firestore) return;
    try {
        await updateDoc(doc(firestore, collectionName, item.id), {
            isTrashed: true,
            trashedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        toast({ title: 'Moved to shared trash' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Action failed' });
    }
  };

  const restoreFromTrash = async (item: CloudFile | CloudFolder, collectionName: string) => {
    if (!firestore) return;
    try {
        await updateDoc(doc(firestore, collectionName, item.id), {
            isTrashed: false,
            trashedAt: null,
            updatedAt: serverTimestamp()
        });
        toast({ title: 'Item restored to hub' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Action failed' });
    }
  };

  const permanentDelete = async (item: CloudFile | CloudFolder, collectionName: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, collectionName, item.id));
        toast({ title: 'Permanently purged' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Action blocked' });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-purple-500" />;
    if (type.startsWith('video/')) return <Video className="h-5 w-5 text-red-500" />;
    if (type.startsWith('audio/')) return <Music className="h-5 w-5 text-pink-500" />;
    if (type === 'application/pdf') return <FileText className="h-5 w-5 text-orange-500" />;
    if (type.includes('zip') || type.includes('archive')) return <Archive className="h-5 w-5 text-amber-500" />;
    return <File className="h-5 w-5 text-slate-400" />;
  };

  if (isUserLoading) return <FullScreenLoader text="Opening Hub" />;

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      {/* 1. Minimal Side Navigation */}
      <aside className="w-72 border-r bg-slate-50/50 flex flex-col shrink-0">
          <div className="p-8">
              <div className="flex items-center gap-3 mb-10">
                  <div className="p-2 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
                    <HardDrive className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    River <span className="text-blue-600">Files</span>
                  </h1>
              </div>
              
              <nav className="space-y-1">
                  <SidebarItem 
                      active={activeTab === 'all'} 
                      onClick={() => { setActiveTab('all'); setCurrentFolderId(null); }} 
                      icon={<Globe className="h-4 w-4" />} 
                      label="Company Hub" 
                  />
                  <SidebarItem 
                      active={activeTab === 'favorites'} 
                      onClick={() => setActiveTab('favorites')} 
                      icon={<Star className="h-4 w-4" />} 
                      label="Pinned Assets" 
                  />
                  <SidebarItem 
                      active={activeTab === 'trash'} 
                      onClick={() => setActiveTab('trash')} 
                      icon={<Trash2 className="h-4 w-4" />} 
                      label="Trash Bin" 
                  />
              </nav>
          </div>

          <div className="mt-auto p-8 space-y-6">
              <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <span>Shared Quota</span>
                      <span className={cn(storagePercentage > 90 ? "text-red-500" : "text-slate-900")}>{Math.round(storagePercentage)}%</span>
                  </div>
                  <Progress value={storagePercentage} className={cn("h-1 bg-slate-100", storagePercentage > 90 && "[&>div]:bg-red-500")} />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      {formatSize(companyUsedStorage)} of 2GB shared
                  </p>
              </div>

              <div className="px-1 flex items-center gap-4">
                  <Avatar className="h-10 w-10 rounded-2xl ring-2 ring-white shadow-md">
                      <AvatarImage src={user?.photoURL} />
                      <AvatarFallback className="text-xs font-black bg-blue-50 text-primary">{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tighter">{user?.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{user?.businessName || 'Collaborator'}</p>
                  </div>
              </div>
          </div>
      </aside>

      {/* 2. Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Universal Header */}
          <header className="h-16 border-b flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                  <button 
                      onClick={() => { setActiveTab('all'); setCurrentFolderId(null); }}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] transition-colors", 
                        currentFolderId ? "text-slate-400 hover:text-slate-900" : "text-blue-600"
                      )}
                  >
                      Hub
                  </button>
                  {currentFolderPath.map((folder, idx) => (
                      <React.Fragment key={folder.id}>
                          <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
                          <button 
                              onClick={() => { setActiveTab('all'); setCurrentFolderId(folder.id); }}
                              className={cn(
                                  "text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap truncate max-w-[150px] transition-colors",
                                  idx === currentFolderPath.length - 1 ? "text-blue-600" : "text-slate-400 hover:text-slate-900"
                              )}
                          >
                              {folder.name}
                          </button>
                      </React.Fragment>
                  ))}
              </div>

              <div className="flex items-center gap-4">
                  <div className="relative w-72 hidden md:block">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input 
                          placeholder="Search Hub..." 
                          className="h-10 pl-10 rounded-xl bg-slate-50 border-none shadow-inner text-xs font-bold"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                  
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                      <button 
                        onClick={() => setViewMode('grid')} 
                        className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setViewMode('list')} 
                        className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}
                      >
                        <ListIcon className="h-4 w-4" />
                      </button>
                  </div>

                  <Separator orientation="vertical" className="h-6 mx-2 bg-slate-100" />

                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button className="h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/10 gap-3">
                              <Plus className="h-4 w-4" /> Sync New
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 shadow-3xl">
                          <DropdownMenuItem className="rounded-xl py-3 gap-3 font-bold text-[10px] uppercase tracking-widest cursor-pointer" onClick={() => setIsNewFolderOpen(true)}>
                              <FolderPlus className="h-4 w-4 text-blue-500" /> New Folder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-50" />
                          <DropdownMenuItem className="rounded-xl py-3 gap-3 font-bold text-[10px] uppercase tracking-widest cursor-pointer relative">
                              <Upload className="h-4 w-4 text-primary" /> 
                              Sync File
                              <input 
                                  type="file" 
                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                  onChange={handleFileUpload}
                                  disabled={isUploading}
                              />
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
              </div>
          </header>

          {/* Browser Context */}
          <main className="flex-1 overflow-auto bg-white">
              <ScrollArea className="h-full">
                  <div className="p-10">
                      {(loadingFolders || loadingFiles) ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                              {Array.from({ length: 12 }).map((_, i) => (
                                  <div key={i} className="aspect-square rounded-[2.5rem] bg-slate-50 animate-pulse" />
                              ))}
                          </div>
                      ) : (currentFolders.length === 0 && currentFiles.length === 0) ? (
                          <div className="h-full flex flex-col items-center justify-center text-center py-40">
                              <div className="p-12 rounded-[3.5rem] bg-slate-50 mb-8 border border-slate-100 shadow-inner">
                                  <HardDrive className="h-16 w-16 text-slate-200" />
                              </div>
                              <h3 className="text-xl font-black uppercase tracking-[0.4em] text-slate-900 leading-none">Shared Drive Empty</h3>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4 max-w-[240px] leading-relaxed">Create an organizational directory or sync an asset to the hub.</p>
                          </div>
                      ) : (
                          <div className={cn(
                              "grid gap-8",
                              viewMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" : "grid-cols-1"
                          )}>
                              {currentFolders.map(folder => (
                                  <FolderItem 
                                      key={folder.id} 
                                      folder={folder} 
                                      viewMode={viewMode}
                                      onOpen={() => { setActiveTab('all'); setCurrentFolderId(folder.id); }}
                                      onFavorite={() => toggleFavorite(folder, 'cloud_folders')}
                                      onDelete={() => moveToTrash(folder, 'cloud_folders')}
                                      onRestore={() => restoreFromTrash(folder, 'cloud_folders')}
                                      onPermanentDelete={() => permanentDelete(folder, 'cloud_folders')}
                                      isTrashView={activeTab === 'trash'}
                                  />
                              ))}

                              {currentFiles.map(file => (
                                  <FileItem 
                                      key={file.id} 
                                      file={file} 
                                      viewMode={viewMode}
                                      icon={getFileIcon(file.type)}
                                      onFavorite={() => toggleFavorite(file, 'cloud_files')}
                                      onDelete={() => moveToTrash(file, 'cloud_files')}
                                      onRestore={() => restoreFromTrash(file, 'cloud_files')}
                                      onPermanentDelete={() => permanentDelete(file, 'cloud_files')}
                                      formatSize={formatSize}
                                      isTrashView={activeTab === 'trash'}
                                  />
                              ))}
                          </div>
                      )}
                  </div>
              </ScrollArea>
          </main>
      </div>

      {/* Sync Status Overlay */}
      {isUploading && (
        <div className="fixed bottom-10 right-10 z-[100] bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-3xl border border-white/10 flex flex-col gap-5 min-w-[340px] animate-in slide-in-from-bottom-10 duration-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-primary-light" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Hub Sync Active</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Uploading shared asset...</p>
                    </div>
                </div>
                <span className="text-sm font-black tabular-nums">{uploadProgress.toFixed(0)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1.5 bg-white/10 [&>div]:bg-white" />
        </div>
      )}

      {/* Create Folder Modal */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.8rem] border-none shadow-3xl p-10 bg-white">
            <DialogHeader className="space-y-4">
                <div className="p-3 w-fit rounded-2xl bg-blue-50 text-blue-600">
                    <FolderPlus className="h-6 w-6" />
                </div>
                <div>
                    <DialogTitle className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Directory Label</DialogTitle>
                    <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1">
                        Organize team content into shared organizational units
                    </DialogDescription>
                </div>
            </DialogHeader>
            <div className="py-8">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Folder Name</Label>
                <Input 
                    autoFocus
                    placeholder="e.g. Finance Records" 
                    className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-5 mt-2 text-sm shadow-inner"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
            </div>
            <DialogFooter className="gap-3">
                <Button variant="ghost" onClick={() => setIsNewFolderOpen(false)} className="rounded-xl h-12 font-bold text-xs uppercase tracking-widest text-slate-400">Cancel</Button>
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="rounded-2xl h-12 px-12 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
                    Authorize Creation
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidebarItem({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-500 group relative",
                active 
                    ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50" 
                    : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"
            )}
        >
            <div className={cn(
                "p-2 rounded-xl transition-all duration-500",
                active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 rotate-3" : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
            )}>
                {icon}
            </div>
            <span className={cn("text-[11px] font-black uppercase tracking-widest transition-all", active ? "translate-x-1" : "")}>{label}</span>
            {active && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-blue-600 animate-in zoom-in duration-300" />}
        </button>
    );
}

function FolderItem({ folder, viewMode, onOpen, onFavorite, onDelete, onRestore, onPermanentDelete, isTrashView }: any) {
    const initials = folder.ownerName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?';

    const Actions = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white/80 backdrop-blur-md shadow-xl border border-slate-100 hover:bg-white">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 shadow-3xl">
                {!isTrashView ? (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="rounded-xl py-3 gap-3 font-bold text-[9px] uppercase tracking-widest cursor-pointer">
                            {folder.isFavorite ? <StarOff className="h-3.5 w-3.5 text-amber-500" /> : <Star className="h-3.5 w-3.5 text-amber-500" />}
                            {folder.isFavorite ? 'Unpin from Hub' : 'Pin to Favorites'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-xl py-3 gap-3 font-bold text-[9px] uppercase tracking-widest text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" /> Move to Trash
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }} className="rounded-xl py-3 gap-3 font-bold text-[9px] uppercase tracking-widest cursor-pointer text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Restore Directory
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }} className="rounded-xl py-3 gap-3 font-bold text-[9px] uppercase tracking-widest text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" /> Delete Forever
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    if (viewMode === 'list') {
        return (
            <div className="flex items-center justify-between p-4 rounded-3xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all group animate-in fade-in duration-500">
                <div className="flex items-center gap-5 cursor-pointer flex-1" onClick={onOpen}>
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-500 group-hover:scale-110 transition-transform shadow-sm">
                        <Folder className="h-6 w-6 fill-current" />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-sm font-black text-slate-900 leading-none">{folder.name}</p>
                        <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-2 h-4 border-slate-100 bg-slate-50 text-slate-400">Created by {folder.ownerName}</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Actions />
                </div>
            </div>
        );
    }

    return (
        <Card className="border-none shadow-none rounded-[2.5rem] bg-white group hover:shadow-2xl transition-all duration-700 cursor-pointer relative overflow-hidden animate-in zoom-in-95" onClick={onOpen}>
            <CardContent className="p-8">
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <Actions />
                </div>
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-5 rounded-[1.8rem] bg-blue-50 text-blue-500 group-hover:scale-110 transition-transform duration-700 shadow-inner border border-blue-100/50">
                            <Folder className="h-8 w-8 fill-current" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-slate-900 truncate leading-none mb-1.5 uppercase tracking-tighter">{folder.name}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Team Directory</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                        <TooltipProvider>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-3 cursor-help">
                                        <Avatar className="h-7 w-7 rounded-xl ring-2 ring-white shadow-md">
                                            <AvatarImage src={folder.ownerPhoto} />
                                            <AvatarFallback className="text-[9px] font-black bg-slate-100 text-slate-400">{initials}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[90px]">{folder.ownerName?.split(' ')[0]}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] bg-slate-900 text-white border-none py-2 px-4 shadow-2xl">
                                    Admin: {folder.ownerName}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {folder.isFavorite && !isTrashView && (
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function FileItem({ file, viewMode, icon, onFavorite, onDelete, onRestore, onPermanentDelete, formatSize, isTrashView }: any) {
    const initials = file.ownerName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?';

    const Actions = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white/80 backdrop-blur-md shadow-xl border border-slate-100 hover:bg-white">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 shadow-3xl">
                {!isTrashView ? (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="rounded-xl py-3 gap-3 font-bold text-[9px] uppercase tracking-widest cursor-pointer">
                            {file.isFavorite ? <StarOff className="h-3.5 w-3.5 text-amber-500" /> : <Star className="h-3.5 w-3.5 text-amber-500" />}
                            {file.isFavorite ? 'Unpin Asset' : 'Pin to Favorites'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }} className="rounded-xl py-3 gap-3 font-bold text-[9px] uppercase tracking-widest cursor-pointer">
                            <Share2 className="h-3.5 w-3.5 text-blue-500" /> Organizational Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(file.url, '_blank'); }} className="rounded-xl py-3 gap-3 font-bold text-[9px] uppercase tracking-widest cursor-pointer">
                            <Download className="h-3.5 w-3.5 text-slate-400" /> Download Local
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-xl py-3 gap-3 font-bold text-[9px] uppercase tracking-widest text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" /> Move to Trash
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }} className="rounded-xl py-3 gap-3 font-bold text-[9px] uppercase tracking-widest cursor-pointer text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Restore Asset
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }} className="rounded-xl py-3 gap-3 font-bold text-[9px] uppercase tracking-widest text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" /> Delete Forever
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    if (viewMode === 'list') {
        return (
            <div className="flex items-center justify-between p-4 rounded-3xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-xl transition-all group animate-in fade-in duration-500">
                <div className="flex items-center gap-5 cursor-pointer flex-1" onClick={() => window.open(file.url, '_blank')}>
                    <div className="h-12 w-12 rounded-[1.2rem] bg-slate-50 flex items-center justify-center shadow-inner border border-slate-100 group-hover:bg-primary/5 transition-all">
                        {icon}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 truncate max-w-[400px]">{file.name}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatSize(file.size)}</span>
                            <div className="h-1 w-1 rounded-full bg-slate-200" />
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Synced by {file.ownerName}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Actions />
                </div>
            </div>
        );
    }

    return (
        <Card className="border-none shadow-none rounded-[2.5rem] bg-white group hover:shadow-2xl transition-all duration-700 cursor-pointer relative overflow-hidden animate-in zoom-in-95" onClick={() => window.open(file.url, '_blank')}>
            <CardContent className="p-8">
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <Actions />
                </div>
                <div className="flex flex-col gap-6">
                    <div className="h-16 w-16 rounded-[1.8rem] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-all duration-700 shadow-inner border border-slate-100/50">
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate leading-tight mb-2 uppercase tracking-tighter">{file.name}</p>
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <span>{formatSize(file.size)}</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">{format(new Date((file.createdAt?.seconds || 0) * 1000 || Date.now()), 'MMM d')}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                        <TooltipProvider>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-3 cursor-help">
                                        <Avatar className="h-7 w-7 rounded-xl ring-2 ring-white shadow-md">
                                            <AvatarImage src={file.ownerPhoto} />
                                            <AvatarFallback className="text-[9px] font-black bg-slate-100 text-slate-400">{initials}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[90px]">{file.ownerName?.split(' ')[0]}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] bg-slate-900 text-white border-none py-2 px-4 shadow-2xl">
                                    Owner: {file.ownerName}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {file.isFavorite && !isTrashView && (
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
