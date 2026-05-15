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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { 
  Save, 
  Loader2, 
  FilePlus,
  X,
  ChevronDown
} from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { FullScreenLoader } from '@/components/ui/loader';
import { Editor } from '@/components/collaboration/Editor';
import { cn } from '@/lib/utils';

const moduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  contentType: z.enum(['video', 'image', 'article']),
  contentUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  textContent: z.any().optional(),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;

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
      textContent: { type: 'doc', content: [{ type: 'paragraph' }] },
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
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b px-4 sm:px-8 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/hr-dashboard/modules')}
                    className="h-9 px-3 gap-2 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Discard</span>
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
                                                className="w-full text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 bg-transparent border-none focus:ring-0 focus-visible:ring-0 focus:outline-none placeholder:text-slate-100"
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
                                        <FormItem className="space-y-3">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Media URL</FormLabel>
                                            <FormControl><Input placeholder="https://..." className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-mono text-xs shadow-none focus:ring-0 focus-visible:ring-0" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {selectedType === 'article' && (
                                <div className="space-y-6 pt-4">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Full Documentation</FormLabel>
                                    <div className="min-h-[500px]">
                                        <Editor 
                                            initialContent={form.getValues('textContent')} 
                                            onContentChange={(json) => form.setValue('textContent', json)}
                                            companyId={user?.companyId}
                                        />
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
