// Dev script (not shipped, not a test): keeps the extension's copies of the Collector and
// Snapshot encoder byte-identical to the site's. Usage: node scripts/sync-extension.mjs [--check]
import { readFileSync, writeFileSync } from "node:fs";

const check = process.argv.includes("--check");
let bad = 0;
for (const name of ["collector.js", "fragment.js"]) {
  const src = new URL(`../js/${name}`, import.meta.url);
  const dst = new URL(`../extension/lib/${name}`, import.meta.url);
  const a = readFileSync(src);
  let b = null;
  try { b = readFileSync(dst); } catch {}
  if (b && a.equals(b)) continue;
  if (check) { console.log(`DIFFERS: extension/lib/${name}`); bad++; }
  else { writeFileSync(dst, a); console.log(`synced: extension/lib/${name}`); }
}
if (check) { console.log(bad ? "Out of sync" : "In sync"); process.exit(bad ? 1 : 0); }
