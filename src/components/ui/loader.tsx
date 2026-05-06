'use client';

import React from 'react';
import { cn } from "@/lib/utils";

export function Loader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
    </div>
  );
}

export function FullScreenLoader({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none animate-drift" 
               style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-700">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900 opacity-80">
            {text || "Preparing Dashboard"}
          </p>
          <div className="flex justify-center">
            <Loader className="opacity-40" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 flex flex-col items-center gap-2 opacity-20">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900">RIVER PHILIPPINES</span>
      </div>
    </div>
  );
}
