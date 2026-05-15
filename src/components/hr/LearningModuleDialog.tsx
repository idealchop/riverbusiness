'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { BookOpen, Video, Image as ImageIcon, FileText, X } from 'lucide-react';
import type { HRLearningModule } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const moduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  contentType: z.enum(['video', 'image', 'article']),
  contentUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  textContent: z.string().optional(),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;

interface LearningModuleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  moduleToEdit: HRLearningModule | null;
}

export function LearningModuleDialog({ isOpen, onOpenChange, companyId, moduleToEdit }: LearningModuleDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      contentType: 'article',
      category: 'General',
    }
  });

  useEffect(() => {
    if (moduleToEdit) {
      form.reset({
        title: moduleToEdit.title,
        description: moduleToEdit.description,
        category: moduleToEdit.category,
        contentType: moduleToEdit.contentType,
        contentUrl: moduleToEdit.contentUrl || '',
        textContent: moduleToEdit.textContent || '',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        category: 'General',
        contentType: 'article',
        contentUrl: '',
        textContent: '',
      });
    }
  }, [moduleToEdit, form, isOpen]);

  const onSubmit = async (values: ModuleFormValues) => {
    if (!firestore || !companyId) return;
    setIsSubmitting(true);
    
    try {
      if (moduleToEdit) {
        const moduleRef = doc(firestore, 'hr_companies', companyId, 'learningModules', moduleToEdit.id);
        await updateDoc(moduleRef, {
            ...values,
            updatedAt: serverTimestamp()
        });
        toast({ title: 'Module updated' });
      } else {
        const modulesCol = collection(firestore, 'hr_companies', companyId, 'learningModules');
        await addDoc(modulesCol, {
          companyId,
          ...values,
          isPublished: true,
          createdAt: serverTimestamp()
        });
        toast({ title: 'Module created', description: 'The training material is now live in the hub.' });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error saving module:", error);
      toast({ variant: 'destructive', title: 'Operation failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = form.watch('contentType');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-8 pb-4 shrink-0 border-b bg-slate-50/50">
            <DialogHeader className="mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-primary">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                            {moduleToEdit ? 'Configure Module' : 'Architect Module'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium text-xs mt-1">Design training materials authorized for your team.</DialogDescription>
                    </div>
                </div>
            </DialogHeader>
        </div>
        
        <ScrollArea className="flex-1">
            <div className="p-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">1. Module Title</FormLabel>
                                <FormControl><Input placeholder="e.g. Daily Sanitation Flow" className="h-12 rounded-xl bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary font-bold text-slate-900" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">2. Category</FormLabel>
                                    <FormControl><Input placeholder="e.g. Safety" className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none font-semibold" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="contentType"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">3. Format</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100 font-semibold"><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="video" className="text-xs font-semibold">Video URL</SelectItem>
                                            <SelectItem value="image" className="text-xs font-semibold">Image Display</SelectItem>
                                            <SelectItem value="article" className="text-xs font-semibold">Text Article</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>

                        {(selectedType === 'video' || selectedType === 'image') && (
                            <FormField
                                control={form.control}
                                name="contentUrl"
                                render={({ field }) => (
                                    <FormItem className="animate-in slide-in-from-top-2 duration-300">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        {selectedType === 'video' ? 'Embed URL' : 'Image URL'}
                                    </FormLabel>
                                    <FormControl><Input placeholder="https://..." className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none font-mono text-xs" {...field} /></FormControl>
                                    <FormDescription className="text-[10px] font-medium text-slate-400">Provide a public URL for the training media.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">4. Brief Overview</FormLabel>
                                <FormControl><Textarea placeholder="What will the team learn? Summary for the card view." className="rounded-xl min-h-[80px] bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary text-sm font-medium" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedType === 'article' && (
                            <FormField
                                control={form.control}
                                name="textContent"
                                render={({ field }) => (
                                    <FormItem className="animate-in slide-in-from-top-2 duration-300">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">5. Authoritative Article Body</FormLabel>
                                    <FormControl><Textarea placeholder="Enter detailed training instructions... This content will be rendered in high-fidelity." className="rounded-2xl min-h-[250px] bg-slate-50 border-slate-100 shadow-none font-medium leading-relaxed" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </form>
                </Form>
            </div>
        </ScrollArea>

        <DialogFooter className="p-8 pt-4 bg-white border-t shrink-0">
            <div className="flex items-center justify-between w-full">
                <DialogClose asChild>
                    <Button type="button" variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">Cancel</Button>
                </DialogClose>
                <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting} className="rounded-xl h-12 px-12 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
                    {isSubmitting ? 'Syncing...' : (moduleToEdit ? 'Confirm Updates' : 'Publish to Hub')}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
