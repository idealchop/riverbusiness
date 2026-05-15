'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Clock, 
  Video, 
  Image as ImageIcon, 
  FileText,
  Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FullScreenLoader } from '@/components/ui/loader';
import { format } from 'date-fns';
import Image from 'next/image';
import type { HRLearningModule, AppUser } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ModuleDetailPage() {
  const { moduleId } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user: authUser } = useUser();

  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: user } = useDoc<AppUser>(userDocRef);

  const companyId = user?.companyId || user?.clientId || 'default';

  const moduleRef = useMemoFirebase(
    () => (firestore && companyId !== 'default' && moduleId) ? doc(firestore, 'hr_companies', companyId, 'learningModules', moduleId as string) : null,
    [firestore, companyId, moduleId]
  );
  const { data: module, isLoading } = useDoc<HRLearningModule>(moduleRef);

  if (isLoading || !module) {
    return <FullScreenLoader text="Opening training material..." />;
  }

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

  const formattedDate = module.updatedAt instanceof Timestamp 
    ? format(module.updatedAt.toDate(), 'MMMM do, yyyy') 
    : module.createdAt instanceof Timestamp 
    ? format(module.createdAt.toDate(), 'MMMM do, yyyy')
    : 'Recent';

  return (
    <div className="min-h-full bg-white flex flex-col font-sans">
        {/* Document Header Control */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b px-4 sm:px-8 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/hr-dashboard/modules')}
                    className="h-9 px-3 gap-2 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Back to Hub</span>
                </Button>
                <div className="h-4 w-px bg-slate-100 hidden sm:block" />
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-none font-black text-[9px] uppercase tracking-widest h-5 px-2">
                        {module.category}
                    </Badge>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400">
                    <Bookmark className="h-4 w-4" />
                </Button>
            </div>
        </div>

        <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto px-6 sm:px-12 py-12 pb-32">
                <div className="space-y-12">
                    {/* Module Identity */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            Last verified {formattedDate}
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 leading-none">
                            {module.title}
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-3xl">
                            {module.description}
                        </p>
                    </div>

                    {/* Rich Media Section */}
                    {module.contentType === 'video' && module.contentUrl && (
                        <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border-8 border-slate-50 group">
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
                                priority
                            />
                        </div>
                    )}

                    {/* Content Section */}
                    {module.contentType === 'article' && module.textContent && (
                        <div className="pt-10 border-t border-slate-50">
                            <div className="prose prose-slate max-w-none">
                                <div className="whitespace-pre-wrap text-slate-700 leading-loose text-lg font-normal bg-slate-50/40 p-8 sm:p-12 rounded-[2.5rem] border border-slate-100 shadow-inner italic">
                                    {module.textContent}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Attribution */}
                    <div className="pt-16 border-t border-slate-100 flex flex-col items-center gap-4 text-center opacity-40">
                        <div className="p-3 rounded-2xl bg-slate-50">
                            <FileText className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
                            Organizational Training Asset
                        </p>
                    </div>
                </div>
            </div>
        </ScrollArea>
    </div>
  );
}
