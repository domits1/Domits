import { readFileSync } from "node:fs";

const [beforeFile, afterFile, ...expectedAdded] = process.argv.slice(2);
const load = (f) => JSON.parse(readFileSync(f, "utf8")).DistributionTenant;
const a = load(beforeFile), b = load(afterFile);

const VOLATILE = new Set(["Domains", "LastModifiedTime", "Status"]);
const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !VOLATILE.has(k));

const problems = [];
for (const k of keys) {
  const x = JSON.stringify(a[k] ?? null), y = JSON.stringify(b[k] ?? null);
  if (x !== y) problems.push(`veld ${k} veranderde: was ${x} -> nu ${y}`);
}

const dom = (t) => (t.Domains || []).map((d) => d.Domain).sort();
const before = dom(a), after = dom(b);

console.log("domeinen voor : " + (before.join(", ") || "geen"));
console.log("domeinen na   : " + (after.join(", ") || "geen"));

if (expectedAdded.length) {
  const expected = [...new Set([...before, ...expectedAdded])].sort();
  const missing = expected.filter((d) => !after.includes(d));
  const extra = after.filter((d) => !expected.includes(d));
  const vanished = before.filter((d) => !after.includes(d));

  console.log("verwacht      : " + expected.join(", "));
  if (vanished.length) problems.push("verdwenen uit de lijst: " + vanished.join(", "));
  if (extra.length) problems.push("onverwacht bijgekomen: " + extra.join(", "));
  const missingNotVanished = missing.filter((d) => !vanished.includes(d));
  if (missingNotVanished.length) problems.push("niet toegevoegd terwijl gevraagd: " + missingNotVanished.join(", "));
  if (!problems.length) console.log(`exact ${expectedAdded.length} toegevoegd, niets verdwenen, niets extra`);
}

if (problems.length) {
  console.log("AFGEKEURD:");
  problems.forEach((p) => console.log("  " + p));
  process.exit(2);
}
if (!expectedAdded.length) console.log("alle andere velden ongewijzigd");
