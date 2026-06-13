'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    PlusCircle,
    Diamond,
    CornerRightUp,
    Layout,
    Copy,
    Link as LinkIcon,
    Pencil,
    LayoutTemplate,
    Sparkles,
    Workflow,
    User,
    Users,
    Settings,
    Mail,
    Phone,
    MapPin,
    Calendar,
    CreditCard,
    Package,
    Truck,
    Shield,
    HardDrive,
    Cloud,
    Database,
    Cpu,
    Search,
    Landmark,
    Briefcase,
    BarChart,
    Rocket,
    Globe,
    Lock,
    Server,
    Target,
    Award,
    Heart,
    Star,
    Smile,
    MessageSquare,
    Save,
    Archive,
    Download,
    Upload,
    Share2,
    Eye,
    CheckCircle,
    AlertTriangle,
    Info,
    HelpCircle,
    Smartphone,
    Terminal,
    Key,
    ShieldCheck,
    Repeat,
    Flag,
    Anchor,
    Box,
    ShoppingBag,
    Hammer,
    Check,
    Loader2,
    Map,
    ListTodo,
    Compass,
    Keyboard,
    Command,
    Type,
    AlignCenter,
    AlignLeft,
    AlignRight,
    Type as TypeIcon,
    CornerDownRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
    Popover,
    PopoverContent,
    PopoverTrigger 
} from '@/components/ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { useMounted } from '@/hooks/use-mounted';
import { useToast } from '@/hooks/use-toast';
import type { BoardElement, BoardConnection } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';

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

const ASSET_ICONS = [
    { name: 'User', icon: User },
    { name: 'Users', icon: Users },
    { name: 'Settings', icon: Settings },
    { name: 'Mail', icon: Mail },
    { name: 'Phone', icon: Phone },
    { name: 'MapPin', icon: MapPin },
    { name: 'Calendar', icon: Calendar },
    { name: 'CreditCard', icon: CreditCard },
    { name: 'Package', icon: Package },
    { name: 'Truck', icon: Truck },
    { name: 'Shield', icon: Shield },
    { name: 'HardDrive', icon: HardDrive },
    { name: 'Cloud', icon: Cloud },
    { name: 'Database', icon: Database },
    { name: 'Cpu', icon: Cpu },
    { name: 'Landmark', icon: Landmark },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'BarChart', icon: BarChart },
    { name: 'Rocket', icon: Rocket },
    { name: 'Globe', icon: Globe },
    { name: 'Lock', icon: Lock },
    { name: 'Server', icon: Server },
    { name: 'Target', icon: Target },
    { name: 'Award', icon: Award },
    { name: 'Heart', icon: Heart },
    { name: 'Star', icon: Star },
    { name: 'Smile', icon: Smile },
    { name: 'MessageSquare', icon: MessageSquare },
    { name: 'Save', icon: Save },
    { name: 'Archive', icon: Archive },
    { name: 'Download', icon: Download },
    { name: 'Upload', icon: Upload },
    { name: 'Share2', icon: Share2 },
    { name: 'Eye', icon: Eye },
    { name: 'CheckCircle', icon: CheckCircle },
    { name: 'AlertTriangle', icon: AlertTriangle },
    { name: 'Info', icon: Info },
    { name: 'HelpCircle', icon: HelpCircle },
    { name: 'Smartphone', icon: Smartphone },
    { name: 'Terminal', icon: Terminal },
    { name: 'Key', icon: Key },
    { name: 'ShieldCheck', icon: ShieldCheck },
    { name: 'Repeat', icon: Repeat },
    { name: 'Flag', icon: Flag },
    { name: 'Anchor', icon: Anchor },
    { name: 'Box', icon: Box },
    { name: 'ShoppingBag', icon: ShoppingBag },
    { name: 'Hammer', icon: Hammer }
];

const EMOJIS = [
    '🚀', '💡', '✅', '⚠️', '📊', '🏢', '💧', '🌊', '⭐', '🔥', '⚡', '🎨', '💬', '📍', '🎯', '💰', '🚛', '🏗️', '🛠️', '🛡️',
    '📈', '📉', '📅', '📋', '📝', '🔍', '🔒', '🔑', '🛒', '💳', '💻', '📱', '🔋', '📡', '🔗', '🤝', '👤', '👥', '🏆'
];

