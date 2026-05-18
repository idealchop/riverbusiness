'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ChevronRight, 
  ChevronLeft, 
  Building, 
  Users, 
  CheckCircle2, 
  Droplets, 
  ArrowRight,
  ShieldCheck,
  Package,
  Clock,
  MapPin,
  Globe,
  Headset,
  Smartphone,
  Wrench,
  Info,
  Loader2,
  Hourglass,
  CheckCircle,
  Zap,
  Lock,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { AppUser } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/icons';

interface SubscriptionOnboardingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
}

const STEPS = [
  { id: 'overview', title: 'Smart Refill', icon: ShieldCheck },
  { id: 'profile', title: 'Account', icon: Building },
  { id: 'team', title: 'Team Size', icon: Users },
  { id: 'plan', title: 'Pricing', icon: Droplets },
  { id: 'timeline', title: 'Activation', icon: Clock }
];

const valueProps = [
  {
    icon: ShieldCheck,
    title: "professional-grade hydration",
    description: "standardized drinking water monitored 24/7 with strict laboratory compliance."
  },
  {
    icon: Smartphone,
    title: "autonomous fulfillment logic",
    description: "end-to-end digital scheduling and hassle-free, automated in-app invoicing."
  },
  {
    icon: Wrench,
    title: "regular maintanance",
    description: "scheduled professional cleaning of your dispensers and containers is included."
  },
  {
    icon: Package,
    title: "infrastructure provisioning",
    description: "authorized use of premium hot and cold dispensers and high-fidelity containers."
  },
  {
    icon: Headset,
    title: "executive support access",
    description: "dedicated quality officers available around the clock to support your organization."
  }
];

