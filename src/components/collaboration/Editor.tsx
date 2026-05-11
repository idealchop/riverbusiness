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
    Sparkles,
    Check,
    X,
    Wand2,
    Languages,
    Type,
    ArrowRight,
    Palette,
    Send
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
  const [customGoal, setCustomGoal] = useState('');
  const [aiPreview, setAiPreview] = useState<{ text: string, originalText: string, from: number, to: number } | null>(null);

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

  const callAiAssistant = async (action: string, customInstruction?: string) => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const textToProcess = selectedText || editor.getText();
    const context = editor.getText();

    if (!textToProcess.trim()) {
        toast({ variant: 'destructive', title: 'Selection required', description: 'Please highlight some text first.' });
        return;
    }

    setIsAiProcessing(true);
    setShowAiToolbar(false);
    
    setAiStatus('Analyzing context...');
    const statusInterval = setInterval(() => {
        const statuses = ['Processing logic...', 'Improving flow...', 'Refining tone...', 'Finalizing suggestion...'];
        setAiStatus(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 1500);

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'The assistant is currently unavailable.');
      }

      const data = await response.json();

      if (data && data.suggestedText) {
          if (selectedText) {
              const combinedHtml = `<s>${selectedText}</s> ${data.suggestedText}`;
              
              editor.chain()
                .focus()
                .deleteRange(from, to)
                .insertContent(combinedHtml)
                .run();

              const newTo = editor.state.selection.to;
              
              setAiPreview({ 
                  text: data.suggestedText, 
                  originalText: selectedText,
                  from: from, 
                  to: newTo
              });

              toast({ title: 'AI suggestion applied' });
          } else {
              editor.chain().focus().insertContentAt(editor.state.doc.content.size, `\n\n${data.suggestedText}`).run();
              toast({ title: 'Content generated' });
          }
      } else {
          throw new Error('The AI was unable to generate a response.');
      }
    } catch (error: any) {
      console.error('AI Error:', error);
      toast({ variant: 'destructive', title: 'Assistant notice', description: error.message });
    } finally {
      clearInterval(statusInterval);
      setIsAiProcessing(false);
      setAiStatus('');
      setCustomGoal('');
    }
  };

  const discardAiSuggestion = () => {
      if (!editor || !aiPreview) return;
      
      editor.chain()
        .focus()
        .deleteRange(aiPreview.from, aiPreview.to)
        .insertContentAt(aiPreview.from, aiPreview.originalText)
        .run();
        
      setAiPreview(null);
      toast({ title: 'AI changes reverted' });
  };

  const acceptAiSuggestion = () => {
      if (!editor || !aiPreview) return;
      
      // Atomic transaction: Delete the whole comparison block and insert only the clean version
      // This effectively "removes the old version" and keeps only the new one
      editor.chain()
        .focus()
        .deleteRange(aiPreview.from, aiPreview.to)
        .insertContentAt(aiPreview.from, aiPreview.text)
        .unsetMark('strike') // Ensure the new text is not struck through
        .run();

      setAiPreview(null);
      toast({ title: 'AI suggestion accepted' });
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

      {editable && (
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
              <div className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl p-1 rounded-2xl flex items-center gap-1 animate-in fade-in zoom-in-95">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => callAiAssistant('improve')} 
                    className="h-8 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2 text-primary hover:bg-primary/5"
                  >
                      <Sparkles className="h-3.5 w-3.5" /> Improve
                  </Button>
                  <Separator orientation="vertical" className="h-4 mx-1" />
                  <Button variant="ghost" size="icon" onClick={() => callAiAssistant('fix-grammar')} className="h-8 w-8 rounded-lg text-slate-500 hover:text-primary" title="Fix grammar"><Languages className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => callAiAssistant('professional')} className="h-8 w-8 rounded-lg text-slate-500 hover:text-primary" title="Make professional"><Type className="h-3.5 w-3.5" /></Button>
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
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} icon={<Palette className="h-4 w-4" />} label="Highlight" />
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
                  <div className="w-full px-2 py-1.5 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-1.5">
                        <div className="h-px flex-1 bg-slate-100" />
                        <AiAction icon={<Wand2 className="h-3 w-3" />} label="Improve" onClick={() => callAiAssistant('improve')} />
                        <AiAction icon={<Languages className="h-3 w-3" />} label="Fix grammar" onClick={() => callAiAssistant('fix-grammar')} />
                        <AiAction icon={<Type className="h-3 w-3" />} label="Professional" onClick={() => callAiAssistant('professional')} />
                        <AiAction icon={<ArrowRight className="h-3 w-3" />} label="Continue" onClick={() => callAiAssistant('continue')} />
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>
                      <div className="flex items-center gap-2 px-2 pb-1">
                          <Input 
                            placeholder="Type a goal (e.g. Make this sound more persuasive)" 
                            value={customGoal}
                            onChange={(e) => setCustomGoal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && customGoal.trim() && callAiAssistant('custom', customGoal)}
                            className="h-9 rounded-xl bg-slate-50 border-none font-bold text-[11px] shadow-inner"
                          />
                          <Button 
                            disabled={!customGoal.trim()}
                            onClick={() => callAiAssistant('custom', customGoal)}
                            size="icon" 
                            className="h-9 w-9 rounded-xl shrink-0"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                      </div>
                  </div>
              )}
          </div>
        </TooltipProvider>
      )}

      {aiPreview && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-500">
              <Card className="border-none shadow-3xl rounded-full bg-slate-900 text-white overflow-hidden py-2 px-6 flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20 text-primary">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review changes</p>
                </div>
                
                <Separator orientation="vertical" className="h-4 bg-white/10" />

                <div className="flex items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    onClick={acceptAiSuggestion}
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-all"
                                >
                                    <Check className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-800 text-white text-[10px] font-bold border-none uppercase tracking-widest px-3 py-1">
                                Accept suggestion
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    onClick={discardAiSuggestion}
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-800 text-white text-[10px] font-bold border-none uppercase tracking-widest px-3 py-1">
                                Revert original
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
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
