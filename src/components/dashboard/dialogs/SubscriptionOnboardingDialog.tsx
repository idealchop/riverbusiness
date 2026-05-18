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
  Smartphone,
  Wrench,
  Info,
  Loader2,
  Hourglass,
  CheckCircle,
  Zap,
  Lock,
  Phone,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { AppUser, PricingHistory } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/icons';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

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
    title: "Professional-grade hydration",
    description: "Standardized drinking water monitored 24/7 with strict laboratory compliance."
  },
  {
    icon: Smartphone,
    title: "Autonomous fulfillment logic",
    description: "End-to-end digital scheduling and hassle-free, automated in-app invoicing."
  },
  {
    icon: Wrench,
    title: "Regular Maintenance",
    description: "Scheduled professional cleaning of your dispensers and containers is included."
  }
];

const planInclusions = [
    "Real-time consumption monitoring",
    "Priority refill fulfillment",
    "Standardized water quality",
    "Monthly dispenser sanitation",
    "Automated digital invoicing"
];

export function SubscriptionOnboardingDialog({ isOpen, onOpenChange, user }: SubscriptionOnboardingDialogProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  // Fetch Global Pricing
  const pricingQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'pricing_history'), orderBy('updatedAt', 'desc'), limit(1)) : null, 
    [firestore]
  );
  const { data: latestPricing } = useCollection<PricingHistory>(pricingQuery);
  const containerPrice = latestPricing?.[0]?.containerPrice || 65;

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
    estimatedWeeklyVolumeRange: '20-50',
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
        monthlyLiters: newSize * 20 
    }));
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
        toast({ variant: 'destructive', title: 'GPS Unavailable', description: 'Your browser does not support geolocation.' });
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
            toast({ title: 'Coordinates captured', description: 'Precise delivery anchor has been set.' });
        },
        (err) => {
            setIsLocating(false);
            toast({ 
                variant: 'destructive', 
                title: 'Access denied', 
                description: 'Please enable location permissions in your browser to pin your office.' 
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
        
        // Internal pricing conversion: Divide container price by 19.5 for liter price
        const finalLiterPrice = containerPrice / 19.5;

        const plan = {
            name: formData.monthlyLiters > 500 ? 'Commercial' : 'SME',
            price: finalLiterPrice,
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
            'customPlanDetails.dispenserQuantity': formData.estimatedDispensers,
            'customPlanDetails.weeklyVolumeRange': formData.estimatedWeeklyVolumeRange
        });

        toast({ title: "Activation initiated", description: "Your setup request has been received by our administration." });
        setStep(0);
    } catch (error) {
        toast({ variant: 'destructive', title: "System error", description: "Could not initialize activation." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const isIntroStep = step === 0;

  if (isPendingApproval) {
      return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden bg-white">
                <div className="p-8 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                            <Hourglass className="h-6 w-6 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold tracking-tight text-slate-900">Activation status</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref: {user?.id.substring(0,8).toUpperCase()}</p>
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
                                <p className="text-sm font-bold text-slate-900 tracking-tight">1. Activation received</p>
                                <p className="text-[10px] font-medium text-slate-400">Digital footprint established and isolate data routing active.</p>
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
                                <p className="text-sm font-bold text-slate-900 tracking-tight">2. Discovery call</p>
                                <p className="text-[10px] font-medium text-slate-400">Logistics prerequisite verification and protocol sync.</p>
                            </div>
                        </div>

                        <div className="relative z-10 flex items-start gap-6 opacity-30">
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-white shadow-lg">
                                <Lock className="h-3 w-3 text-slate-400" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900 tracking-tight">3. Water refill activated</p>
                                <p className="text-[10px] font-medium text-slate-400">Authorized replenishment cycles initiated.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-4">
                        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-blue-900 leading-relaxed tracking-tight">
                            Our administration team is currently processing your setup. You will receive an automated broadcast once the next phase is authorized.
                        </p>
                    </div>
                </div>
                <DialogFooter className="p-6 bg-slate-50 border-t">
                    <DialogClose asChild>
                        <Button variant="outline" className="w-full rounded-xl h-12 font-bold tracking-widest text-[10px] shadow-sm bg-white uppercase">Close tracker</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 overflow-hidden border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-2xl md:rounded-[2.5rem] bg-white transition-all duration-500",
        isIntroStep ? "max-w-[95vw] sm:max-w-4xl h-auto" : "max-w-[95vw] sm:max-w-3xl h-[90vh]"
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
                              <span className="text-xs font-bold tracking-widest whitespace-nowrap uppercase">{s.title}</span>
                          </div>
                      )
                  })}
               </nav>
            </div>
          )}

          {/* Right: Active Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {isIntroStep ? (
                /* Step 0: Value Proposition (No Plan View) - Optimized for Mobile */
                <div className="flex flex-col md:flex-row max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-hidden animate-in fade-in duration-500">
                    <div className="flex-1 p-6 sm:p-8 md:p-14 space-y-8 md:space-y-12">
                        <div className="space-y-4">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-tight">
                                Unlock intelligent <br/><span className="text-primary">hydration infrastructure.</span>
                            </h2>
                            <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed max-w-sm">
                                Join a professional network of high-fidelity operations utilizing premium resources for the workforce.
                            </p>
                        </div>

                        <div className="grid gap-6 md:gap-8">
                            {valueProps.map((prop, idx) => (
                                <div className="flex gap-4 md:gap-5 group" key={idx}>
                                    <div className="py-1 text-slate-400 group-hover:text-primary transition-all shrink-0">
                                        <prop.icon className="h-5 w-5 md:h-6 md:w-6" />
                                    </div>
                                    <div className="space-y-0.5 md:space-y-1">
                                        <h4 className="text-xs md:text-sm font-bold text-slate-900">{prop.title}</h4>
                                        <p className="text-[10px] md:text-xs font-medium text-slate-400 leading-relaxed">{prop.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-50">
                            <DialogClose asChild>
                                <Button variant="ghost" className="w-full sm:w-auto rounded-xl h-11 px-8 font-bold text-xs text-slate-400 hover:text-slate-900 uppercase tracking-widest order-2 sm:order-1">
                                    Dismiss
                                </Button>
                            </DialogClose>
                            <Button 
                                onClick={nextStep}
                                className="w-full sm:w-auto rounded-xl h-12 px-12 font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 order-1 sm:order-2"
                            >
                                Activate membership <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="hidden md:flex w-[42%] bg-slate-950 text-white p-10 flex-col justify-center relative overflow-hidden shrink-0 border-l border-white/5">
                        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
                            <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                        </div>

                        <div className="relative z-10 space-y-8">
                            <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-md border border-white/30 space-y-8 shadow-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center">
                                        <MapPin className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-white tracking-tight">Logistics Hub</p>
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Network Search</p>
                                    </div>
                                </div>
                                
                                <div className="aspect-square rounded-[2rem] bg-slate-900/50 border border-white/5 flex flex-col items-center justify-center p-8 text-center gap-5 group cursor-default shadow-inner">
                                    <div className="flex items-center justify-center transition-all duration-500 hover:scale-110">
                                        <Globe className="h-12 w-12 text-white/10 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                                            Interface pending
                                        </p>
                                        <p className="text-[10px] font-bold text-white/30 leading-relaxed max-w-[160px] mx-auto">
                                            Automated station discovery protocol is initializing.
                                        </p>
                                    </div>
                                </div>

                                <Button className="w-full h-12 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-bold text-xs border-none shadow-xl transition-all active:scale-95 uppercase tracking-wide">
                                    Analyze nearby stations <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="absolute bottom-10 left-10 text-[9px] font-black uppercase tracking-[0.6em] text-white/10">River Command</div>
                    </div>
                </div>
            ) : (
                /* Steps 1-4: Onboarding Form */
                <>
                    <header className="p-6 sm:p-8 md:p-12 pb-8 flex flex-col border-b border-slate-50 shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="space-y-1">
                                <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                                    {STEPS[step].title}
                                </DialogTitle>
                            </div>
                        </div>
                        <DialogDescription className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed max-w-xl">
                            {step === 1 && "Please provide your business details. This ensures accurate deliveries and billing."}
                            {step === 2 && "Enter your total staff count. We use this to estimate your weekly water and equipment needs."}
                            {step === 3 && "Review your specialized consumption tier. Our Flow Plan scales with your business so you only pay for what you use."}
                            {step === 4 && "Your profile is ready. Review the timeline below for starting your service."}
                        </DialogDescription>
                    </header>

                    <ScrollArea className="flex-1">
                        <div className="p-6 sm:p-8 md:p-12 pt-6">
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                {step === 1 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 ml-1">Business entity name</Label>
                                            <Input value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4 shadow-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 ml-1">Authorized representative</Label>
                                            <Input value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4 shadow-none" />
                                        </div>
                                        <div className="sm:col-span-2 space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 ml-1">Primary service address</Label>
                                            <div className="relative group">
                                                <Input value={formData.serviceAddress} onChange={e => setFormData({...formData, serviceAddress: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold pl-4 pr-12 shadow-none" placeholder="Street, Building, Floor..." />
                                                <button 
                                                    type="button"
                                                    onClick={handleCaptureLocation}
                                                    disabled={isLocating}
                                                    className={cn(
                                                        "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center transition-all shadow-sm",
                                                        formData.latitude ? "bg-primary text-white" : "bg-white text-slate-400 hover:text-primary hover:bg-primary/5 border"
                                                    )}
                                                    title="Pin point exact location"
                                                >
                                                    {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            {formData.latitude && (
                                                <p className="text-[10px] font-bold text-green-600 flex items-center gap-1.5 mt-1 animate-in fade-in">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Precision anchor set: {formData.latitude.toFixed(4)}, {formData.longitude?.toFixed(4)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 ml-1">Business contact number</Label>
                                            <Input value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4 shadow-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 ml-1">Verified account identity</Label>
                                            <Input value={user?.email || ''} disabled className="h-12 rounded-xl bg-slate-100 border-slate-200 font-mono text-[10px] px-4 opacity-70" />
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="grid gap-6">
                                        <Card className="border-none shadow-none bg-slate-50 rounded-[2rem] p-6 sm:p-8 space-y-6 sm:space-y-8">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <div className="p-2 sm:p-3 rounded-2xl bg-white shadow-sm text-primary">
                                                        <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-none">Workforce count</p>
                                                        <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 mt-1">Total active employees</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <button onClick={() => updateTeamSize(Math.max(1, formData.teamSize - 1))} className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-bold shadow-sm hover:bg-slate-50 transition-colors">-</button>
                                                    <span className="text-xl sm:text-2xl font-bold tabular-nums w-8 sm:w-12 text-center">{formData.teamSize}</span>
                                                    <button onClick={() => updateTeamSize(formData.teamSize + 1)} className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-bold shadow-sm hover:bg-slate-50 transition-colors">+</button>
                                                </div>
                                            </div>
                                            
                                            <Separator className="bg-slate-200/50" />
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <div className="p-2 sm:p-3 rounded-2xl bg-white shadow-sm text-primary">
                                                        <Droplets className="h-5 w-5 sm:h-6 sm:w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-none">Consumption volume</p>
                                                        <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 mt-1">Projected weekly replenishment</p>
                                                    </div>
                                                </div>
                                                <div className="w-28 sm:w-32">
                                                    <Select 
                                                        value={formData.estimatedWeeklyVolumeRange} 
                                                        onValueChange={(val) => setFormData({...formData, estimatedWeeklyVolumeRange: val})}
                                                    >
                                                        <SelectTrigger className="h-9 sm:h-10 rounded-xl bg-white border-slate-100 shadow-sm font-bold text-[10px] sm:text-xs">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            <SelectItem value="10-20">10-20 units</SelectItem>
                                                            <SelectItem value="20-50">20-50 units</SelectItem>
                                                            <SelectItem value="50-100">50-100 units</SelectItem>
                                                            <SelectItem value="100-200">100-200 units</SelectItem>
                                                            <SelectItem value="300+">300+ more</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <Separator className="bg-slate-200/50" />
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <div className="p-2 sm:p-3 rounded-2xl bg-white shadow-sm text-primary">
                                                        <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-none">Equipment deployment</p>
                                                        <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 mt-1">Planned dispensers</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <button onClick={() => setFormData({...formData, estimatedDispensers: Math.max(1, formData.estimatedDispensers - 1)})} className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-bold shadow-sm hover:bg-slate-50 transition-colors">-</button>
                                                    <span className="text-xl sm:text-2xl font-bold tabular-nums w-8 sm:w-12 text-center">{formData.estimatedDispensers}</span>
                                                    <button onClick={() => setFormData({...formData, estimatedDispensers: formData.estimatedDispensers + 1})} className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-bold shadow-sm hover:bg-slate-50 transition-colors">+</button>
                                                </div>
                                            </div>

                                            <Separator className="bg-slate-200/50" />
                                            <div className="flex items-center gap-2 pt-2 px-1 opacity-60">
                                                <ShieldCheck className="h-3 w-3 text-green-600" />
                                                <p className="text-[9px] font-bold text-slate-500">
                                                    Security active <span className="mx-1 text-slate-300 font-normal">|</span> System identity verified
                                                </p>
                                            </div>
                                        </Card>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-10">
                                        <Card className="border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-primary to-primary-light text-white p-6 sm:p-10 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                                <Droplets className="h-24 w-24" />
                                            </div>
                                            <div className="relative z-10 space-y-6">
                                                <div className="space-y-1">
                                                    <h4 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Flow Plan Tier</h4>
                                                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">Authorized consumption pricing</p>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-5xl sm:text-6xl font-black tracking-tighter">₱{containerPrice.toFixed(2)}</p>
                                                    <p className="text-xs sm:text-sm font-bold opacity-60 uppercase">Per Container</p>
                                                </div>
                                                <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">No hidden overhead</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Included in your activation</h4>
                                            <div className="grid gap-4">
                                                {planInclusions.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 group transition-all hover:bg-white hover:border-primary/20">
                                                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                                                        </div>
                                                        <span className="text-xs sm:text-sm font-bold text-slate-700">{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="relative pl-6 space-y-12 py-4">
                                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100" />
                                        
                                        <div className="relative z-10 flex items-start gap-6 group">
                                            <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-white shadow-lg">1</div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-slate-900 tracking-tight">Request received</p>
                                                <p className="text-[10px] sm:text-xs font-medium text-slate-400 leading-relaxed">We're setting up your workspace and secure data routing.</p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex items-start gap-6 group">
                                            <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-[10px] ring-4 ring-white shadow-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors">2</div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-900 tracking-tight">Verification call</p>
                                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                </div>
                                                <p className="text-[10px] sm:text-xs font-medium text-slate-400 leading-relaxed">A specialist will call to verify your delivery spot and schedule.</p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex items-start gap-6 group">
                                            <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-[10px] ring-4 ring-white shadow-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors">3</div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-900 tracking-tight">Service active</p>
                                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[8px] h-4 uppercase font-bold shadow-none">Priority</Badge>
                                                </div>
                                                <p className="text-[10px] sm:text-xs font-medium text-slate-400 leading-relaxed">Coordinated dispatch initiated for primary infrastructure replenishment.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 sm:p-8 bg-slate-50 border-t shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
                        <div className="hidden sm:flex items-center gap-3">
                            <div className={cn("h-1.5 w-1.5 rounded-full", step >= 0 ? "bg-primary" : "bg-slate-200")} />
                            <div className={cn("h-1.5 w-1.5 rounded-full", step >= 1 ? "bg-primary" : "bg-slate-200")} />
                            <div className={cn("h-1.5 w-1.5 rounded-full", step >= 2 ? "bg-primary" : "bg-slate-200")} />
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {step < STEPS.length - 1 ? (
                                <>
                                    <Button variant="ghost" onClick={prevStep} disabled={isSubmitting} className="rounded-xl h-11 px-6 font-bold text-xs text-slate-400 hover:text-slate-900 uppercase tracking-widest">
                                        <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                                    </Button>
                                    <Button onClick={nextStep} className="flex-1 sm:flex-none rounded-xl h-11 px-10 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/10">
                                        Next phase <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="ghost" onClick={prevStep} disabled={isSubmitting} className="rounded-xl h-11 px-6 font-bold text-xs text-slate-400 hover:text-slate-900 uppercase tracking-widest">
                                        <ChevronLeft className="mr-2 h-4 w-4" /> Back
                                    </Button>
                                    <Button onClick={handleFinalize} disabled={isSubmitting} className="flex-1 sm:flex-none rounded-xl h-11 px-14 font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90">
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                        {isSubmitting ? 'Synchronizing...' : 'Authorize setup'}
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
