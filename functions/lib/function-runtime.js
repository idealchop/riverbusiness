"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEV_FUNCTION_PREFIX = exports.DEV_FIRESTORE_DATABASE_ID = exports.DEFAULT_FIRESTORE_DATABASE_ID = void 0;
exports.isDevFunctionsCodebase = isDevFunctionsCodebase;
exports.activeDatabaseId = activeDatabaseId;
exports.devFunctionPrefix = devFunctionPrefix;
exports.exportName = exportName;
exports.getDb = getDb;
exports.withDatabase = withDatabase;
exports.assignFunctionExports = assignFunctionExports;
const firestore_1 = require("firebase-admin/firestore");
/** Live Firestore database. Matches the Admin SDK default when no id is passed. */
exports.DEFAULT_FIRESTORE_DATABASE_ID = "(default)";
/** Named database used by the dev functions codebase. */
exports.DEV_FIRESTORE_DATABASE_ID = "riverbusiness-dev";
/** Export-name prefix for the dev copy so live function names stay unchanged. */
exports.DEV_FUNCTION_PREFIX = "dev";
/**
 * Set only by functions-dev/index.js before the shared bundle is loaded.
 * Live deploys load functions/lib/index.js directly and never set this.
 */
function isDevFunctionsCodebase() {
    return process.env.RB_FUNCTIONS_CODEBASE === "dev";
}
/** Database these functions read and write. Live is always (default). */
function activeDatabaseId() {
    if (!isDevFunctionsCodebase())
        return exports.DEFAULT_FIRESTORE_DATABASE_ID;
    const configured = (process.env.FIRESTORE_DATABASE_ID || "").trim();
    return configured || exports.DEV_FIRESTORE_DATABASE_ID;
}
/** Empty on live, so export names stay exactly as they are today. */
function devFunctionPrefix() {
    if (!isDevFunctionsCodebase())
        return "";
    const configured = (process.env.RB_FUNCTION_PREFIX || exports.DEV_FUNCTION_PREFIX).trim();
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(configured)) {
        throw new Error(`RB_FUNCTION_PREFIX "${configured}" must start with a letter and contain only letters, numbers, and underscores.`);
    }
    return configured;
}
function exportName(baseName) {
    const prefix = devFunctionPrefix();
    return prefix ? `${prefix}_${baseName}` : baseName;
}
/**
 * Admin Firestore client for the active database.
 * On live this calls getFirestore() with no database id, same as before.
 */
function getDb() {
    const databaseId = activeDatabaseId();
    if (databaseId === exports.DEFAULT_FIRESTORE_DATABASE_ID) {
        return (0, firestore_1.getFirestore)();
    }
    return (0, firestore_1.getFirestore)(databaseId);
}
/**
 * Firestore trigger options. Omits `database` on live so the trigger stays on (default).
 */
function withDatabase(options) {
    const databaseId = activeDatabaseId();
    if (databaseId === exports.DEFAULT_FIRESTORE_DATABASE_ID) {
        return options;
    }
    return Object.assign(Object.assign({}, options), { database: databaseId });
}
/** Publish Cloud Functions under their live names, or a dev_ prefix in the dev codebase. */
function assignFunctionExports(target, functionsByName) {
    for (const [name, cloudFunction] of Object.entries(functionsByName)) {
        target[exportName(name)] = cloudFunction;
    }
}
//# sourceMappingURL=function-runtime.js.map