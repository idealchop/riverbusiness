
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, History, Edit, Calendar as CalendarIcon } from 'lucide-react';
import { AppUser, Delivery } from '@/lib/types';
import { startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { updateDocumentNonBlocking, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { DocumentReference, doc } from 'firebase/firestore';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

interface StatCardsProps {
  user: AppUser | null;
  deliveries: Delivery[] | null;
  onConsumptionHistoryClick: () => void;
  onSaveLitersClick: () => void;
  onUpdateScheduleClick: () => void;
  onRequestRefillClick: () => void;
}

export function StatCards({
  user,
  deliveries,
  onConsumptionHistoryClick,
  onSaveLitersClick,
  onUpdateScheduleClick,
  onRequestRefillClick,
}: StatCardsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const consumptionDetails = React.useMemo(() => {
    const now = new Date();
    const emptyState = {
      monthlyPlanLiters: 0,
      bonusLiters: 0,
      rolloverLiters: 0,
      totalLitersForMonth: 0,
      consumedLitersThisMonth: 0,
      currentBalance: 0,
      consumedPercentage: 0,
      remainingPercentage: 100,
      estimatedCost: 0,
    };

    if (!user || !user.plan || !deliveries) {
      return emptyState;
    }

    const cycleStart = startOfMonth(now);
    const cycleEnd = endOfMonth(now);

    const deliveriesThisCycle = deliveries.filter(d => {
        const deliveryDate = new Date(d.date);
        return isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd });
    });
    const consumedLitersThisMonth = deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
    
    if (user.plan.isConsumptionBased) {
        return {
            ...emptyState,
            consumedLitersThisMonth,
            estimatedCost: consumedLitersThisMonth * (user.plan.price || 3),
        };
    }

    if (!user.createdAt) return emptyState;

    const createdAtDate = typeof (user.createdAt as any)?.toDate === 'function' 
        ? (user.createdAt as any).toDate() 
        : new Date(user.createdAt as string);

    const lastMonth = subMonths(now, 1);
    const lastCycleStart = startOfMonth(lastMonth);
    const lastCycleEnd = endOfMonth(lastMonth);

    const monthlyPlanLiters = user.customPlanDetails?.litersPerMonth || 0;
    const bonusLiters = user.customPlanDetails?.bonusLiters || 0;
    const totalMonthlyAllocation = monthlyPlanLiters + bonusLiters;

    let rolloverLiters = 0;
    
    if (createdAtDate < lastCycleStart) {
        const deliveriesLastCycle = deliveries.filter(d => {
            const deliveryDate = new Date(d.date);
            return isWithinInterval(deliveryDate, { start: lastCycleStart, end: lastCycleEnd });
        });
        const consumedLitersLastMonth = deliveriesLastCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
        
        rolloverLiters = Math.max(0, totalMonthlyAllocation - consumedLitersLastMonth);
    }

    const totalLitersForMonth = totalMonthlyAllocation + rolloverLiters;
    const currentBalance = totalLitersForMonth - consumedLitersThisMonth;
    const consumedPercentage = totalLitersForMonth > 0 ? (consumedLitersThisMonth / totalLitersForMonth) * 100 : 0;
    const remainingPercentage = 100 - consumedPercentage;

    return {
        monthlyPlanLiters,
        bonusLiters,
        rolloverLiters,
        totalLitersForMonth,
        consumedLitersThisMonth,
        currentBalance,
        consumedPercentage,
        remainingPercentage,
        estimatedCost: user.plan.price,
    };
  }, [user, deliveries]);

  const handleAutoRefillToggle = (checked: boolean) => {
    if (!user?.id || !firestore) return;

    const userDocRef = doc(firestore, 'users', user.id);
    updateDocumentNonBlocking(userDocRef, {
        'customPlanDetails.autoRefillEnabled': checked,
    });

    toast({
        title: checked ? "Auto-Refill Enabled" : "Auto-Refill Disabled",
        description: checked ? "Your next delivery will be scheduled automatically." : "Please remember to schedule your deliveries manually.",
    });
  };

  const autoRefill = user?.customPlanDetails?.autoRefillEnabled ?? true;
  const nextRefillDay = user?.customPlanDetails?.deliveryDay || 'Not set';
  const weeklyContainers = user?.customPlanDetails?.gallonQuantity || 0;
  const estimatedWeeklyLiters = containerToLiter(weeklyContainers);

  const isFlowPlan = user?.plan?.isConsumptionBased;

  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
      {isFlowPlan ? (
        <>
          <Card className="flex flex-col col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                Current Plan: {user?.plan?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-2xl md:text-3xl font-bold mb-2">
                ₱{consumptionDetails.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Consumed this month:</span> <span>{consumptionDetails.consumedLitersThisMonth.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate:</span> <span>₱{user?.plan?.price || 3}/Liter</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <p className="text-xs text-muted-foreground">Billed at the end of the month based on consumption.</p>
            </CardFooter>
          </Card>
          <Card className="col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Auto Refill</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-refill" className="font-bold text-base">Auto Refill</Label>
                <Switch id="auto-refill" checked={autoRefill} onCheckedChange={handleAutoRefillToggle} />
              </div>
              <p className="text-xs text-muted-foreground">
                {autoRefill ? "System will auto-schedule based on your recurring schedule." : "Your deliveries are paused. Schedule a delivery manually."}
              </p>
              <div className="border-t pt-3 space-y-2">
                {autoRefill ? (
                  <div className="grid sm:grid-cols-2 gap-2 items-center">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarIcon className="h-3 w-3" />Next Refill</p>
                      <p className="font-semibold text-sm">{nextRefillDay !== 'Not set' ? `Next ${nextRefillDay}` : 'Not set'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><History className="h-3 w-3" />Est. Delivery</p>
                      <p className="font-semibold text-sm">{estimatedWeeklyLiters.toLocaleString()} Liters</p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2 sm:mt-0" onClick={onUpdateScheduleClick}>
                      <Edit className="mr-2 h-4 w-4" />
                      Schedule
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 items-center text-center">
                    <Label className="text-xs text-muted-foreground">Need water sooner?</Label>
                    <Button variant="default" size="sm" className="w-auto" onClick={onRequestRefillClick}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Request Refill
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                Total for Month
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-2xl md:text-3xl font-bold mb-2">{consumptionDetails.totalLitersForMonth.toLocaleString()} L</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Plan:</span> <span>{consumptionDetails.monthlyPlanLiters.toLocaleString()} L</span></div>
                <div className="flex justify-between"><span>Bonus:</span> <span>{consumptionDetails.bonusLiters.toLocaleString()} L</span></div>
                <div className="flex justify-between"><span>Rollover:</span> <span>{consumptionDetails.rolloverLiters.toLocaleString()} L</span></div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Progress value={100} className="h-2" />
            </CardFooter>
          </Card>
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Consumed</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              <p className="text-2xl md:text-3xl font-bold">{consumptionDetails.consumedLitersThisMonth.toLocaleString()} L</p>
              <Progress value={consumptionDetails.consumedPercentage} className="h-2" />
            </CardContent>
            <CardFooter>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onConsumptionHistoryClick}>View History</Button>
            </CardFooter>
          </Card>
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              <p className="text-2xl md:text-3xl font-bold">{consumptionDetails.currentBalance.toLocaleString()} L</p>
              <Progress value={consumptionDetails.remainingPercentage} className="h-2" />
            </CardContent>
            <CardFooter>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onSaveLitersClick}>Save Liters</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Auto Refill</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-refill" className="font-bold text-base">Auto Refill</Label>
                <Switch id="auto-refill" checked={autoRefill} onCheckedChange={handleAutoRefillToggle} />
              </div>
              <p className="text-xs text-muted-foreground">
                {autoRefill ? "Deliveries will be auto-scheduled based on your plan." : "Deliveries are paused. Schedule manually."}
              </p>
              <div className="border-t pt-3 space-y-2">
                {autoRefill ? (
                   <div className="grid sm:grid-cols-2 gap-2 items-center">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarIcon className="h-3 w-3" />Next Refill</p>
                      <p className="font-semibold text-sm">Next {nextRefillDay}</p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-xs mt-2 sm:mt-0" onClick={onUpdateScheduleClick}>
                      <Edit className="mr-2 h-4 w-4" />
                      Schedule
                    </Button>
                  </div>
                ) : (
                  <Button variant="default" size="sm" className="w-full" onClick={onRequestRefillClick}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Request Refill
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
