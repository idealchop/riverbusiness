
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useUser, useCollection } from '@/firebase';
import { doc, Timestamp, serverTimestamp, setDoc, collection, query, where, updateDoc } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Clock, 
  Video, 
  Image as ImageIcon, 
  FileText,
  Bookmark,
  Edit,
  ChevronRight,
  Sparkles,
  Loader2,
  X,
  History,
  Users,
  UserPlus,
  Check,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FullScreenLoader } from '@/components/ui/loader';
import { format, formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import type { HRLearningModule, AppUser, HRLearningModuleViewer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Editor } from '@/components/collaboration/Editor';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';

export default function ModuleDetailPage() {
  const { moduleId } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();
  const { toast } = useToast();

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');

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

  // Fetch Team Members for Assignment
  const teamQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(collection(firestore, 'users'), where('companyId', '==', companyId)) : null,
    [firestore, companyId]
  );
  const { data: teamMembers } = useCollection<AppUser>(teamQuery);

  // Fetch Viewers
  const viewersQuery = useMemoFirebase(
    () => (firestore && companyId && moduleId) ? collection(firestore, 'hr_companies', companyId, 'learningModules', moduleId as string, 'viewers') : null,
    [firestore, companyId, moduleId]
  );
  const { data: viewers } = useCollection<HRLearningModuleViewer>(viewersQuery);

  const isManager = user?.hrRole === 'owner' || user?.hrRole === 'admin';
  const isAssigned = module?.assignedEmployeeId === user?.id;
  const canEdit = isManager || isAssigned;

  // Tracking Effect: Record the visit
  useEffect(() => {
    if (!firestore || !companyId || !moduleId || !user || isUserDocLoading) return;

    const recordVisit = async () => {
        const viewerRef = doc(firestore, 'hr_companies', companyId, 'learningModules', moduleId as string, 'viewers', user.id);
        const visitorData: HRLearningModuleViewer = {
            id: user.id,
            userId: user.id,
            name: user.name,
            photoURL: user.photoURL || '',
            lastVisitedAt: serverTimestamp()
        };
        setDoc(viewerRef, visitorData, { merge: true }).catch(() => {});
    };

    recordVisit();
  }, [firestore, companyId, moduleId, user, isUserDocLoading]);

  const handleAssignEmployee = async (employeeId: string) => {
    if (!firestore || !companyId || !moduleId || !isManager) return;

    const targetModuleRef = doc(firestore, 'hr_companies', companyId, 'learningModules', moduleId as string);
    try {
        await updateDoc(targetModuleRef, { assignedEmployeeId: employeeId });
        toast({ title: 'Module Assigned', description: `Responsibilities have been delegated to ${teamMembers?.find(m => m.id === employeeId)?.name}.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Assignment Failed' });
    }
  };

  const handleGenerateSummary = async () => {
    if (!module || isAiProcessing) return;
    
    setIsAiProcessing(true);
    toast({ title: 'AI Insights Active', description: 'Generating a high-fidelity summary of this training material.' });

    try {
        const textToSummarize = module.textContent 
            ? JSON.stringify(module.textContent) 
            : module.description;

        const response = await fetch('/api/ai/assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: textToSummarize,
                action: 'summarize',
                customGoal: 'Provide a professional executive summary with bullet points for this training module.'
            })
        });

        if (!response.ok) throw new Error('AI failed');
        const data = await response.json();
        setAiSummary(data.suggestedText);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Intelligence Offline', description: 'Could not generate summary at this time.' });
    } finally {
        setIsAiProcessing(false);
    }
  };

  const filteredTeam = useMemo(() => {
    if (!teamMembers) return [];
    return teamMembers.filter(m => 
        m.name?.toLowerCase().includes(employeeSearch.toLowerCase()) || 
        m.email?.toLowerCase().includes(employeeSearch.toLowerCase())
    );
  }, [teamMembers, employeeSearch]);

  const sortedViewers = useMemo(() => {
    if (!viewers) return [];
    return [...viewers].sort((a, b) => {
        const timeA = a.lastVisitedAt?.seconds || 0;
        const timeB = b.lastVisitedAt?.seconds || 0;
        return timeB - timeA;
    });
  }, [viewers]);

  if (isUserLoading || isUserDocLoading || (isModuleLoading && companyId)) {
    return <FullScreenLoader text="Opening training material..." />;
  }

  if (!isUserDocLoading && !user) {
      router.push('/login');
      return null;
  }

  if (!module && !isModuleLoading && companyId) {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-white space-y-6 text-center px-6">
            <div className="p-10 rounded-[3rem] bg-slate-50 border border-slate-100 shadow-inner opacity-40">
                <FileText className="h-16 w-16 text-slate-200" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Document not found</h3>
                <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto leading-relaxed">
                    This training asset may have been removed or moved to a different directory.
                </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/hr-dashboard/modules')} className="rounded-xl h-11 px-8 font-bold text-xs uppercase tracking-widest border-slate-200 bg-white shadow-sm">
                Return to Hub
            </Button>
        </div>
    );
  }

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

  const formattedDate = module.updatedAt instanceof Timestamp 
    ? format(module.updatedAt.toDate(), 'MMMM do, yyyy') 
    : module.createdAt instanceof Timestamp 
    ? format(module.createdAt.toDate(), 'MMMM do, yyyy')
    : 'Recent';

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-hidden">
        {/* Document Header Control */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b px-4 sm:px-8 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/hr-dashboard/modules')}
                    className="h-9 px-2 gap-2 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Hub</span>
                </Button>
                <ChevronRight className="h-3.5 w-3.5 text-slate-200 shrink-0" />
                <div className="flex items-center gap-2 overflow-hidden">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-none font-black text-[9px] uppercase tracking-widest h-5 px-2 whitespace-nowrap">
                        {module.category}
                    </Badge>
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[150px] sm:max-w-xs">{module.title}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Viewers Avatars */}
                <div className="hidden md:flex items-center -space-x-1.5 overflow-hidden pr-2 border-r">
                    <TooltipProvider delayDuration={0}>
                        {sortedViewers.slice(0, 5).map((viewer) => (
                            <Tooltip key={viewer.userId}>
                                <TooltipTrigger asChild>
                                    <Avatar className="h-6 w-6 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                        <AvatarImage src={viewer.photoURL} />
                                        <AvatarFallback className="text-[7px] font-black uppercase bg-primary/10 text-primary">
                                            {viewer.name?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-xl border-slate-100 shadow-2xl p-3">
                                    <p className="text-xs font-bold text-slate-900 leading-none">{viewer.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                        Last seen {formatDistanceToNow(toSafeDate(viewer.lastVisitedAt) || new Date(), { addSuffix: true })}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                        {sortedViewers.length > 5 && (
                            <div className="h-6 w-6 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400 z-10">
                                +{sortedViewers.length - 5}
                            </div>
                        )}
                    </TooltipProvider>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        onClick={handleGenerateSummary}
                        disabled={isAiProcessing}
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-xl gap-2 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-primary hover:bg-primary/5"
                    >
                        {isAiProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {aiSummary ? 'Regenerate Insights' : 'AI Insights'}
                    </Button>

                    {isManager && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50">
                                    <UserPlus className="h-3.5 w-3.5" />
                                    {module.assignedEmployeeId ? 'Change Author' : 'Assign'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-64 p-0 rounded-2xl shadow-3xl border-slate-100 bg-white overflow-hidden">
                                <div className="p-4 bg-slate-50 border-b">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Delegate Authorship</p>
                                    <div className="relative mt-2">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                                        <Input 
                                            placeholder="Find employee..." 
                                            className="h-8 pl-7 text-xs border-none bg-white shadow-inner rounded-lg"
                                            value={employeeSearch}
                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <ScrollArea className="h-64">
                                    <div className="p-1">
                                        {filteredTeam.map(member => (
                                            <button 
                                                key={member.id}
                                                onClick={() => handleAssignEmployee(member.id)}
                                                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-7 w-7">
                                                        <AvatarImage src={member.photoURL} />
                                                        <AvatarFallback className="text-[8px]">{member.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-900 truncate">{member.name}</p>
                                                        <p className="text-[9px] font-medium text-slate-400 truncate">{member.hrProfile?.position}</p>
                                                    </div>
                                                </div>
                                                {module.assignedEmployeeId === member.id && (
                                                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                    )}

                    {canEdit && (
                        <Button 
                            asChild
                            variant="ghost" 
                            size="sm" 
                            className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5"
                        >
                            <Link href={`/hr-dashboard/modules/${moduleId}/edit`}>
                                <Edit className="h-3.5 w-3.5" />
                                Edit Module
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>

        <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto px-6 sm:px-12 py-12 pb-40">
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

                    {/* AI Summary Panel */}
                    {aiSummary && (
                        <Card className="border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative group animate-in slide-in-from-top-4 duration-500">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                <Sparkles className="h-20 w-20" />
                            </div>
                            <CardContent className="p-10 space-y-6 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-primary/20 text-primary-light">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white">Executive Insights</h4>
                                    </div>
                                    <button onClick={() => setAiSummary(null)} className="text-white/20 hover:text-white transition-colors">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="prose prose-invert max-w-none">
                                    <p className="text-slate-300 leading-relaxed text-sm font-medium whitespace-pre-wrap">
                                        {aiSummary}
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">AI Generated Intelligence</p>
                                    <History className="h-3 w-3 text-white/20" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Rich Media Section */}
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
                                priority
                            />
                        </div>
                    )}

                    {/* Content Section */}
                    {module.contentType === 'article' && (
                        <div className="pt-10 border-t border-slate-50">
                            <Editor 
                                initialContent={module.textContent || { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: module.description }] }] }}
                                onContentChange={() => {}}
                                editable={false}
                                companyId={module.companyId}
                            />
                        </div>
                    )}

                    {/* Footer Attribution */}
                    <div className="pt-16 border-t border-slate-100 flex flex-col items-center gap-4 text-center opacity-40">
                        <div className="p-3 rounded-2xl bg-slate-50">
                            <FileText className="h-6 w-6 text-slate-300" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
                                Organizational Training Asset
                            </p>
                            {module.assignedEmployeeId && (
                                <p className="text-[9px] font-bold text-primary uppercase tracking-widest">
                                    Assigned to {teamMembers?.find(m => m.id === module.assignedEmployeeId)?.name}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
    </div>
  );
}
