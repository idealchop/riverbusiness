'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, Loader2, ArrowUp } from 'lucide-react';
import { LogoBlack } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

  const handleNewDoc = () => {
    window.dispatchEvent(new CustomEvent('request-new-collab-page'));
  };

  const handleAskAi = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    
    // Simulate AI document drafting and opening process
    setTimeout(() => {
        setIsProcessing(false);
        toast({
            title: "Drafting document",
            description: "A new collaborative canvas has been initialized based on your request."
        });
        window.dispatchEvent(new CustomEvent('request-new-collab-page', { 
            detail: { title: prompt.substring(0, 40) } 
        }));
        setPrompt('');
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50/30">
        <div className="max-w-4xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="text-center space-y-4">
                <div className="flex justify-center mb-8">
                    <LogoBlack className="h-20 w-20" />
                </div>
                
                <h1 className="text-5xl font-light tracking-tighter text-slate-900 leading-none mb-10">
                    Ready, when you are.
                </h1>

                <div className="relative w-full max-w-2xl mx-auto">
                    <div className={cn(
                      "relative bg-white rounded-[2rem] border border-slate-200 overflow-hidden transition-all duration-300 px-1 py-1",
                      "shadow-none ring-0 outline-none"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto w-full">
                <Card 
                    onClick={handleNewDoc}
                    className="border border-slate-100 shadow-none rounded-[2rem] bg-white group hover:border-slate-200 transition-all duration-300 cursor-pointer active:scale-[0.98]"
                >
                    <CardContent className="p-6 flex flex-col items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Plus className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-slate-900">New document</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none">
                                Start from a clean canvas
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 shadow-none rounded-[2rem] bg-white group hover:border-slate-200 transition-all duration-300 cursor-pointer active:scale-[0.98]">
                    <CardContent className="p-6 flex flex-col items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-slate-900">Knowledge base</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none">
                                Browse shared libraries
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}