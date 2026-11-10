'use strict';

/**
 * One-time billing backfill. Dry-run unless --apply is passed.
 * Does not change the amount on a Paid invoice.
 *
 * Usage (from functions/):
 *   npm run build
 *   node scripts/backfill-billing.js --month 2026-10
 *   node scripts/backfill-billing.js --month 2026-06 --month 2026-09 --user <uid>
 *   node scripts/backfill-billing.js --all-months --database riverbusiness-dev
 *   node scripts/backfill-billing.js --month 2026-10 --apply
 *
 * See docs/BILLING-BACKFILL.md. Do not point this at a database you have not
 * reviewed in dry-run first.
 */

const {
    groupInvoicesByPeriod,
    labelForPeriodKey,
    periodKeyFromInvoice,
    periodLabelFromText,
    rangeForPeriodKey,
    reconcileInvoiceGroup,
    reconcileMonthInvoice,
    windowForInvoice,
} = require('../lib/billing-period');

function parseArgs(argv) {
    const args = {
        database: '(default)',
        months: [],
        allMonths: false,
        user: null,
        apply: false,
        help: false,
    };
    const tokens = argv.slice();
    while (tokens.length > 0) {
        const token = tokens.shift();
        if (token === '--help' || token === '-h') {
            args.help = true;
        } else if (token === '--apply') {
            args.apply = true;
        } else if (token === '--all-months') {
            args.allMonths = true;
        } else if (token === '--database') {
            const value = tokens.shift();
            if (!value || value.startsWith('--')) throw new Error('--database requires a Firestore database id');
            args.database = value;
        } else if (token === '--user') {
            const value = tokens.shift();
            if (!value || value.startsWith('--')) throw new Error('--user requires a user id');
            args.user = value;
        } else if (token === '--month') {
            const value = tokens.shift();
            const parsed = parseMonth(value);
            if (!parsed) throw new Error('--month must be YYYY-MM');
            args.months.push(parsed);
        } else {
            throw new Error(`Unknown argument ${token}`);
        }
    }
    if (!args.help) {
        if (args.allMonths && args.months.length > 0) {
            throw new Error('Pass either --month or --all-months, not both');
        }
        if (!args.allMonths && args.months.length === 0) {
            throw new Error('Pass --month YYYY-MM (repeatable) or --all-months');
        }
    }
    return args;
}

function parseMonth(value) {
    if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
    const [year, month] = value.split('-').map(Number);
    return { year, monthIndex: month - 1, key: value };
}

function formatMoney(amount) {
    const number = Number(amount);
    if (!Number.isFinite(number)) return String(amount);
    return number.toFixed(2);
}

function showOptional(value) {
    return typeof value === 'number' && Number.isFinite(value) ? formatMoney(value) : '(none)';
}

/**
 * Turn a reconcile result into a printable plan.
 * Paid invoices never include an amount change. Returns null when nothing would be written.
 */
function describeChange(userId, invoice, result) {
    const invoicePath = `users/${userId}/payments/${invoice.id}`;
    const userPath = `users/${userId}`;
    if (!result || result.type === 'skip') return null;

    if (invoice.status === 'Paid' && result.type !== 'flag-paid') {
        throw new Error(`Refusing to change Paid invoice ${invoicePath}`);
    }

    if (result.type === 'update-unpaid') {
        return {
            invoicePath,
            userPath,
            kind: 'update-unpaid',
            oldAmount: invoice.amount,
            newAmount: result.amount,
            lines: [
                invoicePath,
                `  status: ${invoice.status}`,
                `  amount: ${formatMoney(invoice.amount)} -> ${formatMoney(result.amount)}`,
                `  consumptionAmount: ${showOptional(invoice.consumptionAmount)} -> ${formatMoney(result.consumptionAmount)}`,
                `  nonConsumptionAmount: ${showOptional(invoice.nonConsumptionAmount)} -> ${formatMoney(result.nonConsumptionAmount)}`,
                `  billingFlag: ${result.billingFlag || '(clear)'}`,
            ],
            result,
        };
    }

    if (result.type !== 'flag-paid') return null;

    const lines = [
        invoicePath,
        '  status: Paid',
        `  amount: ${formatMoney(invoice.amount)} (unchanged)`,
        `  billingFlag: ${result.billingFlag || '(clear)'}`,
        `  unbilledAmount: ${formatMoney(result.unbilledAmount)}`,
    ];
    if (result.pendingCharge) {
        lines.push(`  carry-over: ${result.pendingCharge.id} ${formatMoney(result.pendingCharge.amount)} on ${userPath}.pendingCharges`);
    } else if (result.removePendingChargeId) {
        lines.push(`  carry-over: remove ${result.removePendingChargeId} from ${userPath}.pendingCharges`);
    } else {
        lines.push('  carry-over: (none)');
    }
    return {
        invoicePath,
        userPath,
        kind: 'flag-paid',
        oldAmount: invoice.amount,
        newAmount: invoice.amount,
        lines,
        result,
    };
}

