'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, Clock, Star, Sparkles } from 'lucide-react';
import Image from 'next/image';

export default function WorkspaceLandingPage() {
  const handleNewDoc = () => {
    window.dispatchEvent(new CustomEvent('request-new-collab-page'));
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50/50">
        <div className="max-w-2xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="text-center space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-[2rem] bg-primary/10 text-primary mb-2 shadow-inner">
                    <BookOpen className="h-8 w-8" />
                </div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">Collaborative Intelligence</h1>
                <p className="text-lg text-slate-500 font-medium max-w-md mx-auto">
                    A unified workspace for your team’s documents, operational guides, and meeting notes.
                </p>
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

            <div className="pt-8 border-t border-slate-200 flex flex-col items-center gap-6">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Recently Modified</p>
                <div className="flex gap-4 opacity-40 grayscale pointer-events-none">
                    <Clock className="h-5 w-5" />
                    <Star className="h-5 w-5" />
                </div>
            </div>
        </div>
    </div>
  );
}
