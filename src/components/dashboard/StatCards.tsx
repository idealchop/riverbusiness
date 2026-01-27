
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { History, Edit, Calendar as CalendarIcon, Info, Users, Droplets, UserCheck, BarChart3 } from 'lucide-react';
import { AppUser, Delivery } from '@/lib/types';
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, isBefore, getYear, getMonth } from 'date-fns';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

interface StatCardsProps {
  user: AppUser | null;
  deliveries: Delivery[] | null;
  totalBranchConsumptionLiters: number;
  onConsumptionHistoryClick: () => void;
  onSaveLitersClick: () => void;
  onUpdateScheduleClick: () => void;
  onRequestRefillClick: () => void;
}

export function StatCards({
  user,
  deliveries,
  totalBranchConsumptionLiters,
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
        currentBalance: user?.totalConsumptionLiters || 0,
        consumedPercentage: 0,
        estimatedCost: 0,
    };

    if (!user || !user.plan || !deliveries) {
        return emptyState;
    }

    const cycleStart = startOfMonth(now);
    const cycleEnd = endOfMonth(now);
    const monthsToBill = 1;
    
    const deliveriesThisCycle = deliveries.filter(d => {
        const deliveryDate = new Date(d.date);
        return isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd });
    });
    const consumedLitersThisCycle = deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
    
    const currentBalance = user.totalConsumptionLiters;
    
    let monthlyEquipmentCost = 0;
    if (user.customPlanDetails?.gallonPaymentType === 'Monthly') {
      monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
    }
    if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') {
      monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);
    }

    const equipmentCostForPeriod = monthlyEquipmentCost * monthsToBill;

    if (user.plan.isConsumptionBased || user.accountType === 'Branch') {
        const consumptionCost = consumedLitersThisCycle * (user.plan.price || 0);
        return {
            ...emptyState,
            consumedLitersThisMonth: consumedLitersThisCycle,
            currentBalance: 0, 
            estimatedCost: consumptionCost, 
        };
    }
    
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
  const isBranchAccount = user?.accountType === 'Branch';
  const isParentAccount = user?.accountType === 'Parent';
  const isPrepaidPlan = user?.plan?.isPrepaid;
  
  const parentRemainingLiters = useMemo(() => {
    if (!isParentAccount || !user?.plan?.price || user.plan.price === 0) return 0;
    const credits = user?.topUpBalanceCredits ?? 0;
    const pricePerLiter = user.plan.price;
    return credits > 0 ? credits / pricePerLiter : 0;
  }, [isParentAccount, user?.topUpBalanceCredits, user?.plan?.price]);

  const startingBalance = useMemo(() => {
    if (isFlowPlan || isBranchAccount) return 0;
    return consumptionDetails.totalLitersForMonth;
  }, [isFlowPlan, isBranchAccount, consumptionDetails.totalLitersForMonth]);

  const remainingBalancePercentage = useMemo(() => {
      if (startingBalance <= 0) {
          return 0; 
      }
      const percentage = (consumptionDetails.currentBalance / startingBalance) * 100;
      return Math.max(0, Math.min(100, percentage)); 
  }, [consumptionDetails.currentBalance, startingBalance]);

  const handleManageBranches = () => {
    window.dispatchEvent(new CustomEvent('open-my-account', { detail: { tab: 'branches' }}));
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {isParentAccount ? (
        <>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Droplets className="h-4 w-4"/>Remaining Liter Credits</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl md:text-4xl font-bold mb-1">{parentRemainingLiters.toLocaleString(undefined, {maximumFractionDigits: 0})} L</p>
                    <p className="text-xs text-muted-foreground">Derived from your ₱{(user?.topUpBalanceCredits ?? 0).toLocaleString()}.</p>
                </CardContent>
            </Card>
            <Card onClick={onConsumptionHistoryClick} className="cursor-pointer hover:border-primary">
                 <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4"/>Total Branch Consumption</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl md:text-3xl font-bold mb-1">{consumptionDetails.consumedLitersThisMonth.toLocaleString()} L</p>
                    <p className="text-xs text-muted-foreground">For the current month</p>
                </CardContent>
                 <CardFooter>
                    <p className="text-xs font-medium text-primary">Click to view history</p>
                </CardFooter>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><UserCheck className="h-4 w-4"/>Linked Branches</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl md:text-3xl font-bold mb-1">{user?.customPlanDetails?.branchCount || 0}</p>
                    <Button variant="link" className="p-0 h-auto text-xs" onClick={handleManageBranches}>View & Manage</Button>
                </CardContent>
            </Card>
        </>
      ) : isFlowPlan || isBranchAccount || isPrepaidPlan ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 col-span-1 md:col-span-2 lg:col-span-3">
          <Card className="flex flex-col lg:col-span-2 col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                {isBranchAccount
                  ? `Consumed this Month (${user?.businessName})`
                  : isParentAccount
                  ? 'Remaining Liter Credits'
                  : isFlowPlan
                  ? 'Estimated Cost This Month'
                  : `Remaining Liters`}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-2xl md:text-3xl font-bold mb-2">
                {isBranchAccount
                    ? `${consumptionDetails.consumedLitersThisMonth.toLocaleString()} L`
                    : (isPrepaidPlan) 
                    ? `${(user?.totalConsumptionLiters || 0).toLocaleString()} L`
                    : isParentAccount
                    ? `${parentRemainingLiters.toLocaleString(undefined, {maximumFractionDigits: 0})} L`
                    : `₱${consumptionDetails.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  {isBranchAccount
                    ? <span>Total usage this period</span>
                    : (isPrepaidPlan)
                    ? <span>Consumed this period:</span>
                    : isParentAccount 
                    ? <span>Total Consumed by Branches:</span>
                    : <span>Water consumption cost:</span>
                  }
                  <span>
                    {isParentAccount 
                      ? `${(totalBranchConsumptionLiters ?? 0).toLocaleString()} L`
                      : `${consumptionDetails.consumedLitersThisMonth.toLocaleString()} L`
                    }
                    </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
                {isBranchAccount ? (
                     <p className="text-xs text-muted-foreground">Consumption is deducted from your parent account's balance.</p>
                ) : (isPrepaidPlan || isParentAccount) ? (
                     <p className="text-xs text-muted-foreground">This is your account's water credit balance.</p>
                ) : (
                    <p className="text-xs text-muted-foreground">Equipment rental fees will be added to your final bill.</p>
                )}
            </CardFooter>
          </Card>
          <Card className="col-span-1">
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
        </div>
      ) : (
        <>
          <Card className="flex flex-col col-span-1 md:col-span-2 lg:col-span-1">
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

          <Card className="flex flex-col col-span-1 md:col-span-2 lg:col-span-1">
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

          <Card className="col-span-1 md:col-span-2 lg:col-span-1">
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
