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
import { ArrowLeft, BookOpen, Save, Loader2, Edit, X } from 'lucide-react';
import type { AppUser, HRLearningModule } from '@/lib/types';
import { FullScreenLoader } from '@/components/ui/loader';

const moduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  contentType: z.enum(['video', 'image', 'article']),
  contentUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  textContent: z.string().optional(),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;

export default function EditModulePage() {
  const router = useRouter();
  const { moduleId } = useParams();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    }
  }, [module, form]);

  const onSubmit = async (values: ModuleFormValues) => {
    if (!firestore || !companyId || !moduleId) return;

    setIsSubmitting(true);
    try {
      const targetModuleRef = doc(firestore, 'hr_companies', companyId, 'learningModules', moduleId as string);
      await updateDoc(targetModuleRef, {
        ...values,
        updatedAt: serverTimestamp()
      });

      toast({ title: 'Module Synchronized', description: 'Changes have been pushed to the organizational library.' });
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
        {/* Editor Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b px-4 sm:px-8 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push(`/hr-dashboard/modules/${moduleId}`)}
                    className="h-9 px-3 gap-2 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Discard Edits</span>
                </Button>
                <div className="h-4 w-px bg-slate-100 hidden sm:block" />
                <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">Core Architecture Edit</span>
                </div>
            </div>
            <Button 
                onClick={form.handleSubmit(onSubmit)} 
                disabled={isSubmitting}
                className="rounded-xl h-10 px-8 font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
            >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                Sync Updates
            </Button>
        </div>

        <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto px-6 py-12 pb-40">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                        <div className="space-y-8">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <input 
                                                placeholder="Module Title" 
                                                className="w-full text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 bg-transparent border-none focus:ring-0 focus:outline-none"
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
                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Target Category</FormLabel>
                                            <FormControl><Input className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="contentType"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Media Format</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold"><SelectValue /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-2xl">
                                                    <SelectItem value="video">Instructional Video</SelectItem>
                                                    <SelectItem value="image">Visual Infographic</SelectItem>
                                                    <SelectItem value="article">Text Article</SelectItem>
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
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Module Brief</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                className="rounded-3xl min-h-[100px] bg-slate-50 border-slate-100 text-lg font-medium leading-relaxed p-6" 
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
                                        <FormItem className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Source URL</FormLabel>
                                            <FormControl><Input className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-mono text-xs" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {selectedType === 'article' && (
                                <FormField
                                    control={form.control}
                                    name="textContent"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3 pt-4 animate-in fade-in slide-in-from-top-2">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Full Documentation</FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    className="rounded-[2.5rem] min-h-[400px] bg-slate-50/50 border-slate-100 font-medium leading-loose text-lg p-10 italic shadow-inner" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    </form>
                </Form>
            </div>
        </ScrollArea>
    </div>
  );
}