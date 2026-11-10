"use strict";

/**
 * Copy the compiled live functions bundle into this codebase so the dev
 * entry can load it as a separate Node module (its own absolute path).
 */
const fs = require("fs");
const path = require("path");

const devRoot = path.join(__dirname, "..");
const sourceLib = path.join(devRoot, "..", "functions", "lib");
const targetLib = path.join(devRoot, "lib", "shared");
const sourceIndex = path.join(sourceLib, "index.js");

if (!fs.existsSync(sourceIndex)) {
  console.error("functions/lib/index.js is missing. Run npm run build in functions/ first.");
  process.exit(1);
}

fs.rmSync(targetLib, { recursive: true, force: true });
fs.mkdirSync(targetLib, { recursive: true });
fs.cpSync(sourceLib, targetLib, { recursive: true });

console.log(`Copied functions bundle to ${targetLib}`);
