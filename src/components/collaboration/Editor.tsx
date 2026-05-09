'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
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
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useStorage, useAuth } from '@/firebase';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

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

  // Helper to handle the actual upload and insertion
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
      Placeholder.configure({
        placeholder: 'Type "/" for commands...',
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
    ],
    content: initialContent,
    editable: editable,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON());
    },
    editorProps: {
        attributes: {
            class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px] text-slate-700 leading-relaxed text-lg font-medium'
        },
        // Handle Drag and Drop
        handleDrop: (view, event, slice, moved) => {
            if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                const file = event.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    uploadAndInsertImage(file);
                    return true; // handled
                }
            }
            return false;
        },
        // Handle Paste
        handlePaste: (view, event) => {
            if (event.clipboardData && event.dataTransfer && event.clipboardData.files && event.clipboardData.files[0]) {
                const file = event.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                    uploadAndInsertImage(file);
                    return true; // handled
                }
            }
            return false;
        }
    }
  }, [uploadAndInsertImage]); // Re-run if handler changes

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
        <div className="sticky top-14 z-10 mx-auto w-fit bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl p-1.5 rounded-[1.5rem] flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-all hover:opacity-100 mb-6">
            <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 px-1">
                    <ToolbarButton 
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
                        active={editor.isActive('heading', { level: 1 })}
                        icon={<Heading1 className="h-4 w-4" />}
                    />
                    <ToolbarButton 
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
                        active={editor.isActive('heading', { level: 2 })}
                        icon={<Heading2 className="h-4 w-4" />}
                    />
                </div>
                
                <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                <div className="flex items-center gap-1 px-1">
                    <ToolbarButton 
                        onClick={() => editor.chain().focus().toggleBold().run()} 
                        active={editor.isActive('bold')}
                        icon={<Bold className="h-4 w-4" />}
                    />
                    <ToolbarButton 
                        onClick={() => editor.chain().focus().toggleItalic().run()} 
                        active={editor.isActive('italic')}
                        icon={<Italic className="h-4 w-4" />}
                    />
                </div>

                <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                <div className="flex items-center gap-1 px-1">
                    <ToolbarButton 
                        onClick={() => editor.chain().focus().toggleBulletList().run()} 
                        active={editor.isActive('bulletList')}
                        icon={<List className="h-4 w-4" />}
                    />
                    <ToolbarButton 
                        onClick={() => editor.chain().focus().toggleTaskList().run()} 
                        active={editor.isActive('taskList')}
                        icon={<CheckSquare className="h-4 w-4" />}
                    />
                </div>

                <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                <div className="flex items-center gap-1 px-1">
                    <ToolbarButton 
                        onClick={setLink} 
                        active={editor.isActive('link')}
                        icon={<LinkIcon className="h-4 w-4" />}
                    />
                    <ToolbarButton 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isUploading}
                        icon={isUploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <ImageIcon className="h-4 w-4" />}
                    />
                </div>

                <Separator orientation="vertical" className="h-6 mx-1 bg-slate-200" />

                <div className="flex items-center gap-1 px-1">
                    <ToolbarButton 
                        onClick={() => editor.chain().focus().undo().run()} 
                        disabled={!editor.can().undo()}
                        icon={<Undo2 className="h-4 w-4" />}
                    />
                    <ToolbarButton 
                        onClick={() => editor.chain().focus().redo().run()} 
                        disabled={!editor.can().redo()}
                        icon={<Redo2 className="h-4 w-4" />}
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
      )}

      <EditorContent editor={editor} />
      
      {editable && (
          <div className="pt-6 mt-6 border-t border-slate-50 flex items-center justify-between opacity-30">
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

function ToolbarButton({ onClick, active, disabled, icon }: { onClick: () => void, active?: boolean, disabled?: boolean, icon: React.ReactNode }) {
    return (
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { e.preventDefault(); onClick(); }} 
            disabled={disabled}
            className={cn(
                "h-9 w-9 rounded-xl transition-all",
                active ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "text-slate-500 hover:bg-slate-100"
            )}
        >
            {icon}
        </Button>
    );
}
