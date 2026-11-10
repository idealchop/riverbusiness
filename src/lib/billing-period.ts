/**
 * Manila (Asia/Manila, UTC+8, no DST) billing months.
 *
 * Keep this file identical to src/lib/billing-period.ts.
 * Delivery calendar days are stored as Manila midnight in UTC
 * (e.g. 1 June 2026 00:00 Manila => 2026-05-31T16:00:00.000Z). Existing
 * rows already use that shape and must fall in the Manila month, not the UTC month.
 */

export const MANILA_TIME_ZONE = 'Asia/Manila';
export const BILLING_CRON = '0 0 1 * *';
export const CONTAINER_LITERS = 19.5;
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const MONEY_EPS = 0.009;

export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export interface ManilaParts {
    year: number;
    monthIndex: number;
    day: number;
}

export interface MonthRange {
    start: Date;
    end: Date;
    monthsToBill: number;
}

export function manilaParts(instant: Date): ManilaParts {
    const shifted = new Date(instant.getTime() + MANILA_OFFSET_MS);
    return {
        year: shifted.getUTCFullYear(),
        monthIndex: shifted.getUTCMonth(),
        day: shifted.getUTCDate(),
    };
}

export function isSameManilaDay(a: Date, b: Date): boolean {
    const left = manilaParts(a);
    const right = manilaParts(b);
    return left.year === right.year && left.monthIndex === right.monthIndex && left.day === right.day;
}

/** Inclusive UTC instants of a Manila calendar month. */
export function manilaMonthRange(year: number, monthIndex: number): { start: Date; end: Date } {
    const startMs = Date.UTC(year, monthIndex, 1) - MANILA_OFFSET_MS;
    const endMs = Date.UTC(year, monthIndex + 1, 1) - MANILA_OFFSET_MS - 1;
    return { start: new Date(startMs), end: new Date(endMs) };
}

export function manilaMonthLabel(year: number, monthIndex: number): string {
    return `${MONTHS[monthIndex]} ${year}`;
}

export function previousManilaMonth(now: Date): { year: number; monthIndex: number; label: string; start: Date; end: Date } {
    const parts = manilaParts(now);
    const monthIndex = parts.monthIndex === 0 ? 11 : parts.monthIndex - 1;
    const year = parts.monthIndex === 0 ? parts.year - 1 : parts.year;
    const range = manilaMonthRange(year, monthIndex);
    return { year, monthIndex, label: manilaMonthLabel(year, monthIndex), start: range.start, end: range.end };
}

export interface BillingWindow {
    /** Jan 1 2026 run is intentionally a no-op; February bills Dec+Jan together. */
    skip: boolean;
    billingPeriod: string;
    start: Date;
    end: Date;
    monthsToBill: number;
}

/**
 * Billing window for a scheduler tick. `now` is an absolute instant.
 * The cron runs at 00:00 Asia/Manila on the 1st, which is still the previous UTC day.
 */
export function billingWindowForRun(now: Date): BillingWindow {
    const parts = manilaParts(now);
    if (parts.year === 2026 && parts.monthIndex === 0) {
        return { skip: true, billingPeriod: '', start: now, end: now, monthsToBill: 0 };
    }
    if (parts.year === 2026 && parts.monthIndex === 1) {
        return {
            skip: false,
            billingPeriod: 'December 2025 - January 2026',
            start: manilaMonthRange(2025, 11).start,
            end: manilaMonthRange(2026, 0).end,
            monthsToBill: 2,
        };
    }
    const prev = previousManilaMonth(now);
    return {
        skip: false,
        billingPeriod: prev.label,
        start: prev.start,
        end: prev.end,
        monthsToBill: 1,
    };
}

export function invoiceDocId(userId: string, billingPeriod: string): string {
    return `INV-${userId.substring(0, 5)}-${billingPeriod.replace(/\s/g, '-')}`;
}

/**
 * December 2025 and January 2026 were invoiced as one document.
 * Prefer that id when it exists; the single-month id is the fallback.
 */
export function candidateInvoiceIds(userId: string, year: number, monthIndex: number): string[] {
    const single = invoiceDocId(userId, manilaMonthLabel(year, monthIndex));
    if ((year === 2025 && monthIndex === 11) || (year === 2026 && monthIndex === 0)) {
        return [invoiceDocId(userId, 'December 2025 - January 2026'), single];
    }
    return [single];
}

