'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { 
    MousePointer2, 
    Square, 
    StickyNote, 
    Trash2, 
    Grab,
    Layout,
    Circle,
    Palette,
    Plus,
    X,
    Maximize2,
    Minus,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useMounted } from '@/hooks/use-mounted';

interface BoardElement {
    id: string;
    type: 'note' | 'rect' | 'circle' | 'diamond';
    x: number;
    y: number;
    text: string;
    color: string;
    width: number;
    height: number;
}

interface BoardEditorProps {
  initialData: any;
  onContentChange: (json: any) => void;
  editable?: boolean;
}

const COLORS = [
    { name: 'Yellow', value: '#fef08a' },
    { name: 'Green', value: '#dcfce7' },
    { name: 'Blue', value: '#dbeafe' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Purple', value: '#f3e8ff' },
    { name: 'Slate', value: '#f1f5f9' },
    { name: 'White', value: '#ffffff' }
];

export function BoardEditor({ initialData, onContentChange, editable = true }: BoardEditorProps) {
  const isMounted = useMounted();
  const [elements, setElements] = useState<BoardElement[]>(initialData?.elements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const addElement = (type: BoardElement['type']) => {
      if (!editable) return;
      
      const id = `el-${Date.now()}`;
      const newEl: BoardElement = {
          id,
          type,
          x: 200 + (elements.length * 10),
          y: 200 + (elements.length * 10),
          text: type === 'note' ? 'New Idea' : 'Process Step',
          color: type === 'note' ? '#fef08a' : '#ffffff',
          width: type === 'rect' ? 180 : type === 'circle' ? 120 : 150,
          height: type === 'rect' ? 100 : type === 'circle' ? 120 : 150,
      };
      
      sync([...elements, newEl]);
      setSelectedId(id);
  };

  const handleDragStart = (e: React.MouseEvent, el: BoardElement) => {
      if (!editable) return;
      setSelectedId(el.id);
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

  const updateColor = (id: string, color: string) => {
      sync(elements.map(el => el.id === id ? { ...el, color } : el));
  };

  const deleteElement = (id: string) => {
      sync(elements.filter(el => el.id !== id));
      if (selectedId === id) setSelectedId(null);
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  if (!isMounted) return <div className="flex-1 flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-slate-200" /></div>;

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative select-none" 
         onMouseMove={handleMouseMove} 
         onMouseUp={handleMouseUp}
         onClick={() => setSelectedId(null)}
         ref={containerRef}>
        
        {/* Infinite Grid - Verified Visible */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30" 
             style={{ 
                 backgroundImage: `radial-gradient(circle, #538ec2 1.5px, transparent 1.5px)`, 
                 backgroundSize: '40px 40px' 
             }} 
        />

        {/* Floating Creative Toolbar */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-2 bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2rem] animate-in slide-in-from-top-6 duration-700" onClick={(e) => e.stopPropagation()}>
            <ToolbarItem 
                icon={<MousePointer2 className="h-4 w-4" />} 
                label="Select" 
                active={!selectedId} 
            />
            <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />
            <ToolbarItem 
                icon={<StickyNote className="h-4 w-4 text-amber-500" />} 
                label="Sticky Note" 
                onClick={() => addElement('note')} 
            />
            <ToolbarItem 
                icon={<Square className="h-4 w-4 text-blue-500" />} 
                label="Process Block" 
                onClick={() => addElement('rect')} 
            />
            <ToolbarItem 
                icon={<Circle className="h-4 w-4 text-green-500" />} 
                label="Activity Circle" 
                onClick={() => addElement('circle')} 
            />
            <ToolbarItem 
                icon={<div className="h-4 w-4 border-2 border-purple-500 rotate-45 rounded-sm" />} 
                label="Decision Diamond" 
                onClick={() => addElement('diamond')} 
            />
            <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />
            <ToolbarItem icon={<Grab className="h-4 w-4" />} label="Pan Tool" />
        </div>

        {/* Selected Element Controls */}
        {selectedElement && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-slate-900 text-white shadow-2xl rounded-2xl animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-white/10 text-white">
                            <Palette className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="grid grid-cols-4 gap-1 p-2 rounded-2xl border-none shadow-3xl bg-white">
                        {COLORS.map(c => (
                            <button 
                                key={c.value} 
                                onClick={() => updateColor(selectedElement.id, c.value)}
                                className={cn(
                                    "h-6 w-6 rounded-full border border-slate-100 flex items-center justify-center hover:scale-110 transition-transform",
                                    selectedElement.color === c.value && "ring-2 ring-primary ring-offset-1"
                                )}
                                style={{ backgroundColor: c.value }}
                            />
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <Separator orientation="vertical" className="h-4 bg-white/10" />
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deleteElement(selectedElement.id)}
                    className="h-8 w-8 p-0 rounded-xl hover:bg-red-500/20 text-red-400"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        )}

        {/* Dynamic Canvas Elements */}
        <div className="flex-1 relative overflow-hidden z-10">
             {elements.map((el) => {
                 const isSelected = selectedId === el.id;
                 const isDragging = dragId === el.id;

                 return (
                     <div 
                        key={el.id}
                        style={{ 
                            left: el.x, 
                            top: el.y,
                            width: el.width,
                            height: el.height,
                            zIndex: isSelected ? 30 : 10
                        }}
                        className={cn(
                            "absolute group transition-shadow cursor-pointer",
                            isDragging && "scale-[1.02] shadow-2xl",
                            !isDragging && isSelected && "ring-4 ring-primary/30 rounded-xl"
                        )}
                        onMouseDown={(e) => handleDragStart(e, el)}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(el.id);
                        }}
                     >
                        <div 
                            className={cn(
                                "w-full h-full p-4 flex flex-col relative transition-all duration-300",
                                el.type === 'note' && "bg-white border-t-8 border-t-amber-400 shadow-xl rounded-b-lg",
                                el.type === 'rect' && "bg-white border-2 border-slate-900 rounded-xl shadow-lg",
                                el.type === 'circle' && "bg-white border-2 border-slate-900 rounded-full shadow-lg items-center justify-center text-center",
                                el.type === 'diamond' && "bg-white border-2 border-slate-900 rotate-45 shadow-lg flex items-center justify-center overflow-hidden"
                            )}
                            style={{ backgroundColor: el.color }}
                        >
                            <div className={cn(
                                "w-full h-full flex flex-col",
                                el.type === 'diamond' && "-rotate-45 p-4 items-center justify-center text-center"
                            )}>
                                <textarea 
                                    value={el.text}
                                    onChange={(e) => updateText(el.id, e.target.value)}
                                    readOnly={!editable}
                                    className={cn(
                                        "bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-sm font-black text-slate-800 h-full w-full placeholder:text-slate-300",
                                        el.type === 'circle' && "text-center"
                                    )}
                                    placeholder="Type protocol..."
                                />
                            </div>
                        </div>
                     </div>
                 );
             })}

             {elements.length === 0 && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-10 animate-in fade-in duration-1000">
                    <div className="p-16 rounded-[4.5rem] bg-white border border-slate-200 shadow-2xl opacity-40 relative group">
                        <Layout className="h-24 w-24 text-slate-400" />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Logic Canvas</h3>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8">Ready to architect your workflow</p>
                        <Button 
                            onClick={() => addElement('rect')}
                            className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20"
                        >
                            Initialize Logic
                        </Button>
                    </div>
                 </div>
             )}
        </div>

        {/* View Controls Overlay */}
        <div className="absolute bottom-10 right-10 z-40 flex flex-col gap-2 p-1.5 bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl shadow-xl">
             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors"><Plus className="h-4 w-4" /></Button>
             <div className="h-px bg-slate-100 mx-2" />
             <div className="px-2 py-1 text-[10px] font-black text-slate-400 text-center">100%</div>
             <div className="h-px bg-slate-100 mx-2" />
             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors"><Minus className="h-4 w-4" /></Button>
        </div>
    </div>
  );
}

function ToolbarItem({ icon, label, active = false, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "h-12 w-12 flex items-center justify-center rounded-2xl transition-all group relative",
                active ? "bg-primary text-white shadow-lg scale-105" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
        >
            {icon}
            <div className="absolute top-16 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all shadow-2xl border border-white/10 z-[60] -translate-y-1 group-hover:translate-y-0">
                {label}
            </div>
        </button>
    );
}
