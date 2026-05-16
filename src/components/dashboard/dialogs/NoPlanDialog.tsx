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
    title: "High-quality monitoring",
    description: "Drinking water quality monitored 24/7 with professional lab testing."
  },
  {
    icon: Smartphone,
    title: "Fully digitalized",
    description: "Fully automated, by schedule and hassle free invoicing in app."
  },
  {
    icon: Wrench,
    title: "Monthly sanitation",
    description: "Professional cleaning of your dispensers and containers is included."
  },
  {
    icon: Package,
    title: "Premium equipment",
    description: "Free use of hot & cold dispensers and brand new reusable containers."
  },
  {
    icon: Headset,
    title: "24/7 quality support",
    description: "Our dedicated team is available around the clock to assist your team."
  }
];

export function NoPlanDialog({ isOpen, onOpenChange }: NoPlanDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-none shadow-3xl rounded-[2.5rem] bg-white">
        <div className="flex flex-col md:flex-row min-h-[600px]">
          {/* Left: Value Proposition */}
          <div className="flex-1 p-8 md:p-12 space-y-10">
            <div className="space-y-4">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-bold text-[10px] uppercase tracking-widest h-6 px-3">
                Subscription Required
              </Badge>
              <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-tight">
                Unlock Smart <br/><span className="text-primary">Water Management.</span>
              </h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-sm">
                To request a refill, you need an active Smart Refill plan. Join our network for professional water management and reliable supply dispatches.
              </p>
            </div>

            <div className="grid gap-6">
              {valueProps.map((prop, idx) => (
                <div key={idx} className="flex gap-4 group">
                  <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0">
                    <prop.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">{prop.title}</h4>
                    <p className="text-xs font-medium text-slate-400 leading-snug">{prop.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Map Placeholder / Search */}
          <div className="w-full md:w-[45%] bg-slate-950 text-white p-10 flex flex-col justify-center relative overflow-hidden shrink-0">
            {/* Background Decor */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            </div>

            <div className="relative z-10 space-y-8">
                <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-white">Logistics Hub</p>
                            <p className="text-[10px] font-medium text-white/40 uppercase tracking-tight">Nearby Station Search</p>
                        </div>
                    </div>
                    
                    <div className="aspect-[4/3] rounded-2xl bg-slate-900 border border-white/5 flex flex-col items-center justify-center p-6 text-center gap-4 group cursor-default">
                        <div className="p-4 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                            <Globe className="h-8 w-8 text-white/20 group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest max-w-[150px]">
                            Map interface initializing...
                        </p>
                    </div>

                    <Button className="w-full h-12 rounded-xl bg-white text-slate-950 hover:bg-slate-200 font-bold text-xs shadow-xl border-none">
                        Find Nearby Stations <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 pt-0 bg-white border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-300">Authored by River</p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <DialogClose asChild>
                    <Button variant="ghost" className="rounded-xl h-10 px-8 font-bold text-xs text-slate-400 hover:text-slate-900">
                        Dismiss
                    </Button>
                </DialogClose>
                <Button className="flex-1 sm:flex-none rounded-xl h-10 px-10 font-bold text-xs shadow-xl shadow-primary/20">
                    Subscribe Now <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
