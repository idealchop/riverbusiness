# Dev environment

River Business keeps the live app and a dev app in the same Firebase project (`studio-911553385-80027`).

| | Live | Dev |
| --- | --- | --- |
| App Hosting backend | `studio` (no environment name) | A second backend whose **environment name** is `dev` |
| Config file | `apphosting.yaml` | `apphosting.dev.yaml` merged over the base file |
| Firestore database | `(default)` | `riverbusiness-dev` |
| Cloud Functions | codebase `default`, original names | codebase `dev`, names prefixed with `dev_` |
| Auth and Storage | Shared | Shared |

Nothing in this setup renames or retargets the live functions. Live keeps using `(default)` as long as the variables below are unset.

## How the app chooses a database

The browser and the Next.js server read `NEXT_PUBLIC_FIRESTORE_DATABASE_ID`.

- Unset, blank, or `(default)`: the client calls `getFirestore(app)` with no database id. That is the live database.
- Any other value: the client calls `getFirestore(app, databaseId)`.

`apphosting.yaml` does not set the variable, so the live backend is unchanged. `apphosting.dev.yaml` sets it to `riverbusiness-dev` for backends whose environment name is `dev`.

Optional server-only fallback: `FIRESTORE_DATABASE_ID`. The browser ignores it. App Hosting dev does not need it, because `NEXT_PUBLIC_FIRESTORE_DATABASE_ID` is available on the server too.

There is no `firebase-admin` Firestore client in the Next.js app. All web reads and writes go through `initializeFirebase()` in `src/firebase/index.ts`.

### Other web env vars

| Variable | Live | Dev (`apphosting.dev.yaml`) |
| --- | --- | --- |
| `NEXT_PUBLIC_FIRESTORE_DATABASE_ID` | unset | `riverbusiness-dev` |
| `NEXT_PUBLIC_APP_ENV` | unset (no badge) | `dev` (small **DEV** badge, bottom-right) |
| `NEXT_PUBLIC_FUNCTIONS_PREFIX` | unset (callable names unchanged) | `dev` |

`NEXT_PUBLIC_FUNCTIONS_PREFIX` only changes the callable names used for workspace file upload (`createWorkspaceFileUpload`, `finalizeWorkspaceFileUpload`). Those dev copies read the dev user directory. Firestore triggers and scheduled jobs are not called by the web app.

## Cloud Functions

`firebase.json` deploys two codebases:

- `functions/` is codebase `default`. `src/functions` is not deployed.
- `functions-dev/` is codebase `dev`. Its entry sets `RB_FUNCTIONS_CODEBASE=dev` and then loads a copy of the compiled `functions` bundle.

The shared bundle checks that sentinel at load time:

- Sentinel unset (live): database id is `(default)`, `getFirestore()` is called with no id, trigger definitions omit `database`, and export names are unchanged. `onfileupload` is included.
- Sentinel set (dev): database id is `FIRESTORE_DATABASE_ID` or `riverbusiness-dev`, Firestore triggers set `database` to that id, and every deployed function is exported as `dev_<name>`. `onfileupload` is not deployed, because Storage is shared and a second storage trigger would also run on live uploads.

You do not set these in the Firebase console. `functions-dev/index.js` sets them before the bundle loads:

| Variable | Set by the dev entry | Live |
| --- | --- | --- |
| `RB_FUNCTIONS_CODEBASE` | `dev` | unset |
| `FIRESTORE_DATABASE_ID` | `riverbusiness-dev` | ignored |
| `RB_FUNCTION_PREFIX` | `dev` | ignored |

Dev function names (same handlers, different database):

- `dev_generateMonthlyInvoices` (monthly schedule)
- `dev_notifyStationsOfUpcomingRefills` (daily schedule)
- `dev_onuserupdate`
- `dev_onpaymentremindercreate`
- `dev_onmanualreceiptcreate`
- `dev_onpaysliprequestcreate`
- `dev_onunclaimedprofilecreate`
- `dev_onunclaimedemployeecreate`
- `dev_ondeliverycreate`
- `dev_ondeliveryupdate`
- `dev_onleavestatusupdate`
- `dev_onpaymentupdate`
- `dev_ontopuprequestupdate`
- `dev_onrefillrequestcreate`
- `dev_onrefillrequestupdate`
- `dev_createWorkspaceFileUpload`
- `dev_finalizeWorkspaceFileUpload`

