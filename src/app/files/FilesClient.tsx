
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Download,
  Loader2,
  MoreHorizontal,
  StarOff,
  Home,
  X,
  PlayCircle,
  Maximize2,
  FileUp,
  RotateCcw,
  ChevronLeft,
  Menu
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, orderBy, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { CloudFile, CloudFolder, AppUser, Notification as NotificationType } from '@/lib/types';
import { FullScreenLoader } from '@/components/ui/loader';
import { uploadWorkspaceFile, isRiverBlobUrl, resolveWorkspaceFileSrc } from '@/lib/storage-utils';
import { useToast } from '@/hooks/use-toast';
import { getWorkspaceCompanyId, getHomePath } from '@/lib/workspace-access';
import { FilesSidebar, type FilesView } from '@/components/files/FilesSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
import Image from 'next/image';

const STORAGE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB
const FILE_ACCEPT = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.mp4,.mov,.webm,.mkv,.mp3,.wav,.png,.jpg,.jpeg,.gif,.webp,.svg';

function isImageType(type: string) {
  return type.startsWith('image/');
}
function isVideoType(type: string) {
  return type.startsWith('video/');
}
function isAudioType(type: string) {
  return type.startsWith('audio/');
}
function isPdfType(type: string, name = '') {
  return type === 'application/pdf' || type.includes('pdf') || /\.pdf$/i.test(name);
}
function isOfficeType(type: string, name = '') {
  return type.includes('officedocument') || type.includes('msword') || type.includes('ms-excel') || type.includes('ms-powerpoint') || /\.(docx?|xlsx?|pptx?)$/i.test(name);
}
function isDocumentType(type: string, name = '') {
  return isPdfType(type, name) || isOfficeType(type, name) || type.startsWith('text/') || type.includes('csv') || /\.(txt|csv|md|rtf)$/i.test(name);
}

