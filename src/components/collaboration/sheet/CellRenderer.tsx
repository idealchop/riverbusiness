'use client';

import React, { useState, useEffect, memo } from 'react';
import { 
    ChevronDown, 
    Trash2, 
    X, 
    Maximize2, 
    Plus, 
    Globe, 
    Mail, 
    Phone, 
    AlignLeft,
    Check,
    CalendarDays
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
    Popover,
    PopoverContent,
    PopoverTrigger 
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { OPTION_COLORS, CURRENCY_SYMBOLS } from './constants';

export const CellRenderer = memo(({ field, value, onChange, onExpand, onAddOption, onUpdateOption, onDeleteOption, onUpdateField, editable, isExpanded = false }: any) => {
    const [localValue, setLocalValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);
    const [newOptionLabel, setNewOptionLabel] = useState('');
    const [isLongTextPopoverOpen, setIsLongTextPopoverOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => setLocalValue(value), [value]);

    const handleBlur = () => {
        setIsEditing(false);
        let finalValue = localValue;
        
        if (field.type === 'number' || field.type === 'currency') {
            const parsed = localValue === '' ? null : Number(localValue);
            finalValue = isNaN(parsed as any) ? value : parsed;
        }

        if (finalValue !== value) onChange(finalValue);
    };

    if (field.type === 'checkbox') {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <Checkbox 
                    checked={!!value} 
                    onCheckedChange={(checked) => onChange(!!checked)}
                    disabled={!editable}
                    className="h-4 w-4 rounded-md border-slate-300 transition-all cursor-pointer"
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
                            <Badge className={cn("text-[10px] font-bold uppercase tracking-widest border-none shadow-none px-2.5 h-6", option?.color || 'bg-slate-100 text-slate-700')}>
                                {value}
                            </Badge>
                        ) : <span className="text-slate-200 text-xs italic">Select...</span>}
                        {!isExpanded && <ChevronDown className="h-3.5 w-3.5 text-slate-200 group-hover/cell:text-slate-400 transition-colors" />}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-0 rounded-[1.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white overflow-hidden animate-in zoom-in-95 duration-200 z-[60]">
                    <ScrollArea className="max-h-64">
                        <div className="p-2 space-y-0.5">
                            {field.options?.map((opt: any) => (
                                <div key={opt.label} className="flex items-center gap-1 group/item pr-1 transition-all">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button 
                                                className={cn(
                                                    "h-4 w-4 rounded-full ml-3 border border-slate-100 shadow-sm transition-all hover:scale-125 cursor-pointer shrink-0",
                                                    opt.color.split(' ')[0]
                                                )} 
                                            />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent side="right" align="start" className="w-[440px] p-4 rounded-[2rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-none z-[70] animate-in slide-in-from-left-2">
                                            <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4 px-2">
                                                Color Protocol: {opt.label}
                                            </DropdownMenuLabel>
                                            <div className="grid grid-cols-11 gap-1.5">
                                                {OPTION_COLORS.map(c => (
                                                    <button 
                                                        key={c.value} 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUpdateOption(field.id, opt.label, opt.label, c.value);
                                                        }} 
                                                        className={cn(
                                                            "h-7 w-full rounded-full border border-transparent transition-all hover:scale-110 flex items-center justify-center px-1 overflow-hidden", 
                                                            c.value,
                                                            opt.color === c.value && "ring-2 ring-primary ring-offset-2 scale-110 z-10"
                                                        )}
                                                    >
                                                        <span className="text-[7px] font-black uppercase tracking-tighter truncate opacity-60">{opt.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <DropdownMenuItem onClick={() => onChange(opt.label)} className="flex-1 gap-3 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl cursor-pointer py-3 px-3">
                                        <span className="flex-1 truncate">{opt.label}</span>
                                        {value === opt.label && <Check className="h-3.5 w-3.5 text-primary stroke-[3]" />}
                                    </DropdownMenuItem>
                                    
                                    {editable && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteOption(field.id, opt.label); }}
                                            className="h-8 w-8 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shrink-0"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    
                    {editable && (
                        <div className="p-3 bg-slate-50/50 border-t border-slate-50">
                            <div className="relative">
                                <Plus className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                                <input 
                                    placeholder="NEW..." 
                                    value={newOptionLabel}
                                    onChange={(e) => setNewOptionLabel(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newOptionLabel.trim()) {
                                            onAddOption(newOptionLabel.trim());
                                            onChange(newOptionLabel.trim());
                                            setNewOptionLabel('');
                                        }
                                    }}
                                    className="w-full h-9 pl-8 pr-4 rounded-full bg-white border border-slate-100 shadow-inner text-[9px] font-black uppercase tracking-[0.2em] focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-slate-200 transition-all" 
                                />
                            </div>
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    if (field.type === 'longtext' && !isExpanded) {
        return (
            <div className="w-full h-full flex items-center group/longtext relative overflow-hidden">
                <div 
                    className="flex-1 px-3 py-2 text-sm font-semibold truncate cursor-text"
                    onClick={() => editable && setIsEditing(true)}
                >
                    {value || <span className="text-slate-200 italic font-normal">...</span>}
                </div>
                <Popover open={isLongTextPopoverOpen} onOpenChange={setIsLongTextPopoverOpen}>
                    <PopoverTrigger asChild>
                        <button className="opacity-0 group-hover/longtext:opacity-100 p-1.5 mr-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-all shrink-0">
                            <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[480px] p-0 rounded-[2rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white overflow-hidden z-[60] animate-in zoom-in-95 duration-200">
                        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlignLeft className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{field.name}</span>
                            </div>
                            <button onClick={() => setIsLongTextPopoverOpen(false)} className="text-slate-300 hover:text-slate-900 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <textarea
                            autoFocus
                            value={localValue || ''}
                            onChange={(e) => setLocalValue(e.target.value)}
                            onBlur={handleBlur}
                            className="w-full min-h-[240px] p-6 text-sm font-semibold bg-white focus:outline-none resize-none leading-relaxed"
                            placeholder="Enter detailed content..."
                        />
                        <div className="p-4 bg-slate-50/50 border-t flex justify-end">
                            <Button 
                                onClick={() => setIsLongTextPopoverOpen(false)}
                                className="h-9 rounded-xl px-8 font-black text-[10px] uppercase tracking-widest shadow-lg"
                            >
                                Done
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        );
    }

    if (field.type === 'date') {
        return (
            <Popover>
                <PopoverTrigger asChild>
                    <button 
                        disabled={!editable}
                        className="w-full h-full px-3 flex items-center justify-between group/date outline-none transition-colors hover:bg-slate-50"
                    >
                        <span className={cn(
                            "text-sm font-semibold truncate flex-1 text-left",
                            !value && "text-slate-200 italic font-normal"
                        )}>
                            {value ? format(new Date(value), 'MMM d, yyyy') : "Pick date..."}
                        </span>
                        <CalendarDays className="h-3.5 w-3.5 text-slate-300 group-hover/date:text-primary transition-colors shrink-0" />
                    </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0 border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[1.5rem] bg-white z-[60] overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Select Timeline</span>
                        {value && (
                            <button 
                                onClick={() => onChange(null)}
                                className="text-[8px] font-black uppercase text-red-500 hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <Calendar
                        mode="single"
                        selected={value ? new Date(value) : undefined}
                        onSelect={(date) => {
                            if (date) onChange(format(date, 'yyyy-MM-dd'));
                        }}
                        initialFocus
                        className="rounded-b-[1.5rem]"
                        classNames={{
                            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-xl font-bold",
                            day_today: "bg-accent text-accent-foreground font-bold rounded-xl border border-primary/20",
                            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-xl hover:bg-slate-50 transition-all",
                        }}
                    />
                </PopoverContent>
            </Popover>
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
        if (field.type === 'email') inputType = "email";
        if (field.type === 'url') inputType = "url";
        if (field.type === 'phone') inputType = "tel";

        return (
            <div className="flex items-center w-full h-full relative">
                {field.type === 'currency' && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="pl-3 pr-1 text-slate-400 text-sm font-black hover:text-primary transition-colors h-full flex items-center gap-1 group/currency shrink-0">
                                <span>{field.currencySymbol || '₱'}</span>
                                <ChevronDown className="h-2 w-2 opacity-0 group-hover/currency:opacity-100" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-48 p-1 rounded-xl shadow-2xl border-slate-100 bg-white z-[70]">
                            <DropdownMenuLabel className="text-[8px] font-black uppercase text-slate-400 px-2 py-1 tracking-widest">Select Symbol</DropdownMenuLabel>
                            <div className="grid grid-cols-4 gap-1 p-1">
                                {CURRENCY_SYMBOLS.map(symbol => (
                                    <button 
                                        key={symbol} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdateField(field.id, { currencySymbol: symbol });
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
                        </PopoverContent>
                    </Popover>
                )}
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
                    placeholder="..."
                />
            </div>
        );
    }

    return (
        <div 
            className="w-full h-full px-3 flex items-center group/cell cursor-text relative overflow-hidden"
            onClick={() => editable && setIsEditing(true)}
        >
            <span className={cn(
                "text-sm font-semibold truncate flex-1",
                !value && "text-slate-200 italic font-normal",
                (field.type === 'url' || field.type === 'email') && value && "text-primary hover:underline transition-all"
            )}>
                {field.type === 'currency' && value !== null && value !== undefined && value !== '' ? (
                    <span className="flex items-center gap-1">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="text-slate-400 font-black hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                                    {field.currencySymbol || '₱'}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-48 p-1 rounded-xl shadow-2xl border-slate-100 bg-white z-[70]">
                                <div className="grid grid-cols-4 gap-1 p-1">
                                    {CURRENCY_SYMBOLS.map(symbol => (
                                        <button 
                                            key={symbol} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateField(field.id, { currencySymbol: symbol });
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
                            </PopoverContent>
                        </Popover>
                        {Number(value).toLocaleString()}
                    </span>
                ) : (value || (field.isPrimary ? "Enter Item..." : ""))}
            </span>

            {/* Functional Buttons for Email, URL, Phone */}
            {value && (field.type === 'url' || field.type === 'email' || field.type === 'phone') && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (field.type === 'url') window.open(value.startsWith('http') ? value : `https://${value}`, '_blank');
                        if (field.type === 'email') window.location.href = `mailto:${value}`;
                        if (field.type === 'phone') window.location.href = `tel:${value}`;
                        toast({ title: 'Opening Connection', description: `Initializing protocol for: ${value}` });
                    }}
                    className="opacity-0 group-hover/cell:opacity-100 p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-all shrink-0 ml-1 shadow-sm border border-slate-100 bg-white"
                >
                    {field.type === 'url' && <Globe className="h-3.5 w-3.5" />}
                    {field.type === 'email' && <Mail className="h-3.5 w-3.5" />}
                    {field.type === 'phone' && <Phone className="h-3.5 w-3.5" />}
                </button>
            )}

            {field.isPrimary && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
                    className="opacity-0 group-hover/cell:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-all shrink-0 ml-1"
                >
                    <Maximize2 className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
});
CellRenderer.displayName = 'CellRenderer';