export function periodLabelFromText(text: string): string | null {
    if (text.includes('December 2025 - January 2026')) return 'December 2025 - January 2026';
    const match = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/);
    return match ? `${match[1]} ${match[2]}` : null;
}

/** Manila window that an existing invoice actually covers. */
export function windowForInvoice(
    invoice: { description?: string; billingPeriod?: string },
    year: number,
    monthIndex: number,
): MonthRange & { billingPeriod: string } {
    const label = invoice.billingPeriod || periodLabelFromText(invoice.description || '') || manilaMonthLabel(year, monthIndex);
    const parsed = billingRangeFromPeriodLabel(label);
    if (parsed) {
        return { ...parsed, billingPeriod: periodLabelFromText(label) || label };
    }
    const range = manilaMonthRange(year, monthIndex);
    return { start: range.start, end: range.end, monthsToBill: 1, billingPeriod: manilaMonthLabel(year, monthIndex) };
}

export function billingRangeFromPeriodLabel(label: string): MonthRange | null {
    if (label.includes('December 2025 - January 2026')) {
        return {
            start: manilaMonthRange(2025, 11).start,
            end: manilaMonthRange(2026, 0).end,
            monthsToBill: 2,
        };
    }
    const pretty = periodLabelFromText(label);
    if (!pretty) return null;
    const match = pretty.match(/^(\w+)\s+(\d{4})$/);
    if (!match) return null;
    const monthIndex = MONTHS.indexOf(match[1] as typeof MONTHS[number]);
    if (monthIndex < 0) return null;
    const range = manilaMonthRange(Number(match[2]), monthIndex);
    return { start: range.start, end: range.end, monthsToBill: 1 };
}

/** Manila midnight of a calendar day, as a UTC instant. */
export function manilaMidnightFromCalendarParts(year: number, monthIndex: number, day: number): Date {
    return new Date(Date.UTC(year, monthIndex, day) - MANILA_OFFSET_MS);
}

/**
 * Store the calendar day the user picked (local Y-M-D of the picker value)
 * as Manila midnight so the Manila day survives any browser timezone.
 */
export function manilaCalendarDayIso(picked: Date): string {
    return manilaMidnightFromCalendarParts(picked.getFullYear(), picked.getMonth(), picked.getDate()).toISOString();
}

export function deliveryInstant(stored: unknown): Date | null {
    if (!stored) return null;
    if (stored instanceof Date) return isNaN(stored.getTime()) ? null : stored;
    if (typeof stored === 'string' || typeof stored === 'number') {
        const parsed = new Date(stored);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof stored === 'object') {
        const maybe = stored as { toDate?: () => Date; seconds?: number };
        if (typeof maybe.toDate === 'function') {
            const parsed = maybe.toDate();
            return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : null;
        }
        if (typeof maybe.seconds === 'number') return new Date(maybe.seconds * 1000);
    }
    return null;
}

/** Local-midnight Date whose calendar day is the stored instant's Manila day. */
export function datePickerValueForStoredDelivery(stored: unknown): Date {
    const instant = deliveryInstant(stored);
    if (!instant) return new Date();
    const parts = manilaParts(instant);
    return new Date(parts.year, parts.monthIndex, parts.day);
}

export function isInRange(instant: Date, start: Date, end: Date): boolean {
    const time = instant.getTime();
    return time >= start.getTime() && time <= end.getTime();
}

export function deliveriesInRange<T extends { date: unknown }>(deliveries: T[], start: Date, end: Date): T[] {
    return deliveries.filter((delivery) => {
        const instant = deliveryInstant(delivery.date);
        return instant ? isInRange(instant, start, end) : false;
    });
}

export function deliveryLiters(delivery: { liters?: number; volumeContainers?: number }): number {
    if (typeof delivery.liters === 'number' && !Number.isNaN(delivery.liters)) return delivery.liters;
    return (delivery.volumeContainers || 0) * CONTAINER_LITERS;
}

export function roundMoney(amount: number): number {
    const sign = amount < 0 ? -1 : 1;
    return (sign * Math.round((Math.abs(amount) + Number.EPSILON) * 100)) / 100;
}

/**
 * The monthly job never filtered on delivery status, so Pending and In Transit
 * count the same as Delivered.
 */
