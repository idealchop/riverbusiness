'use client';

import React, { useMemo } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AppUser, Delivery } from '@/lib/types';
import { consumptionCharge, deliveriesInRange, litersInRange, manilaMonthRange, manilaParts, previousManilaMonth } from '@/lib/billing-period';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { formatPeso } from '@/lib/format-money';
import { autoRefillLabel } from '@/lib/refill-display';

/**
 * Softened water-tank mark. Fill still follows remaining credit,
 * and unlimited or pending plans stay full.
 */
function WaterTankVisual({ percentage, isUnlimited = false, isPending = false }: { percentage: number; isUnlimited?: boolean; isPending?: boolean }) {
  const full = isUnlimited || isPending;
  const level = full ? 100 : Math.max(2, Math.min(100, percentage));

  return (
    <div className="relative h-[88px] w-[60px] shrink-0 overflow-hidden rounded-[20px] bg-[#E6EDF5] shadow-[inset_0_0_0_1px_rgba(26,44,73,0.06)]" aria-hidden>
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#6A86A8] to-[#C9D7E8] transition-all duration-700 ease-out"
        style={{ height: `${level}%` }}
      >
        <span className="absolute -top-px left-0 right-0 h-[3px] bg-white/45" />
        <span className="absolute bottom-3 left-3.5 h-1 w-1 rounded-full bg-white/60" />
        <span className="absolute bottom-6 left-7 h-1.5 w-1.5 rounded-full bg-white/40" />
        <span className="absolute bottom-2 left-6 h-1 w-1 rounded-full bg-white/30" />
      </div>
      <span className="pointer-events-none absolute left-2 top-3 h-10 w-[5px] rounded-full bg-white/55" />
    </div>
  );
}

