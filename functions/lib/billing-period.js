"use strict";
/**
 * Manila (Asia/Manila, UTC+8, no DST) billing months.
 *
 * Keep this file identical to src/lib/billing-period.ts.
 * Delivery calendar days are stored as Manila midnight in UTC
 * (e.g. 1 June 2026 00:00 Manila => 2026-05-31T16:00:00.000Z). Existing
 * rows already use that shape and must fall in the Manila month, not the UTC month.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CARRYOVER_CUTOFF = exports.OPEN_INVOICE_STATUSES = exports.MONTHS = exports.CONTAINER_LITERS = exports.BILLING_CRON = exports.MANILA_TIME_ZONE = void 0;
exports.manilaParts = manilaParts;
exports.isSameManilaDay = isSameManilaDay;
exports.manilaMonthRange = manilaMonthRange;
exports.manilaMonthLabel = manilaMonthLabel;
exports.previousManilaMonth = previousManilaMonth;
exports.billingWindowForRun = billingWindowForRun;
exports.invoiceDocId = invoiceDocId;
exports.candidateInvoiceIds = candidateInvoiceIds;
exports.periodLabelFromText = periodLabelFromText;
exports.windowForInvoice = windowForInvoice;
exports.billingRangeFromPeriodLabel = billingRangeFromPeriodLabel;
exports.manilaMidnightFromCalendarParts = manilaMidnightFromCalendarParts;
exports.manilaCalendarDayIso = manilaCalendarDayIso;
exports.deliveryInstant = deliveryInstant;
exports.datePickerValueForStoredDelivery = datePickerValueForStoredDelivery;
exports.isInRange = isInRange;
exports.deliveriesInRange = deliveriesInRange;
exports.deliveryLiters = deliveryLiters;
exports.roundMoney = roundMoney;
exports.countsTowardConsumption = countsTowardConsumption;
exports.deliveryBilledAmount = deliveryBilledAmount;
exports.storedConsumption = storedConsumption;
exports.consumptionCharge = consumptionCharge;
exports.litersInRange = litersInRange;
exports.sumCharges = sumCharges;
exports.applyPendingCharges = applyPendingCharges;
exports.equipmentMonthly = equipmentMonthly;
exports.oneTimeEquipment = oneTimeEquipment;
exports.periodKeyFromInvoice = periodKeyFromInvoice;
exports.invoiceCoversMonth = invoiceCoversMonth;
exports.periodStartsOnOrAfter = periodStartsOnOrAfter;
exports.labelForPeriodKey = labelForPeriodKey;
exports.rangeForPeriodKey = rangeForPeriodKey;
exports.chargeReferencesInvoice = chargeReferencesInvoice;
exports.periodAdjustments = periodAdjustments;
exports.groupInvoicesByPeriod = groupInvoicesByPeriod;
exports.chooseTargetInvoice = chooseTargetInvoice;
exports.reconcileInvoiceGroup = reconcileInvoiceGroup;
exports.reconcileMonthInvoice = reconcileMonthInvoice;
exports.billingSignature = billingSignature;
exports.formatManilaDate = formatManilaDate;
exports.MANILA_TIME_ZONE = 'Asia/Manila';
exports.BILLING_CRON = '0 0 1 * *';
exports.CONTAINER_LITERS = 19.5;
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const MONEY_EPS = 0.009;
exports.MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
function manilaParts(instant) {
    const shifted = new Date(instant.getTime() + MANILA_OFFSET_MS);
    return {
        year: shifted.getUTCFullYear(),
        monthIndex: shifted.getUTCMonth(),
        day: shifted.getUTCDate(),
    };
}
function isSameManilaDay(a, b) {
    const left = manilaParts(a);
    const right = manilaParts(b);
    return left.year === right.year && left.monthIndex === right.monthIndex && left.day === right.day;
}
/** Inclusive UTC instants of a Manila calendar month. */
function manilaMonthRange(year, monthIndex) {
    const startMs = Date.UTC(year, monthIndex, 1) - MANILA_OFFSET_MS;
    const endMs = Date.UTC(year, monthIndex + 1, 1) - MANILA_OFFSET_MS - 1;
    return { start: new Date(startMs), end: new Date(endMs) };
}
function manilaMonthLabel(year, monthIndex) {
    return `${exports.MONTHS[monthIndex]} ${year}`;
}
function previousManilaMonth(now) {
    const parts = manilaParts(now);
    const monthIndex = parts.monthIndex === 0 ? 11 : parts.monthIndex - 1;
    const year = parts.monthIndex === 0 ? parts.year - 1 : parts.year;
    const range = manilaMonthRange(year, monthIndex);
    return { year, monthIndex, label: manilaMonthLabel(year, monthIndex), start: range.start, end: range.end };
}
/**
 * Billing window for a scheduler tick. `now` is an absolute instant.
 * The cron runs at 00:00 Asia/Manila on the 1st, which is still the previous UTC day.
 */
