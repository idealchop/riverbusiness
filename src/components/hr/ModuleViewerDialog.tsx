'use client';

import React from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Video, Image as ImageIcon, FileText, Clock } from 'lucide-react';
import Image from 'next/image';
import type { HRLearningModule } from '@/lib/types';

interface ModuleViewerDialogProps {
  module: HRLearningModule | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModuleViewerDialog({ module, isOpen, onOpenChange }: ModuleViewerDialogProps) {
  if (!module) return null;

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return url;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[95vh] flex flex-col p-0 border-none shadow-3xl overflow-hidden rounded-[2rem] bg-white">
        <DialogHeader className="p-8 pb-4 bg-white border-b shrink-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-50 text-primary shadow-inner">
                        {module.contentType === 'video' ? <Video className="h-6 w-6" /> : 
                        module.contentType === 'image' ? <ImageIcon className="h-6 w-6" /> : 
                        <FileText className="h-6 w-6" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-none font-black text-[9px] uppercase tracking-[0.2em] h-5 px-2">
                                {module.category}
                            </Badge>
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 uppercase leading-none">
                            {module.title}
                        </DialogTitle>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                            {module.updatedAt ? format(module.updatedAt.toDate(), 'MMM d, yyyy') : 'Recent'}
                        </span>
                    </div>
                </div>
            </div>
            <DialogDescription className="sr-only">{module.title}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 bg-white">
            <div className="p-8 sm:p-12 space-y-12 max-w-4xl mx-auto">
                {module.contentType === 'video' && module.contentUrl && (
                    <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border-8 border-slate-50">
                        <iframe 
                            src={getEmbedUrl(module.contentUrl)} 
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                        />
                    </div>
                )}

                {module.contentType === 'image' && module.contentUrl && (
                    <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-white bg-slate-50">
                        <Image 
                            src={module.contentUrl} 
                            alt={module.title} 
                            fill 
                            className="object-cover"
                            data-ai-hint="training asset"
                        />
                    </div>
                )}

                <div className="space-y-10">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Overview</h3>
                        <p className="text-xl text-slate-600 font-medium leading-relaxed tracking-tight">
                            {module.description}
                        </p>
                    </div>

                    {module.contentType === 'article' && module.textContent && (
                        <div className="space-y-8 pt-10 border-t border-slate-50">
                            <div className="prose prose-slate max-w-none">
                                <div className="whitespace-pre-wrap text-slate-700 leading-loose text-lg font-normal bg-slate-50/30 p-10 rounded-[2.5rem] border border-slate-100 shadow-inner italic">
                                    {module.textContent}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="p-8 pt-0 max-w-4xl mx-auto flex items-center justify-center">
                 <div className="flex items-center gap-2.5 opacity-40">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organizational Asset</span>
                </div>
            </div>
        </ScrollArea>

        <DialogFooter className="p-8 pt-4 bg-white border-t shrink-0">
            <DialogClose asChild>
                <Button variant="ghost" className="rounded-xl h-12 px-12 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-900 transition-colors">
                    Close
                </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}