function nextPendingCharges(existing, result) {
    let next = Array.isArray(existing) ? existing.slice() : [];
    if (result.removePendingChargeId) {
        next = next.filter((charge) => charge.id !== result.removePendingChargeId);
    }
    if (result.pendingCharge) {
        next = next.filter((charge) => charge.id !== result.pendingCharge.id);
        next.push({ ...result.pendingCharge, dateAdded: new Date().toISOString() });
    }
    return next;
}

function invoicePeriodLabel(invoice) {
    return invoice.billingPeriod || periodLabelFromText(invoice.description || '') || '';
}

function fallbackMonth(invoice) {
    const label = invoicePeriodLabel(invoice);
    const match = label.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/);
    if (!match) return { year: 2026, monthIndex: 0 };
    const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return { year: Number(match[2]), monthIndex: names.indexOf(match[1]) };
}

function planInvoice(userId, user, invoice, deliveries) {
    const label = invoicePeriodLabel(invoice);
    if (!label) return { skipped: `users/${userId}/payments/${invoice.id} skipped: no billing period on the invoice` };
    const month = fallbackMonth(invoice);
    const window = windowForInvoice(invoice, month.year, month.monthIndex);
    const result = reconcileMonthInvoice({
        invoice,
        deliveries,
        billingPeriod: window.billingPeriod,
        allowCarryOver: true,
    });
    return { window, change: describeChange(userId, invoice, result) };
}

function periodSelected(periodKey, args) {
    if (args.allMonths) return true;
    return args.months.some((month) => {
        if (periodKey === month.key) return true;
        if (!periodKey.includes('_')) return false;
        const [start, end] = periodKey.split('_');
        return month.key === start || month.key === end;
    });
}

function planPeriod(userId, invoices, deliveries) {
    const groupedKey = periodKeyFromInvoice(invoices[0]);
    const plan = reconcileInvoiceGroup({
        invoices,
        deliveries,
        billingPeriod: groupedKey ? labelForPeriodKey(groupedKey) : invoices[0].id,
        allowCarryOver: true,
    });
    if (plan.action === 'skip' || plan.result.type === 'skip' || !plan.targetInvoiceId) {
        return { change: null, plan };
    }
    const target = invoices.find((invoice) => invoice.id === plan.targetInvoiceId) || invoices[0];
    if (target.status === 'Paid' && plan.result.type === 'update-unpaid') {
        throw new Error(`Refusing to change Paid invoice users/${userId}/payments/${target.id}`);
    }
    return { change: describeChange(userId, target, plan.result), plan, target };
}

function usage() {
    return [
        'One-time Manila billing backfill. Dry-run unless --apply is set.',
        'Paid invoice amounts are never changed; the gap is a carry-over charge.',
        '',
        '  node scripts/backfill-billing.js --month YYYY-MM [--month YYYY-MM ...] [--user UID] [--database ID] [--apply]',
        '  node scripts/backfill-billing.js --all-months [--user UID] [--database ID] [--apply]',
        '',
        '  --database     Firestore database id. Default: (default)',
        '  --month        Manila calendar month to correct. Repeatable. Looks up that month\'s invoice.',
        '  --all-months   Every INV- document on the selected users. Still one month query per invoice.',
        '  --user         Only this user id. Default: every non-admin consumption customer.',
        '  --apply        Write the planned changes. Omit this to print only.',
        '',
        'Run from functions/ after npm run build. Requires Application Default Credentials.',
        'Do not run against live data until a dry-run has been reviewed.',
    ].join('\n');
}

async function loadUsers(db, userId) {
    if (userId) {
        const snap = await db.collection('users').doc(userId).get();
        if (!snap.exists) throw new Error(`User ${userId} was not found`);
        return [snap];
    }
    const snap = await db.collection('users').get();
    return snap.docs;
}

async function loadInvoices(userRef) {
    const snap = await userRef.collection('payments').get();
    return snap.docs.filter((doc) => doc.id.startsWith('INV-') && !doc.id.startsWith('INV-EST'));
}

function shouldBillUser(user) {
    return !!user && user.role !== 'Admin' && !user.isPrepaid && !!user.plan?.isConsumptionBased;
}

