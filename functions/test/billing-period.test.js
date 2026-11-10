const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
    applyPendingCharges,
    billingWindowForRun,
    consumptionCharge,
    datePickerValueForStoredDelivery,
    formatManilaDate,
    isInRange,
    manilaCalendarDayIso,
    manilaMonthRange,
    reconcileMonthInvoice,
} = require('../lib/billing-period');

const PRICE = 3.3333333333333335;

const octoberEarly = [
    { id: 'D-620154', date: '2026-10-04T16:00:00.000Z', liters: 78, volumeContainers: 4, amount: 260, status: 'Delivered' },
    { id: 'D-382699', date: '2026-10-11T16:00:00.000Z', liters: 78, volumeContainers: 4, amount: 260, status: 'Delivered' },
    { id: 'D-423489', date: '2026-10-14T16:00:00.000Z', liters: 58.5, volumeContainers: 3, amount: 195, status: 'Delivered' },
    { id: 'D-439855', date: '2026-10-19T11:13:59.855Z', liters: 39, volumeContainers: 2, amount: 130, status: 'Delivered' },
];
const octoberLate = [
    { id: 'D-865722', date: '2026-10-23T16:00:00.000Z', liters: 78, volumeContainers: 4, amount: 260, status: 'Delivered' },
    { id: 'D-888317', date: '2026-10-27T16:00:00.000Z', liters: 39, volumeContainers: 2, amount: 130, status: 'Delivered' },
];

test('client and functions billing calendars stay identical', () => {
    const functionsCopy = fs.readFileSync(path.join(__dirname, '../src/billing-period.ts'), 'utf8');
    const clientCopy = fs.readFileSync(path.join(__dirname, '../../src/lib/billing-period.ts'), 'utf8');
    assert.equal(functionsCopy, clientCopy);
});

test('a delivery entered after invoice generation is added to an unpaid month', () => {
    const billed = consumptionCharge(octoberEarly, PRICE);
    assert.equal(billed, 845);

    const invoice = {
        id: 'INV-JlVJa-October-2026',
        amount: billed,
        status: 'Upcoming',
        description: 'Bill for October 2026',
        manualCharges: [
            { id: 'a', amount: -60 },
            { id: 'b', amount: -60 },
            { id: 'c', amount: -60 },
            { id: 'd', amount: 180 },
            { id: 'e', amount: 0 },
        ],
    };

    const result = reconcileMonthInvoice({
        invoice,
        deliveries: [...octoberEarly, ...octoberLate],
        pricePerLiter: PRICE,
        billingPeriod: 'October 2026',
        fees: { equipment: 0, oneTime: 0 },
    });

    assert.equal(result.type, 'update-unpaid');
    assert.equal(result.amount, 1235);
    assert.equal(result.consumptionAmount, 1235);
    assert.equal(result.nonConsumptionAmount, 0);

    const again = reconcileMonthInvoice({
        invoice: {
            ...invoice,
            amount: result.amount,
            consumptionAmount: result.consumptionAmount,
            nonConsumptionAmount: result.nonConsumptionAmount,
        },
        deliveries: [...octoberEarly, ...octoberLate],
        pricePerLiter: PRICE,
        billingPeriod: 'October 2026',
        fees: { equipment: 0, oneTime: 0 },
    });
    assert.equal(again.type, 'skip');
});

test('a delivery entered into a paid month is a carry-over and does not change the invoice', () => {
    const invoice = {
        id: 'INV-JlVJa-October-2026',
        amount: 845,
        status: 'Paid',
        description: 'Bill for October 2026',
    };

    const result = reconcileMonthInvoice({
        invoice,
        deliveries: [...octoberEarly, ...octoberLate],
        pricePerLiter: PRICE,
        billingPeriod: 'October 2026',
        fees: { equipment: 0, oneTime: 0 },
    });

    assert.equal(result.type, 'flag-paid');
    assert.equal(result.billingFlag, 'unbilled-after-paid');
    assert.equal(result.unbilledAmount, 390);
    assert.equal(result.pendingCharge.amount, 390);
    assert.equal(result.pendingCharge.kind, 'carryover');
    assert.equal(result.pendingCharge.invoiceId, invoice.id);
    assert.equal(Object.hasOwn(result, 'amount'), false);

    const recorded = reconcileMonthInvoice({
        invoice: {
            ...invoice,
            billingFlag: result.billingFlag,
            unbilledAmount: result.unbilledAmount,
            carryOverAmount: result.carryOverAmount,
            carryOverChargeId: result.carryOverChargeId,
        },
        deliveries: [...octoberEarly, ...octoberLate],
        pricePerLiter: PRICE,
        billingPeriod: 'October 2026',
        fees: { equipment: 0, oneTime: 0 },
    });
    assert.equal(recorded.type, 'skip');
    assert.equal(recorded.reason, 'carry-over-already-recorded');
});