export function countsTowardConsumption(delivery: { status?: string }): boolean {
    return delivery.status !== 'Cancelled';
}

/**
 * Money already stored on the delivery. Recomputes must use this and not the
 * customer's current plan price — deliveries through mid-May 2026 were ₱3/L.
 * `fallbackPricePerLiter` is only for a new invoice when a row has no amount.
 */
export function deliveryBilledAmount(
    delivery: { amount?: number; liters?: number; volumeContainers?: number; status?: string },
    fallbackPricePerLiter?: number,
): number {
    if (!countsTowardConsumption(delivery)) return 0;
    if (typeof delivery.amount === 'number' && Number.isFinite(delivery.amount)) return delivery.amount;
    if (typeof fallbackPricePerLiter === 'number') return roundMoney(deliveryLiters(delivery) * fallbackPricePerLiter);
    return 0;
}

export function storedConsumption(
    deliveries: { amount?: number; liters?: number; volumeContainers?: number; status?: string }[],
): number {
    return roundMoney(deliveries.reduce((sum, delivery) => sum + deliveryBilledAmount(delivery), 0));
}

export function consumptionCharge(
    deliveries: { amount?: number; liters?: number; volumeContainers?: number; status?: string }[],
    pricePerLiter: number,
): number {
    return roundMoney(deliveries.reduce((sum, delivery) => sum + deliveryBilledAmount(delivery, pricePerLiter), 0));
}

export function litersInRange(
    deliveries: { date: unknown; liters?: number; volumeContainers?: number }[],
    start: Date,
    end: Date,
): number {
    return deliveriesInRange(deliveries, start, end).reduce((sum, delivery) => sum + deliveryLiters(delivery), 0);
}

export interface ChargeLike {
    id?: string;
    description?: string;
    amount: number;
    kind?: string;
    invoiceId?: string;
    billingPeriod?: string;
    deliveryId?: string;
    dateAdded?: unknown;
}

export function sumCharges(charges: { amount: number }[] | undefined): number {
    return roundMoney((charges || []).reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0));
}

export interface PendingChargeApplication {
    amount: number;
    description: string;
    manualCharges: ChargeLike[];
    /** True only when the charges were copied onto an invoice that will be written. */
    clearPending: boolean;
}

/**
 * Attach pending charges to the invoice being written, then clear them —
 * including charges that net to ₱0, which used to be copied onto every later invoice.
 * Nothing is cleared when no invoice is written.
 */
export function applyPendingCharges(
    amount: number,
    description: string,
    pendingCharges: ChargeLike[] | undefined,
): PendingChargeApplication {
    const charges = pendingCharges || [];
    const total = sumCharges(charges);
    let nextAmount = amount;
    let nextDescription = description;
    if (charges.length > 0 && Math.abs(total) >= MONEY_EPS) {
        nextAmount = roundMoney(amount + total);
        nextDescription += total > 0 ? ' + Adjustments' : ' + Deductions';
    }
    const willWriteInvoice = nextAmount > MONEY_EPS;
    return {
        amount: nextAmount,
        description: nextDescription,
        manualCharges: willWriteInvoice ? charges : [],
        clearPending: willWriteInvoice && charges.length > 0,
    };
}

export function equipmentMonthly(customPlanDetails: {
    gallonPaymentType?: string;
    gallonPrice?: number;
    dispenserPaymentType?: string;
    dispenserPrice?: number;
} | null | undefined): number {
    if (!customPlanDetails) return 0;
    let cost = 0;
    if (customPlanDetails.gallonPaymentType === 'Monthly') cost += customPlanDetails.gallonPrice || 0;
    if (customPlanDetails.dispenserPaymentType === 'Monthly') cost += customPlanDetails.dispenserPrice || 0;
    return cost;
}

export function oneTimeEquipment(customPlanDetails: {
    gallonPaymentType?: string;
    gallonPrice?: number;
    dispenserPaymentType?: string;
    dispenserPrice?: number;
} | null | undefined): number {
    if (!customPlanDetails) return 0;
    let cost = 0;
    if (customPlanDetails.gallonPaymentType === 'One-Time') cost += customPlanDetails.gallonPrice || 0;
    if (customPlanDetails.dispenserPaymentType === 'One-Time') cost += customPlanDetails.dispenserPrice || 0;
    return cost;
}

export const OPEN_INVOICE_STATUSES = ['Upcoming', 'Overdue', 'Covered by Parent Account', 'Pending Review'] as const;

