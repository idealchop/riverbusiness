import type { AppUser, Delivery, Payment } from '@/lib/types';
import {
  billingRangeFromPeriodLabel,
  consumptionCharge,
  deliveriesInRange,
  litersInRange,
  manilaMonthLabel,
  manilaMonthRange,
  manilaParts,
  roundMoney,
} from '@/lib/billing-period';

function toSafeDate(timestamp: unknown): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return Number.isNaN(timestamp.getTime()) ? null : timestamp;
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof timestamp === 'object' && timestamp && 'seconds' in timestamp) {
    const seconds = (timestamp as { seconds: number }).seconds;
    return new Date(seconds * 1000);
  }
  if (typeof timestamp === 'object' && timestamp && 'toDate' in timestamp && typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
    return (timestamp as { toDate: () => Date }).toDate();
  }
  return null;
}

export type CycleEstimate = Payment & { consumedLiters: number };

/**
 * Same current-cycle estimate the account billing screen already builds.
 * Display only — this does not write an invoice or change a charge.
 */
export function currentCycleEstimate(user: AppUser, deliveries: Delivery[]): CycleEstimate {
  const now = new Date();
  const nowParts = manilaParts(now);

  let cycleStart: Date;
  let cycleEnd: Date;
  let monthsToBill = 1;
  let description: string;
  let invoiceIdSuffix: string;

  const combinedPeriod = (nowParts.year === 2025 && nowParts.monthIndex === 11) || (nowParts.year === 2026 && nowParts.monthIndex === 0);
  if (combinedPeriod) {
    const combined = billingRangeFromPeriodLabel('December 2025 - January 2026')!;
    cycleStart = combined.start;
    cycleEnd = combined.end;
    monthsToBill = combined.monthsToBill;
    description = 'Bill for December 2025 - January 2026';
    invoiceIdSuffix = '202512-202601';
  } else {
    const range = manilaMonthRange(nowParts.year, nowParts.monthIndex);
    cycleStart = range.start;
    cycleEnd = range.end;
    description = `Bill for ${manilaMonthLabel(nowParts.year, nowParts.monthIndex)}`;
    invoiceIdSuffix = `${nowParts.year}${String(nowParts.monthIndex + 1).padStart(2, '0')}`;
  }

  const deliveriesThisCycle = deliveriesInRange(deliveries || [], cycleStart, cycleEnd);

  let estimatedCost = 0;

  const userCreationDate = toSafeDate(user.createdAt);
  const createdParts = userCreationDate ? manilaParts(userCreationDate) : null;
  const isFirstMonth = createdParts ? createdParts.year === nowParts.year && createdParts.monthIndex === nowParts.monthIndex : false;

  if (isFirstMonth && user.customPlanDetails) {
    if (user.customPlanDetails.gallonPaymentType === 'One-Time') {
      estimatedCost += user.customPlanDetails.gallonPrice || 0;
    }
    if (user.customPlanDetails.dispenserPaymentType === 'One-Time') {
      estimatedCost += user.customPlanDetails.dispenserPrice || 0;
    }
  }

  let monthlyEquipmentCost = 0;
  if (user.customPlanDetails?.gallonPaymentType === 'Monthly') {
    monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
  }
  if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') {
    monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);
  }

  const equipmentCostForPeriod = monthlyEquipmentCost * monthsToBill;
  estimatedCost += equipmentCostForPeriod;

  if (user.plan?.isConsumptionBased) {
    estimatedCost += consumptionCharge(deliveriesThisCycle, user.plan.price || 0);
  } else {
    const planCost = user.plan?.price || 0;
    estimatedCost += planCost;
  }

  const pendingChargesTotal = (user.pendingCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
  estimatedCost += pendingChargesTotal;

  return {
    id: `INV-${user.id.substring(0, 5)}-${invoiceIdSuffix}`,
    date: new Date().toISOString(),
    description: isFirstMonth ? `${description} + One-Time Fees` : description,
    amount: roundMoney(estimatedCost),
    status: user.accountType === 'Branch' ? 'Covered by Parent Account' : 'Upcoming',
    consumedLiters: litersInRange(deliveries || [], cycleStart, cycleEnd),
  };
}
