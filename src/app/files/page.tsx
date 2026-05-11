'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  FolderPlus, 
  Upload, 
  Search, 
  File, 
  Folder, 
  Star, 
  Trash2, 
  LayoutGrid, 
  List as ListIcon,
  ChevronRight,
  HardDrive,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Plus,
  Share2,
  Download,
  CheckCircle2,
  Loader2,
  Globe,
  MoreHorizontal,
  StarOff,
  Headset,
  FileSearch,
  Clock
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser, useFirestore, useCollection, useMemoFirebase, useStorage, useAuth, useDoc } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { CloudFile, CloudFolder, AppUser, ChatMessage, Notification as NotificationType } from '@/lib/types';
import { FullScreenLoader } from '@/components/ui/loader';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { useToast } from '@/hooks/use-toast';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogClose 
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LogoBlack } from '@/components/icons';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import { UserMenu } from '@/components/dashboard/layout/UserMenu';
import { NotificationPopover } from '@/components/dashboard/layout/NotificationPopover';
import { LiveSupportDialog } from '@/components/dashboard/layout/LiveSupportDialog';

const STORAGE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2gb
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500mb

export default function RiverFilesPage() {
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user } = useDoc<AppUser>(userDocRef);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'trash'>('all');
  const [isLiveSupportOpen, setIsLiveSupportOpen] = useState(false);

  // multi-tenant isolation
  const companyId = user?.companyId || 'unassigned';

  // --- data queries ---
  const foldersQuery = useMemoFirebase(
    () => (firestore && companyId !== 'unassigned') ? query(
        collection(firestore, 'cloud_folders'),
        where('companyId', '==', companyId),
        where('isTrashed', '==', activeTab === 'trash')
    ) : null,
    [firestore, companyId, activeTab]
  );
  const { data: allFolders, isLoading: loadingFolders } = useCollection<CloudFolder>(foldersQuery);

  const filesQuery = useMemoFirebase(
    () => (firestore && companyId !== 'unassigned') ? query(
        collection(firestore, 'cloud_files'),
        where('companyId', '==', companyId),
        where('isTrashed', '==', activeTab === 'trash')
    ) : null,
    [firestore, companyId, activeTab]
  );
  const { data: allFiles, isLoading: loadingFiles } = useCollection<CloudFile>(filesQuery);

  const notificationsQuery = useMemoFirebase(
    () => (firestore && authUser) ? query(collection(firestore, 'users', authUser.uid, 'notifications'), orderBy('date', 'desc')) : null,
    [firestore, authUser]
  );
  const { data: notifications } = useCollection<NotificationType>(notificationsQuery);

  const chatMessagesQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(collection(firestore, 'users', authUser.uid, 'chatMessages'), orderBy('timestamp', 'asc'));
  }, [firestore, authUser]);
  const { data: chatMessages } = useCollection<ChatMessage>(chatMessagesQuery);

  // --- computed views ---
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

  // --- handlers ---
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
        toast({ title: 'directory synced' });
        setIsNewFolderOpen(false);
        setNewFolderName('');
    } catch (e) {
        toast({ variant: 'destructive', title: 'sync blocked' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore || !storage || !auth || !user) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'destructive', title: 'limit exceeded', description: 'max 500mb per file' });
        return;
    }

    if (companyUsedStorage + file.size > STORAGE_QUOTA_BYTES) {
        toast({ variant: 'destructive', title: 'quota reached', description: '2gb organizational limit reached' });
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

        toast({ title: 'asset synchronized' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'sync failure' });
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
        toast({ variant: 'destructive', title: 'update blocked' });
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
        toast({ title: 'moved to shared trash' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'action failed' });
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
        toast({ title: 'restored to hub' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'action failed' });
    }
  };

  const permanentDelete = async (item: CloudFile | CloudFolder, collectionName: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, collectionName, item.id));
        toast({ title: 'purged' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'purge blocked' });
    }
  };

  const handleMessageSubmit = async (messagePayload: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (!firestore || !user) return;
    const messagesCollection = collection(firestore, 'users', user.id, 'chatMessages');
    try {
        await addDoc(messagesCollection, { ...messagePayload, timestamp: serverTimestamp() });
        await updateDoc(doc(firestore, 'users', user.id), {
            lastChatMessage: messagePayload.text || 'attachment',
            lastChatTimestamp: serverTimestamp(),
            hasUnreadUserMessages: true
        });
    } catch(error) {
        toast({ variant: 'destructive', title: 'dispatch failed' });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 b';
    const k = 1024;
    const sizes = ['b', 'kb', 'mb', 'gb'];
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

  if (isUserLoading) return <FullScreenLoader text="opening cloud hub" />;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden font-sans">
      {/* 1. unified global header */}
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md shadow-sm sm:h-16 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <LogoBlack className="h-10 w-10 transition-transform group-hover:scale-105" />
          <div className="flex flex-col">
            <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 leading-tight">river</span>
            <span className="font-bold text-[10px] uppercase tracking-widest text-slate-400 leading-tight">files</span>
          </div>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2 sm:gap-4">
          <LiveSupportDialog 
            isOpen={isLiveSupportOpen}
            onOpenChange={setIsLiveSupportOpen}
            user={user}
            chatMessages={chatMessages || []}
            onMessageSubmit={handleMessageSubmit}
          >
            <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100">
              <Headset className="h-5 w-5 text-slate-600" />
              {(user?.hasUnreadAdminMessages) && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background shadow-sm" />}
            </Button>
          </LiveSupportDialog>
          
          <Button asChild variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100 hidden sm:flex">
            <Link href="/documentation" target="_blank"><FileSearch className="h-5 w-5 text-slate-600" /></Link>
          </Button>

          <NotificationPopover 
            notifications={notifications || []}
            onNotificationClick={() => {}}
          />

          <AppLauncher />

          <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block bg-slate-200" />

          <UserMenu 
            user={user} 
            onOpenSettings={() => window.dispatchEvent(new CustomEvent('open-my-account'))} 
            onLogout={() => signOut(auth!).then(() => router.push('/login'))} 
          />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 2. minimal side navigation */}
        <aside className="w-64 border-r bg-slate-50/50 flex flex-col shrink-0">
          <div className="p-6">
            <nav className="space-y-1">
              <SidebarItem 
                active={activeTab === 'all'} 
                onClick={() => { setActiveTab('all'); setCurrentFolderId(null); }} 
                icon={<Globe className="h-4 w-4" />} 
                label="company hub" 
              />
              <SidebarItem 
                active={activeTab === 'favorites'} 
                onClick={() => setActiveTab('favorites')} 
                icon={<Star className="h-4 w-4" />} 
                label="pinned assets" 
              />
              <SidebarItem 
                active={activeTab === 'trash'} 
                onClick={() => setActiveTab('trash')} 
                icon={<Trash2 className="h-4 w-4" />} 
                label="trash bin" 
              />
            </nav>
          </div>

          <div className="mt-auto p-6 space-y-6">
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                <span>shared quota</span>
                <span className={cn(storagePercentage > 90 ? "text-red-500" : "text-slate-900")}>{Math.round(storagePercentage)}%</span>
              </div>
              <Progress value={storagePercentage} className={cn("h-1 bg-slate-100", storagePercentage > 90 && "[&>div]:bg-red-500")} />
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                {formatSize(companyUsedStorage)} of 2gb shared
              </p>
            </div>

            <div className="px-1 flex items-center gap-3">
              <Avatar className="h-8 w-8 rounded-xl shadow-sm">
                <AvatarImage src={user?.photoURL} />
                <AvatarFallback className="text-[10px] font-black bg-blue-50 text-primary">{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tighter">{user?.name}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">{user?.businessName || 'collaborator'}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* 3. main workspace area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* browser breadcrumbs & search */}
          <header className="h-14 border-b flex items-center justify-between px-6 bg-white shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <button 
                onClick={() => { setActiveTab('all'); setCurrentFolderId(null); }}
                className={cn(
                  "text-[9px] font-black uppercase tracking-[0.2em] transition-colors", 
                  currentFolderId ? "text-slate-400 hover:text-slate-900" : "text-blue-600"
                )}
              >
                hub
              </button>
              {currentFolderPath.map((folder, idx) => (
                <React.Fragment key={folder.id}>
                  <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
                  <button 
                    onClick={() => { setActiveTab('all'); setCurrentFolderId(folder.id); }}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap truncate max-w-[120px] transition-colors",
                      idx === currentFolderPath.length - 1 ? "text-blue-600" : "text-slate-400 hover:text-slate-900"
                    )}
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64 hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input 
                  placeholder="search hub..." 
                  className="h-9 pl-9 rounded-xl bg-slate-50 border-none shadow-inner text-[11px] font-bold lowercase"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>

              <Separator orientation="vertical" className="h-5 mx-1 bg-slate-100" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-600/10 gap-2">
                    <Plus className="h-3.5 w-3.5" /> sync new
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1 border-slate-100 shadow-2xl">
                  <DropdownMenuItem className="rounded-xl py-2.5 gap-3 font-bold text-[9px] uppercase tracking-widest cursor-pointer" onClick={() => setIsNewFolderOpen(true)}>
                    <FolderPlus className="h-4 w-4 text-blue-500" /> new folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-50" />
                  <DropdownMenuItem className="rounded-xl py-2.5 gap-3 font-bold text-[9px] uppercase tracking-widest cursor-pointer relative">
                    <Upload className="h-4 w-4 text-primary" /> 
                    sync file
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

          {/* main context */}
          <main className="flex-1 overflow-auto bg-white">
            <ScrollArea className="h-full">
              <div className="p-8">
                {(loadingFolders || loadingFiles) ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-[2rem] bg-slate-50 animate-pulse" />
                    ))}
                  </div>
                ) : (currentFolders.length === 0 && currentFiles.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-40">
                    <div className="p-10 rounded-[3rem] bg-slate-50 mb-6 border border-slate-100 shadow-inner">
                      <HardDrive className="h-12 w-12 text-slate-200" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-[0.4em] text-slate-900 leading-none">drive empty</h3>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-4 max-w-[200px] leading-relaxed">sync an asset to the shared hub to begin.</p>
                  </div>
                ) : (
                  <div className={cn(
                    "grid gap-6",
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
      </div>

      {/* sync status overlay */}
      {isUploading && (
        <div className="fixed bottom-8 right-8 z-[100] bg-slate-900 text-white p-5 rounded-[2rem] shadow-3xl border border-white/10 flex flex-col gap-4 min-w-[300px] animate-in slide-in-from-bottom-10 duration-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-primary-light" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em]">hub sync active</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">uploading shared asset...</p>
                    </div>
                </div>
                <span className="text-xs font-black tabular-nums">{uploadProgress.toFixed(0)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1 bg-white/10 [&>div]:bg-white" />
        </div>
      )}

      {/* create folder modal */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-3xl p-8 bg-white">
            <DialogHeader className="space-y-4">
                <div className="p-3 w-fit rounded-xl bg-blue-50 text-blue-600">
                    <FolderPlus className="h-5 w-5" />
                </div>
                <div>
                    <DialogTitle className="text-xl font-black tracking-tighter text-slate-900 uppercase">directory label</DialogTitle>
                    <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-[8px] mt-1">
                        organize team content into shared organizational units
                    </DialogDescription>
                </div>
            </DialogHeader>
            <div className="py-6">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">folder name</Label>
                <Input 
                    autoFocus
                    placeholder="e.g. logistics records" 
                    className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4 mt-2 text-xs shadow-inner lowercase"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
            </div>
            <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setIsNewFolderOpen(false)} className="rounded-xl h-10 font-bold text-[9px] uppercase tracking-widest text-slate-400">cancel</Button>
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="rounded-xl h-10 px-8 font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/20">
                    authorize
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
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group relative",
                active 
                    ? "bg-white text-slate-900 shadow-md shadow-slate-200/50" 
                    : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"
            )}
        >
            <div className={cn(
                "p-1.5 rounded-lg transition-all duration-300",
                active ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
            )}>
                {icon}
            </div>
            <span className={cn("text-[10px] font-black uppercase tracking-widest transition-all", active ? "translate-x-1" : "")}>{label}</span>
        </button>
    );
}

