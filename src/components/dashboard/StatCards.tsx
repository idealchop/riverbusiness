
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { History, Edit, Calendar as CalendarIcon, Info, Users, Droplets, MapPin, BarChart3, HelpCircle, Wallet, TrendingUp, TrendingDown, ArrowRight, Repeat } from 'lucide-react';
import { AppUser, Delivery } from '@/lib/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, isBefore, getYear, getMonth } from 'date-fns';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

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
          <Card className="border-none shadow-sm col-span-1 md:col-span-2 lg:col-span-1 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-2"><Droplets className="h-4 w-4 text-primary" />Available Credits</span>
                <button onClick={onSaveLitersClick} className="text-primary hover:underline flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isFlowPlan || isBranchAccount ? (
                <div>
                   <p className="text-3xl font-extrabold text-slate-900">Unlimited</p>
                   <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight mt-1">Billed by usage (₱{user?.plan?.price}/L)</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-baseline gap-1">
                        <p className="text-4xl font-extrabold text-slate-900">{consumptionDetails.currentBalance.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                        <span className="text-sm font-bold text-muted-foreground">L</span>
                    </div>
                    <Progress value={remainingBalancePercentage} className="h-1.5 mt-3 bg-slate-100" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-tighter">
                      <div className="p-2 rounded bg-muted/30">
                        <span className="text-muted-foreground block mb-0.5">Plan Allocation</span>
                        <span className="text-slate-900">{(consumptionDetails.monthlyPlanLiters + consumptionDetails.bonusLiters).toLocaleString()} L</span>
                      </div>
                      <div className="p-2 rounded bg-blue-50">
                        <span className="text-primary block mb-0.5">Rollover</span>
                        <span className="text-primary">{consumptionDetails.rolloverLiters.toLocaleString()} L</span>
                      </div>
                  </div>
                </div>
              )}
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
                        <CalendarIcon className="mr-2 h-3 w-3" /> Schedule One-Time
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
