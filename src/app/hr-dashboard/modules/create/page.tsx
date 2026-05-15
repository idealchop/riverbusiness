'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  FilePlus,
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
  X,
  Type,
  ChevronDown,
  Baseline
} from 'lucide-react';
import type { AppUser } from '@/lib/types';
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
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuLabel
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

export default function CreateModulePage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

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
      Placeholder.configure({ placeholder: 'Start typing your training documentation here...' }),
    ],
    onUpdate: ({ editor }) => {
      form.setValue('textContent', editor.getHTML(), { shouldDirty: true });
    }
  });

  const onSubmit = async (values: ModuleFormValues) => {
    const companyId = user?.companyId || user?.clientId;
    if (!firestore || !companyId) return;

    setIsSubmitting(true);
    try {
      const modulesCol = collection(firestore, 'hr_companies', companyId, 'learningModules');
      await addDoc(modulesCol, {
        companyId,
        ...values,
        isPublished: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({ title: 'Module Published', description: 'Training asset is now active in the hub.' });
      router.push('/hr-dashboard/modules');
    } catch (error) {
      console.error("Error creating module:", error);
      toast({ variant: 'destructive', title: 'Publication Failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = form.watch('contentType');

  if (isUserLoading || isUserDocLoading) return <FullScreenLoader text="Initializing workspace..." />;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-hidden">
        {/* Creation Header */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b px-4 sm:px-8 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/hr-dashboard/modules')}
                    className="h-9 px-3 gap-2 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Back</span>
                </Button>
                <div className="h-4 w-px bg-slate-100 hidden sm:block" />
                <div className="flex items-center gap-2">
                    <FilePlus className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">New Module</span>
                </div>
            </div>
            <Button 
                onClick={form.handleSubmit(onSubmit)} 
                disabled={isSubmitting}
                className="rounded-xl h-10 px-8 font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
            >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                Publish
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
                                                placeholder="Enter Module Title..." 
                                                className="w-full text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-slate-100"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Category</FormLabel>
                                            <FormControl><Input placeholder="e.g. Safety, Protocol" className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="contentType"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Format</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold"><SelectValue /></SelectTrigger>
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
                                    <FormItem className="space-y-3">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Brief Description</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Enter a short overview of this module..." 
                                                className="rounded-3xl min-h-[80px] bg-slate-50 border-slate-100 text-lg font-medium leading-relaxed p-6 shadow-none" 
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
                                            <FormControl><Input placeholder="https://..." className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-mono text-xs" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {selectedType === 'article' && (
                                <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-top-2">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Documentation Content</FormLabel>
                                    
                                    {/* Tooltip-style Floating Toolbar */}
                                    {editor && (
                                        <div className="sticky top-20 z-40 w-full p-1.5 bg-white border border-slate-200 shadow-xl rounded-2xl flex flex-wrap items-center gap-1">
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
                                                            className={cn("h-6 w-6 rounded-full border border-slate-100 flex items-center justify-center", editor.getAttributes('textStyle').color === c.value && "ring-2 ring-primary")} 
                                                            style={{ backgroundColor: c.value === 'inherit' ? 'transparent' : c.value }}>
                                                            {c.value === 'inherit' && <X className="h-3 w-3 text-slate-400" />}
                                                        </button>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}

                                    <div className="min-h-[600px] p-10 rounded-[2.5rem] bg-slate-50/50 border border-slate-100">
                                        <EditorContent editor={editor} className="prose prose-slate max-w-none focus:outline-none" />
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