function FolderItem({ folder, viewMode, onOpen, onFavorite, onDelete, onRestore, onPermanentDelete, isTrashView }: any) {
    const initials = folder.ownerName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?';

    const Actions = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-white/80 backdrop-blur-md shadow-lg border border-slate-100 hover:bg-white">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1 border-slate-100 shadow-2xl">
                {!isTrashView ? (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="rounded-xl py-2.5 gap-3 font-bold text-[8px] uppercase tracking-widest cursor-pointer">
                            {folder.isFavorite ? <StarOff className="h-3 w-3 text-amber-500" /> : <Star className="h-3 w-3 text-amber-500" />}
                            {folder.isFavorite ? 'unpin asset' : 'pin to hub'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-xl py-2.5 gap-3 font-bold text-[8px] uppercase tracking-widest text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3 w-3" /> move to trash
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }} className="rounded-xl py-2.5 gap-3 font-bold text-[8px] uppercase tracking-widest cursor-pointer text-green-600">
                            <CheckCircle2 className="h-3 w-3" /> restore
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }} className="rounded-xl py-2.5 gap-3 font-bold text-[8px] uppercase tracking-widest text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3 w-3" /> delete forever
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    if (viewMode === 'list') {
        return (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all group animate-in fade-in duration-500">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={onOpen}>
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500 group-hover:scale-110 transition-transform shadow-sm">
                        <Folder className="h-5 w-5 fill-current" />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-xs font-black text-slate-900 leading-none lowercase">{folder.name}</p>
                        <div className="flex items-center gap-2">
                             <span className="text-[8px] font-black uppercase text-slate-400">synced by {folder.ownerName}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Actions />
                </div>
            </div>
        );
    }

    return (
        <Card className="border-none shadow-none rounded-[2rem] bg-white group hover:shadow-2xl transition-all duration-500 cursor-pointer relative overflow-hidden animate-in zoom-in-95" onClick={onOpen}>
            <CardContent className="p-6">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <Actions />
                </div>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-2xl bg-blue-50 text-blue-500 group-hover:scale-110 transition-transform duration-500 shadow-inner border border-blue-100/50">
                            <Folder className="h-6 w-6 fill-current" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-900 truncate leading-none mb-1.5 uppercase tracking-tighter lowercase">{folder.name}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">directory</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 rounded-lg shadow-sm">
                                <AvatarImage src={folder.ownerPhoto} />
                                <AvatarFallback className="text-[8px] font-black bg-slate-100 text-slate-400">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[70px]">{folder.ownerName?.split(' ')[0]}</span>
                        </div>
                        {folder.isFavorite && !isTrashView && (
                            <Star className="h-3 w-3 text-amber-400 fill-current" />
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
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-white/80 backdrop-blur-md shadow-lg border border-slate-100 hover:bg-white">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1 border-slate-100 shadow-2xl">
                {!isTrashView ? (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="rounded-xl py-2.5 gap-3 font-bold text-[8px] uppercase tracking-widest cursor-pointer">
                            {file.isFavorite ? <StarOff className="h-3 w-3 text-amber-500" /> : <Star className="h-3 w-3 text-amber-500" />}
                            {file.isFavorite ? 'unpin asset' : 'pin to hub'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(file.url, '_blank'); }} className="rounded-xl py-2.5 gap-3 font-bold text-[8px] uppercase tracking-widest cursor-pointer">
                            <Download className="h-3 w-3 text-slate-400" /> download local
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-xl py-2.5 gap-3 font-bold text-[8px] uppercase tracking-widest text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3 w-3" /> move to trash
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }} className="rounded-xl py-2.5 gap-3 font-bold text-[8px] uppercase tracking-widest cursor-pointer text-green-600">
                            <CheckCircle2 className="h-3 w-3" /> restore
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }} className="rounded-xl py-2.5 gap-3 font-bold text-[8px] uppercase tracking-widest text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3 w-3" /> delete forever
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    if (viewMode === 'list') {
        return (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-xl transition-all group animate-in fade-in duration-500">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => window.open(file.url, '_blank')}>
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center shadow-inner border border-slate-100 group-hover:bg-primary/5 transition-all">
                        {icon}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 truncate max-w-[300px] lowercase">{file.name}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{formatSize(file.size)}</span>
                            <div className="h-1 w-1 rounded-full bg-slate-200" />
                            <span className="text-[8px] font-black text-primary uppercase tracking-widest">synced by {file.ownerName}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Actions />
                </div>
            </div>
        );
    }

    return (
        <Card className="border-none shadow-none rounded-[2rem] bg-white group hover:shadow-2xl transition-all duration-500 cursor-pointer relative overflow-hidden animate-in zoom-in-95" onClick={() => window.open(file.url, '_blank')}>
            <CardContent className="p-6">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <Actions />
                </div>
                <div className="flex flex-col gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-all duration-500 shadow-inner border border-slate-100/50">
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate leading-tight mb-2 uppercase tracking-tighter lowercase">{file.name}</p>
                        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                            <span>{formatSize(file.size)}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 rounded-lg shadow-sm">
                                <AvatarImage src={file.ownerPhoto} />
                                <AvatarFallback className="text-[8px] font-black bg-slate-100 text-slate-400">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[70px]">{file.ownerName?.split(' ')[0]}</span>
                        </div>
                        {file.isFavorite && !isTrashView && (
                            <Star className="h-3 w-3 text-amber-400 fill-current" />
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
