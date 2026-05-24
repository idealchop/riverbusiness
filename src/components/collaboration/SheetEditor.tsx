'use client';

import React, { useState, useMemo, useEffect, useCallback, memo, useRef } from 'react';
import { 
    Grid, 
    Layout, 
    Calendar as CalendarIcon, 
    Plus,
    Search,
    Filter,
    ArrowUpDown,
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
    X,
    Maximize2,
    Columns,
    Edit,
    ChevronRight,
    ChevronLeft,
    Check,
    AlertCircle,
    FileText,
    Loader2,
    PlusCircle,
    CheckCircle2,
    Palette,
    Tag,
    Pencil,
    Copy,
    ListFilter,
    EyeOff,
    Grab,
    MoreHorizontal,
    MessageSquare,
    Undo2,
    Bold,
    Baseline,
    RotateCcw,
    Zap,
    AlignLeft
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SheetField, SheetRecord, SheetView, SheetFieldType, SheetViewType } from '@/lib/types';
import { useMounted } from '@/hooks/use-mounted';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, addDays } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface SheetEditorProps {
  initialData: any;
  onContentChange: (json: any) => void;
  editable?: boolean;
}

type FilterOperator = 'contains' | 'not_contains' | 'is' | 'is_not' | 'is_empty' | 'is_not_empty' | 'gt' | 'lt' | 'after' | 'before';

interface FilterRule {
    id: string;
    fieldId: string;
    operator: FilterOperator;
    value: string;
}

const FIELD_ICONS: Record<SheetFieldType, React.ElementType> = {
    text: Type,
    longtext: AlignLeft,
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
    formula: FileText
};

const VIEW_ICONS: Record<SheetViewType, React.ElementType> = {
    grid: Grid,
    kanban: Layout,
    calendar: CalendarIcon,
    list: ListFilter
};

const FIELD_TYPES: { type: SheetFieldType, label: string }[] = [
    { type: 'text', label: 'Single line text' },
    { type: 'longtext', label: 'Multi-line text' },
    { type: 'number', label: 'Number' },
    { type: 'currency', label: 'Currency' },
    { type: 'date', label: 'Date' },
    { type: 'checkbox', label: 'Checkbox' },
    { type: 'select', label: 'Single select' },
    { type: 'status', label: 'Status' },
    { type: 'email', label: 'Email' },
    { type: 'url', label: 'URL' },
    { type: 'phone', label: 'Phone' },
];

const OPTION_COLORS = [
    { label: 'Gray', value: 'bg-slate-100 text-slate-700' },
    { label: 'Blue', value: 'bg-blue-100 text-blue-700' },
    { label: 'Green', value: 'bg-green-100 text-green-700' },
    { label: 'Amber', value: 'bg-amber-100 text-amber-700' },
    { label: 'Red', value: 'bg-red-100 text-red-700' },
    { label: 'Purple', value: 'bg-purple-100 text-purple-700' },
    { label: 'Pink', value: 'bg-pink-100 text-pink-700' },
    { label: 'Indigo', value: 'bg-indigo-100 text-indigo-700' },
];

