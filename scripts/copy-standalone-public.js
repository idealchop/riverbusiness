const fs = require('fs');
const path = require('path');

/**
 * Next standalone tracing can leave .next/standalone/public with only the files
 * a server route read via fs. Firebase App Hosting then skips copying public/
 * because that directory already exists, and every other public file 404s.
 * Merge the real public directory in so the standalone server has all of it.
 */
const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');
const publicDir = path.join(root, 'public');

if (!fs.existsSync(standalone) || !fs.existsSync(publicDir)) {
  process.exit(0);
}

function mergePublic(destRoot) {
  const dest = path.join(destRoot, 'public');
  fs.cpSync(publicDir, dest, { recursive: true, force: false });
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const full = path.join(dir, name);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walk(full);
    else if (name === 'server.js') mergePublic(dir);
  }
}

walk(standalone);
