'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ArrowRight, Zap, ShieldCheck, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

const newFeatures = [
    {
        icon: Cpu,
        title: "Intelligence Suite",
        description: "AI-powered consumption prediction to help you optimize your weekly water budget.",
        color: "text-blue-500",
        bg: "bg-blue-50"
    },
    {
        icon: Zap,
        title: "Magic Onboarding",
        description: "Invite your entire team with simple emails and zero-friction profile activation.",
        color: "text-amber-500",
        bg: "bg-amber-50"
    },
    {
        icon: ShieldCheck,
        title: "Digital Compliance",
        description: "Real-time access to DOH permits and automated equipment sanitation records.",
        color: "text-green-500",
        bg: "bg-green-50"
    }
];

export function InfoCards() {
  return (
    <div className="h-full">
      <Dialog>
        <DialogTrigger asChild>
          <Card className="h-full cursor-pointer group transition-all border-none bg-white overflow-hidden flex flex-col active:scale-[0.98] shadow-none">
            <div className="relative aspect-[3/4] w-full flex-1">
                <Image 
                    src="https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2Fnew-features.png?alt=media&token=59678e26-137b-4d05-8501-14267e15fd44" 
                    alt="New Features" 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    data-ai-hint="app upgrade"
                />
                
                {/* Overlaid Text - No gradients, no shadows */}
                <div className="absolute top-0 left-0 right-0 p-8 pt-10 z-20 space-y-2">
                    <h3 className="text-3xl font-black tracking-tight text-primary-light leading-tight">
                        Your App is <br/>Upgraded!
                    </h3>
                    <p className="text-sm font-bold text-primary-light uppercase tracking-[0.2em] flex items-center gap-2 group-hover:translate-x-1 transition-all">
                        See Features <ArrowRight className="h-4 w-4" />
                    </p>
                </div>
            </div>
          </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="p-8 md:p-10">
            <DialogHeader className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">Platform v1.2</Badge>
                </div>
                <DialogTitle className="text-3xl font-black tracking-tight text-slate-900">Next-Gen Essentials</DialogTitle>
                <DialogDescription className="text-base font-medium text-slate-500 pt-1">
                    Discover the latest enhancements added to your business command center.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
                {newFeatures.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-5 group">
                        <div className={cn("p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-110", feature.bg, feature.color)}>
                            <feature.icon className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-slate-900 text-lg">{feature.title}</h4>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">{feature.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-6">River Command Center</p>
                <DialogClose asChild>
                    <Button className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20">
                        Got it, Thanks!
                    </Button>
                </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}