'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
    MousePointer2, 
    Square, 
    StickyNote, 
    Trash2, 
    Grab,
    Circle,
    Palette,
    Plus,
    X,
    Maximize2,
    Minus,
    Type,
    ArrowRight,
    CaseSensitive,
    PlusCircle,
    Diamond,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Zap,
    CornerRightUp,
    Share2,
    Layout,
    Bold,
    Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useMounted } from '@/hooks/use-mounted';
import { useToast } from '@/hooks/use-toast';
import type { BoardElement, BoardConnection } from '@/lib/types';

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
    { name: 'White', value: '#ffffff' },
    { name: 'Black', value: '#0f172a' }
];

const TEXT_COLORS = [
    { name: 'Dark', value: '#0f172a' },
    { name: 'Slate', value: '#64748b' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'White', value: '#ffffff' }
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 32, 48];

export function BoardEditor({ initialData, onContentChange, editable = true }: BoardEditorProps) {
  const isMounted = useMounted();
  const { toast } = useToast();
  
  const [elements, setElements] = useState<BoardElement[]>(initialData?.elements || []);
  const [connections, setConnections] = useState<BoardConnection[]>(initialData?.connections || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [tool, setTool] = useState<'select' | 'hand' | 'arrow'>('select');
  
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Connection Dragging State
  const [pendingConnFrom, setPendingConnFrom] = useState<string | null>(null);
  const [currentMouseCoords, setCurrentMouseCoords] = useState<{ x: number, y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (initialData?.elements) setElements(initialData.elements);
      if (initialData?.connections) setConnections(initialData.connections);
  }, [initialData]);

  const sync = useCallback((newElements: BoardElement[], newConnections: BoardConnection[]) => {
      if (!editable) return;
      setElements(newElements);
      setConnections(newConnections);
      onContentChange({ elements: newElements, connections: newConnections });
  }, [onContentChange, editable]);

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
      const newEl: BoardElement = {
          id, type,
          x: x || (100 - viewport.x) / viewport.scale,
          y: y || (100 - viewport.y) / viewport.scale,
          text: type === 'note' ? 'New Idea' : (type === 'text' ? 'Double click to edit' : 'Process Step'),
          color: type === 'note' ? '#fef08a' : '#ffffff',
          width: type === 'text' ? 200 : 150,
          height: type === 'text' ? 40 : 150,
          fontSize: 14,
          fontColor: '#0f172a',
          bold: true,
          textAlign: 'center'
      };
      sync([...elements, newEl], connections);
      setSelectedId(id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      const { x, y } = getLogicalCoords(e.clientX, e.clientY);
      
      if (tool === 'hand' || e.button === 1) {
          setIsPanning(true);
          setLastMousePos({ x: e.clientX, y: e.clientY });
          return;
      }

      // Check if we hit a port
      const target = e.target as HTMLElement;
      const portId = target.closest('[data-port-id]')?.getAttribute('data-port-id');
      if (portId) {
          setPendingConnFrom(portId);
          setCurrentMouseCoords({ x, y });
          return;
      }

      const hit = [...elements].reverse().find(el => (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height));
      
      if (hit) {
          const handleSize = 12 / viewport.scale;
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
          setPendingConnFrom(null);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const { x, y } = getLogicalCoords(e.clientX, e.clientY);

      if (isPanning) {
          const dx = e.clientX - lastMousePos.x;
          const dy = e.clientY - lastMousePos.y;
          setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          setLastMousePos({ x: e.clientX, y: e.clientY });
          return;
      }

      if (pendingConnFrom) {
          setCurrentMouseCoords({ x, y });
      }

      const hoverHit = [...elements].reverse().find(el => (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height));
      setHoveredId(hoverHit?.id || null);

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

  const handleMouseUp = (e: React.MouseEvent) => {
      if (pendingConnFrom) {
          const { x, y } = getLogicalCoords(e.clientX, e.clientY);
          const targetHit = elements.find(el => (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height));
          
          if (targetHit && targetHit.id !== pendingConnFrom) {
              const newConn: BoardConnection = { 
                  id: `conn-${Date.now()}`, 
                  fromId: pendingConnFrom, 
                  toId: targetHit.id, 
                  type: 'curved' 
              };
              sync(elements, [...connections, newConn]);
              toast({ title: 'Logic Linked' });
          }
          setPendingConnFrom(null);
          setCurrentMouseCoords(null);
      }

      if (isDragging || isResizing) {
          sync(elements, connections);
      }

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

  const getConnectorPath = (fromId: string, toX: number, toY: number, toId?: string) => {
      const from = elements.find(e => e.id === fromId);
      if (!from) return '';

      const x1 = from.x + from.width / 2;
      const y1 = from.y + from.height / 2;
      
      let x2 = toX;
      let y2 = toY;

      if (toId) {
          const to = elements.find(e => e.id === toId);
          if (to) {
              x2 = to.x + to.width / 2;
              y2 = to.y + to.height / 2;
          }
      }

      const cp1x = x1 + (x2 - x1) / 2;
      const cp1y = y1;
      const cp2x = x1 + (x2 - x1) / 2;
      const cp2y = y2;
      return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  };

  if (!isMounted) return null;

  const selectedElement = elements.find(e => e.id === selectedId);

  return (
    <div className="flex-1 flex bg-slate-50 overflow-hidden relative select-none font-sans h-full">
        {/* Component Library Sidebar */}
        <aside className="w-16 border-r bg-white flex flex-col items-center py-6 gap-6 z-50 shadow-sm shrink-0">
            <div className="flex flex-col gap-5">
                <DraggableTool icon={<StickyNote className="h-5 w-5 text-amber-500" />} type="note" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'note')} label="Sticky" />
                <DraggableTool icon={<Square className="h-5 w-5 text-blue-500" />} type="rect" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'rect')} label="Process" />
                <DraggableTool icon={<Circle className="h-5 w-5 text-green-500" />} type="circle" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'circle')} label="Event" />
                <DraggableTool icon={<Diamond className="h-5 w-5 text-purple-500" />} type="diamond" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'diamond')} label="Logic" />
            </div>
            <Separator className="w-8" />
            <div className="flex flex-col gap-2">
                <ToolbarItem icon={<MousePointer2 className="h-4 w-4" />} active={tool === 'select'} onClick={() => setTool('select')} />
                <ToolbarItem icon={<Grab className="h-4 w-4" />} active={tool === 'hand'} onClick={() => setTool('hand')} />
                <ToolbarItem icon={<LinkIcon className="h-4 w-4" />} active={tool === 'arrow'} onClick={() => setTool('arrow')} />
            </div>
        </aside>

        <div className="flex-1 relative overflow-hidden" 
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove} 
             onMouseUp={handleMouseUp}
             onWheel={handleWheel}
             onDragOver={(e) => e.preventDefault()}
             onDrop={(e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData('elType') as BoardElement['type'];
                if (type) {
                    const { x, y } = getLogicalCoords(e.clientX, e.clientY);
                    addElement(type, x - 75, y - 75);
                }
             }}
             ref={containerRef}>
            
            {/* Design Grid */}
            <div className="absolute inset-0 z-0 opacity-[0.1] pointer-events-none" 
                 style={{ 
                     backgroundImage: `radial-gradient(circle, #538ec2 1.5px, transparent 1px)`, 
                     backgroundSize: `${40 * viewport.scale}px ${40 * viewport.scale}px`,
                     backgroundPosition: `${viewport.x}px ${viewport.y}px`
                 }} 
            />

            {/* Canvas Rendering */}
            <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, transformOrigin: '0 0' }} className="absolute inset-0 pointer-events-none">
                <svg className="absolute inset-0 overflow-visible w-full h-full">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                        </marker>
                    </defs>
                    {/* Existing Connections */}
                    {connections.map(conn => (
                        <path 
                            key={conn.id} 
                            d={getConnectorPath(conn.fromId, 0, 0, conn.toId)} 
                            fill="none" 
                            stroke="#cbd5e1" 
                            strokeWidth="2" 
                            markerEnd="url(#arrowhead)"
                        />
                    ))}
                    {/* Drag Preview Line */}
                    {pendingConnFrom && currentMouseCoords && (
                        <path 
                            d={getConnectorPath(pendingConnFrom, currentMouseCoords.x, currentMouseCoords.y)} 
                            fill="none" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth="2" 
                            strokeDasharray="4 4"
                            markerEnd="url(#arrowhead)"
                        />
                    )}
                </svg>

                {elements.map((el) => {
                    const isSelected = selectedId === el.id;
                    const isHovered = hoveredId === el.id;
                    return (
                        <div 
                            key={el.id}
                            style={{ left: el.x, top: el.y, width: el.width, height: el.height, zIndex: isSelected ? 30 : 10 }}
                            className={cn(
                                "absolute pointer-events-auto transition-all",
                                isSelected && "ring-2 ring-primary ring-offset-2 rounded-xl"
                            )}
                        >
                            <div 
                                className={cn(
                                    "w-full h-full p-4 flex flex-col relative transition-all overflow-hidden shadow-lg",
                                    el.type === 'note' && "border-t-8 border-t-amber-400 rounded-b-lg",
                                    el.type === 'rect' && "border-2 border-slate-900 rounded-xl",
                                    el.type === 'circle' && "border-2 border-slate-900 rounded-full items-center justify-center text-center",
                                    el.type === 'diamond' && "border-2 border-slate-900 flex items-center justify-center text-center rotate-45",
                                    el.type === 'text' && "bg-transparent border-none p-0"
                                )}
                                style={{ backgroundColor: el.color }}
                            >
                                <div className={cn("w-full h-full flex flex-col justify-center", el.type === 'diamond' && "-rotate-45")}>
                                    <textarea 
                                        value={el.text}
                                        onChange={(e) => updateElement(el.id, { text: e.target.value })}
                                        className="bg-transparent border-none focus:ring-0 focus:outline-none resize-none w-full placeholder:text-slate-200"
                                        style={{ 
                                            fontSize: `${el.fontSize || 14}px`, 
                                            color: el.fontColor || '#0f172a',
                                            textAlign: el.textAlign || 'center',
                                            fontWeight: el.bold ? 'bold' : 'normal'
                                        }}
                                        placeholder="..."
                                    />
                                </div>
                                
                                {isSelected && (
                                    <div className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize flex items-center justify-center bg-primary rounded-tl-lg rounded-br-lg text-white">
                                        <CornerRightUp className="h-2 w-2 rotate-90" />
                                    </div>
                                )}
                            </div>

                            {/* External Connect Buttons */}
                            {(isHovered || isSelected) && !isDragging && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <Port side="top" id={el.id} />
                                    <Port side="right" id={el.id} />
                                    <Port side="bottom" id={el.id} />
                                    <Port side="left" id={el.id} />
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {/* Empty State */}
                {elements.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-6 animate-in fade-in duration-1000">
                        <div className="p-10 rounded-[3rem] bg-white border border-slate-100 shadow-inner opacity-40">
                            <Layout className="h-16 w-16 text-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-slate-400">Empty Flow Canvas</h3>
                            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Drag components from the sidebar to begin</p>
                        </div>
                        <Button onClick={() => addElement('note')} className="rounded-full h-11 px-8 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
                            Initialize Logic Canvas
                        </Button>
                    </div>
                )}
            </div>

            {/* Contextual Style Bar - Integrated Event Stop */}
            {selectedElement && (
                <div 
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 p-2 bg-slate-900 text-white shadow-2xl rounded-2xl animate-in slide-in-from-bottom-4 duration-300 border border-white/10"
                >
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-9 px-3 gap-2 rounded-xl text-white font-bold text-[10px] uppercase">
                                <Palette className="h-4 w-4" /> Color
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="grid grid-cols-4 gap-1 p-2 rounded-2xl bg-white border-slate-100">
                            {COLORS.map(c => (
                                <button key={c.value} onClick={() => updateElement(selectedElement.id, { color: c.value })}
                                    className={cn("h-6 w-6 rounded-lg border", selectedElement.color === c.value && "ring-2 ring-primary ring-offset-1")}
                                    style={{ backgroundColor: c.value }} />
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Separator orientation="vertical" className="h-5 bg-white/10" />

                    <div className="flex items-center gap-0.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white"><CaseSensitive className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="p-1 rounded-xl bg-white border-slate-100">
                                {FONT_SIZES.map(s => (
                                    <DropdownMenuItem key={s} onClick={() => updateElement(selectedElement.id, { fontSize: s })} className="text-xs font-bold cursor-pointer">
                                        {s}px
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <ToolbarButton 
                            onClick={() => updateElement(selectedElement.id, { bold: !selectedElement.bold })} 
                            active={!!selectedElement.bold} 
                            icon={<Bold className="h-4 w-4" />} 
                        />
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white"><Palette className="h-4 w-4 opacity-50" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="grid grid-cols-5 p-2 rounded-xl bg-white border-slate-100">
                                {TEXT_COLORS.map(c => (
                                    <button key={c.value} onClick={() => updateElement(selectedElement.id, { fontColor: c.value })}
                                        className={cn("h-5 w-5 rounded-full border m-1", selectedElement.fontColor === c.value && "ring-2 ring-primary")}
                                        style={{ backgroundColor: c.value }} />
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <ToolbarButton onClick={() => updateElement(selectedElement.id, { textAlign: 'left' })} active={selectedElement.textAlign === 'left'} icon={<AlignLeft className="h-4 w-4" />} />
                        <ToolbarButton onClick={() => updateElement(selectedElement.id, { textAlign: 'center' })} active={selectedElement.textAlign === 'center'} icon={<AlignCenter className="h-4 w-4" />} />
                        <ToolbarButton onClick={() => updateElement(selectedElement.id, { textAlign: 'right' })} active={selectedElement.textAlign === 'right'} icon={<AlignRight className="h-4 w-4" />} />
                    </div>

                    <Separator orientation="vertical" className="h-5 bg-white/10" />

                    <Button variant="ghost" size="icon" onClick={() => deleteElement(selectedElement.id)} className="h-9 w-9 rounded-xl hover:bg-red-500/20 text-red-400">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-8 right-8 z-40 flex items-center gap-3">
                 <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-lg">
                    <Button variant="ghost" size="icon" onClick={() => setViewport(v => ({ ...v, scale: Math.max(0.1, v.scale - 0.1) }))} className="h-8 w-8"><Minus className="h-4 w-4 text-slate-500" /></Button>
                    <span className="text-[10px] font-black w-10 text-center text-slate-700">{Math.round(viewport.scale * 100)}%</span>
                    <Button variant="ghost" size="icon" onClick={() => setViewport(v => ({ ...v, scale: Math.min(5, v.scale + 0.1) }))} className="h-8 w-8"><Plus className="h-4 w-4 text-slate-500" /></Button>
                 </div>
                 <Button variant="outline" size="icon" onClick={() => setViewport({ x: 0, y: 0, scale: 1 })} className="h-10 w-10 rounded-xl bg-white shadow-lg border-slate-200"><Zap className="h-4 w-4 text-primary" /></Button>
            </div>
        </div>
    </div>
  );
}

function ToolbarItem({ icon, active = false, onClick }: any) {
    return (
        <button onClick={onClick} className={cn("h-10 w-10 flex items-center justify-center rounded-xl transition-all group relative", active ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:bg-slate-50")}>
            {icon}
        </button>
    );
}

function DraggableTool({ icon, type, onDragStart, label }: any) {
    return (
        <div 
            draggable 
            onDragStart={onDragStart}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-105 transition-all group relative"
        >
            {icon}
            <div className="absolute left-14 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-2xl z-[60] transition-opacity">
                {label}
            </div>
        </div>
    );
}

function ToolbarButton({ onClick, active, icon }: any) {
    return (
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }} 
            className={cn("h-8 w-8 rounded-lg", active ? "bg-white/20 text-primary" : "text-slate-400 hover:text-white")}
        >
            {icon}
        </Button>
    );
}

function Port({ side, id }: { side: 'top' | 'right' | 'bottom' | 'left', id: string }) {
    const positions = {
        top: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2',
        right: 'right-0 top-1/2 translate-x-full -translate-y-1/2 ml-2',
        bottom: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-2',
        left: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 mr-2'
    };

    return (
        <div 
            data-port-id={id}
            className={cn(
                "absolute h-6 w-6 bg-white border-2 border-primary rounded-full shadow-lg pointer-events-auto flex items-center justify-center hover:scale-125 transition-transform cursor-crosshair group/port z-40",
                positions[side]
            )}
        >
            <PlusCircle className="h-3.5 w-3.5 text-primary opacity-40 group-hover/port:opacity-100 transition-opacity" />
        </div>
    );
}
