'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
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
import Underline from '@tiptap/extension-underline';
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
    Plus,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Highlighter,
    Sparkles,
    Check,
    X,
    Wand2,
    Languages,
    Type,
    ArrowRight,
    History,
    Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useStorage, useAuth } from '@/firebase';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from '@/components/ui/card';

interface EditorProps {
  initialContent: any;
  onContentChange: (json: any) => void;
  editable?: boolean;
}

export function Editor({ initialContent, onContentChange, editable = true }: EditorProps) {
  const storage = useStorage();
  const auth = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // AI States
  const [showAiToolbar, setShowAiToolbar] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [aiPreview, setAiPreview] = useState<{ text: string, originalText: string, from: number, to: number } | null>(null);

  const uploadAndInsertImage = useCallback(async (file: File) => {
    if (!editor || !storage || !auth?.currentUser) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please drop or paste an image file.' });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const path = `collab_images/${auth.currentUser.uid}/${Date.now()}-${file.name}`;

    try {
      const url = await uploadFileWithProgress(storage, auth, path, file, {}, (progress) => {
        setUploadProgress(progress);
      });
      editor.chain().focus().setImage({ src: url }).run();
      toast({ title: 'Image attached' });
    } catch (error) {
      console.error('Image upload failed:', error);
      toast({ variant: 'destructive', title: 'Upload failed', description: 'Could not attach image.' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [storage, auth, toast]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
          heading: { levels: [1, 2, 3] }
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
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
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    editable: editable,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON());
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
  }, [uploadAndInsertImage]);

  useEffect(() => {
    if (editor && initialContent && editor.isEmpty) {
        editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter link URL', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        uploadAndInsertImage(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // AI Assistant Logic
  const callAiAssistant = async (action: string) => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const textToProcess = selectedText || editor.getText();
    const context = editor.getText();

    if (!textToProcess.trim()) {
        toast({ variant: 'destructive', title: 'Selection required', description: 'Please type or highlight some text first.' });
        return;
    }

    setIsAiProcessing(true);
    setShowAiToolbar(false);
    
    setAiStatus('Analyzing your writing...');
    const statusInterval = setInterval(() => {
        const statuses = ['Analyzing context...', 'Improving flow...', 'Refining tone...', 'Finalizing suggestion...'];
        setAiStatus(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 1500);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToProcess,
          action,
          context
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'The assistant is currently unavailable.');
      }

      const data = await response.json();

      if (data && data.suggestedText) {
          if (selectedText) {
              setAiPreview({ 
                  text: data.suggestedText, 
                  originalText: selectedText,
                  from, 
                  to 
              });
          } else {
              editor.chain().focus().insertContentAt(editor.state.doc.content.size, `\n\n${data.suggestedText}`).run();
              toast({ title: 'Content generated' });
          }
      } else {
          throw new Error('The AI was unable to generate a response. Try selecting a different section of text.');
      }
    } catch (error: any) {
      console.error('AI Error:', error);
      toast({ variant: 'destructive', title: 'Assistant Notice', description: error.message });
    } finally {
      clearInterval(statusInterval);
      setIsAiProcessing(false);
      setAiStatus('');
    }
  };

  const applyAiSuggestion = () => {
      if (!editor || !aiPreview) return;
      
      editor.chain()
        .focus()
        .deleteRange(aiPreview.from, aiPreview.to)
        .insertContentAt(aiPreview.from, aiPreview.text)
        .run();
        
      setAiPreview(null);
      toast({ title: 'AI Changes Applied' });
  };

  if (!editor) return null;

  return (
    <div className="group relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageInput} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Tiptap Bubble Menu */}
      {editable && (
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
              <div className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl p-1 rounded-2xl flex items-center gap-1 animate-in fade-in zoom-in-95">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => callAiAssistant('improve')} 
                    className="h-8 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2 text-primary hover:bg-primary/5"
                  >
                      <Sparkles className="h-3.5 w-3.5" />✨ Improve
                  </Button>
                  <Separator orientation="vertical" className="h-4 mx-1" />
                  <Button variant="ghost" size="icon" onClick={() => callAiAssistant('fix-grammar')} className="h-8 w-8 rounded-lg text-slate-500 hover:text-primary" title="Fix Grammar"><Languages className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => callAiAssistant('professional')} className="h-8 w-8 rounded-lg text-slate-500 hover:text-primary" title="Make Professional"><Type className="h-3.5 w-3.5" /></Button>
              </div>
          </BubbleMenu>
      )}

      {editable && (
        <TooltipProvider delayDuration={0}>
          <div className="sticky top-14 z-30 mx-auto w-fit bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl p-1.5 rounded-[2rem] flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-all hover:opacity-100 mb-4">
              {isAiProcessing && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full whitespace-nowrap animate-in slide-in-from-bottom-2 duration-300 shadow-xl border border-white/10">
                      <div className="flex items-center gap-3">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{aiStatus}</span>
                      </div>
                  </div>
              )}

              <div className="flex items-center gap-0.5">
                  <div className="flex items-center px-1">
                      <Button 
                        onClick={() => setShowAiToolbar(!showAiToolbar)}
                        className={cn(
                            "h-9 rounded-2xl px-4 gap-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500",
                            showAiToolbar 
                                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                                : "bg-slate-900 text-white hover:bg-slate-800"
                        )}
                      >
                          <Sparkles className={cn("h-3.5 w-3.5", showAiToolbar && "animate-pulse")} />
                          Assistant
                      </Button>
                  </div>

                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                  <div className="flex items-center gap-1 px-1">
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={<Heading1 className="h-4 w-4" />} label="H1" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={<Heading2 className="h-4 w-4" />} label="H2" />
                  </div>
                  
                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                  <div className="flex items-center gap-0.5 px-1">
                      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={<Bold className="h-4 w-4" />} label="Bold" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={<Italic className="h-4 w-4" />} label="Italic" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} icon={<Highlighter className="h-4 w-4" />} label="Highlight" />
                  </div>

                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                  <div className="flex items-center gap-0.5 px-1">
                      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={<List className="h-4 w-4" />} label="List" />
                      <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} icon={<CheckSquare className="h-4 w-4" />} label="Tasks" />
                  </div>

                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                  <div className="flex items-center gap-0.5 px-1">
                      <ToolbarButton onClick={setLink} active={editor.isActive('link')} icon={<LinkIcon className="h-4 w-4" />} label="Link" />
                      <ToolbarButton onClick={() => fileInputRef.current?.click()} disabled={isUploading} icon={isUploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <ImageIcon className="h-4 w-4" />} label="Image" />
                  </div>
              </div>

              {showAiToolbar && (
                  <div className="w-full px-2 py-1.5 flex items-center gap-1.5 animate-in slide-in-from-top-2 duration-300">
                      <div className="h-px flex-1 bg-slate-100" />
                      <AiAction icon={<Wand2 className="h-3 w-3" />} label="Improve" onClick={() => callAiAssistant('improve')} />
                      <AiAction icon={<Languages className="h-3 w-3" />} label="Fix Grammar" onClick={() => callAiAssistant('fix-grammar')} />
                      <AiAction icon={<Type className="h-3 w-3" />} label="Professional" onClick={() => callAiAssistant('professional')} />
                      <AiAction icon={<ArrowRight className="h-3 w-3" />} label="Continue" onClick={() => callAiAssistant('continue')} />
                      <div className="h-px flex-1 bg-slate-100" />
                  </div>
              )}
          </div>
        </TooltipProvider>
      )}

      {/* AI Suggestion Card - Modern Diff UI */}
      {aiPreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
              <Card className="w-full max-w-2xl border-none shadow-3xl rounded-[2.5rem] bg-white overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="bg-slate-50 p-8 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">AI Suggestion</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verify and apply improvements</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setAiPreview(null)} className="rounded-full text-slate-400 hover:text-slate-900">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                  </div>
                  <CardContent className="p-8 space-y-8">
                      <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 flex items-center gap-2">
                            <History className="h-3.5 w-3.5" /> Original Text
                          </Label>
                          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 italic text-slate-400 line-through text-lg leading-relaxed">
                              {aiPreview.originalText}
                          </div>
                      </div>

                      <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5" /> AI Recommendation
                          </Label>
                          <div className="p-6 rounded-3xl bg-blue-50/50 border-2 border-primary/20 text-slate-900 font-bold text-xl leading-relaxed shadow-inner">
                              {aiPreview.text}
                          </div>
                      </div>
                  </CardContent>
                  <div className="p-8 pt-4 bg-slate-50 border-t flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Contextual refinement complete</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={() => setAiPreview(null)} className="h-12 px-8 rounded-xl font-bold text-xs">
                            Discard
                        </Button>
                        <Button onClick={applyAiSuggestion} className="h-12 px-12 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
                            <Check className="mr-2 h-4 w-4" /> Apply Changes
                        </Button>
                      </div>
                  </div>
              </Card>
          </div>
      )}

      <div className="relative">
          <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, active, disabled, icon, label }: { onClick: () => void, active?: boolean, disabled?: boolean, icon: React.ReactNode, label: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); onClick(); }} disabled={disabled}
                    className={cn("h-8 w-8 rounded-xl transition-all", active ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "text-slate-500 hover:bg-slate-100")}>
                    {icon}
                </Button>
            </TooltipTrigger>
            <TooltipContent className="rounded-xl font-bold text-[9px] uppercase tracking-widest bg-slate-900 text-white border-none px-3 py-1.5 shadow-2xl">
                {label}
            </TooltipContent>
        </Tooltip>
    );
}

function AiAction({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
    return (
        <Button variant="ghost" size="sm" onClick={onClick}
            className="h-8 rounded-xl px-3 gap-2 font-bold text-[9px] uppercase tracking-widest text-slate-500 hover:bg-white hover:text-primary transition-all">
            {icon}
            {label}
        </Button>
    );
}
