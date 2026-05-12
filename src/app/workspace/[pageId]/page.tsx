'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc, onSnapshot, serverTimestamp, setDoc, deleteDoc, collection, getDoc, deleteField, Timestamp } from 'firebase/firestore';
import { Editor } from '@/components/collaboration/Editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronRight, 
  Star, 
  Share2, 
  Smile,
  ImageIcon,
  Trash2,
  CheckCircle,
  Globe,
  AlertTriangle,
  RotateCcw,
  FilePlus,
  FileText,
  Home,
  X,
  Palette,
  Search,
  Loader2,
  Sparkles,
  Lock,
  Clock,
  Copy,
  CheckCircle2
} from 'lucide-react';
import type { CollabPage, SecurityRuleContext, AppUser } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, addHours, addDays } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EMOJI_LIST = [
  { char: '📄', keywords: 'document page file' },
  { char: '📝', keywords: 'note pencil write' },
  { char: '🚀', keywords: 'rocket blast launch' },
  { char: '💡', keywords: 'idea lightbulb' },
  { char: '✅', keywords: 'check mark done' },
  { char: '⚠️', keywords: 'warning alert' },
  { char: '📊', keywords: 'chart graph' },
  { char: '🏢', keywords: 'building office' },
  { char: '💧', keywords: 'water drop' },
  { char: '🌊', keywords: 'water wave' },
  { char: '⭐', keywords: 'star favorite' },
  { char: '🔥', keywords: 'fire hot' },
  { char: '⚡', keywords: 'lightning bolt zap' },
  { char: '🎨', keywords: 'art paint palette' },
  { char: '📣', keywords: 'megaphone announce' },
  { char: '💬', keywords: 'chat message' },
  { char: '📍', keywords: 'location pin' },
  { char: '🎯', keywords: 'target goal' },
  { char: '💰', keywords: 'money bag dollar' },
  { char: '🚛', keywords: 'truck' },
];

/**
 * Structural Skeleton to maintain visual stability during page transitions.
 */
