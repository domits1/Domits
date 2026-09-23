import { readFileSync } from "node:fs";

const [beforeFile, afterFile, ...expectedAdded] = process.argv.slice(2);
const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const load = (f) => JSON.parse(readFileSync(f, "utf8")).DistributionTenant;
const a = load(beforeFile), b = load(afterFile);

const VOLATILE = new Set(["Domains", "LastModifiedTime", "Status"]);
const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !VOLATILE.has(k));

const problems = [];
for (const k of keys) {
  const x = JSON.stringify(a[k] ?? null), y = JSON.stringify(b[k] ?? null);
  if (x !== y) problems.push(`field ${k} changed: was ${x} -> now ${y}`);
}

const dom = (t) => (t.Domains || []).map((d) => d.Domain).sort(byCodeUnit);
const before = dom(a), after = dom(b);

console.log("domains before : " + (before.join(", ") || "none"));
console.log("domains after  : " + (after.join(", ") || "none"));

if (expectedAdded.length) {
  const expected = [...new Set([...before, ...expectedAdded])].sort(byCodeUnit);
  const missing = expected.filter((d) => !after.includes(d));
  const extra = after.filter((d) => !expected.includes(d));
  const vanished = before.filter((d) => !after.includes(d));

  console.log("expected       : " + expected.join(", "));
  if (vanished.length) problems.push("vanished from the list: " + vanished.join(", "));
  if (extra.length) problems.push("unexpectedly added: " + extra.join(", "));
  const missingNotVanished = missing.filter((d) => !vanished.includes(d));
  if (missingNotVanished.length) problems.push("not added although asked for: " + missingNotVanished.join(", "));
  if (!problems.length) console.log(`exactly ${expectedAdded.length} added, nothing vanished, nothing extra`);
}

if (problems.length) {
  console.log("REJECTED:");
  problems.forEach((p) => console.log("  " + p));
  process.exit(2);
}
if (!expectedAdded.length) console.log("all other fields unchanged");
