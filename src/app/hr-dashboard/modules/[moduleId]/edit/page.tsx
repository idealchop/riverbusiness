'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Edit, 
  X,
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Underline as UnderlineIcon,
  CheckSquare,
  Baseline
} from 'lucide-react';
import type { AppUser, HRLearningModule } from '@/lib/types';
import { FullScreenLoader } from '@/components/ui/loader';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

const moduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  contentType: z.enum(['video', 'image', 'article']),
  contentUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  textContent: z.string().optional(),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;

const COLORS = [
    { label: 'Default', value: 'inherit' },
    { label: 'Slate', value: '#64748b' },
    { label: 'Red', value: '#ef4444' },
    { label: 'Orange', value: '#f97316' },
    { label: 'Amber', value: '#f59e0b' },
    { label: 'Green', value: '#22c55e' },
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Indigo', value: '#6366f1' },
    { label: 'Purple', value: '#a855f7' },
    { label: 'Pink', value: '#ec4899' },
];

export default function EditModulePage() {
  const router = useRouter();
  const { moduleId } = useParams();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

  const companyId = user?.companyId || user?.clientId || null;

  const moduleRef = useMemoFirebase(
    () => (firestore && companyId && moduleId) ? doc(firestore, 'hr_companies', companyId, 'learningModules', moduleId as string) : null,
    [firestore, companyId, moduleId]
  );
  const { data: module, isLoading: isModuleLoading } = useDoc<HRLearningModule>(moduleRef);

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'General',
      contentType: 'article',
      contentUrl: '',
      textContent: '',
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Edit your training documentation...' }),
    ],
    editorProps: {
        attributes: {
            class: 'prose prose-slate max-w-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none min-h-[500px] text-slate-700 leading-relaxed text-lg font-normal pb-40'
        }
    },
    onUpdate: ({ editor }) => {
      form.setValue('textContent', editor.getHTML(), { shouldDirty: true });
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  });

  useEffect(() => {
    if (module) {
      form.reset({
        title: module.title,
        description: module.description,
        category: module.category,
        contentType: module.contentType,
        contentUrl: module.contentUrl || '',
        textContent: module.textContent || '',
      });
      if (editor && module.textContent) {
          editor.commands.setContent(module.textContent);
      }
    }
  }, [module, form, editor]);

  const onSubmit = async (values: ModuleFormValues) => {
    if (!firestore || !companyId || !moduleId) return;

    setIsSubmitting(true);
    try {
      const targetModuleRef = doc(firestore, 'hr_companies', companyId, 'learningModules', moduleId as string);
      await updateDoc(targetModuleRef, {
        ...values,
        updatedAt: serverTimestamp()
      });

      toast({ title: 'Module Synchronized', description: 'Changes saved to the organizational library.' });
      router.push(`/hr-dashboard/modules/${moduleId}`);
    } catch (error) {
      console.error("Error updating module:", error);
      toast({ variant: 'destructive', title: 'Action failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = form.watch('contentType');

  if (isUserLoading || isUserDocLoading || (isModuleLoading && companyId)) {
    return <FullScreenLoader text="Opening architecture tools..." />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-hidden">
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b px-4 sm:px-8 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push(`/hr-dashboard/modules/${moduleId}`)}
                    className="h-9 px-3 gap-2 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Discard</span>
                </Button>
                <div className="h-4 w-px bg-slate-100 hidden sm:block" />
                <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">Edit Module</span>
                </div>
            </div>
            <Button 
                onClick={form.handleSubmit(onSubmit)} 
                disabled={isSubmitting}
                className="rounded-xl h-10 px-8 font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
            >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                Sync
            </Button>
        </div>

        <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto px-6 py-12 pb-40">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                        <div className="space-y-10">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <input 
                                                placeholder="Module Title" 
                                                className="w-full text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 bg-transparent border-none focus:ring-0 focus-visible:ring-0 focus:outline-none placeholder:text-slate-200"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8 pt-4">
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Category</FormLabel>
                                            <FormControl>
                                                <input 
                                                    placeholder="e.g. Safety" 
                                                    className="w-full h-10 bg-transparent border-none focus:ring-0 focus-visible:ring-0 focus:outline-none text-sm font-bold text-slate-900 p-0" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="contentType"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Format</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10 rounded-none bg-transparent border-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-bold p-0 shadow-none">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-2xl">
                                                    <SelectItem value="article">Text Document</SelectItem>
                                                    <SelectItem value="video">Video Instruction</SelectItem>
                                                    <SelectItem value="image">Image/Graphic</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Brief Overview</FormLabel>
                                        <FormControl>
                                            <textarea 
                                                placeholder="Enter a short overview of this module..." 
                                                className="w-full min-h-[60px] bg-transparent border-none focus:ring-0 focus-visible:ring-0 focus:outline-none text-lg font-medium text-slate-500 resize-none p-0 leading-relaxed" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {(selectedType === 'video' || selectedType === 'image') && (
                                <FormField
                                    control={form.control}
                                    name="contentUrl"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Media URL</FormLabel>
                                            <FormControl><Input placeholder="https://..." className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-mono text-xs shadow-none focus:ring-0 focus-visible:ring-0" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {selectedType === 'article' && (
                                <div 
                                    className="space-y-6 pt-4 animate-in fade-in slide-in-from-top-2"
                                    onMouseEnter={() => setIsHovering(true)}
                                    onMouseLeave={() => setIsHovering(false)}
                                >
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Full Documentation</FormLabel>
                                    
                                    {editor && (
                                        <div className={cn(
                                            "sticky top-20 z-40 mx-auto w-fit p-1.5 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-[2rem] flex items-center gap-1 transition-all duration-300",
                                            (isFocused || isHovering) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                                        )}>
                                            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={<Heading1 className="h-4 w-4" />} />
                                            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={<Heading2 className="h-4 w-4" />} />
                                            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} icon={<Heading3 className="h-4 w-4" />} />
                                            <Separator orientation="vertical" className="h-6 mx-1" />
                                            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={<Bold className="h-4 w-4" />} />
                                            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={<Italic className="h-4 w-4" />} />
                                            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon={<UnderlineIcon className="h-4 w-4" />} />
                                            <Separator orientation="vertical" className="h-6 mx-1" />
                                            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} icon={<AlignLeft className="h-4 w-4" />} />
                                            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} icon={<AlignCenter className="h-4 w-4" />} />
                                            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} icon={<AlignRight className="h-4 w-4" />} />
                                            <Separator orientation="vertical" className="h-6 mx-1" />
                                            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={<List className="h-4 w-4" />} />
                                            <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} icon={<CheckSquare className="h-4 w-4" />} />
                                            <Separator orientation="vertical" className="h-6 mx-1" />
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl"><Baseline className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="p-2 grid grid-cols-5 gap-1 rounded-xl bg-white border-slate-100 shadow-2xl">
                                                    {COLORS.map(c => (
                                                        <button key={c.value} type="button" onClick={() => editor.chain().focus().setColor(c.value === 'inherit' ? '' : c.value).run()} 
                                                            className={cn("h-6 w-6 rounded-lg border border-slate-100 flex items-center justify-center", editor.getAttributes('textStyle').color === c.value && "ring-2 ring-primary")} 
                                                            style={{ backgroundColor: c.value === 'inherit' ? 'transparent' : c.value }}>
                                                            {c.value === 'inherit' && <X className="h-3 w-3 text-slate-400" />}
                                                        </button>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}

                                    <div 
                                        className="min-h-[600px] transition-all cursor-text border-none outline-none ring-0 focus:ring-0 focus-visible:ring-0"
                                        onClick={() => editor?.commands.focus()}
                                    >
                                        <EditorContent editor={editor} className="outline-none border-none ring-0 focus:ring-0 focus-visible:ring-0" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                </Form>
            </div>
        </ScrollArea>
    </div>
  );
}

function ToolbarButton({ onClick, active, icon }: any) {
    return (
        <Button 
            type="button"
            variant="ghost" 
            size="icon" 
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className={cn("h-8 w-8 rounded-xl transition-all", active ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100")}
        >
            {icon}
        </Button>
    );
}
