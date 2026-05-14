'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    Grid, 
    Layout, 
    Calendar as CalendarIcon, 
    GalleryHorizontal, 
    List as ListIcon,
    Plus,
    Search,
    Filter,
    ArrowUpDown,
    MoreHorizontal,
    ChevronDown,
    Hash,
    Type,
    CheckSquare,
    CalendarDays,
    Image as ImageIcon,
    Mail,
    Phone,
    Globe,
    UserCircle,
    DollarSign,
    Layers,
    Trash2,
    Settings2,
    Clock,
    X,
    Maximize2,
    Save,
    Share2,
    CheckCircle2,
    Columns,
    Group,
    Edit,
    MessageSquare
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
    DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SheetField, SheetRecord, SheetView, SheetFieldType } from '@/lib/types';
import { useMounted } from '@/hooks/use-mounted';
import { useToast } from '@/hooks/use-toast';

interface SheetEditorProps {
  initialData: any;
  onContentChange: (json: any) => void;
  editable?: boolean;
}

const FIELD_ICONS: Record<SheetFieldType, React.ElementType> = {
    text: Type,
    number: Hash,
    date: CalendarDays,
    checkbox: CheckSquare,
    select: ChevronDown,
    multiselect: Layers,
    attachment: ImageIcon,
    email: Mail,
    phone: Phone,
    url: Globe,
    user: UserCircle,
    currency: DollarSign,
    status: Settings2,
    formula: CalculatorIcon
};

function CalculatorIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>;
}