export interface InvoiceForReconcile {
    id: string;
    amount: number;
    status: string;
    description?: string;
    billingPeriod?: string;
    manualCharges?: ChargeLike[];
    consumptionAmount?: number;
    nonConsumptionAmount?: number;
    carryOverAmount?: number;
    carryOverChargeId?: string;
    carryOverConsumed?: boolean;
    billingFlag?: string;
    unbilledAmount?: number;
}

export interface FeeSnapshot {
    equipment: number;
    oneTime: number;
}

/** Live trigger will not create carry-overs for periods that start before this month. */
export const DEFAULT_CARRYOVER_CUTOFF = '2026-06';

const MONTH_NAME_PATTERN = 'January|February|March|April|May|June|July|August|September|October|November|December';

export function periodKeyFromInvoice(invoice: { id?: string; description?: string; billingPeriod?: string }): string | null {
    const label = invoice.billingPeriod || periodLabelFromText(invoice.description || '') || '';
    if (label.includes('December 2025 - January 2026')) return '2025-12_2026-01';
    const named = label.match(new RegExp(`^(${MONTH_NAME_PATTERN})\\s+(\\d{4})$`));
    if (named) {
        const monthIndex = MONTHS.indexOf(named[1] as typeof MONTHS[number]);
        return `${named[2]}-${String(monthIndex + 1).padStart(2, '0')}`;
    }
    const id = invoice.id || '';
    const combined = id.match(/-(\d{4})(\d{2})-(\d{4})(\d{2})$/);
    if (combined) return `${combined[1]}-${combined[2]}_${combined[3]}-${combined[4]}`;
    const numeric = id.match(/-(\d{4})(\d{2})$/);
    if (numeric) return `${numeric[1]}-${numeric[2]}`;
    const idNamed = id.match(new RegExp(`-(${MONTH_NAME_PATTERN})-(\\d{4})$`));
    if (idNamed) {
        const monthIndex = MONTHS.indexOf(idNamed[1] as typeof MONTHS[number]);
        return `${idNamed[2]}-${String(monthIndex + 1).padStart(2, '0')}`;
    }
    return null;
}

export function invoiceCoversMonth(invoice: { id?: string; description?: string; billingPeriod?: string }, year: number, monthIndex: number): boolean {
    const key = periodKeyFromInvoice(invoice);
    if (!key) return false;
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    if (key === monthKey) return true;
    if (key.includes('_')) {
        const [start, end] = key.split('_');
        return monthKey === start || monthKey === end;
    }
    return false;
}

export function periodStartsOnOrAfter(periodKey: string, cutoff: string = DEFAULT_CARRYOVER_CUTOFF): boolean {
    return periodKey.slice(0, 7) >= cutoff;
}

export function labelForPeriodKey(periodKey: string): string {
    if (periodKey === '2025-12_2026-01') return 'December 2025 - January 2026';
    const [year, month] = periodKey.split('-').map(Number);
    return manilaMonthLabel(year, month - 1);
}

export function rangeForPeriodKey(periodKey: string): MonthRange | null {
    if (periodKey === '2025-12_2026-01') return billingRangeFromPeriodLabel('December 2025 - January 2026');
    const match = periodKey.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    const range = manilaMonthRange(Number(match[1]), Number(match[2]) - 1);
    return { start: range.start, end: range.end, monthsToBill: 1 };
}

export function chargeReferencesInvoice(charge: ChargeLike, invoiceIds: ReadonlySet<string>): boolean {
    const text = `${charge.description || ''} ${charge.invoiceId || ''}`;
    for (const id of invoiceIds) {
        if (id && text.includes(id)) return true;
    }
    return false;
}

/** Manual charges on the invoices, excluding deductions that point at another invoice in the same period. */
export function periodAdjustments(invoices: InvoiceForReconcile[]): number {
    const ids = new Set(invoices.map((invoice) => invoice.id).filter(Boolean));
    let total = 0;
    for (const invoice of invoices) {
        for (const charge of invoice.manualCharges || []) {
            if (chargeReferencesInvoice(charge, ids)) continue;
            total += Number(charge.amount) || 0;
        }
    }
    return roundMoney(total);
}

