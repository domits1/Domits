const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UTC_DAY_IN_MS = 24 * 60 * 60 * 1000;

const normalizeTimestampLike = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    const milliseconds = numericValue > 1000000000000 ? numericValue : numericValue * 1000;
    const parsedDate = new Date(milliseconds);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  const parsedDate = new Date(String(value || ""));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const toUtcDateKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;

const sortUniqueDateKeys = (dateKeys) =>
  Array.from(new Set(Array.isArray(dateKeys) ? dateKeys : Array.from(dateKeys || []))).sort(
    (leftDateKey, rightDateKey) => leftDateKey.localeCompare(rightDateKey)
  );

const normalizeStringDateKey = (value) => {
  const normalizedValue = String(value || "").trim();
  return DATE_KEY_PATTERN.test(normalizedValue) ? normalizedValue : "";
};

const collectNormalizedDateKeys = (items, getDateKey) =>
  sortUniqueDateKeys((Array.isArray(items) ? items : []).map(getDateKey).filter(Boolean));

export const buildBlockedDateKeys = (bookings) => {
  const blockedDateKeys = new Set();

  (Array.isArray(bookings) ? bookings : []).forEach((booking) => {
    const arrival = normalizeTimestampLike(booking?.arrivaldate);
    const departure = normalizeTimestampLike(booking?.departuredate);

    if (!arrival || !departure) {
      return;
    }

    const start = startOfUtcDay(arrival);
    const endExclusive = startOfUtcDay(departure);

    if (endExclusive <= start) {
      blockedDateKeys.add(toUtcDateKey(start));
      return;
    }

    for (let cursor = start.getTime(); cursor < endExclusive.getTime(); cursor += UTC_DAY_IN_MS) {
      blockedDateKeys.add(toUtcDateKey(new Date(cursor)));
    }
  });

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
