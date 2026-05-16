'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  ChevronRight, 
  Globe, 
  CheckCircle2, 
  Factory, 
  Store, 
  Building, 
  HelpCircle, 
  Landmark, 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  Lock,
  Truck,
  Hotel,
  Activity,
  Warehouse,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LiveSupportDialog } from '@/components/dashboard/layout/LiveSupportDialog';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { AppUser, ChatMessage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';

export default function SolarUpgradesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const [isLiveSupportOpen, setIsLiveSupportOpen] = useState(false);

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user } = useDoc<AppUser>(userDocRef);

  const chatMessagesQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(collection(firestore, 'users', authUser.uid, 'chatMessages'), orderBy('timestamp', 'asc'));
  }, [firestore, authUser]);
  const { data: chatMessages } = useCollection<ChatMessage>(chatMessagesQuery);

  const solarImg = PlaceHolderImages.find(p => p.id === 'solar-promotion');

  const handleMessageSubmit = async (messagePayload: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (!firestore || !authUser || !userDocRef) return;

    const messagesCollection = collection(firestore, 'users', authUser.uid, 'chatMessages');
    const finalPayload = { ...messagePayload, timestamp: serverTimestamp() };

    try {
        await addDoc(messagesCollection, finalPayload);
        await updateDoc(userDocRef, {
            lastChatMessage: messagePayload.text || 'Attachment',
            lastChatTimestamp: serverTimestamp(),
            hasUnreadUserMessages: true
        });
    } catch(error) {
        console.error("Error sending chat message:", error);
        toast({ variant: 'destructive', title: 'Message Failed', description: 'Could not send your message.' });
    }
  };

  const industries = [
    {
      title: 'Manufacturing',
      description: 'Designed for heavy production lines and continuous 24/7 cold storage demand.',
      icon: Factory,
      features: ['100 kW - 200 kW range', 'PPA financing available', 'Industrial grade hardware']
    },
    {
      title: 'Commercial',
      description: 'Optimized for retail chains, supermarkets, and decentralized site clusters.',
      icon: Store,
      features: ['Multi-site aggregation', '50 kW (consideration)', 'Net metering integration']
    },
    {
      title: 'Corporate',
      description: 'Sustainable energy architecture for high-rise offices and institutions.',
      icon: Building,
      features: ['ESG compliance ready', 'Full BMS integration', '100 kW+ standard']
    },
    {
      title: 'Logistics',
      description: 'Optimizing large-scale refrigeration and sorting center energy demands.',
      icon: Warehouse,
      features: ['150 kW - 250 kW range', 'Peak-load management', 'Fleet EV charging integration']
    },
    {
      title: 'Hospitality',
      description: 'Reducing costs for hotels and resorts with high amenity energy loads.',
      icon: Hotel,
      features: ['100 kW - 200 kW range', 'Daytime amenity coverage', 'Guest-facing sustainability']
    },
    {
      title: 'Healthcare',
      description: 'Specialized solutions for clinics requiring absolute energy reliability.',
      icon: Activity,
      features: ['50 kW - 100 kW range', 'Critical backup sync', 'High-purity energy feed']
    }
  ];

  return (
    <main className="min-h-screen bg-white font-sans overflow-hidden flex flex-col relative">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40" 
           style={{ 
             backgroundImage: `linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)`,
             backgroundSize: '40px 40px' 
           }} 
      />

      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100 transition-colors">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-bold text-[10px] hidden sm:flex h-7 px-3 uppercase tracking-wider">
            Expert consultation active
          </Badge>
          <AppLauncher />
        </div>
      </header>

      <ScrollArea className="flex-1 relative z-10">
        <div className="container mx-auto max-w-6xl px-6 py-12 md:py-24 space-y-24">
          
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="space-y-4">
                <Badge className="bg-slate-900 text-white border-none font-bold text-[11px] px-4 h-7 mb-2 uppercase tracking-widest">
                  Industrial upgrade
                </Badge>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 leading-[0.95]">
                  River solar power for <span className="text-slate-400">scale.</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 font-medium leading-relaxed max-w-lg">
                  100 kW to 200 kW industrial solutions. Reduce your overhead with strategic energy.
                </p>
              </div>
              
              <div className="space-y-6">
                <Button className="w-full sm:w-auto h-14 rounded-2xl px-12 font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 bg-slate-900 hover:bg-slate-800 text-white border-none group transition-all active:scale-95">
                  Refer and get lifetime commission <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                
                <div className="flex items-center gap-6 px-1">
                  <LiveSupportDialog 
                    isOpen={isLiveSupportOpen}
                    onOpenChange={setIsLiveSupportOpen}
                    user={user || null}
                    chatMessages={chatMessages || []}
                    onMessageSubmit={handleMessageSubmit}
                  >
                    <button className="text-xs font-black uppercase tracking-[0.15em] text-primary hover:text-primary-light transition-all flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Talk to our team
                    </button>
                  </LiveSupportDialog>
                  <Separator orientation="vertical" className="h-3 bg-slate-200" />
                  <Link href="/dashboard" className="text-xs font-black uppercase tracking-[0.15em] text-slate-400 hover:text-slate-600 transition-all">
                      Back to Core
                  </Link>
                </div>
              </div>

              <div className="pt-8 grid grid-cols-3 gap-8 border-t border-slate-100">
                 <div className="space-y-1">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">100kW+</p>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Target Scale</p>
                 </div>
                 <div className="space-y-1 border-l pl-8">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">PPA</p>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Financing</p>
                 </div>
                 <div className="space-y-1 border-l pl-8">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">Tier 1</p>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Hardware</p>
                 </div>
              </div>
            </div>

            <div className="relative aspect-square w-full rounded-[3rem] overflow-hidden animate-in fade-in zoom-in-95 duration-1000 group shadow-2xl">
              {solarImg && (
                <Image 
                  src={solarImg.imageUrl}
                  alt={solarImg.description}
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  data-ai-hint={solarImg.imageHint}
                />
              )}
            </div>
          </section>

          <section className="space-y-8">
            <Card className="border-none shadow-xl shadow-slate-100 rounded-[2rem] md:rounded-[3rem] bg-slate-50 overflow-hidden">
                <CardContent className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                    <div className="space-y-6">
                        <p className="text-xl md:text-2xl text-slate-800 font-bold leading-relaxed">
                          Protect your business from rising energy costs.
                        </p>
                        <div className="space-y-4 text-slate-700 font-medium leading-relaxed text-sm md:text-base">
                            <p>
                              With electricity rates in the Philippines among the highest in Asia and rising fuel costs driving constant inflation, upgrading to solar is a critical business decision. 
                            </p>
                            <p>
                              A Power Purchase Agreement (PPA) allows your organization to lock in lower energy rates without the burden of equipment ownership. Solar-Plus installs and maintains the industrial-grade system for free.
                            </p>
                            <p>
                              You only pay for the power you use—guaranteed at a significantly lower rate than your current utility provider, providing immediate relief to your operational overhead.
                            </p>
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-inner flex flex-col gap-6">
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-slate-900">Zero-Capex Solution</h4>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">Perfect for companies that want to keep their capital for business growth while benefiting from green energy.</p>
                            </div>
                            <Separator />
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available for</p>
                                <p className="text-base font-bold text-slate-900 uppercase tracking-tight">100 kW to 200 kW commercial scale</p>
                            </div>
                        </div>
                        <ul className="space-y-4 px-2">
                            <li className="flex items-center gap-3 text-sm md:text-base font-bold text-slate-800">
                                <CheckCircle2 className="h-5 w-5 text-slate-900 shrink-0" /> Zero upfront capital required
                            </li>
                            <li className="flex items-center gap-3 text-sm md:text-base font-bold text-slate-800">
                                <CheckCircle2 className="h-5 w-5 text-slate-900 shrink-0" /> Protection from volatile fuel surcharges
                            </li>
                            <li className="flex items-center gap-3 text-sm md:text-base font-bold text-slate-800">
                                <CheckCircle2 className="h-5 w-5 text-slate-900 shrink-0" /> Immediate reduction in monthly overhead
                            </li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
          </section>

          <section className="space-y-12">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-4xl font-black tracking-tight text-slate-900">Installation Tiers</h2>
              <p className="text-slate-500 font-bold text-xs tracking-[0.2em] uppercase">Engineered for performance</p>
            </div>

            <Carousel className="w-full">
              <CarouselContent className="-ml-4">
                {industries.map((industry, index) => (
                  <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="h-full border-none shadow-xl shadow-slate-100 rounded-[2.5rem] bg-white group hover:shadow-2xl transition-all duration-500">
                      <CardHeader className="p-8">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 rounded-xl bg-slate-50 text-slate-900 transition-colors group-hover:bg-slate-100">
                            <industry.icon className="h-6 w-6" />
                          </div>
                          <CardTitle className="text-xl font-black tracking-tight text-slate-900">{industry.title}</CardTitle>
                        </div>
                        <CardDescription className="text-sm font-semibold text-slate-600 leading-relaxed">
                          {industry.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-8 pt-0 space-y-4">
                        {industry.features.map((feature, fIndex) => (
                          <div key={fIndex} className="flex items-center gap-3 text-xs font-bold text-slate-800 tracking-wide">
                            <CheckCircle2 className="h-4 w-4 text-slate-900 shrink-0" /> {feature}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex justify-center gap-4 mt-12">
                <CarouselPrevious className="static translate-y-0 h-12 w-12 border-slate-200" />
                <CarouselNext className="static translate-y-0 h-12 w-12 border-slate-200" />
              </div>
            </Carousel>
          </section>

          <section className="relative overflow-hidden rounded-[3rem] bg-slate-950 p-8 md:p-20 text-white group shadow-3xl">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
               <Globe className="h-60 w-60" />
            </div>
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/10 text-slate-400">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Intelligence Module</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.95]">
                    Intelligent <br/>Monitoring Hub.
                  </h2>
                  <p className="text-lg text-slate-300 font-medium leading-relaxed max-w-md">
                    Visualize energy yield, cost savings, and hardware health in real-time. This module integrates directly into your workspace command center.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {[
                    { label: 'Live yield', icon: Zap },
                    { label: 'Deduction log', icon: DollarSign },
                    { label: 'ESG reporting', icon: Globe },
                    { label: 'System health', icon: ShieldCheck }
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                      <m.icon className="h-5 w-5 text-primary-light" />
                      <span className="text-xs font-bold uppercase tracking-widest">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Card className="border-none shadow-2xl rounded-[3rem] bg-white/5 backdrop-blur-xl border border-white/10 p-12 flex flex-col items-center justify-center text-center gap-8 relative overflow-hidden group/card">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                  
                  <div className="p-6 rounded-full bg-slate-800 text-slate-400 shadow-inner relative z-10 scale-110">
                    <Lock className="h-10 w-10" />
                  </div>
                  
                  <div className="space-y-3 relative z-10">
                    <h3 className="text-2xl font-black tracking-tight">Upgrade Required</h3>
                    <p className="text-sm text-slate-300 font-medium max-w-[240px] mx-auto leading-relaxed">
                      Real-time monitoring is activated upon successful system synchronization.
                    </p>
                  </div>

                  <Button variant="outline" className="rounded-2xl border-white/20 text-white h-12 px-10 font-bold text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-slate-950 transition-all relative z-10">
                    Inquire about monitoring
                  </Button>
                </Card>
                
                <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-slate-500/10 rounded-full blur-3xl animate-pulse" />
              </div>
            </div>
          </section>

          <footer className="pt-24 pb-12 border-t border-slate-100 flex flex-col items-center text-center gap-10">
            <div className="space-y-6">
              <div className="flex justify-center mb-4">
                 <Image 
                    src="https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/Logo%2Friver-icon-black-v2.png?alt=media&token=d4f3245a-e8bb-4f64-86b2-6282c4beb453" 
                    alt="River Logo" 
                    width={32} 
                    height={32} 
                    className="opacity-10 grayscale"
                  />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authorized infrastructure partner</p>
              <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                <a href="https://solarplus.ph/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">Privacy</a>
                <a href="https://solarplus.ph/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">Terms</a>
                <a href="https://solarplus.ph/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">Contact</a>
              </div>
            </div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">© 2025 Solar-Plus.ph • Strategic energy infrastructure for the Philippines</p>
          </footer>
        </div>
      </ScrollArea>
    </main>
  );
}

const DollarSign = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);
