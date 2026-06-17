const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UTC_DAY_IN_MS = 24 * 60 * 60 * 1000;

const buildDateFromEpochLike = (value) => {
  const epochMilliseconds = Math.abs(value) < 1000000000000 ? value * 1000 : value;
  const nextDate = new Date(epochMilliseconds);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
};

const parseDateInput = (value) => {
  if (value == null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return buildDateFromEpochLike(numericValue);
  }

  const parsedDate = new Date(String(value).trim());
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const toUtcMidnightTimestamp = (date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

const toUtcDateKey = (value) => new Date(value).toISOString().slice(0, 10);

const sortUniqueDateKeys = (dateKeys) =>
  Array.from(new Set(Array.isArray(dateKeys) ? dateKeys : Array.from(dateKeys || []))).sort(
    (leftDateKey, rightDateKey) => leftDateKey.localeCompare(rightDateKey)
  );

const normalizeStringDateKey = (value) => {
  const normalizedValue = String(value || "").trim();
  return DATE_KEY_PATTERN.test(normalizedValue) ? normalizedValue : "";
};

const collectNormalizedDateKeys = (items, getDateKey) =>
  sortUniqueDateKeys((Array.isArray(items) ? items : []).map((item) => getDateKey(item)).filter(Boolean));

export const buildBlockedDateKeys = (bookings) => {
  const blockedDateKeys = new Set();

  for (const booking of Array.isArray(bookings) ? bookings : []) {
    const arrivalDate = parseDateInput(booking?.arrivaldate);
    const departureDate = parseDateInput(booking?.departuredate);

    if (!(arrivalDate && departureDate)) {
      continue;
    }

    let cursorTimestamp = toUtcMidnightTimestamp(arrivalDate);
    const endExclusiveTimestamp = toUtcMidnightTimestamp(departureDate);

    if (endExclusiveTimestamp <= cursorTimestamp) {
      blockedDateKeys.add(toUtcDateKey(cursorTimestamp));
      continue;
    }

    while (cursorTimestamp < endExclusiveTimestamp) {
      blockedDateKeys.add(toUtcDateKey(cursorTimestamp));
      cursorTimestamp += UTC_DAY_IN_MS;
    }
  }

  return sortUniqueDateKeys(blockedDateKeys);
};

export const normalizeBlockedDateKeys = (dateKeys) =>
  collectNormalizedDateKeys(dateKeys, normalizeStringDateKey);

export const normalizeOverrideDateKey = (value) => {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    const normalizedValue = String(Math.trunc(numericValue));
    if (/^\d{8}$/.test(normalizedValue)) {
      return `${normalizedValue.slice(0, 4)}-${normalizedValue.slice(4, 6)}-${normalizedValue.slice(6, 8)}`;
    }
  }

  return normalizeStringDateKey(value);
};

export const extractUnavailableOverrideDateKeys = (overrides) =>
  collectNormalizedDateKeys(
    (Array.isArray(overrides) ? overrides : []).filter((override) => override?.isAvailable === false),
    (override) => normalizeOverrideDateKey(override?.date)
  );

export const extractAvailableOverrideDateKeys = (overrides) =>
  collectNormalizedDateKeys(
    (Array.isArray(overrides) ? overrides : []).filter((override) => override?.isAvailable === true),
    (override) => normalizeOverrideDateKey(override?.date)
  );
