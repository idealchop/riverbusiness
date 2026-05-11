'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  Clock,
  Home,
  X,
  History,
  Info,
  Palette
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { useUser, useFirestore, useCollection, useMemoFirebase, useStorage, useAuth, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, orderBy, setDoc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { CloudFile, CloudFolder, AppUser, ChatMessage, Notification as NotificationType, SecurityRuleContext } from '@/lib/types';
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
import { formatDistanceToNow } from 'date-fns';

const STORAGE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

export default function RiverFilesPage() {
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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

  // Multi-tenant isolation
  const companyId = user?.companyId || 'unassigned';

  // Presence logic
  const presenceQuery = useMemoFirebase(
    () => (firestore && companyId !== 'unassigned') ? collection(firestore, 'hr_companies', companyId, 'files_presence') : null,
    [firestore, companyId]
  );
  const { data: rawCollaborators } = useCollection(presenceQuery);

  const collaborators = useMemo(() => {
    if (!rawCollaborators) return [];
    return [...rawCollaborators].sort((a, b) => {
        const timeA = a.lastActive?.seconds || 0;
        const timeB = b.lastActive?.seconds || 0;
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return timeB - timeA;
    });
  }, [rawCollaborators]);

  useEffect(() => {
    if (!firestore || !user || companyId === 'unassigned') return;

    const presenceRef = doc(firestore, 'hr_companies', companyId, 'files_presence', user.id);
    const presenceData = {
        id: user.id,
        name: user.name || user.email?.split('@')[0] || 'Collaborator',
        photoURL: user.photoURL || null,
        lastActive: serverTimestamp(),
        isActive: true,
        lastPath: pathname
    };
    
    setDoc(presenceRef, presenceData).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
            path: presenceRef.path,
            operation: 'create',
            requestResourceData: presenceData
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });

    return () => {
        updateDoc(presenceRef, { 
            isActive: false, 
            lastActive: serverTimestamp() 
        }).catch(() => {}); 
    };
  }, [firestore, user, companyId, pathname]);

  // Data queries
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

  // Computed views
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

  // Handlers
  const handleCreateFolder = async () => {
    if (!firestore || !user || !newFolderName.trim()) return;
    const newFolderData = {
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
    };
    try {
        await addDoc(collection(firestore, 'cloud_folders'), newFolderData);
        toast({ title: 'Directory Synchronized' });
        setIsNewFolderOpen(false);
        setNewFolderName('');
    } catch (e) {
        const permissionError = new FirestorePermissionError({
            path: '/cloud_folders',
            operation: 'create',
            requestResourceData: newFolderData
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore || !storage || !auth || !user) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'destructive', title: 'Limit Exceeded', description: 'Maximum 500MB per file.' });
        return;
    }

    if (companyUsedStorage + file.size > STORAGE_QUOTA_BYTES) {
        toast({ variant: 'destructive', title: 'Quota Reached', description: '2GB organizational limit reached.' });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
        const path = `cloud_storage/${companyId}/${Date.now()}-${file.name}`;
        const url = await uploadFileWithProgress(storage, auth, path, file, {}, setUploadProgress);

        const newFileData = {
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
        };

        await addDoc(collection(firestore, 'cloud_files'), newFileData);
        toast({ title: 'Asset Synchronized' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Sync Failure' });
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
        toast({ variant: 'destructive', title: 'Update Blocked' });
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
        toast({ title: 'Moved to trash bin' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Action Failed' });
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
        toast({ title: 'Restored to hub' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Action Failed' });
    }
  };

  const permanentDelete = async (item: CloudFile | CloudFolder, collectionName: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, collectionName, item.id));
        toast({ title: 'Purged permanently' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Purge Blocked' });
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

  if (isUserLoading) return <FullScreenLoader text="Opening Cloud Hub" />;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden font-sans">
      {/* Global Header */}
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md shadow-sm sm:h-16 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <LogoBlack className="h-10 w-10 transition-transform group-hover:scale-105" />
          <div className="flex flex-col">
            <span className="font-black text-xs text-slate-900 leading-tight">River</span>
            <span className="font-bold text-[10px] text-slate-400 leading-tight">Files</span>
          </div>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2 sm:gap-6">
          {/* Team presence */}
          <TooltipProvider delayDuration={0}>
             <div className="flex -space-x-1.5 mr-2">
                {collaborators?.filter(c => c.id !== user?.id).map(collab => {
                    const lastActiveDate = collab.lastActive?.toDate?.() || new Date();
                    const isOnline = collab.isActive;

                    return (
                    <Tooltip key={collab.id}>
                        <TooltipTrigger asChild>
                            <div className="relative">
                                <Avatar className={cn(
                                    "h-6 w-6 border-2 border-white shadow-sm hover:z-20 transition-all cursor-default",
                                    !isOnline && "grayscale opacity-50"
                                )}>
                                    <AvatarImage src={collab.photoURL} />
                                    <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">{collab.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="rounded-2xl px-4 py-3 border-slate-100 shadow-3xl bg-white/80 backdrop-blur-xl border">
                            <div className="flex flex-col">
                                <p className="text-xs font-black text-slate-900 leading-none">
                                    {collab.name}
                                </p>
                                {!isOnline ? (
                                    <p className="text-[10px] font-bold text-slate-400 leading-none mt-1">
                                        Last seen {formatDistanceToNow(lastActiveDate, { addSuffix: true })}
                                    </p>
                                ) : (
                                    <p className="text-[10px] font-black text-primary leading-none mt-1">
                                        Viewing now
                                    </p>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )})}
            </div>
          </TooltipProvider>

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
        {/* Sidebar Navigation */}
        <aside className="w-72 border-r bg-slate-50/80 flex flex-col shrink-0 transition-all duration-300">
          <div className="p-6 flex-1 overflow-y-auto space-y-8">
            <div className="space-y-1">
              <h4 className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-2">Directories</h4>
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

            <div className="space-y-1">
                <h4 className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-2">Management</h4>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs text-slate-500 hover:text-slate-900">
                    <History className="h-4 w-4" /> Recently Modified
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg gap-3 font-bold text-xs text-slate-500 hover:text-slate-900" onClick={() => setIsNewFolderOpen(true)}>
                    <FolderPlus className="h-4 w-4" /> New Directory
                </Button>
            </div>
          </div>

          <div className="mt-auto p-4 border-t bg-slate-50/50">
            <div className="p-4 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-black text-slate-400">
                        <span>Collective Quota</span>
                        <span className={cn(storagePercentage > 90 ? "text-red-500" : "text-slate-900")}>{Math.round(storagePercentage)}%</span>
                    </div>
                    <Progress value={storagePercentage} className={cn("h-1 bg-slate-100", storagePercentage > 90 && "[&>div]:bg-red-500")} />
                    <p className="text-[8px] font-bold text-slate-400 leading-none">
                        {formatSize(companyUsedStorage)} of 2GB shared
                    </p>
                </div>
                <Separator className="bg-slate-50" />
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 rounded-xl shadow-sm">
                        <AvatarImage src={user?.photoURL} />
                        <AvatarFallback className="text-[10px] font-black bg-blue-50 text-primary">{user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black text-slate-900 truncate tracking-tighter">{user?.businessName || 'Company Hub'}</p>
                        <p className="text-[8px] font-bold text-slate-400 leading-none mt-0.5">Shared Team Storage</p>
                    </div>
                </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <header className="h-14 border-b flex items-center justify-between px-6 bg-white/95 backdrop-blur-sm shrink-0 sticky top-0 z-20">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <button 
                onClick={() => { setActiveTab('all'); setCurrentFolderId(null); }}
                className={cn(
                  "p-2 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors", 
                  !currentFolderId && "text-slate-900"
                )}
              >
                <Home className="h-4 w-4" />
              </button>
              {currentFolderPath.map((folder, idx) => (
                <React.Fragment key={folder.id}>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  <button 
                    onClick={() => { setActiveTab('all'); setCurrentFolderId(folder.id); }}
                    className={cn(
                      "text-xs font-bold whitespace-nowrap truncate max-w-[150px] transition-colors",
                      idx === currentFolderPath.length - 1 ? "text-slate-900" : "text-slate-400 hover:text-slate-900"
                    )}
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group/search hidden md:block w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input 
                  placeholder="Quick find assets..." 
                  className="h-9 pl-9 rounded-xl bg-slate-50 border-none shadow-inner text-xs font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-primary" : "text-slate-400")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-primary" : "text-slate-400")}
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>

              <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-9 px-4 rounded-xl font-black text-[9px] uppercase shadow-lg shadow-primary/10 gap-2">
                    <Plus className="h-3.5 w-3.5" /> Sync Asset
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1 border-slate-100 shadow-2xl">
                  <DropdownMenuItem className="rounded-xl py-2.5 gap-3 font-bold text-xs cursor-pointer" onClick={() => setIsNewFolderOpen(true)}>
                    <FolderPlus className="h-4 w-4 text-blue-500" /> New Folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-50" />
                  <DropdownMenuItem className="rounded-xl py-2.5 gap-3 font-bold text-xs cursor-pointer relative">
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

          <main className="flex-1 overflow-auto bg-white">
            <ScrollArea className="h-full">
              <div className="p-8 pb-32">
                {(loadingFolders || loadingFiles) ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-[2rem] bg-slate-50 animate-pulse" />
                    ))}
                  </div>
                ) : (currentFolders.length === 0 && currentFiles.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-40 animate-in fade-in duration-700">
                    <div className="p-10 rounded-[3rem] bg-slate-50 mb-6 border border-slate-100 shadow-inner">
                      <HardDrive className="h-12 w-12 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 leading-none">Organizational Hub Empty</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-4 max-w-[220px] leading-relaxed">Sync your first asset to the shared company drive to begin collaboration.</p>
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

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="fixed bottom-8 right-8 z-[100] bg-slate-900 text-white p-5 rounded-[2.5rem] shadow-3xl border border-white/10 flex flex-col gap-4 min-w-[320px] animate-in slide-in-from-bottom-10 duration-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Hub Synchronization</p>
                        <p className="text-[8px] font-bold text-slate-400 mt-1">Uploading shared organizational asset...</p>
                    </div>
                </div>
                <span className="text-xs font-black tabular-nums">{uploadProgress.toFixed(0)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1 bg-white/10 [&>div]:bg-white" />
        </div>
      )}

      {/* Create Directory Modal */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-3xl p-8 bg-white">
            <DialogHeader className="space-y-4">
                <div className="p-3 w-fit rounded-xl bg-blue-50 text-blue-600">
                    <FolderPlus className="h-5 w-5" />
                </div>
                <div>
                    <DialogTitle className="text-xl font-black tracking-tighter text-slate-900">Directory Synchronization</DialogTitle>
                    <DialogDescription className="text-slate-400 font-bold text-[9px] mt-1 uppercase tracking-wider">
                        Organize collective team content into shared organizational units.
                    </DialogDescription>
                </div>
            </DialogHeader>
            <div className="py-6">
                <Label className="text-[9px] font-black text-slate-400 ml-1 uppercase tracking-widest">Folder Label</Label>
                <Input 
                    autoFocus
                    placeholder="e.g. Logistics Records" 
                    className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4 mt-2 text-xs shadow-inner"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
            </div>
            <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setIsNewFolderOpen(false)} className="rounded-xl h-10 font-bold text-[10px] uppercase tracking-widest text-slate-400">Cancel</Button>
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="rounded-xl h-10 px-8 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">
                    Authorize
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
                active ? "bg-primary text-white shadow-md shadow-primary/30" : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-primary"
            )}>
                {icon}
            </div>
            <span className={cn("text-[11px] font-bold transition-all", active ? "translate-x-1" : "")}>{label}</span>
        </button>
    );
}

function FolderItem({ folder, viewMode, onOpen, onFavorite, onDelete, onRestore, onPermanentDelete, isTrashView }: any) {
    const initials = folder.ownerName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?';

    const Actions = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-white/80 backdrop-blur-md shadow-lg border border-slate-100 hover:bg-white">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1 border-slate-100 shadow-2xl">
                {!isTrashView ? (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="rounded-xl py-2.5 gap-3 font-bold text-xs cursor-pointer">
                            {folder.isFavorite ? <StarOff className="h-3 w-3 text-amber-500" /> : <Star className="h-3 w-3 text-amber-500" />}
                            {folder.isFavorite ? 'Unpin asset' : 'Pin to hub'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-xl py-2.5 gap-3 font-bold text-xs text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3 w-3" /> Move to trash
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }} className="rounded-xl py-2.5 gap-3 font-bold text-xs cursor-pointer text-green-600">
                            <CheckCircle2 className="h-3 w-3" /> Restore
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }} className="rounded-xl py-2.5 gap-3 font-bold text-xs text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3 w-3" /> Delete forever
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    if (viewMode === 'list') {
        return (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-xl transition-all group animate-in fade-in duration-500">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={onOpen}>
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500 group-hover:scale-110 transition-transform shadow-sm">
                        <Folder className="h-5 w-5 fill-current" />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-900 leading-none">{folder.name}</p>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-slate-400">Synced by {folder.ownerName}</span>
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
                            <p className="text-sm font-black text-slate-900 truncate leading-none mb-1.5 tracking-tighter">{folder.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Directory</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 rounded-lg shadow-sm">
                                <AvatarImage src={folder.ownerPhoto} />
                                <AvatarFallback className="text-[8px] font-black bg-slate-100 text-slate-400">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[80px]">{folder.ownerName?.split(' ')[0]}</span>
                        </div>
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
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-white/80 backdrop-blur-md shadow-lg border border-slate-100 hover:bg-white">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1 border-slate-100 shadow-2xl">
                {!isTrashView ? (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="rounded-xl py-2.5 gap-3 font-bold text-xs cursor-pointer">
                            {file.isFavorite ? <StarOff className="h-3 w-3 text-amber-500" /> : <Star className="h-3 w-3 text-amber-500" />}
                            {file.isFavorite ? 'Unpin asset' : 'Pin to hub'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(file.url, '_blank'); }} className="rounded-xl py-2.5 gap-3 font-bold text-xs cursor-pointer">
                            <Download className="h-3 w-3 text-slate-400" /> Download local
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-xl py-2.5 gap-3 font-bold text-xs text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3 w-3" /> Move to trash
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }} className="rounded-xl py-2.5 gap-3 font-bold text-xs cursor-pointer text-green-600">
                            <CheckCircle2 className="h-3 w-3" /> Restore
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }} className="rounded-xl py-2.5 gap-3 font-bold text-xs text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3 w-3" /> Delete forever
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
                        <span className="text-sm font-bold text-slate-900 truncate max-w-[300px]">{file.name}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400">{formatSize(file.size)}</span>
                            <div className="h-1 w-1 rounded-full bg-slate-200" />
                            <span className="text-[10px] font-bold text-primary">Synced by {file.ownerName}</span>
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
                        <p className="text-sm font-black text-slate-900 truncate leading-tight mb-2 tracking-tighter">{file.name}</p>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>{formatSize(file.size)}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 rounded-lg shadow-sm">
                                <AvatarImage src={file.ownerPhoto} />
                                <AvatarFallback className="text-[8px] font-black bg-slate-100 text-slate-400">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[80px]">{file.ownerName?.split(' ')[0]}</span>
                        </div>
                        {file.isFavorite && !isTrashView && (
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
