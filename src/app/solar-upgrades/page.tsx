'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sun, ArrowLeft, Zap, ShieldCheck, BarChart3, Building2, Lock, ChevronRight, Globe, CheckCircle2, Factory, Store, Building } from 'lucide-react';
import Link from 'next/link';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SolarUpgradesPage() {
  const solarImg = PlaceHolderImages.find(p => p.id === 'solar-promotion');

  return (
    <main className="min-h-screen bg-white font-sans overflow-hidden flex flex-col relative">
      {/* High-Fidelity Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40" 
           style={{ 
             backgroundImage: `linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)`,
             backgroundSize: '40px 40px' 
           }} 
      />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Sun className="h-6 w-6 text-amber-500" />
            <span className="font-bold text-sm tracking-tight text-slate-900 pt-0.5">Solar Plus</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px] hidden sm:flex h-7 px-3">
            Expert online
          </Badge>
          <AppLauncher />
        </div>
      </header>

      <ScrollArea className="flex-1 relative z-10">
        <div className="container mx-auto max-w-6xl px-6 py-12 md:py-24 space-y-24">
          
          {/* Hero Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="space-y-4">
                <Badge className="bg-slate-900 text-white border-none font-bold text-[10px] px-4 h-7 mb-2">
                  Upgrade today
                </Badge>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 leading-[0.9]">
                  Zero Peso <br/><span className="text-amber-500">Electric bills.</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-lg">
                  Transition your industry to high-fidelity energy solutions from SolarPlus.ph. Engineered for reliability and scale in the Philippines.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button asChild className="w-full sm:w-auto h-14 rounded-2xl px-10 font-bold text-sm shadow-2xl shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-white border-none">
                  <a href="https://solarplus.ph/" target="_blank" rel="noopener noreferrer">
                    Get a free quote <ChevronRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto h-14 rounded-2xl px-10 font-bold text-sm border-slate-200 bg-white">
                  <Link href="/dashboard">Back to core</Link>
                </Button>
              </div>

              <div className="pt-8 grid grid-cols-3 gap-8 border-t border-slate-100">
                 <div className="space-y-1">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">0%</p>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest">Downpayment</p>
                 </div>
                 <div className="space-y-1 border-l pl-8">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">25y</p>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest">Warranty</p>
                 </div>
                 <div className="space-y-1 border-l pl-8">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">Tier 1</p>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest">Hardware</p>
                 </div>
              </div>
            </div>

            <div className="relative aspect-square w-full rounded-[3rem] overflow-hidden animate-in fade-in zoom-in-95 duration-1000 group">
              {solarImg && (
                <Image 
                  src={solarImg.imageUrl}
                  alt={solarImg.description}
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  data-ai-hint={solarImg.imageHint}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-40" />
            </div>
          </section>

          {/* Industry Solutions Section */}
          <section className="space-y-12">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-4xl font-black tracking-tight text-slate-900">Industry solutions</h2>
              <p className="text-slate-400 font-bold text-[10px] tracking-widest">Built for scale and performance</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-none shadow-xl shadow-slate-100 rounded-[3rem] bg-white group hover:shadow-2xl transition-all duration-500">
                <CardHeader className="p-8 pb-0">
                  <div className="p-4 rounded-2xl bg-blue-50 text-primary w-fit mb-6">
                    <Factory className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-black tracking-tight text-slate-900">Manufacturing</CardTitle>
                  <CardDescription className="text-sm font-medium text-slate-500 pt-2 leading-relaxed">
                    Heavy-duty solutions for production lines and cold storage facilities.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-6 space-y-3">
                  {['Grid-tie systems', 'Industrial grade panels', 'ROI in 3 to 4 years'].map(f => (
                    <div key={f} className="flex items-center gap-3 text-[11px] font-bold text-slate-700 tracking-wide">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> {f}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl shadow-slate-100 rounded-[3rem] bg-white group hover:shadow-2xl transition-all duration-500">
                <CardHeader className="p-8 pb-0">
                  <div className="p-4 rounded-2xl bg-amber-50 text-amber-600 w-fit mb-6">
                    <Store className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-black tracking-tight text-slate-900">Commercial</CardTitle>
                  <CardDescription className="text-sm font-medium text-slate-500 pt-2 leading-relaxed">
                    Cost optimization for retail hubs, storefronts, and site chains.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-6 space-y-3">
                  {['Net metering ready', 'Zero-capital leasing', 'Peak-hour shaving'].map(f => (
                    <div key={f} className="flex items-center gap-3 text-[11px] font-bold text-slate-700 tracking-wide">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> {f}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl shadow-slate-100 rounded-[3rem] bg-white group hover:shadow-2xl transition-all duration-500">
                <CardHeader className="p-8 pb-0">
                  <div className="p-4 rounded-2xl bg-slate-100 text-slate-600 w-fit mb-6">
                    <Building className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-black tracking-tight text-slate-900">Corporate</CardTitle>
                  <CardDescription className="text-sm font-medium text-slate-500 pt-2 leading-relaxed">
                    Sustainable energy architecture for offices and institutional buildings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-6 space-y-3">
                  {['BMS integration', 'ESG compliance ready', 'Full site monitoring'].map(f => (
                    <div key={f} className="flex items-center gap-3 text-[11px] font-bold text-slate-700 tracking-wide">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> {f}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Premium Monitoring Feature */}
          <section className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-8 md:p-20 text-white group shadow-3xl">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
               <Globe className="h-60 w-60" />
            </div>
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20 text-primary-light">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-light">Intelligence module</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.95]">
                    Intelligent <br/>monitoring hub
                  </h2>
                  <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-md">
                    Visualize energy yield, cost savings, and hardware health in real-time. Full integration with your operational dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8 opacity-60">
                  {[
                    { label: 'Live yield', icon: Zap },
                    { label: 'Total saved', icon: DollarSign },
                    { label: 'CO2 offset', icon: Globe },
                    { label: 'Hardware health', icon: ShieldCheck }
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-3">
                      <m.icon className="h-5 w-5 text-slate-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Card className="border-none shadow-2xl rounded-[3rem] bg-white/5 backdrop-blur-xl border border-white/10 p-12 flex flex-col items-center justify-center text-center gap-8 relative overflow-hidden group/card">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                  
                  <div className="p-6 rounded-full bg-slate-800 text-slate-400 shadow-inner relative z-10 scale-110">
                    <Lock className="h-12 w-12" />
                  </div>
                  
                  <div className="space-y-3 relative z-10">
                    <h3 className="text-2xl font-black tracking-tight">Access locked</h3>
                    <p className="text-sm text-slate-400 font-medium max-w-[220px] mx-auto leading-relaxed">
                      Upgrade to solar infrastructure to activate real-time monitoring.
                    </p>
                  </div>

                  <Button variant="outline" className="rounded-2xl border-white/20 text-white h-12 px-10 font-bold text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-slate-900 transition-all relative z-10">
                    Upgrade info
                  </Button>
                </Card>
                
                {/* Decorative Elements */}
                <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -top-10 -right-10 h-40 w-40 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-700" />
              </div>
            </div>
          </section>

          {/* Footer Section */}
          <footer className="pt-24 pb-12 border-t border-slate-100 flex flex-col items-center text-center gap-10">
            <div className="space-y-6">
              <div className="flex justify-center mb-4">
                 <Image 
                    src="https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/Logo%2Friver-icon-black-v2.png?alt=media&token=d4f3245a-e8bb-4f64-86b2-6282c4beb453" 
                    alt="River Logo" 
                    width={40} 
                    height={40} 
                    className="opacity-10 grayscale"
                  />
              </div>
              <p className="text-[10px] font-bold text-slate-300">Authorized infrastructure partner</p>
              <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                <a href="https://solarplus.ph/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors">Privacy</a>
                <a href="https://solarplus.ph/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors">Terms</a>
                <a href="https://solarplus.ph/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors">Contact</a>
              </div>
            </div>
            <p className="text-[9px] font-medium text-slate-300">© 2025 SolarPlus.ph • Strategic Energy for the Philippines</p>
          </footer>
        </div>
      </ScrollArea>
    </main>
  );
}

const DollarSign = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);
