'use client';

import React from 'react';
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
import { 
  MapPin, 
  Smartphone, 
  Wrench, 
  Package, 
  ArrowRight,
  ShieldCheck,
  Globe,
  ChevronRight,
  Headset
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoPlanDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const valueProps = [
  {
    icon: ShieldCheck,
    title: "High-quality hydration",
    description: "Professional-grade drinking water monitored 24/7 with strict laboratory standards."
  },
  {
    icon: Smartphone,
    title: "Automated logistics",
    description: "End-to-end digital scheduling and hassle-free, automated in-app invoicing."
  },
  {
    icon: Wrench,
    title: "Regular maintenance",
    description: "Scheduled professional cleaning of your dispensers and containers is included."
  },
  {
    icon: Package,
    title: "Infrastructure support",
    description: "Complimentary use of premium hot and cold dispensers and brand-new containers."
  },
  {
    icon: Headset,
    title: "Expert assistance",
    description: "Dedicated quality officers available around the clock to support your organization."
  }
];

export function NoPlanDialog({ isOpen, onOpenChange }: NoPlanDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[2.5rem] bg-white">
        <div className="flex flex-col md:flex-row min-h-[600px]">
          {/* Left: Value Proposition */}
          <div className="flex-1 p-8 md:p-14 space-y-12">
            <div className="space-y-4">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold text-[10px] uppercase tracking-[0.1em] h-6 px-3">
                Subscription required
              </Badge>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-tight">
                Unlock smart <br/><span className="text-primary">water management.</span>
              </h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-sm">
                To request a refill, you need an active Smart Refill plan. Join our network for reliable supply dispatches and high-fidelity quality monitoring.
              </p>
            </div>

            <div className="grid gap-8">
              {valueProps.map((prop, idx) => (
                <div key={idx} className="flex gap-5 group">
                  <div className="py-1 text-slate-400 group-hover:text-primary transition-all shrink-0">
                    <prop.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">{prop.title}</h4>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed">{prop.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Map Placeholder / Search */}
          <div className="w-full md:w-[42%] bg-slate-950 text-white p-10 flex flex-col justify-center relative overflow-hidden shrink-0 border-l border-white/5">
            {/* Background Decor */}
            <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            </div>

            <div className="relative z-10 space-y-8">
                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl space-y-8 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center">
                            <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-white">Logistics hub</p>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Network search</p>
                        </div>
                    </div>
                    
                    <div className="aspect-square rounded-[2rem] bg-slate-900/50 border border-white/5 flex flex-col items-center justify-center p-8 text-center gap-5 group cursor-default shadow-inner">
                        <div className="flex items-center justify-center transition-all duration-500 hover:scale-110">
                            <Globe className="h-12 w-12 text-white/10 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                                Interface pending
                            </p>
                            <p className="text-[10px] font-bold text-white/30 leading-relaxed max-w-[160px] mx-auto">
                                Automated station discovery protocol is initializing.
                            </p>
                        </div>
                    </div>

                    <Button className="w-full h-12 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-bold text-xs border-none shadow-xl transition-all active:scale-95">
                        Find nearby stations <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            </div>
            
            <div className="absolute bottom-10 left-10 text-[9px] font-black uppercase tracking-[0.6em] text-white/10">River Command</div>
          </div>
        </div>

        <DialogFooter className="p-8 pt-0 bg-white border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-200">Authorized corporate asset</p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <DialogClose asChild>
                    <Button variant="ghost" className="rounded-xl h-11 px-8 font-bold text-xs text-slate-400 hover:text-slate-900 transition-colors">
                        Dismiss
                    </Button>
                </DialogClose>
                <Button className="flex-1 sm:flex-none rounded-xl h-11 px-10 font-bold text-xs shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90">
                    Subscribe now <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
