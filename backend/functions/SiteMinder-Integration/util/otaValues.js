const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value) {
  const match = ISO_DATE.exec(typeof value === "string" ? value : "");
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function toAmount(value) {
  const cents = Math.round(Number((value * 100).toPrecision(15)));
  return (cents / 100).toFixed(2);
}
