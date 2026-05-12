'use client';

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
import { cn } from '@/lib/utils';
import { 
    Bold, 
    Italic, 
    List, 
    Heading1, 
    Heading2, 
    CheckSquare,
    Link as LinkIcon,
    Image as ImageIcon,
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
    AlignJustify,
    Grid,
    Table as TableIcon,
    Plus,
    Trash2,
    Columns,
    Rows
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
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

interface EditorProps {
  initialContent: any;
  initialPrompt?: string | null;
  onContentChange: (json: any) => void;
  editable?: boolean;
}

export const Editor = forwardRef<any, EditorProps>(({ initialContent, initialPrompt, onContentChange, editable = true }, ref) => {
  const storage = useStorage();
  const auth = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  
  // AI States
  const [showAiToolbar, setShowAiToolbar] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [aiPreview, setAiPreview] = useState<{ text: string, originalText: string, from: number, to: number } | null>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => {
        setIsMounted(false);
    };
  }, []);

  const uploadAndInsertImage = useCallback(async (file: File) => {
    if (!editor || !storage || !auth?.currentUser) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid file', description: 'Please drop or paste an image file.' });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const path = `collab_images/${auth.currentUser.uid}/${Date.now()}-${file.name}`;

    try {
      const url = await uploadFileWithProgress(storage, auth, path, file, {}, (progress) => {
        setUploadProgress(progress);
      });
      if (isMounted && !editor.isDestroyed) {
          editor.chain().focus().setImage({ src: url }).run();
          toast({ title: 'Image attached', description: 'The visual asset has been integrated.' });
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      if (isMounted) toast({ variant: 'destructive', title: 'Upload failed' });
    } finally {
      if (isMounted) {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  }, [storage, auth, toast, isMounted]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
          heading: { levels: [1, 2, 3] }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Press "/" for commands...',
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
      ImageExtension.configure({
        HTMLAttributes: {
          class: 'rounded-[2rem] border-4 border-white shadow-2xl max-w-full h-auto my-6 mx-auto block',
        },
      }),
      Table.configure({
          resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight.configure({ multicolor: true }),
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
            class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px] text-slate-700 leading-relaxed text-lg font-normal'
        },
        handleDrop: (view, event, slice, moved) => {
            if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                const file = event.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    uploadAndInsertImage(file);
                    return true;
                }
            }
            return false;
        },
        handlePaste: (view, event) => {
            if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
                const file = event.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                    uploadAndInsertImage(file);
                    return true;
                }
            }
            return false;
        }
    }
  }, [uploadAndInsertImage, isMounted]);

  useImperativeHandle(ref, () => ({
      focus: () => {
          if (editor && !editor.isDestroyed) {
              editor.commands.focus();
          }
      }
  }));

  useEffect(() => {
    if (initialPrompt && editor && !isAiProcessing && editor.isEmpty) {
        const streamDoc = async () => {
            setIsAiProcessing(true);
            setAiStatus('Generating draft...');
            
            try {
                const response = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: initialPrompt })
                });

                if (!response.body) throw new Error('Stream failed');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedHtml = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    accumulatedHtml += chunk;
                    
                    if (isMounted && !editor.isDestroyed) {
                        editor.commands.setContent(accumulatedHtml, false);
                    }
                }

                if (isMounted) {
                    onContentChange(editor.getJSON());
                    toast({ title: 'Draft generated', description: 'Your AI-powered document is ready for review.' });
                }
            } catch (error) {
                console.error('Streaming error:', error);
                if (isMounted) toast({ variant: 'destructive', title: 'Generation error' });
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

  useEffect(() => {
    if (editor && initialContent && editor.isEmpty && !initialPrompt) {
        editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent, initialPrompt]);

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        uploadAndInsertImage(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const setLink = () => {
    if (!editor || editor.isDestroyed) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter link URL', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const callAiAssistant = async (action: string, customInstruction?: string) => {
    if (!editor || editor.isDestroyed) return;
    
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const textToProcess = selectedText || editor.getText();
    const context = editor.getText();

    if (!textToProcess.trim()) {
        toast({ variant: 'destructive', title: 'Selection required', description: 'Highlight text for the AI to process.' });
        return;
    }

    setIsAiProcessing(true);
    setShowAiToolbar(false);
    setAiStatus('Processing...');

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToProcess,
          action,
          customGoal: customInstruction,
          context
        })
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
      }
    } catch (error: any) {
      if (isMounted) toast({ variant: 'destructive', title: 'Assistant error' });
    } finally {
      if (isMounted) {
          setIsAiProcessing(false);
          setAiStatus('');
      }
    }
  };

  const discardAiSuggestion = () => {
      if (!editor || editor.isDestroyed || !aiPreview) return;
      const { from, to, originalText } = aiPreview;
      editor.chain().focus().setTextSelection({ from, to }).deleteSelection().insertContentAt(from, originalText).unsetMark('strike').run();
      setAiPreview(null);
  };

  const acceptAiSuggestion = () => {
      if (!editor || editor.isDestroyed || !aiPreview) return;
      const { from, to, text } = aiPreview;
      editor.chain().focus().setTextSelection({ from, to }).deleteSelection().unsetMark('strike').insertContentAt(from, text).run();
      setAiPreview(null);
  };

  if (!editor) return null;

  return (
    <div className="group relative">
      <input type="file" ref={fileInputRef} onChange={handleImageInput} accept="image/*" className="hidden" />

      {editable && !editor.isDestroyed && (
        <TooltipProvider delayDuration={0}>
          <div className="sticky top-14 z-30 mx-auto w-fit bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl p-1.5 rounded-[2rem] flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-all hover:opacity-100 mb-4">
              {isAiProcessing && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full whitespace-nowrap animate-in slide-in-from-bottom-2 duration-300 shadow-xl border border-white/10">
                      <div className="flex items-center gap-3">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{aiStatus || 'Processing...'}</span>
                      </div>
                  </div>
              )}

              <div className="flex items-center gap-0.5">
                  <div className="flex items-center px-1">
                      <Button onClick={() => setShowAiToolbar(!showAiToolbar)} className={cn("h-9 rounded-2xl px-4 gap-2 font-black text-[10px] uppercase tracking-widest transition-all", showAiToolbar ? "bg-primary text-white shadow-lg scale-105" : "bg-slate-900 text-white hover:bg-slate-800")}>
                          <Sparkles className={cn("h-3.5 w-3.5", showAiToolbar && "animate-pulse")} /> Assistant
                      </Button>
                  </div>
                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />
                  <div className="flex items-center gap-1 px-1">
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={<Heading1 className="h-4 w-4" />} label="Heading 1" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={<Heading2 className="h-4 w-4" />} label="Heading 2" />
                  </div>
                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />
                  <div className="flex items-center gap-0.5 px-1">
                      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} icon={<AlignLeft className="h-4 w-4" />} label="Align Left" />
                      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} icon={<AlignCenter className="h-4 w-4" />} label="Align Center" />
                      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} icon={<AlignRight className="h-4 w-4" />} label="Align Right" />
                      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} icon={<AlignJustify className="h-4 w-4" />} label="Align Justify" />
                  </div>
                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />
                  <div className="flex items-center gap-0.5 px-1">
                      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={<Bold className="h-4 w-4" />} label="Bold" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={<Italic className="h-4 w-4" />} label="Italic" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} icon={<Palette className="h-4 w-4" />} label="Highlight" />
                  </div>
                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />
                  <div className="flex items-center gap-0.5 px-1">
                      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={<List className="h-4 w-4" />} label="Bullet List" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} icon={<CheckSquare className="h-4 w-4" />} label="Task List" />
                  </div>
                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />
                  <div className="flex items-center gap-0.5 px-1">
                      <ToolbarButton onClick={setLink} active={editor.isActive('link')} icon={<LinkIcon className="h-4 w-4" />} label="Insert Link" />
                      <ToolbarButton onClick={() => fileInputRef.current?.click()} disabled={isUploading} icon={isUploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <ImageIcon className="h-4 w-4" />} label="Attach Image" />
                      <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-slate-500 hover:bg-slate-100">
                                  <Grid className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1 border-slate-100 shadow-2xl">
                              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400 p-2">Grid Control</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="gap-3 font-semibold text-xs py-2 rounded-lg cursor-pointer">
                                  <TableIcon className="h-4 w-4 text-primary" /> Insert 3x3 Table
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-50" />
                              <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()} disabled={!editor.isActive('table')} className="gap-3 font-semibold text-xs py-2 rounded-lg cursor-pointer">
                                  <Rows className="h-4 w-4" /> Add Row After
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={!editor.isActive('table')} className="gap-3 font-semibold text-xs py-2 rounded-lg cursor-pointer">
                                  <Columns className="h-4 w-4" /> Add Column After
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-50" />
                              <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} disabled={!editor.isActive('table')} className="gap-3 font-semibold text-xs py-2 rounded-lg cursor-pointer text-red-600 focus:text-red-600">
                                  <Trash2 className="h-4 w-4" /> Delete Table
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
              </div>

              {showAiToolbar && (
                  <div className="w-full px-2 py-1.5 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-1.5">
                        <div className="h-px flex-1 bg-slate-100" />
                        <AiAction icon={<Wand2 className="h-3 w-3" />} label="Improve" onClick={() => callAiAssistant('improve')} />
                        <AiAction icon={<Languages className="h-3 w-3" />} label="Fix Grammar" onClick={() => callAiAssistant('fix-grammar')} />
                        <AiAction icon={<Type className="h-3 w-3" />} label="Professional" onClick={() => callAiAssistant('professional')} />
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>
                      <div className="flex items-center gap-2 px-2 pb-1">
                          <Input placeholder="Type a custom goal..." value={customGoal} onChange={(e) => setCustomGoal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && callAiAssistant('custom', customGoal)} className="h-9 rounded-xl bg-slate-50 border-none font-bold text-[11px]" />
                          <Button disabled={!customGoal.trim()} onClick={() => callAiAssistant('custom', customGoal)} size="icon" className="h-9 w-9 rounded-xl shrink-0"><Send className="h-3.5 w-3.5" /></Button>
                      </div>
                  </div>
              )}
          </div>
        </TooltipProvider>
      )}

      {aiPreview && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-500">
              <Card className="border-none shadow-2xl rounded-full bg-slate-900 text-white overflow-hidden py-2 px-6 flex items-center gap-6 border border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20 text-primary"><Sparkles className="h-4 w-4" /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review changes</p>
                </div>
                <Separator orientation="vertical" className="h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                    <Button onClick={acceptAiSuggestion} variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white"><Check className="h-5 w-5" /></Button>
                    <Button onClick={discardAiSuggestion} variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white"><X className="h-5 w-5" /></Button>
                </div>
              </Card>
          </div>
      )}

      <div className={cn("transition-opacity", (isAiProcessing && editor.isEmpty) ? "opacity-20" : "opacity-100")}>
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
                    className={cn("h-8 w-8 rounded-xl transition-all", active ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:bg-slate-100")}>
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
        <Button variant="ghost" size="sm" onClick={onClick} className="h-8 rounded-xl px-3 gap-2 font-bold text-[9px] uppercase tracking-widest text-slate-500 hover:bg-white hover:text-primary transition-all">
            {icon} {label}
        </Button>
    );
}
