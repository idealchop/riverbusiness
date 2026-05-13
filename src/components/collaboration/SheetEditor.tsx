'use client';

import React, { useState, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SheetEditorProps {
  initialData: any;
  onContentChange: (json: any) => void;
  editable?: boolean;
}

const COLUMN_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ROW_COUNT = 50;
const COL_COUNT = 20;

export function SheetEditor({ initialData, onContentChange, editable = true }: SheetEditorProps) {
  const [data, setData] = useState<Record<string, string>>(initialData?.data || {});
  const [activeCell, setActiveCell] = useState<string | null>(null);

  useEffect(() => {
      if (initialData?.data) {
          setData(initialData.data);
      }
  }, [initialData]);

  const handleCellChange = (cellId: string, value: string) => {
    if (!editable) return;
    const newData = { ...data, [cellId]: value };
    setData(newData);
    onContentChange({ rows: ROW_COUNT, cols: COL_COUNT, data: newData });
  };

  const getCellId = (r: number, c: number) => `${COLUMN_LABELS[c]}${r + 1}`;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden select-none">
      <ScrollArea className="flex-1 border-t">
        <div className="inline-block min-w-full">
            <div className="flex bg-slate-50 border-b sticky top-0 z-20">
                <div className="w-12 h-8 border-r bg-slate-100 shrink-0" />
                {Array.from({ length: COL_COUNT }).map((_, c) => (
                    <div key={c} className="w-32 h-8 border-r flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                        {COLUMN_LABELS[c]}
                    </div>
                ))}
            </div>

            {Array.from({ length: ROW_COUNT }).map((_, r) => (
                <div key={r} className="flex border-b hover:bg-slate-50/50 transition-colors">
                    <div className="w-12 h-10 border-r bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                        {r + 1}
                    </div>
                    {Array.from({ length: COL_COUNT }).map((_, c) => {
                        const cellId = getCellId(r, c);
                        const isActive = activeCell === cellId;
                        return (
                            <div 
                                key={c} 
                                className={cn(
                                    "w-32 h-10 border-r relative p-0 group shrink-0",
                                    isActive && "ring-2 ring-primary ring-inset z-10 bg-white"
                                )}
                                onClick={() => editable && setActiveCell(cellId)}
                            >
                                <input 
                                    value={data[cellId] || ''}
                                    onChange={(e) => handleCellChange(cellId, e.target.value)}
                                    readOnly={!editable}
                                    onFocus={() => setActiveCell(cellId)}
                                    onBlur={() => setActiveCell(null)}
                                    className={cn(
                                        "absolute inset-0 w-full h-full px-3 text-sm font-medium focus:outline-none bg-transparent transition-colors",
                                        !editable && "cursor-default"
                                    )}
                                />
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
