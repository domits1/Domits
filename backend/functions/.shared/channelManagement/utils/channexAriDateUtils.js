const requireStr = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const parseIsoDateParam = (value) => {
  const normalized = requireStr(value);
  if (!normalized) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return normalized;
};
const getUtcTodayIsoDate = () => new Date().toISOString().slice(0, 10);
const addDaysToIsoDate = (isoDate, days) => {
  const normalized = parseIsoDateParam(isoDate);
  if (!normalized || !Number.isFinite(Number(days))) return null;

  const date = new Date(`${normalized}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + Math.trunc(Number(days)));
  return date.toISOString().slice(0, 10);
};
const isoDateToUtcStartMs = (value) => {
  const normalized = parseIsoDateParam(value);
  if (!normalized) return null;

  const timestamp = new Date(`${normalized}T00:00:00.000Z`).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};
const isoDateToCalendarInt = (value) => {
  const normalized = parseIsoDateParam(value);
  return normalized ? Number(normalized.replaceAll("-", "")) : null;
};
const calendarIntToIsoDate = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  const truncatedValue = Math.trunc(numericValue);
  if (truncatedValue < 10000101 || truncatedValue > 99991231) return null;

  const stringValue = String(truncatedValue);
  return `${stringValue.slice(0, 4)}-${stringValue.slice(4, 6)}-${stringValue.slice(6, 8)}`;
};
const normalizeValueToCalendarInt = (value) => {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "string") {
    const normalizedIso = parseIsoDateParam(value);
    if (normalizedIso) return Number(normalizedIso.replaceAll("-", ""));

    const trimmed = value.trim();
    if (/^\d{8}$/.test(trimmed)) {
      return Number(trimmed);
    }
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;

  const truncatedValue = Math.trunc(numericValue);
  if (truncatedValue >= 10000101 && truncatedValue <= 99991231) {
    return truncatedValue;
  }

  const milliseconds = truncatedValue > 1000000000000 ? truncatedValue : truncatedValue * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return null;

  return Number(
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(
      2,
      "0"
    )}`
  );
};
const buildCalendarDateRange = (startIsoDate, endIsoDate) => {
  const out = [];
  const start = parseIsoDateParam(startIsoDate);
  const end = parseIsoDateParam(endIsoDate);
  if (!start || !end) return out;

  const cursor = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  while (cursor.getTime() <= endDate.getTime()) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
};

export {
  addDaysToIsoDate,
  buildCalendarDateRange,
  calendarIntToIsoDate,
  getUtcTodayIsoDate,
  isoDateToCalendarInt,
  isoDateToUtcStartMs,
  normalizeValueToCalendarInt,
  parseIsoDateParam,
};
