'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { cn } from '@/lib/utils';
import { 
    Bold, 
    Italic, 
    List, 
    ListOrdered, 
    Heading1, 
    Heading2, 
    Heading3, 
    Quote, 
    CheckSquare,
    Undo2,
    Redo2,
    Type,
    Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface EditorProps {
  initialContent: any;
  onContentChange: (json: any) => void;
  editable?: boolean;
}

export function Editor({ initialContent, onContentChange, editable = true }: EditorProps) {
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
    ],
    content: initialContent,
    editable: editable,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON());
    },
    editorProps: {
        attributes: {
            class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px] text-slate-700 leading-loose text-lg font-medium'
        }
    }
  });

  // Keep content in sync if changed from outside (e.g. initial load)
  useEffect(() => {
    if (editor && initialContent && editor.isEmpty) {
        editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  if (!editor) return null;

  return (
    <div className="group">
      {/* Floating Toolbar - Only shown in editable mode */}
      {editable && (
        <div className="sticky top-14 z-10 mx-auto w-fit bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl p-1.5 rounded-[1.5rem] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all hover:opacity-100 mb-6">
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
                <ToolbarButton 
                    onClick={() => editor.chain().focus().setParagraph().run()} 
                    active={editor.isActive('paragraph')}
                    icon={<Type className="h-4 w-4" />}
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
                <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleCode().run()} 
                    active={editor.isActive('code')}
                    icon={<Code className="h-4 w-4" />}
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
                    onClick={() => editor.chain().focus().toggleOrderedList().run()} 
                    active={editor.isActive('orderedList')}
                    icon={<ListOrdered className="h-4 w-4" />}
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
      )}

      <EditorContent editor={editor} />
      
      {/* Footer hint - Only shown in editable mode */}
      {editable && (
          <div className="pt-10 mt-10 border-t border-slate-50 flex items-center justify-between opacity-30">
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
