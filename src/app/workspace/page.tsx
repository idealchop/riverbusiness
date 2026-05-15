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
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/30 overflow-hidden px-4">
        <div className="max-w-5xl w-full flex flex-col items-center justify-center space-y-8 sm:space-y-12 -mt-20 sm:-mt-12">
            <div className="w-full text-center space-y-4">
                <div className="flex justify-center mb-6 sm:mb-8">
                    <LogoBlack className="h-16 w-16 sm:h-20 sm:w-20" />
                </div>
                
                <h1 className="text-3xl sm:text-5xl font-light tracking-tighter text-slate-900 leading-tight mb-8 sm:mb-16">
                    Ready, when you are.
                </h1>

                <div className="relative w-full max-w-2xl mx-auto mb-8 sm:mb-12">
                    <div className={cn(
                      "relative bg-white rounded-2xl sm:rounded-[2rem] border border-slate-200 overflow-hidden transition-all duration-300 px-1 py-1",
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
                                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none px-4 sm:px-6 py-3 sm:py-4 text-slate-600 font-normal text-sm sm:text-base placeholder:text-slate-300 resize-none min-h-[48px] sm:min-h-[56px] overflow-hidden"
                                placeholder={SUGGESTIONS[placeholderIndex]}
                                rows={1}
                            />
                            <div className="pb-1.5 sm:pb-2 pr-1.5 sm:pr-2">
                                <Button 
                                    onClick={handleAskAi}
                                    disabled={!prompt.trim() || isProcessing}
                                    size="icon"
                                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-none active:scale-95 transition-all bg-slate-900 hover:bg-slate-800"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                    ) : (
                                        <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full max-w-4xl px-2">
                <QuickActionButton 
                    onClick={() => handleCreate('doc')}
                    icon={<FileText className="h-4 w-4 text-blue-500" />}
                    label="Write Document"
                />
                <QuickActionButton 
                    onClick={() => handleCreate('sheet')}
                    icon={<Grid className="h-4 w-4 text-green-600" />}
                    label="Operational Sheet"
                />
                <QuickActionButton 
                    onClick={() => handleCreate('board')}
                    icon={<Layout className="h-4 w-4 text-purple-600" />}
                    label="Flow Canvas"
                />
            </div>
        </div>
    </div>
  );
}

function QuickActionButton({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button 
            onClick={onClick}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200 active:scale-[0.97] group shadow-sm"
        >
            <span className="text-slate-900 transition-transform group-hover:scale-110 duration-300">
                {icon}
            </span>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-600">
                {label}
            </span>
        </button>
    );
}