const card = 'rounded-[24px] bg-white px-[18px] py-5 shadow-[0_1px_2px_rgba(16,16,24,0.04),0_10px_28px_-10px_rgba(16,16,24,0.12)]';
const label = 'text-[13px] font-semibold text-[#8A8A94]';
const value = 'text-[22px] font-extrabold leading-[1.15] tracking-[-0.03em] text-[#1A2C49] tabular-nums';
const quiet = 'text-[13.5px] font-bold text-[#1A2C49]';

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

    const parts = manilaParts(now);
    const currentRange = manilaMonthRange(parts.year, parts.monthIndex);
    const previous = previousManilaMonth(now);
    const monthsToBill = 1;

    const deliveriesThisCycle = deliveriesInRange(deliveries, currentRange.start, currentRange.end);
    const consumedLitersThisCycle = litersInRange(deliveries, currentRange.start, currentRange.end);
    const consumedLitersLastMonth = litersInRange(deliveries, previous.start, previous.end);

    const diff = consumedLitersLastMonth === 0 ? (consumedLitersThisCycle > 0 ? 100 : 0) : ((consumedLitersThisCycle - consumedLitersLastMonth) / (consumedLitersLastMonth || 1)) * 100;
    const trend = diff > 0 ? 'increase' : (diff < 0 ? 'decrease' : 'same');
        
    let monthlyEquipmentCost = 0;
    if (user.customPlanDetails?.gallonPrice && user.customPlanDetails?.gallonPaymentType === 'Monthly') monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
    if (user.customPlanDetails?.dispenserPrice && user.customPlanDetails?.dispenserPaymentType === 'Monthly') monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);

    const equipmentCostForPeriod = monthlyEquipmentCost * monthsToBill;

    if (user.plan.isConsumptionBased || user.accountType === 'Branch' || user.isPrepaid) {
        const consumptionCost = consumptionCharge(deliveriesThisCycle, user.plan.price || 0);
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


  const isActivated = user?.plan && user?.subscriptionStatus === 'activated';
  const isPending = user?.plan && user?.subscriptionStatus !== 'activated';

  const handleToggleConfirmation = () => {
    if (toggleTargetState === null || !user?.id || !firestore) return;
    const userRef = doc(firestore, 'users', user.id);
    updateDoc(userRef, { 'customPlanDetails.autoRefillEnabled': toggleTargetState }).then(() => {
        toast({ 
            title: toggleTargetState ? "Auto-Refill Active" : "Auto-Refill Paused",
            description: toggleTargetState 
                ? "Your scheduled water replenishment cycles have been resumed." 
                : "Automatic dispatches are stopped. You must manually request refills."
        });
    }).finally(() => {
        setIsConfirmingToggle(false);
        setToggleTargetState(null);
    });
  };

  const onSwitchChange = (checked: boolean) => {
    if (!isActivated) {
        toast({
            variant: "destructive",
            title: "Active Subscription Required",
            description: "Please complete your workspace setup to authorize automated replenishment cycles.",
        });
        return;
    }
    setToggleTargetState(checked);
    setIsConfirmingToggle(true);
  };

  const planDetails = user?.customPlanDetails || {};
  const autoRefill = isActivated ? (planDetails?.autoRefillEnabled ?? true) : false;
  const nextRefillDay = planDetails?.deliveryDay || 'Not set';

  const isFlowPlan = user?.plan?.isConsumptionBased;
  const isBranchAccount = user?.accountType === 'Branch';
  const isParentAccount = user?.accountType === 'Parent';

  const remainingBalancePercentage = useMemo(() => {
      if (consumptionDetails.totalLitersForMonth <= 0) return 0;
      return Math.max(0, Math.min(100, (consumptionDetails.currentBalance / consumptionDetails.totalLitersForMonth) * 100));
  }, [consumptionDetails]);

  const unitPrice = user?.plan?.price ? user.plan.price * 19.5 : 65;
  const usedLabel = `${consumptionDetails.consumedLitersThisMonth.toLocaleString('en-PH', { maximumFractionDigits: 0 })} L`;
  const trendCopy = consumptionDetails.trend === 'same'
    ? 'Same as last month'
    : consumptionDetails.trend === 'increase'
      ? `${Math.round(consumptionDetails.diff)}% more than last month`
      : `${Math.round(consumptionDetails.diff)}% less than last month`;
  const scheduleLabel = autoRefillLabel({
    ...user,
    customPlanDetails: { ...planDetails, autoRefillEnabled: autoRefill },
  } as AppUser);

  const openSetup = () => {
    if (isActivated) onRequestRefillClick();
    else window.dispatchEvent(new CustomEvent('open-subscription-onboarding'));
  };

  return (
    <>
    <div className="flex flex-col gap-3">
      {isParentAccount ? (
        <>
            <section className={card}>
                <p className={label}>Wallet balance</p>
                <p className={cn(value, 'mt-1.5')}>{formatPeso(Math.abs(parentCalculatedBalances.displayedCreditBalance))}</p>
                <p className="mt-1 text-[13px] font-semibold text-[#8A8A94]">
                    {parentCalculatedBalances.displayedAvailableLiters.toLocaleString('en-PH', { maximumFractionDigits: 0 })} L available
                </p>
            </section>

            <button type="button" onClick={onConsumptionHistoryClick} className={cn(card, 'text-left')}>
                <p className={label}>Network consumption</p>
                <p className={cn(value, 'mt-1.5')}>{parentCalculatedBalances.totalConsumptionLiters.toLocaleString('en-PH', { maximumFractionDigits: 1 })} L</p>
                <p className="mt-1 text-[13px] font-semibold text-[#8A8A94]">{trendCopy}</p>
            </button>

            <section className={card}>
                <p className={label}>Active locations</p>
                <p className={cn(value, 'mt-1.5')}>{user?.customPlanDetails?.branchCount || 0}</p>
                <button type="button" className={cn(quiet, 'mt-3')} onClick={() => window.dispatchEvent(new CustomEvent('open-branches-dialog'))}>
                    View map
                </button>
            </section>
        </>
      ) : (
        <>
          <section className={cn(card, 'flex items-center gap-4')}>
            <WaterTankVisual
              percentage={remainingBalancePercentage}
              isUnlimited={Boolean((isFlowPlan || isBranchAccount) && isActivated)}
              isPending={Boolean(isPending)}
            />
            <div className="min-w-0 flex-1">
              <p className={label}>Water credits</p>
              <p className="mt-1 text-[20px] font-extrabold leading-[1.2] tracking-[-0.025em] text-[#1A2C49]">Drinking water</p>
              {!isActivated && !isPending ? (
                <p className="mt-1 text-[14px] font-semibold text-[#8A8A94]">Subscribe to access water refills.</p>
              ) : isPending ? (
                <p className="mt-1 text-[14px] font-semibold text-[#8A8A94]">Activation in progress</p>
              ) : (isFlowPlan || isBranchAccount) ? (
                <p className="mt-1 text-[14px] font-semibold text-[#8A8A94]">
                  Unlimited · <span className="font-bold text-[#0A0A0A]">{formatPeso(unitPrice)}</span> per unit
                </p>
              ) : (
                <>
                  <p className="mt-1 text-[14px] font-semibold text-[#8A8A94]">
                    {consumptionDetails.currentBalance.toLocaleString('en-PH', { maximumFractionDigits: 0 })} L left
                  </p>
                  {(consumptionDetails.monthlyPlanLiters + consumptionDetails.bonusLiters > 0 || consumptionDetails.rolloverLiters > 0) ? (
                    <p className="mt-1 text-[13px] font-semibold text-[#8A8A94]">
                      {(consumptionDetails.monthlyPlanLiters + consumptionDetails.bonusLiters).toLocaleString('en-PH')} L this month
                      {consumptionDetails.rolloverLiters > 0 ? ` · ${consumptionDetails.rolloverLiters.toLocaleString('en-PH')} L saved` : ''}
                    </p>
                  ) : null}
                </>
              )}
              <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1">
                <button type="button" className={quiet} onClick={() => window.dispatchEvent(new CustomEvent('open-compliance'))}>
                  Sanitation
                </button>
                <button type="button" className={quiet} onClick={onSaveLitersClick}>
                  Live quality
                </button>
                {isPending ? (
                  <button type="button" className={quiet} onClick={() => window.dispatchEvent(new CustomEvent('open-subscription-onboarding'))}>
                    Track status
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <section className="rounded-[24px] bg-white px-[18px] pb-4 pt-[18px] shadow-[0_1px_2px_rgba(16,16,24,0.04),0_10px_28px_-10px_rgba(16,16,24,0.12)]">
              <p className={label}>Used this month</p>
              <p className={cn(value, 'mt-1.5')}>{usedLabel}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-[#8A8A94]">{trendCopy}</p>
            </section>
            <section className="rounded-[24px] bg-white px-[18px] pb-4 pt-[18px] shadow-[0_1px_2px_rgba(16,16,24,0.04),0_10px_28px_-10px_rgba(16,16,24,0.12)]">
              <p className={label}>Estimated bill</p>
              <p className={cn(value, 'mt-1.5')}>{formatPeso(consumptionDetails.estimatedCost)}</p>
            </section>
          </div>

          <section className={card}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={label}>Auto-refill</p>
                <p className="mt-1.5 text-[20px] font-extrabold leading-[1.2] tracking-[-0.02em] text-[#1A2C49]">{scheduleLabel}</p>
                {(!autoRefill || !isActivated) ? (
                  <button type="button" className={cn(quiet, 'mt-2')} onClick={openSetup}>
                    {isActivated ? 'Schedule a refill' : isPending ? 'Track setup' : 'Find a water provider'}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoRefill}
                aria-label="Auto-refill"
                onClick={() => onSwitchChange(!autoRefill)}
                className={cn('relative h-7 w-11 shrink-0 rounded-full transition-colors', autoRefill ? 'bg-[#1A2C49]' : 'bg-[#E4E4E7]')}
              >
                <span className={cn('absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm', autoRefill ? 'right-[3px]' : 'left-[3px]')} />
              </button>
            </div>
          </section>
        </>
      )}
    </div>

    <AlertDialog open={isConfirmingToggle} onOpenChange={setIsConfirmingToggle}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl p-8">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black tracking-tight">Adjust Auto-Refill Preferences?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-500 font-bold leading-relaxed pt-2">
                    {toggleTargetState ? (
                        <>
                            Re-activating auto-refill will resume your recurring schedule:
                            <strong className="block mt-4 text-slate-900 text-lg font-black">→ Next {nextRefillDay} at {planDetails?.deliveryTime || 'morning'}</strong>
                            Our fulfillment team will be notified immediately.
                        </>
                    ) : (
                        <>
                            Pausing auto-refill will stop all automatic dispatches. You will need to manually request water when your inventory is low.
                        </>
                    )}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-8 gap-3">
                <AlertDialogCancel className="rounded-xl h-12 font-bold text-xs uppercase tracking-widest px-8 border-slate-100" onClick={() => setToggleTargetState(null)}>Keep Current</AlertDialogCancel>
                <AlertDialogAction className="rounded-xl h-12 font-bold text-xs uppercase tracking-widest px-8 shadow-lg" onClick={handleToggleConfirmation}>
                    {toggleTargetState ? 'Enable Auto-Refill' : 'Confirm Pause'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
