
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
import { ArrowRight, Droplets, MessageSquare, Users, FileText, Sun, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const appFeatures = [
    {
        icon: Droplets,
        title: "Water Logistic",
        description: "Monitor real-time consumption, track water deliveries, manage billing history, and access station quality compliance reports.",
        color: "text-blue-500",
        bg: "bg-blue-50"
    },
    {
        icon: MessageSquare,
        title: "Collaboration",
        description: "Building the next generation of office management tools. Synchronize team tasks and maintain unified communication across your organization.",
        color: "text-indigo-500",
        bg: "bg-indigo-50"
    },
    {
        icon: Users,
        title: "HR & Employee",
        description: "Centralized workforce command center. Manage station-based attendance, automated payroll processing, and employee leave applications.",
        color: "text-green-500",
        bg: "bg-green-50"
    },
    {
        icon: FileText,
        title: "Files",
        description: "Secure cloud storage for all business documentation. Centralized management for contracts, proof-of-deliveries, and legal records.",
        color: "text-cyan-500",
        bg: "bg-cyan-50"
    },
    {
        icon: Sun,
        title: "Solar Upgrades",
        description: "Logistics and intelligence for renewable energy. Track your transition to solar and monitor energy-saving upgrades in real-time.",
        color: "text-amber-500",
        bg: "bg-amber-50"
    },
    {
        icon: ShieldCheck,
        title: "Benefits",
        description: "Automated corporate benefit systems. Streamline employee health coverage, insurance protocols, and professional benefits management.",
        color: "text-rose-500",
        bg: "bg-rose-50"
    }
];

export function InfoCards() {
  return (
    <div className="h-full">
      <Dialog>
        <DialogTrigger asChild>
          <Card className="h-full cursor-pointer group transition-all border-none bg-white overflow-hidden flex flex-col active:scale-[0.98] shadow-none">
            <div className="relative aspect-[3/3.6] w-full flex-1">
                <Image 
                    src="https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2Fnew-features.png?alt=media&token=59678e26-137b-4d05-8501-14267e15fd44" 
                    alt="New Features" 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    data-ai-hint="app upgrade"
                />
                
                {/* Overlaid Text - Branded color, larger text, no shadows */}
                <div className="absolute top-0 left-0 right-0 p-8 pt-10 z-20 space-y-2">
                    <h3 className="text-4xl font-black tracking-tight text-primary leading-tight">
                        Your App is <br/>Upgraded!
                    </h3>
                    <p className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2 group-hover:translate-x-1 transition-all">
                        See Features <ArrowRight className="h-4 w-4" />
                    </p>
                </div>
            </div>
          </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="p-8 md:p-10">
            <DialogHeader className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">Platform v1.2</Badge>
                </div>
                <DialogTitle className="text-3xl font-black tracking-tight text-slate-900">Your App Ecosystem</DialogTitle>
                <DialogDescription className="text-base font-medium text-slate-500 pt-1">
                    River Business is now a multi-app platform designed to handle every essential need of your organization.
                </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[50vh] pr-4 -mr-4">
                <div className="space-y-6">
                    {appFeatures.map((app, idx) => (
                        <div key={idx} className="flex items-start gap-5 group">
                            <div className={cn("p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-110 shadow-sm", app.bg, app.color)}>
                                <app.icon className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-slate-900 text-lg">{app.title}</h4>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">{app.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-6">River Command Center</p>
                <DialogClose asChild>
                    <Button className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20">
                        Explore My Workspace
                    </Button>
                </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