export function SheetEditor({ initialData, onContentChange, editable = true }: SheetEditorProps) {
  const isMounted = useMounted();
  const { toast } = useToast();

  // Unified State for Sheet Logic
  const [fields, setFields] = useState<SheetField[]>(initialData?.fields || [
      { id: 'f1', name: 'Name', type: 'text', isPrimary: true, width: 250 },
      { id: 'f2', name: 'Status', type: 'status', options: [{label: 'Todo', color: 'bg-slate-100 text-slate-700'}, {label: 'In Progress', color: 'bg-blue-100 text-blue-700'}, {label: 'Done', color: 'bg-green-100 text-green-700'}], width: 150 },
      { id: 'f3', name: 'Due Date', type: 'date', width: 150 }
  ]);
  const [records, setRecords] = useState<SheetRecord[]>(initialData?.records || [
      { id: 'r1', values: { f1: 'Launch River Apps', f2: 'In Progress', f3: '2025-06-01' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'r2', values: { f1: 'Optimize Database', f2: 'Todo', f3: '2025-06-15' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]);
  const [views, setViews] = useState<SheetView[]>(initialData?.views || [
      { id: 'v1', name: 'Main Grid', type: 'grid' }
  ]);
  const [activeViewId, setActiveViewId] = useState(initialData?.activeViewId || 'v1');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const activeView = useMemo(() => views.find(v => v.id === activeViewId) || views[0], [views, activeViewId]);

  const sync = useCallback((newFields: SheetField[], newRecords: SheetRecord[], newViews: SheetView[]) => {
      if (!editable) return;
      onContentChange({ fields: newFields, records: newRecords, views: newViews, activeViewId });
  }, [onContentChange, editable, activeViewId]);

  const addRecord = () => {
    const newRecord: SheetRecord = {
        id: `r-${Date.now()}`,
        values: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    const next = [newRecord, ...records];
    setRecords(next);
    sync(fields, next, views);
  };

  const updateRecordValue = (recordId: string, fieldId: string, value: any) => {
    const next = records.map(r => r.id === recordId ? { 
        ...r, 
        values: { ...r.values, [fieldId]: value }, 
        updatedAt: new Date().toISOString() 
    } : r);
    setRecords(next);
    sync(fields, next, views);
  };

  const addField = (type: SheetFieldType) => {
    const newField: SheetField = {
        id: `f-${Date.now()}`,
        name: `New ${type}`,
        type,
        width: 150
    };
    const next = [...fields, newField];
    setFields(next);
    sync(next, records, views);
    toast({ title: 'Column added', description: `New ${type} field initialized.` });
  };

  const deleteField = (fieldId: string) => {
    const nextFields = fields.filter(f => f.id !== fieldId);
    const nextRecords = records.map(r => {
        const nextValues = { ...r.values };
        delete nextValues[fieldId];
        return { ...r, values: nextValues };
    });
    setFields(nextFields);
    setRecords(nextRecords);
    sync(nextFields, nextRecords, views);
  };

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    const s = searchTerm.toLowerCase();
    return records.filter(r => 
        Object.values(r.values).some(v => String(v).toLowerCase().includes(s))
    );
  }, [records, searchTerm]);

  if (!isMounted) return null;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden select-none h-full font-sans">
        {/* Workspace Toolbar */}
        <div className="h-14 border-b flex items-center justify-between px-4 sm:px-6 bg-white shrink-0 z-30">
            <div className="flex items-center gap-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-9 px-3 gap-2 rounded-xl bg-slate-50 border border-slate-100 font-bold text-xs">
                            {activeView.type === 'grid' && <Grid className="h-4 w-4 text-blue-500" />}
                            {activeView.type === 'kanban' && <Layout className="h-4 w-4 text-purple-500" />}
                            {activeView.type === 'calendar' && <CalendarIcon className="h-4 w-4 text-green-500" />}
                            {activeView.type === 'gallery' && <GalleryHorizontal className="h-4 w-4 text-amber-500" />}
                            {activeView.name}
                            <ChevronDown className="h-3.5 w-3.5 opacity-40" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64 rounded-2xl p-1 shadow-2xl border-slate-100">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest">Workspace Views</DropdownMenuLabel>
                        {views.map(v => (
                            <DropdownMenuItem key={v.id} onClick={() => setActiveViewId(v.id)} className="gap-3 font-bold text-xs py-2.5 rounded-xl cursor-pointer">
                                {v.type === 'grid' && <Grid className="h-4 w-4 text-blue-500" />}
                                {v.type === 'kanban' && <Layout className="h-4 w-4 text-purple-500" />}
                                {v.type === 'calendar' && <CalendarIcon className="h-4 w-4 text-green-500" />}
                                {v.type === 'gallery' && <GalleryHorizontal className="h-4 w-4 text-amber-500" />}
                                {v.name}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator className="bg-slate-50" />
                        <DropdownMenuItem className="gap-3 font-bold text-xs py-2.5 rounded-xl cursor-pointer text-primary">
                            <Plus className="h-4 w-4" /> Create New View
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Separator orientation="vertical" className="h-6 mx-1 bg-slate-100 hidden sm:block" />

                <div className="hidden sm:flex items-center gap-1.5">
                    <ToolbarAction icon={<Filter className="h-3.5 w-3.5" />} label="Filter" />
                    <ToolbarAction icon={<Group className="h-3.5 w-3.5" />} label="Group" />
                    <ToolbarAction icon={<ArrowUpDown className="h-3.5 w-3.5" />} label="Sort" />
                    <ToolbarAction icon={<Columns className="h-3.5 w-3.5" />} label="Hide Fields" />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative group/search hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input 
                        placeholder="Search records..." 
                        className="h-9 pl-9 rounded-xl bg-slate-50 border-none shadow-inner text-xs font-semibold w-48 transition-all focus:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={addRecord} className="h-9 px-4 rounded-xl font-bold text-xs gap-2 shadow-lg shadow-primary/10">
                    <Plus className="h-3.5 w-3.5" /> New Record
                </Button>
            </div>
        </div>

        {/* View Content Renderer */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-white">
            {activeView.type === 'grid' && (
                <ScrollArea className="flex-1 border-t">
                    <div className="inline-block min-w-full">
                        {/* Header Row */}
                        <div className="flex bg-slate-50/50 sticky top-0 z-20 border-b backdrop-blur-sm">
                            <div className="w-12 h-10 border-r bg-slate-100/50 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-black text-slate-300">#</span>
                            </div>
                            {fields.map((field) => (
                                <div key={field.id} style={{ width: field.width }} className="group h-10 border-r flex items-center justify-between px-3 shrink-0">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {React.createElement(FIELD_ICONS[field.type] || Type, { className: "h-3 w-3 text-slate-400 shrink-0" })}
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest truncate">{field.name}</span>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md hover:bg-slate-200 flex items-center justify-center transition-all">
                                                <ChevronDown className="h-3 w-3 text-slate-400" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-48 rounded-xl p-1 shadow-2xl">
                                            <DropdownMenuItem className="gap-2 text-xs font-semibold rounded-lg cursor-pointer">
                                                <Edit className="h-3.5 w-3.5" /> Rename Field
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="gap-2 text-xs font-semibold rounded-lg cursor-pointer">
                                                <Settings2 className="h-3.5 w-3.5" /> Change Type
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-slate-50" />
                                            {!field.isPrimary && (
                                                <DropdownMenuItem onClick={() => deleteField(field.id)} className="gap-2 text-xs font-semibold text-red-600 rounded-lg cursor-pointer focus:text-red-600">
                                                    <Trash2 className="h-3.5 w-3.5" /> Delete Column
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                            <button 
                                onClick={() => addField('text')}
                                className="w-12 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-primary transition-colors border-r"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Record Rows */}
                        <div className="divide-y">
                            {filteredRecords.map((record, idx) => (
                                <div key={record.id} className="flex hover:bg-slate-50/30 transition-colors group">
                                    <div className="w-12 h-10 border-r bg-slate-50/30 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0 group-hover:text-slate-900 transition-colors">
                                        {idx + 1}
                                    </div>
                                    {fields.map((field) => (
                                        <div key={field.id} style={{ width: field.width }} className="h-10 border-r shrink-0 flex items-center relative">
                                            <CellRenderer 
                                                field={field} 
                                                value={record.values[field.id]} 
                                                onChange={(val) => updateRecordValue(record.id, field.id, val)}
                                                onExpand={() => setSelectedRecordId(record.id)}
                                                editable={editable}
                                            />
                                        </div>
                                    ))}
                                    <div className="flex-1 bg-white" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            )}

            {/* Placeholder for other views */}
            {activeView.type !== 'grid' && (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center gap-6 animate-in fade-in duration-1000">
                    <div className="p-10 rounded-[3rem] bg-slate-50 border border-slate-100 shadow-inner opacity-40">
                        {activeView.type === 'kanban' && <Layout className="h-16 w-16 text-slate-200" />}
                        {activeView.type === 'calendar' && <CalendarIcon className="h-16 w-16 text-slate-200" />}
                        {activeView.type === 'gallery' && <GalleryHorizontal className="h-16 w-16 text-slate-200" />}
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-900">Virtualization Active</h3>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Modeling {activeView.name} for your organizational data...</p>
                    </div>
                    <Button variant="outline" onClick={() => setActiveViewId('v1')} className="rounded-xl h-11 px-8 font-black uppercase tracking-widest text-[10px]">
                        Back to Grid Engine
                    </Button>
                </div>
            )}
        </div>

        {/* Record Detail Side Panel */}
        {selectedRecordId && (
            <div className="absolute inset-y-0 right-0 w-full sm:w-[500px] bg-white border-l shadow-3xl z-[100] animate-in slide-in-from-right duration-300 flex flex-col">
                <div className="h-16 border-b flex items-center justify-between px-6 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white shadow-sm text-primary">
                            <Maximize2 className="h-4 w-4" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Record Intelligence</h4>
                    </div>
                    <button onClick={() => setSelectedRecordId(null)} className="p-2 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-10 space-y-10">
                        <div className="space-y-8">
                            {fields.map(field => (
                                <div key={field.id} className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                        {React.createElement(FIELD_ICONS[field.type] || Type, { className: "h-3 w-3" })}
                                        {field.name}
                                    </Label>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 min-h-[48px]">
                                        <CellRenderer 
                                            field={field} 
                                            value={records.find(r => r.id === selectedRecordId)?.values[field.id]} 
                                            onChange={(val) => updateRecordValue(selectedRecordId, field.id, val)}
                                            editable={editable}
                                            isExpanded
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Separator className="bg-slate-50" />

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Collaboration Feed</h4>
                            <div className="p-10 rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center opacity-30 gap-3">
                                <MessageSquare className="h-8 w-8 text-slate-300" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No activity recorded</p>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                <div className="h-20 border-t p-6 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">Authorized Workspace Entry</p>
                    <div className="flex gap-2">
                        <Button variant="ghost" className="rounded-xl h-9 text-[10px] font-bold uppercase tracking-widest text-slate-400" onClick={() => setSelectedRecordId(null)}>Close</Button>
                        <Button className="rounded-xl h-9 px-6 text-[10px] font-bold uppercase tracking-widest shadow-lg">Save Profile</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

function ToolbarAction({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <Button variant="ghost" size="sm" className="h-8 px-3 rounded-lg gap-2 text-slate-500 hover:text-slate-900 font-bold text-[10px] uppercase tracking-wider transition-all">
            {icon}
            {label}
        </Button>
    );
}

function CellRenderer({ field, value, onChange, onExpand, editable, isExpanded = false }: any) {
    const [localValue, setLocalValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => setLocalValue(value), [value]);

    const handleBlur = () => {
        setIsEditing(false);
        if (localValue !== value) onChange(localValue);
    };

    if (field.type === 'checkbox') {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <input 
                    type="checkbox" 
                    checked={!!value} 
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={!editable}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary transition-all"
                />
            </div>
        );
    }

    if (field.type === 'status' || field.type === 'select') {
        const option = field.options?.find((o: any) => o.label === value);
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="w-full h-full px-3 flex items-center justify-between group/cell outline-none">
                        {value ? (
                            <Badge className={cn("text-[9px] font-bold uppercase tracking-widest border-none shadow-none", option?.color || 'bg-slate-100 text-slate-700')}>
                                {value}
                            </Badge>
                        ) : <span className="text-slate-200 text-xs italic">Select...</span>}
                        {!isExpanded && <ChevronDown className="h-3 w-3 text-slate-200 group-hover/cell:text-slate-400 transition-colors" />}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 rounded-xl p-1 shadow-2xl">
                    {field.options?.map((opt: any) => (
                        <DropdownMenuItem key={opt.label} onClick={() => onChange(opt.label)} className="gap-2 text-[10px] font-bold uppercase tracking-widest rounded-lg cursor-pointer">
                            <div className={cn("h-2 w-2 rounded-full", opt.color.split(' ')[0])} />
                            {opt.label}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="bg-slate-50" />
                    <DropdownMenuItem className="text-xs font-bold text-primary rounded-lg cursor-pointer">Add New Option</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    if (isEditing || isExpanded) {
        return (
            <input 
                autoFocus={!isExpanded}
                value={localValue || ''}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                className={cn(
                    "w-full h-full bg-transparent px-3 text-sm font-medium focus:outline-none transition-colors",
                    isExpanded ? "p-0" : ""
                )}
                placeholder="..."
            />
        );
    }

    return (
        <div 
            className="w-full h-full px-3 flex items-center group/cell cursor-text"
            onClick={() => editable && setIsEditing(true)}
        >
            <span className={cn(
                "text-sm font-medium truncate flex-1",
                !value && "text-slate-200"
            )}>
                {value || (field.isPrimary ? "Enter Item..." : "")}
            </span>
            {field.isPrimary && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
                    className="opacity-0 group-hover/cell:opacity-100 p-1 rounded hover:bg-slate-200 text-slate-400 transition-all"
                >
                    <Maximize2 className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}
