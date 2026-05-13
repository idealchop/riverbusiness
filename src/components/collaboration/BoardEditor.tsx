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
    BezierCurve,
    ChevronDown,
    Zap,
    CornerRightUp,
    MoreHorizontal
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
import { useToast } from '@/hooks/use-toast';
import type { BoardElement, BoardConnection } from '@/lib/types';
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
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [elements, setElements] = useState<BoardElement[]>(initialData?.elements || []);
  const [connections, setConnections] = useState<BoardConnection[]>(initialData?.connections || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Navigation State
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [tool, setTool] = useState<'select' | 'hand' | 'note' | 'rect' | 'circle' | 'diamond' | 'text' | 'arrow'>('select');
  
  // Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Connection state
  const [pendingConnection, setPendingConnection] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with Firestore Presence
  const presenceQuery = useMemoFirebase(() => (firestore && pageId) ? collection(firestore, 'collaboration_pages', pageId, 'presence') : null, [firestore, pageId]);
  const { data: presence } = useCollection(presenceQuery);

  useEffect(() => {
      if (initialData?.elements) setElements(initialData.elements);
      if (initialData?.connections) setConnections(initialData.connections);
  }, [initialData]);

  const sync = useCallback((newElements: BoardElement[], newConnections: BoardConnection[]) => {
      setElements(newElements);
      setConnections(newConnections);
      onContentChange({ elements: newElements, connections: newConnections });
  }, [onContentChange]);

  // Viewport mapping logic
  const getLogicalCoords = (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - viewport.x) / viewport.scale;
      const y = (clientY - rect.top - viewport.y) / viewport.scale;
      return { x, y };
  };

  // Keyboard Shortcuts Engine
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!editable) return;
          
          if (e.code === 'Space' && !isPanning) {
              setTool('hand');
              setIsPanning(true);
          }

          if (e.key === 'Delete' || e.key === 'Backspace') {
              if (selectedId && !document.activeElement?.tagName.includes('TEXTAREA')) {
                  deleteElement(selectedId);
              }
          }

          if (e.ctrlKey || e.metaKey) {
              if (e.key === '=') { e.preventDefault(); setViewport(v => ({ ...v, scale: Math.min(v.scale + 0.1, 5) })); }
              if (e.key === '-') { e.preventDefault(); setViewport(v => ({ ...v, scale: Math.max(v.scale - 0.1, 0.1) })); }
              if (e.key === '0') { e.preventDefault(); setViewport(v => ({ ...v, x: 0, y: 0, scale: 1 })); }
          }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
          if (e.code === 'Space') {
              setTool('select');
              setIsPanning(false);
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      };
  }, [editable, selectedId, isPanning]);

  const addElement = (type: BoardElement['type'], x?: number, y?: number) => {
      if (!editable) return;
      const id = `el-${Date.now()}`;
      const newEl: BoardElement = {
          id, type,
          x: x || (100 - viewport.x) / viewport.scale,
          y: y || (100 - viewport.y) / viewport.scale,
          text: type === 'note' ? 'New Idea' : 'Process',
          color: type === 'note' ? '#fef08a' : '#ffffff',
          width: type === 'text' ? 200 : 150,
          height: type === 'text' ? 40 : 150,
      };
      sync([...elements, newEl], connections);
      setSelectedId(id);
      setTool('select');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      const { x, y } = getLogicalCoords(e.clientX, e.clientY);
      
      if (tool === 'hand' || e.button === 1) {
          setIsPanning(true);
          setLastMousePos({ x: e.clientX, y: e.clientY });
          return;
      }

      if (tool === 'arrow') {
          const hit = [...elements].reverse().find(el => (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height));
          if (hit) {
              if (!pendingConnection) {
                  setPendingConnection(hit.id);
                  toast({ title: 'Connection started', description: 'Click another block to link.' });
              } else if (pendingConnection !== hit.id) {
                  const newConn: BoardConnection = { id: `conn-${Date.now()}`, fromId: pendingConnection, toId: hit.id, type: 'curved' };
                  sync(elements, [...connections, newConn]);
                  setPendingConnection(null);
                  setTool('select');
              }
          }
          return;
      }

      const hit = [...elements].reverse().find(el => (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height));
      if (hit) {
          // Check for resize handles
          const handleSize = 10 / viewport.scale;
          if (x >= hit.x + hit.width - handleSize && y >= hit.y + hit.height - handleSize) {
              setIsResizing(true);
              setDragId(hit.id);
          } else {
              setSelectedId(hit.id);
              setIsDragging(true);
              setDragId(hit.id);
              setDragOffset({ x: x - hit.x, y: y - hit.y });
          }
      } else {
          setSelectedId(null);
          setPendingConnection(null);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isPanning) {
          const dx = e.clientX - lastMousePos.x;
          const dy = e.clientY - lastMousePos.y;
          setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          setLastMousePos({ x: e.clientX, y: e.clientY });
          return;
      }

      const { x, y } = getLogicalCoords(e.clientX, e.clientY);

      if (isResizing && dragId) {
          setElements(prev => prev.map(el => el.id === dragId ? { 
              ...el, 
              width: Math.max(50, x - el.x), 
              height: Math.max(40, y - el.y) 
          } : el));
      } else if (isDragging && dragId) {
          setElements(prev => prev.map(el => el.id === dragId ? { ...el, x: x - dragOffset.x, y: y - dragOffset.y } : el));
      }
  };

  const handleMouseUp = () => {
      if (isDragging || isResizing) sync(elements, connections);
      setIsPanning(false);
      setIsDragging(false);
      setIsResizing(false);
      setDragId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = e.deltaY * -0.01;
          const newScale = Math.min(Math.max(0.1, viewport.scale + delta), 5);
          setViewport(prev => ({ ...prev, scale: newScale }));
      } else {
          setViewport(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
  };

  const updateElement = (id: string, data: Partial<BoardElement>) => {
      const next = elements.map(el => el.id === id ? { ...el, ...data } : el);
      sync(next, connections);
  };

  const deleteElement = (id: string) => {
      sync(elements.filter(el => el.id !== id), connections.filter(c => c.fromId !== id && c.toId !== id));
      if (selectedId === id) setSelectedId(null);
  };

  const getConnectorPath = (conn: BoardConnection) => {
      const from = elements.find(e => e.id === conn.fromId);
      const to = elements.find(e => e.id === conn.toId);
      if (!from || !to) return '';

      const x1 = from.x + from.width / 2;
      const y1 = from.y + from.height / 2;
      const x2 = to.x + to.width / 2;
      const y2 = to.y + to.height / 2;

      if (conn.type === 'straight') return `M ${x1} ${y1} L ${x2} ${y2}`;
      if (conn.type === 'step') return `M ${x1} ${y1} H ${(x1 + x2) / 2} V ${y2} H ${x2}`;
      
      const cp1x = x1 + (x2 - x1) / 2;
      const cp1y = y1;
      const cp2x = x1 + (x2 - x1) / 2;
      const cp2y = y2;
      return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  };

  if (!isMounted) return null;

  const selectedElement = elements.find(e => e.id === selectedId);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative select-none" 
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove} 
         onMouseUp={handleMouseUp}
         onWheel={handleWheel}
         ref={containerRef}>
        
        {/* Professional Infinite Grid */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
             style={{ 
                 backgroundImage: `radial-gradient(circle, #538ec2 1px, transparent 1px)`, 
                 backgroundSize: `${40 * viewport.scale}px ${40 * viewport.scale}px`,
                 backgroundPosition: `${viewport.x}px ${viewport.y}px`
             }} 
        />

        {/* Miro-Style Floating Toolbar */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5 p-2 bg-white border border-slate-200 shadow-2xl rounded-2xl animate-in slide-in-from-left-6 duration-700">
            <ToolbarItem icon={<MousePointer2 className="h-4 w-4" />} label="Select (V)" active={tool === 'select'} onClick={() => setTool('select')} />
            <ToolbarItem icon={<Grab className="h-4 w-4" />} label="Pan (Space)" active={tool === 'hand'} onClick={() => setTool('hand')} />
            <Separator className="my-1" />
            <ToolbarItem icon={<StickyNote className="h-4 w-4 text-amber-500" />} label="Sticky (N)" active={tool === 'note'} onClick={() => setTool('note')} />
            <ToolbarItem icon={<Square className="h-4 w-4 text-blue-500" />} label="Block" active={tool === 'rect'} onClick={() => setTool('rect')} />
            <ToolbarItem icon={<Circle className="h-4 w-4 text-green-500" />} label="Action" active={tool === 'circle'} onClick={() => setTool('circle')} />
            <ToolbarItem icon={<ArrowRight className="h-4 w-4 text-slate-400" />} label="Link (L)" active={tool === 'arrow'} onClick={() => setTool('arrow')} />
            <Separator className="my-1" />
            <ToolbarItem icon={<Type className="h-4 w-4" />} label="Label (T)" active={tool === 'text'} onClick={() => setTool('text')} />
        </div>

        {/* Global HUD */}
        <div className="absolute bottom-8 right-8 z-40 flex items-center gap-3">
             <div className="flex items-center gap-1 p-1 bg-white border rounded-xl shadow-lg">
                <Button variant="ghost" size="icon" onClick={() => setViewport(v => ({ ...v, scale: Math.max(0.1, v.scale - 0.1) }))} className="h-8 w-8"><Minus className="h-4 w-4" /></Button>
                <span className="text-[10px] font-black w-10 text-center">{Math.round(viewport.scale * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={() => setViewport(v => ({ ...v, scale: Math.min(5, v.scale + 0.1) }))} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
             </div>
             <Button variant="outline" size="icon" onClick={() => setViewport({ x: 0, y: 0, scale: 1 })} className="h-10 w-10 rounded-xl bg-white shadow-lg"><Zap className="h-4 w-4" /></Button>
        </div>

        {/* Canvas Render Surface */}
        <div className="flex-1 relative overflow-hidden z-10">
            <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, transformOrigin: '0 0' }} className="absolute inset-0 pointer-events-none">
                {/* SVG Layer for Connections */}
                <svg className="absolute inset-0 overflow-visible w-full h-full">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                        </marker>
                    </defs>
                    {connections.map(conn => (
                        <path 
                            key={conn.id} 
                            d={getConnectorPath(conn)} 
                            fill="none" 
                            stroke="#cbd5e1" 
                            strokeWidth="2" 
                            markerEnd="url(#arrowhead)"
                            className="transition-all"
                        />
                    ))}
                </svg>

                {elements.map((el) => {
                    const isSelected = selectedId === el.id;
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
                                    "w-full h-full p-4 flex flex-col relative transition-all",
                                    el.type === 'note' && "bg-white border-t-8 border-t-amber-400 shadow-xl rounded-b-lg",
                                    el.type === 'rect' && "bg-white border-2 border-slate-900 rounded-xl shadow-lg",
                                    el.type === 'circle' && "bg-white border-2 border-slate-900 rounded-full shadow-lg items-center justify-center text-center",
                                    el.type === 'text' && "bg-transparent border-none p-0"
                                )}
                                style={{ backgroundColor: el.color }}
                            >
                                <textarea 
                                    value={el.text}
                                    onChange={(e) => updateElement(el.id, { text: e.target.value })}
                                    className="bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-sm font-bold h-full w-full"
                                    placeholder="..."
                                />
                                
                                {/* Resize Handle */}
                                {isSelected && (
                                    <div className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize flex items-center justify-center bg-primary rounded-tl-lg rounded-br-lg text-white">
                                        <CornerRightUp className="h-2 w-2 rotate-90" />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {elements.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-10 animate-in fade-in duration-1000">
                    <div className="p-16 rounded-[4.5rem] bg-white border border-slate-200 shadow-2xl opacity-30 relative group">
                        <Layout className="h-24 w-24 text-slate-400" />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Logic Drafting</h3>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8">Deploy primary workflow block</p>
                        <Button onClick={() => addElement('note')} className="rounded-2xl h-14 px-12 font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/20">
                            Create First Node
                        </Button>
                    </div>
                </div>
            )}
        </div>

        {/* Contextual Controller */}
        {selectedElement && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 p-2.5 bg-slate-900 text-white shadow-2xl rounded-2xl animate-in slide-in-from-bottom-4 duration-300 border border-white/10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-9 px-3 gap-2 rounded-xl text-white font-bold text-[10px] uppercase">
                            <Palette className="h-4 w-4" /> Color
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="grid grid-cols-4 gap-1 p-2 rounded-2xl bg-white">
                        {COLORS.map(c => (
                            <button key={c.value} onClick={() => updateElement(selectedElement.id, { color: c.value })}
                                className={cn("h-6 w-6 rounded-lg border", selectedElement.color === c.value && "ring-2 ring-primary ring-offset-1")}
                                style={{ backgroundColor: c.value }} />
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <Separator orientation="vertical" className="h-5 bg-white/10" />
                <Button variant="ghost" size="icon" onClick={() => deleteElement(selectedElement.id)} className="h-9 w-9 rounded-xl hover:bg-red-500/20 text-red-400">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        )}
    </div>
  );
}

function ToolbarItem({ icon, label, active = false, onClick }: any) {
    return (
        <button onClick={onClick} className={cn("h-12 w-12 flex items-center justify-center rounded-xl transition-all group relative", active ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:bg-slate-100")}>
            {icon}
            <div className="absolute left-16 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-2xl z-[60]">
                {label}
            </div>
        </button>
    );
}
