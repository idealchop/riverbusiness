/** Live Firestore database id. Unset configuration selects this database. */
export const DEFAULT_FIRESTORE_DATABASE_ID = "(default)";

/**
 * Firestore database id for the Next.js app.
 * Unset, blank, or "(default)" returns undefined so callers keep the SDK default.
 *
 * NEXT_PUBLIC_FIRESTORE_DATABASE_ID is read by the browser and by Next.js server
 * code. FIRESTORE_DATABASE_ID is an optional server-only fallback and is ignored
 * in the browser.
 */
export function configuredFirestoreDatabaseId(): string | undefined {
  const fromPublic = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID?.trim();
  const fromServer =
    typeof window === "undefined" ? readServerDatabaseId() : undefined;
  const raw = (fromPublic || fromServer || "").trim();
  if (!raw || raw === DEFAULT_FIRESTORE_DATABASE_ID) return undefined;
  return raw;
}

function readServerDatabaseId(): string | undefined {
  const value = process.env["FIRESTORE_DATABASE_ID"];
  return typeof value === "string" ? value.trim() : undefined;
}

/** True only when the dev App Hosting environment (or a local .env.local) says so. */
export function isDevAppEnvironment(): boolean {
  return (process.env.NEXT_PUBLIC_APP_ENV || "").trim().toLowerCase() === "dev";
}

/**
 * Callable function name. Unset prefix keeps the live function name.
 * The dev site sets NEXT_PUBLIC_FUNCTIONS_PREFIX=dev.
 */
export function cloudFunctionName(baseName: string): string {
  const prefix = (process.env.NEXT_PUBLIC_FUNCTIONS_PREFIX || "").trim();
  if (!prefix) return baseName;
  return `${prefix}_${baseName}`;
}