test('a Manila midnight delivery on the 1st stays in that Manila month', () => {
    const june1Manila = '2026-05-31T16:00:00.000Z';
    const picked = new Date(2026, 5, 1, 0, 0, 0);
    assert.equal(manilaCalendarDayIso(picked), june1Manila);
    assert.equal(formatManilaDate(june1Manila), 'June 1, 2026');

    const picker = datePickerValueForStoredDelivery(june1Manila);
    assert.equal(picker.getFullYear(), 2026);
    assert.equal(picker.getMonth(), 5);
    assert.equal(picker.getDate(), 1);
    assert.equal(manilaCalendarDayIso(picker), june1Manila);

    const job = billingWindowForRun(new Date('2026-07-01T00:00:00+08:00'));
    assert.equal(job.billingPeriod, 'June 2026');
    assert.equal(job.start.toISOString(), '2026-05-31T16:00:00.000Z');
    assert.equal(isInRange(new Date(june1Manila), job.start, job.end), true);

    const may = manilaMonthRange(2026, 4);
    assert.equal(isInRange(new Date(june1Manila), may.start, may.end), false);

    const missed = { liters: 97.5, volumeContainers: 5, amount: 325, date: june1Manila, status: 'Delivered' };
    const paid = reconcileMonthInvoice({
        invoice: {
            id: 'INV-JlVJa-June-2026',
            amount: 845,
            status: 'Paid',
            description: 'Bill for June 2026',
            billingPeriod: 'June 2026',
        },
        deliveries: [
            { liters: 253.5, volumeContainers: 13, amount: 845, status: 'Delivered' },
            missed,
        ],
        pricePerLiter: PRICE,
        billingPeriod: 'June 2026',
        fees: { equipment: 0, oneTime: 0 },
    });
    assert.equal(paid.type, 'flag-paid');
    assert.equal(paid.unbilledAmount, 325);
    assert.equal(paid.pendingCharge.amount, 325);
});

test('month-end 11:59 PM Manila is in the month and the next midnight is not', () => {
    const june = manilaMonthRange(2026, 5);
    const monthEnd = new Date('2026-06-30T15:59:00.000Z');
    const nextMidnight = new Date('2026-06-30T16:00:00.000Z');

    assert.equal(formatManilaDate(monthEnd), 'June 30, 2026');
    assert.equal(isInRange(monthEnd, june.start, june.end), true);
    assert.equal(formatManilaDate(nextMidnight), 'July 1, 2026');
    assert.equal(isInRange(nextMidnight, june.start, june.end), false);

    const july = manilaMonthRange(2026, 6);
    assert.equal(july.start.toISOString(), '2026-06-30T16:00:00.000Z');
    assert.equal(isInRange(nextMidnight, july.start, july.end), true);
    assert.equal(isInRange(monthEnd, july.start, july.end), false);

    const novemberJob = billingWindowForRun(new Date('2026-11-01T00:00:00+08:00'));
    assert.equal(novemberJob.skip, false);
    assert.equal(novemberJob.billingPeriod, 'October 2026');
    assert.equal(novemberJob.start.toISOString(), '2026-09-30T16:00:00.000Z');
    assert.equal(novemberJob.end.toISOString(), '2026-10-31T15:59:59.999Z');
    assert.equal(isInRange(new Date('2026-09-30T16:00:00.000Z'), novemberJob.start, novemberJob.end), true);
    assert.equal(isInRange(new Date('2026-10-31T16:00:00.000Z'), novemberJob.start, novemberJob.end), false);
});

test('zero-net pending charges are copied once and then cleared', () => {
    const charges = [
        { id: 'a', description: 'Discount', amount: -60 },
        { id: 'b', description: 'Discount', amount: -60 },
        { id: 'c', description: 'Discount', amount: -60 },
        { id: 'd', description: 'P5 / Gallons Increased', amount: 180 },
        { id: 'e', description: 'Security', amount: 0 },
    ];
    const applied = applyPendingCharges(845, 'Bill for October 2026', charges);
    assert.equal(applied.amount, 845);
    assert.equal(applied.description, 'Bill for October 2026');
    assert.equal(applied.clearPending, true);
    assert.equal(applied.manualCharges.length, 5);

    const empty = applyPendingCharges(845, 'Bill for November 2026', []);
    assert.equal(empty.clearPending, false);
    assert.equal(empty.manualCharges.length, 0);

    const noInvoice = applyPendingCharges(0, 'Bill for November 2026', charges);
    assert.equal(noInvoice.clearPending, false);
});