export function BoardEditor({ initialData, onContentChange, editable = true }: BoardEditorProps) {
  const isMounted = useMounted();
  const { toast } = useToast();
  
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
  const [assetSearch, setAssetSearch] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  const selectedElement = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return elements.find(el => el.id === selectedIds[0]);
  }, [selectedIds, elements]);

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

  const handleZoom = useCallback((delta: number) => {
    setViewport(prev => ({
        ...prev,
        scale: Math.min(Math.max(0.1, prev.scale + delta), 5)
    }));
  }, []);

  const addElement = (type: BoardElement['type'], x?: number, y?: number, data?: Partial<BoardElement>) => {
      if (!editable) return;
      pushHistory();
      const id = `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newEl: BoardElement = {
          id, 
          type: data?.type || type,
          x: x || (100 - viewport.x) / viewport.scale,
          y: y || (100 - viewport.y) / viewport.scale,
          text: data?.text || '',
          color: data?.color || (type === 'note' ? '#fef08a' : '#ffffff'),
          width: data?.width || (type === 'text' ? 200 : 150),
          height: data?.height || (type === 'text' ? 40 : 150),
          fontSize: data?.fontSize || 14,
          fontColor: data?.fontColor || '#0f172a',
          bold: data?.bold ?? true,
          textAlign: data?.textAlign || 'center',
          path: data?.path,
          strokeWidth: data?.strokeWidth,
          iconName: data?.iconName
      };
      setElements(prev => {
          const next = [...prev, newEl];
          setTimeout(() => sync(next, connections), 0);
          return next;
      });
      setSelectedIds([id]);
      return id;
  };

  const deleteSelected = useCallback(() => {
      if (!editable || selectedIds.length === 0) return;
      pushHistory();
      setElements(prev => {
          const next = prev.filter(el => !selectedIds.includes(el.id));
          setConnections(prevConn => {
              const nextConn = prevConn.filter(c => !selectedIds.includes(c.fromId) && !selectedIds.includes(c.toId));
              setTimeout(() => sync(next, nextConn), 0);
              return nextConn;
          });
          return next;
      });
      setSelectedIds([]);
  }, [editable, selectedIds, sync, pushHistory, connections]);

  const handleCopy = useCallback(() => {
      const selected = elements.filter(el => selectedIds.includes(el.id));
      if (selected.length > 0) setClipboard([...selected]);
  }, [elements, selectedIds]);

  const handlePaste = useCallback(() => {
      if (clipboard.length === 0 || !editable) return;
      pushHistory();
      const offset = 40;
      const timestamp = Date.now();
      const randomSuffix = () => Math.random().toString(36).substr(2, 5);

      const newElements = clipboard.map(el => ({
          ...el,
          id: `el-${timestamp}-${randomSuffix()}`,
          x: el.x + offset,
          y: el.y + offset
      }));
      
      setElements(prev => {
          const next = [...prev, ...newElements];
          setTimeout(() => sync(next, connections), 0);
          return next;
      });
      setSelectedIds(newElements.map(el => el.id));
  }, [clipboard, editable, connections, sync, pushHistory]);

  const handleDuplicate = useCallback(() => {
    if (selectedIds.length === 0 || !editable) return;
    pushHistory();
    const offset = 20;
    const timestamp = Date.now();
    const randomSuffix = () => Math.random().toString(36).substr(2, 5);

    const newElements = elements
        .filter(el => selectedIds.includes(el.id))
        .map(el => ({
            ...el,
            id: `el-${timestamp}-${randomSuffix()}`,
            x: el.x + offset,
            y: el.y + offset
        }));
    
    setElements(prev => {
        const next = [...prev, ...newElements];
        setTimeout(() => sync(next, connections), 0);
        return next;
    });
    setSelectedIds(newElements.map(el => el.id));
  }, [selectedIds, elements, editable, connections, sync, pushHistory]);

  useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
          const activeElement = document.activeElement;
          const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
          if (!isInput) {
            if (e.key.toLowerCase() === 's') { e.preventDefault(); setTool('select'); }
            if (e.key.toLowerCase() === 'p') { e.preventDefault(); setTool('pen'); }
            if (e.key.toLowerCase() === 'h') { e.preventDefault(); setTool('hand'); }
            if (e.key.toLowerCase() === 'l') { e.preventDefault(); setTool('arrow'); }
            if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); deleteSelected(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); handleCopy(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); handlePaste(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
          }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedIds, deleteSelected, handleCopy, handlePaste, undo]);

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
              setDragOffset({ x: x - hit.x, y: y - hit.y }); 
          }
      } else {
          if (!e.shiftKey) setSelectedIds([]);
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

      if (pendingConnFrom) setCurrentMouseCoords({ x, y });

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
      } else if (isDragging && dragId) {
          setElements(prev => {
              const mainEl = prev.find(item => item.id === dragId);
              if (!mainEl) return prev;
              
              const newMainX = x - dragOffset.x;
              const newMainY = y - dragOffset.y;
              const dx = newMainX - mainEl.x;
              const dy = newMainY - mainEl.y;

              if (dx === 0 && dy === 0) return prev;

              return prev.map(el => {
                  if (selectedIds.includes(el.id)) {
                      return { ...el, x: el.x + dx, y: el.y + dy };
                  }
                  return el;
              });
          });
      }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      if (tool === 'pen' && currentPath && editable) {
          const id = `path-${Date.now()}`;
          const newPathEl: BoardElement = {
              id,
              type: 'path',
              path: currentPath,
              x: 0, y: 0, text: '', color: penColor, width: 0, height: 0, strokeWidth: penSize
          };
          setElements(prev => {
              const next = [...prev, newPathEl];
              setTimeout(() => sync(next, connections), 0);
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
              const newConn: BoardConnection = { id: `conn-${Date.now()}`, fromId: pendingConnFrom, toId: targetHit.id, type: 'curved' };
              setConnections(prev => {
                  const next = [...prev, newConn];
                  setTimeout(() => sync(elements, next), 0);
                  return next;
              });
          }
          setPendingConnFrom(null);
          setCurrentMouseCoords(null);
      }

      if (isDragging || isResizing) sync(elements, connections);
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
          handleZoom(delta);
      } else {
          setViewport(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
  };

  const updateSelectedElements = (data: Partial<BoardElement>) => {
      if (selectedIds.length === 0 || !editable) return;
      pushHistory();
      
      const nextElements = elements.map(el => {
          if (selectedIds.includes(el.id)) {
              const updates: any = { ...data };
              if (data.color && (el.type === 'icon' || el.type === 'text')) {
                  updates.fontColor = data.color;
              }
              return { ...el, ...updates };
          }
          return el;
      });

      setElements(nextElements);
      sync(nextElements, connections);
  };

  const getConnectorPath = (fromId: string, toX: number, toY: number, toId?: string) => {
      const from = elements.find(e => e.id === fromId);
      if (!from) return '';
      const x1 = from.x + from.width / 2;
      const y1 = from.y + from.height / 2;
      let x2 = toX, y2 = toY;
      if (toId) {
          const to = elements.find(e => e.id === toId);
          if (to) { x2 = to.x + to.width / 2; y2 = to.y + to.height / 2; }
      }
      const cp1x = x1 + (x2 - x1) / 2, cp1y = y1, cp2x = x1 + (x2 - x1) / 2, cp2y = y2;
      return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  };

  const filteredAssets = {
      emojis: EMOJIS.filter(e => e.toLowerCase().includes(assetSearch.toLowerCase())),
      icons: ASSET_ICONS.filter(i => i.name.toLowerCase().includes(assetSearch.toLowerCase()))
  };

  if (!isMounted) return null;

  return (
    <div className="flex-1 flex bg-slate-50 overflow-hidden relative select-none h-full font-sans">
        {/* Left Toolbar */}
        <aside className="w-16 border-r bg-white flex flex-col items-center py-6 gap-6 z-50 shadow-sm shrink-0">
            <div className="flex flex-col gap-5">
                <DraggableTool icon={<TypeIcon className="h-5 w-5 text-slate-900" />} type="text" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'text')} />
                <DraggableTool icon={<StickyNote className="h-5 w-5 text-amber-500" />} type="note" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'note')} />
                <DraggableTool icon={<Square className="h-5 w-5 text-blue-500" />} type="rect" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'rect')} />
                <DraggableTool icon={<Circle className="h-5 w-5 text-green-500" />} type="circle" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'circle')} />
                <DraggableTool icon={<Diamond className="h-5 w-5 text-purple-500" />} type="diamond" onDragStart={(e: any) => e.dataTransfer.setData('elType', 'diamond')} />
                
                <Popover onOpenChange={() => setAssetSearch('')}>
                    <PopoverTrigger asChild>
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm text-primary">
                            <Sparkles className="h-5 w-5" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="w-80 p-0 rounded-2xl shadow-3xl border-slate-100 bg-white ml-2 overflow-hidden z-50">
                        <div className="p-4 bg-slate-50 border-b">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <Input placeholder="Search assets..." className="pl-8 h-9 text-xs rounded-xl bg-white border-none shadow-inner" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} />
                            </div>
                        </div>
                        <ScrollArea className="h-[400px]">
                            <div className="p-4 space-y-6">
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Emojis</p>
                                    <div className="grid grid-cols-6 gap-2">
                                        {filteredAssets.emojis.map(emoji => (
                                            <div key={emoji} draggable onDragStart={(e) => { e.dataTransfer.setData('elType', 'text'); e.dataTransfer.setData('elText', emoji); e.dataTransfer.setData('elFontSize', '48'); }} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-2xl cursor-grab transition-colors">{emoji}</div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Icons</p>
                                    <div className="grid grid-cols-6 gap-2">
                                        {filteredAssets.icons.map(asset => (
                                            <div key={asset.name} draggable onDragStart={(e) => { e.dataTransfer.setData('elType', 'icon'); e.dataTransfer.setData('iconName', asset.name); }} className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-grab transition-all group"><asset.icon className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" /></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </PopoverContent>
                </Popover>
            </div>
            
            <Separator className="w-8" />
            <div className="flex flex-col gap-3">
                <ToolbarItem icon={<MousePointer2 className="h-4 w-4" />} active={tool === 'select'} onClick={() => setTool('select')} />
                <ToolbarItem icon={<Pencil className="h-4 w-4" />} active={tool === 'pen'} onClick={() => setTool('pen')} />
                <ToolbarItem icon={<Grab className="h-4 w-4" />} active={tool === 'hand'} onClick={() => setTool('hand')} />
                <ToolbarItem icon={<LinkIcon className="h-4 w-4" />} active={tool === 'arrow'} onClick={() => setTool('arrow')} />
            </div>
        </aside>

        {/* Main Canvas */}
        <div className="flex-1 relative overflow-hidden" 
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove} 
             onMouseUp={handleMouseUp}
             onWheel={handleWheel}
             onDragOver={(e) => e.preventDefault()}
             onDrop={(e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData('elType') as BoardElement['type'];
                const text = e.dataTransfer.getData('elText');
                const fontSize = e.dataTransfer.getData('elFontSize');
                const iconName = e.dataTransfer.getData('iconName');
                if (type) {
                    const { x, y } = getLogicalCoords(e.clientX, e.clientY);
                    addElement(type, x - 75, y - (type === 'text' ? 20 : 75), { text: text || undefined, fontSize: fontSize ? parseInt(fontSize) : undefined, iconName: iconName || undefined, width: type === 'icon' ? 100 : undefined, height: type === 'icon' ? 100 : undefined });
                }
             }}
             style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: `${24 * viewport.scale}px ${24 * viewport.scale}px`, backgroundPosition: `${viewport.x}px ${viewport.y}px` }}
             ref={containerRef}>
            
            <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, transformOrigin: '0 0' }} className="absolute inset-0 pointer-events-none">
                <svg className="absolute inset-0 overflow-visible w-full h-full">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                        </marker>
                    </defs>
                    {connections.map(conn => (
                        <g key={conn.id} className="group/conn pointer-events-none">
                            <path d={getConnectorPath(conn.fromId, 0, 0, conn.toId)} fill="none" stroke="transparent" strokeWidth="20" className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); setConnections(prev => prev.filter(c => c.id !== conn.id)); sync(elements, connections.filter(c => c.id !== conn.id)); }} />
                            <path d={getConnectorPath(conn.fromId, 0, 0, conn.toId)} fill="none" stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrowhead)" className="transition-colors" />
                        </g>
                    ))}
                    {pendingConnFrom && currentMouseCoords && (
                        <path d={getConnectorPath(pendingConnFrom, currentMouseCoords.x, currentMouseCoords.y)} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrowhead)" />
                    )}
                    {elements.filter(el => el.type === 'path').map(el => (
                        <path key={el.id} d={el.path} fill="none" stroke={el.color || '#3b82f6'} strokeWidth={el.strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round" />
                    ))}
                    {currentPath && <path d={currentPath} fill="none" stroke={penColor} strokeWidth={penSize} strokeLinecap="round" strokeLinejoin="round" />}
                </svg>

                {elements.filter(el => el.type !== 'path').map((el) => {
                    const isSelected = selectedIds.includes(el.id);
                    const isHovered = hoveredId === el.id;
                    const IconComp = el.type === 'icon' ? ASSET_ICONS.find(i => i.name === el.iconName)?.icon : null;
                    return (
                        <div key={el.id} style={{ left: el.x, top: el.y, width: el.width, height: el.height, zIndex: isSelected ? 30 : 10 }} className={cn("absolute pointer-events-auto", isSelected && "ring-2 ring-primary ring-offset-2 rounded-xl")}>
                            <div className={cn("w-full h-full p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-lg", el.type === 'note' && "border-t-8 border-t-amber-400 rounded-b-lg", el.type === 'rect' && "border-2 border-slate-900 rounded-xl", el.type === 'circle' && "border-2 border-slate-900 rounded-full", el.type === 'diamond' && "border-2 border-slate-900 rotate-45", (el.type === 'text' || el.type === 'icon') && "bg-transparent border-none p-0 shadow-none")} style={{ backgroundColor: (el.type === 'text' || el.type === 'icon') ? 'transparent' : el.color }}>
                                <div className={cn("w-full h-full flex flex-col justify-center", el.type === 'diamond' && "-rotate-45")}>
                                    {el.type === 'icon' && IconComp ? (
                                        <div className="w-full h-full flex items-center justify-center"><IconComp className="w-[80%] h-[80%]" style={{ color: el.fontColor || '#0f172a' }} /></div>
                                    ) : (
                                        <div className="w-full h-full text-center font-bold overflow-hidden leading-tight flex items-center justify-center whitespace-pre-wrap" style={{ fontSize: `${el.fontSize || 14}px`, color: el.fontColor || '#0f172a', textAlign: el.textAlign || 'center', fontWeight: el.bold ? 'bold' : 'normal' }}>
                                            {el.text}
                                        </div>
                                    )}
                                </div>
                                {isSelected && <div className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize flex items-center justify-center bg-primary rounded-tl-lg rounded-br-lg text-white"><CornerRightUp className="h-2 w-2 rotate-90" /></div>}
                            </div>
                            {(isHovered || isSelected) && !isDragging && <div className="absolute inset-0 pointer-events-none"><Port side="top" id={el.id} /><Port side="right" id={el.id} /><Port side="bottom" id={el.id} /><Port side="left" id={el.id} /></div>}
                        </div>
                    );
                })}

                {marqueeBox && <div className="absolute border-2 border-primary bg-primary/10 rounded-sm pointer-events-none" style={{ left: Math.min(marqueeBox.x1, marqueeBox.x2), top: Math.min(marqueeBox.y1, marqueeBox.y2), width: Math.abs(marqueeBox.x2 - marqueeBox.x1), height: Math.abs(marqueeBox.y2 - marqueeBox.y1) }} />}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-8 right-8 z-50 flex items-center gap-2">
                <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white border border-slate-200 shadow-lg">
                    <button onClick={() => handleZoom(-0.2)} className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-50 transition-all font-black">-</button>
                    <span className="text-[9px] font-black text-slate-900 w-10 text-center uppercase tracking-widest">{Math.round(viewport.scale * 100)}%</span>
                    <button onClick={() => handleZoom(0.2)} className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-50 transition-all font-black">+</button>
                </div>
            </div>
        </div>

        {/* Right Side Panel - Properties Inspector */}
        {selectedElement && (
            <aside className="w-80 border-l bg-white flex flex-col shrink-0 z-50 animate-in slide-in-from-right duration-300">
                <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white shadow-sm text-primary">
                            <Settings className="h-4 w-4" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Properties</h3>
                    </div>
                    <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-slate-900 transition-colors"><X className="h-4 w-4" /></button>
                </div>
                
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-8 pb-32">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Content</Label>
                            <Textarea 
                                value={selectedElement.text}
                                onChange={(e) => updateSelectedElements({ text: e.target.value })}
                                placeholder="Enter text content..."
                                className="min-h-[140px] rounded-2xl bg-slate-50 border-none font-bold text-sm leading-relaxed p-4 shadow-inner resize-none"
                            />
                        </div>

                        <Separator className="bg-slate-50" />

                        <div className="space-y-6">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Typography</Label>
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-3">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Font Size: {selectedElement.fontSize || 14}px</p>
                                    <input type="range" min="8" max="120" value={selectedElement.fontSize || 14} onChange={(e) => updateSelectedElements({ fontSize: parseInt(e.target.value) })} className="w-full" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => updateSelectedElements({ textAlign: 'left' })} className={cn("flex-1 h-9 rounded-xl", selectedElement.textAlign === 'left' && "bg-primary/10 border-primary text-primary")}><AlignLeft className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="sm" onClick={() => updateSelectedElements({ textAlign: 'center' })} className={cn("flex-1 h-9 rounded-xl", (selectedElement.textAlign === 'center' || !selectedElement.textAlign) && "bg-primary/10 border-primary text-primary")}><AlignCenter className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="sm" onClick={() => updateSelectedElements({ textAlign: 'right' })} className={cn("flex-1 h-9 rounded-xl", selectedElement.textAlign === 'right' && "bg-primary/10 border-primary text-primary")}><AlignRight className="h-4 w-4" /></Button>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => updateSelectedElements({ bold: !selectedElement.bold })} className={cn("w-full h-9 rounded-xl font-black uppercase tracking-widest text-[10px]", selectedElement.bold && "bg-primary/10 border-primary text-primary")}>Bold Weight</Button>
                            </div>
                        </div>

                        <Separator className="bg-slate-50" />

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Theme & Style</Label>
                            <div className="grid grid-cols-5 gap-2">
                                {COLORS.map(c => (
                                    <button 
                                        key={c.value} 
                                        onClick={() => updateSelectedElements({ color: c.value })} 
                                        className={cn(
                                            "h-8 w-full rounded-xl border border-slate-100 transition-all",
                                            selectedElement.color === c.value && "ring-2 ring-primary ring-offset-2 z-10"
                                        )} 
                                        style={{ backgroundColor: c.value }} 
                                    />
                                ))}
                            </div>
                        </div>

                        <Separator className="bg-slate-50" />

                        <div className="pt-4 flex flex-col gap-3">
                            <Button variant="outline" onClick={handleDuplicate} className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 border-slate-200 bg-white shadow-sm"><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
                            <Button variant="ghost" onClick={deleteSelected} className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Remove Object</Button>
                        </div>
                    </div>
                </ScrollArea>
                
                <div className="p-6 border-t bg-slate-50/50 flex flex-col items-center gap-3 shrink-0">
                    <Badge variant="outline" className="bg-white border-slate-100 text-slate-400 font-black uppercase text-[8px] tracking-[0.2em] h-5 px-2">ID: {selectedElement.id.split('-').pop()}</Badge>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-none">River Canvas Protocol</p>
                </div>
            </aside>
        )}
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

function DraggableTool({ icon, type, onDragStart }: any) {
    return (
        <div draggable onDragStart={onDragStart} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative">
            {icon}
        </div>
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
        <div data-port-id={id} className={cn("absolute h-6 w-6 bg-white border-2 border-primary rounded-full shadow-lg pointer-events-auto flex items-center justify-center hover:scale-125 transition-transform cursor-crosshair group/port z-40", positions[side])}>
            <PlusCircle className="h-3.5 w-3.5 text-primary opacity-40 group-hover/port:opacity-100 transition-opacity" />
        </div>
    );
}
