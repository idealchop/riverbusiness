'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Rocket } from 'lucide-react';
import Link from 'next/link';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import Image from 'next/image';

export default function BusinessInsurancePage() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full bg-blue-700/5 blur-[120px] animate-pulse" />
        <div className="absolute inset-0 opacity-[0.03] animate-drift" 
             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
        <div className="flex justify-center">
          <div className="p-6 rounded-3xl bg-blue-700/5 border border-blue-700/10 shadow-2xl relative group">
            <div className="relative h-16 w-16 transition-transform duration-500 group-hover:scale-110">
              <Image 
                src="https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FBenefits.svg?alt=media&token=e0a007ac-1929-4a32-afda-8e91c416b62c"
                alt="Benefits"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
            Corporate <span className="text-blue-700">Benefits</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-md mx-auto">
            Automated health coverage and employee benefit systems are in the design phase.
          </p>
        </div>

        <Card className="border-none shadow-2xl rounded-3xl bg-white/80 backdrop-blur-xl">
          <CardContent className="p-8 space-y-6">
            <div className="flex flex-col items-center gap-2">
              <Rocket className="h-6 w-6 text-blue-700 animate-bounce" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Status: Protocol Design</p>
            </div>
            <div className="w-full h-[2px] bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-700 w-[5%] animate-pulse" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Target: Late 2026</p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4">
          <Button asChild variant="outline" className="rounded-full font-bold px-8 h-12 shadow-sm bg-white">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Core
            </Link>
          </Button>
          <AppLauncher />
        </div>
      </div>
    </main>
  );
}
