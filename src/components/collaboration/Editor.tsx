'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { mergeAttributes } from '@tiptap/core';
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, Node, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
    Bold, 
    Italic, 
    List, 
    CheckSquare,
    ChevronDown,
    ChevronRight,
    Link as LinkIcon,
    Loader2,
    Sparkles,
    Check,
    X,
    Wand2,
    Languages,
    Type,
    ArrowRight,
    Palette,
    Send,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Plus,
    Trash2,
    Underline as UnderlineIcon,
    Maximize2,
    Layout,
    Image as ImageIcon,
    Maximize,
    Table2,
    FileText,
    Search,
    FileX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { fileToEmbeddedImageSrc } from '@/lib/collab-image';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogClose 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useMounted } from '@/hooks/use-mounted';
import { BoardEditor } from './BoardEditor';
import { query, collection, where } from 'firebase/firestore';
import type { CollabPage } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

const Title = Node.create({
  name: 'title',
  group: 'block',
  content: 'inline*',
  defining: true,
  parseHTML() {
    return [{ tag: 'p.docs-style-title' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { class: 'docs-style-title' }), 0];
  },
});

const Subtitle = Node.create({
  name: 'subtitle',
  group: 'block',
  content: 'inline*',
  defining: true,
  parseHTML() {
    return [{ tag: 'p.docs-style-subtitle' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { class: 'docs-style-subtitle' }), 0];
  },
});

// --- Custom Interactive Blocks ---

