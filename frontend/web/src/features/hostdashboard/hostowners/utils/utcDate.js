export const DAY_MS = 86400000;
export const MAX_EFFECTIVE_FROM_DAYS_AHEAD = 1826;

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isUtcMidnight = (value) => Number.isSafeInteger(value) && value >= 0 && value % DAY_MS === 0;

export const todayUtc = (now = Date.now()) => Math.floor(now / DAY_MS) * DAY_MS;

export const latestEffectiveFrom = (now = Date.now()) => todayUtc(now) + MAX_EFFECTIVE_FROM_DAYS_AHEAD * DAY_MS;

export const dateInputToUtcMidnight = (value) => {
  const match = typeof value === "string" ? DATE_INPUT_PATTERN.exec(value) : null;
  if (!match) {
    return null;
  }
  const [, year, month, day] = match.map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  const isSameDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isSameDate && isUtcMidnight(timestamp) ? timestamp : null;
};

export const utcMidnightToDateInput = (timestamp) =>
  isUtcMidnight(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : null;

export const isEffectiveFromInRange = (effectiveFrom, now = Date.now()) =>
  isUtcMidnight(effectiveFrom) && effectiveFrom >= todayUtc(now) && effectiveFrom <= latestEffectiveFrom(now);
