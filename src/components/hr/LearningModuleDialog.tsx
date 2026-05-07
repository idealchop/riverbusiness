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
  DialogFooter
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
import { BookOpen, Video, Image as ImageIcon, FileText } from 'lucide-react';
import type { HRLearningModule } from '@/lib/types';

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
      <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-2xl">
        <div className="p-8">
            <DialogHeader className="mb-6">
                <div className="p-3 w-fit rounded-2xl bg-blue-50 text-primary mb-4">
                    <BookOpen className="h-6 w-6" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">
                    {moduleToEdit ? 'Edit Module' : 'Create Module'}
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">Design training materials authorized for your team.</DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Module Title</FormLabel>
                            <FormControl><Input placeholder="e.g. Daily Sanitation Flow" className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary font-semibold" {...field} /></FormControl>
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
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</FormLabel>
                                <FormControl><Input placeholder="e.g. Safety" className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contentType"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Format</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100"><SelectValue /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="video">Video URL</SelectItem>
                                        <SelectItem value="image">Image Display</SelectItem>
                                        <SelectItem value="article">Text Article</SelectItem>
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
                                <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {selectedType === 'video' ? 'Embed URL' : 'Image URL'}
                                </FormLabel>
                                <FormControl><Input placeholder="https://..." className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none" {...field} /></FormControl>
                                <FormDescription className="text-[10px]">Provide a public URL for the media.</FormDescription>
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
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Brief Overview</FormLabel>
                            <FormControl><Textarea placeholder="What will the team learn?" className="rounded-xl min-h-[80px] bg-slate-50 border-slate-100 shadow-none focus-visible:ring-primary" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    {selectedType === 'article' && (
                        <FormField
                            control={form.control}
                            name="textContent"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Article Body</FormLabel>
                                <FormControl><Textarea placeholder="Enter detailed training instructions..." className="rounded-xl min-h-[150px] bg-slate-50 border-slate-100 shadow-none" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs font-bold px-6">Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 px-10 font-bold text-xs shadow-md">
                            {isSubmitting ? 'Processing...' : (moduleToEdit ? 'Save Changes' : 'Authorize & Publish')}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
