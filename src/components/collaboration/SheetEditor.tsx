'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
    Grid, 
    Plus,
    Search,
    Filter,
    ArrowUpDown,
    ChevronDown,
    Type,
    Trash2,
    Settings2,
    X,
    Maximize2,
    Edit,
    Check,
    Loader2,
    PlusCircle,
    Copy,
    EyeOff,
    Rows,
    RotateCcw,
    Layout,
    GripVertical,
    HelpCircle,
    ChevronRight,
    Users,
    ChevronDownCircle,
    GanttChart,
    Calendar as CalendarIcon,
    MoreVertical,
    CheckSquare,
    ChevronUp,
    Send,
    MessageSquare,
    UserCircle,
    CornerDownRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import { 
    Popover,
    PopoverContent,
    PopoverTrigger 
} from '@/components/ui/popover';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { SheetField, SheetRecord, SheetView, SheetFieldType, SheetViewType, RowHeight, AppUser, SheetComment } from '@/lib/types';
import { useMounted } from '@/hooks/use-mounted';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogClose 
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useCollection, useMemoFirebase, useFirestore, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { createClientNotification } from '@/lib/notifications';

// Specialized Sub-Modules
import { FIELD_ICONS, VIEW_ICONS, FIELD_TYPES, CURRENCY_SYMBOLS, ROW_HEIGHT_OPTIONS } from './sheet/constants';
import { CellRenderer } from './sheet/CellRenderer';
import { KanbanView } from './sheet/KanbanView';
import { CalendarView } from './sheet/CalendarView';
import { GanttView } from './sheet/GanttView';

interface SheetEditorProps {
  initialData: any;
  onContentChange: (json: any) => void;
  editable?: boolean;
  companyId?: string;
}

interface FilterRule {
    id: string;
    fieldId: string;
    operator: 'contains' | 'is' | 'is_not' | 'is_empty';
    value: string;
}

interface SortRule {
    id: string;
    fieldId: string;
    direction: 'asc' | 'desc';
}

