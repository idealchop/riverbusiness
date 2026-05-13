
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
    Plus, 
    Sparkles, 
    Loader2, 
    ArrowUp, 
    Image as ImageIcon, 
    Pencil, 
    Globe,
    Grid,
    Layout,
    FileText,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import { LogoBlack } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const SUGGESTIONS = [
  "Draft a project proposal...",
  "Create a meeting agenda...",
  "Outline an operational guide...",
  "Summarize our latest notes...",
  "Plan a team building event..."
];

export default function WorkspaceLandingPage() {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rotate suggestions
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SUGGESTIONS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto-expand textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const handleCreate = (type: 'doc' | 'sheet' | 'board') => {
    window.dispatchEvent(new CustomEvent('request-new-collab-page', {
        detail: { type }
    }));
  };

  const handleKnowledgeBase = () => {
    toast({ title: "Opening Knowledge Base", description: "Accessing shared organizational libraries." });
  };

  const handleAskAi = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    
    // Trigger creation via layout event with the initial prompt
    window.dispatchEvent(new CustomEvent('request-new-collab-page', { 
        detail: { 
            title: prompt.trim().substring(0, 40),
            initialPrompt: prompt.trim(),
            type: 'doc'
        } 
    }));
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/30 overflow-hidden">
        <div className="max-w-5xl w-full px-8 flex flex-col items-center justify-center space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-1000 -mt-12">
            <div className="w-full text-center space-y-4">
                <div className="flex justify-center mb-8">
                    <LogoBlack className="h-20 w-20" />
                </div>
                
                <h1 className="text-5xl font-light tracking-tighter text-slate-900 leading-none mb-16">
                    Ready, when you are.
                </h1>

                <div className="relative w-full max-w-2xl mx-auto mb-12">
                    <div className={cn(
                      "relative bg-white rounded-[2rem] border border-slate-200 overflow-hidden transition-all duration-300 px-1 py-1",
                      "shadow-xl shadow-slate-200/50 ring-0 outline-none"
                    )}>
                        <div className="flex items-end">
                            <textarea 
                                ref={textareaRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isProcessing}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAskAi();
                                    }
                                }}
                                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none px-6 py-4 text-slate-600 font-normal text-base placeholder:text-slate-300 resize-none min-h-[56px] overflow-hidden"
                                placeholder={SUGGESTIONS[placeholderIndex]}
                                rows={1}
                            />
                            <div className="pb-2 pr-2">
                                <Button 
                                    onClick={handleAskAi}
                                    disabled={!prompt.trim() || isProcessing}
                                    size="icon"
                                    className="h-10 w-10 rounded-full shadow-none active:scale-95 transition-all bg-slate-900 hover:bg-slate-800"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ArrowUp className="h-5 w-5" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                <QuickCard 
                    onClick={() => handleCreate('doc')}
                    icon={<FileText className="h-6 w-6 text-blue-500" />}
                    title="Write Document"
                    description="Rich text editor with AI assistant."
                />
                <QuickCard 
                    onClick={() => handleCreate('sheet')}
                    icon={<Grid className="h-6 w-6 text-green-600" />}
                    title="Operational Sheet"
                    description="Grid-based data and supply tracking."
                />
                <QuickCard 
                    onClick={() => handleCreate('board')}
                    icon={<Layout className="h-6 w-6 text-purple-600" />}
                    title="Flow Canvas"
                    description="Visual whiteboards for team logic."
                />
            </div>

            <div className="flex items-center gap-3 pt-4">
                <QuickActionButton 
                    onClick={handleKnowledgeBase}
                    icon={<Globe className="h-4 w-4" />}
                    label="Knowledge Library"
                />
            </div>
        </div>
    </div>
  );
}

function QuickCard({ onClick, icon, title, description }: { onClick: () => void, icon: React.ReactNode, title: string, description: string }) {
    return (
        <Card className="border-none shadow-sm bg-white cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group rounded-[2rem] overflow-hidden" onClick={onClick}>
            <CardContent className="p-8 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 w-fit group-hover:bg-primary/5 transition-colors">
                    {icon}
                </div>
                <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-900 flex items-center justify-between">
                        {title}
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </h3>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed">
                        {description}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function QuickActionButton({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button 
            onClick={onClick}
            className="flex items-center gap-2.5 px-6 py-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200 active:scale-[0.97] group shadow-sm"
        >
            <span className="text-slate-900 transition-transform group-hover:scale-110 duration-300">
                {icon}
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                {label}
            </span>
        </button>
    );
}
