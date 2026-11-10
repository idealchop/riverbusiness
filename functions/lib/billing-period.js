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
exports.OPEN_INVOICE_STATUSES = exports.MONTHS = exports.CONTAINER_LITERS = exports.BILLING_CRON = exports.MANILA_TIME_ZONE = void 0;
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
exports.consumptionCharge = consumptionCharge;
exports.litersInRange = litersInRange;
exports.sumCharges = sumCharges;
exports.applyPendingCharges = applyPendingCharges;
exports.equipmentMonthly = equipmentMonthly;
exports.oneTimeEquipment = oneTimeEquipment;
exports.inferNonConsumption = inferNonConsumption;
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
function consumptionCharge(deliveries, pricePerLiter) {
    const liters = deliveries.reduce((sum, delivery) => sum + deliveryLiters(delivery), 0);
    return roundMoney(liters * pricePerLiter);
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
function inferNonConsumption(invoice, fees) {
    if (typeof invoice.nonConsumptionAmount === 'number' && !Number.isNaN(invoice.nonConsumptionAmount)) {
        return roundMoney(invoice.nonConsumptionAmount);
    }
    const manual = sumCharges(invoice.manualCharges);
    const oneTime = (invoice.description || '').includes('One-Time') ? fees.oneTime : 0;
    return roundMoney(manual + fees.equipment + oneTime);
}
/**
 * Decide how a month's deliveries affect an existing invoice.
 * Paid invoices are never rewritten. A positive gap becomes one carry-over
 * charge on the customer (idempotent by id) and a flag on the paid invoice.
 * Pending Review is still unpaid, so the amount is updated and flagged for the reviewer.
 */
function reconcileMonthInvoice(input) {
    const { invoice, deliveries, pricePerLiter, billingPeriod, fees } = input;
    if (!invoice)
        return { type: 'skip', reason: 'no-invoice' };
    const consumptionAmount = consumptionCharge(deliveries, pricePerLiter);
    const nonConsumptionAmount = inferNonConsumption(invoice, fees);
    const expected = roundMoney(consumptionAmount + nonConsumptionAmount);
    const open = exports.OPEN_INVOICE_STATUSES.includes(invoice.status);
    if (open) {
        const sameAmount = Math.abs(invoice.amount - expected) < MONEY_EPS;
        const sameConsumption = typeof invoice.consumptionAmount === 'number'
            && Math.abs(invoice.consumptionAmount - consumptionAmount) < MONEY_EPS;
        const sameNon = typeof invoice.nonConsumptionAmount === 'number'
            && Math.abs(invoice.nonConsumptionAmount - nonConsumptionAmount) < MONEY_EPS;
        if (sameAmount && sameConsumption && sameNon) {
            return { type: 'skip', reason: 'already-current' };
        }
        return {
            type: 'update-unpaid',
            amount: expected,
            consumptionAmount,
            nonConsumptionAmount,
            billingFlag: invoice.status === 'Pending Review' ? 'adjusted-during-review' : null,
        };
    }
    if (invoice.status !== 'Paid') {
        return { type: 'skip', reason: `status-${invoice.status}` };
    }
    const delta = roundMoney(expected - invoice.amount);
    const recorded = roundMoney(invoice.carryOverAmount || 0);
    if (delta <= MONEY_EPS) {
        if (!invoice.carryOverConsumed && recorded > MONEY_EPS && invoice.carryOverChargeId) {
            return {
                type: 'flag-paid',
                billingFlag: delta < -MONEY_EPS ? 'paid-invoice-exceeds-deliveries' : '',
                unbilledAmount: delta < -MONEY_EPS ? delta : 0,
                carryOverAmount: 0,
                carryOverChargeId: null,
                pendingCharge: null,
                removePendingChargeId: invoice.carryOverChargeId,
            };
        }
        if ((invoice.unbilledAmount || 0) > MONEY_EPS || invoice.billingFlag) {
            return {
                type: 'flag-paid',
                billingFlag: delta < -MONEY_EPS ? 'paid-invoice-exceeds-deliveries' : '',
                unbilledAmount: delta < -MONEY_EPS ? delta : 0,
                carryOverAmount: recorded,
                carryOverChargeId: invoice.carryOverChargeId || null,
                pendingCharge: null,
                removePendingChargeId: null,
            };
        }
        return { type: 'skip', reason: 'paid-in-balance' };
    }
    if (Math.abs(delta - recorded) < MONEY_EPS && invoice.carryOverChargeId) {
        return { type: 'skip', reason: 'carry-over-already-recorded' };
    }
    const alreadyConsumed = !!invoice.carryOverConsumed;
    const incremental = alreadyConsumed ? roundMoney(delta - recorded) : delta;
    if (incremental <= MONEY_EPS) {
        return { type: 'skip', reason: 'carry-over-already-recorded' };
    }
    const chargeId = alreadyConsumed
        ? `carryover-${invoice.id}-${recorded}`
        : (invoice.carryOverChargeId || `carryover-${invoice.id}`);
    return {
        type: 'flag-paid',
        billingFlag: 'unbilled-after-paid',
        unbilledAmount: delta,
        carryOverAmount: delta,
        carryOverChargeId: chargeId,
        removePendingChargeId: null,
        pendingCharge: {
            id: chargeId,
            description: `Carry-over from paid ${billingPeriod} invoice ${invoice.id}: Manila-month deliveries total ₱${expected.toFixed(2)} and the paid invoice is ₱${invoice.amount.toFixed(2)}.`,
            amount: incremental,
            kind: 'carryover',
            invoiceId: invoice.id,
            billingPeriod,
        },
    };
}
function billingSignature(delivery) {
    var _a, _b;
    if (!delivery)
        return null;
    const instant = deliveryInstant(delivery.date);
    return `${instant ? instant.toISOString() : ''}|${(_a = delivery.liters) !== null && _a !== void 0 ? _a : ''}|${(_b = delivery.volumeContainers) !== null && _b !== void 0 ? _b : ''}`;
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