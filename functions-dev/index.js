"use strict";

/**
 * Entry point for the Firebase codebase named "dev".
 *
 * The live codebase loads functions/lib/index.js directly and does not set
 * RB_FUNCTIONS_CODEBASE, so its function names and (default) database stay
 * as they are. This file sets the sentinel first, then loads a copy of that
 * same bundle, which registers a dev_ prefixed copy bound to riverbusiness-dev.
 *
 * scripts/prepare.js copies functions/lib into lib/shared before deploy.
 */
process.env.RB_FUNCTIONS_CODEBASE = "dev";
process.env.FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "riverbusiness-dev";
process.env.RB_FUNCTION_PREFIX = process.env.RB_FUNCTION_PREFIX || "dev";

module.exports = require("./lib/shared/index.js");
