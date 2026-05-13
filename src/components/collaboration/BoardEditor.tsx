'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { 
    Plus, 
    MousePointer2, 
    Hand, 
    Square, 
    StickyNote, 
    Trash2, 
    Type,
    ArrowRight,
    Grab,
    Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface BoardElement {
    id: string;
    type: 'note' | 'rect';
    x: number;
    y: number;
    text: string;
    color: string;
}

interface BoardEditorProps {
  initialData: any;
  onContentChange: (json: any) => void;
  editable?: boolean;
}

const COLORS = ['#fef08a', '#dcfce7', '#dbeafe', '#fce7f3', '#ffffff'];

export function BoardEditor({ initialData, onContentChange, editable = true }: BoardEditorProps) {
  const [elements, setElements] = useState<BoardElement[]>(initialData?.elements || []);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (initialData?.elements) {
          setElements(initialData.elements);
      }
  }, [initialData]);

  const sync = (newElements: BoardElement[]) => {
      setElements(newElements);
      onContentChange({ elements: newElements });
  };

  const addElement = (type: 'note' | 'rect') => {
      if (!editable) return;
      const newEl: BoardElement = {
          id: `el-${Date.now()}`,
          type,
          x: 100 + (elements.length * 20),
          y: 100 + (elements.length * 20),
          text: type === 'note' ? 'New Sticky' : 'Flow Step',
          color: type === 'note' ? COLORS[0] : '#ffffff'
      };
      sync([...elements, newEl]);
  };

  const handleDragStart = (e: React.MouseEvent, el: BoardElement) => {
      if (!editable) return;
      setDragId(el.id);
      setDragOffset({ x: e.clientX - el.x, y: e.clientY - el.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!dragId || !editable) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      setElements(prev => prev.map(el => 
          el.id === dragId ? { ...el, x: newX, y: newY } : el
      ));
  };

  const handleMouseUp = () => {
      if (dragId) {
          sync(elements);
          setDragId(null);
      }
  };

  const updateText = (id: string, text: string) => {
      sync(elements.map(el => el.id === id ? { ...el, text } : el));
  };

  const deleteElement = (id: string) => {
      sync(elements.filter(el => el.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative select-none cursor-crosshair" 
         onMouseMove={handleMouseMove} 
         onMouseUp={handleMouseUp}
         ref={containerRef}>
        
        {/* Board Toolbar */}
        <div className="absolute top-8 left-8 z-30 flex flex-col gap-1 p-1 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl animate-in slide-in-from-left-4 duration-500">
            <ToolbarItem icon={<MousePointer2 className="h-4 w-4" />} label="Select" active />
            <ToolbarItem icon={<StickyNote className="h-4 w-4" />} label="Sticky Note" onClick={() => addElement('note')} />
            <ToolbarItem icon={<Square className="h-4 w-4" />} label="Flow Step" onClick={() => addElement('rect')} />
            <Separator className="my-1" />
            <ToolbarItem icon={<Grab className="h-4 w-4" />} label="Hand Tool" />
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden">
             {/* Grid Background */}
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                  style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1.5px, transparent 0)', backgroundSize: '40px 40px' }} />
             
             {elements.map((el) => (
                 <div 
                    key={el.id}
                    style={{ left: el.x, top: el.y }}
                    className={cn(
                        "absolute group transition-shadow",
                        el.type === 'note' ? "w-40 h-40 shadow-xl" : "w-48 h-24 shadow-md rounded-xl border-2 border-slate-900",
                        dragId === el.id && "z-50 scale-105"
                    )}
                 >
                    <div 
                        className={cn(
                            "w-full h-full p-4 flex flex-col relative",
                            el.type === 'note' ? "bg-[#fef08a]" : "bg-white"
                        )}
                        onMouseDown={(e) => handleDragStart(e, el)}
                    >
                        <textarea 
                            value={el.text}
                            onChange={(e) => updateText(el.id, e.target.value)}
                            readOnly={!editable}
                            className="bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-sm font-bold text-slate-800 h-full w-full placeholder:text-slate-400"
                            placeholder="Type..."
                        />
                        <button 
                            onClick={() => deleteElement(el.id)}
                            className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-white border border-slate-100 shadow-lg text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        
                        <div className="absolute bottom-2 right-2 opacity-20 group-hover:opacity-100 transition-opacity">
                            <Grab className="h-3 w-3 text-slate-400" />
                        </div>
                    </div>
                 </div>
             ))}

             {elements.length === 0 && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-6 animate-in fade-in duration-1000">
                    <div className="p-10 rounded-[3rem] bg-white border border-slate-100 shadow-inner opacity-40">
                        <Layout className="h-16 w-16 text-slate-200" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-400">Empty Flow Canvas</h3>
                        <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Select a tool from the sidebar to begin mapping</p>
                    </div>
                 </div>
             )}
        </div>

        {/* Footer Info */}
        <div className="h-10 bg-white border-t px-8 flex items-center justify-between shrink-0 z-30">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Board Live System</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{elements.length} Organizational Nodes</span>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">Whiteboard Handshake Protocol v1.0</p>
        </div>
    </div>
  );
}

function ToolbarItem({ icon, label, active = false, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "h-10 w-10 flex items-center justify-center rounded-xl transition-all group relative",
                active ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
            )}
        >
            {icon}
            <div className="absolute left-14 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-2xl border border-white/10">
                {label}
            </div>
        </button>
    );
}
