const test = require('node:test');
const assert = require('node:assert/strict');
const { reconcileInvoiceGroup, storedConsumption } = require('../lib/billing-period');

const OLD = 58.5;
const NEW = 65;

function containers(count, unit, status = 'Delivered') {
    return { volumeContainers: count, liters: count * 19.5, amount: count * unit, status };
}

test('recompute uses stored delivery amounts, not the current plan price', () => {
    const deliveries = [containers(30, OLD)];
    assert.equal(storedConsumption(deliveries), 1755);
    assert.equal(30 * NEW, 1950);

    const result = reconcileInvoiceGroup({
        invoices: [{
            id: 'INV-5Varb-March-2026',
            amount: 1755,
            status: 'Paid',
            description: 'Bill for March 2026',
            billingPeriod: 'March 2026',
        }],
        deliveries,
        billingPeriod: 'March 2026',
        allowCarryOver: true,
    });

    assert.equal(result.action, 'skip');
    assert.equal(result.reason, 'already-current');
    assert.equal(result.billed, 1755);
    assert.equal(result.expected, 1755);
});

test('early-payment invoice and the month invoice are one bill', () => {
    const deliveries = [containers(30, NEW)];
    const early = {
        id: 'INV-5Varb-202605',
        amount: 585,
        status: 'Paid',
        description: 'Early payment May 2026',
        billingPeriod: 'May 2026',
    };
    const month = {
        id: 'INV-5Varb-May-2026',
        amount: 1365,
        status: 'Paid',
        description: 'Bill for May 2026',
        billingPeriod: 'May 2026',
        manualCharges: [{ id: 'ep', description: 'Early Payment (INV-5Varb-202605)', amount: -585 }],
    };

    const together = reconcileInvoiceGroup({
        invoices: [early, month],
        deliveries,
        billingPeriod: 'May 2026',
        allowCarryOver: true,
    });
    assert.equal(together.action, 'skip');
    assert.equal(together.billed, 1950);
    assert.equal(together.expected, 1950);

    const earlyAlone = reconcileInvoiceGroup({
        invoices: [early],
        deliveries,
        billingPeriod: 'May 2026',
        allowCarryOver: true,
    });
    assert.equal(earlyAlone.action, 'flag-paid');
    assert.equal(earlyAlone.result.type, 'flag-paid');
    assert.equal(earlyAlone.result.unbilledAmount, 1365);
});

test('a zero stub is not billed again beside the real invoice', () => {
    const deliveries = [containers(20, NEW)];
    const result = reconcileInvoiceGroup({
        invoices: [
            { id: 'INV-JlVJa-202607', amount: 0, status: 'Paid', billingPeriod: 'July 2026' },
            { id: 'INV-JlVJa-July-2026', amount: 1300, status: 'Paid', description: 'Bill for July 2026', billingPeriod: 'July 2026' },
        ],
        deliveries,
        billingPeriod: 'July 2026',
        allowCarryOver: true,
    });
    assert.equal(result.action, 'skip');
    assert.equal(result.billed, 1300);
    assert.equal(result.expected, 1300);
});

test('one-time wording does not add the plan dispenser price', () => {
    const deliveries = [containers(21, OLD)];
    assert.equal(storedConsumption(deliveries), 1228.5);
    const result = reconcileInvoiceGroup({
        invoices: [{
            id: 'INV-JlVJa-February-2026',
            amount: 1228.5,
            status: 'Paid',
            description: 'Bill for February 2026 + One-Time Fees',
            billingPeriod: 'February 2026',
            manualCharges: [],
        }],
        deliveries,
        billingPeriod: 'February 2026',
        allowCarryOver: true,
    });
    assert.equal(result.action, 'skip');
    assert.equal(result.expected, 1228.5);
});

