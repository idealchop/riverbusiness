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
    Layout,
    Bold,
    Link as LinkIcon,
    Copy,
    Undo2,
    Pencil,
    LayoutTemplate,
    Sparkles,
    Binary,
    Trophy,
    Split,
    RotateCcw,
    Activity
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
import type { BoardElement, BoardConnection } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

interface BoardEditorProps {
  initialData: any;
  onContentChange: (json: any) => void;
  editable?: boolean;
}

const COLORS = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#fef08a' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Purple', value: '#f3e8ff' },
    { name: 'Slate', value: '#f1f5f9' },
    { name: 'White', value: '#ffffff' },
    { name: 'Black', value: '#0f172a' }
];

const PEN_COLORS = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Slate', value: '#64748b' },
    { name: 'Black', value: '#0f172a' }
];

const PEN_SIZES = [2, 4, 8, 12];

const TEXT_COLORS = [
    { name: 'Dark', value: '#0f172a' },
    { name: 'Slate', value: '#64748b' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'White', value: '#ffffff' }
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 32, 48];

const BLUEPRINTS = [
    {
        id: 'bp-workflow',
        name: 'Standard Workflow',
        description: 'Linear process from start to finish.',
        icon: ArrowRight,
        elements: [
            { id: 'start', type: 'circle', x: 100, y: 200, width: 100, height: 100, text: 'START', color: '#f1f5f9', bold: true },
            { id: 'step1', type: 'rect', x: 280, y: 175, width: 180, height: 150, text: 'Process Step 1', color: '#ffffff', bold: true },
            { id: 'decision', type: 'diamond', x: 540, y: 175, width: 150, height: 150, text: 'Validation Check', color: '#f3e8ff', bold: true },
            { id: 'end', type: 'circle', x: 800, y: 200, width: 100, height: 100, text: 'FINISH', color: '#f1f5f9', bold: true }
        ],
        connections: [
            { id: 'c1', fromId: 'start', toId: 'step1', type: 'curved' },
            { id: 'c2', fromId: 'step1', toId: 'decision', type: 'curved' },
            { id: 'c3', fromId: 'decision', toId: 'end', type: 'curved' }
        ]
    },
    {
        id: 'bp-roadmap',
        name: 'Project Roadmap',
        description: 'Multi-phase strategic milestones.',
        icon: Trophy,
        elements: [
            { id: 'ph1', type: 'circle', x: 50, y: 100, width: 80, height: 80, text: 'Q1', color: '#3b82f6', fontColor: '#ffffff', bold: true },
            { id: 't1', type: 'rect', x: 150, y: 80, width: 200, height: 120, text: 'Foundation & Research', color: '#ffffff', bold: true },
            { id: 'ph2', type: 'circle', x: 400, y: 100, width: 80, height: 80, text: 'Q2', color: '#3b82f6', fontColor: '#ffffff', bold: true },
            { id: 't2', type: 'rect', x: 500, y: 80, width: 200, height: 120, text: 'Infrastructure Build', color: '#ffffff', bold: true },
            { id: 'ph3', type: 'circle', x: 750, y: 100, width: 80, height: 80, text: 'Q3', color: '#3b82f6', fontColor: '#ffffff', bold: true },
            { id: 't3', type: 'rect', x: 850, y: 80, width: 200, height: 120, text: 'Scale & Launch', color: '#ffffff', bold: true }
        ],
        connections: [
            { id: 'r1', fromId: 'ph1', toId: 'ph2', type: 'straight' },
            { id: 'r2', fromId: 'ph2', toId: 'ph3', type: 'straight' }
        ]
    },
    {
        id: 'bp-priority',
        name: 'Priority Matrix',
        description: 'Impact vs Effort prioritization.',
        icon: Activity,
        elements: [
            { id: 'lbl1', type: 'text', x: 400, y: 0, width: 200, height: 40, text: 'HIGH IMPACT', fontColor: '#ef4444', bold: true },
            { id: 'lbl2', type: 'text', x: 0, y: 300, width: 100, height: 40, text: 'HIGH EFFORT', fontColor: '#64748b', bold: true, textAlign: 'left' },
            { id: 'q1', type: 'rect', x: 100, y: 50, width: 400, height: 300, text: 'Quick Wins', color: '#dcfce7', bold: true, fontSize: 18 },
            { id: 'q2', type: 'rect', x: 500, y: 50, width: 400, height: 300, text: 'Major Projects', color: '#dbeafe', bold: true, fontSize: 18 },
            { id: 'q3', type: 'rect', x: 100, y: 350, width: 400, height: 300, text: 'Fill-ins', color: '#f1f5f9', bold: true, fontSize: 18 },
            { id: 'q4', type: 'rect', x: 500, y: 350, width: 400, height: 300, text: 'Hard Slogs', color: '#fee2e2', bold: true, fontSize: 18 }
        ],
        connections: []
    },
    {
        id: 'bp-swot',
        name: 'Strategic SWOT',
        description: 'Analyze strengths and risks.',
        icon: Binary,
        elements: [
            { id: 's', type: 'note', x: 100, y: 100, width: 250, height: 250, text: 'STRENGTHS', color: '#dcfce7', bold: true },
            { id: 'w', type: 'note', x: 380, y: 100, width: 250, height: 250, text: 'WEAKNESSES', color: '#fee2e2', bold: true },
            { id: 'o', type: 'note', x: 100, y: 380, width: 250, height: 250, text: 'OPPORTUNITIES', color: '#dbeafe', bold: true },
            { id: 't', type: 'note', x: 380, y: 380, width: 250, height: 250, text: 'THREATS', color: '#fef3c7', bold: true }
        ],
        connections: []
    }
];

