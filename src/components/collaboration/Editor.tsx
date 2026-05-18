'use client';

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer, Node, FloatingMenu } from '@tiptap/react';
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
import { cn } from '@/lib/utils';
import { 
    Bold, 
    Italic, 
    List, 
    Heading1, 
    Heading2, 
    CheckSquare,
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
    Grid,
    Plus,
    Trash2,
    Underline as UnderlineIcon,
    Maximize2,
    PlusCircle,
    Layout,
    ChevronDown,
    MoreHorizontal,
    Image as ImageIcon,
    Maximize,
    Minimize2,
    Monitor,
    Columns
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { useStorage, useAuth } from '@/firebase';
import { uploadFileWithProgress } from '@/lib/storage-utils';
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
  DropdownMenuLabel
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
import { useMounted } from '@/hooks/use-mounted';
import { SheetEditor } from './SheetEditor';
import { BoardEditor } from './BoardEditor';

// --- Custom Interactive Blocks ---

const SpreadsheetBlock = ({ node, updateAttributes, deleteNode, extension }: any) => {
    const [isFullSize, setIsFullSize] = useState(false);

    return (
        <NodeViewWrapper className="my-10 relative group/block border border-slate-100 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden bg-white transition-all">
            <div className="absolute top-4 right-4 z-40 flex items-center gap-1.5 opacity-0 group-hover/block:opacity-100 transition-opacity">
                <Badge className="bg-slate-900/80 backdrop-blur-md text-white border-none font-bold uppercase text-[8px] tracking-widest px-3 h-6">Sheet</Badge>
                <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl shadow-lg bg-white/90 backdrop-blur-md text-slate-900 hover:bg-white"
                    onClick={() => setIsFullSize(true)}
                >
                    <Maximize className="h-4 w-4" />
                </Button>
                <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl shadow-lg"
                    onClick={() => deleteNode()}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            <div className="h-[500px]">
                <SheetEditor 
                    initialData={node.attrs.data} 
                    onContentChange={(data) => updateAttributes({ data })}
                    editable={extension.options.editable}
                />
            </div>

            <Dialog open={isFullSize} onOpenChange={setIsFullSize}>
                <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 overflow-hidden border-none shadow-3xl rounded-[2.5rem] bg-white flex flex-col">
                    <div className="h-14 border-b px-6 flex items-center justify-between shrink-0 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white shadow-sm text-green-600">
                                <Grid className="h-4 w-4" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Full-Screen Workspace</h4>
                        </div>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                                <X className="h-5 w-5 text-slate-400" />
                            </Button>
                        </DialogClose>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <SheetEditor 
                            initialData={node.attrs.data} 
                            onContentChange={(data) => updateAttributes({ data })}
                            editable={extension.options.editable}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </NodeViewWrapper>
    );
};

const CanvasBlock = ({ node, updateAttributes, deleteNode, extension }: any) => {
    const [isFullSize, setIsFullSize] = useState(false);

    return (
        <NodeViewWrapper className="my-10 relative group/block border border-slate-100 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden bg-white transition-all">
            <div className="absolute top-4 right-4 z-40 flex items-center gap-1.5 opacity-0 group-hover/block:opacity-100 transition-opacity">
                <Badge className="bg-slate-900/80 backdrop-blur-md text-white border-none font-bold uppercase text-[8px] tracking-widest px-3 h-6">Canvas</Badge>
                <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl shadow-lg bg-white/90 backdrop-blur-md text-slate-900 hover:bg-white"
                    onClick={() => setIsFullSize(true)}
                >
                    <Maximize className="h-4 w-4" />
                </Button>
                <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl shadow-lg"
                    onClick={() => deleteNode()}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            <div className="h-[600px]">
                <BoardEditor 
                    initialData={node.attrs.data} 
                    onContentChange={(data) => updateAttributes({ data })}
                    editable={extension.options.editable}
                />
            </div>

            <Dialog open={isFullSize} onOpenChange={setIsFullSize}>
                <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 overflow-hidden border-none shadow-3xl rounded-[2.5rem] bg-white flex flex-col">
                    <div className="h-14 border-b px-6 flex items-center justify-between shrink-0 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white shadow-sm text-purple-600">
                                <Layout className="h-4 w-4" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Full-Screen Workspace</h4>
                        </div>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                                <X className="h-5 w-5 text-slate-400" />
                            </Button>
                        </DialogClose>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <BoardEditor 
                            initialData={node.attrs.data} 
                            onContentChange={(data) => updateAttributes({ data })}
                            editable={extension.options.editable}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </NodeViewWrapper>
    );
};

const SpreadsheetExtension = Node.create({
    name: 'spreadsheet',
    group: 'block',
    atom: true,
    addAttributes() {
        return {
            data: { default: { fields: [], records: [], views: [], activeViewId: '' } }
        };
    },
    parseHTML() { return [{ tag: 'div[data-type="spreadsheet"]' }]; },
    renderHTML({ HTMLAttributes }) { return ['div', { 'data-type': 'spreadsheet', ...HTMLAttributes }]; },
    addNodeView() { return ReactNodeViewRenderer(SpreadsheetBlock); },
});

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

const ColumnGroup = Node.create({
    name: 'columnGroup',
    group: 'block',
    content: 'column+',
    parseHTML() { return [{ tag: 'div[data-type="column-group"]' }]; },
    renderHTML() { return ['div', { 'data-type': 'column-group', class: 'tiptap-column-group' }, 0]; },
});

const Column = Node.create({
    name: 'column',
    content: 'block+',
    parseHTML() { return [{ tag: 'div[data-type="column"]' }]; },
    renderHTML() { return ['div', { 'data-type': 'column', class: 'tiptap-column' }, 0]; },
});

// --- Main Editor Component ---

interface EditorProps {
  initialContent: any;
  initialPrompt?: string | null;
  onContentChange: (json: any) => void;
  editable?: boolean;
  companyId?: string;
}

export const Editor = forwardRef<any, EditorProps>(({ initialContent, initialPrompt, onContentChange, editable = true, companyId }, ref) => {
  const storage = useStorage();
  const auth = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const isMounted = useMounted();
  
  // AI States
  const [showAiToolbar, setShowAiToolbar] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [aiPreview, setAiPreview] = useState<{ text: string, originalText: string, from: number, to: number } | null>(null);

  const uploadAndInsertImage = useCallback(async (file: File) => {
    if (!editor || !storage || !auth?.currentUser) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Wrong format', description: 'Please use an image file.' });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    const targetPath = companyId || 'unassigned';
    const path = `collab_images/${targetPath}/${Date.now()}-${file.name}`;

    try {
      const url = await uploadFileWithProgress(storage, auth, path, file, {}, (progress) => {
        setUploadProgress(progress);
      });
      
      if (isMounted && editor && !editor.isDestroyed) {
          editor.chain().focus().setImage({ src: url }).run();
          toast({ title: 'Image added' });
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      if (isMounted) toast({ variant: 'destructive', title: 'Failed to add image' });
    } finally {
      if (isMounted) {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  }, [storage, auth, toast, isMounted, companyId]);

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAndInsertImage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const acceptAiSuggestion = () => {
    if (!aiPreview || !editor) return;
    setAiPreview(null);
    toast({ title: 'Changes kept' });
  };

  const discardAiSuggestion = () => {
    if (!aiPreview || !editor) return;
    const { from, to, originalText } = aiPreview;
    editor.chain().focus().deleteRange(from, to).insertContentAt(from, originalText).run();
    setAiPreview(null);
    toast({ title: 'Changes removed' });
  };

  const CustomImage = ImageExtension.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        width: {
          default: null,
          renderHTML: attributes => {
            if (!attributes.width) return {};
            return { style: `width: ${attributes.width}` };
          },
        },
        height: {
          default: null,
          renderHTML: attributes => {
            if (!attributes.height) return {};
            return { style: `height: ${attributes.height}` };
          },
        },
      };
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
        types: ['heading', 'paragraph'],
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
        HTMLAttributes: {
          class: 'rounded-[2rem] border-4 border-white shadow-2xl max-w-full h-auto my-6 mx-auto block transition-all',
        },
      }),
      Table.configure({
          resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight.configure({ multicolor: true }),
      SpreadsheetExtension.configure({ editable }),
      CanvasExtension.configure({ editable }),
      ColumnGroup,
      Column,
    ],
    content: initialContent,
    editable: editable,
    onUpdate: ({ editor }) => {
      if (!isAiProcessing && isMounted) {
        onContentChange(editor.getJSON());
      }
    },
    editorProps: {
        attributes: {
            class: 'prose prose-slate max-w-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 min-h-[500px] text-slate-700 leading-relaxed text-lg font-normal pb-40 border-none outline-none'
        },
    }
  }, [isMounted]);

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
    if (initialPrompt && editor && !isAiProcessing && editor.isEmpty) {
        const streamDoc = async () => {
            setIsAiProcessing(true);
            setAiStatus('Writing...');
            try {
                const response = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: initialPrompt })
                });
                if (!response.body) throw new Error('Stream failed');
                const reader = response.body.getReader();
                const decoder = new TextEncoder();
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
                    toast({ title: 'Draft ready' });
                }
            } catch (error) {
                console.error('Streaming error:', error);
                if (isMounted) toast({ variant: 'destructive', title: 'Error writing guide' });
            } finally {
                if (isMounted) {
                    setIsAiProcessing(false);
                    setAiStatus('');
                }
            }
        };
        streamDoc();
    }
  }, [initialPrompt, editor, onContentChange, toast, isMounted]);

  const callAiAssistant = async (action: string, customInstruction?: string) => {
    if (!editor || editor.isDestroyed) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const textToProcess = selectedText || editor.getText();
    const context = editor.getText();
    if (!textToProcess.trim()) {
        toast({ variant: 'destructive', title: 'Select text first' });
        return;
    }
    setIsAiProcessing(true);
    setShowAiToolbar(false);
    setAiStatus('AI is working...');
    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToProcess, action, customGoal: customInstruction, context })
      });
      if (!response.ok) throw new Error('Assistant error');
      const data = await response.json();
      if (data && data.suggestedText && isMounted && !editor.isDestroyed) {
          if (selectedText) {
              const combinedHtml = `<s>${selectedText}</s> ${data.suggestedText}`;
              editor.chain().focus().deleteRange(from, to).insertContent(combinedHtml).run();
              const currentTo = editor.state.selection.to;
              setAiPreview({ text: data.suggestedText, originalText: selectedText, from: from, to: currentTo });
          } else {
              editor.chain().focus().insertContentAt(editor.state.doc.content.size, `\n\n${data.suggestedText}`).run();
          }
          toast({ title: 'AI finished' });
      }
    } catch (error: any) {
      if (isMounted) toast({ variant: 'destructive', title: 'AI error' });
    } finally {
      if (isMounted) {
          setIsAiProcessing(false);
          setAiStatus('');
      }
    }
  };

  const handleInsertSpreadsheet = () => {
    editor.chain().focus().insertContent({ type: 'spreadsheet' }).run();
  };

  const handleInsertCanvas = () => {
    editor.chain().focus().insertContent({ type: 'canvas' }).run();
  };

  const handleInsertColumns = (count: number) => {
      const columns = Array.from({ length: count }, () => ({ type: 'column', content: [{ type: 'paragraph' }] }));
      editor.chain().focus().insertContent({ type: 'columnGroup', content: columns }).run();
  };

  if (!editor) return null;

  return (
    <div className="group relative">
      <input type="file" ref={fileInputRef} onChange={handleImageInput} accept="image/*" className="hidden" />

      {editable && !editor.isDestroyed && (
        <TooltipProvider delayDuration={0}>
          <div className="sticky top-14 z-30 mx-auto w-full sm:w-fit bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl p-1.5 rounded-2xl sm:rounded-[2rem] flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-all hover:opacity-100 mb-4 animate-in fade-in duration-500 overflow-hidden">
              {(isAiProcessing || isUploading) && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full whitespace-nowrap animate-in slide-in-from-bottom-2 duration-300 shadow-xl border border-white/10 z-50">
                      <div className="flex items-center gap-3">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isUploading ? `Uploading ${uploadProgress.toFixed(0)}%` : (aiStatus || 'Processing...')}</span>
                      </div>
                  </div>
              )}

              <div className="flex items-center w-full overflow-x-auto scrollbar-none px-2 sm:px-0 gap-0.5">
                  <div className="flex items-center px-1 shrink-0">
                      <Button onClick={() => setShowAiToolbar(!showAiToolbar)} className={cn("h-9 rounded-2xl px-4 gap-2 font-black text-[10px] uppercase tracking-widest transition-all", showAiToolbar ? "bg-primary text-white shadow-lg scale-105" : "bg-slate-900 text-white hover:bg-slate-800")}>
                          <Sparkles className={cn("h-3.5 w-3.5", showAiToolbar && "animate-pulse")} /> Assistant
                      </Button>
                  </div>
                  
                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200 shrink-0" />
                  
                  <div className="flex items-center px-1 shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 transition-all group">
                                <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-64 p-1 rounded-2xl shadow-3xl border-slate-100 bg-white">
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest border-b mb-1">New block asset</DropdownMenuLabel>
                            <DropdownMenuItem onClick={handleInsertSpreadsheet} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                <div className="p-1.5 rounded-lg bg-green-50 text-green-600"><Grid className="h-4 w-4" /></div>
                                Interactive Spreadsheet
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleInsertCanvas} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600"><Layout className="h-4 w-4" /></div>
                                Visual Canvas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleInsertColumns(2)} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600"><Columns className="h-4 w-4" /></div>
                                2 Column Layout
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleInsertColumns(3)} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600"><Columns className="h-4 w-4" /></div>
                                3 Column Layout
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-3 font-semibold text-xs py-2.5 rounded-xl cursor-pointer">
                                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><ImageIcon className="h-4 w-4" /></div>
                                Static Image
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200 shrink-0" />
                  
                  <div className="flex items-center gap-1 px-1 shrink-0">
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={<Heading1 className="h-4 w-4" />} label="Large Heading" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={<Heading2 className="h-4 w-4" />} label="Medium Heading" />
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
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} icon={<Palette className="h-4 w-4" />} label="Highlight" />
                  </div>
                  
                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200 shrink-0" />
                  
                  <div className="flex items-center gap-0.5 px-1 shrink-0">
                      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={<List className="h-4 w-4" />} label="List" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} icon={<CheckSquare className="h-4 w-4" />} label="Checklist" />
                  </div>
              </div>

              {showAiToolbar && (
                  <div className="w-full px-2 py-1.5 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-1.5 w-full overflow-x-auto scrollbar-none px-2">
                        <AiAction icon={<Wand2 className="h-3 w-3" />} label="Improve" onClick={() => callAiAssistant('improve')} />
                        <AiAction icon={<Languages className="h-3 w-3" />} label="Fix Grammar" onClick={() => callAiAssistant('fix-grammar')} />
                        <AiAction icon={<Type className="h-3 w-3" />} label="Professional" onClick={() => callAiAssistant('professional')} />
                      </div>
                      <div className="flex items-center gap-2 px-2 pb-1 w-full">
                          <Input placeholder="Ask AI to do something..." value={customGoal} onChange={(e) => setCustomGoal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && callAiAssistant('custom', customGoal)} className="h-9 rounded-xl bg-slate-50 border-none font-bold text-[11px] flex-1 focus:ring-0 focus-visible:ring-0" />
                          <Button disabled={!customGoal.trim()} onClick={() => callAiAssistant('custom', customGoal)} size="icon" className="h-9 w-9 rounded-xl shrink-0"><Send className="h-3.5 w-3.5" /></Button>
                      </div>
                  </div>
              )}
          </div>
        </TooltipProvider>
      )}

      {aiPreview && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-500 w-[90%] sm:w-auto">
              <Card className="border-none shadow-2xl rounded-full bg-slate-900 text-white overflow-hidden py-2 px-4 sm:px-6 flex items-center gap-6 border border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 sm:p-2 rounded-full bg-primary/20 text-primary shrink-0"><Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></div>
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Review changes</p>
                </div>
                <Separator orientation="vertical" className="h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                    <Button onClick={acceptAiSuggestion} variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white"><Check className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                    <Button onClick={discardAiSuggestion} variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-red-500/20 text-red-400 hover:bg-red-50 hover:text-white"><X className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                </div>
              </Card>
          </div>
      )}

      {editable && !editor.isDestroyed && (
        <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-1 animate-in zoom-in-95 duration-200">
             <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button onClick={handleInsertSpreadsheet} className="h-10 w-10 flex items-center justify-center rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-all">
                            <Grid className="h-5 w-5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-lg text-[9px] font-black uppercase tracking-widest">Embedded Spreadsheet</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button onClick={handleInsertCanvas} className="h-10 w-10 flex items-center justify-center rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all">
                            <Layout className="h-5 w-5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-lg text-[9px] font-black uppercase tracking-widest">Visual Canvas</TooltipContent>
                </Tooltip>
             </TooltipProvider>
          </div>
        </FloatingMenu>
      )}

      <div className={cn("transition-opacity", (isAiProcessing && editor.isEmpty) ? "opacity-20" : "opacity-100")} onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

Editor.displayName = 'Editor';

function ToolbarButton({ onClick, active, disabled, icon, label }: any) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); onClick(); }} disabled={disabled}
                    className={cn("h-8 w-8 rounded-xl transition-all shrink-0", active ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:bg-slate-100")}>
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
        <Button variant="ghost" size="sm" onClick={onClick} className="h-8 rounded-xl px-3 gap-2 font-bold text-[9px] uppercase tracking-widest text-slate-500 hover:bg-white hover:text-primary transition-all shrink-0 whitespace-nowrap">
            {icon} {label}
        </Button>
    );
}
