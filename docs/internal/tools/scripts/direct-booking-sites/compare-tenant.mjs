import { readFileSync } from "node:fs";

const [beforeFile, afterFile, flag, ...given] = process.argv.slice(2);
const MODES = { "--add": "add", "--remove": "remove" };
const mode = MODES[flag];
if (!beforeFile || !afterFile || !mode || !given.length) {
  console.log("usage: compare-tenant.mjs <before.json> <after.json> --add|--remove <domain...>");
  process.exit(2);
}

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
const unique = (list) => [...new Set(list)].sort(byCodeUnit);

console.log("domains before : " + (before.join(", ") || "none"));
console.log("domains after  : " + (after.join(", ") || "none"));

const expected =
  mode === "add" ? unique([...before, ...given]) : unique(before).filter((d) => !given.includes(d));
console.log("expected       : " + (expected.join(", ") || "none"));

const duplicated = after.filter((d, i) => after.indexOf(d) !== i);
const vanished = before.filter((d) => !after.includes(d) && !(mode === "remove" && given.includes(d)));
const extra = after.filter((d) => !expected.includes(d) && !(mode === "remove" && given.includes(d)));
const notAdded = mode === "add" ? given.filter((d) => !after.includes(d) && !before.includes(d)) : [];
const notRemoved = mode === "remove" ? given.filter((d) => after.includes(d)) : [];

if (duplicated.length) problems.push("listed more than once: " + unique(duplicated).join(", "));
if (vanished.length) problems.push("vanished from the list: " + vanished.join(", "));
if (extra.length) problems.push("unexpectedly added: " + extra.join(", "));
if (notAdded.length) problems.push("not added although asked for: " + notAdded.join(", "));
if (notRemoved.length) problems.push("not removed although asked for: " + notRemoved.join(", "));
if (!problems.length && unique(after).join("\n") !== expected.join("\n")) {
  problems.push("the list after is not the expected list");
}

if (problems.length) {
  console.log("REJECTED:");
  problems.forEach((p) => console.log("  " + p));
  process.exit(2);
}
const verb = mode === "add" ? "added" : "removed";
console.log(`exactly the requested domains ${verb}, nothing vanished, nothing extra`);
console.log("all other fields unchanged");
