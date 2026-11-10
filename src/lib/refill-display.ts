import type { AppUser, RefillRequest } from '@/lib/types';

export function usualContainers(user: AppUser | null | undefined): number {
  const quantity = Number(user?.customPlanDetails?.gallonQuantity);
  if (Number.isFinite(quantity) && quantity > 0) return Math.max(1, Math.round(quantity));
  return 1;
}

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && value && 'seconds' in value) {
    return new Date(Number((value as { seconds: number }).seconds) * 1000);
  }
  return null;
}

/** 1 Requested, 2 Accepted (In Production), 3 On the way (Out for Delivery). */
export function refillStep(status: RefillRequest['status'] | string | undefined): 1 | 2 | 3 {
  if (status === 'Out for Delivery') return 3;
  if (status === 'In Production') return 2;
  return 1;
}

export function formatSentAt(value: unknown): string {
  const date = toDate(value);
  if (!date) return 'Sent just now';
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return `Sent today at ${time}`;
  const day = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  return `Sent ${day} at ${time}`;
}

export function autoRefillLabel(user: AppUser | null | undefined): string {
  const details = user?.customPlanDetails || {};
  const enabled = details.autoRefillEnabled ?? true;
  if (!enabled) return 'Off';
  if (details.deliveryDay) return `Every ${details.deliveryDay}`;
  return 'On';
}

export function dispatchWindowLabel(user: AppUser | null | undefined): string {
  const details = user?.customPlanDetails || {};
  const auto = details.autoRefillEnabled ?? true;
  if (!auto || !details.deliveryDay) return 'On demand';
  const time = details.deliveryTime ? ` ${String(details.deliveryTime).slice(0, 5)}` : '';
  return `${details.deliveryDay}${time}`;
}