export function groupInvoicesByPeriod(invoices: InvoiceForReconcile[]): { periodKey: string; invoices: InvoiceForReconcile[] }[] {
    const groups = new Map<string, InvoiceForReconcile[]>();
    for (const invoice of invoices) {
        const periodKey = periodKeyFromInvoice(invoice);
        if (!periodKey) continue;
        const list = groups.get(periodKey) || [];
        list.push(invoice);
        groups.set(periodKey, list);
    }
    return [...groups.entries()].map(([periodKey, grouped]) => ({ periodKey, invoices: grouped }));
}

function isNamedMonthInvoice(invoice: InvoiceForReconcile): boolean {
    return new RegExp(`-(${MONTH_NAME_PATTERN})-\\d{4}$`).test(invoice.id)
        || (invoice.id || '').includes('December-2025');
}

export function chooseTargetInvoice(invoices: InvoiceForReconcile[], kind: 'open' | 'paid'): InvoiceForReconcile | null {
    const pool = invoices.filter((invoice) => kind === 'open'
        ? (OPEN_INVOICE_STATUSES as readonly string[]).includes(invoice.status)
        : invoice.status === 'Paid');
    if (pool.length === 0) return null;
    const named = pool.filter(isNamedMonthInvoice);
    const preferred = named.length > 0 ? named : pool;
    const nonzero = preferred.filter((invoice) => Math.abs(invoice.amount) > MONEY_EPS);
    return nonzero[0] || preferred[0];
}

export type ReconcileResult =
    | { type: 'skip'; reason: string }
    | {
        type: 'update-unpaid';
        amount: number;
        consumptionAmount: number;
        nonConsumptionAmount: number;
        billingFlag: string | null;
    }
    | {
        type: 'flag-paid';
        billingFlag: string;
        unbilledAmount: number;
        carryOverAmount: number;
        carryOverChargeId: string | null;
        pendingCharge: ChargeLike | null;
        removePendingChargeId: string | null;
    };

export interface GroupReconcile {
    action: 'skip' | 'update-unpaid' | 'flag-paid';
    reason: string;
    targetInvoiceId: string | null;
    expected: number;
    billed: number;
    result: ReconcileResult;
}

/**
 * Compare one period's invoices, together, with the stored delivery amounts.
 * Early-payment invoices and ₱0 stubs are not reconciled on their own.
 * Plan one-time prices are not added just because the description mentions them.
 * Paid amounts are never changed. `allowCarryOver` is false for the live trigger
 * on periods before the cutoff; the backfill passes true.
 */
