'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
    Undo2,
    Redo2,
    Link as LinkIcon,
    Image as ImageIcon,
    Loader2,
    Table as TableIcon,
    Quote,
    Trash2,
    Plus,
    Underline as UnderlineIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Combine,
    Split,
    Highlighter,
    SeparatorHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useStorage, useAuth } from '@/firebase';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
        placeholder: 'press "/" for commands...',
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

  const insertGrid = () => {
      if (!editor) return;
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      toast({ title: 'Grid inserted' });
  };

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        uploadAndInsertImage(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!editor) return null;

  return (
    <div className="group">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageInput} 
        accept="image/*" 
        className="hidden" 
      />

      {editable && (
        <TooltipProvider delayDuration={0}>
          <div className="sticky top-14 z-30 mx-auto w-fit bg-white/90 backdrop-blur-xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-1.5 rounded-[1.5rem] flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-all hover:opacity-100 mb-4">
              <div className="flex items-center gap-0.5">
                  {/* Text Structure */}
                  <div className="flex items-center gap-1 px-1">
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
                          active={editor.isActive('heading', { level: 1 })}
                          icon={<Heading1 className="h-4 w-4" />}
                          label="Main Heading"
                      />
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
                          active={editor.isActive('heading', { level: 2 })}
                          icon={<Heading2 className="h-4 w-4" />}
                          label="Sub Heading"
                      />
                  </div>
                  
                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                  {/* Formatting */}
                  <div className="flex items-center gap-0.5 px-1">
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().toggleBold().run()} 
                          active={editor.isActive('bold')}
                          icon={<Bold className="h-4 w-4" />}
                          label="Bold"
                      />
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().toggleItalic().run()} 
                          active={editor.isActive('italic')}
                          icon={<Italic className="h-4 w-4" />}
                          label="Italic"
                      />
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().toggleUnderline().run()} 
                          active={editor.isActive('underline')}
                          icon={<UnderlineIcon className="h-4 w-4" />}
                          label="Underline"
                      />
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().toggleHighlight().run()} 
                          active={editor.isActive('highlight')}
                          icon={<Highlighter className="h-4 w-4" />}
                          label="Highlight"
                      />
                  </div>

                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                  {/* Alignment */}
                  <div className="flex items-center gap-0.5 px-1">
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().setTextAlign('left').run()} 
                          active={editor.isActive({ textAlign: 'left' })}
                          icon={<AlignLeft className="h-4 w-4" />}
                          label="Align Left"
                      />
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().setTextAlign('center').run()} 
                          active={editor.isActive({ textAlign: 'center' })}
                          icon={<AlignCenter className="h-4 w-4" />}
                          label="Align Center"
                      />
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().setTextAlign('right').run()} 
                          active={editor.isActive({ textAlign: 'right' })}
                          icon={<AlignRight className="h-4 w-4" />}
                          label="Align Right"
                      />
                  </div>

                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                  {/* Lists & Blocks */}
                  <div className="flex items-center gap-0.5 px-1">
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().toggleBulletList().run()} 
                          active={editor.isActive('bulletList')}
                          icon={<List className="h-4 w-4" />}
                          label="Bullet List"
                      />
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().toggleTaskList().run()} 
                          active={editor.isActive('taskList')}
                          icon={<CheckSquare className="h-4 w-4" />}
                          label="Task List"
                      />
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().toggleBlockquote().run()} 
                          active={editor.isActive('blockquote')}
                          icon={<Quote className="h-4 w-4" />}
                          label="Blockquote"
                      />
                  </div>

                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                  {/* Table Controls (Dynamic) */}
                  <div className="flex items-center gap-0.5 px-1 bg-blue-50/50 rounded-xl">
                      <ToolbarButton 
                          onClick={insertGrid} 
                          active={editor.isActive('table')}
                          icon={<TableIcon className="h-4 w-4" />}
                          label="New Grid"
                      />
                      {editor.isActive('table') && (
                          <div className="flex items-center gap-0.5 animate-in fade-in zoom-in-95 duration-200">
                               <ToolbarButton 
                                  onClick={() => editor.chain().focus().addRowAfter().run()} 
                                  icon={<Plus className="h-3 w-3" />}
                                  label="Add Row Below"
                              />
                              <ToolbarButton 
                                  onClick={() => editor.chain().focus().addColumnAfter().run()} 
                                  icon={<div className="flex items-center rotate-90"><Plus className="h-3 w-3" /></div>}
                                  label="Add Column After"
                              />
                              <ToolbarButton 
                                  onClick={() => editor.chain().focus().mergeCells().run()} 
                                  icon={<Combine className="h-3.5 w-3.5" />}
                                  label="Merge Cells"
                              />
                              <ToolbarButton 
                                  onClick={() => editor.chain().focus().splitCell().run()} 
                                  icon={<Split className="h-3.5 w-3.5" />}
                                  label="Split Cell"
                              />
                              <ToolbarButton 
                                  onClick={() => editor.chain().focus().deleteTable().run()} 
                                  icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />}
                                  label="Delete Grid"
                              />
                          </div>
                      )}
                  </div>

                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                  {/* Media & Misc */}
                  <div className="flex items-center gap-0.5 px-1">
                      <ToolbarButton 
                          onClick={setLink} 
                          active={editor.isActive('link')}
                          icon={<LinkIcon className="h-4 w-4" />}
                          label="Link"
                      />
                      <ToolbarButton 
                          onClick={() => fileInputRef.current?.click()} 
                          disabled={isUploading}
                          icon={isUploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <ImageIcon className="h-4 w-4" />}
                          label="Image"
                      />
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().setHorizontalRule().run()} 
                          icon={<SeparatorHorizontal className="h-4 w-4" />}
                          label="Divider"
                      />
                  </div>

                  <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                  {/* History */}
                  <div className="flex items-center gap-0.5 px-1">
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().undo().run()} 
                          disabled={!editor.can().undo()}
                          icon={<Undo2 className="h-4 w-4" />}
                          label="Undo"
                      />
                      <ToolbarButton 
                          onClick={() => editor.chain().focus().redo().run()} 
                          disabled={!editor.can().redo()}
                          icon={<Redo2 className="h-4 w-4" />}
                          label="Redo"
                      />
                  </div>
              </div>
              
              {isUploading && (
                  <div className="w-full px-4 pb-1 animate-in fade-in slide-in-from-top-1 duration-300">
                      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                          />
                      </div>
                  </div>
              )}
          </div>
        </TooltipProvider>
      )}

      <EditorContent editor={editor} />
      
      {editable && (
          <div className="pt-6 mt-12 border-t border-slate-50 flex items-center justify-between opacity-30">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Collaborative State Active</p>
              <div className="flex items-center gap-1">
                  <span className="p-1 rounded-md border text-[8px] font-black uppercase tracking-tighter">Enter</span>
                  <span className="text-[8px] font-bold text-slate-400">new block</span>
              </div>
          </div>
      )}
    </div>
  );
}

function ToolbarButton({ onClick, active, disabled, icon, label }: { onClick: () => void, active?: boolean, disabled?: boolean, icon: React.ReactNode, label: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => { e.preventDefault(); onClick(); }} 
                    disabled={disabled}
                    className={cn(
                        "h-8 w-8 rounded-xl transition-all",
                        active ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "text-slate-500 hover:bg-slate-100"
                    )}
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
