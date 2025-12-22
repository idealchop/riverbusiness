
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowRight, History, Edit, Calendar as CalendarIcon, BellRing, Info } from 'lucide-react';
import { AppUser, Delivery } from '@/lib/types';
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, isBefore } from 'date-fns';
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
  const [isConfirmingToggle, setIsConfirmingToggle] = useState(false);
  const [toggleTargetState, setToggleTargetState] = useState<boolean | null>(null);
  
  const consumptionDetails = useMemo(() => {
    const now = new Date();
    const emptyState = {
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

    const deliveriesThisCycle = deliveries.filter(d => {
        const deliveryDate = new Date(d.date);
        return isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd });
    });
    const consumedLitersThisMonth = deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
    
    // This is the user's real-time balance from the database.
    const currentBalance = user.totalConsumptionLiters;
    
    // The balance at the start of the month was the current balance PLUS what's been consumed this month.
    const startingBalanceForMonth = currentBalance + consumedLitersThisMonth;

    const consumedPercentage = startingBalanceForMonth > 0 
      ? (consumedLitersThisMonth / startingBalanceForMonth) * 100 
      : 0;

    if (user.plan.isConsumptionBased) {
        return {
            ...emptyState,
            consumedLitersThisMonth,
            currentBalance: 0, // Not applicable for consumption plan, show 0
            estimatedCost: consumedLitersThisMonth * (user.plan.price || 0),
        };
    }
    
    // For fixed plans:
    return {
        totalLitersForMonth: startingBalanceForMonth,
        consumedLitersThisMonth,
        currentBalance, // The real remaining balance.
        consumedPercentage,
        estimatedCost: user.plan.price || 0,
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

  return (
    <>
    <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
      {isFlowPlan ? (
        <div className="col-span-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="flex flex-col lg:col-span-2">
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
          <Card className="lg:col-span-1">
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
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                Remaining Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-2xl md:text-3xl font-bold mb-2">{consumptionDetails.currentBalance.toLocaleString()} L</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Started with {consumptionDetails.totalLitersForMonth.toLocaleString()} L this month.
                </p>
              </div>
            </CardContent>
             <CardFooter className="pt-0">
               <Progress value={100 - consumptionDetails.consumedPercentage} className="h-2" />
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
          <Card className="col-span-2">
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
