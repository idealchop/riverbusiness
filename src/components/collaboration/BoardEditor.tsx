
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Loader2,
    Type,
    ArrowRight,
    ImageIcon,
    Presentation,
    Search,
    ChevronDown,
    PanelRight,
    MessageSquare,
    Save
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
import type { BoardElement } from '@/lib/types';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, setDoc, collection } from 'firebase/firestore';

interface BoardEditorProps {
  initialData: any;
  onContentChange: (json: any) => void;
  editable?: boolean;
  pageId: string;
}

const COLORS = [
    { name: 'Yellow', value: '#fef08a' },
    { name: 'Green', value: '#dcfce7' },
    { name: 'Blue', value: '#dbeafe' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Purple', value: '#f3e8ff' },
    { name: 'Slate', value: '#f1f5f9' },
    { name: 'White', value: '#ffffff' },
    { name: 'Black', value: '#0f172a' }
];

export function BoardEditor({ initialData, onContentChange, editable = true, pageId }: BoardEditorProps) {
  const isMounted = useMounted();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [elements, setElements] = useState<BoardElement[]>(initialData?.elements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Navigation State
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [tool, setTool] = useState<'select' | 'hand' | 'note' | 'rect' | 'circle' | 'diamond' | 'text' | 'arrow'>('select');
  
  // Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with Firestore Presence for Cursors
  const presenceQuery = useMemoFirebase(() => (firestore && pageId) ? collection(firestore, 'collaboration_pages', pageId, 'presence') : null, [firestore, pageId]);
  const { data: presence } = useCollection(presenceQuery);

  useEffect(() => {
      if (initialData?.elements) {
          setElements(initialData.elements);
      }
  }, [initialData]);

  const updateCursor = useCallback((x: number, y: number) => {
    if (!firestore || !pageId || !user) return;
    const presenceRef = doc(firestore, 'collaboration_pages', pageId, 'presence', user.uid);
    updateDoc(presenceRef, { cursor: { x, y }, lastActive: serverTimestamp() }).catch(() => {});
  }, [firestore, pageId, user]);

  const sync = (newElements: BoardElement[]) => {
      setElements(newElements);
      onContentChange({ elements: newElements });
  };

  const getLogicalCoords = (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - viewport.x) / viewport.scale;
      const y = (clientY - rect.top - viewport.y) / viewport.scale;
      return { x, y };
  };

  const addElement = (type: BoardElement['type'], x?: number, y?: number) => {
      if (!editable) return;
      
      const id = `el-${Date.now()}`;
      const spawnPos = x !== undefined && y !== undefined ? { x, y } : { x: 100 - viewport.x/viewport.scale, y: 100 - viewport.y/viewport.scale };

      const newEl: BoardElement = {
          id,
          type,
          x: spawnPos.x,
          y: spawnPos.y,
          text: type === 'note' ? 'Idea' : (type === 'text' ? 'Double click to edit' : 'Process'),
          color: type === 'note' ? '#fef08a' : '#ffffff',
          width: type === 'rect' ? 180 : type === 'circle' ? 120 : (type === 'text' ? 200 : 150),
          height: type === 'rect' ? 100 : type === 'circle' ? 120 : (type === 'text' ? 40 : 150),
      };
      
      sync([...elements, newEl]);
      setSelectedId(id);
      if (type !== 'rect' && type !== 'circle' && type !== 'diamond') setTool('select');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      const { x, y } = getLogicalCoords(e.clientX, e.clientY);
      
      if (tool === 'hand' || e.button === 1) {
          setIsPanning(true);
          setLastMousePos({ x: e.clientX, y: e.clientY });
          return;
      }

      if (tool !== 'select') {
          addElement(tool as any, x, y);
          return;
      }

      // Check for element hit
      const clickedEl = [...elements].reverse().find(el => (
          x >= el.x && x <= el.x + el.width &&
          y >= el.y && y <= el.y + el.height
      ));

      if (clickedEl) {
          setSelectedId(clickedEl.id);
          setIsDragging(true);
          setDragId(clickedEl.id);
          setDragOffset({ x: x - clickedEl.x, y: y - clickedEl.y });
      } else {
          setSelectedId(null);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      updateCursor(e.clientX, e.clientY);

      if (isPanning) {
          const dx = e.clientX - lastMousePos.x;
          const dy = e.clientY - lastMousePos.y;
          setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          setLastMousePos({ x: e.clientX, y: e.clientY });
          return;
      }

      if (isDragging && dragId) {
          const { x, y } = getLogicalCoords(e.clientX, e.clientY);
          const newX = x - dragOffset.x;
          const newY = y - dragOffset.y;
          
          setElements(prev => prev.map(el => 
              el.id === dragId ? { ...el, x: newX, y: newY } : el
          ));
      }
  };

  const handleMouseUp = () => {
      if (isDragging) sync(elements);
      setIsPanning(false);
      setIsDragging(false);
      setDragId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
          const delta = e.deltaY * -0.001;
          const newScale = Math.min(Math.max(0.1, viewport.scale + delta), 5);
          setViewport(prev => ({ ...prev, scale: newScale }));
      } else {
          setViewport(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
  };

  const updateElement = (id: string, data: Partial<BoardElement>) => {
      sync(elements.map(el => el.id === id ? { ...el, ...data } : el));
  };

  const deleteElement = (id: string) => {
      sync(elements.filter(el => el.id !== id));
      if (selectedId === id) setSelectedId(null);
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  if (!isMounted) return <div className="flex-1 flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-slate-200" /></div>;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative select-none" 
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove} 
         onMouseUp={handleMouseUp}
         onWheel={handleWheel}
         ref={containerRef}>
        
        {/* Infinite Grid Protocol */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40" 
             style={{ 
                 backgroundImage: `radial-gradient(circle, #538ec2 1.2px, transparent 1.2px)`, 
                 backgroundSize: `${40 * viewport.scale}px ${40 * viewport.scale}px`,
                 backgroundPosition: `${viewport.x}px ${viewport.y}px`
             }} 
        />

        {/* Floating Miro-Style Toolbars */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1.5 p-2 bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl animate-in slide-in-from-left-6 duration-700">
            <ToolbarItem icon={<MousePointer2 className="h-4 w-4" />} label="Select" active={tool === 'select'} onClick={() => setTool('select')} />
            <ToolbarItem icon={<Grab className="h-4 w-4" />} label="Pan Canvas" active={tool === 'hand'} onClick={() => setTool('hand')} />
            <Separator className="my-1 bg-slate-100" />
            <ToolbarItem icon={<StickyNote className="h-4 w-4 text-amber-500" />} label="Sticky Note" active={tool === 'note'} onClick={() => setTool('note')} />
            <ToolbarItem icon={<Square className="h-4 w-4 text-blue-500" />} label="Rectangle" active={tool === 'rect'} onClick={() => setTool('rect')} />
            <ToolbarItem icon={<Circle className="h-4 w-4 text-green-500" />} label="Circle" active={tool === 'circle'} onClick={() => setTool('circle')} />
            <ToolbarItem icon={<div className="h-3.5 w-3.5 border-2 border-purple-500 rotate-45 rounded-sm" />} label="Diamond" active={tool === 'diamond'} onClick={() => setTool('diamond')} />
            <Separator className="my-1 bg-slate-100" />
            <ToolbarItem icon={<Type className="h-4 w-4" />} label="Text Label" active={tool === 'text'} onClick={() => setTool('text')} />
            <ToolbarItem icon={<ArrowRight className="h-4 w-4" />} label="Connector" active={tool === 'arrow'} onClick={() => setTool('arrow')} />
            <ToolbarItem icon={<ImageIcon className="h-4 w-4 text-slate-400" />} label="Place Image" onClick={() => toast({ title: 'Upload Active', description: 'Drop an image anywhere to insert.' })} />
        </div>

        {/* Top Intelligence Bar */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 p-2.5 bg-white/80 backdrop-blur-md border border-slate-100 shadow-xl rounded-2xl">
             <div className="flex items-center gap-3 px-3">
                <div className="p-2 rounded-xl bg-primary/10"><Presentation className="h-4 w-4 text-primary" /></div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Live Presentation Mode</p>
             </div>
             <Separator orientation="vertical" className="h-6" />
             <div className="flex -space-x-1.5 mr-2">
                {presence?.filter(p => p.isActive && p.userId !== user?.uid).map(p => (
                    <Avatar key={p.userId} className="h-6 w-6 border-2 border-white shadow-sm ring-1 ring-slate-100">
                        <AvatarImage src={p.photoURL} /><AvatarFallback className="text-[8px] font-bold bg-primary text-white">{p.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                ))}
             </div>
        </div>

        {/* Dynamic Element Rendering */}
        <div className="flex-1 relative overflow-hidden z-10">
             <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, transformOrigin: '0 0' }} className="absolute inset-0 pointer-events-none">
                {elements.map((el) => {
                    const isSelected = selectedId === el.id;
                    const isDraggingThis = dragId === el.id;

                    return (
                        <div 
                            key={el.id}
                            style={{ left: el.x, top: el.y, width: el.width, height: el.height, zIndex: isSelected ? 30 : 10 }}
                            className={cn(
                                "absolute pointer-events-auto group transition-shadow",
                                isSelected && "ring-4 ring-primary/20 rounded-xl"
                            )}
                        >
                            <div 
                                className={cn(
                                    "w-full h-full p-4 flex flex-col relative transition-all duration-300",
                                    el.type === 'note' && "bg-white border-t-8 border-t-amber-400 shadow-xl rounded-b-lg",
                                    el.type === 'rect' && "bg-white border-2 border-slate-900 rounded-xl shadow-lg",
                                    el.type === 'circle' && "bg-white border-2 border-slate-900 rounded-full shadow-lg items-center justify-center text-center",
                                    el.type === 'diamond' && "bg-white border-2 border-slate-900 rotate-45 shadow-lg flex items-center justify-center overflow-hidden",
                                    el.type === 'text' && "bg-transparent border-none p-0"
                                )}
                                style={{ backgroundColor: el.color }}
                            >
                                <textarea 
                                    value={el.text}
                                    onChange={(e) => updateElement(el.id, { text: e.target.value })}
                                    className={cn(
                                        "bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-sm font-bold text-slate-800 h-full w-full placeholder:text-slate-300",
                                        el.type === 'circle' && "text-center flex items-center justify-center pt-8",
                                        el.type === 'diamond' && "-rotate-45 text-center flex items-center justify-center pt-8",
                                        el.type === 'text' && "text-lg font-black"
                                    )}
                                    placeholder="Type data..."
                                />
                            </div>
                        </div>
                    );
                })}

                {/* Collaborative Cursors */}
                {presence?.filter(p => p.isActive && p.userId !== user?.uid && p.cursor).map(p => (
                    <div key={p.userId} className="absolute pointer-events-none transition-all duration-75 z-[100]" style={{ left: (p.cursor.x - viewport.x) / viewport.scale, top: (p.cursor.y - viewport.y) / viewport.scale }}>
                         <MousePointer2 className="h-4 w-4 text-primary fill-current" />
                         <div className="bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full ml-3 shadow-lg whitespace-nowrap">{p.name}</div>
                    </div>
                ))}
             </div>

             {elements.length === 0 && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-10 animate-in fade-in duration-1000">
                    <div className="p-16 rounded-[4.5rem] bg-white border border-slate-200 shadow-2xl opacity-30 relative group">
                        <Layout className="h-24 w-24 text-slate-400 group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Initialize Logic</h3>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8">Deploy primary workflow block</p>
                        <Button onClick={() => addElement('note')} className="rounded-2xl h-14 px-12 font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/20 transition-all active:scale-95">
                            Create First Node
                        </Button>
                    </div>
                 </div>
             )}
        </div>

        {/* Contextual Toolbar for Selection */}
        {selectedElement && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 p-2.5 bg-slate-900 text-white shadow-2xl rounded-2xl animate-in slide-in-from-bottom-4 duration-300 border border-white/10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-9 px-3 gap-2 rounded-xl hover:bg-white/10 text-white font-bold text-[10px] uppercase tracking-widest">
                            <Palette className="h-4 w-4" /> Color
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="grid grid-cols-4 gap-1 p-2 rounded-2xl border-none shadow-3xl bg-white">
                        {COLORS.map(c => (
                            <button 
                                key={c.value} 
                                onClick={() => updateElement(selectedElement.id, { color: c.value })}
                                className={cn(
                                    "h-6 w-6 rounded-lg border border-slate-100 flex items-center justify-center hover:scale-110 transition-transform",
                                    selectedElement.color === c.value && "ring-2 ring-primary ring-offset-1"
                                )}
                                style={{ backgroundColor: c.value }}
                            >
                                {c.value === 'inherit' && <X className="h-3 w-3 text-slate-400" />}
                            </button>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <Separator orientation="vertical" className="h-5 bg-white/10" />
                <Button variant="ghost" size="icon" onClick={() => deleteElement(selectedElement.id)} className="h-9 w-9 rounded-xl hover:bg-red-500/20 text-red-400">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        )}

        {/* View Controls & HUD */}
        <div className="absolute bottom-10 right-10 z-40 flex items-center gap-4 animate-in fade-in duration-1000">
            <div className="flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl">
                 <Button variant="ghost" size="icon" onClick={() => setViewport(v => ({ ...v, scale: Math.max(0.1, v.scale - 0.1) }))} className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100"><Minus className="h-4 w-4" /></Button>
                 <div className="px-3 py-1 text-[10px] font-black text-slate-900 uppercase tracking-tighter w-12 text-center tabular-nums">{Math.round(viewport.scale * 100)}%</div>
                 <Button variant="ghost" size="icon" onClick={() => setViewport(v => ({ ...v, scale: Math.min(5, v.scale + 0.1) }))} className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100"><Plus className="h-4 w-4" /></Button>
            </div>
            
            <div className="flex flex-col gap-2">
                 <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl bg-white border-slate-200 shadow-lg text-slate-400 hover:text-primary transition-all"><Search className="h-4 w-4" /></Button>
                 <Button variant="outline" size="icon" onClick={() => setViewport({ x: 0, y: 0, scale: 1 })} className="h-10 w-10 rounded-2xl bg-white border-slate-200 shadow-lg text-slate-400 hover:text-primary transition-all"><X className="h-4 w-4" /></Button>
            </div>
        </div>

        {/* Mini HUD - Bottom Left */}
        <div className="absolute bottom-10 left-10 z-40 flex items-center gap-4">
             <div className="px-4 py-2 bg-slate-900/90 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Logic Hub v1.4</p>
                </div>
                <Separator orientation="vertical" className="h-3 bg-white/10" />
                <p className="text-[9px] font-black text-white uppercase tracking-widest">Client: {user?.companyId || 'PRO-25'}</p>
             </div>
        </div>
    </div>
  );
}

function ToolbarItem({ icon, label, active = false, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "h-12 w-12 flex items-center justify-center rounded-xl transition-all group relative",
                active ? "bg-primary text-white shadow-lg scale-105" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
        >
            {icon}
            <div className="absolute left-16 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all shadow-2xl border border-white/10 z-[60] -translate-x-1 group-hover:translate-x-0">
                {label}
            </div>
        </button>
    );
}
