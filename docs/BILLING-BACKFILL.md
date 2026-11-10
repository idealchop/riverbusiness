# Billing backfill

One-time correction for consumption invoices that were generated before Manila month bounds and late-delivery updates. The script uses the same rules as `syncDeliveryBilling`.

It is dry-run unless you pass `--apply`. A dry-run prints each planned write: document path, old amount, new amount, and any carry-over. It does not change a **Paid** invoice amount. The gap on a paid invoice is a single `pendingCharges` entry (`kind: 'carryover'`). Running it again after a successful apply prints no further changes for those invoices.

The script does not scan a customer's whole delivery history. Each invoice is matched to one Manila month (or the December 2025–January 2026 combined window) and that range is queried.

Do not run it until you have reviewed a dry-run. This repository change does not execute the script.

## Setup

From `functions/`, with Application Default Credentials that can read the target database (and write, if you pass `--apply`):

```bash
cd functions
npm run build
```

## Usage

```bash
node scripts/backfill-billing.js --month 2026-10
node scripts/backfill-billing.js --month 2026-06 --month 2026-09 --month 2026-10 --user USER_ID
node scripts/backfill-billing.js --all-months --database '(default)'
node scripts/backfill-billing.js --month 2026-10 --database riverbusiness-dev --apply
```

| Flag | Meaning |
| --- | --- |
| `--database` | Firestore database id. Default `(default)` (live). Use `riverbusiness-dev` for the dev database. |
| `--month YYYY-MM` | Manila calendar month. Repeat the flag for more than one month. The script loads that month's invoice id (and the combined Dec 2025–Jan 2026 invoice when the month is one of those). |
| `--all-months` | Every `INV-` document on the selected users. Cannot be combined with `--month`. |
| `--user` | One user id. Omit it to walk every non-admin consumption customer. |
| `--apply` | Write the planned changes. Without this flag nothing is written. |

`--month` and `--all-months` are required as a choice: the script will not guess a range.

## What a write does

- **Upcoming, Overdue, Pending Review, Covered by Parent Account:** set `amount` to the Manila-month consumption plus the non-consumption portion already implied by the invoice (stored `nonConsumptionAmount`, or manual charges plus current equipment and one-time fees). Store `consumptionAmount` and `nonConsumptionAmount`.
- **Paid:** leave `amount` as it is. Set `billingFlag` to `unbilled-after-paid` and `unbilledAmount` when the month is higher than the paid total, and upsert one carry-over charge. A second run sees `carryOverAmount` and does not add another charge.

Known live gaps this is meant to correct, after you review the dry-run:

- Fox Chemicals October 2026 (`Upcoming` ₱845 → ₱1,235).
- Fox June 2026 (`Paid` ₱845 stays ₱845; carry ₱325).
- NEW BIG 4 J September 2026 (`Upcoming` ₱1,950 → ₱2,600).
