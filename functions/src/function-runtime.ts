import { getFirestore, type Firestore } from "firebase-admin/firestore";

/** Live Firestore database. Matches the Admin SDK default when no id is passed. */
export const DEFAULT_FIRESTORE_DATABASE_ID = "(default)";

/** Named database used by the dev functions codebase. */
export const DEV_FIRESTORE_DATABASE_ID = "riverbusiness-dev";

/** Export-name prefix for the dev copy so live function names stay unchanged. */
export const DEV_FUNCTION_PREFIX = "dev";

/**
 * Set only by functions-dev/index.js before the shared bundle is loaded.
 * Live deploys load functions/lib/index.js directly and never set this.
 */
export function isDevFunctionsCodebase(): boolean {
  return process.env.RB_FUNCTIONS_CODEBASE === "dev";
}

/** Database these functions read and write. Live is always (default). */
export function activeDatabaseId(): string {
  if (!isDevFunctionsCodebase()) return DEFAULT_FIRESTORE_DATABASE_ID;
  const configured = (process.env.FIRESTORE_DATABASE_ID || "").trim();
  return configured || DEV_FIRESTORE_DATABASE_ID;
}

/** Empty on live, so export names stay exactly as they are today. */
export function devFunctionPrefix(): string {
  if (!isDevFunctionsCodebase()) return "";
  const configured = (process.env.RB_FUNCTION_PREFIX || DEV_FUNCTION_PREFIX).trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(configured)) {
    throw new Error(
      `RB_FUNCTION_PREFIX "${configured}" must start with a letter and contain only letters, numbers, and underscores.`
    );
  }
  return configured;
}

export function exportName(baseName: string): string {
  const prefix = devFunctionPrefix();
  return prefix ? `${prefix}_${baseName}` : baseName;
}

/**
 * Admin Firestore client for the active database.
 * On live this calls getFirestore() with no database id, same as before.
 */
export function getDb(): Firestore {
  const databaseId = activeDatabaseId();
  if (databaseId === DEFAULT_FIRESTORE_DATABASE_ID) {
    return getFirestore();
  }
  return getFirestore(databaseId);
}

/**
 * Firestore trigger options. Omits `database` on live so the trigger stays on (default).
 */
export function withDatabase<T extends object>(options: T): T & { database?: string } {
  const databaseId = activeDatabaseId();
  if (databaseId === DEFAULT_FIRESTORE_DATABASE_ID) {
    return options;
  }
  return { ...options, database: databaseId };
}

/** Publish Cloud Functions under their live names, or a dev_ prefix in the dev codebase. */
export function assignFunctionExports(
  target: Record<string, unknown>,
  functionsByName: Record<string, unknown>
): void {
  for (const [name, cloudFunction] of Object.entries(functionsByName)) {
    target[exportName(name)] = cloudFunction;
  }
}