async function applyChange(db, userRef, change) {
    const admin = require('firebase-admin');
    const targetId = change.result.pendingCharge?.invoiceId
        || (change.invoicePath || '').split('/').pop();
    await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const paymentsSnap = await tx.get(userRef.collection('payments'));
        if (!userSnap.exists) return;
        const user = userSnap.data();
        const invoices = paymentsSnap.docs
            .filter((doc) => doc.id.startsWith('INV-') && !doc.id.startsWith('INV-EST'))
            .map((doc) => ({ id: doc.id, ...doc.data() }));
        const group = groupInvoicesByPeriod(invoices).find((entry) => entry.invoices.some((invoice) => invoice.id === targetId));
        if (!group) return;
        const range = rangeForPeriodKey(group.periodKey);
        if (!range) return;
        const deliveriesSnap = await tx.get(userRef.collection('deliveries')
            .where('date', '>=', range.start.toISOString())
            .where('date', '<=', range.end.toISOString()));
        const fresh = planPeriod(userRef.id, group.invoices, deliveriesSnap.docs.map((doc) => doc.data()));
        if (!fresh.change || !fresh.target) return;
        if (fresh.target.status === 'Paid' && fresh.change.kind !== 'flag-paid') {
            throw new Error(`Refusing to change Paid invoice users/${userRef.id}/payments/${fresh.target.id}`);
        }
        if (fresh.target.status === 'Paid' && fresh.change.newAmount !== fresh.target.amount) {
            throw new Error(`Refusing to change Paid invoice users/${userRef.id}/payments/${fresh.target.id}`);
        }
        const invoiceRef = userRef.collection('payments').doc(fresh.target.id);
        const result = fresh.change.result;
        if (fresh.change.kind === 'flag-paid') {
            tx.update(invoiceRef, {
                unbilledAmount: result.unbilledAmount,
                carryOverAmount: result.carryOverAmount,
                lateDeliveryAdjustedAt: admin.firestore.FieldValue.serverTimestamp(),
                billingFlag: result.billingFlag ? result.billingFlag : admin.firestore.FieldValue.delete(),
                carryOverChargeId: result.carryOverChargeId ? result.carryOverChargeId : admin.firestore.FieldValue.delete(),
            });
            const existing = Array.isArray(user.pendingCharges) ? user.pendingCharges : [];
            const next = nextPendingCharges(existing, result);
            if (JSON.stringify(existing) !== JSON.stringify(next)) {
                tx.update(userRef, next.length === 0
                    ? { pendingCharges: admin.firestore.FieldValue.delete() }
                    : { pendingCharges: next });
            }
            return;
        }
        tx.update(invoiceRef, {
            amount: result.amount,
            consumptionAmount: result.consumptionAmount,
            nonConsumptionAmount: result.nonConsumptionAmount,
            lateDeliveryAdjustedAt: admin.firestore.FieldValue.serverTimestamp(),
            billingFlag: result.billingFlag ? result.billingFlag : admin.firestore.FieldValue.delete(),
        });
    });
}

async function main(argv) {
    const args = parseArgs(argv);
    if (args.help) {
        console.log(usage());
        return;
    }

    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp();
    const { getFirestore } = require('firebase-admin/firestore');
    const db = args.database === '(default)' ? getFirestore() : getFirestore(args.database);

    console.log(`database: ${args.database}`);
    console.log(args.apply ? 'mode: APPLY' : 'mode: DRY RUN (pass --apply to write)');
    if (args.user) console.log(`user: ${args.user}`);
    console.log(args.allMonths ? 'months: all invoiced months' : `months: ${args.months.map((month) => month.key).join(', ')}`);

    const users = await loadUsers(db, args.user);
    let planned = 0;
    let unchanged = 0;

    for (const userDoc of users) {
        const user = userDoc.data();
        if (!shouldBillUser(user)) {
            if (args.user) console.log(`users/${userDoc.id} skipped: not a consumption-plan customer`);
            continue;
        }
        const invoices = (await loadInvoices(userDoc.ref)).map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() }));
        for (const group of groupInvoicesByPeriod(invoices)) {
            if (!periodSelected(group.periodKey, args)) continue;
            const range = rangeForPeriodKey(group.periodKey);
            if (!range) {
                console.log(`users/${userDoc.id} period ${group.periodKey} skipped: no Manila window`);
                continue;
            }
            const deliveriesSnap = await userDoc.ref.collection('deliveries')
                .where('date', '>=', range.start.toISOString())
                .where('date', '<=', range.end.toISOString())
                .get();
            const plannedChange = planPeriod(userDoc.id, group.invoices, deliveriesSnap.docs.map((doc) => doc.data()));
            if (!plannedChange.change) {
                unchanged += 1;
                continue;
            }
            const target = plannedChange.target;
            if (target.status === 'Paid' && plannedChange.change.newAmount !== target.amount) {
                throw new Error(`Refusing to change Paid invoice users/${userDoc.id}/payments/${target.id}`);
            }
            planned += 1;
            console.log(plannedChange.change.lines.join('\n'));
            if (args.apply) {
                await applyChange(db, userDoc.ref, plannedChange.change);
                console.log('  wrote');
            }
        }
    }

    console.log(`planned: ${planned}`);
    console.log(`unchanged: ${unchanged}`);
    if (!args.apply && planned > 0) console.log('dry-run only; no documents were written');
}

if (require.main === module) {
    main(process.argv.slice(2)).catch((error) => {
        console.error(error.message || error);
        process.exit(1);
    });
}

module.exports = {
    parseArgs,
    describeChange,
    nextPendingCharges,
    planInvoice,
    planPeriod,
    usage,
};
