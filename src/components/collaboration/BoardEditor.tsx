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
    Type,
    AlignCenter,
    AlignLeft,
    AlignRight,
    Type as TypeIcon,
    CornerDownRight,
    Triangle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Zap,
    Minus,
    MoreHorizontal,
    Activity,
    Slash,
    Hexagon,
    Cloud as CloudIcon,
    FileText,
    Settings2,
    Layers,
    Binary,
    Image as ImageIcon
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
import { fileToEmbeddedImageSrc, isLikelyImageFile } from '@/lib/collab-image';
import type { BoardElement, BoardConnection, BoardSlide } from '@/lib/types';
import { Timestamp, deleteField } from 'firebase/firestore';
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

function ConnectionPopover({ page, onUpdate }: { page: any, onUpdate: (data: Partial<BoardConnection>) => Promise<void> }) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdate = async (updates: Partial<BoardConnection>) => {
        setIsUpdating(true);
        await onUpdate(updates);
        setIsUpdating(false);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Label</Label>
                <Input 
                    value={page.label || ''} 
                    onChange={(e) => handleUpdate({ label: e.target.value })}
                    placeholder="Add label..."
                    className="h-11 rounded-xl bg-slate-50 border-none font-bold text-sm shadow-inner"
                />
            </div>

            <Separator className="bg-slate-50" />

            <div className="space-y-6">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Path</Label>
                <div className="grid grid-cols-5 gap-2">
                    {[
                        { type: 'curved', icon: Repeat, label: 'Curve' },
                        { type: 'straight', icon: Minus, label: 'Line' },
                        { type: 'step', icon: CornerDownRight, label: 'Step' },
                        { type: 'rounded-step', icon: CornerDownRight, label: 'Round' },
                        { type: 'bezier', icon: Slash, label: 'Bez.' }
                    ].map(m => (
                        <button 
                            key={m.type}
                            onClick={() => handleUpdate({ type: m.type as any })}
                            className={cn(
                                "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                                page.type === m.type ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-400 hover:bg-slate-50"
                            )}
                        >
                            <m.icon className={cn("h-4 w-4", m.type === 'bezier' && "rotate-45")} />
                            <span className="text-[7px] font-black uppercase tracking-tighter">{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <Separator className="bg-slate-50" />

            <div className="space-y-6">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Line</Label>
                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Stroke Weight: {page.strokeWidth || 2}px</p>
                        <input type="range" min="1" max="12" value={page.strokeWidth || 2} onChange={(e) => handleUpdate({ strokeWidth: parseInt(e.target.value) })} className="w-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'solid', label: 'Solid', value: '' },
                            { id: 'dashed', label: 'Dashed', value: '8 8' },
                            { id: 'dotted', label: 'Dotted', value: '2 4' }
                        ].map(s => (
                            <Button 
                                key={s.id}
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUpdate({ dashArray: s.value })}
                                className={cn("h-8 rounded-lg text-[8px] font-black uppercase tracking-widest", page.dashArray === s.value ? "bg-primary/10 border-primary text-primary" : "border-slate-100")}
                            >
                                {s.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <Separator className="bg-slate-50" />

            <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Arrow</Label>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { id: 'arrow', label: 'Arrow', icon: ChevronRight },
                        { id: 'circle', label: 'Circle', icon: Circle },
                        { id: 'diamond', label: 'Diamond', icon: Diamond },
                        { id: 'none', label: 'None', icon: Minus }
                    ].map(m => (
                        <button 
                            key={m.id}
                            onClick={() => handleUpdate({ endMarker: m.id as any })}
                            className={cn(
                                "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                                page.endMarker === m.id ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-400 hover:bg-slate-50"
                            )}
                        >
                            <m.icon className="h-3.5 w-3.5" />
                            <span className="text-[7px] font-black uppercase tracking-tighter">{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <Separator className="bg-slate-50" />

            <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Color</Label>
                <div className="grid grid-cols-5 gap-2">
                    {COLORS.map(c => (
                        <button 
                            key={c.value} 
                            onClick={() => handleUpdate({ color: c.value })} 
                            className={cn(
                                "h-7 w-full rounded-full border border-slate-100 transition-all",
                                page.color === c.value && "ring-2 ring-primary ring-offset-1"
                            )} 
                            style={{ backgroundColor: c.value }} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function BoardEditor({ initialData, onContentChange, editable = true }: BoardEditorProps) {
  const isMounted = useMounted();
  const { toast } = useToast();
  
  const initialSlides: BoardSlide[] = initialData?.slides?.length
    ? initialData.slides
    : [{ id: 'slide-1', name: 'Slide 1' }];
  const initialSlideId = initialSlides[0].id;

  const [elements, setElements] = useState<BoardElement[]>(
    (initialData?.elements || []).map((el: BoardElement) => ({ ...el, slideId: el.slideId || initialSlideId }))
  );
  const [connections, setConnections] = useState<BoardConnection[]>(initialData?.connections || []);
  const [slides, setSlides] = useState<BoardSlide[]>(initialSlides);
  const [activeSlideId, setActiveSlideId] = useState(initialSlideId);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const [history, setHistory] = useState<{ elements: BoardElement[], connections: BoardConnection[] }[]>([]);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<BoardElement[]>([]);
  
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [tool, setTool] = useState<'select' | 'hand' | 'arrow' | 'pen'>('select');
  const [arrowType, setArrowType] = useState<BoardConnection['type']>('curved');
  
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
  const currentPathRef = useRef<string | null>(null);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number; type: string }>());
  const pinchRef = useRef<{ dist: number; scale: number; vx: number; vy: number } | null>(null);
  const drawingRef = useRef(false);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const selectedElement = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return elements.find(el => el.id === selectedIds[0]);
  }, [selectedIds, elements]);

  const selectedConnection = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return connections.find(c => c.id === selectedIds[0]);
  }, [selectedIds, connections]);

  const visibleElements = useMemo(
    () => elements.filter(el => (el.slideId || initialSlideId) === activeSlideId),
    [elements, activeSlideId, initialSlideId]
  );

  const activeSlideIndex = Math.max(0, slides.findIndex(s => s.id === activeSlideId));

  const goToSlide = (index: number) => {
    const next = slides[index];
    if (!next) return;
    setActiveSlideId(next.id);
    setSelectedIds([]);
  };

  const deleteSlide = () => {
    if (!editable || slides.length <= 1) return;
    const nextSlides = slides.filter(s => s.id !== activeSlideId);
    const nextElements = elements.filter(el => (el.slideId || initialSlideId) !== activeSlideId);
    slidesRef.current = nextSlides;
    setSlides(nextSlides);
    setActiveSlideId(nextSlides[Math.min(activeSlideIndex, nextSlides.length - 1)].id);
    setElements(nextElements);
    setSelectedIds([]);
    sync(nextElements, connections);
  };

  const sync = useCallback((newElements: BoardElement[], newConnections: BoardConnection[]) => {
      if (!editable) return;
      onContentChange({ elements: newElements, connections: newConnections, slides: slidesRef.current });
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        handleZoom(e.deltaY * -0.01);
      } else {
        setViewport(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };
    const blockGesture = (e: Event) => e.preventDefault();
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('gesturestart', blockGesture as EventListener, { passive: false });
    el.addEventListener('gesturechange', blockGesture as EventListener, { passive: false });
    el.addEventListener('gestureend', blockGesture as EventListener, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('gesturestart', blockGesture as EventListener);
      el.removeEventListener('gesturechange', blockGesture as EventListener);
      el.removeEventListener('gestureend', blockGesture as EventListener);
    };
  }, [isMounted, handleZoom]);

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
          iconName: data?.iconName,
          url: data?.url,
          slideId: activeSlideId,
      };
      setElements(prev => {
          const next = [...prev, newEl];
          setTimeout(() => sync(next, connections), 0);
          return next;
      });
      setSelectedIds([id]);
      return id;
  };

  const placeTool = (type: BoardElement['type']) => {
      const vp = viewportRef.current;
      addElement(type, (180 - vp.x) / vp.scale, (140 - vp.y) / vp.scale);
  };

  const uploadCanvasImage = async (file: File, x?: number, y?: number) => {
      if (!editable) return;
      if (!isLikelyImageFile(file)) {
          toast({ variant: 'destructive', title: 'Wrong format', description: 'Please use an image file.' });
          return;
      }
      try {
          const url = await fileToEmbeddedImageSrc(file);
          addElement('image', x, y, { url, width: 280, height: 180, color: '#ffffff' });
          toast({ title: 'Image added' });
      } catch (error: any) {
          toast({
              variant: 'destructive',
              title: 'Could not add image',
              description: error?.message || 'Try a JPEG or PNG photo.',
          });
      }
  };

  useEffect(() => {
    if (!editable) return;
    const onPaste = (e: ClipboardEvent) => {
      const fromFiles = Array.from(e.clipboardData?.files || []).find(isLikelyImageFile);
      const fromItems = Array.from(e.clipboardData?.items || [])
        .map((item) => (item.type.startsWith('image/') ? item.getAsFile() : null))
        .find((file): file is File => !!file);
      const file = fromFiles || fromItems;
      if (!file) return;
      e.preventDefault();
      uploadCanvasImage(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [editable, uploadCanvasImage]);

  const deleteSelected = useCallback(() => {
      if (!editable || selectedIds.length === 0) return;
      pushHistory();
      
      const newElements = elements.filter(el => !selectedIds.includes(el.id));
      const newConnections = connections.filter(c => !selectedIds.includes(c.id) && !selectedIds.includes(c.fromId) && !selectedIds.includes(c.toId));
      
      setElements(newElements);
      setConnections(newConnections);
      sync(newElements, newConnections);
      setSelectedIds([]);
  }, [editable, selectedIds, sync, pushHistory, elements, connections]);

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
            y: el.y + offset,
            slideId: activeSlideId,
        }));
    
    setElements(prev => {
        const next = [...prev, ...newElements];
        setTimeout(() => sync(next, connections), 0);
        return next;
    });
    setSelectedIds(newElements.map(el => el.id));
  }, [selectedIds, elements, editable, connections, sync, pushHistory]);

  useEffect(() => {
      if (!editable) return;
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
  }, [editable, selectedIds, deleteSelected, handleCopy, handlePaste, undo]);

  const handleMouseDown = (e: React.MouseEvent | React.PointerEvent) => {
      if (!editable) {
          setIsPanning(true);
          lastPointRef.current = { x: e.clientX, y: e.clientY };
          setLastMousePos({ x: e.clientX, y: e.clientY });
          return;
      }
      const { x, y } = getLogicalCoords(e.clientX, e.clientY);
      
      if (tool === 'hand' || e.button === 1) {
          setIsPanning(true);
          lastPointRef.current = { x: e.clientX, y: e.clientY };
          setLastMousePos({ x: e.clientX, y: e.clientY });
          return;
      }

      if (tool === 'pen' && editable) {
          drawingRef.current = true;
          currentPathRef.current = `M ${x} ${y}`;
          setCurrentPath(currentPathRef.current);
          return;
      }

      const target = e.target as HTMLElement;
      const portId = target.closest('[data-port-id]')?.getAttribute('data-port-id');
      if (portId) {
          setPendingConnFrom(portId);
          setCurrentMouseCoords({ x, y });
          return;
      }

      // Check hit for elements
      const hit = [...visibleElements].reverse().find(el => {
          if (el.type === 'path') {
              return false; 
          } 
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

  const handleMouseMove = (e: React.MouseEvent | React.PointerEvent) => {
      const { x, y } = getLogicalCoords(e.clientX, e.clientY);

      if (isPanning) {
          const dx = e.clientX - lastPointRef.current.x;
          const dy = e.clientY - lastPointRef.current.y;
          lastPointRef.current = { x: e.clientX, y: e.clientY };
          setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          setLastMousePos({ x: e.clientX, y: e.clientY });
          return;
      }

      if ((tool === 'pen' || drawingRef.current) && currentPathRef.current && editable) {
          const { x, y } = getLogicalCoords(e.clientX, e.clientY);
          currentPathRef.current = `${currentPathRef.current} L ${x} ${y}`;
          setCurrentPath(currentPathRef.current);
          return;
      }

      if (isSelectingMarquee && marqueeBox) {
          setMarqueeBox({ ...marqueeBox, x2: x, y2: y });
          const xMin = Math.min(marqueeBox.x1, x);
          const xMax = Math.max(marqueeBox.x1, x);
          const yMin = Math.min(marqueeBox.y1, y);
          const yMax = Math.max(marqueeBox.y1, y);
          
          const inBox = visibleElements.map(el => {
              if (el.type === 'path') return null; 
              if (el.x < xMax && el.x + el.width > xMin && el.y < yMax && el.y + el.height > yMin) return el.id;
              return null;
          }).filter(id => id !== null) as string[];

          setSelectedIds(inBox);
          return;
      }

      if (pendingConnFrom) setCurrentMouseCoords({ x, y });

      const hoverHit = [...visibleElements].reverse().find(el => {
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

  const finishStroke = () => {
      const path = currentPathRef.current;
      drawingRef.current = false;
      currentPathRef.current = null;
      setCurrentPath(null);
      if (!path || !editable) return;
      const id = `path-${Date.now()}`;
      const newPathEl: BoardElement = {
          id,
          type: 'path',
          path,
          x: 0, y: 0, text: '', color: penColor, width: 0, height: 0, strokeWidth: penSize,
          slideId: activeSlideId,
      };
      setElements(prev => {
          const next = [...prev, newPathEl];
          setTimeout(() => sync(next, connections), 0);
          return next;
      });
  };

  const handleMouseUp = (e: React.MouseEvent | React.PointerEvent) => {
      if (drawingRef.current || (tool === 'pen' && currentPathRef.current)) {
          finishStroke();
          return;
      }

      if (pendingConnFrom) {
          if (!editable) {
              setPendingConnFrom(null);
              setCurrentMouseCoords(null);
              return;
          }
          const { x, y } = getLogicalCoords(e.clientX, e.clientY);
          const targetHit = visibleElements.find(el => {
              if (el.type === 'path') return false;
              return (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height);
          });
          if (targetHit && targetHit.id !== pendingConnFrom) {
              pushHistory();
              const newConn: BoardConnection = { 
                id: `conn-${Date.now()}`, 
                fromId: pendingConnFrom, 
                toId: targetHit.id, 
                type: arrowType,
                strokeWidth: 2,
                endMarker: 'arrow'
              };
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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('[data-canvas-chrome]')) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
      try {
          e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
          /* ignore */
      }

      const hasPen = [...pointersRef.current.values()].some((p) => p.type === 'pen');
      if (e.pointerType === 'touch' && (drawingRef.current || hasPen)) {
          return;
      }

      if (e.pointerType === 'touch' && pointersRef.current.size >= 2) {
          const pts = [...pointersRef.current.values()];
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          pinchRef.current = {
              dist: Math.max(dist, 1),
              scale: viewportRef.current.scale,
              vx: viewportRef.current.x,
              vy: viewportRef.current.y,
          };
          setIsPanning(false);
          setIsDragging(false);
          setIsSelectingMarquee(false);
          setMarqueeBox(null);
          return;
      }

      if (e.pointerType === 'pen' || (e.pointerType !== 'touch' && tool === 'pen')) {
          e.preventDefault();
          drawingRef.current = true;
          const { x, y } = getLogicalCoords(e.clientX, e.clientY);
          currentPathRef.current = `M ${x} ${y}`;
          setCurrentPath(currentPathRef.current);
          return;
      }

      if (e.pointerType === 'touch' && tool !== 'arrow' && tool !== 'pen') {
          e.preventDefault();
          const { x, y } = getLogicalCoords(e.clientX, e.clientY);
          const hit = [...visibleElements].reverse().find((el) => {
              if (el.type === 'path') return false;
              return x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height;
          });
          if (hit && tool === 'select' && editable) {
              handleMouseDown(e);
              return;
          }
          setIsPanning(true);
          lastPointRef.current = { x: e.clientX, y: e.clientY };
          return;
      }

      handleMouseDown(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (pointersRef.current.has(e.pointerId)) {
          pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
      }

      if (e.pointerType === 'touch' && drawingRef.current) return;

      if (pointersRef.current.size >= 2) {
          const pts = [...pointersRef.current.values()].slice(0, 2);
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          const pinch = pinchRef.current;
          if (pinch && pinch.dist > 0) {
              const nextScale = Math.min(5, Math.max(0.1, pinch.scale * (dist / pinch.dist)));
              setViewport({ x: pinch.vx, y: pinch.vy, scale: nextScale });
          }
          return;
      }

      if (drawingRef.current && currentPathRef.current) {
          const native = e.nativeEvent;
          const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [native];
          events.forEach((ev) => {
              const { x, y } = getLogicalCoords(ev.clientX, ev.clientY);
              currentPathRef.current = `${currentPathRef.current} L ${x} ${y}`;
          });
          setCurrentPath(currentPathRef.current);
          return;
      }

      handleMouseMove(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) pinchRef.current = null;
      try {
          e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
          /* ignore */
      }
      if (drawingRef.current) {
          finishStroke();
          return;
      }
      handleMouseUp(e);
  };

  const updateSelectedElements = (data: Partial<BoardElement>) => {
      if (selectedIds.length === 0 || !editable) return;
      pushHistory();
      
      const nextElements = elements.map(el => {
          if (selectedIds.includes(el.id)) {
              const updates: any = { ...data };
              if (data.color && (el.type === 'icon' || el.type === 'text' || el.type === 'path')) {
                  updates.fontColor = data.color;
                  if (el.type === 'path') updates.color = data.color;
              }
              return { ...el, ...updates };
          }
          return el;
      });

      setElements(nextElements);
      sync(nextElements, connections);
  };

  const updateSelectedConnection = async (data: Partial<BoardConnection>) => {
    if (selectedIds.length === 0 || !editable) return;
    pushHistory();
    
    const nextConnections = connections.map(conn => {
        if (selectedIds.includes(conn.id)) {
            return { ...conn, ...data };
        }
        return conn;
    });

    setConnections(nextConnections);
    sync(elements, nextConnections);
  };

  const getConnectorPath = (fromId: string, toX: number, toY: number, toId?: string, type: BoardConnection['type'] = 'curved') => {
      const from = elements.find(e => e.id === fromId);
      if (!from) return '';
      const x1 = from.x + from.width / 2;
      const y1 = from.y + from.height / 2;
      let x2 = toX, y2 = toY;
      if (toId) {
          const to = elements.find(e => e.id === toId);
          if (to) { x2 = to.x + to.width / 2; y2 = to.y + to.height / 2; }
      }

      if (type === 'straight') {
          return `M ${x1} ${y1} L ${x2} ${y2}`;
      }

      if (type === 'step') {
          const midX = x1 + (x2 - x1) / 2;
          return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
      }

      if (type === 'rounded-step') {
        const midX = x1 + (x2 - x1) / 2;
        const radius = 12;
        const dirY = y2 > y1 ? 1 : -1;
        const dirX = x2 > x1 ? 1 : -1;
        return `M ${x1} ${y1} L ${midX - radius * dirX} ${y1} Q ${midX} ${y1}, ${midX} ${y1 + radius * dirY} L ${midX} ${y2 - radius * dirY} Q ${midX} ${y2}, ${midX + radius * dirX} ${y2} L ${x2} ${y2}`;
      }

      if (type === 'bezier') {
        const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2) / 2;
        return `M ${x1} ${y1} C ${x1 + dist} ${y1}, ${x2 - dist} ${y2}, ${x2} ${y2}`;
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
    <div className="flex-1 flex bg-[#f7f6f3] overflow-hidden relative select-none h-full min-h-0 font-sans">
        {editable && (
        <aside className="w-12 border-r border-slate-200/80 bg-white flex flex-col items-center py-3 gap-2 z-50 shrink-0">
            <div className="flex flex-col gap-1.5">
                <DraggableTool icon={<TypeIcon className="h-4 w-4 text-slate-800" />} type="text" label="Text" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'text')} />
                <DraggableTool icon={<StickyNote className="h-4 w-4 text-amber-500" />} type="note" label="Sticky note" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'note')} />
                <DraggableTool icon={<Square className="h-4 w-4 text-blue-500" />} type="rect" label="Rectangle" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'rect')} />
                <DraggableTool icon={<Circle className="h-4 w-4 text-green-500" />} type="circle" label="Circle" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'circle')} />
                <label
                    title="Image"
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 cursor-pointer"
                >
                    <ImageIcon className="h-4 w-4" />
                    <span className="sr-only">Add image</span>
                    <input
                        type="file"
                        accept="image/*,.heic,.heif,.jpeg,.jpg,.png,.webp,.gif"
                        className="sr-only"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadCanvasImage(file);
                            e.target.value = '';
                        }}
                    />
                </label>
                
                <Popover onOpenChange={() => setAssetSearch('')}>
                    <PopoverTrigger asChild>
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm text-primary">
                            <Plus className="h-5 w-5" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="w-80 p-0 rounded-2xl shadow-3xl border-slate-100 bg-white ml-2 overflow-hidden z-50">
                        <div className="p-4 bg-slate-50 border-b">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">More</p>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <Input placeholder="Search..." className="pl-8 h-9 text-xs rounded-xl bg-white border-none shadow-inner" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} />
                            </div>
                        </div>
                        <ScrollArea className="h-[480px]">
                            <div className="p-4 space-y-6">
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Shapes</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        <DraggableTool variant="mini" icon={<Triangle className="h-4 w-4" />} type="triangle" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'triangle')} />
                                        <DraggableTool variant="mini" icon={<LayoutTemplate className="h-4 w-4" />} type="parallelogram" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'parallelogram')} />
                                        <DraggableTool variant="mini" icon={<Database className="h-4 w-4" />} type="cylinder" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'cylinder')} />
                                        <DraggableTool variant="mini" icon={<PlusCircle className="h-4 w-4" />} type="capsule" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'capsule')} />
                                        <DraggableTool variant="mini" icon={<Hexagon className="h-4 w-4" />} type="hexagon" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'hexagon')} />
                                        <DraggableTool variant="mini" icon={<CloudIcon className="h-4 w-4" />} type="cloud" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'cloud')} />
                                        <DraggableTool variant="mini" icon={<FileText className="h-4 w-4" />} type="document" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'document')} />
                                        <DraggableTool variant="mini" icon={<Settings2 className="h-4 w-4" />} type="predefined" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'predefined')} />
                                        <DraggableTool variant="mini" icon={<Binary className="h-4 w-4" />} type="manual-input" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'manual-input')} />
                                        <DraggableTool variant="mini" icon={<Star className="h-4 w-4" />} type="star" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'star')} />
                                        <DraggableTool variant="mini" icon={<AlertTriangle className="h-4 w-4" />} type="octagon" onTap={placeTool} onDragStart={(e: any) => e.dataTransfer.setData('elType', 'octagon')} />
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
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Emojis</p>
                                    <div className="grid grid-cols-6 gap-2">
                                        {filteredAssets.emojis.map(emoji => (
                                            <div key={emoji} draggable onDragStart={(e) => { e.dataTransfer.setData('elType', 'text'); e.dataTransfer.setData('elText', emoji); e.dataTransfer.setData('elFontSize', '48'); }} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-2xl cursor-grab transition-colors">{emoji}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </PopoverContent>
                </Popover>
            </div>
            
            <Separator className="w-8" />
            <div className="flex flex-col gap-1">
                <ToolbarItem icon={<MousePointer2 className="h-4 w-4" />} active={tool === 'select'} onClick={() => setTool('select')} title="Select" />
                <ToolbarItem icon={<Pencil className="h-4 w-4" />} active={tool === 'pen'} onClick={() => setTool('pen')} title="Draw" />
                <ToolbarItem icon={<Grab className="h-4 w-4" />} active={tool === 'hand'} onClick={() => setTool('hand')} title="Pan" />
                <ToolbarItem icon={<LinkIcon className="h-4 w-4" />} active={tool === 'arrow'} onClick={() => setTool('arrow')} title="Connect" />
            </div>
        </aside>
        )}

        <div className={cn("flex-1 relative overflow-hidden overscroll-none", !editable && "cursor-grab active:cursor-grabbing")} 
             onPointerDown={handlePointerDown}
             onPointerMove={handlePointerMove} 
             onPointerUp={handlePointerUp}
             onPointerCancel={handlePointerUp}
             onDragOver={(e) => editable && e.preventDefault()}
             onDrop={(e) => {
                if (!editable) return;
                e.preventDefault();
                const file = Array.from(e.dataTransfer.files || []).find(isLikelyImageFile);
                if (file) {
                    const { x, y } = getLogicalCoords(e.clientX, e.clientY);
                    uploadCanvasImage(file, x - 140, y - 90);
                    return;
                }
                const type = e.dataTransfer.getData('elType') as BoardElement['type'];
                const text = e.dataTransfer.getData('elText');
                const fontSize = e.dataTransfer.getData('elFontSize');
                const iconName = e.dataTransfer.getData('iconName');
                if (type) {
                    const { x, y } = getLogicalCoords(e.clientX, e.clientY);
                    addElement(type, x - 75, y - (type === 'text' ? 20 : 75), { text: text || undefined, fontSize: fontSize ? parseInt(fontSize) : undefined, iconName: iconName || undefined, width: type === 'icon' ? 100 : undefined, height: type === 'icon' ? 100 : undefined });
                }
             }}
             style={{
                touchAction: 'none',
                backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
                backgroundSize: `${24 * viewport.scale}px ${24 * viewport.scale}px`,
                backgroundPosition: `${viewport.x}px ${viewport.y}px`
             }}
             ref={containerRef}>
            
            <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, transformOrigin: '0 0' }} className="absolute inset-0 pointer-events-none">
                <svg className="absolute inset-0 overflow-visible w-full h-full">
                    <defs>
                        <marker id="marker-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                        </marker>
                        <marker id="marker-circle" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                            <circle cx="4" cy="4" r="3" fill="currentColor" />
                        </marker>
                        <marker id="marker-diamond" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                            <rect x="0" y="0" width="7" height="7" transform="rotate(45 5 5)" fill="currentColor" />
                        </marker>
                        
                        <filter id="selection-glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {connections.filter(conn => {
                        const from = elements.find(e => e.id === conn.fromId);
                        const to = elements.find(e => e.id === conn.toId);
                        const sid = activeSlideId;
                        return (from?.slideId || initialSlideId) === sid && (to?.slideId || initialSlideId) === sid;
                    }).map(conn => {
                        const isSelected = selectedIds.includes(conn.id);
                        const path = getConnectorPath(conn.fromId, 0, 0, conn.toId, conn.type);
                        const strokeColor = conn.color || '#cbd5e1';
                        
                        return (
                            <g key={conn.id} className="group/conn pointer-events-none">
                                <path 
                                    d={path} 
                                    fill="none" 
                                    stroke="transparent" 
                                    strokeWidth="12" 
                                    className={cn(editable ? "pointer-events-auto cursor-pointer" : "pointer-events-none")} 
                                    onClick={(e) => { 
                                        if (!editable) return;
                                        e.stopPropagation(); 
                                        setSelectedIds([conn.id]);
                                    }} 
                                />
                                {isSelected && (
                                    <path 
                                        d={path} 
                                        fill="none" 
                                        stroke="hsl(var(--primary))" 
                                        strokeWidth={6} 
                                        strokeOpacity="0.2"
                                        filter="url(#selection-glow)"
                                    />
                                )}
                                <path 
                                    d={path} 
                                    fill="none" 
                                    stroke={isSelected ? 'hsl(var(--primary))' : strokeColor} 
                                    strokeWidth={conn.strokeWidth || 2} 
                                    strokeDasharray={conn.dashArray || ""}
                                    markerEnd={conn.endMarker && conn.endMarker !== 'none' ? `url(#marker-${conn.endMarker})` : "url(#marker-arrow)"}
                                    className="transition-colors duration-300"
                                    style={{ color: isSelected ? 'hsl(var(--primary))' : strokeColor }}
                                />
                            </g>
                        );
                    })}

                    {pendingConnFrom && currentMouseCoords && (
                        <path d={getConnectorPath(pendingConnFrom, currentMouseCoords.x, currentMouseCoords.y, undefined, arrowType)} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#marker-arrow)" style={{ color: 'hsl(var(--primary))' }} />
                    )}
                    {visibleElements.filter(el => el.type === 'path').map(el => {
                        const isSelected = selectedIds.includes(el.id);
                        return (
                            <g key={el.id} className={cn(editable ? "pointer-events-auto group/drawing cursor-pointer" : "pointer-events-none")} onClick={(e) => { if (!editable) return; e.stopPropagation(); setSelectedIds([el.id]); }}>
                                <path d={el.path} fill="none" stroke="transparent" strokeWidth={Math.max(10, (el.strokeWidth || 4) * 2)} />
                                <path d={el.path} fill="none" stroke={isSelected ? 'hsl(var(--primary))' : (el.color || '#3b82f6')} strokeWidth={el.strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round" />
                                {isSelected && <path d={el.path} fill="none" stroke="hsl(var(--primary))" strokeWidth={el.strokeWidth ? el.strokeWidth + 4 : 8} strokeOpacity="0.1" />}
                            </g>
                        );
                    })}
                    {currentPath && <path d={currentPath} fill="none" stroke={penColor} strokeWidth={penSize} strokeLinecap="round" strokeLinejoin="round" />}
                </svg>

                {visibleElements.filter(el => el.type !== 'path').map((el) => {
                    const isSelected = selectedIds.includes(el.id);
                    const isHovered = hoveredId === el.id;
                    const IconComp = el.type === 'icon' ? ASSET_ICONS.find(i => i.name === el.iconName)?.icon : null;
                    
                    const isCustomClipped = ['triangle', 'hexagon', 'octagon', 'star', 'document', 'manual-input', 'parallelogram', 'predefined'].includes(el.type);

                    const getClipPath = (type: string) => {
                        switch (type) {
                            case 'triangle': return 'polygon(50% 0%, 0% 100%, 100% 100%)';
                            case 'hexagon': return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
                            case 'octagon': return 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
                            case 'cloud': return 'path("M 25,60 a 20,20 1 0,0 0,40 h 50 a 20,20 1 0,0 0,-40 a 10,10 1 0,0 -15,-10 a 15,15 1 0,0 -35,10 z")';
                            case 'star': return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
                            case 'document': return 'polygon(0% 0%, 100% 0%, 100% 85%, 85% 95%, 65% 85%, 50% 95%, 35% 85%, 15% 95%, 0% 85%)';
                            case 'manual-input': return 'polygon(0% 20%, 100% 0%, 100% 100%, 0% 100%)';
                            case 'parallelogram': return 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)';
                            default: return undefined;
                        }
                    };

                    const clipPath = getClipPath(el.type);

                    return (
                        <div key={el.id} style={{ left: el.x, top: el.y, width: el.width, height: el.height, zIndex: isSelected ? 30 : 10 }} className={cn("absolute", editable ? "pointer-events-auto" : "pointer-events-none", isSelected && editable && "ring-2 ring-primary ring-offset-2 rounded-xl")}>
                            <div className={cn(
                                "w-full h-full flex flex-col items-center justify-center relative overflow-hidden transition-shadow", 
                                el.type === 'note' && "border-t-8 border-t-amber-400 rounded-b-lg border-2 border-slate-900 shadow-lg", 
                                el.type === 'rect' && "border-2 border-slate-900 rounded-xl shadow-lg", 
                                el.type === 'circle' && "border-2 border-slate-900 rounded-full shadow-lg", 
                                el.type === 'diamond' && "border-2 border-slate-900 rotate-45 shadow-lg",
                                el.type === 'cylinder' && "border-2 border-slate-900 rounded-t-[100%] rounded-b-[100%] shadow-lg",
                                el.type === 'capsule' && "border-2 border-slate-900 rounded-full shadow-lg",
                                el.type === 'predefined' && "border-y-2 border-slate-900 relative shadow-lg",
                                isCustomClipped && "bg-transparent border-none p-0 shadow-none",
                                (el.type === 'text' || el.type === 'icon' || el.type === 'image') && "bg-transparent border-none p-0 shadow-none"
                            )} style={{ 
                                backgroundColor: (el.type === 'text' || el.type === 'icon' || el.type === 'image' || isCustomClipped || el.type === 'cloud') ? 'transparent' : el.color,
                            }}>
                                {el.type === 'image' && el.url && (
                                    <img src={el.url} alt="" className="w-full h-full object-contain pointer-events-none select-none" />
                                )}
                                {isCustomClipped && (
                                    <>
                                        <div className="absolute inset-0 bg-slate-900" style={{ clipPath }} />
                                        <div className="absolute inset-[2px] border-none" style={{ backgroundColor: el.color, clipPath }} />
                                    </>
                                )}
                                {el.type === 'predefined' && (
                                    <>
                                        <div className="absolute inset-0" style={{ backgroundColor: el.color }} />
                                        <div className="absolute inset-y-0 left-3 w-0.5 bg-slate-900" />
                                        <div className="absolute inset-y-0 right-3 w-0.5 bg-slate-900" />
                                        <div className="absolute inset-0 border-x-2 border-slate-900" />
                                    </>
                                )}
                                {el.type === 'cloud' && (
                                    <>
                                        <div className="absolute inset-0 bg-slate-900" style={{ clipPath }} />
                                        <div className="absolute inset-[2px] bg-blue-50" style={{ backgroundColor: el.color, clipPath }} />
                                    </>
                                )}
                                
                                <div className={cn(
                                    "w-full h-full flex flex-col justify-center relative z-10", 
                                    el.type === 'diamond' && "-rotate-45",
                                )}>
                                    {el.type === 'icon' && IconComp ? (
                                        <div className="w-full h-full flex items-center justify-center"><IconComp className="w-[80%] h-[80%]" style={{ color: el.fontColor || '#0f172a' }} /></div>
                                    ) : el.type === 'image' ? null : (
                                        <div className="w-full h-full text-center font-bold overflow-hidden leading-tight flex items-center justify-center whitespace-pre-wrap p-3" style={{ fontSize: `${el.fontSize || 14}px`, color: el.fontColor || '#0f172a', textAlign: el.textAlign || 'center', fontWeight: el.bold ? 'bold' : 'normal' }}>
                                            {el.text}
                                        </div>
                                    )}
                                </div>
                                {isSelected && editable && <div className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize flex items-center justify-center bg-primary rounded-tl-lg rounded-br-lg text-white z-20"><CornerRightUp className="h-2 w-2 rotate-90" /></div>}
                            </div>
                            {(isHovered || isSelected) && !isDragging && editable && <div className="absolute inset-0 pointer-events-none"><Port side="top" id={el.id} /><Port side="right" id={el.id} /><Port side="bottom" id={el.id} /><Port side="left" id={el.id} /></div>}
                        </div>
                    );
                })}

                {marqueeBox && <div className="absolute border-2 border-primary bg-primary/10 rounded-sm pointer-events-none" style={{ left: Math.min(marqueeBox.x1, marqueeBox.x2), top: Math.min(marqueeBox.y1, marqueeBox.y2), width: Math.abs(marqueeBox.x2 - marqueeBox.x1), height: Math.abs(marqueeBox.y2 - marqueeBox.y1) }} />}
            </div>

            <div data-canvas-chrome="true" className="absolute bottom-4 right-4 z-50 flex items-center gap-2 pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-0.5 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur-md">
                    <button
                        type="button"
                        aria-label="Previous slide"
                        title="Previous slide"
                        disabled={activeSlideIndex <= 0}
                        onClick={() => goToSlide(activeSlideIndex - 1)}
                        className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-[4.5rem] px-1 text-center text-[10px] font-bold text-slate-600 tabular-nums">
                        {activeSlideIndex + 1} / {slides.length}
                    </span>
                    <button
                        type="button"
                        aria-label="Next slide"
                        title="Next slide"
                        disabled={activeSlideIndex >= slides.length - 1}
                        onClick={() => goToSlide(activeSlideIndex + 1)}
                        className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    {editable && slides.length > 1 && (
                        <>
                            <div className="w-px h-5 bg-slate-200 mx-1" />
                            <button
                                type="button"
                                aria-label="Delete slide"
                                title="Delete slide"
                                onClick={deleteSlide}
                                className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </>
                    )}
                    <div className="w-px h-5 bg-slate-200 mx-1" />
                    <button type="button" onClick={() => handleZoom(-0.2)} className="h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50" aria-label="Zoom out">−</button>
                    <span className="min-w-[2.5rem] text-center text-[10px] font-bold text-slate-600 tabular-nums">{Math.round(viewport.scale * 100)}%</span>
                    <button type="button" onClick={() => handleZoom(0.2)} className="h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50" aria-label="Zoom in">+</button>
                </div>
            </div>

            {editable && visibleElements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <p className="text-[13px] text-slate-400 bg-white/80 rounded-full px-3 py-1.5 border border-slate-200/80">
                        Drag shapes from the left, add an image, or draw with Apple Pencil
                    </p>
                </div>
            )}
        </div>

        {editable && (selectedElement || selectedConnection) && (
            <aside className="w-80 border-l bg-white flex flex-col shrink-0 z-50">
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
                        {selectedElement && (
                            <>
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
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Appearance</Label>
                                    <div className="grid grid-cols-1 gap-6">
                                        {selectedElement.type === 'path' && (
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Stroke Size: {selectedElement.strokeWidth || 4}px</p>
                                                <input type="range" min="1" max="20" value={selectedElement.strokeWidth || 4} onChange={(e) => updateSelectedElements({ strokeWidth: parseInt(e.target.value) })} className="w-full" />
                                            </div>
                                        )}
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Font Size: {selectedElement.fontSize || 14}px</p>
                                            <input type="range" min="8" max="120" value={selectedElement.fontSize || 14} onChange={(e) => updateSelectedElements({ fontSize: parseInt(e.target.value) })} className="w-full" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => updateSelectedElements({ textAlign: 'left' })} className={cn("flex-1 h-9 rounded-xl", selectedElement.textAlign === 'left' && "bg-primary/10 border-primary text-primary")}><AlignLeft className="h-4 w-4" /></Button>
                                            <Button variant="outline" size="sm" onClick={() => updateSelectedElements({ textAlign: 'center' })} className={cn("flex-1 h-9 rounded-xl", (selectedElement.textAlign === 'center' || !selectedElement.textAlign) && "bg-primary/10 border-primary text-primary")}><AlignCenter className="h-4 w-4" /></Button>
                                            <Button variant="outline" size="sm" onClick={() => updateSelectedElements({ textAlign: 'right' })} className={cn("flex-1 h-9 rounded-xl", selectedElement.textAlign === 'right' && "bg-primary/10 border-primary text-primary")}><AlignRight className="h-4 w-4" /></Button>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => updateSelectedElements({ bold: !selectedElement.bold })} className={cn("w-full h-9 rounded-xl font-black uppercase tracking-widest text-[10px]", selectedElement.bold && "bg-primary/10 border-primary text-primary")}>Bold</Button>
                                    </div>
                                </div>

                                <Separator className="bg-slate-50" />

                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Style</Label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {COLORS.map(c => (
                                            <button 
                                                key={c.value} 
                                                onClick={() => updateSelectedElements({ color: c.value })} 
                                                className={cn(
                                                    "h-8 w-full rounded-xl border border-slate-100 transition-all",
                                                    (selectedElement.color === c.value || selectedElement.fontColor === c.value) && "ring-2 ring-primary ring-offset-2 z-10"
                                                )} 
                                                style={{ backgroundColor: c.value }} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {selectedConnection && (
                            <ConnectionPopover 
                                page={selectedConnection} 
                                onUpdate={async (data) => updateSelectedConnection(data)} 
                            />
                        )}

                        <div className="pt-4 flex flex-col gap-3">
                            {selectedElement && <Button variant="outline" onClick={handleDuplicate} className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 border-slate-200 bg-white shadow-sm"><Copy className="h-3.5 w-3.5" /> Duplicate</Button>}
                            <Button variant="ghost" onClick={deleteSelected} className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete {selectedConnection ? 'line' : 'item'}</Button>
                        </div>
                    </div>
                </ScrollArea>
            </aside>
        )}
    </div>
  );
}

function ToolbarItem({ icon, active = false, onClick, title }: any) {
    return (
        <button title={title} onClick={onClick} className={cn("h-9 w-9 flex items-center justify-center rounded-lg transition-all", active ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700")}>
            {icon}
        </button>
    );
}

function DraggableTool({ icon, type, onDragStart, variant = 'default', label, onTap }: any) {
    return (
        <div
            draggable
            onDragStart={onDragStart}
            onClick={() => onTap?.(type)}
            title={label || type}
            className={cn(
            "flex items-center justify-center rounded-lg bg-white border border-slate-200 cursor-grab active:cursor-grabbing hover:bg-slate-50 hover:border-slate-300 transition-all",
            variant === 'default' ? "w-9 h-9" : "w-11 h-11"
        )}>
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
