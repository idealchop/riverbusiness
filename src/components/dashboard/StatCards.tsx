'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { History, Edit, Calendar as CalendarIcon, Info, Users, Droplets, MapPin, BarChart3, HelpCircle, Wallet, TrendingUp, TrendingDown, ArrowRight, Repeat, ShieldCheck } from 'lucide-react';
import { AppUser, Delivery } from '@/lib/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, isBefore, getYear, getMonth } from 'date-fns';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

/**
 * A sophisticated vertical water tank visual component.
 */
const WaterTankVisual = ({ percentage, isUnlimited = false }: { percentage: number, isUnlimited?: boolean }) => {
  return (
    <div className="relative w-16 h-28 bg-slate-50 rounded-[1.5rem] border-2 border-slate-100 overflow-hidden shadow-inner shrink-0 group">
      {/* Background reflection */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none z-20" />
      
      {/* Water Fill */}
      <div 
        className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t transition-all duration-1000 ease-in-out z-10",
            isUnlimited ? "from-blue-600 to-blue-400 h-full" : "from-primary to-primary-light"
        )}
        style={{ height: isUnlimited ? '100%' : `${Math.max(2, percentage)}%` }}
      >
        {/* Surface Wave Effect */}
        {!isUnlimited && (
            <div className="absolute -top-1 left-0 right-0 h-2 bg-white/20 animate-pulse blur-[1px]" />
        )}
        
        {/* Internal Bubbles with enhanced movement */}
        <div className="absolute bottom-2 left-4 w-1 h-1 rounded-full bg-white/40 animate-bubble-rise" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-6 left-8 w-1.5 h-1.5 rounded-full bg-white/30 animate-bubble-rise" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-1 left-10 w-1 h-1 rounded-full bg-white/20 animate-bubble-rise" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-8 left-3 w-2 h-2 rounded-full bg-white/20 animate-bubble-rise" style={{ animationDelay: '0.8s' }} />
        <div className="absolute bottom-3 left-6 w-1 h-1 rounded-full bg-white/30 animate-bubble-rise" style={{ animationDelay: '2.2s' }} />
      </div>

      {/* Glass Highlight */}
      <div className="absolute top-4 left-3 w-2 h-12 bg-white/30 rounded-full blur-[2px] z-30" />
      
      {/* Scale markers */}
      <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-between py-4 z-30 opacity-20 group-hover:opacity-40 transition-opacity">
          {[1,2,3,4].map(i => <div key={i} className="w-1.5 h-0.5 bg-slate-400" />)}
      </div>
    </div>
  );
};

interface StatCardsProps {
  user: AppUser | null;
  deliveries: Delivery[] | null;
  parentCalculatedBalances: {
      displayedCreditBalance: number;
      displayedAvailableLiters: number;
      totalConsumptionLiters: number;
  };
  onConsumptionHistoryClick: () => void;
  onSaveLitersClick: () => void;
  onUpdateScheduleClick: () => void;
  onRequestRefillClick: () => void;
}