test('a coverage deduction stays on the invoice and is not billed again', () => {
    const result = reconcileInvoiceGroup({
        invoices: [{
            id: 'INV-5Varb-April-2026',
            amount: 800,
            status: 'Paid',
            description: 'Bill for April 2026',
            billingPeriod: 'April 2026',
            manualCharges: [{ id: 'cov', description: 'April consumption coverage', amount: -200 }],
        }],
        deliveries: [containers(1, 1000)],
        billingPeriod: 'April 2026',
        allowCarryOver: true,
    });
    assert.equal(result.expected, 800);
    assert.equal(result.action, 'skip');
});

test('Pending deliveries are included, matching the monthly job', () => {
    const result = reconcileInvoiceGroup({
        invoices: [{
            id: 'INV-JlVJa-October-2026',
            amount: 65,
            status: 'Upcoming',
            description: 'Bill for October 2026',
            billingPeriod: 'October 2026',
        }],
        deliveries: [
            containers(1, NEW, 'Delivered'),
            containers(1, NEW, 'Pending'),
        ],
        billingPeriod: 'October 2026',
    });
    assert.equal(result.action, 'update-unpaid');
    assert.equal(result.result.amount, 130);
});

test('live dry-run shapes: only real gaps, and May is a 585 carry-over not 650', () => {
    const cases = [
        {
            name: 'fox-october',
            invoices: [{ id: 'INV-JlVJa-October-2026', amount: 845, status: 'Upcoming', billingPeriod: 'October 2026', description: 'Bill for October 2026' }],
            deliveries: [containers(13, NEW), containers(6, NEW)],
            allowCarryOver: true,
        },
        {
            name: 'fox-june',
            invoices: [{ id: 'INV-JlVJa-June-2026', amount: 845, status: 'Paid', billingPeriod: 'June 2026', description: 'Bill for June 2026' }],
            deliveries: [containers(13, NEW), containers(5, NEW)],
            allowCarryOver: true,
        },
        {
            name: 'big4-september',
            invoices: [{ id: 'INV-eJRfs-September-2026', amount: 1950, status: 'Upcoming', billingPeriod: 'September 2026', description: 'Bill for September 2026' }],
            deliveries: [containers(40, NEW)],
            allowCarryOver: true,
        },
        {
            name: 'big4-may',
            invoices: [{ id: 'INV-eJRfs-May-2026', amount: 1950, status: 'Paid', billingPeriod: 'May 2026', description: 'Bill for May 2026' }],
            deliveries: [containers(30, NEW), containers(10, OLD)],
            allowCarryOver: true,
        },
        {
            name: 'big4-may-trigger',
            invoices: [{ id: 'INV-eJRfs-May-2026', amount: 1950, status: 'Paid', billingPeriod: 'May 2026', description: 'Bill for May 2026' }],
            deliveries: [containers(30, NEW), containers(10, OLD)],
            allowCarryOver: false,
        },
    ];

    const plans = Object.fromEntries(cases.map((entry) => [entry.name, reconcileInvoiceGroup({
        invoices: entry.invoices,
        deliveries: entry.deliveries,
        billingPeriod: entry.invoices[0].billingPeriod,
        allowCarryOver: entry.allowCarryOver,
    })]));

    assert.equal(plans['fox-october'].action, 'update-unpaid');
    assert.equal(plans['fox-october'].result.amount, 1235);
    assert.equal(storedConsumption(cases[0].deliveries), 1235);

    assert.equal(plans['fox-june'].action, 'flag-paid');
    assert.equal(plans['fox-june'].result.unbilledAmount, 325);
    assert.equal(plans['fox-june'].result.type === 'flag-paid' && plans['fox-june'].result.pendingCharge.amount, 325);

    assert.equal(plans['big4-september'].action, 'update-unpaid');
    assert.equal(plans['big4-september'].result.amount, 2600);

    assert.equal(storedConsumption(cases[3].deliveries), 2535);
    assert.equal(plans['big4-may'].action, 'flag-paid');
    assert.equal(plans['big4-may'].result.unbilledAmount, 585);
    assert.notEqual(plans['big4-may'].result.unbilledAmount, 650);

    assert.equal(plans['big4-may-trigger'].action, 'skip');
    assert.equal(plans['big4-may-trigger'].reason, 'carry-over-before-cutoff');
});