const CellRenderer = memo(({ field, value, onChange, onExpand, onAddOption, onUpdateOption, onDeleteOption, editable, isExpanded = false }: any) => {
    const [localValue, setLocalValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);
    const [newOptionLabel, setNewOptionLabel] = useState('');

    useEffect(() => setLocalValue(value), [value]);

    const handleBlur = () => {
        setIsEditing(false);
        let finalValue = localValue;
        
        if (field.type === 'number' || field.type === 'currency') {
            finalValue = localValue === '' ? null : Number(localValue);
        }

        if (finalValue !== value) onChange(finalValue);
    };

    if (field.type === 'checkbox') {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <input 
                    type="checkbox" 
                    checked={!!value} 
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={!editable}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0 transition-all cursor-pointer"
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
                            <Badge className={cn("text-[10px] font-bold uppercase tracking-widest border-none shadow-none", option?.color || 'bg-slate-100 text-slate-700')}>
                                {value}
                            </Badge>
                        ) : <span className="text-slate-200 text-xs italic">Select...</span>}
                        {!isExpanded && <ChevronDown className="h-3 w-3 text-slate-200 group-hover/cell:text-slate-400 transition-colors" />}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-1 rounded-2xl border-slate-100 shadow-3xl bg-white overflow-hidden animate-in zoom-in-95 duration-200">
                    <ScrollArea className="max-h-60">
                        <div className="p-1 space-y-0.5">
                            {field.options?.map((opt: any) => (
                                <div key={opt.label} className="flex items-center gap-1 group/item pr-1">
                                    <DropdownMenuItem onClick={() => onChange(opt.label)} className="flex-1 gap-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl cursor-pointer py-2.5 px-3">
                                        <div className={cn("h-2.5 w-2.5 rounded-full shrink-0 shadow-sm", opt.color.split(' ')[0])} />
                                        <span className="flex-1 truncate">{opt.label}</span>
                                        {value === opt.label && <Check className="h-3 w-3 text-primary" />}
                                    </DropdownMenuItem>
                                    
                                    {editable && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                                                    <Palette className="h-3 w-3 text-slate-400" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent side="right" align="start" className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-white shadow-2xl z-[70] border-slate-100">
                                                {OPTION_COLORS.map(c => (
                                                    <button 
                                                        key={c.value} 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUpdateOption(field.id, opt.label, opt.label, c.value);
                                                        }} 
                                                        className={cn(
                                                            "h-6 w-6 rounded-lg border transition-transform hover:scale-110", 
                                                            opt.color === c.value && "ring-2 ring-primary ring-offset-1"
                                                        )} 
                                                        style={{ backgroundColor: c.value.split(' ')[0].replace('bg-', '') }} 
                                                    />
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    
                    {editable && (
                        <>
                            <DropdownMenuSeparator className="bg-slate-50" />
                            <div className="p-2 bg-slate-50">
                                <div className="relative">
                                    <Plus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                    <Input 
                                        placeholder="New option..." 
                                        value={newOptionLabel}
                                        onChange={(e) => setNewOptionLabel(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newOptionLabel.trim()) {
                                                onAddOption(newOptionLabel.trim());
                                                onChange(newOptionLabel.trim());
                                                setNewOptionLabel('');
                                            }
                                        }}
                                        className="h-8 pl-8 rounded-lg bg-white border-none shadow-inner text-[10px] font-bold uppercase tracking-widest" 
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    if (isEditing || isExpanded) {
        if (field.type === 'longtext') {
            return (
                <textarea
                    autoFocus={!isExpanded}
                    value={localValue || ''}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={handleBlur}
                    className="w-full h-full bg-transparent p-3 text-sm font-semibold focus:outline-none resize-none min-h-[100px]"
                    placeholder="..."
                />
            );
        }

        let inputType = "text";
        if (field.type === 'number' || field.type === 'currency') inputType = "number";
        if (field.type === 'date') inputType = "date";
        if (field.type === 'email') inputType = "email";
        if (field.type === 'url') inputType = "url";
        if (field.type === 'phone') inputType = "tel";

        return (
            <div className="flex items-center w-full h-full relative">
                {field.type === 'currency' && <span className="pl-3 text-slate-400 text-sm font-bold shrink-0">₱</span>}
                <input 
                    autoFocus={!isExpanded}
                    type={inputType}
                    value={localValue || ''}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleBlur();
                        if (e.key === 'Escape') setIsEditing(false);
                    }}
                    className={cn(
                        "w-full h-full bg-transparent px-3 text-sm font-semibold focus:outline-none transition-colors",
                        field.type === 'currency' && "pl-1"
                    )}
                    placeholder={field.type === 'date' ? '' : "..."}
                />
            </div>
        );
    }

    return (
        <div 
            className="w-full h-full px-3 flex items-center group/cell cursor-text"
            onClick={() => editable && setIsEditing(true)}
        >
            <span className={cn(
                "text-sm font-semibold truncate flex-1",
                !value && "text-slate-200 italic font-normal"
            )}>
                {field.type === 'currency' && value !== null && value !== undefined && value !== '' ? `₱${Number(value).toLocaleString()}` : (value || (field.isPrimary ? "Enter Item..." : ""))}
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
});
CellRenderer.displayName = 'CellRenderer';

export function SheetEditor({ initialData, onContentChange, editable = true }: SheetEditorProps) {
  const isMounted = useMounted();
  const { toast } = useToast();

  const [fields, setFields] = useState<SheetField[]>(() => {
    if (initialData?.fields && initialData.fields.length > 0) return initialData.fields;
    return [
      { id: 'f1', name: 'Primary Item', type: 'text', isPrimary: true, width: 250 },
      { id: 'f2', name: 'Status', type: 'status', options: [{label: 'Todo', color: 'bg-slate-100 text-slate-700'}, {label: 'In Progress', color: 'bg-blue-100 text-blue-700'}, {label: 'Done', color: 'bg-green-100 text-green-700'}], width: 150 },
      { id: 'f3', name: 'Due Date', type: 'date', width: 150 }
    ];
  });

  const [records, setRecords] = useState<SheetRecord[]>(() => {
    if (initialData?.records && initialData.records.length > 0) return initialData.records;
    return [
      { id: 'r1', values: { f1: 'Initialize Workspace', f2: 'In Progress', f3: format(new Date(), 'yyyy-MM-dd') }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
  });

  const [views, setViews] = useState<SheetView[]>(() => {
    if (initialData?.views && initialData.views.length > 0) return initialData.views;
    return [
      { id: 'v1', name: 'Main Grid', type: 'grid', config: { hiddenFields: [] } },
      { id: 'v2', name: 'Board', type: 'kanban', config: { hiddenFields: [] } },
      { id: 'v3', name: 'Calendar', type: 'calendar', config: { hiddenFields: [] } }
    ];
  });

  const [activeViewId, setActiveViewId] = useState(initialData?.activeViewId || 'v1');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<{ fieldId: string, direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const activeView = useMemo(() => {
    if (!views || views.length === 0) {
        return { id: 'v1', name: 'Grid', type: 'grid', config: { hiddenFields: [] } } as SheetView;
    }
    const found = views.find(v => v.id === activeViewId);
    if (found) return found;
    return views[0];
  }, [views, activeViewId]);

  const sync = useCallback((newFields: SheetField[], newRecords: SheetRecord[], newViews: SheetView[], newViewId: string) => {
      if (!editable) return;
      setIsSyncing(true);
      onContentChange({ fields: newFields, records: newRecords, views: newViews, activeViewId: newViewId });
      setTimeout(() => setIsSyncing(false), 500);
  }, [onContentChange, editable]);

  const addRecord = useCallback(() => {
    const newRecord: SheetRecord = {
        id: `r-${Date.now()}`,
        values: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    const next = [newRecord, ...records];
    setRecords(next);
    sync(fields, next, views, activeViewId);
  }, [records, fields, views, activeViewId, sync]);

  const updateRecordValue = useCallback((recordId: string, fieldId: string, value: any) => {
    setRecords(prev => {
        const next = prev.map(r => r.id === recordId ? { 
            ...r, 
            values: { ...r.values, [fieldId]: value }, 
            updatedAt: new Date().toISOString() 
        } : r);
        sync(fields, next, views, activeViewId);
        return next;
    });
  }, [fields, views, activeViewId, sync]);

  const addField = useCallback((type: SheetFieldType) => {
    const id = `f-${Date.now()}`;
    const newField: SheetField = {
        id,
        name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type,
        width: 150,
        options: (type === 'status' || type === 'select') ? [
            { label: 'Option 1', color: 'bg-slate-100 text-slate-700' },
            { label: 'Option 2', color: 'bg-blue-100 text-blue-700' }
        ] : undefined
    };
    const next = [...fields, newField];
    setFields(next);
    sync(next, records, views, activeViewId);
    toast({ title: 'Column added' });
  }, [fields, records, views, activeViewId, sync, toast]);

  const deleteField = useCallback((fieldId: string) => {
    const fieldToDelete = fields.find(f => f.id === fieldId);
    if (fieldToDelete?.isPrimary) {
        toast({ variant: 'destructive', title: 'Restricted Action' });
        return;
    }
    const nextFields = fields.filter(f => f.id !== fieldId);
    const nextRecords = records.map(r => {
        const nextValues = { ...r.values };
        delete nextValues[fieldId];
        return { ...r, values: nextValues };
    });
    setFields(nextFields);
    setRecords(nextRecords);
    sync(nextFields, nextRecords, views, activeViewId);
    toast({ title: 'Column purged' });
  }, [fields, records, views, activeViewId, sync, toast]);

  const changeFieldType = useCallback((fieldId: string, newType: SheetFieldType) => {
      const next = fields.map(f => f.id === fieldId ? { 
          ...f, 
          type: newType,
          options: (newType === 'status' || newType === 'select') && !f.options ? [
              { label: 'Option 1', color: 'bg-slate-100 text-slate-700' },
              { label: 'Option 2', color: 'bg-blue-100 text-blue-700' }
          ] : f.options
      } : f);
      setFields(next);
      sync(next, records, views, activeViewId);
  }, [fields, records, views, activeViewId, sync]);

  const handleToggleFieldVisibility = (fieldId: string, visible: boolean) => {
    const currentHidden = activeView.config?.hiddenFields || [];
    const newHidden = visible 
        ? currentHidden.filter(id => id !== fieldId)
        : [...currentHidden, fieldId];
    
    const nextViews = views.map(v => v.id === activeViewId ? {
        ...v,
        config: { ...v.config, hiddenFields: newHidden }
    } : v);
    
    setViews(nextViews);
    sync(fields, records, nextViews, activeViewId);
  };

  const handleToggleAllFields = (visible: boolean) => {
    const nextViews = views.map(v => v.id === activeViewId ? {
        ...v,
        config: { ...v.config, hiddenFields: visible ? [] : fields.filter(f => !f.isPrimary).map(f => f.id) }
    } : v);
    setViews(nextViews);
    sync(fields, records, nextViews, activeViewId);
  };

  const handleAddOptionDirectly = useCallback((fieldId: string, label: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options || !label.trim()) return;

    if (field.options.some(o => o.label.toLowerCase() === label.trim().toLowerCase())) return;

    const nextOptions = [...field.options, { label: label.trim(), color: 'bg-slate-100 text-slate-700' }];
    const nextFields = fields.map(f => f.id === fieldId ? { ...f, options: nextOptions } : f);
    setFields(nextFields);
    sync(nextFields, records, views, activeViewId);
  }, [fields, records, views, activeViewId, sync]);

  const updateOption = useCallback((fieldId: string, oldLabel: string, nLabel: string, nColor?: string) => {
      const field = fields.find(f => f.id === fieldId);
      if (!field || !field.options) return;

      const nextOptions = field.options.map(opt => 
          opt.label === oldLabel ? { ...opt, label: nLabel, color: nColor || opt.color } : opt
      );
      
      const nextFields = fields.map(f => f.id === fieldId ? { ...f, options: nextOptions } : f);
      const nextRecords = records.map(r => {
          if (r.values[fieldId] === oldLabel) {
              return { ...r, values: { ...r.values, [fieldId]: nLabel } };
          }
          return r;
      });

      setFields(nextFields);
      setRecords(nextRecords);
      sync(nextFields, nextRecords, views, activeViewId);
  }, [fields, records, views, activeViewId, sync]);

  const deleteOption = useCallback((fieldId: string, label: string) => {
      const field = fields.find(f => f.id === fieldId);
      if (!field || !field.options) return;

      const nextOptions = field.options.filter(opt => opt.label !== label);
      const nextFields = fields.map(f => f.id === fieldId ? { ...f, options: nextOptions } : f);
      
      const nextRecords = records.map(r => {
          if (r.values[fieldId] === label) {
              const nextValues = { ...r.values };
              delete nextValues[fieldId];
              return { ...r, values: nextValues };
          }
          return r;
      });

      setFields(nextFields);
      setRecords(nextRecords);
      sync(nextFields, nextRecords, views, activeViewId);
  }, [fields, records, views, activeViewId, sync]);

  const handleSwitchView = useCallback((id: string) => {
      setActiveViewId(id);
      sync(fields, records, views, id);
  }, [fields, records, views, sync]);

  const handleCreateView = useCallback((type: SheetViewType) => {
    const id = `v-${Date.now()}`;
    const name = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const newView: SheetView = { id, name, type, config: { hiddenFields: [] } };
    const next = [...views, newView];
    setViews(next);
    setActiveViewId(id);
    sync(fields, next, records, id);
  }, [views, fields, records, sync]);

  const handleRenameView = useCallback((viewId: string, newName: string) => {
    if (newName && newName.trim()) {
        const next = views.map(v => v.id === viewId ? { ...v, name: newName.trim() } : v);
        setViews(next);
        sync(fields, records, next, activeViewId);
    }
  }, [views, fields, records, activeViewId, sync]);

  const handleDeleteView = useCallback((viewId: string) => {
    if (views.length <= 1) return;
    const next = views.filter(v => v.id !== viewId);
    const nextActive = activeViewId === viewId ? next[0].id : activeViewId;
    setViews(next);
    setActiveViewId(nextActive);
    sync(fields, next, records, nextActive);
  }, [views, fields, records, activeViewId, sync]);

  const addFilter = useCallback(() => {
      setFilters(prev => [...prev, { id: `flt-${Date.now()}`, fieldId: fields[0].id, operator: 'contains', value: '' }]);
  }, [fields]);

  const updateFilter = useCallback((id: string, updates: Partial<FilterRule>) => {
      setFilters(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const removeFilter = useCallback((id: string) => {
      setFilters(prev => prev.filter(f => f.id !== id));
  }, []);

  const filteredRecords = useMemo(() => {
    let list = [...records];
    
    if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase().trim();
        list = list.filter(r => Object.values(r.values).some(v => String(v).toLowerCase().includes(s)));
    }

    if (filters.length > 0) {
        list = list.filter(record => {
            return filters.every(filter => {
                const fieldValue = record.values[filter.fieldId];
                const filterValue = filter.value.toLowerCase();
                const strValue = String(fieldValue || '').toLowerCase();

                switch (filter.operator) {
                    case 'contains': return strValue.includes(filterValue);
                    case 'is': return strValue === filterValue;
                    case 'is_not': return strValue !== filterValue;
                    case 'is_empty': return !fieldValue || strValue === '';
                    default: return true;
                }
            });
        });
    }

    if (sortConfig) {
        list.sort((a, b) => {
            const valA = String(a.values[sortConfig.fieldId] || '');
            const valB = String(b.values[sortConfig.fieldId] || '');
            return sortConfig.direction === 'asc' 
                ? valA.localeCompare(valB, undefined, { numeric: true }) 
                : valB.localeCompare(valA, undefined, { numeric: true });
        });
    }

    return list;
  }, [records, debouncedSearch, sortConfig, filters]);

  const handleResizeStart = useCallback((e: React.MouseEvent, fieldId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingFieldId(fieldId);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = currentWidth;
  }, []);

  useEffect(() => {
    if (!resizingFieldId) return;

    const handleMouseMove = (e: MouseEvent) => {
        const delta = e.clientX - resizeStartXRef.current;
        const nWidth = Math.max(80, resizeStartWidthRef.current + delta);
        setFields(prev => prev.map(f => f.id === resizingFieldId ? { ...f, width: nWidth } : f));
    };

    const handleMouseUp = () => {
        sync(fields, records, views, activeViewId);
        setResizingFieldId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingFieldId, fields, records, views, activeViewId, sync]);

  const visibleFields = useMemo(() => {
      const hidden = activeView.config?.hiddenFields || [];
      return fields.filter(f => !hidden.includes(f.id));
  }, [fields, activeView]);

  if (!isMounted) return null;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden select-none h-full font-sans">
        <div className="h-14 border-b flex items-center justify-between px-4 sm:px-6 bg-white shrink-0 z-30">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pr-4">
                {views.map(v => {
                    const ViewIcon = VIEW_ICONS[v.type] || Grid;
                    const isActive = v.id === activeViewId;
                    return (
                        <div key={v.id} 
                            className={cn(
                                "group relative flex items-center shrink-0 h-9 rounded-xl transition-all whitespace-nowrap px-1 gap-0.5",
                                isActive 
                                    ? "bg-primary/10 text-primary border border-primary/20" 
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                            )}
                        >
                            <button 
                                onClick={() => handleSwitchView(v.id)}
                                className="flex items-center gap-2 pl-2 pr-1 h-full font-bold text-xs outline-none"
                            >
                                <ViewIcon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-slate-400")} />
                                {v.name}
                            </button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className={cn(
                                        "h-6 w-6 rounded-md hover:bg-slate-900/5 flex items-center justify-center transition-all",
                                        isActive ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-100 text-slate-300"
                                    )}>
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48 rounded-xl p-1 shadow-2xl border-slate-100">
                                    <DropdownMenuItem onClick={() => {
                                        const nName = window.prompt('Rename view:', v.name);
                                        if (nName) handleRenameView(v.id, nName);
                                    }} className="gap-2 text-xs font-semibold py-2.5 rounded-lg cursor-pointer">
                                        <Edit className="h-3.5 w-3.5" /> Rename Tab
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCreateView(v.type)} className="gap-2 text-xs font-semibold rounded-lg cursor-pointer">
                                        <Copy className="h-3.5 w-3.5" /> Duplicate View
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-50" />
                                    <DropdownMenuItem onClick={() => handleDeleteView(v.id)} className="gap-2 text-xs font-semibold text-red-600 focus:text-red-600 py-2.5 rounded-lg cursor-pointer">
                                        <Trash2 className="h-3.5 w-3.5" /> Remove Tab
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                })}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl shrink-0 text-slate-300 hover:text-primary transition-colors ml-1">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-1 rounded-2xl shadow-3xl border-slate-100 bg-white">
                        <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest border-b mb-1">New Tab Logic</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleCreateView('grid')} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                            <Grid className="h-4 w-4 text-blue-500" /> Spreadsheet Grid
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCreateView('kanban')} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                            <Layout className="h-4 w-4 text-purple-500" /> Kanban Stacks
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCreateView('calendar')} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                            <CalendarIcon className="h-4 w-4 text-green-500" /> Date Calendar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex items-center gap-1.5">
                <div className="flex items-center">
                    {isSearchExpanded ? (
                        <div className="relative flex items-center animate-in slide-in-from-right-1 duration-200">
                             <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                             <Input 
                                autoFocus
                                placeholder="Find..." 
                                className="h-8 pl-7 pr-7 rounded-xl bg-slate-50 border-none shadow-inner text-[10px] font-semibold w-40 sm:w-56"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onBlur={() => !searchTerm && setIsSearchExpanded(false)}
                            />
                            <button onClick={() => {setSearchTerm(''); setIsSearchExpanded(false);}} className="absolute right-2 text-slate-300 hover:text-slate-600 transition-colors">
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-900" onClick={() => setIsSearchExpanded(true)}>
                            <Search className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>

                {isSyncing && <div className="mx-1"><Loader2 className="h-3.5 w-3.5 animate-spin text-primary opacity-50" /></div>}

                <div className="flex items-center gap-0.5">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className={cn("h-8 px-2 rounded-xl gap-1.5 font-bold text-[9px] uppercase tracking-wider transition-all", (activeView.config?.hiddenFields?.length || 0) > 0 ? "bg-primary/10 text-primary" : "text-slate-500 hover:text-slate-900")}>
                                <EyeOff className="h-3 w-3" /> 
                                <span className="hidden sm:inline">Hide</span>
                                {(activeView.config?.hiddenFields?.length || 0) > 0 && <Badge className="h-3.5 min-w-[14px] px-0.5 ml-0.5 bg-primary text-[7px] flex items-center justify-center">{activeView.config?.hiddenFields?.length}</Badge>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-0 overflow-hidden border-none shadow-3xl rounded-2xl bg-white">
                            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Visibility Protocol</h4>
                                <Button variant="ghost" size="sm" onClick={() => handleToggleAllFields(true)} className="h-7 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-blue-50">Show All</Button>
                            </div>
                            <ScrollArea className="max-h-72">
                                <div className="p-2 space-y-0.5">
                                    {fields.map(f => (
                                        <div key={f.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {React.createElement(FIELD_ICONS[f.type] || Type, { className: "h-3.5 w-3.5 text-slate-400 shrink-0" })}
                                                <span className="text-xs font-semibold text-slate-700 truncate">{f.name}</span>
                                            </div>
                                            <Switch 
                                                checked={!activeView.config?.hiddenFields?.includes(f.id)} 
                                                onCheckedChange={(checked) => handleToggleFieldVisibility(f.id, checked)}
                                                disabled={f.isPrimary}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className={cn("h-8 px-2 rounded-xl gap-1.5 font-bold text-[9px] uppercase tracking-wider transition-all", sortConfig ? "bg-primary/10 text-primary" : "text-slate-500 hover:text-slate-900")}>
                                <ArrowUpDown className="h-3.5 w-3.5" /> 
                                <span className="hidden sm:inline">Sort</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-1 rounded-xl shadow-2xl border-slate-100">
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 p-2">Order records by</DropdownMenuLabel>
                            {fields.map(f => (
                                <DropdownMenuItem key={f.id} onClick={() => setSortConfig({ fieldId: f.id, direction: sortConfig?.fieldId === f.id && sortConfig.direction === 'asc' ? 'desc' : 'asc' })} className="text-xs font-bold py-2 rounded-lg cursor-pointer flex justify-between">
                                    <div className="flex items-center gap-2">
                                        {React.createElement(FIELD_ICONS[f.type], { className: "h-3.5 w-3.5 opacity-40" })}
                                        {f.name}
                                    </div>
                                    {sortConfig?.fieldId === f.id && (
                                        <Badge variant="secondary" className="text-[8px]">{sortConfig.direction.toUpperCase()}</Badge>
                                    )}
                                </DropdownMenuItem>
                            ))}
                            {sortConfig && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setSortConfig(null)} className="text-xs font-bold py-2 rounded-lg cursor-pointer text-red-500">Clear all sorting</DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className={cn("h-8 px-2 rounded-xl gap-1.5 font-bold text-[9px] uppercase tracking-wider transition-all", filters.length > 0 ? "bg-primary/10 text-primary" : "text-slate-500 hover:text-slate-900")}>
                                <Filter className="h-3.5 w-3.5" /> 
                                <span className="hidden sm:inline">Filter</span>
                                {filters.length > 0 && <Badge className="h-3.5 min-w-[14px] px-0.5 ml-0.5 bg-primary text-[7px] flex items-center justify-center">{filters.length}</Badge>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-[320px] sm:w-[400px] p-0 overflow-hidden border-none shadow-3xl rounded-2xl bg-white">
                            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter Protocol</h4>
                                <Button variant="ghost" size="sm" onClick={() => setFilters([])} className="h-7 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50">Clear All</Button>
                            </div>
                            <ScrollArea className="max-h-72">
                                <div className="p-4 space-y-3">
                                    {filters.map((f, i) => (
                                        <div key={f.id} className="flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                                            <Select value={f.fieldId} onValueChange={(val) => updateFilter(f.id, { fieldId: val })}>
                                                <SelectTrigger className="w-[110px] h-9 rounded-xl text-[10px] font-bold">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {fields.map(field => <SelectItem key={field.id} value={field.id} className="text-xs font-bold">{field.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Select value={f.operator} onValueChange={(val: any) => updateFilter(f.id, { operator: val })}>
                                                <SelectTrigger className="w-[90px] h-9 rounded-xl text-[10px] font-bold">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="contains" className="text-xs font-bold">contains</SelectItem>
                                                    <SelectItem value="is" className="text-xs font-bold">is</SelectItem>
                                                    <SelectItem value="is_not" className="text-xs font-bold">is not</SelectItem>
                                                    <SelectItem value="is_empty" className="text-xs font-bold">is empty</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {!['is_empty', 'is_not_empty'].includes(f.operator) && (
                                                <Input 
                                                    placeholder="val..." 
                                                    value={f.value}
                                                    onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                                                    className="h-9 rounded-xl text-xs font-bold flex-1"
                                                />
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => removeFilter(f.id)} className="h-8 w-8 rounded-lg text-slate-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    ))}
                                    <Button variant="ghost" onClick={addFilter} className="w-full h-10 border-dashed border border-slate-200 rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50">
                                        <Plus className="h-3 w-3" /> Add Rule
                                    </Button>
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>

        {(filters.length > 0 || sortConfig || (activeView?.config?.hiddenFields?.length || 0) > 0) && (
            <div className="h-10 bg-slate-50/50 border-b flex items-center px-6 gap-2 shrink-0 overflow-x-auto scrollbar-none animate-in fade-in duration-300">
                {(activeView?.config?.hiddenFields?.length || 0) > 0 && (
                    <div className="flex items-center gap-1.5 mr-2">
                        <Badge variant="outline" className="h-6 px-2.5 rounded-lg border-none bg-blue-50 text-blue-600 font-bold text-[9px] uppercase gap-1.5">
                            <EyeOff className="h-3 w-3" /> {activeView?.config?.hiddenFields?.length} Hidden Fields
                        </Badge>
                    </div>
                )}
                
                {filters.length > 0 && (
                    <Badge variant="outline" className="h-6 px-2.5 rounded-lg border-none bg-green-50 text-green-700 font-bold text-[9px] uppercase gap-1.5">
                        <Filter className="h-3 w-3" /> Filtered by {filters.length} {filters.length === 1 ? 'rule' : 'rules'}
                    </Badge>
                )}

                {sortConfig && (
                    <Badge variant="outline" className="h-6 px-2.5 rounded-lg border-none bg-amber-50 text-amber-700 font-bold text-[9px] uppercase gap-1.5">
                        <ArrowUpDown className="h-3 w-3" /> Sorted by {fields.find(f => f.id === sortConfig.fieldId)?.name}
                    </Badge>
                )}
            </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col relative bg-white">
            {activeView?.type === 'grid' && (
                <ScrollArea className="flex-1">
                    <div className="inline-block min-w-full">
                        <div className="flex bg-slate-50/50 sticky top-0 z-20 border-b backdrop-blur-md">
                            <div className="w-12 h-10 border-r bg-slate-100/50 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-black text-slate-300">#</span>
                            </div>
                            {visibleFields.map((field) => (
                                <div key={field.id} style={{ width: field.width }} className="group h-10 border-r flex items-center justify-between px-3 shrink-0 relative">
                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                        {React.createElement(FIELD_ICONS[field.type] || Type, { className: "h-3.5 w-3.5 text-slate-400 shrink-0" })}
                                        {editingFieldId === field.id ? (
                                            <input 
                                                autoFocus
                                                className="text-[10px] font-black text-slate-900 uppercase tracking-widest bg-white border-none focus:ring-1 focus:ring-primary rounded px-1 h-7 w-full shadow-inner"
                                                defaultValue={field.name}
                                                onBlur={(e) => {
                                                    const nName = e.target.value.trim();
                                                    if (nName && nName !== field.name) {
                                                        const next = fields.map(f => f.id === field.id ? { ...f, name: nName } : f);
                                                        setFields(next);
                                                        sync(next, records, views, activeViewId);
                                                    }
                                                    setEditingFieldId(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                    if (e.key === 'Escape') setEditingFieldId(null);
                                                }}
                                            />
                                        ) : (
                                            <span 
                                                onDoubleClick={() => setEditingFieldId(field.id)}
                                                className="text-[10px] font-black text-slate-600 uppercase tracking-widest truncate flex-1 cursor-text"
                                            >
                                                {field.name}
                                            </span>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md hover:bg-slate-200 flex items-center justify-center transition-all">
                                                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56 rounded-xl p-1 shadow-2xl border-slate-100">
                                            <DropdownMenuItem className="gap-2 text-xs font-semibold rounded-lg cursor-pointer py-2.5" onClick={() => setEditingFieldId(field.id)}>
                                                <Edit className="h-3.5 w-3.5" /> Rename Column
                                            </DropdownMenuItem>
                                            
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger className="gap-2 text-xs font-semibold py-2.5">
                                                    <Settings2 className="h-3.5 w-3.5" /> Change Type
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent className="w-56 rounded-xl p-1 shadow-2xl">
                                                    <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-1.5 tracking-widest">Select logic</DropdownMenuLabel>
                                                    {FIELD_TYPES.map(ft => (
                                                        <DropdownMenuItem key={ft.type} onClick={() => changeFieldType(field.id, ft.type)} className="gap-3 font-semibold text-xs py-2 rounded-lg cursor-pointer">
                                                            {React.createElement(FIELD_ICONS[ft.type], { className: "h-3.5 w-3.5 opacity-40" })}
                                                            {ft.label}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>

                                            {(field.type === 'select' || field.type === 'status') && (
                                                <>
                                                    <DropdownMenuSeparator className="bg-slate-50" />
                                                    <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-1.5 tracking-widest">Options</DropdownMenuLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold rounded-lg cursor-pointer hover:bg-accent transition-colors">
                                                                <Tag className="h-3.5 w-3.5 text-blue-500" /> Manage Options
                                                            </div>
                                                        </PopoverTrigger>
                                                        <PopoverContent align="start" className="w-64 p-0 rounded-2xl shadow-3xl border-slate-100 overflow-hidden bg-white">
                                                            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Edit Categories</span>
                                                            </div>
                                                            <div className="p-4 space-y-3">
                                                                {field.options?.map((opt, idx) => (
                                                                    <div key={idx} className="flex items-center gap-2">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <button className={cn("h-5 w-5 rounded-full shrink-0 border border-white shadow-sm", opt.color.split(' ')[0])} />
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-white shadow-2xl">
                                                                                {OPTION_COLORS.map(c => (
                                                                                    <button key={c.value} onClick={() => updateOption(field.id, opt.label, opt.label, c.value)} className={cn("h-6 w-6 rounded-lg border", opt.color === c.value && "ring-2 ring-primary ring-offset-1")} style={{ backgroundColor: c.value.split(' ')[0].replace('bg-', '') }} />
                                                                                ))}
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                        <Input 
                                                                            defaultValue={opt.label} 
                                                                            onBlur={(e) => updateOption(field.id, opt.label, e.target.value)}
                                                                            className="h-8 text-xs font-bold bg-slate-50 border-none rounded-lg"
                                                                        />
                                                                        <Button variant="ghost" size="icon" onClick={() => deleteOption(field.id, opt.label)} className="h-7 w-7 text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </>
                                            )}

                                            <DropdownMenuSeparator className="bg-slate-50" />
                                            {!field.isPrimary && (
                                                <DropdownMenuItem onClick={() => deleteField(field.id)} className="gap-2 text-xs font-semibold text-red-600 rounded-lg cursor-pointer focus:text-red-600 py-2.5">
                                                    <Trash2 className="h-3.5 w-3.5" /> Purge Column
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <div 
                                        onMouseDown={(e) => handleResizeStart(e, field.id, field.width || 150)}
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/40 transition-colors z-30" 
                                    />
                                </div>
                            ))}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="h-10 w-12 flex items-center justify-center hover:bg-slate-50 border-r shrink-0 text-slate-300 hover:text-primary transition-all group outline-none">
                                        <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56 p-1 rounded-2xl shadow-3xl border-slate-100 bg-white z-[60]">
                                    <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest border-b mb-1">New Column Logic</DropdownMenuLabel>
                                    {FIELD_TYPES.map(ft => (
                                        <DropdownMenuItem key={ft.type} onClick={() => addField(ft.type)} className="gap-3 font-semibold text-xs py-2 rounded-xl cursor-pointer">
                                            {React.createElement(FIELD_ICONS[ft.type], { className: "h-3.5 w-3.5 opacity-40" })}
                                            {ft.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="divide-y">
                            {filteredRecords.map((record, idx) => (
                                <div key={record.id} className="flex hover:bg-slate-50/30 transition-colors group">
                                    <div className="w-12 h-10 border-r bg-slate-50/30 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0 group-hover:text-slate-900 transition-colors">
                                        {idx + 1}
                                    </div>
                                    {visibleFields.map((field) => (
                                        <div key={field.id} style={{ width: field.width }} className="h-10 border-r shrink-0 flex items-center relative">
                                            <CellRenderer 
                                                field={field} 
                                                value={record.values[field.id]} 
                                                onChange={(val: any) => updateRecordValue(record.id, field.id, val)}
                                                onExpand={() => setSelectedRecordId(record.id)}
                                                onAddOption={(label: string) => handleAddOptionDirectly(field.id, label)}
                                                onUpdateOption={updateOption}
                                                onDeleteOption={deleteOption}
                                                editable={editable}
                                            />
                                        </div>
                                    ))}
                                    <div className="flex-1 bg-white" />
                                </div>
                            ))}
                            <div className="flex hover:bg-slate-50/30 transition-colors h-10 items-center border-b">
                                <div className="w-12 h-10 shrink-0 border-r" />
                                <button onClick={addRecord} className="flex-1 h-10 px-4 text-xs font-bold text-slate-300 hover:text-primary transition-colors text-left flex items-center gap-2">
                                    <Plus className="h-3.5 w-3.5" /> New entry...
                                </button>
                            </div>
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            )}

            {activeView?.type === 'kanban' && (
                <KanbanView fields={fields} records={filteredRecords} onRecordClick={setSelectedRecordId} onRecordUpdate={updateRecordValue} />
            )}

            {activeView?.type === 'calendar' && (
                <CalendarView fields={fields} records={filteredRecords} onRecordClick={setSelectedRecordId} />
            )}
        </div>

        {selectedRecordId && (
            <div className="absolute inset-y-0 right-0 w-full sm:w-[500px] bg-white border-l shadow-3xl z-[100] animate-in slide-in-from-right duration-300 flex flex-col">
                <div className="h-16 border-b flex items-center justify-between px-6 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white shadow-sm text-primary">
                            <Maximize2 className="h-4 w-4" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Record Detail</h4>
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
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 min-h-[48px] flex items-center">
                                        <CellRenderer 
                                            field={field} 
                                            value={records.find(r => r.id === selectedRecordId)?.values[field.id]} 
                                            onChange={(val: any) => updateRecordValue(selectedRecordId, field.id, val)}
                                            onAddOption={(label: string) => handleAddOptionDirectly(field.id, label)}
                                            onUpdateOption={updateOption}
                                            onDeleteOption={deleteOption}
                                            editable={editable}
                                            isExpanded
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
                <div className="h-20 border-t p-6 bg-slate-50/50 flex items-center justify-end">
                    <Button onClick={() => setSelectedRecordId(null)} className="rounded-xl h-9 px-8 text-[10px] font-bold uppercase tracking-widest shadow-lg">Done</Button>
                </div>
            </div>
        )}
    </div>
  );
}

function KanbanView({ fields, records, onRecordClick, onRecordUpdate }: any) {
    const statusField = useMemo(() => fields.find((f: any) => f.type === 'status') || fields.find((f: any) => f.type === 'select'), [fields]);
    const [draggedRecordId, setDraggedRecordId] = useState<string | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    
    if (!statusField) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 gap-4 opacity-40">
                <AlertCircle className="h-12 w-12 text-slate-300" />
                <p className="text-sm font-black uppercase tracking-widest">Kanban Requires Status Field</p>
                <p className="text-xs font-bold text-slate-400">Add a 'Status' or 'Select' column to visualize work stacks.</p>
            </div>
        );
    }

    const groups = statusField.options || [{ label: 'Uncategorized', color: 'bg-slate-100 text-slate-400' }];

    const handleDragStart = (e: React.DragEvent, recordId: string) => {
        setDraggedRecordId(recordId);
        e.dataTransfer.setData('recordId', recordId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, statusLabel: string) => {
        e.preventDefault();
        const recordId = e.dataTransfer.getData('recordId');
        if (recordId) {
            onRecordUpdate(recordId, statusField.id, statusLabel);
        }
        setDraggedRecordId(null);
        setDropTargetId(null);
    };

    return (
        <ScrollArea className="flex-1 h-full bg-slate-50/30">
            <div className="flex gap-8 p-10 h-full min-h-[600px]">
                {groups.map((group: any) => {
                    const groupRecords = records.filter((r: any) => r.values[statusField.id] === group.label || (!r.values[statusField.id] && group.label === 'Uncategorized'));
                    const isTarget = dropTargetId === group.label;

                    return (
                        <div 
                            key={group.label} 
                            className={cn(
                                "w-80 shrink-0 flex flex-col gap-6 p-4 rounded-3xl transition-all duration-300",
                                isTarget ? "bg-primary/5 ring-2 ring-primary/20 scale-[1.02]" : "bg-transparent"
                            )}
                            onDragOver={(e) => { e.preventDefault(); setDropTargetId(group.label); }}
                            onDragLeave={() => setDropTargetId(null)}
                            onDrop={(e) => handleDrop(e, group.label)}
                        >
                            <div className="flex items-center justify-between px-3">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-widest border-none px-3 py-1 shadow-sm", group.color)}>
                                        {group.label}
                                    </Badge>
                                    <span className="text-[10px] font-black text-slate-300">{groupRecords.length}</span>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1">
                                {groupRecords.map((r: any) => (
                                    <Card 
                                        key={r.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, r.id)}
                                        onClick={() => onRecordClick(r.id)} 
                                        className={cn(
                                            "border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-grab active:cursor-grabbing group rounded-[1.5rem] bg-white p-6 relative animate-in fade-in zoom-in-95 duration-200",
                                            draggedRecordId === r.id && "opacity-40 grayscale"
                                        )}
                                    >
                                        <p className="text-sm font-black text-slate-900 leading-tight mb-4 group-hover:text-primary transition-colors">{r.values[fields[0].id] || 'Untitled Object'}</p>
                                        <div className="space-y-3">
                                            {fields.slice(1, 4).map((f: any) => {
                                                const val = r.values[f.id];
                                                if (!val || f.id === statusField.id) return null;
                                                return (
                                                    <div key={f.id} className="flex items-center gap-2.5">
                                                        {React.createElement(FIELD_ICONS[f.type] || Type, { className: "h-3 w-3 text-slate-300 shrink-0" })}
                                                        <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500 truncate">{f.type === 'currency' ? `₱${Number(val).toLocaleString()}` : val}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
}

function CalendarView({ fields, records, onRecordClick }: any) {
    const [viewDate, setViewDate] = useState(new Date());
    const dateField = useMemo(() => fields.find((f: any) => f.type === 'date'), [fields]);
    
    if (!dateField) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 gap-4 opacity-40">
                <CalendarDays className="h-12 w-12 text-slate-300" />
                <p className="text-sm font-black uppercase tracking-widest">Calendar Requires Date Field</p>
                <p className="text-xs font-bold text-slate-400">Add a 'Date' column to visualize items on a timeline.</p>
            </div>
        );
    }

    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50/50">
            <div className="h-16 border-b bg-white px-8 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">{format(viewDate, 'MMMM yyyy')}</h3>
                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl shadow-inner">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white transition-all" onClick={() => setViewDate(subMonths(viewDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white transition-all" onClick={() => setViewDate(addMonths(viewDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewDate(new Date())} className="h-10 rounded-xl px-6 font-black text-[10px] uppercase tracking-widest shadow-sm bg-white">Today</Button>
            </div>
            <ScrollArea className="flex-1">
                <div className="grid grid-cols-7 border-l border-t">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="h-12 border-r border-b bg-white flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">{d}</span>
                        </div>
                    ))}
                    {days.map(day => {
                        const dayRecords = records.filter((r: any) => r.values[dateField.id] && isSameDay(new Date(r.values[dateField.id]), day));
                        const isToday = isSameDay(day, new Date());
                        return (
                            <div key={day.toISOString()} className="min-h-[160px] bg-white border-r border-b p-3 space-y-2 group hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <span className={cn(
                                        "text-[10px] font-black w-7 h-7 flex items-center justify-center rounded-xl transition-all",
                                        isToday ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : "text-slate-300 group-hover:text-slate-900"
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                                <div className="space-y-1.5 overflow-hidden">
                                    {dayRecords.map((r: any) => (
                                        <div key={r.id} onClick={() => onRecordClick(r.id)} className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 cursor-pointer hover:bg-white hover:shadow-md transition-all animate-in zoom-in-95">
                                            <p className="text-[10px] font-black text-primary truncate leading-none uppercase tracking-tight">{r.values[fields[0].id] || 'Untitled'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}
