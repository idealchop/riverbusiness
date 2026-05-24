import React, { useMemo, useState } from 'react';
import { 
    Layout, 
    AlertCircle, 
    Type,
    MoreHorizontal
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FIELD_ICONS } from './constants';

export function KanbanView({ fields, records, onRecordClick, onRecordUpdate }: any) {
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
                                                        <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500 truncate">{f.type === 'currency' ? `${f.currencySymbol || '₱'}${Number(val).toLocaleString()}` : val}</span>
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
