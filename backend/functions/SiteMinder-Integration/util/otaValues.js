const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// yyyy-mm-dd that is also a real calendar day, so 2026-13-45 or 2026-02-30 never reaches SiteMinder.
export function isIsoDate(value) {
  const match = ISO_DATE.exec(typeof value === "string" ? value : "");
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Two decimals, rounded half up on the decimal value: 1.005 becomes "1.01", where (1.005).toFixed(2) gives "1.00".
export function toAmount(value) {
  const cents = Math.round(Number((value * 100).toPrecision(15)));
  return (cents / 100).toFixed(2);
}
