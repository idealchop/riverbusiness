
'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight, Droplets, MessageSquare, Users, FileText, Sun, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const apps = [
    { 
      id: '01', 
      name: 'Water Logistic', 
      description: 'Your core hydration management engine.',
      features: [
          'Real-time consumption monitoring',
          'Automated & on-demand refill requests',
          'DOH compliance & sanitation reports',
          'Consolidated billing & SOA management'
      ],
      href: '/dashboard', 
      iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2Fwater.svg?alt=media&token=fe3a77fb-7ae5-4568-93f7-7a3e2340288f' 
    },
    { 
      id: '02', 
      name: 'Collaboration', 
      description: 'Next-gen office synchronization.',
      features: [
          'Team-wide task management',
          'Shared office resource scheduling',
          'Unified internal communication',
          'Role-based permission controls'
      ],
      href: '/workspace', 
      iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FCollaboration.svg?alt=media&token=6d687bc0-125b-4ad1-ad48-fc2ceb1b07d9' 
    },
    { 
      id: '03', 
      name: 'HR & Employee', 
      description: 'Workforce intelligence command center.',
      features: [
          'Station-based biometric attendance',
          'Automated payroll processing',
          'Digital leave management',
          '360° employee performance logs'
      ],
      href: '/hr-dashboard', 
      iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FEmployee.svg?alt=media&token=f56983da-df57-429c-b67e-e57faa2ce2a6' 
    },
    { 
      id: '04', 
      name: 'Files', 
      description: 'Secure cloud storage for corporate records.',
      features: [
          'Centralized contract management',
          'Automatic POD & Receipt archiving',
          'End-to-end document encryption',
          'One-click document sharing'
      ],
      href: '/files', 
      iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FFiles.svg?alt=media&token=7f746199-877e-455f-a96f-91b619f9c66a' 
    },
    { 
      id: '05', 
      name: 'Solar Upgrades', 
      description: 'Renewable energy intelligence & logistics.',
      features: [
          'Transition readiness assessment',
          'Solar energy output monitoring',
          'Upgrade ROI calculations',
          'Certified installation scheduling'
      ],
      href: '/solar-upgrades', 
      iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2Fsolar-energy.svg?alt=media&token=2afce575-87ba-40c8-b7f9-5ebd6c5ee284' 
    },
    { 
      id: '06', 
      name: 'Benefits', 
      description: 'Automated corporate benefit systems.',
      features: [
          'Health coverage administration',
          'Corporate insurance management',
          'Benefit claim processing',
          'Employee perk synchronization'
      ],
      href: '/business-insurance', 
      iconUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2FBenefits.svg?alt=media&token=e0a007ac-1929-4a32-afda-8e91c416b62c' 
    },
];

export function InfoCards() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const currentApp = apps[currentStep];

  const handleNext = () => {
    if (currentStep < apps.length - 1) {
        setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
        // Reset to first step when closing with a slight delay for transition
        setTimeout(() => setCurrentStep(0), 300);
    }
  };

  return (
    <div className="h-full">
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Card className="h-full cursor-pointer group transition-all border-none bg-white overflow-hidden flex flex-col active:scale-[0.98] shadow-none">
            <div className="relative aspect-[3/3.6] w-full flex-1">
                <Image 
                    src="https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/app-icons%2Fnew-features.png?alt=media&token=59678e26-137b-4d05-8501-14267e15fd44" 
                    alt="New Features" 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    data-ai-hint="app upgrade"
                />
                
                <div className="absolute top-0 left-0 right-0 p-8 pt-10 z-20 space-y-2">
                    <h3 className="text-4xl font-black tracking-tight text-primary leading-tight">
                        Your App is <br/>Upgraded!
                    </h3>
                    <p className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2 group-hover:translate-x-1 transition-all">
                        See Features <ArrowRight className="h-4 w-4" />
                    </p>
                </div>
            </div>
          </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-4xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="flex flex-col md:flex-row h-full">
            {/* Left Side: Image Showcase */}
            <div className="w-full md:w-[45%] bg-slate-50 flex items-center justify-center p-12 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                
                <div key={currentApp.id} className="relative w-full aspect-square animate-in fade-in zoom-in-95 duration-500">
                    <Image 
                        src={currentApp.iconUrl} 
                        alt={currentApp.name} 
                        fill 
                        className="object-contain drop-shadow-2xl"
                    />
                </div>
            </div>

            {/* Right Side: Feature Details */}
            <div className="flex-1 p-10 md:p-14 flex flex-col justify-between min-h-[500px]">
                <div key={currentApp.id + '-text'} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1">
                            App {currentStep + 1} of {apps.length}
                        </Badge>
                        <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                            {currentApp.name}
                        </h2>
                        <p className="text-lg font-bold text-slate-400">{currentApp.description}</p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-50">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Core Capabilities</h4>
                        <ul className="grid gap-3">
                            {currentApp.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-3 group">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 group-hover:scale-125 transition-transform" />
                                    <span className="text-sm font-bold text-slate-600 leading-tight">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="pt-10 flex flex-col gap-8">
                    <Button asChild className="h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20">
                        <Link href={currentApp.href}>
                            Launch {currentApp.name} <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>

                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleBack} 
                                disabled={currentStep === 0}
                                className="h-10 px-4 rounded-xl border-slate-100 text-slate-500 font-bold uppercase tracking-widest text-[10px] disabled:opacity-20"
                            >
                                <ChevronLeft className="mr-1 h-3 w-3" /> Back
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleNext} 
                                disabled={currentStep === apps.length - 1}
                                className="h-10 px-4 rounded-xl border-slate-100 text-slate-500 font-bold uppercase tracking-widest text-[10px] disabled:opacity-20"
                            >
                                Next <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">River Command</p>
                    </div>
                </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