function billingWindowForRun(now) {
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
function invoiceDocId(userId, billingPeriod) {
    return `INV-${userId.substring(0, 5)}-${billingPeriod.replace(/\s/g, '-')}`;
}
/**
 * December 2025 and January 2026 were invoiced as one document.
 * Prefer that id when it exists; the single-month id is the fallback.
 */
function candidateInvoiceIds(userId, year, monthIndex) {
    const single = invoiceDocId(userId, manilaMonthLabel(year, monthIndex));
    if ((year === 2025 && monthIndex === 11) || (year === 2026 && monthIndex === 0)) {
        return [invoiceDocId(userId, 'December 2025 - January 2026'), single];
    }
    return [single];
}
function periodLabelFromText(text) {
    if (text.includes('December 2025 - January 2026'))
        return 'December 2025 - January 2026';
    const match = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/);
    return match ? `${match[1]} ${match[2]}` : null;
}
/** Manila window that an existing invoice actually covers. */
function windowForInvoice(invoice, year, monthIndex) {
    const label = invoice.billingPeriod || periodLabelFromText(invoice.description || '') || manilaMonthLabel(year, monthIndex);
    const parsed = billingRangeFromPeriodLabel(label);
    if (parsed) {
        return Object.assign(Object.assign({}, parsed), { billingPeriod: periodLabelFromText(label) || label });
    }
    const range = manilaMonthRange(year, monthIndex);
    return { start: range.start, end: range.end, monthsToBill: 1, billingPeriod: manilaMonthLabel(year, monthIndex) };
}
function billingRangeFromPeriodLabel(label) {
    if (label.includes('December 2025 - January 2026')) {
        return {
            start: manilaMonthRange(2025, 11).start,
            end: manilaMonthRange(2026, 0).end,
            monthsToBill: 2,
        };
    }
    const pretty = periodLabelFromText(label);
    if (!pretty)
        return null;
    const match = pretty.match(/^(\w+)\s+(\d{4})$/);
    if (!match)
        return null;
    const monthIndex = exports.MONTHS.indexOf(match[1]);
    if (monthIndex < 0)
        return null;
    const range = manilaMonthRange(Number(match[2]), monthIndex);
    return { start: range.start, end: range.end, monthsToBill: 1 };
}
/** Manila midnight of a calendar day, as a UTC instant. */
function manilaMidnightFromCalendarParts(year, monthIndex, day) {
    return new Date(Date.UTC(year, monthIndex, day) - MANILA_OFFSET_MS);
}
/**
 * Store the calendar day the user picked (local Y-M-D of the picker value)
 * as Manila midnight so the Manila day survives any browser timezone.
 */
