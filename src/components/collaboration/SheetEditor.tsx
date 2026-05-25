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
    Calendar as CalendarIcon
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
import type { SheetField, SheetRecord, SheetView, SheetFieldType, SheetViewType, RowHeight } from '@/lib/types';
import { useMounted } from '@/hooks/use-mounted';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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

export function SheetEditor({ initialData, onContentChange, editable = true }: SheetEditorProps) {
  const isMounted = useMounted();
  const { toast } = useToast();

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
      { id: 'r1', values: { f1: 'Initialize Workspace', f2: 'In Progress', f3: format(new Date(), 'yyyy-MM-dd') }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAllFieldsVisible, setIsAllFieldsVisible] = useState(false);
  
  const [sortRules, setSortRules] = useState<SortRule[]>(initialData?.views?.find((v: any) => v.id === initialData?.activeViewId)?.config?.sorts || []);
  const [autoSort, setAutoSort] = useState(true);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const activeView = useMemo(() => {
    if (!views || views.length === 0) {
        return { id: 'v1', name: 'Grid', type: 'grid', config: { hiddenFields: [], rowHeight: 'medium', wrapHeaders: false, sorts: [], groupByFieldId: '' } } as SheetView;
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
        currencySymbol: type === 'currency' ? '₱' : undefined,
        options: (type === 'status' || type === 'select') ? [
            { label: 'Option 1', color: 'bg-slate-100 text-slate-700' },
            { label: 'Option 2', color: 'bg-blue-50 text-blue-700' }
        ] : undefined
    };
    const next = [...fields, newField];
    setFields(next);
    sync(next, records, views, activeViewId);
  }, [fields, records, views, activeViewId, sync]);

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
  }, [fields, records, views, activeViewId, sync, toast]);

  const changeFieldType = useCallback((fieldId: string, newType: SheetFieldType) => {
      const next = fields.map(f => f.id === fieldId ? { 
          ...f, 
          type: newType,
          currencySymbol: newType === 'currency' ? (f.currencySymbol || '₱') : undefined,
          options: (newType === 'status' || newType === 'select') && !f.options ? [
              { label: 'Option 1', color: 'bg-slate-100 text-slate-700' },
              { label: 'Option 2', color: 'bg-blue-50 text-blue-700' }
          ] : f.options
      } : f);
      setFields(next);
      sync(next, records, views, activeViewId);
  }, [fields, records, views, activeViewId, sync]);

  const updateField = useCallback((fieldId: string, updates: Partial<SheetField>) => {
    const next = fields.map(f => f.id === fieldId ? { ...f, ...updates } : f);
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

  const handleRowHeightChange = (height: RowHeight) => {
    const nextViews = views.map(v => v.id === activeViewId ? {
        ...v,
        config: { ...v.config, rowHeight: height }
    } : v);
    setViews(nextViews);
    sync(fields, records, nextViews, activeViewId);
  };

  const handleToggleWrapHeaders = (enabled: boolean) => {
    const nextViews = views.map(v => v.id === activeViewId ? {
        ...v,
        config: { ...v.config, wrapHeaders: enabled }
    } : v);
    setViews(nextViews);
    sync(fields, records, nextViews, activeViewId);
  };

  const handleGroupByChange = (fieldId: string) => {
      const nextViews = views.map(v => v.id === activeViewId ? {
          ...v,
          config: { ...v.config, groupByFieldId: v.config?.groupByFieldId === fieldId ? '' : fieldId }
      } : v);
      setViews(nextViews);
      sync(fields, records, nextViews, activeViewId);
      // Reset collapsed state on grouping change
      setCollapsedGroups({});
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => ({
        ...prev,
        [groupKey]: !prev[groupKey]
    }));
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
      const targetView = views.find(v => v.id === id);
      setSortRules(targetView?.config?.sorts || []);
      sync(fields, records, views, id);
      setCollapsedGroups({});
  }, [fields, records, views, sync]);

  const handleCreateView = useCallback((type: SheetViewType) => {
    const id = `v-${Date.now()}`;
    const name = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const newView: SheetView = { id, name, type, config: { hiddenFields: [], rowHeight: 'medium', wrapHeaders: false, sorts: [], groupByFieldId: '' } };
    const next = [...views, newView];
    setViews(next);
    setActiveViewId(id);
    setSortRules([]);
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

  const addSortRule = useCallback(() => {
      const newRule: SortRule = { id: `sort-${Date.now()}`, fieldId: fields[0].id, direction: 'asc' };
      const nextRules = [...sortRules, newRule];
      setSortRules(nextRules);
      if (autoSort) {
          const nextViews = views.map(v => v.id === activeViewId ? { ...v, config: { ...v.config, sorts: nextRules } } : v);
          setViews(nextViews);
          sync(fields, records, nextViews, activeViewId);
      }
  }, [sortRules, fields, autoSort, views, activeViewId, sync, records]);

  const updateSortRule = useCallback((id: string, updates: Partial<SortRule>) => {
      const nextRules = sortRules.map(r => r.id === id ? { ...r, ...updates } : r);
      setSortRules(nextRules);
      if (autoSort) {
        const nextViews = views.map(v => v.id === activeViewId ? { ...v, config: { ...v.config, sorts: nextRules } } : v);
        setViews(nextViews);
        sync(fields, records, nextViews, activeViewId);
      }
  }, [sortRules, autoSort, views, activeViewId, sync, fields, records]);

  const removeSortRule = useCallback((id: string) => {
      const nextRules = sortRules.filter(r => r.id !== id);
      setSortRules(nextRules);
      const nextViews = views.map(v => v.id === activeViewId ? { ...v, config: { ...v.config, sorts: nextRules } } : v);
      setViews(nextViews);
      sync(fields, records, nextViews, activeViewId);
  }, [sortRules, views, activeViewId, sync, fields, records]);

  const getSortLabels = (fieldId: string) => {
      const field = fields.find(f => f.id === fieldId);
      if (!field) return { asc: 'A → Z', desc: 'Z → A' };
      switch (field.type) {
          case 'number':
          case 'currency': return { asc: '1 → 9', desc: '9 → 1' };
          case 'date': return { asc: 'Earliest → Latest', desc: 'Latest → Earliest' };
          case 'checkbox': return { asc: 'Unchecked → Checked', desc: 'Checked → Unchecked' };
          default: return { asc: 'A → Z', desc: 'Z → A' };
      }
  };

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

    if (sortRules.length > 0) {
        list.sort((a, b) => {
            for (const rule of sortRules) {
                const field = fields.find(f => f.id === rule.fieldId);
                const valA = a.values[rule.fieldId];
                const valB = b.values[rule.fieldId];
                
                if (valA === valB) continue;
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;

                let comparison = 0;
                if (field?.type === 'number' || field?.type === 'currency') {
                    comparison = Number(valA) - Number(valB);
                } else if (field?.type === 'date') {
                    comparison = new Date(valA).getTime() - new Date(valB).getTime();
                } else {
                    comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
                }

                return rule.direction === 'asc' ? comparison : -comparison;
            }
            return 0;
        });
    }

    return list;
  }, [records, debouncedSearch, sortRules, filters, fields]);

  const groupedRecords = useMemo(() => {
      const fieldId = activeView.config?.groupByFieldId;
      if (!fieldId) return { flat: filteredRecords };

      const groups: Record<string, SheetRecord[]> = {};
      filteredRecords.forEach(r => {
          const val = String(r.values[fieldId] || 'Uncategorized');
          if (!groups[val]) groups[val] = [];
          groups[val].push(r);
      });
      return groups;
  }, [filteredRecords, activeView]);

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

  const rowHeightClass = useMemo(() => {
    const height = activeView.config?.rowHeight || 'medium';
    switch (height) {
        case 'short': return 'h-8';
        case 'tall': return 'h-16';
        case 'extra-tall': return 'h-24';
        default: return 'h-10';
    }
  }, [activeView]);

  const headerWrapClass = activeView.config?.wrapHeaders ? 'whitespace-normal leading-tight py-2' : 'whitespace-nowrap';

  const groupSuggestions = useMemo(() => fields.filter(f => ['status', 'select', 'text', 'date', 'checkbox'].includes(f.type)).slice(0, 5), [fields]);

  if (!isMounted) return null;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden select-none h-full font-sans">
        {/* View Selection & Global Actions Toolbar */}
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
                                    : "text-slate-5050 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
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
                        <DropdownMenuItem onClick={() => handleCreateView('gantt')} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                            <GanttChart className="h-4 w-4 text-orange-500" /> Gantt Chart
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
                                <X className="h-4 w-4" />
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

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className={cn("h-8 px-2 rounded-xl gap-1.5 font-bold text-[9px] uppercase tracking-wider transition-all", sortRules.length > 0 ? "bg-primary/10 text-primary" : "text-slate-500 hover:text-slate-900")}>
                                <ArrowUpDown className="h-3.5 w-3.5" /> 
                                <span className="hidden sm:inline">Sort</span>
                                {sortRules.length > 0 && <Badge className="h-3.5 min-w-[14px] px-0.5 ml-0.5 bg-primary text-[7px] flex items-center justify-center">{sortRules.length}</Badge>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-[380px] p-0 overflow-hidden border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl bg-white z-[60]">
                            <div className="p-4 bg-slate-50/50 border-b flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-black uppercase tracking-tight text-slate-900">Sort by</h4>
                                    <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                                </div>
                            </div>
                            <ScrollArea className="max-h-[300px]">
                                <div className="p-4 space-y-3">
                                    {sortRules.map((rule) => {
                                        const labels = getSortLabels(rule.fieldId);
                                        return (
                                            <div key={rule.id} className="flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                                                <div className="flex-1 grid grid-cols-[1fr_auto] gap-2 p-1 bg-slate-50 border rounded-xl">
                                                    <Select value={rule.fieldId} onValueChange={(val) => updateSortRule(rule.id, { fieldId: val })}>
                                                        <SelectTrigger className="h-9 border-none bg-transparent shadow-none font-bold text-xs focus:ring-0">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            {fields.map(f => <SelectItem key={f.id} value={f.id} className="text-xs font-bold">{f.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select value={rule.direction} onValueChange={(val: any) => updateSortRule(rule.id, { direction: val })}>
                                                        <SelectTrigger className="w-[140px] h-9 border-none bg-transparent shadow-none font-bold text-xs focus:ring-0 border-l rounded-none">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            <SelectItem value="asc" className="text-xs font-bold">{labels.asc}</SelectItem>
                                                            <SelectItem value="desc" className="text-xs font-bold">{labels.desc}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-center gap-0.5">
                                                    <Button variant="ghost" size="icon" onClick={() => removeSortRule(rule.id)} className="h-8 w-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"><X className="h-4 w-4" /></Button>
                                                    <div className="h-8 w-8 flex items-center justify-center text-slate-200 cursor-grab"><GripVertical className="h-4 w-4" /></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <Button variant="ghost" onClick={addSortRule} className="w-full h-10 rounded-xl gap-3 text-[11px] font-bold text-slate-400 hover:text-primary hover:bg-primary/5 transition-all justify-start px-3">
                                        <Plus className="h-3.5 w-3.5" /> Add another sort
                                    </Button>
                                </div>
                            </ScrollArea>
                            <div className="p-4 bg-slate-50/50 border-t flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Switch checked={autoSort} onCheckedChange={setAutoSort} className="scale-75" />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Automatically sort records</span>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    
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

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className={cn("h-8 px-2 rounded-xl gap-1.5 font-bold text-[9px] uppercase tracking-wider transition-all", activeView.config?.groupByFieldId ? "bg-primary/10 text-primary" : "text-slate-500 hover:text-slate-900")}>
                                <Layout className="h-3.5 w-3.5" /> 
                                <span className="hidden sm:inline">Group</span>
                                {activeView.config?.groupByFieldId && <Badge className="h-3.5 min-w-[14px] px-0.5 ml-0.5 bg-primary text-[7px] flex items-center justify-center">1</Badge>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-[320px] p-0 overflow-hidden border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl bg-white z-[60]">
                            <div className="p-4 bg-slate-50/50 border-b flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-black uppercase tracking-tight text-slate-900">Group by</h4>
                                    <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleGroupByChange('')} className="h-7 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">Clear</Button>
                            </div>
                            <ScrollArea className="max-h-[400px]">
                                <div className="p-4 space-y-6">
                                    <div className="space-y-2">
                                        <p className="px-1 text-[9px] font-black uppercase tracking-widest text-slate-300">Pick a field to group by</p>
                                        <div className="space-y-0.5">
                                            {groupSuggestions.map(f => (
                                                <button 
                                                    key={f.id} 
                                                    onClick={() => handleGroupByChange(f.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                                                        activeView.config?.groupByFieldId === f.id ? "bg-primary/5 text-primary" : "text-slate-600 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <ChevronDownCircle className={cn("h-4 w-4", activeView.config?.groupByFieldId === f.id ? "text-primary" : "text-slate-300")} />
                                                    <span className="text-xs font-bold">{f.name}</span>
                                                    {activeView.config?.groupByFieldId === f.id && <Check className="h-3.5 w-3.5 ml-auto" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {!isAllFieldsVisible && fields.length > 5 && (
                                        <button 
                                            onClick={() => setIsAllFieldsVisible(true)}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                                        >
                                            <ChevronDown className="h-3.5 w-3.5" /> See all fields
                                        </button>
                                    )}

                                    {isAllFieldsVisible && (
                                        <div className="space-y-0.5 pt-2 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {fields.filter(f => !groupSuggestions.find(s => s.id === f.id)).map(f => (
                                                <button 
                                                    key={f.id} 
                                                    onClick={() => handleGroupByChange(f.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                                                        activeView.config?.groupByFieldId === f.id ? "bg-primary/5 text-primary" : "text-slate-600 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <ChevronDownCircle className={cn("h-4 w-4", activeView.config?.groupByFieldId === f.id ? "text-primary" : "text-slate-300")} />
                                                    <span className="text-xs font-bold">{f.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className={cn("h-8 px-2 rounded-xl gap-1.5 font-bold text-[9px] uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-all")}>
                                <Rows className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Appearance</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-0 overflow-hidden border-none shadow-3xl rounded-2xl bg-white">
                            <div className="p-4 bg-slate-50 border-b">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Layout Protocol</h4>
                            </div>
                            <div className="p-2 space-y-4">
                                <div className="space-y-2">
                                    <p className="px-2 text-[9px] font-black uppercase tracking-widest text-slate-300">Select a row height</p>
                                    <div className="space-y-0.5">
                                        {ROW_HEIGHT_OPTIONS.map((opt) => (
                                            <button 
                                                key={opt.id}
                                                onClick={() => handleRowHeightChange(opt.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                                                    (activeView.config?.rowHeight || 'medium') === opt.id ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
                                                )}
                                            >
                                                {React.createElement(opt.icon, { className: "h-4 w-4" })}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Separator className="bg-slate-50" />
                                <div className="p-1 space-y-1">
                                    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <RotateCcw className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                            <span className="text-xs font-bold text-slate-600">Wrap headers</span>
                                        </div>
                                        <Switch 
                                            checked={activeView.config?.wrapHeaders || false} 
                                            onCheckedChange={handleToggleWrapHeaders}
                                        />
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>

        {/* Filter Status Bar */}
        {(filters.length > 0 || sortRules.length > 0 || activeView.config?.groupByFieldId || (activeView?.config?.hiddenFields?.length || 0) > 0) && (
            <div className="h-10 bg-slate-50/50 border-b flex items-center px-6 gap-2 shrink-0 overflow-x-auto scrollbar-none animate-in fade-in duration-300">
                {(activeView?.config?.hiddenFields?.length || 0) > 0 && (
                    <div className="flex items-center gap-1.5 mr-2">
                        <Badge variant="outline" className="h-6 px-2.5 rounded-lg border-none bg-blue-50 text-blue-600 font-bold text-[9px] uppercase gap-1.5">
                            <EyeOff className="h-3 w-3" /> {activeView?.config?.hiddenFields?.length} Hidden Fields
                        </Badge>
                    </div>
                )}
                
                {activeView.config?.groupByFieldId && (
                    <Badge variant="outline" className="h-6 px-2 pr-1 rounded-lg border-none bg-primary text-white font-bold text-[9px] uppercase gap-1.5 flex items-center animate-in zoom-in-95 duration-200" onClick={() => toggleGroup(String(activeView.config?.groupByFieldId))}>
                        <Layout className="h-3 w-3" />
                        <span>Grouped by {fields.find(f => f.id === activeView.config?.groupByFieldId)?.name}</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleGroupByChange(''); }}
                            className="h-4 w-4 rounded-md hover:bg-white/20 flex items-center justify-center transition-colors ml-1"
                        >
                            <X className="h-2.5 w-2.5" />
                        </button>
                    </Badge>
                )}

                {filters.map(f => {
                    const field = fields.find(field => field.id === f.fieldId);
                    return (
                        <Badge 
                            key={f.id} 
                            variant="outline" 
                            className="h-6 px-2 pr-1 rounded-lg border-none bg-green-50 text-green-700 font-bold text-[9px] uppercase gap-1.5 flex items-center animate-in zoom-in-95 duration-200"
                        >
                            <Filter className="h-3 w-3" />
                            <span>{field?.name || 'Field'} {f.operator.replace('_', ' ')} {f.value ? `"${f.value}"` : ''}</span>
                            <button 
                                onClick={() => removeFilter(f.id)}
                                className="h-4 w-4 rounded-md hover:bg-green-200/50 flex items-center justify-center transition-colors ml-1"
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </Badge>
                    );
                })}

                {sortRules.map(r => {
                    const field = fields.find(f => f.id === r.fieldId);
                    const labels = getSortLabels(r.fieldId);
                    return (
                        <Badge key={r.id} variant="outline" className="h-6 px-2 pr-1 rounded-lg border-none bg-amber-50 text-amber-700 font-bold text-[9px] uppercase gap-1.5 flex items-center">
                            <ArrowUpDown className="h-3 w-3" />
                            <span>Sorted by {field?.name} ({r.direction === 'asc' ? labels.asc : labels.desc})</span>
                            <button 
                                onClick={() => removeSortRule(r.id)}
                                className="h-4 w-4 rounded-md hover:bg-amber-200/50 flex items-center justify-center transition-colors ml-1"
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </Badge>
                    );
                })}
            </div>
        )}

        {/* View Layout Renderer */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-white">
            {activeView?.type === 'grid' && (
                <ScrollArea className="flex-1">
                    <div className="inline-block min-w-full">
                        <div className="flex bg-slate-50/50 sticky top-0 z-20 border-b backdrop-blur-md min-h-[40px]">
                            <div className="w-12 border-r bg-slate-100/50 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-black text-slate-300">#</span>
                            </div>
                            {visibleFields.map((field) => (
                                <div key={field.id} style={{ width: field.width }} className="group border-r flex items-center justify-between px-3 shrink-0 relative">
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
                                                className={cn(
                                                    "text-[10px] font-black text-slate-600 uppercase tracking-widest truncate flex-1 cursor-text",
                                                    headerWrapClass
                                                )}
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

                                            {field.type === 'currency' && (
                                                <>
                                                    <DropdownMenuSeparator className="bg-slate-50" />
                                                    <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-1.5 tracking-widest">Currency Symbol</DropdownMenuLabel>
                                                    <div className="grid grid-cols-4 gap-1 p-1">
                                                        {CURRENCY_SYMBOLS.map(symbol => (
                                                            <button 
                                                                key={symbol} 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateField(field.id, { currencySymbol: symbol });
                                                                }}
                                                                className={cn(
                                                                    "h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-all hover:bg-slate-100",
                                                                    (field.currencySymbol || '₱') === symbol ? "bg-primary/10 text-primary" : "text-slate-600"
                                                                )}
                                                            >
                                                                {symbol}
                                                            </button>
                                                        ))}
                                                    </div>
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

                        <div className="divide-y pb-20">
                            {Object.entries(groupedRecords).map(([groupKey, groupRecords], gIdx) => {
                                const isCollapsed = collapsedGroups[groupKey];
                                return (
                                    <React.Fragment key={groupKey}>
                                        {activeView.config?.groupByFieldId && (
                                            <div 
                                                className="bg-slate-50/80 sticky top-10 z-10 px-6 py-2 border-b flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors group/header"
                                                onClick={() => toggleGroup(groupKey)}
                                            >
                                                <ChevronRight className={cn(
                                                    "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                                                    !isCollapsed && "rotate-90"
                                                )} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 group-hover/header:tracking-[0.4em] transition-all duration-500">{groupKey}</span>
                                                <Badge variant="outline" className="h-5 px-2 bg-white text-slate-400 border-slate-100 text-[8px] font-bold">{groupRecords.length} Items</Badge>
                                            </div>
                                        )}
                                        {!isCollapsed && groupRecords.map((record, idx) => (
                                            <div key={record.id} className={cn("flex hover:bg-slate-50/30 transition-colors group", rowHeightClass)}>
                                                <div className="w-12 border-r bg-slate-50/30 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0 group-hover:text-slate-900 transition-colors">
                                                    {idx + 1}
                                                </div>
                                                {visibleFields.map((field) => (
                                                    <div key={field.id} style={{ width: field.width }} className="border-r shrink-0 flex items-center relative">
                                                        <CellRenderer 
                                                            field={field} 
                                                            value={record.values[field.id]} 
                                                            onChange={(val: any) => updateRecordValue(record.id, field.id, val)}
                                                            onAddOption={(label: string) => handleAddOptionDirectly(field.id, label)}
                                                            onUpdateOption={updateOption}
                                                            onDeleteOption={deleteOption}
                                                            onUpdateField={updateField}
                                                            editable={editable}
                                                        />
                                                    </div>
                                                ))}
                                                <div className="flex-1 bg-white" />
                                            </div>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                            <div className={cn("flex hover:bg-slate-50/30 transition-colors items-center border-b", rowHeightClass)}>
                                <div className="w-12 h-full shrink-0 border-r" />
                                <button onClick={addRecord} className="flex-1 h-full px-4 text-xs font-bold text-slate-300 hover:text-primary transition-colors text-left flex items-center gap-2">
                                    <Plus className="h-3.5 w-3.5" /> New entry...
                                </button>
                            </div>
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            )}

            {activeView?.type === 'kanban' && (
                <KanbanView fields={fields} records={filteredRecords} onRecordClick={(id: string) => {}} onRecordUpdate={updateRecordValue} />
            )}

            {activeView?.type === 'calendar' && (
                <CalendarView fields={fields} records={filteredRecords} onRecordClick={(id: string) => {}} />
            )}

            {activeView?.type === 'gantt' && (
                <GanttView fields={fields} records={filteredRecords} onRecordClick={(id: string) => {}} onRecordUpdate={updateRecordValue} />
            )}
        </div>
    </div>
  );
}