export function PageSkeleton() {
  return (
    <div className="min-h-full flex flex-col bg-white animate-in fade-in duration-500">
      <div className="sticky top-0 z-20 px-8 py-3 flex items-center justify-between bg-white/95 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-3.5 w-3.5 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      <div className="h-[30vh] w-full bg-slate-50/50 animate-pulse" />
      <div className="max-w-4xl mx-auto px-8 pt-10 space-y-6 w-full">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-12 w-3/4 rounded-xl" />
        <div className="space-y-4 pt-4">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Share Component - Functional Link Expiry and Encryption Popover.
 */
function SharePopover({ page, onUpdate }: { page: CollabPage, onUpdate: (data: Partial<CollabPage>) => Promise<void> }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);
    const [isPasswordEnabled, setIsPasswordEnabled] = useState(!!page.sharePassword);
    const [password, setPassword] = useState(page.sharePassword || '');
    const { toast } = useToast();

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/public/${page.shareToken || page.id}` : '';

    const handleTogglePublic = async (enabled: boolean) => {
        setIsUpdating(true);
        const shareToken = page.shareToken || Math.random().toString(36).substring(2, 15);
        const updates: any = { isPublic: enabled };
        if (enabled) updates.shareToken = shareToken;
        else updates.shareToken = deleteField();
        
        await onUpdate(updates);
        setIsUpdating(false);
    };

    const handleExpiryChange = async (value: string) => {
        let expiresAt: any = deleteField();
        const now = new Date();
        if (value === '24h') expiresAt = Timestamp.fromDate(addHours(now, 24));
        if (value === '7d') expiresAt = Timestamp.fromDate(addDays(now, 7));
        await onUpdate({ expiresAt });
    };

    const togglePassword = async (enabled: boolean) => {
        setIsPasswordEnabled(enabled);
        if (!enabled) {
            setPassword('');
            await onUpdate({ sharePassword: deleteField() });
        }
    };

    const savePassword = async () => {
        if (!password.trim()) return;
        await onUpdate({ sharePassword: password });
        toast({ title: 'Security Key Set' });
    };

    const copyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
        toast({ title: 'Link Copied' });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 flex items-center justify-center transition-colors">
                    <Share2 className="h-4 w-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 overflow-hidden border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl bg-white animate-in zoom-in-95 duration-200">
                <div className="p-6 space-y-6">
                    <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Share Document</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Access Control Protocol</p>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-900">Public Access</p>
                            <p className="text-[9px] text-slate-400 font-medium">Allow anyone with link</p>
                        </div>
                        <Switch 
                            checked={page.isPublic || false} 
                            onCheckedChange={handleTogglePublic}
                            disabled={isUpdating}
                        />
                    </div>

                    {page.isPublic && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Shareable link</Label>
                                <div className="flex gap-2">
                                    <Input readOnly value={shareUrl} className="h-9 rounded-lg bg-slate-50 border-slate-100 font-mono text-[10px] shadow-inner truncate" />
                                    <Button onClick={copyLink} variant="outline" className={cn("h-9 px-3 rounded-lg border-slate-100 shadow-sm font-bold text-xs shrink-0 transition-all", hasCopied ? "bg-green-50 text-green-600 border-green-100" : "bg-white")}>
                                        {hasCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                                        <p className="text-[11px] font-bold text-slate-600">Link Expiry</p>
                                    </div>
                                    <Select onValueChange={handleExpiryChange} defaultValue={page.expiresAt ? "active" : "never"}>
                                        <SelectTrigger className="w-[100px] h-8 rounded-lg text-[9px] font-bold uppercase tracking-widest border-slate-100 shadow-none">
                                            <SelectValue placeholder="Expires" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="never" className="text-[9px] font-bold uppercase">Never</SelectItem>
                                            <SelectItem value="24h" className="text-[9px] font-bold uppercase">24 Hours</SelectItem>
                                            <SelectItem value="7d" className="text-[9px] font-bold uppercase">7 Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Lock className="h-3.5 w-3.5 text-slate-400" />
                                            <p className="text-[11px] font-bold text-slate-600">Encryption</p>
                                        </div>
                                        <Switch checked={isPasswordEnabled} onCheckedChange={togglePassword} disabled={isUpdating} />
                                    </div>
                                    {isPasswordEnabled && (
                                        <div className="flex gap-2 animate-in slide-in-from-right-2 duration-300">
                                            <Input placeholder="Access key..." value={password} onChange={(e) => setPassword(e.target.value)} className="h-9 rounded-lg bg-slate-50 border-slate-100 text-[11px] font-bold px-3" disabled={isUpdating} />
                                            <Button size="sm" onClick={savePassword} className="h-9 rounded-lg px-3 font-bold text-[9px] uppercase tracking-widest" disabled={isUpdating}>Set</Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

/**
 * Delete Component - High-Fidelity Floating Deletion Menu.
 */
function DeletePopover({ page, onTrash }: { page: CollabPage, onTrash: () => void }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors" title={page.isTrashed ? "Delete Permanently" : "Move to Trash"}>
                    <Trash2 className="h-4 w-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 overflow-hidden border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl bg-white animate-in zoom-in-95 duration-200">
                <div className="p-6 space-y-6">
                    <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{page.isTrashed ? 'Purge Permanently?' : 'Delete Document?'}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destructive Action Protocol</p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                        <p className="text-xs font-medium text-red-800 leading-relaxed">
                            {page.isTrashed ? 'Irreversible. The document and its full block history will be erased.' : 'Moves document to the trash bin for later restoration.'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 rounded-xl h-10 font-bold text-xs uppercase tracking-widest" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={() => { setIsOpen(false); if (page.isTrashed) { window.dispatchEvent(new CustomEvent('request-permanent-delete-page', { detail: { pageId: page.id } })); } else { onTrash(); } }} className="flex-1 bg-destructive text-white hover:bg-destructive/90 rounded-xl h-10 font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20">
                            {page.isTrashed ? 'Purge' : 'Confirm'}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

/**
 * Main Workspace Page Controller.
 */
function PageEditorContent() {
  const { pageId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt');
  
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [page, setPage] = useState<CollabPage | null>(null);
  const [parentPage, setParentPage] = useState<CollabPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  
  const [localIsTyping, setLocalIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const userDocRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile } = useDoc<AppUser>(userDocRef);

  const latestContentRef = useRef<any>(null);
  const latestTitleRef = useRef<string>('');
  const editorRef = useRef<any>(null);

  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const presenceQuery = useMemoFirebase(() => (firestore && pageId) ? collection(firestore, 'collaboration_pages', pageId as string, 'presence') : null, [firestore, pageId]);
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

  const filteredEmojis = useMemo(() => {
    if (!emojiSearch) return EMOJI_LIST;
    const s = emojiSearch.toLowerCase();
    return EMOJI_LIST.filter(e => e.keywords.includes(s) || e.char.includes(s));
  }, [emojiSearch]);

  const setTypingState = useCallback(async (isTyping: boolean) => {
    if (!firestore || !pageId || !user || isTyping === localIsTyping) return;
    setLocalIsTyping(isTyping);
    const presenceRef = doc(firestore, 'collaboration_pages', pageId as string, 'presence', user.uid);
    updateDoc(presenceRef, { isTyping, lastActive: serverTimestamp() }).catch(() => {});
  }, [firestore, pageId, user, localIsTyping]);

  const triggerTypingIndicator = useCallback(() => {
    setTypingState(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTypingState(false), 3000);
  }, [setTypingState]);

  const forceSave = useCallback(async () => {
    if (!firestore || !pageId || !latestContentRef.current) return;
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    const pageRef = doc(firestore, 'collaboration_pages', pageId as string);
    updateDoc(pageRef, { title: latestTitleRef.current, content: latestContentRef.current, updatedAt: serverTimestamp() }).catch(() => {});
  }, [firestore, pageId]);

  useEffect(() => {
    if (!firestore || !pageId || !user || !userProfile) return;
    setLoading(true);
    setIsDeleting(false);

    const presenceRef = doc(firestore, 'collaboration_pages', pageId as string, 'presence', user.uid);
    const presenceData = {
        userId: user.uid,
        name: userProfile.name || user.email?.split('@')[0] || 'Contributor',
        photoURL: userProfile.photoURL || null,
        lastActive: serverTimestamp(),
        isActive: true,
        isTyping: false
    };
    
    setDoc(presenceRef, presenceData).catch(() => {});

    const pageRef = doc(firestore, 'collaboration_pages', pageId as string);
    const unsub = onSnapshot(pageRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPage({ id: snapshot.id, ...data } as CollabPage);
        latestContentRef.current = data.content;
        latestTitleRef.current = data.title;

        if (data.parentId) {
            const parentSnap = await getDoc(doc(firestore, 'collaboration_pages', data.parentId));
            if (parentSnap.exists()) setParentPage({ id: parentSnap.id, ...parentSnap.data() } as CollabPage);
        }
      } else {
        setIsDeleting(true); 
        setPage(null);
        setTimeout(() => { if (window.location.pathname.includes(pageId as string)) router.push('/workspace'); }, 500);
      }
      setLoading(false);
    }, (err) => {
        if (err.code === 'permission-denied') errorEmitter.emit('permission-error', new FirestorePermissionError({ path: pageRef.path, operation: 'get' }));
        setLoading(false);
    });

    return () => {
        unsub();
        forceSave();
        updateDoc(presenceRef, { isActive: false, isTyping: false, lastActive: serverTimestamp() }).catch(() => {}); 
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [firestore, pageId, router, user, userProfile, forceSave]);

  const handleUpdateTitle = useCallback((newTitle: string) => {
    if (!firestore || !pageId || !page || page.isTrashed) return;
    latestTitleRef.current = newTitle;
    setPage(prev => prev ? { ...prev, title: newTitle } : null);
    triggerTypingIndicator();
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
        setIsSaving(true);
        updateDoc(doc(firestore, 'collaboration_pages', pageId as string), { title: newTitle, updatedAt: serverTimestamp() }).then(() => setTimeout(() => setIsSaving(false), 800));
    }, 1000);
  }, [firestore, pageId, page, triggerTypingIndicator]);

  const handleUpdateContent = useCallback((json: any) => {
    if (!firestore || !pageId || page?.isTrashed) return;
    latestContentRef.current = json;
    triggerTypingIndicator();
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      updateDoc(doc(firestore, 'collaboration_pages', pageId as string), { content: json, updatedAt: serverTimestamp() }).then(() => setTimeout(() => setIsSaving(false), 800));
    }, 1000);
  }, [firestore, pageId, page?.isTrashed, triggerTypingIndicator]);

  const handleUpdateMeta = async (data: Partial<CollabPage>) => {
    if (firestore && page) updateDoc(doc(firestore, 'collaboration_pages', page.id), { ...data, updatedAt: serverTimestamp() });
  };

  const addRandomCover = () => handleUpdateMeta({ coverImage: `https://picsum.photos/seed/${Math.floor(Math.random() * 1000)}/1200/400` });
  const removeCover = () => handleUpdateMeta({ coverImage: '' });
  const setIcon = (icon: string) => handleUpdateMeta({ icon });
  const removeIcon = () => handleUpdateMeta({ icon: '' });

  if (isDeleting || (loading && !page)) return isDeleting ? <div className="h-full flex flex-col items-center justify-center bg-white space-y-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Syncing Changes...</p></div> : <PageSkeleton />;
  if (!page) return <PageSkeleton />;

  return (
    <div className="min-h-full flex flex-col bg-white animate-in fade-in duration-700 relative">
      {page.isTrashed && (
          <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between px-8 animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-red-600" /><p className="text-xs font-bold text-red-900 leading-none">This Document Is In The Trash Bin</p></div>
              <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('request-restore-collab-page', { detail: { pageId: page.id } }))} className="h-8 rounded-xl bg-white border-red-200 text-red-700 font-bold text-[10px] gap-2 hover:bg-red-50"><RotateCcw className="h-3 w-3" /> Restore Document</Button>
                  <DeletePopover page={page} onTrash={() => window.dispatchEvent(new CustomEvent('request-delete-collab-page', { detail: { pageId: page.id } }))} />
              </div>
          </div>
      )}

      <div className="sticky top-0 z-20 px-8 py-3 flex items-center justify-between bg-white/95 border-b backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/workspace"><div className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors"><Home className="h-4 w-4" /></div></Link>
          {parentPage && <><ChevronRight className="h-3.5 w-3.5 text-slate-300" /><Link href={`/workspace/${parentPage.id}`}><span className="text-xs font-semibold text-slate-400 hover:text-slate-900 transition-colors max-w-[120px] truncate block">{parentPage.title || 'Untitled'}</span></Link></>}
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" /><span className="text-xs font-bold text-slate-900 truncate max-w-[180px]">{page.title || 'Untitled'}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-1.5 mr-4">
              {collaborators?.filter(c => c.userId !== user?.uid).map(collab => (
                  <TooltipProvider key={collab.userId}>
                      <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                              <Avatar className={cn("h-6 w-6 border-2 border-white shadow-sm transition-all", !collab.isActive && "grayscale opacity-50", collab.isTyping && "ring-2 ring-primary ring-offset-1 animate-pulse")}>
                                  <AvatarImage src={collab.photoURL} /><AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">{collab.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                          </TooltipTrigger>
                          <TooltipContent className="rounded-2xl px-4 py-3 border-slate-100 shadow-3xl bg-white/80 backdrop-blur-xl border">
                              <p className="text-xs font-black text-slate-900 leading-none">{collab.name}</p>
                              <p className="text-[10px] font-black text-primary leading-none mt-1">{collab.isTyping ? 'Typing currently...' : 'Viewing now'}</p>
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
              ))}
          </div>
          <div className="w-20 flex justify-center">{isSaving ? <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95"><div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /><span className="text-[9px] font-black text-primary">Syncing</span></div> : <div className="flex items-center gap-1.5 opacity-40"><CheckCircle className="h-3 w-3 text-slate-400" /><span className="text-[9px] font-black text-slate-400">Saved</span></div>}</div>
          {!page.isTrashed && <><button onClick={() => window.dispatchEvent(new CustomEvent('request-new-collab-page', { detail: { parentId: page.id } }))} className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 flex items-center justify-center"><FilePlus className="h-4 w-4" /></button><button className={cn("h-8 w-8 rounded-lg transition-colors flex items-center justify-center", page.isFavorite ? "text-amber-500" : "text-slate-400")} onClick={() => window.dispatchEvent(new CustomEvent('request-favorite-collab-page', { detail: { pageId: page.id, isFavorite: !page.isFavorite } }))}><Star className={cn("h-4 w-4", page.isFavorite && "fill-current")} /></button><SharePopover page={page} onUpdate={handleUpdateMeta} /><DeletePopover page={page} onTrash={() => window.dispatchEvent(new CustomEvent('request-delete-collab-page', { detail: { pageId: page.id } }))} /></>}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {page.coverImage && (
            <div className="h-[30vh] w-full relative group">
                <Image src={page.coverImage} alt="Cover" fill className="object-cover" />
                {!page.isTrashed && <div className="absolute bottom-6 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="secondary" size="sm" onClick={addRandomCover} className="h-8 rounded-lg bg-white/90 backdrop-blur-md font-bold text-[10px] uppercase tracking-widest">Change Cover</Button><Button variant="secondary" size="sm" onClick={removeCover} className="h-8 rounded-lg bg-white/90 backdrop-blur-md font-bold text-[10px] uppercase tracking-widest text-red-600">Remove</Button></div>}
            </div>
        )}
        <div className="max-w-4xl mx-auto px-8 pt-10 pb-32">
            {page.icon && <div className="relative group/icon z-10 w-fit"><div className="text-5xl select-none pt-4">{page.icon}</div>{!page.isTrashed && <div className="absolute -top-2 -right-6 opacity-0 group/icon:opacity-100"><Button size="icon" onClick={removeIcon} className="h-6 w-6 rounded-full bg-white shadow-lg text-red-500"><X className="h-3 w-3" /></Button></div>}</div>}
            {!page.isTrashed && <div className="flex gap-4 opacity-0 hover:opacity-100 mb-4">{!page.icon && <Popover onOpenChange={() => setEmojiSearch('')}><PopoverTrigger asChild><Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-slate-400">Add Icon</Button></PopoverTrigger><PopoverContent align="start" className="w-64 p-3 rounded-2xl border-slate-100 shadow-3xl bg-white"><div className="space-y-3"><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><Input placeholder="Search emojis..." className="pl-8 h-8 text-[10px] bg-slate-50 border-none shadow-inner" value={emojiSearch} onChange={(e) => setEmojiSearch(e.target.value)} /></div><ScrollArea className="h-32 pr-2"><div className="grid grid-cols-5 gap-1">{filteredEmojis.map(e => (<button key={e.char} onClick={() => setIcon(e.char)} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-2xl">{e.char}</button>))}</div></ScrollArea></div></PopoverContent></Popover>}{!page.coverImage && <Button variant="ghost" size="sm" onClick={addRandomCover} className="h-7 text-[10px] font-bold text-slate-400">Add Cover</Button>}</div>}
            <input value={page.title} placeholder="Untitled" onKeyDown={(e) => e.key === 'Enter' && editorRef.current?.focus()} onChange={(e) => handleUpdateTitle(e.target.value)} className="appearance-none border-0 shadow-none ring-0 focus:ring-0 focus:outline-none p-0 font-black text-4xl h-auto bg-transparent placeholder:text-slate-100 mb-6 w-full text-slate-900 block" readOnly={page.isTrashed} />
            <div className="animate-in fade-in duration-1000 delay-200"><Editor ref={editorRef} key={page.id} initialContent={page.content} initialPrompt={initialPrompt} onContentChange={handleUpdateContent} editable={!page.isTrashed} /></div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function PageEditor() {
  return <Suspense fallback={<PageSkeleton />}><PageEditorContent /></Suspense>;
}
