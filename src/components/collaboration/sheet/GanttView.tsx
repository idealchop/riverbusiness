'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { 
    GanttChart, 
    ChevronLeft, 
    ChevronRight, 
    Clock, 
    AlertCircle, 
    Calendar as CalendarIcon,
    Grab,
    Plus,
    PlusCircle,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, isToday, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { SheetField, SheetRecord } from '@/lib/types';

interface GanttViewProps {
    fields: SheetField[];
    records: SheetRecord[];
    onRecordUpdate: (recordId: string, fieldId: string, value: any) => void;
    onRecordClick: (id: string) => void;
}

const DAY_WIDTH = 48;

export function GanttView({ fields, records, onRecordUpdate, onRecordClick }: GanttViewProps) {
    const [viewDate, setViewDate] = useState(new Date());
    const [draggedRecordId, setDraggedRecordId] = useState<string | null>(null);
    const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);
    
    // Resizing States
    const [resizingRecordId, setResizingRecordId] = useState<string | null>(null);
    const resizeStartX = useRef(0);
    const resizeStartDuration = useRef(1);

    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const dateField = useMemo(() => fields.find(f => f.type === 'date'), [fields]);
    const primaryField = useMemo(() => fields.find(f => f.isPrimary) || fields[0], [fields]);

    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const handleGoToToday = () => {
        const now = new Date();
        setViewDate(now);
        
        if (scrollAreaRef.current) {
            const today = now.getDate();
            const scrollPosition = (today - 1) * DAY_WIDTH - 100; 
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTo({ left: Math.max(0, scrollPosition) });
            }
        }
    };

    const handleDragStart = (e: React.DragEvent, recordId: string) => {
        if (resizingRecordId) return; 
        setDraggedRecordId(recordId);
        e.dataTransfer.setData('recordId', recordId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        const recordId = e.dataTransfer.getData('recordId');
        if (recordId && dateField) {
            onRecordUpdate(recordId, dateField.id, format(targetDate, 'yyyy-MM-dd'));
        }
        setDraggedRecordId(null);
        setDropTargetDate(null);
    };

    const handleGridClick = (recordId: string, date: Date) => {
        if (dateField) {
            onRecordUpdate(recordId, dateField.id, format(date, 'yyyy-MM-dd'));
        }
    };

    const handleResizeStart = (e: React.MouseEvent, recordId: string, currentDuration: number) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingRecordId(recordId);
        resizeStartX.current = e.clientX;
        resizeStartDuration.current = currentDuration;
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingRecordId) return;
    }, [resizingRecordId]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (!resizingRecordId) return;

        const deltaX = e.clientX - resizeStartX.current;
        const deltaDays = Math.round(deltaX / DAY_WIDTH);
        const newDuration = Math.max(1, resizeStartDuration.current + deltaDays);

        if (newDuration !== resizeStartDuration.current) {
            onRecordUpdate(resizingRecordId, 'duration', newDuration);
        }
        
        setResizingRecordId(null);
    }, [resizingRecordId, onRecordUpdate]);

    useEffect(() => {
        if (resizingRecordId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingRecordId, handleMouseMove, handleMouseUp]);

    const handleTextChange = (recordId: string, newText: string) => {
        onRecordUpdate(recordId, primaryField.id, newText);
    };

    if (!dateField) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 gap-4 opacity-40">
                <GanttChart className="h-16 w-16 text-slate-300" />
                <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-widest text-slate-900">Add start and end dates</p>
                    <p className="text-xs font-bold text-slate-400">Add a 'Date' column to authorize the Gantt Chart protocol.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
            {/* View Header */}
            <div className="h-16 border-b bg-white px-8 flex items-center justify-between shrink-0 z-30">
                <div className="flex items-center gap-8">
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 leading-none">{format(viewDate, 'MMMM yyyy')}</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Timeline</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl shadow-inner">
                        <button 
                            className="p-1.5 rounded-lg hover:bg-white text-slate-500" 
                            onClick={() => setViewDate(subMonths(viewDate, 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button 
                            className="p-1.5 rounded-lg hover:bg-white text-slate-500" 
                            onClick={() => setViewDate(addMonths(viewDate, 1))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGoToToday} 
                    className="h-10 rounded-xl px-6 font-black text-[10px] uppercase tracking-widest shadow-sm bg-white border-slate-200"
                >
                    Go to Today
                </Button>
            </div>

            {/* Gantt Matrix */}
            <div className="flex-1 flex overflow-hidden">
                {/* Fixed Sidebar for Record Titles */}
                <div className="w-64 border-r bg-slate-50/50 flex flex-col shrink-0">
                    <div className="h-12 border-b bg-slate-100/50 flex items-center px-6 shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Title</span>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="divide-y divide-slate-100">
                            {records.map(record => (
                                <div 
                                    key={record.id} 
                                    className="h-14 px-6 flex items-center hover:bg-white cursor-pointer group"
                                    onClick={() => onRecordClick(record.id)}
                                >
                                    <span className="text-xs font-bold text-slate-700 truncate group-hover:text-primary">
                                        {record.values[primaryField.id] || 'Untitled'}
                                    </span>
                                </div>
                            ))}
                            <div className="p-4">
                                <button 
                                    onClick={() => window.dispatchEvent(new CustomEvent('request-new-record'))}
                                    className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-primary hover:text-primary"
                                >
                                    <PlusCircle className="h-3.5 w-3.5" /> New Entry
                                </button>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                {/* Scrollable Timeline Grid */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    <ScrollArea className="flex-1" ref={scrollAreaRef}>
                        <div className="inline-block min-w-full">
                            {/* Days Header */}
                            <div className="flex sticky top-0 z-20 bg-white border-b">
                                {days.map(day => (
                                    <div 
                                        key={day.toISOString()} 
                                        className={cn(
                                            "w-12 h-12 flex flex-col items-center justify-center border-r shrink-0",
                                            isToday(day) ? "bg-primary/5" : "bg-white"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-tighter",
                                            isToday(day) ? "text-primary" : "text-slate-300"
                                        )}>
                                            {format(day, 'EEE')}
                                        </span>
                                        <span className={cn(
                                            "text-xs font-black",
                                            isToday(day) ? "text-primary" : "text-slate-900"
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Rows Matrix */}
                            <div className="relative divide-y">
                                {records.map(record => {
                                    const recordDateString = record.values[dateField.id];
                                    const recordDate = recordDateString ? new Date(recordDateString) : null;
                                    const duration = Number(record.values.duration) || 1;
                                    
                                    return (
                                        <div key={record.id} className="flex relative group/row h-14">
                                            {days.map(day => (
                                                <div 
                                                    key={day.toISOString()} 
                                                    onDragOver={(e) => { e.preventDefault(); setDropTargetDate(day.toISOString() + record.id); }}
                                                    onDrop={(e) => handleDrop(e, day)}
                                                    onClick={() => handleGridClick(record.id, day)}
                                                    className={cn(
                                                        "w-12 border-r shrink-0 cursor-pointer",
                                                        isToday(day) ? "bg-slate-50/50" : "bg-white",
                                                        dropTargetDate === day.toISOString() + record.id && "bg-primary/10"
                                                    )} 
                                                />
                                            ))}

                                            {/* The Gantt Bar */}
                                            {recordDate && isWithinInterval(recordDate, { start: monthStart, end: monthEnd }) && (
                                                <div 
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, record.id)}
                                                    style={{ 
                                                        left: `${(recordDate.getDate() - 1) * DAY_WIDTH}px`,
                                                        width: `${duration * DAY_WIDTH}px` 
                                                    }}
                                                    className={cn(
                                                        "absolute top-2 bottom-2 z-10 cursor-grab active:cursor-grabbing px-1 group/task",
                                                        draggedRecordId === record.id && "opacity-0"
                                                    )}
                                                >
                                                    <div className="w-full h-full rounded-xl bg-primary shadow-lg shadow-primary/20 flex flex-col items-center justify-center gap-1 group/bar relative origin-left">
                                                        <input 
                                                            className="w-full bg-transparent border-none text-white text-[9px] font-black text-center uppercase tracking-tighter focus:ring-0 px-2 outline-none truncate"
                                                            value={record.values[primaryField.id] || ''}
                                                            onChange={(e) => handleTextChange(record.id, e.target.value)}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            placeholder="..."
                                                        />
                                                        
                                                        {/* Resize Handle (Stretch) */}
                                                        <div 
                                                            onMouseDown={(e) => handleResizeStart(e, record.id, duration)}
                                                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover/task:opacity-100 flex items-center justify-center"
                                                        >
                                                            <div className="h-4 w-1 rounded-full bg-white/40" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}

const isWithinInterval = (date: Date, interval: { start: Date, end: Date }) => {
    const d = startOfDay(new Date(date)).getTime();
    const s = startOfDay(new Date(interval.start)).getTime();
    const e = startOfDay(new Date(interval.end)).getTime();
    return d >= s && d <= e;
};