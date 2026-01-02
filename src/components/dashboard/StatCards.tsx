
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowRight, History, Edit, Calendar as CalendarIcon, BellRing, Info } from 'lucide-react';
import { AppUser, Delivery } from '@/lib/types';
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, isBefore, getYear, getMonth } from 'date-fns';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { DocumentReference, doc, updateDoc } from 'firebase/firestore';

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
  const [isConfirmingToggle, setIsConfirmingToggle] = React.useState(false);
  const [toggleTargetState, setToggleTargetState] = React.useState<boolean | null>(null);
  
  const consumptionDetails = useMemo(() => {
    const now = new Date();
    const currentYear = getYear(now);
    const currentMonth = getMonth(now);
    
    const emptyState = {
        monthlyPlanLiters: 0,
        bonusLiters: 0,
        rolloverLiters: 0,
        totalLitersForMonth: 0,
        consumedLitersThisMonth: 0,
        currentBalance: user?.totalConsumptionLiters || 0,
        consumedPercentage: 0,
        estimatedCost: 0,
    };

    if (!user || !user.plan || !deliveries) {
        return emptyState;
    }

    let cycleStart: Date;
    let cycleEnd: Date;
    let monthsToBill = 1;

    // Special Case for combined Dec-Jan billing period (when viewing in January)
    if (currentYear === 2026 && currentMonth === 0) { // January 2026
        cycleStart = new Date(2025, 11, 1); // Dec 1, 2025
        cycleEnd = endOfMonth(now); // End of Jan 2026
        monthsToBill = 2;
    } else {
        cycleStart = startOfMonth(now);
        cycleEnd = endOfMonth(now);
    }
    
    const deliveriesThisCycle = deliveries.filter(d => {
        const deliveryDate = new Date(d.date);
        return isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd });
    });
    const consumedLitersThisCycle = deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
    
    const currentBalance = user.totalConsumptionLiters;
    const monthlyEquipmentCost = (user.customPlanDetails?.gallonPrice || 0) + (user.customPlanDetails?.dispenserPrice || 0);
    const equipmentCostForPeriod = monthlyEquipmentCost * monthsToBill;

    if (user.plan.isConsumptionBased) {
        const consumptionCost = consumedLitersThisCycle * (user.plan.price || 0);
        return {
            ...emptyState,
            consumedLitersThisMonth: consumedLitersThisCycle,
            currentBalance: 0, // Not applicable for Flow plan
            estimatedCost: consumptionCost + equipmentCostForPeriod,
        };
    }
    
    // Logic for Fixed Plans
    const planDetails = user.customPlanDetails || user.plan.customPlanDetails;
    if (!planDetails || !user.createdAt) {
        const startingBalanceForMonth = currentBalance + consumedLitersThisCycle;
        const consumedPercentage = startingBalanceForMonth > 0 ? (consumedLitersThisCycle / startingBalanceForMonth) * 100 : 0;
        return { ...emptyState, currentBalance, consumedLitersThisMonth: consumedLitersThisCycle, totalLitersForMonth: startingBalanceForMonth, consumedPercentage, estimatedCost: (user.plan.price || 0) + equipmentCostForPeriod };
    }

    const createdAtDate = typeof (user.createdAt as any)?.toDate === 'function' 
        ? (user.createdAt as any).toDate() 
        : new Date(user.createdAt as string);

    const lastMonth = subMonths(now, 1);
    const lastCycleStart = startOfMonth(lastMonth);
    
    const monthlyPlanLiters = planDetails.litersPerMonth || 0;
    const bonusLiters = planDetails.bonusLiters || 0;
    const totalMonthlyAllocation = monthlyPlanLiters + bonusLiters;
    
    let rolloverLiters = 0;
    if (isBefore(createdAtDate, lastCycleStart)) {
        const lastCycleEnd = endOfMonth(lastMonth);
        const deliveriesLastCycle = deliveries.filter(d => isWithinInterval(new Date(d.date), { start: lastCycleStart, end: lastCycleEnd }));
        const consumedLitersLastMonth = deliveriesLastCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
        rolloverLiters = Math.max(0, totalMonthlyAllocation - consumedLitersLastMonth);
    }
    
    // For combined period, add two months of allocation
    const allocationForPeriod = totalMonthlyAllocation * monthsToBill;
    const totalLitersForMonth = allocationForPeriod + rolloverLiters;
    const consumedPercentage = totalLitersForMonth > 0 ? (consumedLitersThisCycle / totalLitersForMonth) * 100 : 0;
    
    return {
        monthlyPlanLiters,
        bonusLiters,
        rolloverLiters,
        totalLitersForMonth,
        consumedLitersThisMonth: consumedLitersThisCycle,
        currentBalance,
        consumedPercentage,
        estimatedCost: (user.plan.price || 0) * monthsToBill + equipmentCostForPeriod,
    };
  }, [user, deliveries]);


  const handleToggleConfirmation = () => {
    if (toggleTargetState === null || !user?.id || !firestore) return;

    const userDocRef = doc(firestore, 'users', user.id);
    
    updateDoc(userDocRef, {
        'customPlanDetails.autoRefillEnabled': toggleTargetState,
    }).then(() => {
        toast({
            title: toggleTargetState ? "Auto-Refill Enabled" : "Auto-Refill Disabled",
            description: toggleTargetState ? "Your next delivery will be scheduled automatically." : "Please remember to schedule your deliveries manually.",
        });
    }).catch((error) => {
        console.error("Failed to update auto-refill status:", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update your auto-refill preference.",
        });
    }).finally(() => {
        setIsConfirmingToggle(false);
        setToggleTargetState(null);
    });
  };

  const onSwitchChange = (checked: boolean) => {
    setToggleTargetState(checked);
    setIsConfirmingToggle(true);
  }
  
  const planDetails = user?.customPlanDetails || user?.plan?.customPlanDetails;
  const autoRefill = planDetails?.autoRefillEnabled ?? true;
  const nextRefillDay = planDetails?.deliveryDay || 'Not set';
  const weeklyContainers = planDetails?.gallonQuantity || 0;
  const estimatedWeeklyLiters = containerToLiter(weeklyContainers);

  const isFlowPlan = user?.plan?.isConsumptionBased;
  
  const startingBalance = useMemo(() => {
    if (isFlowPlan) return 0;
    return consumptionDetails.totalLitersForMonth;
  }, [isFlowPlan, consumptionDetails.totalLitersForMonth]);

  const remainingBalancePercentage = useMemo(() => {
      if (startingBalance <= 0) {
          return 0; // Avoid division by zero
      }
      const percentage = (consumptionDetails.currentBalance / startingBalance) * 100;
      return Math.max(0, Math.min(100, percentage)); // Clamp between 0 and 100
  }, [consumptionDetails.currentBalance, startingBalance]);


  return (
    <>
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
      {isFlowPlan ? (
        <>
          <Card className="flex flex-col lg:col-span-2 col-span-2">
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
                  <span>Consumed this period:</span> <span>{consumptionDetails.consumedLitersThisMonth.toLocaleString()} L</span>
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
          <Card className="col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Auto Refill</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-refill" className="font-bold text-base">Auto Refill</Label>
                <Switch id="auto-refill" checked={autoRefill} onCheckedChange={onSwitchChange} />
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
                      Customize
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 items-center text-center">
                    <p className="text-xs text-muted-foreground sm:text-sm">
                        Need water sooner? Schedule a one-time delivery with an exact date and quantity.
                    </p>
                    <Button variant="default" size="sm" className="w-full" onClick={onRequestRefillClick}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      <span className="sm:hidden">Schedule</span>
                      <span className="hidden sm:inline">Schedule Refill</span>
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
                Remaining Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-2xl md:text-3xl font-bold mb-2">{consumptionDetails.currentBalance.toLocaleString()} L</p>
               <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Plan Liters:</span> <span>{consumptionDetails.monthlyPlanLiters.toLocaleString()} L</span></div>
                  <div className="flex justify-between"><span>Bonus Liters:</span> <span>{consumptionDetails.bonusLiters.toLocaleString()} L</span></div>
                  <div className="flex justify-between"><span>Rollover:</span> <span>{consumptionDetails.rolloverLiters.toLocaleString()} L</span></div>
              </div>
            </CardContent>
             <CardFooter className="pt-0">
               <Progress value={remainingBalancePercentage} className="h-2" />
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Consumed this Month</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              <p className="text-2xl md:text-3xl font-bold">{consumptionDetails.consumedLitersThisMonth.toLocaleString()} L</p>
              <Progress value={consumptionDetails.consumedPercentage} className="h-2" />
            </CardContent>
            <CardFooter>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onConsumptionHistoryClick}>View History</Button>
            </CardFooter>
          </Card>

          <Card className="col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Auto Refill</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-refill-main" className="font-bold text-base">Auto Refill</Label>
                <Switch id="auto-refill-main" checked={autoRefill} onCheckedChange={onSwitchChange} />
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
                      Customize
                    </Button>
                  </div>
                ) : (
                  <Button variant="default" size="sm" className="w-full" onClick={onRequestRefillClick}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="sm:hidden">Schedule</span>
                    <span className="hidden sm:inline">Schedule Refill</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
    <AlertDialog open={isConfirmingToggle} onOpenChange={setIsConfirmingToggle}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to {toggleTargetState ? 'enable' : 'disable'} Auto-Refill?</AlertDialogTitle>
                <AlertDialogDescription>
                    {toggleTargetState ? (
                        <>
                            By enabling this, we will automatically schedule deliveries for you based on your plan:
                            <strong className="block mt-2">{nextRefillDay}, {planDetails?.deliveryTime}</strong>
                            You can customize this schedule at any time.
                        </>
                    ) : (
                        <>
                            By disabling this, all automatic deliveries will be paused. You will need to manually request refills to receive water.
                        </>
                    )}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setToggleTargetState(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleToggleConfirmation}>
                    {toggleTargetState ? 'Yes, Enable Auto-Refill' : 'Yes, Disable Auto-Refill'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    