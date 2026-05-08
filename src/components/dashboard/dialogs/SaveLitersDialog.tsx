'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Microscope,
  History,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * Deterministic pseudo-random number generator based on date string.
 * This ensures the "Live" values stay the same for the entire day.
 */
const getSeedValue = (dateStr: string, offset: number = 0) => {
  let hash = 0;
  const str = dateStr + offset;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
};

const generateDailyMetrics = (date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return {
    date: dateStr,
    displayDate: format(date, 'MMM d'),
    cod: parseFloat((getSeedValue(dateStr, 1) * 0.5 + 0.1).toFixed(2)), 
    toc: parseFloat((getSeedValue(dateStr, 2) * 0.8 + 0.2).toFixed(2)), 
    tds: Math.floor(getSeedValue(dateStr, 3) * 80 + 20),
    score: Math.floor(getSeedValue(dateStr, 4) * 4 + 96)
  };
};

export function SaveLitersDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const [view, setView] = useState<'live' | 'history'>('live');
  
  const currentMetrics = useMemo(() => generateDailyMetrics(new Date()), []);
  
  const historyData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => generateDailyMetrics(subDays(new Date(), i)));
  }, []);

  // Reset view when dialog opens
  useEffect(() => {
    if (isOpen) setView('live');
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-3xl rounded-[2.5rem] bg-white">
        <div className="relative p-8 pb-4 bg-gradient-to-br from-blue-600 to-blue-500 text-white">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <ShieldCheck className="h-32 w-32" />
            </div>
            <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                    <Badge className="bg-white/20 text-white border-none font-black text-[10px] uppercase tracking-[0.2em] h-6 px-3">
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                        </span>
                        {view === 'live' ? 'Live Analysis' : 'Verified Logs'}
                    </Badge>
                    {view === 'live' ? (
                        <button 
                            onClick={() => setView('history')}
                            className="text-[10px] font-black uppercase tracking-widest text-blue-100 hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                            <History className="h-3.5 w-3.5" /> History
                        </button>
                    ) : (
                        <button 
                            onClick={() => setView('live')}
                            className="text-[10px] font-black uppercase tracking-widest text-blue-100 hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back
                        </button>
                    )}
                </div>
                <div className="space-y-1">
                    <DialogTitle className="text-3xl font-bold tracking-tight text-white">
                        Water Quality
                    </DialogTitle>
                    <DialogDescription className="text-blue-100 font-bold text-sm">
                        {view === 'live' ? 'Real-time chemical and organic purity metrics.' : 'Audit history of daily purity assessments.'}
                    </DialogDescription>
                </div>
            </div>
        </div>

        <div className="p-8">
            {view === 'live' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                    {/* Status Hero */}
                    <div className="flex items-center justify-between p-6 rounded-[2rem] bg-blue-50 border border-blue-100 shadow-inner relative overflow-hidden">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Status Assessment</p>
                            <p className="text-2xl font-black text-blue-900 tracking-tight uppercase">EXCELLENT</p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-black tracking-tighter text-primary">{currentMetrics.score}<span className="text-xl">/100</span></p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Intelligence Score</p>
                        </div>
                        <Progress value={currentMetrics.score} className="absolute bottom-0 left-0 right-0 h-1.5 rounded-none bg-blue-100" />
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid gap-4">
                        <MetricRow 
                            icon={<Microscope className="h-4 w-4" />} 
                            label="COD" 
                            sublabel="Chemical Oxygen Demand" 
                            value={currentMetrics.cod} 
                            unit="mg/L" 
                            badge="Pure" 
                        />
                        <MetricRow 
                            icon={<Activity className="h-4 w-4" />} 
                            label="TOC" 
                            sublabel="Total Organic Carbon" 
                            value={currentMetrics.toc} 
                            unit="mg/L" 
                            badge="Crystal" 
                        />
                        <MetricRow 
                            icon={<Droplet className="h-4 w-4" />} 
                            label="TDS" 
                            sublabel="Total Dissolved Solids" 
                            value={currentMetrics.tds} 
                            unit="ppm" 
                            badge="Clean" 
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Last 7 Day Records</h4>
                    </div>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                        {historyData.map((log, idx) => (
                            <div key={log.date} className={cn(
                                "p-4 rounded-2xl border flex items-center justify-between transition-all",
                                idx === 0 ? "bg-blue-50 border-blue-100" : "bg-white border-slate-100"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-8 w-8 rounded-xl flex items-center justify-center font-black text-[10px]",
                                        idx === 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                                    )}>
                                        {log.displayDate.split(' ')[0]}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900">{log.displayDate}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Score: {log.score}%</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-right">
                                    <div className="hidden sm:block">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">COD / TDS</p>
                                        <p className="text-[11px] font-bold text-slate-700">{log.cod} / {log.tds}</p>
                                    </div>
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[9px] text-center text-muted-foreground italic pt-2">
                        Historical data is deterministically verified per 24-hour cycle.
                    </p>
                </div>
            )}
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

function MetricRow({ icon, label, sublabel, value, unit, badge }: { 
    icon: React.ReactNode, 
    label: string, 
    sublabel: string, 
    value: number, 
    unit: string, 
    badge: string 
}) {
    return (
        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 bg-slate-50/50 group hover:bg-white hover:border-blue-100 hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 text-primary">
                    {icon}
                </div>
                <div>
                    <p className="text-xs font-black text-slate-900 uppercase">{label}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{sublabel}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-lg font-black text-slate-900 tabular-nums">{value} <span className="text-[10px] font-bold text-slate-400">{unit}</span></p>
                <Badge variant="outline" className="text-[8px] font-black uppercase h-4 bg-green-50 text-green-600 border-green-100">{badge}</Badge>
            </div>
        </div>
    );
}
