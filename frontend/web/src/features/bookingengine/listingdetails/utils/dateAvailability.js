const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value) => String(value).padStart(2, "0");

export const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const normalizeDateValue = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const normalizedValue = String(value || "").trim();
  if (!DATE_KEY_PATTERN.test(normalizedValue)) {
    return null;
  }

  const [year, month, day] = normalizedValue.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const buildUnavailableDateSet = (values) =>
  new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter((value) => DATE_KEY_PATTERN.test(value))
  );

export const normalizeAvailabilityDateNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  const truncated = Math.trunc(numeric);
  if (truncated >= 10000101 && truncated <= 99991231) {
    return truncated;
  }

  const milliseconds = truncated > 1000000000000 ? truncated : truncated * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Number(`${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`);
};

export const normalizeAvailabilityRanges = (availability) =>
  (Array.isArray(availability) ? availability : [])
    .map((entry) => {
      const start = normalizeAvailabilityDateNumber(entry?.availableStartDate ?? entry?.availablestartdate);
      const end = normalizeAvailabilityDateNumber(entry?.availableEndDate ?? entry?.availableenddate);
      if (!start || !end) {
        return null;
      }
      return start <= end ? { start, end } : { start: end, end: start };
    })
    .filter(Boolean)
    .sort((left, right) => left.start - right.start);

export const dateKeyToDateNumber = (value) => {
  const normalizedDateKey = String(value || "").trim();
  if (!DATE_KEY_PATTERN.test(normalizedDateKey)) {
    return null;
  }
  return Number(normalizedDateKey.replaceAll("-", ""));
};

const normalizeAvailabilityContext = (availabilityContext = {}) => ({
  availableDateSet:
    availabilityContext.availableDateKeys instanceof Set
      ? availabilityContext.availableDateKeys
      : buildUnavailableDateSet(availabilityContext.availableDateKeys),
  availabilityRanges: Array.isArray(availabilityContext.availabilityRanges)
    ? availabilityContext.availabilityRanges
    : null,
});

export const isDateAvailableFromBaseWindow = (dateKey, availabilityRanges) => {
  const dateNumber = dateKeyToDateNumber(dateKey);
  if (!dateNumber || !Array.isArray(availabilityRanges)) {
    return false;
  }
  return availabilityRanges.some((range) => dateNumber >= range.start && dateNumber <= range.end);
};

export const isUnavailableDate = (value, unavailableValues, availabilityContext) => {
  const normalizedDate = normalizeDateValue(value);
  if (!normalizedDate) {
    return false;
  }

  const unavailableDateSet =
    unavailableValues instanceof Set ? unavailableValues : buildUnavailableDateSet(unavailableValues);
  const dateKey = toDateKey(normalizedDate);
  if (unavailableDateSet.has(dateKey)) {
    return true;
  }

  const { availableDateSet, availabilityRanges } = normalizeAvailabilityContext(availabilityContext);
  if (availableDateSet.has(dateKey)) {
    return false;
  }

  if (Array.isArray(availabilityRanges)) {
    return !isDateAvailableFromBaseWindow(dateKey, availabilityRanges);
  }

  return false;
};

export const hasUnavailableDateInStayRange = (
  checkInValue,
  checkOutValue,
  unavailableValues,
  availabilityContext
) => {
  const checkInDate = normalizeDateValue(checkInValue);
  const checkOutDate = normalizeDateValue(checkOutValue);
  if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
    return false;
  }

  const unavailableDateSet =
    unavailableValues instanceof Set ? unavailableValues : buildUnavailableDateSet(unavailableValues);
  for (
    let cursor = checkInDate;
    cursor < checkOutDate;
    cursor = new Date(cursor.valueOf() + DAY_IN_MS)
  ) {
    if (isUnavailableDate(cursor, unavailableDateSet, availabilityContext)) {
      return true;
    }
  }

  return false;
};

export const getFutureDateKey = (offsetDays) => toDateKey(new Date(Date.now() + offsetDays * DAY_IN_MS));

export const addDaysToDateKey = (value, days) => {
  const normalizedDate = normalizeDateValue(value);
  if (!normalizedDate) {
    return "";
  }

  return toDateKey(new Date(normalizedDate.valueOf() + days * DAY_IN_MS));
};
