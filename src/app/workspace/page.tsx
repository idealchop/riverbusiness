'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { LogoBlack } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';

export default function WorkspaceLandingPage() {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

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
            description: "I've started a new collaborative canvas based on your request."
        });
        window.dispatchEvent(new CustomEvent('request-new-collab-page', { 
            detail: { title: prompt.substring(0, 40) } 
        }));
        setPrompt('');
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50/50">
        <div className="max-w-2xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="text-center space-y-8">
                <div className="flex justify-center mb-4">
                    <LogoBlack className="h-20 w-20" />
                </div>
                
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">
                    Collaborative <span className="text-primary">Intelligence</span>
                </h1>

                <div className="relative w-full max-w-lg mx-auto group pt-4">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[2.5rem] blur opacity-10 group-focus-within:opacity-25 transition duration-1000"></div>
                    <div className="relative bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden focus-within:border-primary/50 transition-all p-2">
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
                            className="w-full bg-transparent border-none focus:ring-0 p-6 pb-12 text-slate-700 font-bold text-lg placeholder:text-slate-300 resize-none min-h-[120px]"
                            placeholder="What should we build today?"
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 hidden sm:block">Press Enter to Ask</p>
                            <Button 
                                onClick={handleAskAi}
                                disabled={!prompt.trim() || isProcessing}
                                className="h-12 w-12 rounded-[1.5rem] shadow-xl shadow-primary/20 p-0 active:scale-95 transition-all"
                            >
                                {isProcessing ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Sparkles className="h-5 w-5" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card 
                    onClick={handleNewDoc}
                    className="border-none shadow-sm rounded-3xl bg-white group hover:shadow-xl transition-all duration-500 cursor-pointer active:scale-[0.98]"
                >
                    <CardContent className="p-8 space-y-6">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-slate-900">New Document</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                Start from a clean canvas. Use blocks to structure your thoughts.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm rounded-3xl bg-slate-900 text-white group hover:shadow-primary/20 transition-all duration-500 cursor-pointer active:scale-[0.98]">
                    <CardContent className="p-8 space-y-6">
                        <div className="h-12 w-12 rounded-2xl bg-white/10 text-primary-light flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">Knowledge Base</h3>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                Browse your organization’s shared library of operational documents.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}