function manilaCalendarDayIso(picked) {
    return manilaMidnightFromCalendarParts(picked.getFullYear(), picked.getMonth(), picked.getDate()).toISOString();
}
function deliveryInstant(stored) {
    if (!stored)
        return null;
    if (stored instanceof Date)
        return isNaN(stored.getTime()) ? null : stored;
    if (typeof stored === 'string' || typeof stored === 'number') {
        const parsed = new Date(stored);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof stored === 'object') {
        const maybe = stored;
        if (typeof maybe.toDate === 'function') {
            const parsed = maybe.toDate();
            return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : null;
        }
        if (typeof maybe.seconds === 'number')
            return new Date(maybe.seconds * 1000);
    }
    return null;
}
/** Local-midnight Date whose calendar day is the stored instant's Manila day. */
function datePickerValueForStoredDelivery(stored) {
    const instant = deliveryInstant(stored);
    if (!instant)
        return new Date();
    const parts = manilaParts(instant);
    return new Date(parts.year, parts.monthIndex, parts.day);
}
function isInRange(instant, start, end) {
    const time = instant.getTime();
    return time >= start.getTime() && time <= end.getTime();
}
function deliveriesInRange(deliveries, start, end) {
    return deliveries.filter((delivery) => {
        const instant = deliveryInstant(delivery.date);
        return instant ? isInRange(instant, start, end) : false;
    });
}
function deliveryLiters(delivery) {
    if (typeof delivery.liters === 'number' && !Number.isNaN(delivery.liters))
        return delivery.liters;
    return (delivery.volumeContainers || 0) * exports.CONTAINER_LITERS;
}
function roundMoney(amount) {
    const sign = amount < 0 ? -1 : 1;
    return (sign * Math.round((Math.abs(amount) + Number.EPSILON) * 100)) / 100;
}
/**
 * The monthly job never filtered on delivery status, so Pending and In Transit
 * count the same as Delivered.
 */
function countsTowardConsumption(delivery) {
    return delivery.status !== 'Cancelled';
}
/**
 * Money already stored on the delivery. Recomputes must use this and not the
 * customer's current plan price — deliveries through mid-May 2026 were ₱3/L.
 * `fallbackPricePerLiter` is only for a new invoice when a row has no amount.
 */
function deliveryBilledAmount(delivery, fallbackPricePerLiter) {
    if (!countsTowardConsumption(delivery))
        return 0;
    if (typeof delivery.amount === 'number' && Number.isFinite(delivery.amount))
        return delivery.amount;
    if (typeof fallbackPricePerLiter === 'number')
        return roundMoney(deliveryLiters(delivery) * fallbackPricePerLiter);
    return 0;
}
function storedConsumption(deliveries) {
    return roundMoney(deliveries.reduce((sum, delivery) => sum + deliveryBilledAmount(delivery), 0));
}
function consumptionCharge(deliveries, pricePerLiter) {
    return roundMoney(deliveries.reduce((sum, delivery) => sum + deliveryBilledAmount(delivery, pricePerLiter), 0));
}
function litersInRange(deliveries, start, end) {
    return deliveriesInRange(deliveries, start, end).reduce((sum, delivery) => sum + deliveryLiters(delivery), 0);
}
function sumCharges(charges) {
    return roundMoney((charges || []).reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0));
}
/**
 * Attach pending charges to the invoice being written, then clear them —
 * including charges that net to ₱0, which used to be copied onto every later invoice.
 * Nothing is cleared when no invoice is written.
 */
