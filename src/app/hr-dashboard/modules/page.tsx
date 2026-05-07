'use client';

import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Video, 
  FileText, 
  PlayCircle,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  Filter,
  ArrowRight,
  Clock,
  Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { FullScreenLoader } from '@/components/ui/loader';
import { LearningModuleDialog } from '@/components/hr/LearningModuleDialog';
import { ModuleViewerDialog } from '@/components/hr/ModuleViewerDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { format } from 'date-fns';
import type { HRLearningModule } from '@/lib/types';

const DEMO_MODULES: Partial<HRLearningModule>[] = [
    { id: 'm1', title: 'Daily Sanitation Flow', description: 'Step-by-step guide for equipment maintenance.', category: 'Safety', contentType: 'video', contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id: 'm2', title: 'Customer Interaction Protocols', description: 'Best practices for fleet-to-client communication.', category: 'Support', contentType: 'article', textContent: 'Standard protocols for all team members...' },
    { id: 'm3', title: 'Emergency Leak Response', description: 'What to do when equipment failures occur.', category: 'Operational', contentType: 'image', contentUrl: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FApp%20Image%2FRiver_v1.png?alt=media&token=dee32636-aaaf-4a4f-8780-cc43f54f8d27' },
];

export default function LearningHubPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [moduleToEdit, setModuleToEdit] = useState<HRLearningModule | null>(null);
  const [moduleToView, setModuleToView] = useState<HRLearningModule | null>(null);

  const companyId = user?.companyId || user?.clientId || 'default';

  const modulesQuery = useMemoFirebase(
    () => (firestore && companyId) ? query(
        collection(firestore, 'hr_companies', companyId, 'learningModules'),
        orderBy('createdAt', 'desc')
    ) : null,
    [firestore, companyId]
  );
  const { data: modules, isLoading } = useCollection<HRLearningModule>(modulesQuery);

  const displayModules = useMemo(() => {
    const list = modules && modules.length > 0 ? modules : (DEMO_MODULES as HRLearningModule[]);
    if (!searchTerm) return list;
    const search = searchTerm.toLowerCase();
    return list.filter(m => 
        m.title.toLowerCase().includes(search) || 
        m.category.toLowerCase().includes(search)
    );
  }, [modules, searchTerm]);

  const handleDeleteModule = async (moduleId: string) => {
    if (!firestore || !companyId) return;
    try {
        await deleteDoc(doc(firestore, 'hr_companies', companyId, 'learningModules', moduleId));
        toast({ title: 'Module removed', description: 'The training material has been deleted.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Action failed', description: 'Could not remove module.' });
    }
  };

  const handleEditModule = (module: HRLearningModule) => {
    setModuleToEdit(module);
    setIsManageDialogOpen(true);
  };

  const handleLaunchModule = (module: HRLearningModule) => {
    setModuleToView(module);
    setIsViewerOpen(true);
  };

  const handleShareModule = (module: HRLearningModule) => {
      navigator.clipboard.writeText(`${window.location.origin}/hr-dashboard/modules?view=${module.id}`);
      toast({ title: 'Link Copied', description: 'Training link copied to clipboard for sharing.' });
  };

  if (isUserLoading) return <FullScreenLoader text="Syncing Learning Hub..." />;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Learning Hub</h1>
          <p className="text-slate-500 font-medium text-sm">Design and Browse Authorized Training Materials Collaboratively.</p>
        </div>
        <Button 
            onClick={() => { setModuleToEdit(null); setIsManageDialogOpen(true); }}
            className="rounded-xl h-11 px-6 font-bold shadow-md shadow-primary/10"
        >
            <Plus className="mr-2 h-4 w-4" /> Create Module
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
                placeholder="Search modules by title or category..." 
                className="pl-10 h-11 bg-white border-slate-200 rounded-xl font-medium shadow-none focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <Button variant="outline" className="rounded-xl h-11 px-6 font-bold border-slate-200 bg-white shadow-sm">
            <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayModules.map((module) => (
            <Card key={module.id} className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white flex flex-col group hover:shadow-xl transition-all duration-500 border border-slate-50">
                <div className="relative h-48 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => handleLaunchModule(module)}>
                    {module.contentType === 'image' && module.contentUrl ? (
                        <Image src={module.contentUrl} alt={module.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" data-ai-hint="training material" />
                    ) : module.contentType === 'video' ? (
                        <div className="h-full w-full flex items-center justify-center bg-slate-900 text-white relative">
                            <Video className="h-10 w-10 opacity-40" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                <PlayCircle className="h-12 w-12 text-white/80 group-hover:scale-110 transition-transform" />
                            </div>
                        </div>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center bg-blue-50 text-primary">
                            <FileText className="h-10 w-10 opacity-40" />
                        </div>
                    )}
                    <Badge className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-slate-900 border-none font-bold uppercase text-[9px] tracking-widest px-3 h-6 shadow-sm">
                        {module.category || 'General'}
                    </Badge>
                </div>

                <CardHeader className="flex-1 cursor-pointer" onClick={() => handleLaunchModule(module)}>
                    <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-xl font-bold tracking-tight text-slate-900 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                            {module.title}
                        </CardTitle>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-50 shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-200 p-1 shadow-2xl">
                                <DropdownMenuItem onClick={() => handleEditModule(module)} className="gap-2 font-semibold text-xs py-2.5 rounded-lg cursor-pointer">
                                    <Edit className="h-3.5 w-3.5" /> Edit Module
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShareModule(module)} className="gap-2 font-semibold text-xs py-2.5 rounded-lg cursor-pointer">
                                    <Share2 className="h-3.5 w-3.5" /> Share to Team
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-50" />
                                <DropdownMenuItem onClick={() => handleDeleteModule(module.id)} className="gap-2 font-semibold text-xs py-2.5 text-red-600 focus:text-red-600 rounded-lg cursor-pointer">
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <CardDescription className="text-sm font-medium text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                        {module.description}
                    </CardDescription>
                </CardHeader>

                <CardFooter className="pt-0 pb-8 flex items-center justify-between px-6">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Clock className="h-3 w-3" /> 
                        {module.createdAt instanceof Timestamp ? format(module.createdAt.toDate(), 'MMM d') : 'Active'}
                    </div>
                    <Button onClick={() => handleLaunchModule(module)} variant="ghost" className="rounded-xl font-bold text-xs gap-2 group/btn hover:bg-primary/5 hover:text-primary transition-colors h-9 px-4">
                        Open Training <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                </CardFooter>
            </Card>
        ))}
      </div>

      <LearningModuleDialog 
        isOpen={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
        companyId={companyId}
        moduleToEdit={moduleToEdit}
      />

      <ModuleViewerDialog
        isOpen={isViewerOpen}
        onOpenChange={setIsViewerOpen}
        module={moduleToView}
      />
    </div>
  );
}