export function SheetEditor({ initialData, onContentChange, editable = true, companyId }: SheetEditorProps) {
  const isMounted = useMounted();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: currentUserProfile } = useDoc<AppUser>(userDocRef);

  const effectiveCompanyId = companyId || currentUserProfile?.companyId;

  const teamQuery = useMemoFirebase(() => effectiveCompanyId ? query(collection(firestore!, 'users'), where('companyId', '==', effectiveCompanyId)) : null, [firestore, effectiveCompanyId]);
  const { data: teamMembers } = useCollection<AppUser>(teamQuery);

  const [fields, setFields] = useState<SheetField[]>(() => {
    if (initialData?.fields && initialData.fields.length > 0) return initialData.fields;
    return [
      { id: 'f1', name: 'Primary Item', type: 'text', isPrimary: true, width: 250 },
      { id: 'f2', name: 'Status', type: 'status', options: [{label: 'Todo', color: 'bg-slate-100 text-slate-700'}, {label: 'In Progress', color: 'bg-blue-50 text-blue-700'}, {label: 'Done', color: 'bg-green-50 text-green-700'}], width: 150 },
      { id: 'f3', name: 'Due Date', type: 'date', width: 150 }
    ];
  });

  const [records, setRecords] = useState<SheetRecord[]>(() => {
    if (initialData?.records && initialData.records.length > 0) return initialData.records;
    return [
      { id: 'r1', values: { f1: 'Initialize Workspace', f2: 'In Progress', f3: format(new Date(), 'yyyy-MM-dd') }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), comments: [] },
    ];
  });

  const [views, setViews] = useState<SheetView[]>(() => {
    if (initialData?.views && initialData.views.length > 0) return initialData.views;
    return [
      { id: 'v1', name: 'Main Grid', type: 'grid', config: { hiddenFields: [], rowHeight: 'medium', wrapHeaders: false, sorts: [], groupByFieldId: '' } },
      { id: 'v2', name: 'Board', type: 'kanban', config: { hiddenFields: [], sorts: [] } },
      { id: 'v3', name: 'Calendar', type: 'calendar', config: { hiddenFields: [], sorts: [] } },
      { id: 'v4', name: 'Gantt', type: 'gantt', config: { hiddenFields: [], sorts: [] } }
    ];
  });

  const [activeViewId, setActiveViewId] = useState(initialData?.activeViewId || 'v1');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [sortRules, setSortRules] = useState<SortRule[]>(initialData?.views?.find((v: any) => v.id === initialData?.activeViewId)?.config?.sorts || []);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const [detailRecordId, setDetailRecordId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  const detailRecord = useMemo(() => records.find(r => r.id === detailRecordId), [records, detailRecordId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const activeView = useMemo(() => {
    if (!views || views.length === 0) return { id: 'v1', type: 'grid', config: {} } as SheetView;
    return views.find(v => v.id === activeViewId) || views[0];
  }, [views, activeViewId]);

  const sync = useCallback((newFields: SheetField[], newRecords: SheetRecord[], newViews: SheetView[], newViewId: string) => {
      if (!editable) return;
      setIsSyncing(true);
      onContentChange({ fields: newFields, records: newRecords, views: newViews, activeViewId: newViewId });
      setTimeout(() => setIsSyncing(false), 500);
  }, [onContentChange, editable]);

  const addRecord = useCallback((index?: number) => {
    const newRecord: SheetRecord = {
        id: `r-${Date.now()}`,
        values: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: []
    };
    const next = [...records];
    if (typeof index === 'number') next.splice(index, 0, newRecord);
    else next.unshift(newRecord);
    setRecords(next);
    sync(fields, next, views, activeViewId);
  }, [records, fields, views, activeViewId, sync]);

  const deleteRecord = useCallback((id: string) => {
      const next = records.filter(r => r.id !== id);
      setRecords(next);
      sync(fields, next, views, activeViewId);
      toast({ title: 'Record Purged', description: 'Item has been permanently removed from the ledger.' });
  }, [records, fields, views, activeViewId, sync, toast]);

  const duplicateRecord = useCallback((id: string) => {
      const target = records.find(r => r.id === id);
      if (!target) return;
      const newRecord: SheetRecord = {
          ...target,
          id: `r-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          comments: []
      };
      const idx = records.findIndex(r => r.id === id);
      const next = [...records];
      next.splice(idx + 1, 0, newRecord);
      setRecords(next);
      sync(fields, next, views, activeViewId);
  }, [records, fields, views, activeViewId, sync]);

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || !detailRecordId || !user || !currentUserProfile) return;

    const newComment: SheetComment = {
        id: `c-${Date.now()}`,
        userId: user.uid,
        userName: currentUserProfile.name || 'Contributor',
        userPhoto: currentUserProfile.photoURL || null,
        text: commentText.trim(),
        timestamp: new Date().toISOString(),
        parentId: replyingToId
    };

    const nextRecords = records.map(r => {
        if (r.id === detailRecordId) {
            return { ...r, comments: [...(r.comments || []), newComment] };
        }
        return r;
    });

    setRecords(nextRecords);
    sync(fields, nextRecords, views, activeViewId);
    setCommentText('');
    setReplyingToId(null);

    // Notify tagged members
    if (commentText.includes('@')) {
        const mentioned = teamMembers?.filter(m => commentText.includes(`@${m.name}`));
        mentioned?.forEach(m => {
            if (m.id !== user.uid && effectiveCompanyId) {
                createClientNotification(firestore!, m.id, {
                    type: 'general',
                    title: 'Tagged in record',
                    description: `${currentUserProfile.name} mentioned you in a collaborative record discussion.`,
                    data: { pageId: initialData.id, recordId: detailRecordId }
                });
            }
        });
    }
  };

  const handleSwitchView = useCallback((id: string) => {
      setActiveViewId(id);
      sync(fields, records, views, id);
  }, [fields, records, views, sync]);

  const visibleFields = useMemo(() => {
      const hidden = activeView.config?.hiddenFields || [];
      return fields.filter(f => !hidden.includes(f.id));
  }, [fields, activeView]);

  const filteredRecords = useMemo(() => {
    let list = [...records];
    if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase().trim();
        list = list.filter(r => Object.values(r.values).some(v => String(v).toLowerCase().includes(s)));
    }
    return list;
  }, [records, debouncedSearch]);

  const filteredTeam = useMemo(() => {
    if (!teamMembers) return [];
    if (!tagSearch) return teamMembers;
    return teamMembers.filter(m => m.name.toLowerCase().includes(tagSearch.toLowerCase()));
  }, [teamMembers, tagSearch]);

  if (!isMounted) return null;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden select-none h-full font-sans">
        {/* Toolbar */}
        <div className="h-14 border-b flex items-center justify-between px-6 bg-white shrink-0 z-30">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pr-4">
                {views.map(v => {
                    const ViewIcon = VIEW_ICONS[v.type] || Grid;
                    const isActive = v.id === activeViewId;
                    return (
                        <button key={v.id} onClick={() => handleSwitchView(v.id)} className={cn("flex items-center gap-2 px-4 h-9 rounded-xl font-bold text-xs transition-all shrink-0", isActive ? "bg-primary/10 text-primary border border-primary/20 shadow-none" : "text-slate-500 hover:bg-slate-50 border border-transparent")}>
                            <ViewIcon className="h-3.5 w-3.5" />
                            {v.name}
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center gap-2">
                <div className="relative group/search">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                    <Input placeholder="Find in ledger..." className="h-9 pl-9 rounded-xl bg-slate-50 border-none text-[10px] font-bold uppercase w-48 shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {isSyncing && <Loader2 className="h-4 w-4 animate-spin text-primary opacity-50" />}
            </div>
        </div>

        {/* View Layout */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-white">
            <ScrollArea className="flex-1">
                <div className="inline-block min-w-full">
                    {/* Header Row */}
                    <div className="flex bg-slate-50/50 sticky top-0 z-20 border-b backdrop-blur-md h-10">
                        <div className="w-12 border-r flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-slate-300">#</span>
                        </div>
                        {visibleFields.map((field) => (
                            <div key={field.id} style={{ width: field.width }} className="border-r flex items-center justify-between px-3 shrink-0 group">
                                <div className="flex items-center gap-2 truncate">
                                    {React.createElement(FIELD_ICONS[field.type] || Type, { className: "h-3.5 w-3.5 text-slate-400 shrink-0" })}
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest truncate">{field.name}</span>
                                </div>
                            </div>
                        ))}
                        <div className="flex-1" />
                    </div>

                    {/* Data Rows */}
                    <div className="divide-y border-b">
                        {filteredRecords.map((record, idx) => (
                            <DropdownMenu key={record.id}>
                                <DropdownMenuTrigger asChild>
                                    <div className="flex hover:bg-slate-50/50 group h-10 transition-colors">
                                        <div className="w-12 border-r bg-slate-50/30 flex items-center justify-center shrink-0 relative">
                                            <span className="text-[10px] font-bold text-slate-300 group-hover:hidden">{idx + 1}</span>
                                            <div className="hidden group-hover:flex items-center gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); setDetailRecordId(record.id); }} className="h-6 w-6 rounded-md hover:bg-slate-200 flex items-center justify-center text-primary"><Maximize2 className="h-3.5 w-3.5" /></button>
                                            </div>
                                        </div>
                                        {visibleFields.map((field) => (
                                            <div key={field.id} style={{ width: field.width }} className="border-r shrink-0 flex items-center overflow-hidden">
                                                <CellRenderer field={field} value={record.values[field.id]} onChange={(val: any) => {
                                                    const next = records.map(r => r.id === record.id ? { ...r, values: { ...r.values, [field.id]: val }, updatedAt: new Date().toISOString() } : r);
                                                    setRecords(next);
                                                    sync(fields, next, views, activeViewId);
                                                }} onExpand={() => setDetailRecordId(record.id)} editable={editable} />
                                            </div>
                                        ))}
                                        <div className="flex-1" />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56 rounded-xl p-1 shadow-2xl border-slate-100">
                                    <DropdownMenuItem onClick={() => setDetailRecordId(record.id)} className="gap-2 font-semibold text-xs py-2.5 rounded-lg cursor-pointer"><Maximize2 className="h-3.5 w-3.5 text-primary" /> Open Detail</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => duplicateRecord(record.id)} className="gap-2 font-semibold text-xs py-2.5 rounded-lg cursor-pointer"><Copy className="h-3.5 w-3.5" /> Duplicate</DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-50" />
                                    <DropdownMenuItem onClick={() => deleteRecord(record.id)} className="gap-2 font-semibold text-xs py-2.5 text-red-600 focus:text-red-600 rounded-lg cursor-pointer"><Trash2 className="h-3.5 w-3.5" /> Delete Entry</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ))}
                        <button onClick={() => addRecord()} className="flex hover:bg-slate-50 h-10 w-full items-center border-none outline-none">
                            <div className="w-12 h-full border-r shrink-0" />
                            <div className="flex-1 px-4 text-xs font-bold text-slate-300 flex items-center gap-2"><Plus className="h-3.5 w-3.5" /> New record...</div>
                        </button>
                    </div>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>

        {/* Record Detail Dialog */}
        <Dialog open={!!detailRecordId} onOpenChange={(open) => !open && setDetailRecordId(null)}>
            <DialogContent className="max-w-[95vw] sm:max-w-6xl p-0 overflow-hidden border-none shadow-3xl bg-white rounded-none sm:rounded-[1.25rem] h-[90vh] flex flex-col">
                <DialogHeader className="sr-only">
                    <DialogTitle>Object Identity: {detailRecord?.id}</DialogTitle>
                    <DialogDescription>Field audit and organizational conversation panel.</DialogDescription>
                </DialogHeader>
                
                <div className="flex flex-1 h-full overflow-hidden">
                    {/* Left: Data Grid */}
                    <div className="flex-1 flex flex-col bg-white overflow-hidden border-r">
                        <div className="p-8 border-b bg-slate-50/30">
                            <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 font-black uppercase text-[9px] tracking-widest h-6 px-3 shadow-none mb-4">Object Identity</Badge>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight truncate">
                                {detailRecord?.values[fields[0].id] || 'Untitled Item'}
                            </h2>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-8 space-y-10">
                                {fields.map(field => (
                                    <div key={field.id} className="space-y-3 group/field">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 group-hover/field:text-primary transition-colors flex items-center gap-2">
                                                {React.createElement(FIELD_ICONS[field.type] || Type, { className: "h-3 w-3" })}
                                                {field.name}
                                            </Label>
                                        </div>
                                        <div className="min-h-[44px] rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-all shadow-none">
                                            <CellRenderer field={field} value={detailRecord?.values[field.id]} onChange={(val: any) => {
                                                const next = records.map(r => r.id === detailRecordId ? { ...r, values: { ...r.values, [field.id]: val }, updatedAt: new Date().toISOString() } : r);
                                                setRecords(next);
                                                sync(fields, next, views, activeViewId);
                                            }} isExpanded={true} editable={editable} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right: Team Conversation */}
                    <div className="w-[440px] flex flex-col bg-slate-50/50 shrink-0">
                        <div className="p-6 border-b bg-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary"><MessageSquare className="h-4 w-4" /></div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Audit Discussion</h3>
                            </div>
                            <DialogClose asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><X className="h-4 w-4 text-slate-400" /></Button></DialogClose>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-8">
                                {detailRecord?.comments && detailRecord.comments.length > 0 ? (
                                    detailRecord.comments.filter(c => !c.parentId).map(comment => (
                                        <div key={comment.id} className="space-y-4">
                                            <div className="flex gap-4">
                                                <Avatar className="h-8 w-8 shrink-0 shadow-sm"><AvatarImage src={comment.userPhoto || undefined} /><AvatarFallback className="text-[10px] font-bold bg-slate-100">{comment.userName.charAt(0)}</AvatarFallback></Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="text-xs font-black text-slate-900">{comment.userName}</span>
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase">{format(new Date(comment.timestamp), 'MMM d, HH:mm')}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 leading-relaxed break-all whitespace-pre-wrap">{comment.text}</p>
                                                    <button onClick={() => setReplyingToId(comment.id)} className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary-light mt-2 flex items-center gap-1.5 transition-colors"><CornerDownRight className="h-3 w-3" /> Reply</button>
                                                </div>
                                            </div>
                                            <div className="pl-12 space-y-4">
                                                {detailRecord.comments.filter(r => r.parentId === comment.id).map(reply => (
                                                    <div key={reply.id} className="flex gap-3">
                                                        <Avatar className="h-6 w-6 shrink-0 shadow-sm"><AvatarImage src={reply.userPhoto || undefined} /><AvatarFallback className="text-[8px] bg-slate-100">{reply.userName.charAt(0)}</AvatarFallback></Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-0.5">
                                                                <span className="text-[11px] font-black text-slate-900">{reply.userName}</span>
                                                                <span className="text-[8px] font-bold text-slate-300 uppercase">{format(new Date(reply.timestamp), 'HH:mm')}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-600 leading-relaxed break-all whitespace-pre-wrap">{reply.text}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-40 grayscale gap-4">
                                        <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 shadow-inner">
                                            <MessageSquare className="h-10 w-10 text-slate-200" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 leading-none">No comments yet</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Be the first to say something.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="p-6 bg-white border-t space-y-4 relative">
                            {replyingToId && (
                                <div className="flex items-center justify-between bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 animate-in slide-in-from-bottom-2">
                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><CornerDownRight className="h-3 w-3" /> Replying to context</p>
                                    <button onClick={() => setReplyingToId(null)} className="text-primary hover:text-slate-900"><X className="h-3 w-3" /></button>
                                </div>
                            )}

                            {showTagDropdown && (
                                <div className="absolute bottom-full left-6 right-6 mb-2 z-[70] animate-in slide-in-from-bottom-2 duration-300">
                                    <Card className="rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-slate-100 overflow-hidden bg-white">
                                        <div className="p-3 bg-slate-50 border-b">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Team member</p>
                                        </div>
                                        <ScrollArea className="max-h-64">
                                            <div className="p-1">
                                                {filteredTeam.map(member => (
                                                    <button 
                                                        key={member.id} 
                                                        onClick={() => {
                                                            const parts = commentText.split('@');
                                                            parts.pop();
                                                            setCommentText(parts.join('@') + `@${member.name} `);
                                                            setShowTagDropdown(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 group transition-all text-left"
                                                    >
                                                        <Avatar className="h-9 w-9 shadow-sm"><AvatarImage src={member.photoURL} /><AvatarFallback className="text-[10px] font-bold">{member.name.charAt(0)}</AvatarFallback></Avatar>
                                                        <div className="flex-1">
                                                            <p className="text-xs font-black text-slate-900 leading-none">{member.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{member.id === user?.uid ? 'You' : member.email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </Card>
                                </div>
                            )}

                            <div className="flex items-end gap-2">
                                <div className="flex-1 relative">
                                    <textarea 
                                        placeholder="Add comment..." 
                                        value={commentText} 
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCommentText(val);
                                            const parts = val.split('@');
                                            if (parts.length > 1) {
                                                const lastPart = parts[parts.length - 1];
                                                if (!lastPart.includes(' ')) {
                                                    setTagSearch(lastPart);
                                                    setShowTagDropdown(true);
                                                } else setShowTagDropdown(false);
                                            } else setShowTagDropdown(false);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment();
                                            }
                                        }}
                                        className="w-full min-h-[44px] max-h-32 rounded-xl bg-slate-50 border-none px-4 py-3 text-sm font-semibold placeholder:text-slate-300 resize-none shadow-inner focus:ring-1 focus:ring-primary outline-none pr-10" 
                                    />
                                    <button onClick={handleAddComment} disabled={!commentText.trim()} className="absolute bottom-2.5 right-2.5 h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-20 transition-all shadow-md shadow-primary/20"><Send className="h-3.5 w-3.5" /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
