'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Rocket } from 'lucide-react';
import Link from 'next/link';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import Image from 'next/image';

export default function WorkspacePage() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Immersive Digital Atmosphere */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
        <div className="absolute inset-0 opacity-[0.03] animate-drift" 
             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent absolute left-0 animate-slide-down" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
        <div className="flex justify-center">
          <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 shadow-2xl relative group overflow-hidden">
            <div className="relative h-16 w-16 transition-transform duration-500 group-hover:scale-110">
              <Image 
                src="https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FCollaboration.svg?alt=media&token=6d687bc0-125b-4ad1-ad48-fc2ceb1b07d9"
                alt="Collaboration"
                fill
                className="object-contain"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
            Collaboration <span className="text-primary">Intelligence</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-md mx-auto">
            We are currently building the next generation of office management tools. Stay tuned.
          </p>
        </div>

        <Card className="border-none shadow-2xl rounded-3xl bg-white/80 backdrop-blur-xl">
          <CardContent className="p-8 space-y-6">
            <div className="flex flex-col items-center gap-2">
              <Rocket className="h-6 w-6 text-primary animate-bounce" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Status: Building Module</p>
            </div>
            <div className="w-full h-[2px] bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[40%] animate-pulse" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estimated Arrival: Q4 2025</p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4">
          <Button asChild variant="outline" className="rounded-full font-bold px-8 h-12 shadow-sm bg-white border-slate-200">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Core
            </Link>
          </Button>
          <AppLauncher />
        </div>
      </div>
      
      <div className="absolute bottom-12 opacity-30 pointer-events-none">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900">RIVER PHILIPPINES</span>
      </div>
    </main>
  );
}
