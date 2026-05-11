
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
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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

  const companyId = user?.companyId || 'default';

  // --- Data Queries ---
  const foldersQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(
        collection(firestore, 'cloud_folders'),
        where('companyId', '==', companyId),
        where('isTrashed', '==', activeTab === 'trash')
    ) : null,
    [firestore, companyId, activeTab]
  );
  const { data: allFolders, isLoading: loadingFolders } = useCollection<CloudFolder>(foldersQuery);

  const filesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(
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
    return list.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
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

  const usedStorage = useMemo(() => {
    if (!allFiles) return 0;
    return allFiles.filter(f => !f.isTrashed).reduce((acc, f) => acc + f.size, 0);
  }, [allFiles]);

  const storagePercentage = (usedStorage / STORAGE_QUOTA_BYTES) * 100;

  // --- Handlers ---
  const handleCreateFolder = async () => {
    if (!firestore || !user || !newFolderName.trim()) return;
    try {
        await addDoc(collection(firestore, 'cloud_folders'), {
            name: newFolderName.trim(),
            parentId: currentFolderId,
            ownerId: user.id,
            companyId: companyId,
            isFavorite: false,
            isTrashed: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        toast({ title: 'Folder created' });
        setIsNewFolderOpen(false);
        setNewFolderName('');
    } catch (e) {
        toast({ variant: 'destructive', title: 'Failed to create folder' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore || !storage || !auth || !user) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'destructive', title: 'File too large', description: 'Maximum file size is 500MB.' });
        return;
    }

    if (usedStorage + file.size > STORAGE_QUOTA_BYTES) {
        toast({ variant: 'destructive', title: 'Storage full', description: 'You have reached your 2GB limit.' });
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
            companyId: companyId,
            isFavorite: false,
            isTrashed: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        toast({ title: 'Upload complete' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Upload failed' });
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
        toast({ variant: 'destructive', title: 'Action failed' });
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
        toast({ title: 'Moved to trash' });
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
        toast({ title: 'Item restored' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Action failed' });
    }
  };

  const permanentDelete = async (item: CloudFile | CloudFolder, collectionName: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, collectionName, item.id));
        toast({ title: 'Permanently deleted' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Action failed' });
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

  if (isUserLoading) return <FullScreenLoader text="Initializing Cloud Storage" />;

  return (
    <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-700">
      {/* Dynamic Header */}
      <header className="shrink-0 bg-white border-b px-8 py-4 sticky top-0 z-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                    River <span className="text-blue-600">Files</span>
                </h1>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => { setActiveTab('all'); setCurrentFolderId(null); }}
                        className={cn("text-xs font-bold uppercase tracking-widest transition-colors", currentFolderId ? "text-slate-400 hover:text-slate-900" : "text-blue-600")}
                    >
                        Root
                    </button>
                    {currentFolderPath.map((folder, idx) => (
                        <React.Fragment key={folder.id}>
                            <ChevronRight className="h-3 w-3 text-slate-300" />
                            <button 
                                onClick={() => { setActiveTab('all'); setCurrentFolderId(folder.id); }}
                                className={cn(
                                    "text-xs font-bold uppercase tracking-widest transition-colors",
                                    idx === currentFolderPath.length - 1 ? "text-blue-600" : "text-slate-400 hover:text-slate-900"
                                )}
                            >
                                {folder.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search files..." 
                        className="pl-10 h-10 rounded-xl bg-slate-50 border-none shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="rounded-xl h-10 px-6 font-bold shadow-lg shadow-blue-600/10">
                            <Plus className="mr-2 h-4 w-4" /> New
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 shadow-2xl">
                        <DropdownMenuItem className="rounded-xl py-3 gap-3 font-semibold cursor-pointer" onClick={() => setIsNewFolderOpen(true)}>
                            <FolderPlus className="h-4 w-4 text-blue-500" /> Create Folder
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="rounded-xl py-3 gap-3 font-semibold cursor-pointer relative">
                            <Upload className="h-4 w-4 text-primary" /> 
                            Upload File
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
        </div>

        {/* Filters and Storage Warning */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
                <FilterButton active={activeTab === 'all'} onClick={() => { setActiveTab('all'); setCurrentFolderId(null); }} label="My Files" icon={<HardDrive className="h-3.5 w-3.5" />} />
                <FilterButton active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} label="Favorites" icon={<Star className="h-3.5 w-3.5" />} />
                <FilterButton active={activeTab === 'trash'} onClick={() => setActiveTab('trash')} label="Trash" icon={<Trash2 className="h-3.5 w-3.5" />} />
                <Separator orientation="vertical" className="h-4 mx-2" />
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}><LayoutGrid className="h-4 w-4" /></button>
                    <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}><ListIcon className="h-4 w-4" /></button>
                </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                {storagePercentage > 90 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 animate-pulse">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Storage 90% full</span>
                    </div>
                )}
                <div className="flex flex-col gap-1.5 min-w-[140px]">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>{formatSize(usedStorage)} used</span>
                        <span>2 GB</span>
                    </div>
                    <Progress value={storagePercentage} className="h-1.5 bg-slate-100" />
                </div>
            </div>
        </div>
      </header>

      {/* Uploading Pill */}
      {isUploading && (
        <div className="fixed bottom-24 right-8 z-[60] bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex flex-col gap-3 min-w-[280px] animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Syncing to Cloud</span>
                </div>
                <span className="text-xs font-black tabular-nums">{uploadProgress.toFixed(0)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1 bg-white/10" />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {(loadingFolders || loadingFiles) ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                    <Card key={i} className="border-none bg-white/50 animate-pulse aspect-square rounded-3xl" />
                ))}
            </div>
        ) : (currentFolders.length === 0 && currentFiles.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                <div className="p-8 rounded-[3rem] bg-slate-200 mb-6">
                    <HardDrive className="h-16 w-16 text-slate-400" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest">Workspace is empty</h3>
                <p className="text-sm font-medium mt-2">Start by creating a folder or uploading your first business document.</p>
            </div>
        ) : (
            <div className={cn(
                "grid gap-6",
                viewMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" : "grid-cols-1"
            )}>
                {/* Folders */}
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

                {/* Files */}
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
      </main>

      {/* New Folder Dialog */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-3xl p-8">
            <DialogHeader>
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                        <FolderPlus className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">New Folder</DialogTitle>
                </div>
                <DialogDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    Create a structured organization unit
                </DialogDescription>
            </DialogHeader>
            <div className="py-6">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Folder name</Label>
                <Input 
                    autoFocus
                    placeholder="e.g. Q4 Financials" 
                    className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4 mt-2"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
            </div>
            <DialogFooter className="gap-3">
                <Button variant="ghost" onClick={() => setIsNewFolderOpen(false)} className="rounded-xl h-12 font-bold text-xs uppercase tracking-widest">Cancel</Button>
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
                    Create Folder
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
    return (
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClick}
            className={cn(
                "rounded-xl px-4 font-bold text-[10px] uppercase tracking-widest gap-2 transition-all",
                active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100"
            )}
        >
            {icon}
            {label}
        </Button>
    );
}

function FolderItem({ folder, viewMode, onOpen, onFavorite, onDelete, onRestore, onPermanentDelete, isTrashView }: any) {
    const content = (
        <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-500 group-hover:scale-110 transition-transform duration-300">
                <Folder className="h-6 w-6 fill-current" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate leading-none pt-0.5">{folder.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Directory</p>
            </div>
        </div>
    );

    if (viewMode === 'list') {
        return (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={onOpen}>
                    <Folder className="h-5 w-5 text-blue-400 fill-current" />
                    <span className="text-sm font-bold">{folder.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <ItemActions item={folder} onFavorite={onFavorite} onDelete={onDelete} onRestore={onRestore} onPermanentDelete={onPermanentDelete} isTrashView={isTrashView} />
                </div>
            </div>
        );
    }

    return (
        <Card className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-xl transition-all duration-500 cursor-pointer relative overflow-hidden" onClick={onOpen}>
            <CardContent className="p-6">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <ItemActions item={folder} onFavorite={onFavorite} onDelete={onDelete} onRestore={onRestore} onPermanentDelete={onPermanentDelete} isTrashView={isTrashView} />
                </div>
                {content}
            </CardContent>
            {folder.isFavorite && !isTrashView && (
                <div className="absolute -bottom-1 -right-1 p-2 bg-amber-500 text-white rounded-tl-2xl">
                    <Star className="h-3 w-3 fill-current" />
                </div>
            )}
        </Card>
    );
}

function FileItem({ file, viewMode, icon, onFavorite, onDelete, onRestore, onPermanentDelete, formatSize, isTrashView }: any) {
    const content = (
        <div className="flex flex-col gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-all duration-300">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate leading-tight mb-1">{file.name}</p>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>{formatSize(file.size)}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">{format(new Date(file.createdAt?.seconds * 1000 || Date.now()), 'MMM d')}</span>
                </div>
            </div>
        </div>
    );

    if (viewMode === 'list') {
        return (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => window.open(file.url, '_blank')}>
                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">{icon}</div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold">{file.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatSize(file.size)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ItemActions item={file} onFavorite={onFavorite} onDelete={onDelete} onRestore={onRestore} onPermanentDelete={onPermanentDelete} isTrashView={isTrashView} />
                </div>
            </div>
        );
    }

    return (
        <Card className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-xl transition-all duration-500 cursor-pointer relative overflow-hidden" onClick={() => window.open(file.url, '_blank')}>
            <CardContent className="p-6">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <ItemActions item={file} onFavorite={onFavorite} onDelete={onDelete} onRestore={onRestore} onPermanentDelete={onPermanentDelete} isTrashView={isTrashView} />
                </div>
                {content}
            </CardContent>
            {file.isFavorite && !isTrashView && (
                <div className="absolute -bottom-1 -right-1 p-2 bg-amber-500 text-white rounded-tl-2xl">
                    <Star className="h-3 w-3 fill-current" />
                </div>
            )}
        </Card>
    );
}

function ItemActions({ item, onFavorite, onDelete, onRestore, onPermanentDelete, isTrashView }: any) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white/80 backdrop-blur-md shadow-sm border border-slate-100">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-2xl border-slate-100">
                {!isTrashView ? (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="rounded-lg py-2 gap-3 font-semibold cursor-pointer">
                            <Star className={cn("h-4 w-4", item.isFavorite ? "fill-amber-400 text-amber-500" : "text-slate-400")} /> 
                            {item.isFavorite ? 'Remove Favorite' : 'Favorite'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }} className="rounded-lg py-2 gap-3 font-semibold cursor-pointer">
                            <Share2 className="h-4 w-4 text-blue-500" /> Share Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(item.url, '_blank'); }} className="rounded-lg py-2 gap-3 font-semibold cursor-pointer">
                            <Download className="h-4 w-4 text-slate-400" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-lg py-2 gap-3 font-semibold text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-4 w-4" /> Move to Trash
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }} className="rounded-lg py-2 gap-3 font-semibold cursor-pointer">
                            <CheckCircle2 className="h-4 w-4 text-green-500" /> Restore Item
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }} className="rounded-lg py-2 gap-3 font-semibold text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-4 w-4" /> Delete Forever
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function Loader2({ className }: { className?: string }) {
    return <Clock className={cn("animate-spin", className)} />;
}
