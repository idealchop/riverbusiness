'use client';

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

// Technical status messages to cycle through
const LOADING_STATUSES = [
  "Initializing secure session...",
  "Loading business modules...",
  "Syncing consumption data...",
  "Verifying station compliance...",
  "Optimizing dashboard layout...",
  "Preparing your environment..."
];

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
  const [statusIndex, setStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cycle status messages
    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % LOADING_STATUSES.length);
    }, 2000);

    // Simulated progress build
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev; // Hold near end until actually ready
        return prev + Math.random() * 5;
      });
    }, 150);

    return () => {
      clearInterval(statusInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617] overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none animate-drift" 
               style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent absolute left-0 animate-slide-down" />
          </div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
        {/* Advanced Circular Building Animation */}
        <div className="relative h-24 w-24">
          {/* Inner Pulsing Core */}
          <div className="absolute inset-4 rounded-full bg-primary/20 animate-pulse flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
          </div>
          
          {/* Rotating Progress Track */}
          <svg className="h-full w-full -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="44"
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              className="text-white/5"
            />
            <circle
              cx="48"
              cy="48"
              r="44"
              stroke="currentColor"
              strokeWidth="3"
              fill="transparent"
              strokeDasharray={276}
              strokeDashoffset={276 - (276 * progress) / 100}
              strokeLinecap="round"
              className="text-primary transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            />
          </svg>
          
          {/* Decorative Outer Rings */}
          <div className="absolute inset-0 border border-primary/10 rounded-full animate-[spin_4s_linear_infinite]" />
          <div className="absolute -inset-2 border border-dashed border-primary/5 rounded-full animate-[spin_8s_linear_infinite_reverse]" />
        </div>

        <div className="space-y-3">
          <div className="h-6 overflow-hidden">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-white animate-in slide-in-from-bottom-2 duration-500 key={statusIndex}">
              {text || LOADING_STATUSES[statusIndex]}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1">
             <div className="w-48 h-[2px] bg-white/5 rounded-full overflow-hidden">
               <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
               />
             </div>
             <span className="text-[10px] font-mono text-slate-500 tabular-nums uppercase tracking-widest">
               Building Environment • {Math.floor(progress)}%
             </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 flex flex-col items-center gap-2 opacity-20">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">RIVER PHILIPPINES</span>
          <div className="h-1 w-1 rounded-full bg-primary" />
      </div>
    </div>
  );
}
