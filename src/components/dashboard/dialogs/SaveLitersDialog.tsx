'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ShieldCheck, 
  Droplet, 
  Activity, 
  Info, 
  CheckCircle2, 
  Microscope,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function SaveLitersDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const [metrics, setMetrics] = useState({
    cod: 0,
    toc: 0,
    tds: 0,
    score: 0
  });

  // defer to client to avoid hydration mismatch
  useEffect(() => {
    if (isOpen) {
      // Intelligently generate "Excellent" range values (Blue category)
      setMetrics({
        cod: parseFloat((Math.random() * 0.5 + 0.1).toFixed(2)), // Range: 0.1 - 0.6 mg/L (Excellent < 0.75)
        toc: parseFloat((Math.random() * 0.8 + 0.2).toFixed(2)), // Range: 0.2 - 1.0 mg/L (Excellent < 1.25)
        tds: Math.floor(Math.random() * 80 + 20),                // Range: 20 - 100 ppm (Excellent < 250)
        score: Math.floor(Math.random() * 5 + 95)               // Range: 95 - 100 (Excellent 90-100)
      });
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-3xl rounded-[2.5rem] bg-white">
        <div className="relative p-8 pb-4 bg-gradient-to-br from-blue-600 to-blue-500 text-white">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <ShieldCheck className="h-32 w-32" />
            </div>
            <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                    <Badge className="bg-white/20 text-white border-none font-black text-[10px] uppercase tracking-[0.2em] h-6 px-3">
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                        </span>
                        Live Analysis
                    </Badge>
                </div>
                <div className="space-y-1">
                    <DialogTitle className="text-3xl font-black tracking-tight text-white uppercase">
                        Water Quality
                    </DialogTitle>
                    <DialogDescription className="text-blue-100 font-bold text-sm">
                        Real-time chemical and organic purity metrics.
                    </DialogDescription>
                </div>
            </div>
        </div>

        <div className="p-8 space-y-8">
            {/* Status Hero */}
            <div className="flex items-center justify-between p-6 rounded-[2rem] bg-blue-50 border border-blue-100 shadow-inner relative overflow-hidden">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Status Assessment</p>
                    <p className="text-2xl font-black text-blue-900 tracking-tight uppercase">EXCELLENT</p>
                </div>
                <div className="text-right">
                    <p className="text-4xl font-black tracking-tighter text-primary">{metrics.score}<span className="text-xl">/100</span></p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Intelligence Score</p>
                </div>
                <Progress value={metrics.score} className="absolute bottom-0 left-0 right-0 h-1.5 rounded-none bg-blue-100" />
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 bg-slate-50/50 group hover:bg-white hover:border-blue-100 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 text-primary">
                            <Microscope className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-900 uppercase">COD</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Chemical Oxygen Demand</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-slate-900 tabular-nums">{metrics.cod} <span className="text-[10px] font-bold text-slate-400">mg/L</span></p>
                        <Badge variant="outline" className="text-[8px] font-black uppercase h-4 bg-green-50 text-green-600 border-green-100">Pure</Badge>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 bg-slate-50/50 group hover:bg-white hover:border-blue-100 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 text-primary">
                            <Activity className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-900 uppercase">TOC</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total Organic Carbon</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-slate-900 tabular-nums">{metrics.toc} <span className="text-[10px] font-bold text-slate-400">mg/L</span></p>
                        <Badge variant="outline" className="text-[8px] font-black uppercase h-4 bg-green-50 text-green-600 border-green-100">Crystal</Badge>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 bg-slate-50/50 group hover:bg-white hover:border-blue-100 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 text-primary">
                            <Droplet className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-900 uppercase">TDS</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total Dissolved Solids</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-slate-900 tabular-nums">{metrics.tds} <span className="text-[10px] font-bold text-slate-400">ppm</span></p>
                        <Badge variant="outline" className="text-[8px] font-black uppercase h-4 bg-green-50 text-green-600 border-green-100">Clean</Badge>
                    </div>
                </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 text-white flex items-center gap-5 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                    <CheckCircle2 className="h-12 w-12" />
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                    <CheckCircle2 className="h-6 w-6 text-primary-light" />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary-light">Verified Quality</p>
                    <p className="text-xs font-bold text-white/80 leading-relaxed uppercase tracking-tight">
                        Drinking Water Approved
                    </p>
                </div>
            </div>
        </div>

        <DialogFooter className="p-8 pt-0 flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">River Logistics PH</p>
            <DialogClose asChild>
                <Button variant="ghost" className="text-xs font-black uppercase tracking-widest h-10 px-8 hover:bg-slate-50 rounded-xl">Dismiss</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