export function reconcileInvoiceGroup(input: {
    invoices: InvoiceForReconcile[];
    deliveries: { amount?: number; liters?: number; volumeContainers?: number; status?: string }[];
    billingPeriod: string;
    allowCarryOver?: boolean;
}): GroupReconcile {
    const invoices = input.invoices.filter((invoice) => invoice && invoice.id && !invoice.id.startsWith('INV-EST'));
    const billingPeriod = input.billingPeriod;
    const allowCarryOver = input.allowCarryOver !== false;
    const emptySkip = (reason: string): GroupReconcile => ({
        action: 'skip',
        reason,
        targetInvoiceId: null,
        expected: 0,
        billed: 0,
        result: { type: 'skip', reason },
    });
    if (invoices.length === 0) return emptySkip('no-invoice');

    const consumptionAmount = storedConsumption(input.deliveries);
    const adjustments = periodAdjustments(invoices);
    const expected = roundMoney(consumptionAmount + adjustments);
    const billed = roundMoney(invoices.reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0));
    const delta = roundMoney(expected - billed);
    const openTarget = chooseTargetInvoice(invoices, 'open');
    const paidTarget = chooseTargetInvoice(invoices, 'paid');

    if (openTarget && Math.abs(delta) >= MONEY_EPS) {
        const result: ReconcileResult = {
            type: 'update-unpaid',
            amount: roundMoney(openTarget.amount + delta),
            consumptionAmount,
            nonConsumptionAmount: adjustments,
            billingFlag: openTarget.status === 'Pending Review' ? 'adjusted-during-review' : null,
        };
        return {
            action: 'update-unpaid',
            reason: 'missing-deliveries',
            targetInvoiceId: openTarget.id,
            expected,
            billed,
            result,
        };
    }

    if (Math.abs(delta) < MONEY_EPS) {
        return {
            action: 'skip',
            reason: 'already-current',
            targetInvoiceId: null,
            expected,
            billed,
            result: { type: 'skip', reason: 'already-current' },
        };
    }

    if (!paidTarget || delta <= MONEY_EPS) {
        return {
            action: 'skip',
            reason: delta < -MONEY_EPS ? 'paid-in-balance' : 'no-paid-target',
            targetInvoiceId: null,
            expected,
            billed,
            result: { type: 'skip', reason: 'paid-in-balance' },
        };
    }

    if (!allowCarryOver) {
        return {
            action: 'skip',
            reason: 'carry-over-before-cutoff',
            targetInvoiceId: paidTarget.id,
            expected,
            billed,
            result: { type: 'skip', reason: 'carry-over-before-cutoff' },
        };
    }

    const recorded = roundMoney(paidTarget.carryOverAmount || 0);
    if (Math.abs(delta - recorded) < MONEY_EPS && paidTarget.carryOverChargeId) {
        return {
            action: 'skip',
            reason: 'carry-over-already-recorded',
            targetInvoiceId: paidTarget.id,
            expected,
            billed,
            result: { type: 'skip', reason: 'carry-over-already-recorded' },
        };
    }

    const alreadyConsumed = !!paidTarget.carryOverConsumed;
    const incremental = alreadyConsumed ? roundMoney(delta - recorded) : delta;
    if (incremental <= MONEY_EPS) {
        return {
            action: 'skip',
            reason: 'carry-over-already-recorded',
            targetInvoiceId: paidTarget.id,
            expected,
            billed,
            result: { type: 'skip', reason: 'carry-over-already-recorded' },
        };
    }

    const chargeId = alreadyConsumed
        ? `carryover-${paidTarget.id}-${recorded}`
        : (paidTarget.carryOverChargeId || `carryover-${paidTarget.id}`);
    const result: ReconcileResult = {
        type: 'flag-paid',
        billingFlag: 'unbilled-after-paid',
        unbilledAmount: delta,
        carryOverAmount: delta,
        carryOverChargeId: chargeId,
        removePendingChargeId: null,
        pendingCharge: {
            id: chargeId,
            description: `Carry-over from paid ${billingPeriod} invoice ${paidTarget.id}: stored delivery amounts plus invoice charges total ₱${expected.toFixed(2)} and the period's invoices total ₱${billed.toFixed(2)}.`,
            amount: incremental,
            kind: 'carryover',
            invoiceId: paidTarget.id,
            billingPeriod,
        },
    };
    return {
        action: 'flag-paid',
        reason: 'missing-deliveries',
        targetInvoiceId: paidTarget.id,
        expected,
        billed,
        result,
    };
}

/**
 * One invoice. Prefer reconcileInvoiceGroup when several documents cover the period.
 */
export function reconcileMonthInvoice(input: {
    invoice: InvoiceForReconcile | null;
    deliveries: { amount?: number; liters?: number; volumeContainers?: number; status?: string }[];
    pricePerLiter?: number;
    billingPeriod: string;
    fees?: FeeSnapshot;
    allowCarryOver?: boolean;
}): ReconcileResult {
    if (!input.invoice) return { type: 'skip', reason: 'no-invoice' };
    return reconcileInvoiceGroup({
        invoices: [input.invoice],
        deliveries: input.deliveries,
        billingPeriod: input.billingPeriod,
        allowCarryOver: input.allowCarryOver,
    }).result;
}

export function billingSignature(delivery: { date?: unknown; liters?: number; volumeContainers?: number; amount?: number; status?: string } | undefined): string | null {
    if (!delivery) return null;
    const instant = deliveryInstant(delivery.date);
    return `${instant ? instant.toISOString() : ''}|${delivery.liters ?? ''}|${delivery.volumeContainers ?? ''}|${delivery.amount ?? ''}|${delivery.status ?? ''}`;
}

/** Calendar date in Asia/Manila, independent of the process timezone. */
export function formatManilaDate(stored: unknown, pattern: 'long' | 'medium' = 'long'): string {
    const instant = deliveryInstant(stored);
    if (!instant) return 'N/A';
    const parts = manilaParts(instant);
    const month = MONTHS[parts.monthIndex];
    const shortMonth = month.slice(0, 3);
    return pattern === 'medium'
        ? `${shortMonth} ${parts.day}, ${parts.year}`
        : `${month} ${parts.day}, ${parts.year}`;
}