export function BoardEditor({ initialData, onContentChange, editable = true }: BoardEditorProps) {
  const isMounted = useMounted();
  
  const [elements, setElements] = useState<BoardElement[]>(initialData?.elements || []);
  const [connections, setConnections] = useState<BoardConnection[]>(initialData?.connections || []);
  const [history, setHistory] = useState<{ elements: BoardElement[], connections: BoardConnection[] }[]>([]);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<BoardElement[]>([]);
  
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [tool, setTool] = useState<'select' | 'hand' | 'arrow' | 'pen'>('select');
  
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isSelectingMarquee, setIsSelectingMarquee] = useState(false);
  const [marqueeBox, setMarqueeBox] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const [pendingConnFrom, setPendingConnFrom] = useState<string | null>(null);
  const [currentMouseCoords, setCurrentMouseCoords] = useState<{ x: number, y: number } | null>(null);
  
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [penColor, setPenColor] = useState('#3b82f6');
  const [penSize, setPenSize] = useState(4);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (initialData?.elements) setElements(initialData.elements);
      if (initialData?.connections) setConnections(initialData.connections);
  }, [initialData]);

  const sync = useCallback((newElements: BoardElement[], newConnections: BoardConnection[]) => {
      if (!editable) return;
      onContentChange({ elements: newElements, connections: newConnections });
  }, [onContentChange, editable]);

  const pushHistory = useCallback(() => {
    setHistory(prev => {
        const next = [...prev, { elements: JSON.parse(JSON.stringify(elements)), connections: JSON.parse(JSON.stringify(connections)) }];
        if (next.length > 50) return next.slice(1);
        return next;
    });
  }, [elements, connections]);

  const undo = useCallback(() => {
    if (history.length === 0 || !editable) return;
    
    const prevState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    
    setElements(prevState.elements);
    setConnections(prevState.connections);
    
    sync(prevState.elements, prevState.connections);
  }, [history, editable, sync]);

  const getLogicalCoords = (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - viewport.x) / viewport.scale;
      const y = (clientY - rect.top - viewport.y) / viewport.scale;
      return { x, y };
  };

  const addElement = (type: BoardElement['type'], x?: number, y?: number, data?: Partial<BoardElement>) => {
      if (!editable) return;
      pushHistory();
      const id = `el-${Date.now()}`;
      const newEl: BoardElement = {
          id, 
          type: data?.type || type,
          x: x || (100 - viewport.x) / viewport.scale,
          y: y || (100 - viewport.y) / viewport.scale,
          text: data?.text || (type === 'note' ? 'New Idea' : (type === 'text' ? 'Double click to edit' : 'Process Step')),
          color: data?.color || (type === 'note' ? '#fef08a' : '#ffffff'),
          width: data?.width || (type === 'text' ? 200 : 150),
          height: data?.height || (type === 'text' ? 40 : 150),
          fontSize: data?.fontSize || 14,
          fontColor: data?.fontColor || '#0f172a',
          bold: data?.bold ?? true,
          textAlign: data?.textAlign || 'center',
          path: data?.path,
          strokeWidth: data?.strokeWidth
      };
      const nextElements = [...elements, newEl];
      setElements(nextElements);
      sync(nextElements, connections);
      setSelectedIds([id]);
      return id;
  };

  const applyBlueprint = (blueprint: typeof BLUEPRINTS[0]) => {
      if (!editable) return;
      pushHistory();
      
      const offsetX = (100 - viewport.x) / viewport.scale;
      const offsetY = (100 - viewport.y) / viewport.scale;

      const newElements: BoardElement[] = blueprint.elements.map(el => ({
          ...el,
          id: `${el.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          x: el.x + offsetX,
          y: el.y + offsetY,
          type: el.type as any,
          text: el.text || '',
          color: el.color || '#ffffff',
          width: el.width || 150,
          height: el.height || 150
      }));

      const newConnections: BoardConnection[] = blueprint.connections.map(conn => {
          const fromIdx = blueprint.elements.findIndex(e => e.id === conn.fromId);
          const toIdx = blueprint.elements.findIndex(e => e.id === conn.toId);
          return {
              ...conn,
              id: `${conn.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              fromId: newElements[fromIdx].id,
              toId: newElements[toIdx].id,
              type: conn.type as any
          };
      });

      const nextElements = [...elements, ...newElements];
      const nextConnections = [...connections, ...newConnections];
      setElements(nextElements);
      setConnections(nextConnections);
      sync(nextElements, nextConnections);
  };

  const deleteSelected = useCallback(() => {
      if (!editable || selectedIds.length === 0) return;
      pushHistory();
      const nextElements = elements.filter(el => !selectedIds.includes(el.id));
      const nextConnections = connections.filter(c => !selectedIds.includes(c.fromId) && !selectedIds.includes(c.toId));
      setElements(nextElements);
      setConnections(nextConnections);
      sync(nextElements, nextConnections);
      setSelectedIds([]);
  }, [editable, selectedIds, elements, connections, sync, pushHistory]);

  const handleCopy = useCallback(() => {
      const selected = elements.filter(el => selectedIds.includes(el.id));
      if (selected.length > 0) {
          setClipboard([...selected]);
      }
  }, [elements, selectedIds]);

  const handlePaste = useCallback(() => {
      if (clipboard.length === 0 || !editable) return;
      pushHistory();
      const offset = 40;
      const idMap: Record<string, string> = {};
      
      const newElements = clipboard.map(el => {
          const newId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          idMap[el.id] = newId;
          return {
              ...el,
              id: newId,
              x: el.x + offset,
              y: el.y + offset
          };
      });

      const newIds = newElements.map(el => el.id);
      const nextElements = [...elements, ...newElements];
      setElements(nextElements);
      sync(nextElements, connections);
      setSelectedIds(newIds);
  }, [clipboard, editable, elements, connections, sync, pushHistory]);

  const handleDuplicate = useCallback(() => {
      if (selectedIds.length === 0 || !editable) return;
      handleCopy();
      handlePaste();
  }, [selectedIds, editable, handleCopy, handlePaste]);

  useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
          const activeElement = document.activeElement;
          const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
          
          if (e.key === 'Backspace' || e.key === 'Delete') {
              if (!isInput && selectedIds.length > 0) {
                  e.preventDefault();
                  deleteSelected();
              }
          }
          
          if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
              if (!isInput && selectedIds.length > 0) {
                  e.preventDefault();
                  handleCopy();
              }
          }

          if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
              if (!isInput) {
                  e.preventDefault();
                  handlePaste();
              }
          }

          if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
              if (!isInput && selectedIds.length > 0) {
                  e.preventDefault();
                  handleDuplicate();
              }
          }

          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              if (!isInput) {
                  e.preventDefault();
                  undo();
              }
          }

          if (!isInput) {
            if (e.key === '=') {
                e.preventDefault();
                setViewport(prev => ({ ...prev, scale: Math.min(5, prev.scale + 0.1) }));
            }
            if (e.key === '-') {
                e.preventDefault();
                setViewport(prev => ({ ...prev, scale: Math.max(0.1, prev.scale - 0.1) }));
            }
            if (e.key === ' ') {
                e.preventDefault();
                const nextScale = viewport.scale === 1 ? 0.5 : 1;
                setViewport(prev => ({ ...prev, scale: nextScale }));
            }
          }

          if (e.key === 'Escape') {
              setSelectedIds([]);
              setTool('select');
          }
      };

      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedIds, deleteSelected, handleCopy, handlePaste, handleDuplicate, undo, viewport.scale]);

  const handleMouseDown = (e: React.MouseEvent) => {
      const { x, y } = getLogicalCoords(e.clientX, e.clientY);
      
      if (tool === 'hand' || e.button === 1) {
          setIsPanning(true);
          setLastMousePos({ x: e.clientX, y: e.clientY });
          return;
      }

      if (tool === 'pen' && editable) {
          setCurrentPath(`M ${x} ${y}`);
          return;
      }

      const target = e.target as HTMLElement;
      const portId = target.closest('[data-port-id]')?.getAttribute('data-port-id');
      if (portId) {
          setPendingConnFrom(portId);
          setCurrentMouseCoords({ x, y });
          return;
      }

      const hit = [...elements].reverse().find(el => {
          if (el.type === 'path') return false; 
          return (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height);
      });
      
      if (hit) {
          const handleSize = 12 / viewport.scale;
          const isResizingHit = x >= hit.x + hit.width - handleSize && y >= hit.y + hit.height - handleSize;

          if (isResizingHit) {
              pushHistory();
              setIsResizing(true);
              setDragId(hit.id);
          } else {
              if (e.shiftKey) {
                  setSelectedIds(prev => prev.includes(hit.id) ? prev.filter(id => id !== hit.id) : [...prev, hit.id]);
              } else if (!selectedIds.includes(hit.id)) {
                  setSelectedIds([hit.id]);
              }
              
              pushHistory();
              setIsDragging(true);
              setDragId(hit.id);
              setDragOffset({ x: x, y: y }); 
          }
      } else {
          if (!e.shiftKey) {
              setSelectedIds([]);
          }
          setIsSelectingMarquee(true);
          setMarqueeBox({ x1: x, y1: y, x2: x, y2: y });
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

      if (tool === 'pen' && currentPath && editable) {
          setCurrentPath(prev => `${prev} L ${x} ${y}`);
          return;
      }

      if (isSelectingMarquee && marqueeBox) {
          setMarqueeBox({ ...marqueeBox, x2: x, y2: y });
          
          const xMin = Math.min(marqueeBox.x1, x);
          const xMax = Math.max(marqueeBox.x1, x);
          const yMin = Math.min(marqueeBox.y1, y);
          const yMax = Math.max(marqueeBox.y1, y);

          const inBox = elements.filter(el => {
              if (el.type === 'path') return false;
              return el.x < xMax && el.x + el.width > xMin && el.y < yMax && el.y + el.height > yMin;
          }).map(el => el.id);
          
          setSelectedIds(inBox);
          return;
      }

      if (pendingConnFrom) {
          setCurrentMouseCoords({ x, y });
      }

      const hoverHit = [...elements].reverse().find(el => {
          if (el.type === 'path') return false;
          return (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height);
      });
      setHoveredId(hoverHit?.id || null);

      if (isResizing && dragId) {
          setElements(prev => prev.map(el => el.id === dragId ? { 
              ...el, 
              width: Math.max(50, x - el.x), 
              height: Math.max(40, y - el.y) 
          } : el));
      } else if (isDragging) {
          const dx = x - dragOffset.x;
          const dy = y - dragOffset.y;
          setDragOffset({ x, y });
          
          setElements(prev => prev.map(el => {
              if (selectedIds.includes(el.id)) {
                  return { ...el, x: el.x + dx, y: el.y + dy };
              }
              return el;
          }));
      }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      if (tool === 'pen' && currentPath && editable) {
          const id = `path-${Date.now()}`;
          const newPathEl: BoardElement = {
              id,
              type: 'path',
              path: currentPath,
              x: 0,
              y: 0,
              text: '',
              color: penColor,
              width: 0,
              height: 0,
              strokeWidth: penSize
          };
          
          setElements(prev => {
              const next = [...prev, newPathEl];
              sync(next, connections);
              return next;
          });
          
          setCurrentPath(null);
          return;
      }

      if (pendingConnFrom) {
          const { x, y } = getLogicalCoords(e.clientX, e.clientY);
          const targetHit = elements.find(el => {
              if (el.type === 'path') return false;
              return (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height);
          });
          
          if (targetHit && targetHit.id !== pendingConnFrom) {
              pushHistory();
              const newConn: BoardConnection = { 
                  id: `conn-${Date.now()}`, 
                  fromId: pendingConnFrom, 
                  toId: targetHit.id, 
                  type: 'curved' 
              };
              const nextConnections = [...connections, newConn];
              setConnections(nextConnections);
              sync(elements, nextConnections);
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
      setIsSelectingMarquee(false);
      setMarqueeBox(null);
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

  const updateSelectedElements = (data: Partial<BoardElement>) => {
      if (selectedIds.length === 0) return;
      pushHistory();
      const next = elements.map(el => selectedIds.includes(el.id) ? { ...el, ...data } : el);
      setElements(next);
      sync(next, connections);
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

  return (
    <div className="flex-1 flex bg-slate-50 overflow-hidden relative select-none font-sans h-full">
        <aside className="w-16 border-r bg-white flex flex-col items-center py-6 gap-6 z-50 shadow-sm shrink-0">
            <div className="flex flex-col gap-5">
                <DraggableTool icon={<StickyNote className="h-5 w-5 text-amber-500" />} type="note" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'note')} label="Sticky" />
                <DraggableTool icon={<Square className="h-5 w-5 text-blue-500" />} type="rect" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'rect')} label="Process" />
                <DraggableTool icon={<Circle className="h-5 w-5 text-green-500" />} type="circle" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'circle')} label="Event" />
                <DraggableTool icon={<Diamond className="h-5 w-5 text-purple-500" />} type="diamond" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'diamond')} label="Logic" />
            </div>
            <Separator className="w-8" />
            <div className="flex flex-col gap-3">
                <ToolbarItem icon={<MousePointer2 className="h-4 w-4" />} active={tool === 'select'} onClick={() => setTool('select')} />
                <ToolbarItem icon={<Pencil className="h-4 w-4" />} active={tool === 'pen'} onClick={() => setTool('pen')} />
                <ToolbarItem icon={<Grab className="h-4 w-4" />} active={tool === 'hand'} onClick={() => setTool('hand')} />
                <ToolbarItem icon={<LinkIcon className="h-4 w-4" />} active={tool === 'arrow'} onClick={() => setTool('arrow')} />
            </div>

            <div className="mt-auto">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 transition-all">
                            <LayoutTemplate className="h-5 w-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" className="w-64 p-1 rounded-2xl shadow-3xl border-slate-100 bg-white ml-2">
                        <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest border-b mb-1">Architecture Blueprints</DropdownMenuLabel>
                        <ScrollArea className="h-[400px]">
                            {BLUEPRINTS.map(bp => (
                                <DropdownMenuItem key={bp.id} onClick={() => applyBlueprint(bp)} className="flex flex-col items-start gap-1 p-3 rounded-xl cursor-pointer">
                                    <div className="flex items-center gap-2 w-full">
                                        <bp.icon className="h-4 w-4 text-primary" />
                                        <span className="font-bold text-sm text-slate-900">{bp.name}</span>
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-400">{bp.description}</p>
                                </DropdownMenuItem>
                            ))}
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>
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
            
            <div className="absolute inset-0 z-0 opacity-[0.1] pointer-events-none" 
                 style={{ 
                     backgroundImage: `radial-gradient(circle, #538ec2 1.5px, transparent 1px)`, 
                     backgroundSize: `${40 * viewport.scale}px ${40 * viewport.scale}px`,
                     backgroundPosition: `${viewport.x}px ${viewport.y}px`
                 }} 
            />

            <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, transformOrigin: '0 0' }} className="absolute inset-0 pointer-events-none">
                <svg className="absolute inset-0 overflow-visible w-full h-full">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                        </marker>
                    </defs>
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

                    {elements.filter(el => el.type === 'path').map(el => (
                        <path 
                            key={el.id} 
                            d={el.path} 
                            fill="none" 
                            stroke={el.color || '#3b82f6'} 
                            strokeWidth={el.strokeWidth || 2} 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className={cn(
                                "pointer-events-auto cursor-pointer transition-all",
                                selectedIds.includes(el.id) ? "stroke-primary" : ""
                            )}
                            onMouseDown={(e) => {
                                if (tool === 'select') {
                                    e.stopPropagation();
                                    if (e.shiftKey) {
                                        setSelectedIds(prev => prev.includes(el.id) ? prev.filter(id => id !== el.id) : [...prev, el.id]);
                                    } else {
                                        setSelectedIds([el.id]);
                                    }
                                }
                            }}
                        />
                    ))}
                    
                    {currentPath && (
                        <path 
                            d={currentPath} 
                            fill="none" 
                            stroke={penColor} 
                            strokeWidth={penSize} 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                        />
                    )}
                </svg>

                {elements.filter(el => el.type !== 'path').map((el) => {
                    const isSelected = selectedIds.includes(el.id);
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
                                        onChange={(e) => {
                                            const next = elements.map(item => item.id === el.id ? { ...item, text: e.target.value } : item);
                                            setElements(next);
                                            onContentChange({ elements: next, connections });
                                        }}
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
                                
                                {isSelected && selectedIds.length === 1 && (
                                    <div className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize flex items-center justify-center bg-primary rounded-tl-lg rounded-br-lg text-white">
                                        <CornerRightUp className="h-2 w-2 rotate-90" />
                                    </div>
                                )}
                            </div>

                            {(isHovered || isSelected) && !isDragging && !isSelectingMarquee && (
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

                {marqueeBox && (
                    <div 
                        className="absolute border-2 border-primary bg-primary/10 rounded-sm pointer-events-none"
                        style={{
                            left: Math.min(marqueeBox.x1, marqueeBox.x2),
                            top: Math.min(marqueeBox.y1, marqueeBox.y2),
                            width: Math.abs(marqueeBox.x2 - marqueeBox.x1),
                            height: Math.abs(marqueeBox.y2 - marqueeBox.y1)
                        }}
                    />
                )}
                
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

            {selectedIds.length > 0 && (
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
                                <button key={c.value} onClick={() => updateSelectedElements({ color: c.value })}
                                    className="h-6 w-6 rounded-lg border"
                                    style={{ backgroundColor: c.value }} />
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {selectedIds.length === 1 && elements.find(e => e.id === selectedIds[0])?.type !== 'path' && (
                        <>
                            <Separator orientation="vertical" className="h-5 bg-white/10" />
                            <div className="flex items-center gap-0.5">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white"><CaseSensitive className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="p-1 rounded-xl bg-white border-slate-100">
                                        {FONT_SIZES.map(s => (
                                            <DropdownMenuItem key={s} onClick={() => updateSelectedElements({ fontSize: s })} className="text-xs font-bold cursor-pointer">
                                                {s}px
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                
                                <ToolbarButton 
                                    onClick={() => {
                                        const el = elements.find(e => e.id === selectedIds[0]);
                                        updateSelectedElements({ bold: !el?.bold });
                                    }} 
                                    active={!!elements.find(e => e.id === selectedIds[0])?.bold} 
                                    icon={<Bold className="h-4 w-4" />} 
                                />
                                
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white"><Palette className="h-4 w-4 opacity-50" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="grid grid-cols-5 p-2 rounded-xl bg-white border-slate-100">
                                        {TEXT_COLORS.map(c => (
                                            <button key={c.value} onClick={() => updateSelectedElements({ fontColor: c.value })}
                                                className={cn("h-5 w-5 rounded-full border m-1", elements.find(e => e.id === selectedIds[0])?.fontColor === c.value && "ring-2 ring-primary")}
                                                style={{ backgroundColor: c.value }} />
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <ToolbarButton onClick={() => updateSelectedElements({ textAlign: 'left' })} active={elements.find(e => e.id === selectedIds[0])?.textAlign === 'left'} icon={<AlignLeft className="h-4 w-4" />} />
                                <ToolbarButton onClick={() => updateSelectedElements({ textAlign: 'center' })} active={elements.find(e => e.id === selectedIds[0])?.textAlign === 'center'} icon={<AlignCenter className="h-4 w-4" />} />
                                <ToolbarButton onClick={() => updateSelectedElements({ textAlign: 'right' })} active={elements.find(e => e.id === selectedIds[0])?.textAlign === 'right'} icon={<AlignRight className="h-4 w-4" />} />
                            </div>
                        </>
                    )}

                    <Separator orientation="vertical" className="h-5 bg-white/10" />

                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={handleCopy} className="h-9 w-9 rounded-xl hover:bg-white/10 text-white">
                            <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={deleteSelected} className="h-9 w-9 rounded-xl hover:bg-red-500/20 text-red-400">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {tool === 'pen' && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 p-3 bg-white shadow-2xl rounded-[1.5rem] animate-in slide-in-from-bottom-4 duration-300 border border-slate-100">
                    <div className="flex items-center gap-2 pr-4 border-r border-slate-100">
                        <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                            <Pencil className="h-4 w-4" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Inking</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {PEN_COLORS.map(c => (
                            <button 
                                key={c.value} 
                                onClick={() => setPenColor(c.value)}
                                className={cn(
                                    "h-7 w-7 rounded-full border-2 border-white shadow-sm transition-all hover:scale-110",
                                    penColor === c.value ? "ring-2 ring-primary ring-offset-1" : "hover:ring-1 hover:ring-slate-200"
                                )}
                                style={{ backgroundColor: c.value }}
                            />
                        ))}
                    </div>

                    <Separator orientation="vertical" className="h-6 bg-slate-100" />

                    <div className="flex items-center gap-1.5 px-2">
                        {PEN_SIZES.map(s => (
                            <button 
                                key={s} 
                                onClick={() => setPenSize(s)}
                                className={cn(
                                    "flex items-center justify-center h-8 w-8 rounded-lg transition-all",
                                    penSize === s ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-400 hover:bg-slate-50"
                                )}
                            >
                                <div style={{ width: s/1.5 + 2, height: s/1.5 + 2 }} className="rounded-full bg-current" />
                            </button>
                        ))}
                    </div>
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setTool('select')}
                        className="h-8 w-8 rounded-lg text-slate-300 hover:text-red-500"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <div className="absolute bottom-8 right-8 z-40 flex items-center gap-3">
                 <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-lg">
                    <Button variant="ghost" size="icon" onClick={() => setViewport(v => ({ ...v, scale: Math.max(0.1, v.scale - 0.1) }))} className="h-8 w-8"><Minus className="h-4 w-4 text-slate-500" /></Button>
                    <span className="text-[10px] font-black w-10 text-center text-slate-700">{Math.round(viewport.scale * 100)}%</span>
                    <Button variant="ghost" size="icon" onClick={() => setViewport(v => ({ ...v, scale: Math.min(5, v.scale + 0.1) }))} className="h-8 w-8"><Plus className="h-4 w-4 text-slate-500" /></Button>
                 </div>
                 
                 <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-lg">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={undo} 
                        disabled={history.length === 0} 
                        className="h-10 w-10 rounded-lg text-slate-500 disabled:opacity-30"
                    >
                        <Undo2 className="h-4 w-4" />
                    </Button>
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