export function SubscriptionOnboardingDialog({ isOpen, onOpenChange, user }: SubscriptionOnboardingDialogProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const isPendingApproval = user?.subscriptionStatus && user.subscriptionStatus !== 'activated';

  // Onboarding Form State
  const [formData, setFormData] = useState({
    businessName: '',
    serviceAddress: '',
    contactName: '',
    contactNumber: '',
    latitude: 0 as number | null,
    longitude: 0 as number | null,
    teamSize: 20,
    estimatedDispensers: 2,
    monthlyLiters: 400,
    preferredDay: 'Monday',
    paymentMethod: 'GCash'
  });

  // Pre-fill effect
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        businessName: user.businessName || '',
        serviceAddress: user.address || '',
        contactName: user.name || '',
        contactNumber: user.contactNumber || ''
      }));
    }
  }, [user]);

  const nextStep = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const prevStep = () => setStep(s => Math.max(0, s - 1));

  const updateTeamSize = (newSize: number) => {
    setFormData(prev => ({
        ...prev,
        teamSize: newSize,
        // Automated estimate: 20L per person per month
        monthlyLiters: newSize * 20 
    }));
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
        toast({ variant: 'destructive', title: 'gps unavailable', description: 'your browser does not support geolocation.' });
        return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            setFormData(prev => ({
                ...prev,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude
            }));
            setIsLocating(false);
            toast({ title: 'coordinates captured', description: 'precise delivery anchor has been set.' });
        },
        (err) => {
            setIsLocating(false);
            toast({ 
                variant: 'destructive', 
                title: 'access denied', 
                description: 'please enable location permissions in your browser to pin your office.' 
            });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleFinalize = async () => {
    if (!firestore || !user) return;
    setIsSubmitting(true);
    
    try {
        const userRef = doc(firestore, 'users', user.id);
        const plan = {
            name: formData.monthlyLiters > 500 ? 'Commercial' : 'SME',
            price: 3,
            isConsumptionBased: true
        };

        await updateDoc(userRef, {
            businessName: formData.businessName,
            address: formData.serviceAddress,
            name: formData.contactName,
            contactNumber: formData.contactNumber,
            latitude: formData.latitude,
            longitude: formData.longitude,
            plan,
            subscriptionStatus: 'pending_activation',
            updatedAt: serverTimestamp(),
            'customPlanDetails.deliveryDay': formData.preferredDay,
            'customPlanDetails.autoRefillEnabled': true,
            'customPlanDetails.dispenserQuantity': formData.estimatedDispensers
        });

        toast({ title: "activation initiated", description: "your setup request has been received by our administration." });
        setStep(0);
    } catch (error) {
        toast({ variant: 'destructive', title: "system error", description: "could not initialize activation." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;
  const isIntroStep = step === 0;

  if (isPendingApproval) {
      return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden bg-white">
                <DialogHeader className="sr-only">
                    <DialogTitle>subscription approval tracker</DialogTitle>
                    <DialogDescription>track the progress of your smart refill activation.</DialogDescription>
                </DialogHeader>
                <div className="p-8 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                            <Hourglass className="h-6 w-6 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-slate-900 lowercase">activation status</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ref: {user?.id.substring(0,8).toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="relative pl-6 space-y-12">
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100" />
                        
                        <div className={cn(
                            "relative z-10 flex items-start gap-6 transition-all duration-500",
                            user?.subscriptionStatus === 'pending_activation' || user?.subscriptionStatus === 'discovery_call' ? "opacity-100" : "opacity-30"
                        )}>
                            <div className={cn(
                                "h-6 w-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all",
                                (user?.subscriptionStatus === 'pending_activation' || user?.subscriptionStatus === 'discovery_call') ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                            )}>
                                <CheckCircle className="h-3 w-3" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black text-slate-900 lowercase tracking-tight">1. activation receive</p>
                                <p className="text-[10px] font-medium text-slate-400">digital footprint established and isolate data routing active.</p>
                            </div>
                        </div>

                        <div className={cn(
                            "relative z-10 flex items-start gap-6 transition-all duration-500",
                            user?.subscriptionStatus === 'discovery_call' ? "opacity-100" : "opacity-30"
                        )}>
                            <div className={cn(
                                "h-6 w-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all",
                                user?.subscriptionStatus === 'discovery_call' ? "bg-primary text-white scale-110" : "bg-slate-100 text-slate-400"
                            )}>
                                {user?.subscriptionStatus === 'discovery_call' ? <Zap className="h-3 w-3 animate-pulse" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black text-slate-900 lowercase tracking-tight">2. discovery call</p>
                                <p className="text-[10px] font-medium text-slate-400">logistics prerequisite verification and protocol sync.</p>
                            </div>
                        </div>

                        <div className="relative z-10 flex items-start gap-6 opacity-30">
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-white shadow-lg">
                                <Lock className="h-3 w-3 text-slate-400" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black text-slate-900 lowercase tracking-tight">3. water refill activated</p>
                                <p className="text-[10px] font-medium text-slate-400">authorized replenishment cycles initiated.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-4">
                        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-blue-900 leading-relaxed lowercase tracking-tight">
                            our administration team is currently processing your setup. you will receive an automated broadcast once the next phase is authorized.
                        </p>
                    </div>
                </div>
                <DialogFooter className="p-6 bg-slate-50 border-t">
                    <DialogClose asChild>
                        <Button variant="outline" className="w-full rounded-xl h-12 font-black lowercase tracking-widest text-[10px] shadow-sm bg-white">close tracker</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 overflow-hidden border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[2.5rem] bg-white transition-all duration-500",
        isIntroStep ? "sm:max-w-4xl h-auto" : "sm:max-w-3xl h-[90vh]"
      )}>
        <div className="flex h-full overflow-hidden">
          {/* Left: Stepper Navigation (Desktop) - Hidden on Intro */}
          {!isIntroStep && (
            <div className="hidden md:flex w-64 bg-slate-900 p-10 flex-col shrink-0 animate-in slide-in-from-left duration-500">
               <div className="flex items-center gap-3 mb-12">
                  <Logo className="h-10 w-10" />
                  <div className="flex flex-col">
                      <span className="font-black text-xs uppercase tracking-[0.2em] text-white leading-tight">Water</span>
                      <span className="font-bold text-[10px] uppercase tracking-widest text-slate-400 leading-tight">Refill</span>
                  </div>
               </div>

               <nav className="flex-1 space-y-1">
                  {STEPS.slice(1).map((s, idx) => {
                      const Icon = s.icon;
                      const realIndex = idx + 1;
                      const isActive = realIndex === step;
                      const isCompleted = realIndex < step;

                      return (
                          <div key={s.id} className={cn(
                              "flex items-center gap-4 py-3 px-4 rounded-xl transition-all duration-300",
                              isActive ? "bg-white/10 text-white shadow-sm" : isCompleted ? "text-primary-light/60" : "text-white/20"
                          )}>
                              <div className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-lg border transition-all",
                                  isActive ? "bg-primary border-primary text-white scale-110" : isCompleted ? "bg-primary/20 border-primary/20 text-primary-light" : "border-white/10"
                              )}>
                                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                              </div>
                              <span className="text-xs font-bold lowercase tracking-widest whitespace-nowrap">{s.title.toLowerCase()}</span>
                          </div>
                      )
                  })}
               </nav>
            </div>
          )}

          {/* Right: Active Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {isIntroStep ? (
                /* Step 0: Value Proposition (No Plan View) */
                <div className="flex flex-col md:flex-row min-h-[600px] animate-in fade-in duration-500">
                    <DialogHeader className="sr-only">
                        <DialogTitle>smart refill overview</DialogTitle>
                        <DialogDescription>analyze the advantages of standardized water management.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 p-8 md:p-14 space-y-12">
                        <div className="space-y-4">
                            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-tight lowercase">
                                unlock intelligent <br/><span className="text-primary">hydration infrastructure.</span>
                            </h2>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-sm lowercase">
                                join a professional network of high-fidelity operations utilizing premium resources for the workforce.
                            </p>
                        </div>

                        <div className="grid gap-8">
                            {valueProps.map((prop, idx) => (
                                <div className="flex gap-5 group" key={idx}>
                                    <div className="py-1 text-slate-400 group-hover:text-primary transition-all shrink-0">
                                        <prop.icon className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-900 lowercase">{prop.title}</h4>
                                        <p className="text-xs font-medium text-slate-400 leading-relaxed lowercase">{prop.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                            <DialogClose asChild>
                                <Button variant="ghost" className="rounded-xl h-11 px-8 font-bold text-xs text-slate-400 hover:text-slate-900 lowercase">
                                    dismiss
                                </Button>
                            </DialogClose>
                            <Button 
                                onClick={nextStep}
                                className="rounded-xl h-12 px-12 font-black lowercase tracking-widest text-[10px] shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90"
                            >
                                activate membership <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="w-full md:w-[42%] bg-slate-950 text-white p-10 flex flex-col justify-center relative overflow-hidden shrink-0 border-l border-white/5">
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
                                        <p className="text-xs font-bold text-white lowercase">logistics hub</p>
                                        <p className="text-[10px] font-bold text-white/40 lowercase tracking-widest">network search</p>
                                    </div>
                                </div>
                                
                                <div className="aspect-square rounded-[2rem] bg-slate-900/50 border border-white/5 flex flex-col items-center justify-center p-8 text-center gap-5 group cursor-default shadow-inner">
                                    <div className="flex items-center justify-center transition-all duration-500 hover:scale-110">
                                        <Globe className="h-12 w-12 text-white/10 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black lowercase tracking-[0.3em] text-white/20">
                                            interface pending
                                        </p>
                                        <p className="text-[10px] font-bold text-white/30 leading-relaxed max-w-[160px] mx-auto lowercase">
                                            automated station discovery protocol is initializing.
                                        </p>
                                    </div>
                                </div>

                                <Button className="w-full h-12 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-bold text-xs border-none shadow-xl transition-all active:scale-95 lowercase">
                                    analyze nearby stations <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="absolute bottom-10 left-10 text-[9px] font-black lowercase tracking-[0.6em] text-white/10">river command</div>
                    </div>
                </div>
            ) : (
                /* Steps 1-4: Onboarding Form */
                <>
                    <header className="p-8 md:p-12 pb-6 flex items-center justify-between border-b border-slate-50 shrink-0">
                        <div className="space-y-1">
                            <Badge variant="outline" className="text-[9px] font-black lowercase tracking-0.2em text-primary border-primary/20 mb-2">
                                configuration phase {step} of {STEPS.length - 1}
                            </Badge>
                            <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 lowercase">
                                {STEPS[step].title.toLowerCase()}
                            </DialogTitle>
                        </div>
                        <div className="md:hidden">
                            <Progress value={progress} className="w-20 h-1" />
                        </div>
                    </header>

                    <ScrollArea className="flex-1">
                        <div className="p-8 md:p-12 pt-6">
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                {step === 1 && (
                                    <div className="space-y-8">
                                        <p className="text-sm font-medium text-slate-500 leading-relaxed lowercase">
                                            establish your corporate identity. these records are utilized for logistics routing and tax-compliant financial documentation.
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black lowercase tracking-widest text-slate-400 ml-1">business entity name</Label>
                                                <Input value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black lowercase tracking-widest text-slate-400 ml-1">authorized representative</Label>
                                                <Input value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4" />
                                            </div>
                                            <div className="sm:col-span-2 space-y-2">
                                                <Label className="text-[10px] font-black lowercase tracking-widest text-slate-400 ml-1">primary service address</Label>
                                                <div className="relative group">
                                                    <Input value={formData.serviceAddress} onChange={e => setFormData({...formData, serviceAddress: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold pl-4 pr-12 lowercase" placeholder="street, building, floor..." />
                                                    <button 
                                                        type="button"
                                                        onClick={handleCaptureLocation}
                                                        disabled={isLocating}
                                                        className={cn(
                                                            "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                                                            formData.latitude ? "bg-primary text-white" : "bg-white text-slate-400 hover:text-primary hover:bg-primary/5"
                                                        )}
                                                        title="pin point exact location"
                                                    >
                                                        {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                {formData.latitude && (
                                                    <p className="text-[9px] font-bold text-green-600 lowercase tracking-widest flex items-center gap-1.5 mt-1 animate-in fade-in">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        precision anchor set: {formData.latitude.toFixed(4)}, {formData.longitude?.toFixed(4)}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black lowercase tracking-widest text-slate-400 ml-1">business contact number</Label>
                                                <Input value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black lowercase tracking-widest text-slate-400 ml-1">active system identity</Label>
                                                <Input value={user?.email || ''} disabled className="h-12 rounded-xl bg-slate-100 border-slate-200 font-mono text-xs px-4" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-8">
                                        <p className="text-sm font-medium text-slate-500 leading-relaxed lowercase">
                                            specify your operational workforce size. this enables the system to compute an optimized allocation for zero-friction supply replenishment.
                                        </p>
                                        <div className="grid gap-6">
                                            <Card className="border-none shadow-none bg-slate-50 rounded-[2rem] p-8 space-y-8">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 rounded-2xl bg-white shadow-sm text-primary">
                                                            <Users className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 lowercase tracking-tight leading-none">team size</p>
                                                            <p className="text-[10px] font-bold text-slate-400 lowercase tracking-widest mt-1">active directory count</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <button onClick={() => updateTeamSize(Math.max(1, formData.teamSize - 1))} className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black shadow-sm">-</button>
                                                        <span className="text-2xl font-black tabular-nums w-12 text-center">{formData.teamSize}</span>
                                                        <button onClick={() => updateTeamSize(formData.teamSize + 1)} className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black shadow-sm">+</button>
                                                    </div>
                                                </div>
                                                
                                                <Separator className="bg-slate-200/50" />
                                                
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 rounded-2xl bg-white shadow-sm text-primary">
                                                            <Droplets className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 lowercase tracking-tight leading-none">estimated volume</p>
                                                            <p className="text-[10px] font-bold text-slate-400 lowercase tracking-widest mt-1">based on team size</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-primary tabular-nums leading-none">
                                                            {formData.monthlyLiters} <span className="text-xs">l</span>
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-400 lowercase mt-1">liters per month</p>
                                                    </div>
                                                </div>

                                                <Separator className="bg-slate-200/50" />
                                                
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 rounded-2xl bg-white shadow-sm text-primary">
                                                            <Package className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 lowercase tracking-tight leading-none">infrastructure nodes</p>
                                                            <p className="text-[10px] font-bold text-slate-400 lowercase tracking-widest mt-1">dispensers required</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <button onClick={() => setFormData({...formData, estimatedDispensers: Math.max(1, formData.estimatedDispensers - 1)})} className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black shadow-sm">-</button>
                                                        <span className="text-2xl font-black tabular-nums w-12 text-center">{formData.estimatedDispensers}</span>
                                                        <button onClick={() => setFormData({...formData, estimatedDispensers: formData.estimatedDispensers + 1})} className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black shadow-sm">+</button>
                                                    </div>
                                                </div>
                                            </Card>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-8">
                                        <p className="text-sm font-medium text-slate-500 leading-relaxed lowercase">
                                            based on your workforce metrics, the flow plan is recommended. this tier provides maximum flexibility with usage-based financial logic.
                                        </p>
                                        
                                        <Card className="border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-primary to-primary-light text-white p-8 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                                <Droplets className="h-24 w-24" />
                                            </div>
                                            <div className="relative z-10 space-y-6">
                                                <div className="space-y-1">
                                                    <h4 className="text-xl font-black tracking-tight lowercase">flow plan tier</h4>
                                                    <p className="text-[10px] font-bold lowercase tracking-widest opacity-60">high-fidelity consumption pricing</p>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-5xl font-black tracking-tighter">₱3.00</p>
                                                    <p className="text-sm font-bold opacity-60 lowercase">per liter</p>
                                                </div>
                                                <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        <span className="text-[10px] font-bold lowercase tracking-widest">no hidden overhead</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        <span className="text-[10px] font-bold lowercase tracking-widest">real-time analysis</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black lowercase tracking-widest text-slate-400 ml-1">projected monthly consumption (liters)</Label>
                                            <Input 
                                                type="number" 
                                                value={formData.monthlyLiters} 
                                                onChange={e => setFormData({...formData, monthlyLiters: Number(e.target.value)})} 
                                                className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black text-xl text-primary" 
                                            />
                                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2 pt-1 lowercase">
                                                <Info className="h-3 w-3" />
                                                operational estimate: ₱{(formData.monthlyLiters * 3).toLocaleString()} / mo
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-8">
                                        <p className="text-sm font-medium text-slate-500 leading-relaxed lowercase">
                                            your organizational profile is ready for initialization. review the professional activation timeline below:
                                        </p>

                                        <div className="relative pl-6 space-y-12">
                                            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100" />
                                            
                                            <div className="relative z-10 flex items-start gap-6 group">
                                                <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center font-black text-[10px] ring-4 ring-white shadow-lg">1</div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-black text-slate-900 lowercase tracking-tight">activation receive</p>
                                                    <p className="text-xs font-medium text-slate-400 lowercase">digital footprint established and secure data routing active.</p>
                                                </div>
                                            </div>

                                            <div className="relative z-10 flex items-start gap-6 group">
                                                <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black text-[10px] ring-4 ring-white shadow-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors">2</div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-black text-slate-900 lowercase tracking-tight">discovery call</p>
                                                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-400 lowercase">logistics prerequisite verification and protocol sync via authorized officer.</p>
                                                </div>
                                            </div>

                                            <div className="relative z-10 flex items-start gap-6 group">
                                                <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black text-[10px] ring-4 ring-white shadow-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors">3</div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-black text-slate-900 lowercase tracking-tight">water refill activated</p>
                                                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[8px] h-4 lowercase">priority</Badge>
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-400 lowercase">coordinated dispatch initiated for primary infrastructure replenishment.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-8 bg-slate-50/50 border-t shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className={cn("h-2.5 w-2.5 rounded-full", step >= 0 ? "bg-primary" : "bg-slate-200")} />
                            <div className={cn("h-2.5 w-2.5 rounded-full", step >= 1 ? "bg-primary" : "bg-slate-200")} />
                            <span className="text-[10px] font-black lowercase tracking-widest text-slate-400 ml-2">phase {step} of {STEPS.length - 1}</span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {step < STEPS.length - 1 ? (
                                <>
                                    <Button variant="ghost" onClick={prevStep} disabled={isSubmitting} className="rounded-xl h-12 px-6 font-bold text-slate-400 hover:text-slate-900 lowercase">
                                        <ChevronLeft className="mr-2 h-4 w-4" /> previous
                                    </Button>
                                    <Button onClick={nextStep} className="flex-1 sm:flex-none rounded-xl h-12 px-12 font-black lowercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
                                        next phase <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="ghost" onClick={prevStep} disabled={isSubmitting} className="rounded-xl h-12 px-6 font-bold text-slate-400 hover:text-slate-900 lowercase">
                                        <ChevronLeft className="mr-2 h-4 w-4" /> back
                                    </Button>
                                    <Button onClick={handleFinalize} disabled={isSubmitting} className="flex-1 sm:flex-none rounded-xl h-12 px-16 font-black lowercase tracking-widest text-[10px] shadow-xl shadow-primary/30 bg-primary hover:bg-primary/90">
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                        {isSubmitting ? 'synchronizing...' : 'authorize setup'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </DialogFooter>
                </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}