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
import { Video, Image as ImageIcon, FileText, CheckCircle2, Clock, Globe } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { HRLearningModule } from '@/lib/types';

interface ModuleViewerDialogProps {
  module: HRLearningModule | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModuleViewerDialog({ module, isOpen, onOpenChange }: ModuleViewerDialogProps) {
  if (!module) return null;

  // Simple logic to convert YouTube URL to embed format if needed
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
      <DialogContent className="sm:max-w-4xl h-full sm:h-auto sm:max-h-[95vh] flex flex-col p-0 border-none shadow-3xl overflow-hidden rounded-[2rem] bg-white">
        <DialogHeader className="p-8 pb-4 bg-slate-50 border-b relative">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-sm">
                    {module.contentType === 'video' ? <Video className="h-6 w-6" /> : 
                     module.contentType === 'image' ? <ImageIcon className="h-6 w-6" /> : 
                     <FileText className="h-6 w-6" />}
                </div>
                <div>
                    <Badge variant="outline" className="mb-2 bg-white text-[9px] font-black uppercase tracking-[0.2em] border-slate-200">
                        {module.category}
                    </Badge>
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 uppercase leading-tight">
                        {module.title}
                    </DialogTitle>
                </div>
            </div>
            <DialogDescription className="sr-only">Viewing Training Module: {module.title}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
            <div className="p-8 space-y-8 max-w-3xl mx-auto">
                {/* Media Presentation */}
                {module.contentType === 'video' && module.contentUrl && (
                    <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden shadow-2xl bg-black border-4 border-white">
                        <iframe 
                            src={getEmbedUrl(module.contentUrl)} 
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                        />
                    </div>
                )}

                {module.contentType === 'image' && module.contentUrl && (
                    <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden shadow-xl border-4 border-white bg-slate-100">
                        <Image 
                            src={module.contentUrl} 
                            alt={module.title} 
                            fill 
                            className="object-cover"
                            data-ai-hint="training diagram"
                        />
                    </div>
                )}

                {/* Article / Description Body */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between py-4 border-y border-slate-50">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Clock className="h-3.5 w-3.5" /> 
                            Updated {module.updatedAt ? format(module.updatedAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                            <Globe className="h-3.5 w-3.5" />
                            Official Company Module
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Module Overview</h3>
                        <p className="text-base text-slate-500 font-medium leading-relaxed">
                            {module.description}
                        </p>
                    </div>

                    {module.contentType === 'article' && module.textContent && (
                        <div className="space-y-4 pt-4 border-t border-slate-50">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Deep Dive Content</h3>
                            <div className="prose prose-slate max-w-none">
                                <p className="whitespace-pre-wrap text-slate-600 leading-loose text-base font-medium bg-slate-50/50 p-8 rounded-3xl border border-slate-100 italic">
                                    {module.textContent}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Training Completion Badge Mockup */}
                <div className="p-6 rounded-[2.5rem] bg-green-50 border border-green-100 flex items-center gap-6">
                    <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center text-green-500 shadow-sm border border-green-100 shrink-0">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-green-800 uppercase tracking-tight">Ready for Assessment?</p>
                        <p className="text-xs font-medium text-green-700/70 leading-relaxed mt-1">
                            Ensure you've understood all the protocols above. Completion of this module is recorded in your 360 profile.
                        </p>
                    </div>
                </div>
            </div>
        </ScrollArea>

        <DialogFooter className="p-8 pt-4 bg-white border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Secure Access Logged</p>
            </div>
            <DialogClose asChild>
                <Button variant="ghost" className="rounded-xl h-11 px-10 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-900">
                    Exit Module
                </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
