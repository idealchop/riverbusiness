'use client';

import React, { useState, useMemo } from 'react';
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
  CreditCard, 
  CheckCircle2, 
  Droplets, 
  Calendar,
  ArrowRight,
  ShieldCheck,
  Package,
  Clock,
  Sparkles
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

interface SubscriptionOnboardingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
}

const STEPS = [
  { id: 'profile', title: 'Business Profile', icon: Building },
  { id: 'team', title: 'Team Logistics', icon: Users },
  { id: 'plan', title: 'Consumption Tier', icon: Droplets },
  { id: 'payment', title: 'Settlement Setup', icon: CreditCard },
  { id: 'timeline', title: 'Activation', icon: Clock }
];

export function SubscriptionOnboardingDialog({ isOpen, onOpenChange, user }: SubscriptionOnboardingDialogProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  // Onboarding Form State
  const [formData, setFormData] = useState({
    businessName: user?.businessName || '',
    serviceAddress: user?.address || '',
    contactName: user?.name || '',
    contactNumber: user?.contactNumber || '',
    teamSize: 20,
    estimatedDispensers: 2,
    monthlyLiters: 400,
    preferredDay: 'Monday',
    paymentMethod: 'GCash'
  });

  const nextStep = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const prevStep = () => setStep(s => Math.max(0, s - 1));

  const handleFinalize = async () => {
    if (!firestore || !user) return;
    setIsSubmitting(true);
    
    try {
        const userRef = doc(firestore, 'users', user.id);
        const plan = {
            name: formData.monthlyLiters > 500 ? 'Commercial' : 'SME',
            price: 3, // Per liter base
            isConsumptionBased: true
        };

        await updateDoc(userRef, {
            plan,
            onboardingComplete: true,
            updatedAt: serverTimestamp(),
            'customPlanDetails.deliveryDay': formData.preferredDay,
            'customPlanDetails.autoRefillEnabled': true,
            'customPlanDetails.dispenserQuantity': formData.estimatedDispensers
        });

        toast({ title: "Welcome to the Network", description: "Your Smart Refill subscription is now active." });
        onOpenChange(false);
        setStep(0);
    } catch (error) {
        toast({ variant: 'destructive', title: "System Error", description: "Could not finalize subscription." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[2.5rem] bg-white h-[90vh] flex flex-col">
        <div className="flex h-full overflow-hidden">
          {/* Left: Stepper Navigation (Desktop) */}
          <div className="hidden md:flex w-64 bg-slate-900 p-10 flex-col shrink-0">
             <div className="flex items-center gap-3 mb-12">
                <div className="p-2 rounded-xl bg-white/10">
                    <ShieldCheck className="h-5 w-5 text-primary-light" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">River Setup</span>
             </div>

             <nav className="flex-1 space-y-1">
                {STEPS.map((s, idx) => {
                    const Icon = s.icon;
                    const isActive = idx === step;
                    const isCompleted = idx < step;

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
                            <span className="text-xs font-bold uppercase tracking-widest">{s.title}</span>
                        </div>
                    )
                })}
             </nav>
             
             <div className="mt-auto space-y-4">
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 leading-none">Security Active</p>
                    <p className="text-[9px] font-bold text-white/20 leading-relaxed">System identity verified via Firebase Auth protocol.</p>
                 </div>
             </div>
          </div>

          {/* Right: Active Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <header className="p-8 md:p-12 pb-6 flex items-center justify-between border-b border-slate-50 shrink-0">
                <div className="space-y-1">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.2em] text-primary border-primary/20 mb-2">
                        Phase {step + 1} of {STEPS.length}
                    </Badge>
                    <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                        {STEPS[step].title}
                    </DialogTitle>
                </div>
                <div className="md:hidden">
                    <Progress value={progress} className="w-20 h-1" />
                </div>
            </header>

            <ScrollArea className="flex-1">
                <div className="p-8 md:p-12 pt-6">
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        {step === 0 && (
                            <div className="space-y-8">
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                    Verify your corporate identity. These details will be used for delivery routing and official tax-compliant invoicing.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Business name</Label>
                                        <Input value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact representative</Label>
                                        <Input value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4" />
                                    </div>
                                    <div className="sm:col-span-2 space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Physical service address</Label>
                                        <Input value={formData.serviceAddress} onChange={e => setFormData({...formData, serviceAddress: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Direct contact number</Label>
                                        <Input value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-8">
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                    Tell us about your team. This allows the system to recommend an optimized liter allocation for zero operational downtime.
                                </p>
                                <div className="grid gap-6">
                                    <Card className="border-none shadow-none bg-slate-50 rounded-[2rem] p-8 space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-2xl bg-white shadow-sm text-primary">
                                                    <Users className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">Total Workforce</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active members</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => setFormData({...formData, teamSize: Math.max(1, formData.teamSize - 1)})} className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black shadow-sm">-</button>
                                                <span className="text-2xl font-black tabular-nums w-12 text-center">{formData.teamSize}</span>
                                                <button onClick={() => setFormData({...formData, teamSize: formData.teamSize + 1})} className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black shadow-sm">+</button>
                                            </div>
                                        </div>
                                        <Separator className="bg-slate-200/50" />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-2xl bg-white shadow-sm text-primary">
                                                    <Package className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">Dispensers Required</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Strategic placement</p>
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

                        {step === 2 && (
                            <div className="space-y-8">
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                    Based on your team of {formData.teamSize}, we recommend the **Flow Plan**. Pay only for what you consume with zero waste.
                                </p>
                                
                                <Card className="border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-primary to-primary-light text-white p-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                        <Droplets className="h-24 w-24" />
                                    </div>
                                    <div className="relative z-10 space-y-6">
                                        <div className="space-y-1">
                                            <h4 className="text-xl font-black tracking-tight uppercase">Flow Plan tier</h4>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">High-fidelity consumption pricing</p>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-5xl font-black tracking-tighter">₱3.00</p>
                                            <p className="text-sm font-bold opacity-60 uppercase">per liter</p>
                                        </div>
                                        <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">No hidden fees</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Real-time tracking</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Estimated monthly consumption (Liters)</Label>
                                    <Input 
                                        type="number" 
                                        value={formData.monthlyLiters} 
                                        onChange={e => setFormData({...formData, monthlyLiters: Number(e.target.value)})} 
                                        className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black text-xl text-primary" 
                                    />
                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2 pt-1">
                                        <Info className="h-3 w-3" />
                                        Estimated cost: ₱{(formData.monthlyLiters * 3).toLocaleString()} / mo
                                    </p>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-8">
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                    River Business is fully digital. Settle your dispatches via GCash, Maya, or Bank Transfer directly through the command center.
                                </p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {['GCash', 'Bank Transfer (BPI)', 'Maya', 'Corporate Billing'].map((method) => (
                                        <div 
                                            key={method}
                                            onClick={() => setFormData({...formData, paymentMethod: method})}
                                            className={cn(
                                                "p-6 rounded-2xl border-2 transition-all cursor-pointer group flex items-center justify-between",
                                                formData.paymentMethod === method ? "border-primary bg-primary/5" : "border-slate-50 bg-white hover:border-slate-200"
                                            )}
                                        >
                                            <span className={cn("text-sm font-bold uppercase tracking-tight", formData.paymentMethod === method ? "text-primary" : "text-slate-500")}>
                                                {method}
                                            </span>
                                            {formData.paymentMethod === method && <CheckCircle2 className="h-5 w-5 text-primary" />}
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-4">
                                    <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-bold text-blue-900 leading-relaxed uppercase tracking-tight">
                                        Payment is triggered monthly based on verified consumption records. No advanced credits required.
                                    </p>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-8">
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                    Your onboarding sequence is being finalized. Here is the fulfillment roadmap for {formData.businessName}:
                                </p>

                                <div className="relative pl-6 space-y-12">
                                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100" />
                                    
                                    <div className="relative z-10 flex items-start gap-6 group">
                                        <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center font-black text-[10px] ring-4 ring-white shadow-lg">1</div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Account Sync</p>
                                            <p className="text-xs font-medium text-slate-400">Digital infrastructure and billing established instantly.</p>
                                        </div>
                                    </div>

                                    <div className="relative z-10 flex items-start gap-6 group">
                                        <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black text-[10px] ring-4 ring-white shadow-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors">2</div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Infrastructure Prep</p>
                                            <p className="text-xs font-medium text-slate-400">2 Dispensers sanitized and {Math.ceil(formData.monthlyLiters / 19)} containers allocated.</p>
                                        </div>
                                    </div>

                                    <div className="relative z-10 flex items-start gap-6 group">
                                        <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black text-[10px] ring-4 ring-white shadow-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors">3</div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">First Dispatch</p>
                                            <p className="text-xs font-medium text-slate-400">Targeting arrival within 24-48 hours of authorization.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>

            <DialogFooter className="p-8 bg-slate-50/50 border-t shrink-0 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                    {step > 0 && (
                        <Button variant="ghost" onClick={prevStep} disabled={isSubmitting} className="rounded-xl h-12 px-6 font-bold text-slate-400 hover:text-slate-900">
                           <ChevronLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    )}
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-200 pl-4">River Command</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {step < STEPS.length - 1 ? (
                        <Button onClick={nextStep} className="flex-1 sm:flex-none rounded-xl h-12 px-12 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
                            Continue <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleFinalize} disabled={isSubmitting} className="flex-1 sm:flex-none rounded-xl h-12 px-16 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/30 bg-primary hover:bg-primary/90">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            {isSubmitting ? 'Authorizing...' : 'Authorize Subscription'}
                        </Button>
                    )}
                </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
