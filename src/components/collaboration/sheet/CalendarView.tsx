'use client';

import React, { useMemo, useState } from 'react';
import { 
    CalendarDays, 
    ChevronLeft, 
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

export function CalendarView({ fields, records, onRecordClick }: any) {
    const [viewDate, setViewDate] = useState(new Date());
    const dateField = useMemo(() => fields.find((f: any) => f.type === 'date'), [fields]);
    
    if (!dateField) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 gap-4 opacity-40">
                <CalendarDays className="h-12 w-12 text-slate-300" />
                <p className="text-sm font-semibold">Add a Date column</p>
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