const PageLinkBlock = ({ node, deleteNode }: any) => {
    const router = useRouter();
    const { targetPageId, title, icon, type } = node.attrs;

    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/workspace/${targetPageId}`);
    };

    return (
        <NodeViewWrapper className="my-2 relative">
            <div 
                onClick={handleNavigate}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 bg-white group/item cursor-pointer shadow-sm"
            >
                <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-slate-50 rounded-lg shadow-inner">
                    {icon ? (
                        <span className="text-sm select-none">{icon}</span>
                    ) : (
                        type === 'board' ? <Layout className="h-4 w-4 text-purple-600" /> :
                        <FileText className="h-4 w-4 text-blue-500" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-slate-700 truncate block underline-offset-4 decoration-slate-300">
                        {title || 'Untitled'}
                    </span>
                    <p className="text-[10px] font-semibold text-slate-400 leading-none mt-1">Linked page</p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50"
                        onClick={(e) => { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            deleteNode(); 
                        }}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </NodeViewWrapper>
    );
};

const PageLinkExtension = Node.create({
    name: 'pageLink',
    group: 'block',
    atom: true,
    addAttributes() {
        return {
            targetPageId: { default: '' },
            title: { default: '' },
            icon: { default: '' },
            type: { default: 'doc' }
        };
    },
    parseHTML() { return [{ tag: 'div[data-type="page-link"]' }]; },
    renderHTML({ HTMLAttributes }) { return ['div', { 'data-type': 'page-link', ...HTMLAttributes }]; },
    addNodeView() { return ReactNodeViewRenderer(PageLinkBlock); },
});

const CanvasBlock = ({ node, updateAttributes, deleteNode, editor }: any) => {
    const [isFullSize, setIsFullSize] = useState(false);
    const canEdit = editor?.isEditable === true;

    return (
        <NodeViewWrapper
            className="my-6 relative rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm"
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
            contentEditable={false}
        >
            <div className="h-10 px-3 border-b border-slate-200 bg-[#f7f6f3] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                    <Layout className="h-3.5 w-3.5 text-slate-500" />
                    Canvas
                </div>
                <div className="flex items-center gap-0.5">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-md text-slate-500 hover:bg-white"
                        onClick={() => setIsFullSize(true)}
                        title="Full screen"
                    >
                        <Maximize className="h-3.5 w-3.5" />
                    </Button>
                    {canEdit && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-white"
                            onClick={() => deleteNode()}
                            title="Remove canvas"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>
            <div className="h-[480px]">
                <BoardEditor 
                    initialData={node.attrs.data} 
                    onContentChange={canEdit ? (data: any) => updateAttributes({ data }) : () => {}}
                    editable={canEdit}
                />
            </div>

            <Dialog open={isFullSize} onOpenChange={setIsFullSize}>
                <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] p-0 overflow-hidden border border-slate-200 shadow-2xl rounded-2xl bg-white flex flex-col gap-0">
                    <div className="h-11 border-b px-4 flex items-center justify-between shrink-0 bg-[#f7f6f3]">
                        <div className="flex items-center gap-2">
                            <Layout className="h-4 w-4 text-slate-500" />
                            <h4 className="text-[13px] font-medium text-slate-800">Canvas</h4>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden min-h-0">
                        <BoardEditor 
                            initialData={node.attrs.data} 
                            onContentChange={canEdit ? (data: any) => updateAttributes({ data }) : () => {}}
                            editable={canEdit}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </NodeViewWrapper>
    );
};

const CanvasExtension = Node.create({
    name: 'canvas',
    group: 'block',
    atom: true,
    addAttributes() {
        return {
            data: { default: { elements: [], connections: [] } }
        };
    },
    parseHTML() { return [{ tag: 'div[data-type="canvas"]' }]; },
    renderHTML({ HTMLAttributes }) { return ['div', { 'data-type': 'canvas', ...HTMLAttributes }]; },
    addNodeView() { return ReactNodeViewRenderer(CanvasBlock); },
});

// --- Multi-Column Layout Extensions ---

const MIN_COLUMN_WIDTH = 16;

const ColumnView = ({ node, editor, getPos }: any) => {
    const width = node.attrs.width as number | null;
    const canEdit = editor?.isEditable === true;
    const [isDragging, setIsDragging] = useState(false);
    const handleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof getPos !== 'function') return;
        const pos = getPos();
        if (typeof pos !== 'number') return;
        const dom = editor.view.nodeDOM(pos);
        if (!(dom instanceof HTMLElement)) return;
        if (typeof width === 'number') {
            dom.style.flex = `0 0 ${width}%`;
            dom.style.maxWidth = `${width}%`;
            dom.style.width = `${width}%`;
        } else {
            dom.style.flex = '1 1 0';
            dom.style.maxWidth = '';
            dom.style.width = '';
        }
    }, [width, editor, getPos]);

    useEffect(() => {
        const handle = handleRef.current;
        if (!handle || !canEdit) return;
        const onPointerDown = (event: PointerEvent) => {
            (onResizePointerDown as (event: { preventDefault: () => void; stopPropagation: () => void; currentTarget: EventTarget | null; clientX: number }) => void)(event as any);
        };
        handle.addEventListener('pointerdown', onPointerDown, true);
        return () => handle.removeEventListener('pointerdown', onPointerDown, true);
    }, [canEdit, editor, getPos, node.attrs.width]);

    const isLastColumn = () => {
        if (typeof getPos !== 'function') return true;
        const pos = getPos();
        if (typeof pos !== 'number') return true;
        const $pos = editor.state.doc.resolve(pos);
        return $pos.index() === $pos.parent.childCount - 1;
    };

    const onResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!canEdit || typeof getPos !== 'function') return;
        event.preventDefault();
        event.stopPropagation();

        const pos = getPos();
        if (typeof pos !== 'number') return;

        const $pos = editor.state.doc.resolve(pos);
        const parent = $pos.parent;
        const index = $pos.index();
        if (index >= parent.childCount - 1) return;

        const groupEl = ((event.currentTarget as HTMLElement | null)?.closest?.('.tiptap-column-group') || handleRef.current?.closest('.tiptap-column-group')) as HTMLElement | null;
        const groupWidth = groupEl?.getBoundingClientRect().width || 1;
        const count = parent.childCount;
        const fallback = Math.round((100 / count) * 10) / 10;
        const startLeft = typeof parent.child(index).attrs.width === 'number' ? parent.child(index).attrs.width : fallback;
        const startRight = typeof parent.child(index + 1).attrs.width === 'number' ? parent.child(index + 1).attrs.width : fallback;
        const leftPos = pos;
        const rightPos = pos + parent.child(index).nodeSize;
        const startX = event.clientX;

        const applyWidths = (left: number, right: number, addToHistory: boolean) => {
            const tr = editor.state.tr;
            tr.setNodeMarkup(leftPos, undefined, { ...editor.state.doc.nodeAt(leftPos)?.attrs, width: left });
            tr.setNodeMarkup(rightPos, undefined, { ...editor.state.doc.nodeAt(rightPos)?.attrs, width: right });
            tr.setMeta('addToHistory', addToHistory);
            editor.view.dispatch(tr);
        };

        applyWidths(startLeft, startRight, false);
        setIsDragging(true);

        const onMove = (moveEvent: PointerEvent) => {
            const delta = ((moveEvent.clientX - startX) / groupWidth) * 100;
            let left = startLeft + delta;
            let right = startRight - delta;
            if (left < MIN_COLUMN_WIDTH) {
                right -= MIN_COLUMN_WIDTH - left;
                left = MIN_COLUMN_WIDTH;
            }
            if (right < MIN_COLUMN_WIDTH) {
                left -= MIN_COLUMN_WIDTH - right;
                right = MIN_COLUMN_WIDTH;
            }
            applyWidths(Math.round(left * 10) / 10, Math.round(right * 10) / 10, false);
        };

        const onUp = (upEvent: PointerEvent) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            setIsDragging(false);
            const delta = ((upEvent.clientX - startX) / groupWidth) * 100;
            let left = startLeft + delta;
            let right = startRight - delta;
            if (left < MIN_COLUMN_WIDTH) {
                right -= MIN_COLUMN_WIDTH - left;
                left = MIN_COLUMN_WIDTH;
            }
            if (right < MIN_COLUMN_WIDTH) {
                left -= MIN_COLUMN_WIDTH - right;
                right = MIN_COLUMN_WIDTH;
            }
            applyWidths(Math.round(left * 10) / 10, Math.round(right * 10) / 10, true);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const showHandle = canEdit && !isLastColumn();
    const flexStyle = width
        ? { flex: `0 0 ${width}%`, maxWidth: `${width}%`, width: `${width}%` }
        : undefined;

    return (
        <NodeViewWrapper className="tiptap-column" data-type="column" style={flexStyle}>
            <NodeViewContent className="tiptap-column-content" />
            {showHandle && (
                <div
                    ref={handleRef}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize column"
                    className={cn('tiptap-column-resize', isDragging && 'is-dragging')}
                    contentEditable={false}
                    onPointerDown={onResizePointerDown}
                    title="Drag to resize"
                />
            )}
        </NodeViewWrapper>
    );
};

const ColumnGroup = Node.create({
    name: 'columnGroup',
    group: 'block',
    content: 'column+',
    isolating: true,
    defining: true,
    parseHTML() { return [{ tag: 'div[data-type="column-group"]' }]; },
    renderHTML() { return ['div', { 'data-type': 'column-group', class: 'tiptap-column-group' }, 0]; },
});

const Column = Node.create({
    name: 'column',
    content: 'block+',
    isolating: true,
    defining: true,
    addAttributes() {
        return {
            width: {
                default: null,
                parseHTML: (element) => {
                    const value = element.getAttribute('data-width');
                    const parsed = value ? parseFloat(value) : NaN;
                    return Number.isFinite(parsed) ? parsed : null;
                },
                renderHTML: (attributes) => {
                    if (attributes.width == null) return {};
                    return {
                        'data-width': String(attributes.width),
                        style: `flex: 0 0 ${attributes.width}%; max-width: ${attributes.width}%`,
                    };
                },
            },
        };
    },
    parseHTML() { return [{ tag: 'div[data-type="column"]' }]; },
    renderHTML({ HTMLAttributes }) {
        return ['div', { 'data-type': 'column', class: 'tiptap-column', ...HTMLAttributes }, 0];
    },
    addNodeView() {
        return ReactNodeViewRenderer(ColumnView);
    },
});

const parseImageSize = (value?: string | null) => {
    if (!value) return null;
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? `${n}px` : value;
};

const ResizableImageView = ({ node, updateAttributes, selected, editor }: any) => {
    const canEdit = editor?.isEditable === true;
    const wrapRef = useRef<HTMLDivElement>(null);
    const width = node.attrs.width as string | null;

    useEffect(() => {
        const handle = wrapRef.current?.querySelector('.docs-image-handle') as HTMLElement | null;
        if (!handle || !canEdit) return;

        const onPointerDown = (event: PointerEvent) => {
            event.preventDefault();
            event.stopPropagation();
            const startX = event.clientX;
            const startWidth = wrapRef.current?.getBoundingClientRect().width || 240;

            const onMove = (moveEvent: PointerEvent) => {
                const next = Math.max(96, Math.min(816, startWidth + (moveEvent.clientX - startX)));
                updateAttributes({ width: `${Math.round(next)}px`, height: null });
            };
            const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        };

        handle.addEventListener('pointerdown', onPointerDown, true);
        return () => handle.removeEventListener('pointerdown', onPointerDown, true);
    }, [canEdit, updateAttributes]);

    return (
        <NodeViewWrapper className="docs-image-node" data-drag-handle>
            <div
                ref={wrapRef}
                className={cn('docs-resizable-image', selected && 'is-selected')}
                style={{ width: width || '100%', maxWidth: '100%' }}
            >
                <img src={node.attrs.src} alt={node.attrs.alt || ''} title={node.attrs.title || undefined} draggable={false} />
                {canEdit && <div className="docs-image-handle" contentEditable={false} title="Drag to resize" />}
            </div>
        </NodeViewWrapper>
    );
};

const PageBreakExtension = Node.create({
    name: 'pageBreak',
    group: 'block',
    atom: true,
    selectable: false,
    parseHTML() { return [{ tag: 'div[data-type="page-break"]' }]; },
    renderHTML() { return ['div', { 'data-type': 'page-break', class: 'doc-page-break' }]; },
});

const LETTER_PAGE_HEIGHT = 1056;
const LETTER_PAGE_WIDTH = 816;
const LETTER_PAGE_GAP = 40;
const MAX_PAGE_BREAKS = 24;

const stripPageBreaks = (json: any): any => {
    if (!json) return json;
    if (Array.isArray(json)) return json.filter((n) => n?.type !== 'pageBreak').map(stripPageBreaks);
    if (json.content) {
        return { ...json, content: stripPageBreaks(json.content) };
    }
    return json;
};

const isPageBreakEl = (el: HTMLElement) =>
  el.classList.contains('doc-page-break') ||
  el.getAttribute('data-type') === 'page-break' ||
  !!el.querySelector(':scope > .doc-page-break, :scope > [data-type="page-break"]');

const isHorizontalDocsLayout = () =>
  document.documentElement.getAttribute('data-docs-layout') === 'horizontal';

const layoutScale = (el: HTMLElement) => {
    const width = el.getBoundingClientRect().width;
    return width && el.offsetWidth ? width / el.offsetWidth : 1;
};

const cssOffsetFrom = (el: HTMLElement, ancestor: HTMLElement, scale: number) =>
    (el.getBoundingClientRect().top - ancestor.getBoundingClientRect().top) / scale;

const sizeVerticalPages = (pm: HTMLElement, paper: HTMLElement) => {
    const body = (paper.querySelector('.docs-paper-body') as HTMLElement | null) || paper;
    const breaks = [...pm.children].filter((el) => isPageBreakEl(el as HTMLElement)).length;
    const pages = Math.max(1, Math.min(MAX_PAGE_BREAKS, breaks + 1));
    body.style.minHeight = `${pages * (LETTER_PAGE_HEIGHT + LETTER_PAGE_GAP) - LETTER_PAGE_GAP}px`;
};

const insertVerticalPageBreak = (editor: any, pos: number) => {
    const $pos = editor.state.doc.resolve(Math.max(1, Math.min(pos, editor.state.doc.content.size)));
    if ($pos.nodeBefore?.type?.name === 'pageBreak' || $pos.nodeAfter?.type?.name === 'pageBreak') return false;
    const node = editor.schema.nodes.pageBreak.create();
    const insertTr = editor.state.tr.insert($pos.pos, node);
    insertTr.setMeta('pagination', true);
    insertTr.setMeta('addToHistory', false);
    editor.view.dispatch(insertTr);
    return true;
};

const paginateDocument = (editor: any, depth = 0) => {
    if (!editor || editor.isDestroyed || depth > MAX_PAGE_BREAKS) return;
    const paper = document.querySelector('.docs-paper') as HTMLElement | null;
    const pm = editor.view?.dom as HTMLElement | undefined;
    if (!paper || !pm) return;
    const body = (paper.querySelector('.docs-paper-body') as HTMLElement | null) || paper;

    if (isHorizontalDocsLayout()) {
        body.style.minHeight = '';
        pm.style.paddingBottom = '';
        if (stripPageBreaksFromEditor(editor)) {
            requestAnimationFrame(() => paginateDocument(editor, depth + 1));
            return;
        }
        sizeHorizontalPages(pm);
        requestAnimationFrame(() => {
            if (!editor.isDestroyed && isHorizontalDocsLayout()) sizeHorizontalPages(pm);
        });
        return;
    }

    clearHorizontalPageStyles(pm);

    if (depth === 0 && stripPageBreaksFromEditor(editor)) {
        requestAnimationFrame(() => paginateDocument(editor, 1));
        return;
    }

    const scale = layoutScale(body);
    const children = Array.from(pm.children) as HTMLElement[];
    let pageEnd = LETTER_PAGE_HEIGHT;

    for (let i = 0; i < children.length; i++) {
        const el = children[i];
        if (isPageBreakEl(el)) {
            pageEnd = cssOffsetFrom(el, body, scale) + LETTER_PAGE_GAP + LETTER_PAGE_HEIGHT;
            continue;
        }

        const top = cssOffsetFrom(el, body, scale);
        const bottom = cssOffsetFrom(el, body, scale) + el.getBoundingClientRect().height / scale;
        if (bottom <= pageEnd + 1) continue;

        try {
            let pos: number | null = null;
            if (top > pageEnd - 6) {
                pos = editor.view.posAtDOM(el, 0);
            } else {
                const bodyRect = body.getBoundingClientRect();
                const hit = editor.view.posAtCoords({
                    left: bodyRect.left + Math.min(80, bodyRect.width / 2),
                    top: bodyRect.top + pageEnd * scale - 2,
                });
                pos = hit?.pos ?? editor.view.posAtDOM(el, 0);
            }
            if (pos == null || pos < 1) continue;
            if (!insertVerticalPageBreak(editor, pos)) continue;
            requestAnimationFrame(() => paginateDocument(editor, depth + 1));
            return;
        } catch {
            continue;
        }
    }

    const lastContent = [...children].reverse().find((el) => !isPageBreakEl(el));
    if (lastContent) {
        const lastBreak = [...children].reverse().find(isPageBreakEl);
        const pageStart = lastBreak
            ? cssOffsetFrom(lastBreak, body, scale) + LETTER_PAGE_GAP
            : 0;
        const contentBottom = (lastContent.getBoundingClientRect().bottom - body.getBoundingClientRect().top) / scale;
        const used = contentBottom - pageStart;
        pm.style.paddingBottom = `${Math.max(0, Math.min(LETTER_PAGE_HEIGHT, LETTER_PAGE_HEIGHT - used))}px`;
    }
    sizeVerticalPages(pm, paper);
};

const clearHorizontalPageStyles = (pm: HTMLElement) => {
    pm.style.removeProperty('width');
    pm.style.removeProperty('height');
    pm.style.removeProperty('min-height');
    pm.style.removeProperty('column-width');
    pm.style.removeProperty('column-gap');
    pm.style.removeProperty('columns');
};

const sizeHorizontalPages = (pm: HTMLElement) => {
    pm.style.columns = '1';
    pm.style.columnWidth = 'auto';
    pm.style.columnGap = '0px';
    pm.style.width = `${LETTER_PAGE_WIDTH}px`;
    pm.style.height = 'auto';
    pm.style.minHeight = '0';
    void pm.offsetHeight;
    const usable = LETTER_PAGE_HEIGHT - 96;
    let pages = Math.max(1, Math.min(MAX_PAGE_BREAKS, Math.ceil(Math.max(pm.scrollHeight, 1) / usable)));
    const widthFor = (count: number) => `${count * LETTER_PAGE_WIDTH + (count - 1) * LETTER_PAGE_GAP}px`;
    pm.style.removeProperty('columns');
    pm.style.height = `${LETTER_PAGE_HEIGHT}px`;
    pm.style.minHeight = `${LETTER_PAGE_HEIGHT}px`;
    pm.style.columnWidth = `${LETTER_PAGE_WIDTH}px`;
    pm.style.columnGap = `${LETTER_PAGE_GAP}px`;
    pm.style.width = widthFor(pages);
    void pm.offsetHeight;
    if (pm.scrollWidth > pm.clientWidth + 8) {
        const extra = Math.ceil((pm.scrollWidth - pm.clientWidth) / (LETTER_PAGE_WIDTH + LETTER_PAGE_GAP));
        pages = Math.min(MAX_PAGE_BREAKS, pages + extra);
        pm.style.width = widthFor(pages);
    }
};

const stripPageBreaksFromEditor = (editor: any) => {
    const { state } = editor;
    const breaks: { from: number; to: number }[] = [];
    state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'pageBreak') {
            breaks.push({ from: pos, to: pos + node.nodeSize });
        }
    });
    if (!breaks.length) return false;
    const tr = state.tr;
    breaks.reverse().forEach(({ from, to }) => tr.delete(from, to));
    tr.setMeta('pagination', true);
    tr.setMeta('addToHistory', false);
    editor.view.dispatch(tr);
    return true;
};

interface EditorProps {
  initialContent: any;
  initialPrompt?: string | null;
  onContentChange: (json: any) => void;
  editable?: boolean;
  companyId?: string;
}

const AI_STATUS_STEPS: Record<string, string[]> = {
  improve: ['Reading your draft…', 'Tightening the wording…', 'Checking clarity…'],
  rewrite: ['Reading your draft…', 'Rewriting in a clearer voice…', 'Smoothing the flow…'],
  'fix-grammar': ['Checking spelling…', 'Fixing grammar…', 'Reviewing punctuation…'],
  summarize: ['Finding the key points…', 'Condensing the draft…', 'Writing the summary…'],
  expand: ['Reading your draft…', 'Adding useful detail…', 'Structuring the extra content…'],
  professional: ['Reading your draft…', 'Adjusting the tone…', 'Keeping it plain and clear…'],
  simplify: ['Reading your draft…', 'Simplifying the language…', 'Keeping the facts intact…'],
  continue: ['Reading what you wrote…', 'Drafting the next section…', 'Matching your voice…'],
  custom: ['Understanding your request…', 'Drafting a response…', 'Polishing the wording…'],
  generate: ['Outlining the document…', 'Writing the first draft…', 'Structuring the sections…'],
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function suggestionToHtml(text: string) {
  const blocks = text.replace(/\r\n/g, '\n').trim().split(/\n{2,}/);
  if (!blocks.length) return '<p></p>';
  return blocks.map((block) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return '';
    if (lines.every((line) => /^[-•*]\s+/.test(line))) {
      const items = lines.map((line) => `<li>${escapeHtml(line.replace(/^[-•*]\s+/, ''))}</li>`).join('');
      return `<ul>${items}</ul>`;
    }
    return `<p>${lines.map((line) => escapeHtml(line)).join('<br>')}</p>`;
  }).join('');
}

export const Editor = forwardRef<any, EditorProps>(({ initialContent, initialPrompt, onContentChange, editable = true, companyId }, ref) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const isMounted = useMounted();
  
  const [showAiToolbar, setShowAiToolbar] = useState(false);
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [aiAction, setAiAction] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState('');
  const [aiPreview, setAiPreview] = useState<{
    originalJSON: any;
    rationale?: string;
  } | null>(null);

  const [isLinkPageOpen, setIsLinkPageOpen] = useState(false);
  const [pageSearch, setPageSearch] = useState('');

  const pagesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(
        collection(firestore, 'collaboration_pages'), 
        where('companyId', '==', companyId)
    ) : null, 
    [firestore, companyId]
  );
  const { data: allPages } = useCollection<CollabPage>(pagesQuery);

  const filteredPages = useMemo(() => {
    if (!allPages) return [];
    const visible = allPages.filter(p => !p.isTrashed && p.type !== 'folder');
    if (!pageSearch) return visible;
    const s = pageSearch.toLowerCase();
    return visible.filter(p => p.title?.toLowerCase().includes(s));
  }, [allPages, pageSearch]);

  const CustomImage = ImageExtension.extend({
    addOptions() {
      return {
        ...this.parent?.(),
        allowBase64: true,
      };
    },
    addAttributes() {
      return {
        ...this.parent?.(),
        width: {
          default: null,
          parseHTML: (element) => parseImageSize(element.getAttribute('width') || element.style.width),
          renderHTML: attributes => {
            if (!attributes.width) return {};
            return { style: `width: ${attributes.width}` };
          },
        },
        height: {
          default: null,
          parseHTML: (element) => parseImageSize(element.getAttribute('height') || element.style.height),
          renderHTML: attributes => {
            if (!attributes.height) return {};
            return { style: `height: ${attributes.height}` };
          },
        },
      };
    },
    addNodeView() {
      return ReactNodeViewRenderer(ResizableImageView);
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
          heading: { levels: [1, 2, 3] }
      }),
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'title', 'subtitle'],
      }),
      Placeholder.configure({
        placeholder: 'Write your guide here... Type "/" for quick commands.',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer hover:text-primary-light transition-colors font-bold',
        },
      }),
      CustomImage.configure({
        inline: false,
        HTMLAttributes: {
          class: 'docs-doc-image',
        },
      }),
      Table.configure({
          resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight.configure({ multicolor: true }),
      Title,
      Subtitle,
      CanvasExtension,
      PageLinkExtension,
      ColumnGroup,
      Column,
      PageBreakExtension,
    ],
    content: stripPageBreaks(initialContent),
    editable: editable,
    onUpdate: ({ editor, transaction }) => {
      if (!editable) return;
      if (transaction.getMeta('pagination')) return;
      if (!isAiProcessing && isMounted) {
        onContentChange(stripPageBreaks(editor.getJSON()));
      }
    },
    editorProps: {
        attributes: {
            class: 'prose prose-slate max-w-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 min-h-[240px] border-none outline-none'
        },
    }
  }, [isMounted]);

  const uploadAndInsertImage = useCallback(async (file: File) => {
    if (!editor || editor.isDestroyed) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Wrong format', description: 'Please use an image file.' });
        return;
    }

    setIsUploading(true);
    setUploadProgress(40);

    try {
      const src = await fileToEmbeddedImageSrc(file);
      setUploadProgress(90);
      if (isMounted && editor && !editor.isDestroyed) {
          editor.chain().focus().setImage({ src }).run();
          toast({ title: 'Image added' });
      }
    } catch (error: any) {
      console.error('Image attach failed:', error);
      toast({
        variant: 'destructive',
        title: 'Could not add image',
        description: error?.message || 'Try a smaller photo.',
      });
    } finally {
      if (isMounted) {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  }, [toast, isMounted, editor]);

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAndInsertImage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const dom = editor.view.dom;
    const pickImage = (data: DataTransfer | null) => {
      if (!data) return null;
      const fromFiles = Array.from(data.files || []).find(f => f.type.startsWith('image/'));
      if (fromFiles) return fromFiles;
      const item = Array.from(data.items || []).find(i => i.type.startsWith('image/'));
      return item ? item.getAsFile() : null;
    };
    const onPaste = (e: ClipboardEvent) => {
      const file = pickImage(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      uploadAndInsertImage(file);
    };
    const onDrop = (e: DragEvent) => {
      const file = pickImage(e.dataTransfer);
      if (!file) return;
      e.preventDefault();
      uploadAndInsertImage(file);
    };
    dom.addEventListener('paste', onPaste);
    dom.addEventListener('drop', onDrop);
    return () => {
      dom.removeEventListener('paste', onPaste);
      dom.removeEventListener('drop', onDrop);
    };
  }, [editor, uploadAndInsertImage]);

  const acceptAiSuggestion = () => {
    if (!aiPreview || !editor) return;
    setAiPreview(null);
    onContentChange(editor.getJSON());
  };

  const discardAiSuggestion = () => {
    if (!aiPreview || !editor) return;
    editor.commands.setContent(aiPreview.originalJSON, false);
    onContentChange(editor.getJSON());
    setAiPreview(null);
  };

  useEffect(() => {
    if (!isAiProcessing) return;
    const steps = AI_STATUS_STEPS[aiAction || 'custom'] || AI_STATUS_STEPS.custom;
    let i = 0;
    setAiStatus(steps[0]);
    const timer = window.setInterval(() => {
      i = (i + 1) % steps.length;
      setAiStatus(steps[i]);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [isAiProcessing, aiAction]);

  useImperativeHandle(ref, () => ({
      focus: () => {
          if (editor && !editor.isDestroyed) {
              editor.commands.focus();
          }
      }
  }));

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const runNow = () => {
      if (timer) clearTimeout(timer);
      paginateDocument(editor, 0);
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => paginateDocument(editor, 0), 280);
    };
    runNow();
    const onUpdate = ({ transaction }: any) => {
      if (transaction?.getMeta?.('pagination')) return;
      schedule();
    };
    editor.on('update', onUpdate);
    window.addEventListener('resize', schedule);
    window.addEventListener('docs-page-layout', runNow);
    return () => {
      if (timer) clearTimeout(timer);
      editor.off('update', onUpdate);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('docs-page-layout', runNow);
    };
  }, [editor]);

  useEffect(() => {
    if (initialPrompt && editor && !isAiProcessing && editor.isEmpty) {
        const streamDoc = async () => {
            setIsAiProcessing(true);
            setAiAction('generate');
            setShowAiToolbar(true);
            setAiStatus('Outlining the document…');
            try {
                const response = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: initialPrompt })
                });
                if (!response.ok) throw new Error('Could not start the draft.');
                if (!response.body) throw new Error('Stream failed');
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedHtml = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    accumulatedHtml += chunk;
                    if (isMounted && editor && !editor.isDestroyed) {
                        editor.commands.setContent(accumulatedHtml, false);
                    }
                }
                if (isMounted && editor && !editor.isDestroyed) {
                    onContentChange(editor.getJSON());
                }
            } catch (error: any) {
                console.error('Streaming error:', error);
                toast({
                  variant: 'destructive',
                  title: 'Could not write the draft',
                  description: error?.message || 'Try again in a moment.',
                });
            } finally {
                if (isMounted) {
                    setIsAiProcessing(false);
                    setAiStatus('');
                    setAiAction(null);
                }
            }
        };
        streamDoc();
    }
  }, [initialPrompt, editor, onContentChange, toast, isMounted]);

  const callAiAssistant = async (action: string, customInstruction?: string) => {
    if (!editor || editor.isDestroyed || isAiProcessing) return;
    const { from, to } = editor.state.selection;
    const selectedText = from !== to ? editor.state.doc.textBetween(from, to, '\n') : '';
    const fullText = editor.getText();
    const hasSelection = selectedText.trim().length > 0;
    const textToProcess = hasSelection ? selectedText : fullText;
    const goal = (customInstruction || '').trim();

    if (action === 'custom' && !goal) return;
    if (!textToProcess.trim() && action !== 'custom' && action !== 'continue') {
      toast({ title: 'Add some text first', description: 'Select a passage, or type a request for the assistant.' });
      return;
    }

    const replaceWhole = !hasSelection && ['improve', 'rewrite', 'fix-grammar', 'summarize', 'professional', 'simplify'].includes(action);
    const originalJSON = editor.getJSON();

    setShowAiToolbar(true);
    setIsAiProcessing(true);
    setAiAction(action);
    setAiStatus((AI_STATUS_STEPS[action] || AI_STATUS_STEPS.custom)[0]);
    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToProcess,
          action,
          customGoal: goal || undefined,
          context: hasSelection ? fullText.slice(0, 6000) : undefined,
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Assistant error');
      if (!data?.suggestedText || !isMounted || editor.isDestroyed) return;

      const html = suggestionToHtml(data.suggestedText);
      if (hasSelection) {
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, html).run();
      } else if (replaceWhole || editor.isEmpty) {
        editor.commands.setContent(html, false);
      } else {
        editor.chain().focus().insertContent(html).run();
      }
      setAiPreview({ originalJSON, rationale: data.rationale });
      setCustomGoal('');
    } catch (error: any) {
      console.error('AI error:', error);
      toast({
        variant: 'destructive',
        title: 'Assistant could not finish',
        description: error?.message || 'Try a shorter selection or a clearer request.',
      });
    } finally {
      if (isMounted) {
          setIsAiProcessing(false);
          setAiStatus('');
          setAiAction(null);
      }
    }
  };

  const insertBlock = (content: any) => {
    if (!editor || editor.isDestroyed) return false;
    const { $from } = editor.state.selection;
    let pos = editor.state.doc.content.size;
    try {
      pos = $from.after(1);
    } catch {
      pos = editor.state.doc.content.size;
    }
    const inserted = editor.chain().focus().insertContentAt(pos, content).run();
    if (!inserted) {
      return editor.chain().focus().insertContent(content).run();
    }
    return inserted;
  };

  const handleInsertCanvas = () => {
    insertBlock({ type: 'canvas' });
  };

  const handleInsertPageLink = (targetPage: CollabPage) => {
    insertBlock({ 
        type: 'pageLink', 
        attrs: { 
            targetPageId: targetPage.id, 
            title: targetPage.title || 'Untitled', 
            icon: targetPage.icon || '', 
            type: targetPage.type 
        } 
    });
    setIsLinkPageOpen(false);
  };

  const handleInsertTable = (rows: number, cols: number) => {
      editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run();
  };

  const handleInsertImage = () => {
    window.setTimeout(() => fileInputRef.current?.click(), 80);
  };

  useLayoutEffect(() => {
    const sync = () => setToolbarSlot(document.getElementById('docs-editor-toolbar-slot'));
    sync();
    const frame = window.requestAnimationFrame(sync);
    return () => window.cancelAnimationFrame(frame);
  }, [editable]);

  if (!editor) return null;

  const editorToolbar = editable && !editor.isDestroyed ? (
        <TooltipProvider delayDuration={0}>
          <div className="docs-editor-toolbar relative pointer-events-auto mx-auto w-full max-w-full sm:w-fit bg-white/95 backdrop-blur-xl border border-slate-200 shadow-lg p-1.5 rounded-2xl sm:rounded-[2rem] flex flex-col items-center gap-1 overflow-visible print:hidden">
              {(isUploading) && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full whitespace-nowrap shadow-xl border border-white/10 z-50">
                      <div className="flex items-center gap-3">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                            Uploading {uploadProgress.toFixed(0)}%
                          </span>
                      </div>
                  </div>
              )}

              <div className="flex items-center w-full overflow-x-auto scrollbar-none px-2 sm:px-0 gap-0.5">
                  <div className="flex items-center px-1 shrink-0">
                      <Button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => !isAiProcessing && setShowAiToolbar(!showAiToolbar)}
                        disabled={isAiProcessing}
                        className={cn("h-9 rounded-2xl px-4 gap-2 font-black text-[10px] uppercase tracking-widest", showAiToolbar || isAiProcessing ? "bg-primary text-white shadow-lg" : "bg-slate-900 text-white hover:bg-slate-800")}
                      >
                          {isAiProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className={cn("h-3.5 w-3.5", showAiToolbar && "animate-pulse")} />}
                          {isAiProcessing ? 'Writing' : 'Assistant'}
                      </Button>
                  </div>
                  
                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200 shrink-0" />
                  
                  <div className="flex items-center px-1 shrink-0">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100" title="Insert block">
                                <Plus className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-64 p-1 rounded-2xl shadow-3xl border-slate-100 bg-white z-[80]">
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest border-b mb-1">Add block</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => setIsLinkPageOpen(true)} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><LinkIcon className="h-4 w-4" /></div>
                                Link page
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleInsertCanvas()} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600"><Layout className="h-4 w-4" /></div>
                                Canvas
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600"><Table2 className="h-4 w-4" /></div>
                                    Table
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent align="start" className="p-0 rounded-xl border-slate-200 shadow-xl z-[90]">
                                    <TableSizePicker onPick={handleInsertTable} />
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuItem onSelect={() => handleInsertImage()} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><ImageIcon className="h-4 w-4" /></div>
                                Static Image
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200 shrink-0" />
                  
                  <div className="flex items-center px-1 shrink-0">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              onMouseDown={(e) => e.preventDefault()}
                              className="h-8 min-w-[8.75rem] justify-between gap-2 rounded-md px-2.5 text-[13px] font-normal text-slate-700 hover:bg-slate-100"
                            >
                              {currentTextStyleLabel(editor)}
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64 p-0 rounded-xl shadow-xl border-slate-200 overflow-hidden z-[80]">
                            <StyleMenuItem
                              active={editor.isActive('paragraph') && !editor.isActive('title') && !editor.isActive('subtitle') && !editor.isActive('heading')}
                              previewClass="text-[13px] text-slate-700"
                              label="Normal text"
                              onSelect={() => editor.chain().focus().setParagraph().run()}
                            />
                            <StyleMenuItem
                              active={editor.isActive('title')}
                              previewClass="text-[26px] font-normal leading-none text-slate-900"
                              label="Title"
                              onSelect={() => editor.chain().focus().setNode('title').run()}
                            />
                            <StyleMenuItem
                              active={editor.isActive('subtitle')}
                              previewClass="text-[15px] text-slate-500"
                              label="Subtitle"
                              onSelect={() => editor.chain().focus().setNode('subtitle').run()}
                            />
                            <StyleMenuItem
                              active={editor.isActive('heading', { level: 1 })}
                              previewClass="text-[20px] font-normal text-slate-900"
                              label="Heading 1"
                              onSelect={() => editor.chain().focus().setHeading({ level: 1 }).run()}
                            />
                            <StyleMenuItem
                              active={editor.isActive('heading', { level: 2 })}
                              previewClass="text-[16px] font-normal text-slate-800"
                              label="Heading 2"
                              onSelect={() => editor.chain().focus().setHeading({ level: 2 }).run()}
                            />
                            <StyleMenuItem
                              active={editor.isActive('heading', { level: 3 })}
                              previewClass="text-[14px] font-normal text-slate-700"
                              label="Heading 3"
                              onSelect={() => editor.chain().focus().setHeading({ level: 3 }).run()}
                            />
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200 shrink-0" />
                  
                  <div className="flex items-center gap-0.5 px-1 shrink-0">
                      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} icon={<AlignLeft className="h-4 w-4" />} label="Align Left" />
                      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} icon={<AlignCenter className="h-4 w-4" />} label="Align Center" />
                      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} icon={<AlignRight className="h-4 w-4" />} label="Align Right" />
                  </div>

                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200 shrink-0" />
                  
                  <div className="flex items-center gap-0.5 px-1 shrink-0">
                      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={<Bold className="h-4 w-4" />} label="Bold" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={<Italic className="h-4 w-4" />} label="Italic" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon={<UnderlineIcon className="h-4 w-4" />} label="Underline" />
                      <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onMouseDown={(e) => e.preventDefault()}
                                        className={cn("h-8 w-8 rounded-xl shrink-0", (editor.isActive('highlight') || editor.getAttributes('textStyle').color) ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:bg-slate-100")}
                                    >
                                        <Palette className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-xl font-bold text-[9px] uppercase tracking-widest bg-slate-900 text-white border-none px-3 py-1.5 shadow-2xl">
                                Text & highlight color
                            </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="center" className="w-52 p-2 rounded-2xl shadow-2xl border-slate-100">
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-2 py-1 tracking-widest">Text color</DropdownMenuLabel>
                            <div className="grid grid-cols-6 gap-1.5 px-2 pb-2">
                                {['#0f172a', '#64748b', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#db2777'].map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => editor.chain().focus().setColor(color).run()}
                                        className="h-5 w-5 rounded-full border border-slate-200"
                                        style={{ backgroundColor: color }}
                                        aria-label={color}
                                    />
                                ))}
                            </div>
                            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().unsetColor().run()} className="rounded-lg text-xs font-semibold cursor-pointer">
                                Default text
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHighlight().run()} className="rounded-lg text-xs font-semibold cursor-pointer">
                                Toggle highlight
                            </DropdownMenuItem>
                            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().unsetHighlight().run()} className="rounded-lg text-xs font-semibold cursor-pointer">
                                Clear highlight
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
                  
                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200 shrink-0" />
                  
                  <div className="flex items-center gap-0.5 px-1 shrink-0">
                      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={<List className="h-4 w-4" />} label="List" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} icon={<CheckSquare className="h-4 w-4" />} label="Checklist" />
                  </div>
              </div>

              {(showAiToolbar || isAiProcessing) && (
                  <div className="w-full px-2 py-1.5 flex flex-col gap-2">
                      {isAiProcessing ? (
                        <div className="px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2.5 mb-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                            <p className="text-[12px] font-semibold text-slate-800">{aiStatus || 'Working…'}</p>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full w-2/5 rounded-full bg-primary animate-pulse" />
                          </div>
                          <p className="mt-2 text-[10px] text-slate-400">Keep this tab open. You can review the draft when it finishes.</p>
                        </div>
                      ) : (
                        <>
                      <div className="flex items-center gap-1.5 w-full overflow-x-auto scrollbar-none px-2">
                        <AiAction icon={<Wand2 className="h-3 w-3" />} label="Improve" onClick={() => callAiAssistant('improve')} />
                        <AiAction icon={<Languages className="h-3 w-3" />} label="Fix Grammar" onClick={() => callAiAssistant('fix-grammar')} />
                        <AiAction icon={<Type className="h-3 w-3" />} label="Professional" onClick={() => callAiAssistant('professional')} />
                      </div>
                      <div className="flex items-center gap-2 px-2 pb-1 w-full">
                          <Input placeholder="Ask the assistant to write or edit…" value={customGoal} onChange={(e) => setCustomGoal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && callAiAssistant('custom', customGoal)} className="h-9 rounded-xl bg-slate-50 border-none font-bold text-[11px] flex-1 focus:ring-0 focus-visible:ring-0 shadow-none" />
                          <Button disabled={!customGoal.trim()} onClick={() => callAiAssistant('custom', customGoal)} size="icon" className="h-9 w-9 rounded-xl shrink-0"><Send className="h-3.5 w-3.5" /></Button>
                      </div>
                        </>
                      )}
                  </div>
              )}
          </div>
        </TooltipProvider>
      ) : null;

  return (
    <div className="group relative">
      <input type="file" ref={fileInputRef} onChange={handleImageInput} accept="image/*" className="hidden" />
      {toolbarSlot && editorToolbar ? createPortal(editorToolbar, toolbarSlot) : editorToolbar}

      {aiPreview && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] w-[min(92vw,32rem)]">
              <Card className="border-none shadow-2xl rounded-2xl bg-slate-900 text-white overflow-hidden py-3 px-4 sm:px-5 flex items-center gap-4 border border-white/10">
                <div className="p-1.5 sm:p-2 rounded-full bg-primary/20 text-primary shrink-0"><Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review draft</p>
                    <p className="text-xs text-white/90 truncate">{aiPreview.rationale || 'Keep this version, or undo to restore the previous text.'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button onClick={discardAiSuggestion} variant="ghost" size="sm" className="h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-widest text-red-300 hover:bg-red-500 hover:text-white">Undo</Button>
                    <Button onClick={acceptAiSuggestion} size="sm" className="h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-widest bg-green-500 hover:bg-green-400 text-white">Keep</Button>
                </div>
              </Card>
          </div>
      )}

      {editable && !editor.isDestroyed && (
        <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-1">
             <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button onClick={() => setIsLinkPageOpen(true)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100">
                            <LinkIcon className="h-4 w-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-lg text-[9px] font-black uppercase tracking-widest">Link page</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button onClick={handleInsertCanvas} className="h-10 w-10 flex items-center justify-center rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100">
                            <Layout className="h-5 w-5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-lg text-[9px] font-black uppercase tracking-widest">Canvas</TooltipContent>
                </Tooltip>
             </TooltipProvider>
          </div>
        </FloatingMenu>
      )}

      <div onClick={() => editor?.commands.focus()} className="relative">
        <EditorContent editor={editor} />
        {isAiProcessing && (
          <div className="absolute inset-0 z-20 flex items-start justify-center bg-white/55 backdrop-blur-[1px] pt-16 pointer-events-none">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <div>
                <p className="text-[12px] font-semibold text-slate-800 leading-none">{aiStatus || 'Working…'}</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-none">Assistant is drafting</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isLinkPageOpen} onOpenChange={setIsLinkPageOpen}>
        <DialogContent className="sm:max-w-md rounded-[1.5rem] border-none shadow-3xl bg-white p-0 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">Link a page</DialogTitle>
                    <DialogDescription className="sr-only">Choose a page to link</DialogDescription>
                </DialogHeader>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input 
                        autoFocus
                        placeholder="Search..." 
                        value={pageSearch}
                        onChange={(e) => setPageSearch(e.target.value)}
                        className="h-11 rounded-xl bg-white border-slate-200 pl-10 font-bold text-sm shadow-none focus-visible:ring-primary"
                    />
                </div>
            </div>
            <ScrollArea className="h-80">
                <div className="p-2 space-y-1">
                    {filteredPages.map(p => (
                        <button 
                            key={p.id} 
                            onClick={() => handleInsertPageLink(p)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-left group"
                        >
                            <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm shrink-0">
                                {p.icon ? (
                                    <span className="text-sm">{p.icon}</span>
                                ) : (
                                    p.type === 'board' ? <Layout className="h-3.5 w-3.5 text-purple-600" /> :
                                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-700 truncate group-hover:text-primary">{p.title || 'Untitled'}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{p.type}</p>
                            </div>
                        </button>
                    ))}
                    {filteredPages.length === 0 && (
                        <div className="py-20 text-center opacity-30 flex flex-col items-center gap-3">
                            <FileX className="h-8 w-8 text-slate-300" />
                            <p className="text-xs font-semibold text-slate-400">Nothing found</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <DialogFooter className="p-4 bg-slate-50 border-t flex justify-end">
                <Button variant="ghost" onClick={() => setIsLinkPageOpen(false)} className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

Editor.displayName = 'Editor';

function currentTextStyleLabel(editor: any) {
    if (editor.isActive('title')) return 'Title';
    if (editor.isActive('subtitle')) return 'Subtitle';
    if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
    return 'Normal text';
}

function StyleMenuItem({ active, label, previewClass, onSelect }: { active: boolean; label: string; previewClass: string; onSelect: () => void }) {
    return (
        <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onSelect={onSelect}
            className={cn(
                "rounded-none px-3 py-2.5 cursor-pointer flex items-center justify-between gap-3",
                active && "bg-slate-100"
            )}
        >
            <div className="flex items-center gap-2 min-w-0">
                <span className="w-4 shrink-0 flex justify-center">
                    {active && <Check className="h-3.5 w-3.5 text-slate-700" />}
                </span>
                <span className={cn("truncate", previewClass)}>{label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
        </DropdownMenuItem>
    );
}

function TableSizePicker({ onPick }: { onPick: (rows: number, cols: number) => void }) {
    const maxCols = 8;
    const maxRows = 8;
    const [hover, setHover] = useState({ rows: 1, cols: 1 });

    return (
        <div className="p-3 w-[220px]" onMouseDown={(e) => e.preventDefault()}>
            <div
                className="grid gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}
                onMouseLeave={() => setHover({ rows: 1, cols: 1 })}
            >
                {Array.from({ length: maxRows * maxCols }, (_, i) => {
                    const cols = (i % maxCols) + 1;
                    const rows = Math.floor(i / maxCols) + 1;
                    const active = rows <= hover.rows && cols <= hover.cols;
                    return (
                        <button
                            key={`${rows}-${cols}`}
                            type="button"
                            aria-label={`${cols} by ${rows} table`}
                            className={cn(
                                "h-4 w-4 rounded-[2px] border",
                                active ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"
                            )}
                            onMouseEnter={() => setHover({ rows, cols })}
                            onClick={() => onPick(rows, cols)}
                        />
                    );
                })}
            </div>
            <p className="mt-2 text-center text-[13px] text-slate-500">{hover.cols} x {hover.rows}</p>
        </div>
    );
}

function ToolbarButton({ onClick, active, disabled, icon, label }: any) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => { e.preventDefault(); onClick(); }}
                    disabled={disabled}
                    className={cn("h-8 w-8 rounded-xl shrink-0", active ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:bg-slate-100")}
                >
                    {icon}
                </Button>
            </TooltipTrigger>
            <TooltipContent className="rounded-xl font-bold text-[9px] uppercase tracking-widest bg-slate-900 text-white border-none px-3 py-1.5 shadow-2xl">
                {label}
            </TooltipContent>
        </Tooltip>
    );
}

function AiAction({ icon, label, onClick }: any) {
    return (
        <Button variant="ghost" size="sm" onClick={onClick} className="h-8 rounded-xl px-3 gap-2 font-bold text-[9px] uppercase tracking-widest text-slate-500 hover:bg-white hover:text-primary shrink-0 whitespace-nowrap">
            {icon} {label}
        </Button>
    );
}
