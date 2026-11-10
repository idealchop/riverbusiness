const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, describeChange, planInvoice } = require('../scripts/backfill-billing');

const PRICE = 3.3333333333333335;

const early = [
    { liters: 78, volumeContainers: 4 },
    { liters: 78, volumeContainers: 4 },
    { liters: 58.5, volumeContainers: 3 },
    { liters: 39, volumeContainers: 2 },
];
const late = [
    { liters: 78, volumeContainers: 4, date: '2026-10-23T16:00:00.000Z' },
    { liters: 39, volumeContainers: 2, date: '2026-10-27T16:00:00.000Z' },
];

test('backfill args default to a dry-run on (default)', () => {
    const args = parseArgs(['--month', '2026-10', '--month', '2026-06']);
    assert.equal(args.database, '(default)');
    assert.equal(args.apply, false);
    assert.equal(args.allMonths, false);
    assert.equal(args.user, null);
    assert.deepEqual(args.months.map((month) => month.key), ['2026-10', '2026-06']);
});

test('backfill args accept a named database, one user, and --apply', () => {
    const args = parseArgs(['--database', 'riverbusiness-dev', '--user', 'uid-1', '--all-months', '--apply']);
    assert.equal(args.database, 'riverbusiness-dev');
    assert.equal(args.user, 'uid-1');
    assert.equal(args.allMonths, true);
    assert.equal(args.apply, true);
    assert.throws(() => parseArgs(['--month', '2026-10', '--all-months']), /not both/);
    assert.throws(() => parseArgs(['--month', '2026-13']), /YYYY-MM/);
    assert.throws(() => parseArgs([]), /--month/);
});

test('backfill plans an unpaid month and is a no-op the second time', () => {
    const invoice = {
        id: 'INV-JlVJa-October-2026',
        amount: 845,
        status: 'Upcoming',
        description: 'Bill for October 2026',
        billingPeriod: 'October 2026',
    };
    const user = { plan: { price: PRICE, isConsumptionBased: true } };
    const first = planInvoice('uid', user, invoice, [...early, ...late]);
    assert.equal(first.change.kind, 'update-unpaid');
    assert.equal(first.change.oldAmount, 845);
    assert.equal(first.change.newAmount, 1235);
    assert.match(first.change.lines.join('\n'), /845\.00 -> 1235\.00/);

    const updated = {
        ...invoice,
        amount: first.change.newAmount,
        consumptionAmount: first.change.result.consumptionAmount,
        nonConsumptionAmount: first.change.result.nonConsumptionAmount,
    };
    const second = planInvoice('uid', user, updated, [...early, ...late]);
    assert.equal(second.change, null);
});

test('backfill never changes a Paid invoice amount and does not repeat the carry-over', () => {
    const invoice = {
        id: 'INV-JlVJa-October-2026',
        amount: 845,
        status: 'Paid',
        description: 'Bill for October 2026',
        billingPeriod: 'October 2026',
    };
    const user = { plan: { price: PRICE, isConsumptionBased: true } };
    const first = planInvoice('uid', user, invoice, [...early, ...late]);
    assert.equal(first.change.kind, 'flag-paid');
    assert.equal(first.change.oldAmount, 845);
    assert.equal(first.change.newAmount, 845);
    assert.match(first.change.lines.join('\n'), /unchanged/);
    assert.match(first.change.lines.join('\n'), /carry-over: carryover-INV-JlVJa-October-2026 390\.00/);

    assert.throws(
        () => describeChange('uid', invoice, { type: 'update-unpaid', amount: 1235, consumptionAmount: 1235, nonConsumptionAmount: 0, billingFlag: null }),
        /Refusing to change Paid invoice/,
    );

    const recorded = {
        ...invoice,
        billingFlag: first.change.result.billingFlag,
        unbilledAmount: first.change.result.unbilledAmount,
        carryOverAmount: first.change.result.carryOverAmount,
        carryOverChargeId: first.change.result.carryOverChargeId,
    };
    const second = planInvoice('uid', user, recorded, [...early, ...late]);
    assert.equal(second.change, null);
});