Live names stay `generateMonthlyInvoices`, `onuserupdate`, `onfileupload`, and the rest.

## Commands

Run these from the repository root. Do not deploy until the named database exists.

Build:

```bash
cd functions && npm run build
```

Live functions only (does not create or update the dev copy):

```bash
firebase deploy --only functions:default
```

Dev functions only (does not rename or update the live functions):

```bash
firebase deploy --only functions:dev
```

`functions:dev` builds `functions/`, copies `functions/lib` into `functions-dev/lib/shared`, then deploys the dev codebase. The dev functions reuse the existing project secret `BREVO_API_KEY`.

Rules and indexes for the dev database only:

```bash
firebase deploy --only firestore:riverbusiness-dev
```

That deploys both `firestore.rules` and `firestore.indexes.json` to `riverbusiness-dev`.

Rules and indexes for every database configured in `firebase.json` (`(default)` and `riverbusiness-dev`):

```bash
firebase deploy --only firestore
```

Rules only, for every configured database (this includes live):

```bash
firebase deploy --only firestore:rules
```

Indexes only, for every configured database (this includes live):

```bash
firebase deploy --only firestore:indexes
```

`npm run deploy:functions` deploys `functions:default`. `npm run deploy:functions:dev` deploys the dev copy. `npm run deploy:rules:dev` deploys rules and indexes to `riverbusiness-dev`.

`firebase deploy --only functions` (no codebase) deploys **both** codebases. Use `functions:default` when you mean live only. Both codebases run on the `nodejs22` runtime (`engines.node` is `22`).

## Local app against dev

The dev server reads `.env.local`. That file is gitignored. Create it at the repo root:

```bash
NEXT_PUBLIC_FIRESTORE_DATABASE_ID=riverbusiness-dev
NEXT_PUBLIC_APP_ENV=dev
NEXT_PUBLIC_FUNCTIONS_PREFIX=dev
```

Then:

```bash
npm run dev
```

The app runs at port 9002 and shows the DEV badge. Auth still uses the shared project, so sign in with a dev user (or a user you accept sharing with live). Firestore traffic goes to `riverbusiness-dev`.

To run locally against live data, omit those variables. That is the same behavior as today.

## Firebase console

Do this once. Do not change the live `studio` backend or the `(default)` database.

1. Create a Firestore database named `riverbusiness-dev` in the **same location** as `(default)`. Live functions do not set a region, so they deploy in `us-central1`. The dev copy uses that same default region. A database in another location will reject those triggers.
2. Create a second App Hosting backend for this repo. Set its **environment name** to `dev`. The backend id can be anything; the environment name is what selects `apphosting.dev.yaml`. Leave the `studio` backend without that environment.
3. Add the dev site's domain under Authentication → Settings → Authorized domains. Auth is shared, so the new host must be listed or sign-in fails.
4. Deploy rules and indexes to `riverbusiness-dev` before using the dev site. A new database denies client access until its rules are published.
5. Deploy `functions:dev`. The first deploy may ask you to grant the existing `BREVO_API_KEY` secret to the new functions. There is no new secret name.
6. The functions runtime service account already used by live needs access to the named database. Project-level Cloud Datastore access covers it. If a dev function logs `PERMISSION_DENIED` on Firestore, grant that service account Cloud Datastore User. Do not change live function names or the `(default)` database to fix that.

## Shared Auth and Storage

Auth users and the Storage bucket are still the live ones.

- `dev_onuserupdate` writes email changes and workspace claims to the shared Auth user. A dev profile that uses a real uid can change that person's live login.
- `onfileupload` stays live-only. Profile and payment uploads in the shared bucket are still applied to `(default)` by the live function.
- Dev schedules and mail triggers send real email through the shared Brevo key when a dev document contains a real address. Keep dev data fake, or expect those messages to go out.

## Billing backfill

Invoice corrections for Manila months are a separate one-time script, dry-run by default. Pass `--database riverbusiness-dev` to target the dev database, or omit it to target `(default)`. See [BILLING-BACKFILL.md](BILLING-BACKFILL.md). Do not apply it to live data until the dry-run output has been reviewed.

## What is not deployed

`src/functions` is an older copy. `firebase.json` does not reference it. Only `functions/` (live) and `functions-dev/` (dev) are deployed.