export function StatCards({
  user,
  deliveries,
  parentCalculatedBalances,
  onConsumptionHistoryClick,
  onSaveLitersClick,
  onUpdateScheduleClick,
  onRequestRefillClick,
}: StatCardsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isConfirmingToggle, setIsConfirmingToggle] = React.useState(false);
  const [toggleTargetState, setToggleTargetState] = React.useState<boolean | null>(null);
  
  const consumptionDetails = useMemo(() => {
    const now = new Date();
    
    const emptyState = {
        monthlyPlanLiters: 0,
        bonusLiters: 0,
        rolloverLiters: 0,
        totalLitersForMonth: 0,
        consumedLitersThisMonth: 0,
        consumedLitersLastMonth: 0,
        currentBalance: 0,
        consumedPercentage: 0,
        estimatedCost: 0,
        trend: 'same' as 'increase' | 'decrease' | 'same',
        diff: 0
    };

    if (!user || !user.plan || !deliveries) {
        return emptyState;
    }

    const cycleStart = startOfMonth(now);
    const cycleEnd = endOfMonth(now);
    const lastStart = startOfMonth(subMonths(now, 1));
    const lastEnd = endOfMonth(subMonths(now, 1));
    const monthsToBill = 1;
    
    const deliveriesThisCycle = deliveries.filter(d => isWithinInterval(new Date(d.date), { start: cycleStart, end: cycleEnd }));
    const consumedLitersThisCycle = deliveriesThisCycle.reduce((acc, d) => acc + (d.liters ?? containerToLiter(d.volumeContainers)), 0);

    const consumedLitersLastMonth = deliveries
        .filter(d => isWithinInterval(new Date(d.date), { start: lastStart, end: lastEnd }))
        .reduce((sum, d) => sum + (d.liters ?? containerToLiter(d.volumeContainers)), 0);

    const diff = consumedLitersLastMonth === 0 ? (consumedLitersThisCycle > 0 ? 100 : 0) : ((consumedLitersThisCycle - consumedLitersLastMonth) / consumedLitersLastMonth) * 100;
    const trend = diff > 0 ? 'increase' : (diff < 0 ? 'decrease' : 'same');
        
    let monthlyEquipmentCost = 0;
    if (user.customPlanDetails?.gallonPaymentType === 'Monthly') monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
    if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);

    const equipmentCostForPeriod = monthlyEquipmentCost * monthsToBill;

    if (user.plan.isConsumptionBased || user.accountType === 'Branch' || user.isPrepaid) {
        const consumptionCost = consumedLitersThisCycle * (user.plan.price || 0);
        return {
            ...emptyState,
            consumedLitersThisMonth: consumedLitersThisCycle,
            consumedLitersLastMonth,
            currentBalance: 0, 
            estimatedCost: consumptionCost + equipmentCostForPeriod,
            trend,
            diff: Math.abs(diff)
        };
    }
    
    const planDetails = user.customPlanDetails || {};
    const monthlyPlanLiters = planDetails.litersPerMonth || 0;
    const bonusLiters = planDetails.bonusLiters || 0;
    const rolloverLiters = user.customPlanDetails?.lastMonthRollover || 0;
    const totalLitersForMonth = monthlyPlanLiters + bonusLiters + rolloverLiters;

    const remainingBalance = totalLitersForMonth - consumedLitersThisCycle;
    const consumedPercentage = totalLitersForMonth > 0 ? (consumedLitersThisCycle / totalLitersForMonth) * 100 : 0;
    
    return {
        monthlyPlanLiters,
        bonusLiters,
        rolloverLiters,
        totalLitersForMonth,
        consumedLitersThisMonth: consumedLitersThisCycle,
        consumedLitersLastMonth,
        currentBalance: remainingBalance,
        consumedPercentage,
        estimatedCost: (user.plan.price || 0) * monthsToBill + equipmentCostForPeriod,
        trend,
        diff: Math.abs(diff)
    };
  }, [user, deliveries]);


  const handleToggleConfirmation = () => {
    if (toggleTargetState === null || !user?.id || !firestore) return;
    const userRef = doc(firestore, 'users', user.id);
    updateDoc(userRef, { 'customPlanDetails.autoRefillEnabled': toggleTargetState }).then(() => {
        toast({ title: toggleTargetState ? "Auto-Refill Active" : "Auto-Refill Paused" });
    }).finally(() => {
        setIsConfirmingToggle(false);
        setToggleTargetState(null);
    });
  };

  const onSwitchChange = (checked: boolean) => {
    setToggleTargetState(checked);
    setIsConfirmingToggle(true);
  };

  const planDetails = user?.customPlanDetails || {};
  const autoRefill = planDetails?.autoRefillEnabled ?? true;
  const nextRefillDay = planDetails?.deliveryDay || 'Not set';

  const isFlowPlan = user?.plan?.isConsumptionBased;
  const isBranchAccount = user?.accountType === 'Branch';
  const isParentAccount = user?.accountType === 'Parent';

  const remainingBalancePercentage = useMemo(() => {
      if (consumptionDetails.totalLitersForMonth <= 0) return 0;
      return Math.max(0, Math.min(100, (consumptionDetails.currentBalance / consumptionDetails.totalLitersForMonth) * 100));
  }, [consumptionDetails]);

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {isParentAccount ? (
        <>
            <Card className="border-none shadow-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white overflow-hidden group">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-blue-100 flex items-center justify-between">
                        <span className="flex items-center gap-2"><Wallet className="h-4 w-4"/>Central Wallet</span>
                        <Badge variant="outline" className="text-white border-blue-400 bg-white/10">Authorized</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-extrabold mb-1 tracking-tight">
                        ₱{Math.abs(parentCalculatedBalances.displayedCreditBalance).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-blue-100 font-medium">
                            ≈ {parentCalculatedBalances.displayedAvailableLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })} Liters available
                        </p>
                        <Button variant="link" className="text-white p-0 h-auto text-xs font-bold gap-1 group-hover:translate-x-1 transition-transform">
                            Manage Balance <ArrowRight className="h-3 w-3" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card onClick={onConsumptionHistoryClick} className="border-none shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.99] group bg-white">
                 <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary"/>Network Consumption
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-extrabold text-slate-900">{parentCalculatedBalances.totalConsumptionLiters.toLocaleString(undefined, {maximumFractionDigits:1})}</p>
                        <span className="text-sm font-bold text-muted-foreground">LITERS</span>
                    </div>
                    <div className={cn(
                        "flex items-center text-[10px] font-bold uppercase mt-2",
                        consumptionDetails.trend === 'increase' ? 'text-red-500' : 'text-green-500'
                    )}>
                        {consumptionDetails.trend === 'increase' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {consumptionDetails.diff.toFixed(0)}% vs last month
                    </div>
                </CardContent>
                 <CardFooter className="pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary group-hover:underline">Click for branch history</p>
                </CardFooter>
            </Card>

            <Card className="border-none shadow-sm bg-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary"/>Active Locations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-extrabold text-slate-900 mb-1">{user?.customPlanDetails?.branchCount || 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Linked multi-branch accounts</p>
                </CardContent>
                <CardFooter className="pt-2">
                    <Button variant="link" className="p-0 h-auto text-[10px] font-bold uppercase tracking-widest" onClick={() => window.dispatchEvent(new CustomEvent('open-branches-dialog'))}>View Detailed Map</Button>
                </CardFooter>
            </Card>
        </>
      ) : (
        <>
          <Card className="border-none shadow-sm col-span-1 md:col-span-2 lg:col-span-1 bg-white overflow-hidden relative">
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-2"><Droplets className="h-4 w-4 text-primary" />Available Credits</span>
                <button onClick={onSaveLitersClick} className="flex items-center gap-1.5 p-1 rounded-lg bg-blue-50 text-primary border border-blue-100 hover:bg-blue-100 transition-all z-50">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="text-[8px] font-black uppercase tracking-widest pr-1">Live Quality</span>
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <WaterTankVisual 
                    percentage={remainingBalancePercentage} 
                    isUnlimited={isFlowPlan || isBranchAccount} 
                />
                
                <div className="flex-1 space-y-4">
                    {isFlowPlan || isBranchAccount ? (
                        <div>
                            <p className="text-3xl font-black text-slate-900 tracking-tight">Drinking Water</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                                Unlimited Supply 
                                <span className="block text-primary">Billed by usage (₱{user?.plan?.price}/L)</span>
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-4xl font-black text-slate-900 tracking-tighter">{consumptionDetails.currentBalance.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                                    <span className="text-sm font-black text-slate-400">L</span>
                                </div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">Remaining Tank Volume</p>
                            </div>
                            <div className="grid grid-cols-1 gap-2 text-[9px] font-bold uppercase tracking-tight">
                                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-slate-400">Monthly Plan</span>
                                    <span className="text-slate-700">{(consumptionDetails.monthlyPlanLiters + consumptionDetails.bonusLiters).toLocaleString()}L</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 border border-blue-100">
                                    <span className="text-primary">Saved Rollover</span>
                                    <span className="text-primary font-black">{consumptionDetails.rolloverLiters.toLocaleString()}L</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm col-span-1 md:col-span-2 lg:col-span-1 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />Current Consumption
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-baseline gap-1">
                    <p className="text-4xl font-extrabold text-slate-900">{consumptionDetails.consumedLitersThisMonth.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    <span className="text-sm font-bold text-muted-foreground">L</span>
                </div>
                <div className={cn(
                    "flex items-center text-[10px] font-bold uppercase mt-2",
                    consumptionDetails.trend === 'increase' ? 'text-red-500' : 'text-green-500'
                )}>
                    {consumptionDetails.trend === 'increase' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {consumptionDetails.diff.toFixed(0)}% vs last month
                </div>
              </div>
              <div className="pt-2 border-t flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estimated overhead</span>
                  <span className="text-sm font-extrabold text-slate-900">₱{consumptionDetails.estimatedCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm col-span-1 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-2"><Repeat className="h-4 w-4 text-primary" />Auto-Refill Status</span>
                <Switch checked={autoRefill} onCheckedChange={onSwitchChange} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={cn(
                    "p-3 rounded-xl border flex flex-col gap-1 transition-all",
                    autoRefill ? "bg-blue-50 border-blue-100" : "bg-muted/40 border-slate-200 opacity-60"
                )}>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{autoRefill ? "Next Dispatch" : "Service Paused"}</p>
                   <p className="text-sm font-extrabold text-slate-900">{autoRefill ? `Every ${nextRefillDay}` : "Manual Only"}</p>
                </div>
                {autoRefill ? (
                    <Button variant="outline" size="sm" className="w-full h-8 text-[10px] font-bold uppercase tracking-widest" onClick={onUpdateScheduleClick}>
                        <Edit className="mr-2 h-3 w-3" /> Customize Delivery
                    </Button>
                ) : (
                    <Button variant="default" size="sm" className="w-full h-8 text-[10px] font-bold uppercase tracking-widest bg-slate-900" onClick={onRequestRefillClick}>
                        <CalendarIcon className="mr-2 h-4 w-4" /> Schedule One-Time
                    </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>

    <AlertDialog open={isConfirmingToggle} onOpenChange={setIsConfirmingToggle}>
        <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold">Adjust Auto-Refill Preferences?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-600 leading-relaxed pt-2">
                    {toggleTargetState ? (
                        <>
                            Re-activating auto-refill will resume your recurring schedule:
                            <strong className="block mt-3 text-slate-900 text-base">→ Next {nextRefillDay} at {planDetails?.deliveryTime || 'morning'}</strong>
                            Our fulfillment team will be notified immediately.
                        </>
                    ) : (
                        <>
                            Pausing auto-refill will stop all automatic dispatches. You will need to manually request water when your inventory is low.
                        </>
                    )}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-4">
                <AlertDialogCancel className="rounded-full font-bold" onClick={() => setToggleTargetState(null)}>Keep Current</AlertDialogCancel>
                <AlertDialogAction className="rounded-full font-bold" onClick={handleToggleConfirmation}>
                    {toggleTargetState ? 'Enable Auto-Refill' : 'Confirm Pause'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