function applyPendingCharges(amount, description, pendingCharges) {
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
function equipmentMonthly(customPlanDetails) {
    if (!customPlanDetails)
        return 0;
    let cost = 0;
    if (customPlanDetails.gallonPaymentType === 'Monthly')
        cost += customPlanDetails.gallonPrice || 0;
    if (customPlanDetails.dispenserPaymentType === 'Monthly')
        cost += customPlanDetails.dispenserPrice || 0;
    return cost;
}
function oneTimeEquipment(customPlanDetails) {
    if (!customPlanDetails)
        return 0;
    let cost = 0;
    if (customPlanDetails.gallonPaymentType === 'One-Time')
        cost += customPlanDetails.gallonPrice || 0;
    if (customPlanDetails.dispenserPaymentType === 'One-Time')
        cost += customPlanDetails.dispenserPrice || 0;
    return cost;
}
exports.OPEN_INVOICE_STATUSES = ['Upcoming', 'Overdue', 'Covered by Parent Account', 'Pending Review'];
/** Live trigger will not create carry-overs for periods that start before this month. */
exports.DEFAULT_CARRYOVER_CUTOFF = '2026-06';
const MONTH_NAME_PATTERN = 'January|February|March|April|May|June|July|August|September|October|November|December';
function periodKeyFromInvoice(invoice) {
    const label = invoice.billingPeriod || periodLabelFromText(invoice.description || '') || '';
    if (label.includes('December 2025 - January 2026'))
        return '2025-12_2026-01';
    const named = label.match(new RegExp(`^(${MONTH_NAME_PATTERN})\\s+(\\d{4})$`));
    if (named) {
        const monthIndex = exports.MONTHS.indexOf(named[1]);
        return `${named[2]}-${String(monthIndex + 1).padStart(2, '0')}`;
    }
    const id = invoice.id || '';
    const combined = id.match(/-(\d{4})(\d{2})-(\d{4})(\d{2})$/);
    if (combined)
        return `${combined[1]}-${combined[2]}_${combined[3]}-${combined[4]}`;
    const numeric = id.match(/-(\d{4})(\d{2})$/);
    if (numeric)
        return `${numeric[1]}-${numeric[2]}`;
    const idNamed = id.match(new RegExp(`-(${MONTH_NAME_PATTERN})-(\\d{4})$`));
    if (idNamed) {
        const monthIndex = exports.MONTHS.indexOf(idNamed[1]);
        return `${idNamed[2]}-${String(monthIndex + 1).padStart(2, '0')}`;
    }
    return null;
}
function invoiceCoversMonth(invoice, year, monthIndex) {
    const key = periodKeyFromInvoice(invoice);
    if (!key)
        return false;
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    if (key === monthKey)
        return true;
    if (key.includes('_')) {
        const [start, end] = key.split('_');
        return monthKey === start || monthKey === end;
    }
    return false;
}
function periodStartsOnOrAfter(periodKey, cutoff = exports.DEFAULT_CARRYOVER_CUTOFF) {
    return periodKey.slice(0, 7) >= cutoff;
}
function labelForPeriodKey(periodKey) {
    if (periodKey === '2025-12_2026-01')
        return 'December 2025 - January 2026';
    const [year, month] = periodKey.split('-').map(Number);
    return manilaMonthLabel(year, month - 1);
}
function rangeForPeriodKey(periodKey) {
    if (periodKey === '2025-12_2026-01')
        return billingRangeFromPeriodLabel('December 2025 - January 2026');
    const match = periodKey.match(/^(\d{4})-(\d{2})$/);
    if (!match)
        return null;
    const range = manilaMonthRange(Number(match[1]), Number(match[2]) - 1);
    return { start: range.start, end: range.end, monthsToBill: 1 };
}
function chargeReferencesInvoice(charge, invoiceIds) {
    const text = `${charge.description || ''} ${charge.invoiceId || ''}`;
    for (const id of invoiceIds) {
        if (id && text.includes(id))
            return true;
    }
    return false;
}
/** Manual charges on the invoices, excluding deductions that point at another invoice in the same period. */
function periodAdjustments(invoices) {
    const ids = new Set(invoices.map((invoice) => invoice.id).filter(Boolean));
    let total = 0;
    for (const invoice of invoices) {
        for (const charge of invoice.manualCharges || []) {
            if (chargeReferencesInvoice(charge, ids))
                continue;
            total += Number(charge.amount) || 0;
        }
    }
    return roundMoney(total);
}
function groupInvoicesByPeriod(invoices) {
    const groups = new Map();
    for (const invoice of invoices) {
        const periodKey = periodKeyFromInvoice(invoice);
        if (!periodKey)
            continue;
        const list = groups.get(periodKey) || [];
        list.push(invoice);
        groups.set(periodKey, list);
    }
    return [...groups.entries()].map(([periodKey, grouped]) => ({ periodKey, invoices: grouped }));
}
function isNamedMonthInvoice(invoice) {
    return new RegExp(`-(${MONTH_NAME_PATTERN})-\\d{4}$`).test(invoice.id)
        || (invoice.id || '').includes('December-2025');
}
function chooseTargetInvoice(invoices, kind) {
    const pool = invoices.filter((invoice) => kind === 'open'
        ? exports.OPEN_INVOICE_STATUSES.includes(invoice.status)
        : invoice.status === 'Paid');
    if (pool.length === 0)
        return null;
    const named = pool.filter(isNamedMonthInvoice);
    const preferred = named.length > 0 ? named : pool;
    const nonzero = preferred.filter((invoice) => Math.abs(invoice.amount) > MONEY_EPS);
    return nonzero[0] || preferred[0];
}
/**
 * Compare one period's invoices, together, with the stored delivery amounts.
 * Early-payment invoices and ₱0 stubs are not reconciled on their own.
 * Plan one-time prices are not added just because the description mentions them.
 * Paid amounts are never changed. `allowCarryOver` is false for the live trigger
 * on periods before the cutoff; the backfill passes true.
 */
function reconcileInvoiceGroup(input) {
    const invoices = input.invoices.filter((invoice) => invoice && invoice.id && !invoice.id.startsWith('INV-EST'));
    const billingPeriod = input.billingPeriod;
    const allowCarryOver = input.allowCarryOver !== false;
    const emptySkip = (reason) => ({
        action: 'skip',
        reason,
        targetInvoiceId: null,
        expected: 0,
        billed: 0,
        result: { type: 'skip', reason },
    });
    if (invoices.length === 0)
        return emptySkip('no-invoice');
    const consumptionAmount = storedConsumption(input.deliveries);
    const adjustments = periodAdjustments(invoices);
    const expected = roundMoney(consumptionAmount + adjustments);
    const billed = roundMoney(invoices.reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0));
    const delta = roundMoney(expected - billed);
    const openTarget = chooseTargetInvoice(invoices, 'open');
    const paidTarget = chooseTargetInvoice(invoices, 'paid');
    if (openTarget && Math.abs(delta) >= MONEY_EPS) {
        const result = {
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
    const result = {
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
function reconcileMonthInvoice(input) {
    if (!input.invoice)
        return { type: 'skip', reason: 'no-invoice' };
    return reconcileInvoiceGroup({
        invoices: [input.invoice],
        deliveries: input.deliveries,
        billingPeriod: input.billingPeriod,
        allowCarryOver: input.allowCarryOver,
    }).result;
}
function billingSignature(delivery) {
    var _a, _b, _c, _d;
    if (!delivery)
        return null;
    const instant = deliveryInstant(delivery.date);
    return `${instant ? instant.toISOString() : ''}|${(_a = delivery.liters) !== null && _a !== void 0 ? _a : ''}|${(_b = delivery.volumeContainers) !== null && _b !== void 0 ? _b : ''}|${(_c = delivery.amount) !== null && _c !== void 0 ? _c : ''}|${(_d = delivery.status) !== null && _d !== void 0 ? _d : ''}`;
}
/** Calendar date in Asia/Manila, independent of the process timezone. */
function formatManilaDate(stored, pattern = 'long') {
    const instant = deliveryInstant(stored);
    if (!instant)
        return 'N/A';
    const parts = manilaParts(instant);
    const month = exports.MONTHS[parts.monthIndex];
    const shortMonth = month.slice(0, 3);
    return pattern === 'medium'
        ? `${shortMonth} ${parts.day}, ${parts.year}`
        : `${month} ${parts.day}, ${parts.year}`;
}
//# sourceMappingURL=billing-period.js.map