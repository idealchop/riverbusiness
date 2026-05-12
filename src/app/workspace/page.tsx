'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
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

  // Rotate suggestions
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SUGGESTIONS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="max-w-3xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="text-center space-y-8">
                <div className="flex justify-center mb-4">
                    <LogoBlack className="h-24 w-24" />
                </div>
                
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">
                    Collaborative <span className="text-primary">Intelligence</span>
                </h1>

                <div className="relative w-full max-w-2xl mx-auto pt-4">
                    <div className={cn(
                      "relative bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 px-1 py-1",
                      "focus-within:border-primary/40 focus-within:bg-white shadow-sm"
                    )}>
                        <div className="flex items-end">
                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isProcessing}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAskAi();
                                    }
                                }}
                                className="flex-1 bg-transparent border-none focus:ring-0 px-5 py-4 text-slate-700 font-bold text-base placeholder:text-slate-300 resize-none min-h-[60px] max-h-[200px]"
                                placeholder={SUGGESTIONS[placeholderIndex]}
                                rows={1}
                            />
                            <div className="pb-1.5 pr-1.5">
                                <Button 
                                    onClick={handleAskAi}
                                    disabled={!prompt.trim() || isProcessing}
                                    size="icon"
                                    className="h-10 w-10 rounded-xl shadow-sm active:scale-95 transition-all"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                    {!prompt && (
                        <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 pointer-events-none">
                            Powered by Genkit
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <Card 
                    onClick={handleNewDoc}
                    className="border border-slate-100 shadow-none rounded-[2rem] bg-white group hover:border-primary/20 transition-all duration-500 cursor-pointer active:scale-[0.98]"
                >
                    <CardContent className="p-8 space-y-6">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-slate-900">New document</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">
                                Start from a clean canvas
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-none rounded-[2rem] bg-slate-900 text-white group hover:bg-slate-800 transition-all duration-500 cursor-pointer active:scale-[0.98]">
                    <CardContent className="p-8 space-y-6">
                        <div className="h-12 w-12 rounded-2xl bg-white/10 text-primary-light flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold">Knowledge base</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">
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
