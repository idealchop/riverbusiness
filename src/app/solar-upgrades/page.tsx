
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sun, ArrowLeft, Zap, ShieldCheck, BarChart3, Building2, Home as HomeIcon, Lock, ChevronRight, Globe } from 'lucide-react';
import Link from 'next/link';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SolarUpgradesPage() {
  const solarImg = PlaceHolderImages.find(p => p.id === 'solar-promotion');

  return (
    <main className="min-h-screen bg-slate-50 font-sans overflow-hidden flex flex-col">
      {/* Dynamic Background Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px] animate-pulse delay-1000" />
      </div>

      {/* Persistent Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Sun className="h-6 w-6 text-amber-500" />
            <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 pt-0.5">Solar Plus</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-black text-[10px] uppercase tracking-widest hidden sm:flex h-7 px-3">
            Energy Expert Active
          </Badge>
          <AppLauncher />
        </div>
      </header>

      <ScrollArea className="flex-1 relative z-10">
        <div className="container mx-auto max-w-6xl px-6 py-12 md:py-20 space-y-24">
          
          {/* Hero Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="space-y-4">
                <Badge className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-[0.3em] px-4 h-7 mb-2">
                  Renewable Intelligence
                </Badge>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-[0.95] uppercase">
                  Power your business <br/><span className="text-amber-500">with the sun.</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-lg">
                  Integrate high-fidelity solar energy solutions into your business or home infrastructure with SolarPlus.ph.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button asChild className="w-full sm:w-auto h-14 rounded-2xl px-10 font-black text-xs uppercase tracking-widest shadow-2xl shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-white">
                  <a href="https://solarplus.ph/" target="_blank" rel="noopener noreferrer">
                    Consult an Expert <ChevronRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto h-14 rounded-2xl px-10 font-bold text-xs uppercase tracking-widest border-slate-200 bg-white">
                  <Link href="/dashboard">Back to core</Link>
                </Button>
              </div>

              <div className="pt-4 flex items-center gap-8 border-t border-slate-100">
                 <div className="space-y-1">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">0%</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Investment</p>
                 </div>
                 <div className="space-y-1 border-l pl-8">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">25y</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance Warranty</p>
                 </div>
                 <div className="space-y-1 border-l pl-8">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">Tier 1</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Hardware</p>
                 </div>
              </div>
            </div>

            <div className="relative aspect-square sm:aspect-video lg:aspect-square w-full rounded-[3rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.1)] border-[12px] border-white animate-in fade-in zoom-in-95 duration-1000 group">
              {solarImg && (
                <Image 
                  src={solarImg.imageUrl}
                  alt={solarImg.description}
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  data-ai-hint={solarImg.imageHint}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between">
                <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 font-black text-[10px] uppercase tracking-widest h-8 px-4">
                  Authorized Installation
                </Badge>
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-amber-500 shadow-xl">
                  <Zap className="h-5 w-5" />
                </div>
              </div>
            </div>
          </section>

          {/* Solution Segments */}
          <section className="space-y-12">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Energy Solutions</h2>
              <p className="text-slate-500 font-medium italic">Customized solar infrastructure for every rooftop type.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-none shadow-none rounded-[2.5rem] bg-white group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden">
                <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <div className="p-3 rounded-2xl bg-blue-50 text-primary w-fit mb-4">
                      <HomeIcon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Residential Solar</CardTitle>
                  </div>
                  <ChevronRight className="h-6 w-6 text-slate-200 group-hover:text-primary transition-colors group-hover:translate-x-1" />
                </CardHeader>
                <CardContent className="p-10 pt-6 space-y-6">
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    Protect your family's budget from rising electricity costs. Our residential systems pay for themselves within 4-5 years, providing free energy for the next two decades.
                  </p>
                  <ul className="space-y-3">
                    {['Net Metering Setup', 'Grid-Tie & Hybrid Systems', '24/7 Energy Security'].map(f => (
                      <li key={f} className="flex items-center gap-3 text-xs font-bold text-slate-700 uppercase tracking-wide">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-none shadow-none rounded-[2.5rem] bg-white group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden">
                <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 w-fit mb-4">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Commercial Solar</CardTitle>
                  </div>
                  <ChevronRight className="h-6 w-6 text-slate-200 group-hover:text-amber-500 transition-colors group-hover:translate-x-1" />
                </CardHeader>
                <CardContent className="p-10 pt-6 space-y-6">
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    Significant overhead reduction for offices, factories, and warehouses. Modernize your corporate infrastructure and achieve ESG sustainability goals simultaneously.
                  </p>
                  <ul className="space-y-3">
                    {['Tax Incentives Advice', 'Zero-Capital Lease Options', 'Corporate Sustainability Certs'].map(f => (
                      <li key={f} className="flex items-center gap-3 text-xs font-bold text-slate-700 uppercase tracking-wide">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Premium Monitoring Feature - Locked Preview */}
          <section className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-8 md:p-16 text-white group">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
               <Globe className="h-40 w-40" />
            </div>
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20 text-primary-light">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-light">Intelligence Module</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">
                    Intelligent Solar <br/>Monitoring System
                  </h2>
                  <p className="text-base text-slate-400 font-medium leading-relaxed max-w-md">
                    Visualize every kilowatt produced and every peso saved. Our proprietary monitoring engine provides real-time transparency into your energy ecosystem.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: 'Energy Yield', icon: Zap },
                    { label: 'Cost Savings', icon: DollarSign },
                    { label: 'CO2 Offset', icon: Globe },
                    { label: 'Health Check', icon: ShieldCheck }
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-3 opacity-60">
                      <m.icon className="h-4 w-4 text-slate-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Card className="border-none shadow-2xl rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-10 flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden group/card">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                  
                  <div className="p-5 rounded-full bg-slate-800 text-slate-400 shadow-inner relative z-10 scale-110 mb-2">
                    <Lock className="h-10 w-10" />
                  </div>
                  
                  <div className="space-y-2 relative z-10">
                    <h3 className="text-xl font-bold uppercase tracking-tight">Protocol Locked</h3>
                    <p className="text-sm text-slate-400 font-medium max-w-[200px] mx-auto">
                      Monitoring system activates upon solar infrastructure deployment.
                    </p>
                  </div>

                  <Button variant="outline" className="rounded-xl border-white/10 text-white h-11 px-8 font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all relative z-10 mt-4">
                    Upgrade Requirements
                  </Button>
                </Card>
                
                {/* Floating UI Deco */}
                <div className="absolute -bottom-6 -left-6 h-32 w-32 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute -top-6 -right-6 h-32 w-32 bg-amber-500/20 rounded-full blur-3xl" />
              </div>
            </div>
          </section>

          {/* Footer Branding */}
          <section className="pt-20 pb-10 border-t border-slate-200 flex flex-col items-center text-center gap-8">
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                 <Image 
                    src="https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/Logo%2Friver-icon-black-v2.png?alt=media&token=d4f3245a-e8bb-4f64-86b2-6282c4beb453" 
                    alt="River Logo" 
                    width={40} 
                    height={40} 
                    className="opacity-20 grayscale"
                  />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-300">Sustainable Infrastructure Partner</p>
              <div className="flex items-center justify-center gap-6">
                <a href="https://solarplus.ph/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-400 hover:text-primary transition-colors">Privacy Policy</a>
                <div className="h-1 w-1 rounded-full bg-slate-200" />
                <a href="https://solarplus.ph/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-400 hover:text-primary transition-colors">Service Terms</a>
                <div className="h-1 w-1 rounded-full bg-slate-200" />
                <a href="https://solarplus.ph/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-400 hover:text-primary transition-colors">Contact Engineering</a>
              </div>
            </div>
            <p className="text-[10px] text-slate-300 font-medium">© 2025 SolarPlus Philippines. All Rights Reserved.</p>
          </section>
        </div>
      </ScrollArea>
    </main>
  );
}

const DollarSign = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);