export default function FilesClient() {
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filesView, setFilesView] = useState<FilesView>('all');
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);
  const previewSrc = useWorkspaceMediaSrc(previewFile);
  const [isDragging, setIsDragging] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('Uploading');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const companyId = getWorkspaceCompanyId(user) || 'unassigned';

  // Real-time Presence Logic
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

  // Update Presence Status
  useEffect(() => {
    if (!firestore || !user || !user.id || companyId === 'unassigned') return;

    const presenceRef = doc(firestore, 'hr_companies', companyId, 'files_presence', user.id);
    const presenceData = {
        id: user.id,
        name: user.name || user.email?.split('@')[0] || 'Collaborator',
        photoURL: user.photoURL || null,
        lastActive: serverTimestamp(),
        isActive: true,
        lastPath: pathname
    };
    
    setDoc(presenceRef, presenceData).catch(() => {});

    return () => {
        if (user?.id) {
            updateDoc(presenceRef, { 
                isActive: false, 
                lastActive: serverTimestamp() 
            }).catch(() => {}); 
        }
    };
  }, [firestore, user, companyId, pathname]);

  // Shared Data Queries
  const foldersQuery = useMemoFirebase(
    () => (firestore && companyId !== 'unassigned') ? query(
        collection(firestore, 'cloud_folders'),
        where('companyId', '==', companyId)
    ) : null,
    [firestore, companyId]
  );
  const { data: allFolders, isLoading: loadingFolders } = useCollection<CloudFolder>(foldersQuery);

  const filesQuery = useMemoFirebase(
    () => (firestore && companyId !== 'unassigned') ? query(
        collection(firestore, 'cloud_files'),
        where('companyId', '==', companyId)
    ) : null,
    [firestore, companyId]
  );
  const { data: allFiles, isLoading: loadingFiles } = useCollection<CloudFile>(filesQuery);

  const notificationsQuery = useMemoFirebase(
    () => (firestore && authUser) ? query(collection(firestore, 'users', authUser.uid, 'notifications'), orderBy('date', 'desc')) : null,
    [firestore, authUser]
  );
  const { data: notifications } = useCollection<NotificationType>(notificationsQuery);

  // Filtered Views
  const currentFolders = useMemo(() => {
    if (!allFolders) return [];
    let list = allFolders;
    if (filesView === 'trash') {
        list = list.filter(f => f.isTrashed);
    } else {
        list = list.filter(f => !f.isTrashed);
        if (filesView === 'favorites') {
            list = list.filter(f => f.isFavorite);
        } else if (filesView === 'all') {
            list = list.filter(f => f.parentId === currentFolderId);
        } else {
            list = [];
        }
    }
    if (searchTerm) {
        list = list.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [allFolders, currentFolderId, searchTerm, filesView]);

  const currentFiles = useMemo(() => {
    if (!allFiles) return [];
    let list = allFiles;
    if (filesView === 'trash') {
        list = list.filter(f => f.isTrashed);
    } else {
        list = list.filter(f => !f.isTrashed);
        if (filesView === 'favorites') {
            list = list.filter(f => f.isFavorite);
        } else if (filesView === 'images') {
            list = list.filter(f => isImageType(f.type));
        } else if (filesView === 'videos') {
            list = list.filter(f => isVideoType(f.type));
        } else if (filesView === 'documents') {
            list = list.filter(f => isDocumentType(f.type, f.name));
        } else {
            list = list.filter(f => f.folderId === currentFolderId);
        }
    }
    if (searchTerm) {
        list = list.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [allFiles, currentFolderId, searchTerm, filesView]);

  const sidebarFolders = useMemo(
    () => (allFolders || []).filter(f => !f.isTrashed),
    [allFolders]
  );

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
    return allFiles.filter(f => !f.isTrashed).reduce((acc, f) => acc + (Number(f.size) || 0), 0);
  }, [allFiles]);

  const storagePercentage = (companyUsedStorage / STORAGE_QUOTA_BYTES) * 100;

  // File Upload Logic
  const performUpload = async (file: File) => {
    if (!file || !firestore || !storage || !auth?.currentUser) {
        toast({ variant: 'destructive', title: 'Session Required', description: 'Please ensure you are logged in.' });
        return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'destructive', title: 'File Too Large', description: `${file.name} exceeds the 500MB limit.` });
        return;
    }

    if (companyUsedStorage + file.size > STORAGE_QUOTA_BYTES) {
        toast({ variant: 'destructive', title: 'Storage Full', description: 'Your team reached the 2GB limit.' });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadLabel(file.name);

    try {
        const { url, storagePath, fileId } = await uploadWorkspaceFile(storage, auth, firestore, companyId, file, setUploadProgress);

        const newFileData = {
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            url,
            storagePath,
            folderId: currentFolderId,
            ownerId: auth.currentUser.uid,
            ownerName: user?.name || auth.currentUser.email?.split('@')[0] || 'Member',
            ownerPhoto: user?.photoURL || '',
            companyId: companyId,
            isFavorite: false,
            isTrashed: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        if (fileId) {
            await setDoc(doc(firestore, 'cloud_files', fileId), newFileData);
        } else {
            await addDoc(collection(firestore, 'cloud_files'), newFileData);
        }
        toast({ title: 'File uploaded', description: file.name });
    } catch (e) {
        console.error("Upload process error:", e);
        toast({ variant: 'destructive', title: 'Upload Failed', description: e instanceof Error ? e.message : 'Could not write to the team workspace drive.' });
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadLabel('Uploading');
    }
  };

  const performUploads = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    for (const file of files) {
      await performUpload(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) performUploads(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      performUploads(files);
    }
  };

  // Organizational Management Handlers
  const handleCreateFolder = async () => {
    if (!firestore || !authUser || !newFolderName.trim()) return;
    const newFolderData = {
        name: newFolderName.trim(),
        parentId: currentFolderId,
        ownerId: authUser.uid,
        ownerName: user?.name || authUser.email?.split('@')[0] || 'Member',
        ownerPhoto: user?.photoURL || '',
        companyId: companyId,
        isFavorite: false,
        isTrashed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    try {
        await addDoc(collection(firestore, 'cloud_folders'), newFolderData);
        toast({ title: 'Folder created' });
        setIsNewFolderOpen(false);
        setNewFolderName('');
    } catch (e) {
        toast({ variant: 'destructive', title: 'Create Failed' });
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
        toast({ variant: 'destructive', title: 'Action Blocked' });
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
        toast({ title: 'Restored' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Action Failed' });
    }
  };

  const permanentDelete = async (item: CloudFile | CloudFolder, collectionName: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, collectionName, item.id));
        toast({ title: 'Deleted forever' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Delete Blocked' });
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

  const handleViewChange = (view: FilesView) => {
    setFilesView(view);
    if (view !== 'all') setCurrentFolderId(null);
    setIsMobileSidebarOpen(false);
  };

  const sidebarContent = (
    <FilesSidebar
      isOpen={isSidebarOpen || isMobile}
      view={filesView}
      onViewChange={handleViewChange}
      folders={sidebarFolders}
      currentFolderId={currentFolderId}
      onOpenFolder={(id) => { setFilesView('all'); setCurrentFolderId(id); setIsMobileSidebarOpen(false); }}
      onUpload={() => fileInputRef.current?.click()}
      onNewFolder={() => { setIsNewFolderOpen(true); setIsMobileSidebarOpen(false); }}
      storageLabel={`${formatSize(companyUsedStorage)} of 2 GB`}
      storagePercent={storagePercentage}
      user={user}
    />
  );

  if (isUserLoading || isUserDocLoading) return <FullScreenLoader text="Loading..." />;

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple
        accept={FILE_ACCEPT}
        onChange={handleFileUpload}
        disabled={isUploading}
      />

      <div className="relative h-full shrink-0">
        {!isMobile && sidebarContent}
        {!isMobile && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            className="absolute top-1/2 z-40 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            style={{ left: isSidebarOpen ? 'calc(18rem - 16px)' : '8px' }}
          >
            {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-white">
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md shadow-sm sm:h-16 sm:px-6">
        {isMobile ? (
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-none">
              <SheetHeader className="sr-only">
                <SheetTitle>Files Navigation</SheetTitle>
              </SheetHeader>
              {sidebarContent}
            </SheetContent>
          </Sheet>
        ) : null}
        {isMobile ? (
          <Link href={getHomePath(user)} className="flex items-center gap-2">
            <LogoBlack className="h-8 w-8" />
          </Link>
        ) : null}
        <div className="flex-1" />
        <div className="flex items-center gap-2 sm:gap-6">
          <TooltipProvider delayDuration={0}>
             <div className="flex -space-x-1.5 mr-2">
                {collaborators?.filter(c => c.id !== authUser?.uid).map(collab => {
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
                                <p className="text-xs font-bold text-slate-900 leading-none">
                                    {collab.name}
                                </p>
                                {!isOnline ? (
                                    <p className="text-[10px] font-bold text-slate-400 leading-none mt-1">
                                        Last seen {formatDistanceToNow(lastActiveDate, { addSuffix: true })}
                                    </p>
                                ) : (
                                    <p className="text-[10px] font-bold text-primary leading-none mt-1">
                                        Online
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

      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
          {/* Main files area */}
          <main className="flex-1 overflow-auto bg-white relative" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
             {/* Drop Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-4 border-primary border-dashed rounded-xl m-4 flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="p-6 rounded-full bg-white shadow-2xl scale-110 animate-bounce">
                        <FileUp className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-primary">Drop to upload</h3>
                    <p className="text-sm text-primary/60 mt-2">Release to add these files</p>
                </div>
            )}

            <div className="h-14 border-b flex items-center justify-between px-6 bg-white/95 backdrop-blur-sm shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                    <button 
                        onClick={() => { setFilesView('all'); setCurrentFolderId(null); }}
                        className={cn(
                        "p-2 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors", 
                        filesView === 'all' && !currentFolderId && "text-slate-900"
                        )}
                    >
                        <Home className="h-4 w-4" />
                    </button>
                    {filesView !== 'all' && (
                      <>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 capitalize">{filesView}</span>
                      </>
                    )}
                    {filesView === 'all' && currentFolderPath.map((folder, idx) => (
                        <React.Fragment key={folder.id}>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        <button 
                            onClick={() => { setFilesView('all'); setCurrentFolderId(folder.id); }}
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
                        placeholder="Search files..." 
                        className="h-9 pl-9 rounded-xl bg-slate-50 border-none shadow-inner text-xs font-semibold"
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
                        <Button className="h-9 px-4 rounded-xl font-bold text-xs gap-2 shadow-lg shadow-primary/10">
                            <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1 border-slate-100 shadow-2xl">
                        <DropdownMenuItem className="rounded-xl py-2.5 gap-3 font-semibold text-xs cursor-pointer" onClick={() => setIsNewFolderOpen(true)}>
                            <FolderPlus className="h-4 w-4 text-blue-500" /> Create Folder
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem className="rounded-xl py-2.5 gap-3 font-semibold text-xs cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-4 w-4 text-primary" /> 
                            Upload
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

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
                    <h3 className="text-xl font-bold text-slate-900 leading-none">No files yet</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-4 max-w-[220px] leading-relaxed">Drop a file or create a folder.</p>
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
                        onOpen={() => { setFilesView('all'); setCurrentFolderId(folder.id); }}
                        onFavorite={() => toggleFavorite(folder, 'cloud_folders')}
                        onDelete={() => moveToTrash(folder, 'cloud_folders')}
                        onRestore={() => restoreFromTrash(folder, 'cloud_folders')}
                        onPermanentDelete={() => permanentDelete(folder, 'cloud_folders')}
                        isTrashView={filesView === 'trash'}
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
                        onPreview={() => setPreviewFile(file)}
                        formatSize={formatSize}
                        isTrashView={filesView === 'trash'}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </main>
      </div>
      </div>

      {isUploading && (
        <div className="fixed bottom-8 right-8 z-[100] bg-slate-900 text-white p-5 rounded-3xl shadow-3xl border border-white/10 flex flex-col gap-4 min-w-[320px] animate-in slide-in-from-bottom-10 duration-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Uploading</p>
                        <p className="text-[8px] font-semibold text-slate-400 mt-1 truncate max-w-[180px]">{uploadLabel}</p>
                    </div>
                </div>
                <span className="text-xs font-bold tabular-nums">{uploadProgress.toFixed(0)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1 bg-white/10 [&>div]:bg-white" />
        </div>
      )}

      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-3xl p-8 bg-white">
            <DialogHeader className="space-y-4">
                <div className="p-3 w-fit rounded-xl bg-blue-50 text-blue-600">
                    <FolderPlus className="h-5 w-5" />
                </div>
                <div>
                    <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">New folder</DialogTitle>
                    <DialogDescription className="sr-only">Create a folder</DialogDescription>
                </div>
            </DialogHeader>
            <div className="py-6">
                <Label className="text-[10px] font-bold text-slate-400 ml-1">Folder name</Label>
                <Input 
                    autoFocus
                    placeholder="Folder name" 
                    className="h-12 rounded-xl bg-slate-50 border-slate-100 font-semibold px-4 mt-2 text-sm shadow-inner"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
            </div>
            <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setIsNewFolderOpen(false)} className="rounded-xl h-10 font-bold text-xs text-slate-400">Cancel</Button>
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="rounded-xl h-10 px-8 font-bold text-xs shadow-lg">
                    Create
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-none shadow-3xl bg-slate-900 rounded-[2.5rem]">
            <div className="flex flex-col h-[80vh]">
                <div className="p-6 flex items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-white/10 text-white">
                            {previewFile && getFileIcon(previewFile.type)}
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-lg font-bold text-white truncate">{previewFile?.name}</DialogTitle>
                            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {previewFile && formatSize(previewFile.size)} • Uploaded by {previewFile?.ownerName}
                            </DialogDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl" onClick={() => { if (previewSrc) window.open(previewSrc, '_blank'); }}>
                            <Download className="h-5 w-5" />
                        </Button>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl">
                                <X className="h-5 w-5" />
                            </Button>
                        </DialogClose>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-8 bg-black/40 relative min-h-0">
                    {previewFile && previewSrc && mediaElement(previewSrc, previewFile.type, previewFile.name) ? (
                        mediaElement(previewSrc, previewFile.type, previewFile.name)
                    ) : previewFile && !previewSrc && isRiverBlobUrl(previewFile.url) ? (
                        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="p-10 rounded-[3rem] bg-white/10 text-white/20">
                                <FileText className="h-24 w-24" />
                            </div>
                            <div className="space-y-4">
                                <p className="text-white font-bold text-lg">Can't preview this file</p>
                                {previewSrc ? (
                                <Button asChild className="rounded-xl h-12 px-10 font-bold">
                                    <a href={previewSrc} download={previewFile?.name}>Download</a>
                                </Button>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-6 bg-black/20 border-t border-white/5 flex items-center justify-end">
                    <div className="flex items-center gap-3">
                         <Button variant="outline" className="rounded-xl h-9 text-[10px] font-bold uppercase tracking-widest bg-transparent text-white border-white/10 hover:bg-white hover:text-slate-900" onClick={() => { if (previewSrc) window.open(previewSrc, '_blank'); }}>
                            <Download className="mr-2 h-3.5 w-3.5" /> Open
                         </Button>
                    </div>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function useWorkspaceMediaSrc(file: { url: string; type?: string } | null) {
  const firestore = useFirestore();
  const [src, setSrc] = useState(file && !isRiverBlobUrl(file.url) ? file.url : '');

  useEffect(() => {
    if (!file?.url) {
      setSrc('');
      return;
    }
    if (!isRiverBlobUrl(file.url)) {
      setSrc(file.url);
      return;
    }
    if (!firestore) return;

    let cancelled = false;
    let objectUrl = '';
    resolveWorkspaceFileSrc(firestore, file).then((resolved) => {
      if (cancelled) {
        if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved);
        return;
      }
      objectUrl = resolved;
      setSrc(resolved);
    }).catch(() => {
      if (!cancelled) setSrc('');
    });

    return () => {
      cancelled = true;
      if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
    };
  }, [firestore, file?.url, file?.type]);

  return src;
}

function mediaElement(src: string, type: string, name: string) {
  const isLocal = src.startsWith('data:') || src.startsWith('blob:');
  if (type.startsWith('image/')) {
    if (isLocal) {
      return <img src={src} alt={name} className="max-h-full max-w-full object-contain" />;
    }
    return (
      <div className="relative w-full h-full">
        <Image src={src} alt={name} fill className="object-contain" unoptimized />
      </div>
    );
  }
  if (type.startsWith('video/')) {
    return <video src={src} controls autoPlay playsInline className="max-w-full max-h-full rounded-2xl shadow-2xl" />;
  }
  if (type.startsWith('audio/')) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="p-10 rounded-[3rem] bg-white/10 text-primary">
          <Music className="h-20 w-20" />
        </div>
        <audio src={src} controls className="w-80" />
      </div>
    );
  }
  if (type === 'application/pdf' || type.includes('pdf') || /\.pdf$/i.test(name)) {
    return <iframe title={name} src={src} className="w-full h-full rounded-2xl bg-white" />;
  }
  if (!isLocal && (type.includes('officedocument') || type.includes('msword') || /\.(docx?|xlsx?|pptx?)$/i.test(name))) {
    return (
      <iframe
        title={name}
        src={`https://docs.google.com/gview?url=${encodeURIComponent(src)}&embedded=true`}
        className="w-full h-full rounded-2xl bg-white"
      />
    );
  }
  if (type.startsWith('text/') || /\.(txt|csv|md)$/i.test(name)) {
    return <iframe title={name} src={src} className="w-full h-full rounded-2xl bg-white" />;
  }
  return null;
}

function FolderItem({ folder, viewMode, onOpen, onFavorite, onDelete, onRestore, onPermanentDelete, isTrashView }: any) {
    const initials = folder.ownerName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?';

    const Actions = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 border-slate-100 shadow-2xl">
                {!isTrashView ? (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="rounded-xl py-2.5 gap-3 font-semibold text-xs cursor-pointer">
                            {folder.isFavorite ? <StarOff className="h-3.5 w-3.5 text-amber-500" /> : <Star className="h-3.5 w-3.5 text-amber-500" />}
                            {folder.isFavorite ? 'Remove from Starred' : 'Add to Starred'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-xl py-2.5 gap-3 font-semibold text-xs text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" /> Move to Trash
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }} className="rounded-xl py-2.5 gap-3 font-semibold text-xs cursor-pointer text-green-600">
                            <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }} className="rounded-xl py-2.5 gap-3 font-semibold text-xs text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" /> Delete Forever
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
                             <span className="text-[10px] font-semibold text-slate-400">Added by {folder.ownerName}</span>
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
        <Card className="border-none shadow-none rounded-[2rem] bg-slate-50/50 group hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 cursor-pointer relative overflow-hidden animate-in zoom-in-95" onClick={onOpen}>
            <CardContent className="p-6">
                <div className="absolute top-4 right-4 z-20">
                    <Actions />
                </div>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="p-5 rounded-[2rem] bg-white text-primary shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                            <Folder className="h-8 w-8 fill-current" />
                        </div>
                        <div className="min-w-0 w-full">
                            <p className="text-sm font-bold text-slate-900 truncate px-2 leading-none mb-1.5">{folder.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Folder</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100/50">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 rounded-lg shadow-sm border-2 border-white">
                                <AvatarImage src={folder.ownerPhoto} />
                                <AvatarFallback className="text-[8px] font-bold bg-slate-100 text-slate-400">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[60px]">{folder.ownerName?.split(' ')[0]}</span>
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

function FileThumb({ file, icon }: { file: CloudFile; icon: React.ReactNode }) {
    const src = useWorkspaceMediaSrc(file);
    if (src && isImageType(file.type)) {
        return (
            <img
                src={src}
                alt={file.name}
                className="h-full w-full object-cover"
            />
        );
    }
    if (src && isVideoType(file.type)) {
        return (
            <video
                src={src}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
            />
        );
    }
    return <>{icon}</>;
}

function FileItem({ file, viewMode, icon, onFavorite, onDelete, onRestore, onPermanentDelete, onPreview, formatSize, isTrashView }: any) {
    const initials = file.ownerName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?';
    const downloadSrc = useWorkspaceMediaSrc(file);

    const Actions = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 border-slate-100 shadow-2xl">
                {!isTrashView ? (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(); }} className="rounded-xl py-2.5 gap-3 font-semibold text-xs cursor-pointer">
                            <Maximize2 className="h-3.5 w-3.5 text-slate-400" /> Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="rounded-xl py-2.5 gap-3 font-semibold text-xs cursor-pointer">
                            {file.isFavorite ? <StarOff className="h-3.5 w-3.5 text-amber-500" /> : <Star className="h-3.5 w-3.5 text-amber-500" />}
                            {file.isFavorite ? 'Remove from Starred' : 'Add to Starred'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (downloadSrc) window.open(downloadSrc, '_blank'); }} className="rounded-xl py-2.5 gap-3 font-semibold text-xs cursor-pointer">
                            <Download className="h-3.5 w-3.5 text-slate-400" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-xl py-2.5 gap-3 font-semibold text-xs text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" /> Move to Trash
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }} className="rounded-xl py-2.5 gap-3 font-semibold text-xs cursor-pointer text-green-600">
                            <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }} className="rounded-xl py-2.5 gap-3 font-semibold text-xs text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" /> Delete Forever
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    if (viewMode === 'list') {
        return (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-xl transition-all group animate-in fade-in duration-500">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={onPreview}>
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center shadow-inner border border-slate-100 group-hover:bg-primary/5 transition-all overflow-hidden">
                        <FileThumb file={file} icon={icon} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 truncate max-w-[300px]">{file.name}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-semibold text-slate-400">{formatSize(file.size)}</span>
                            <div className="h-1 w-1 rounded-full bg-slate-200" />
                            <span className="text-[10px] font-semibold text-primary">Uploaded by {file.ownerName}</span>
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
        <Card className="border-none shadow-none rounded-[2rem] bg-slate-50/50 group hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 cursor-pointer relative overflow-hidden animate-in zoom-in-95" onClick={onPreview}>
            <CardContent className="p-6">
                <div className="absolute top-4 right-4 z-20">
                    <Actions />
                </div>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="h-16 w-16 rounded-[1.5rem] bg-white flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-all duration-500 shadow-sm border border-slate-100 relative overflow-hidden">
                            <FileThumb file={file} icon={icon} />
                            {isVideoType(file.type) && (
                                <PlayCircle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </div>
                        <div className="min-w-0 w-full">
                            <p className="text-sm font-bold text-slate-900 truncate leading-none mb-1.5 px-2">{file.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatSize(file.size)}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100/50">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 rounded-lg shadow-sm border-2 border-white">
                                <AvatarImage src={file.ownerPhoto} />
                                <AvatarFallback className="text-[8px] font-bold bg-slate-100 text-slate-400">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[60px]">{file.ownerName?.split(' ')[0]}</span>
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
