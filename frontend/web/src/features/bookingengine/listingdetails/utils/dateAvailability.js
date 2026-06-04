const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DATE_AVAILABILITY_REASONS = Object.freeze({
  AVAILABLE: "available",
  OUTSIDE_WINDOW: "outside-window",
  UNAVAILABLE_OVERRIDE: "unavailable-override",
  EXTERNAL_BLOCKED: "external-blocked",
  BOOKED: "booked",
});

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
  hasAvailableDateKeySnapshot:
    availabilityContext.availableDateKeys instanceof Set || Array.isArray(availabilityContext.availableDateKeys),
  availableDateSet:
    availabilityContext.availableDateKeys instanceof Set
      ? availabilityContext.availableDateKeys
      : buildUnavailableDateSet(availabilityContext.availableDateKeys),
  bookedDateSet:
    availabilityContext.bookedDateKeys instanceof Set
      ? availabilityContext.bookedDateKeys
      : buildUnavailableDateSet(availabilityContext.bookedDateKeys),
  externalBlockedDateSet:
    availabilityContext.externalBlockedDateKeys instanceof Set
      ? availabilityContext.externalBlockedDateKeys
      : buildUnavailableDateSet(availabilityContext.externalBlockedDateKeys),
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

export const getDateAvailabilityReason = (value, unavailableValues, availabilityContext) => {
  const normalizedDate = normalizeDateValue(value);
  if (!normalizedDate) {
    return DATE_AVAILABILITY_REASONS.AVAILABLE;
  }

  const unavailableDateSet =
    unavailableValues instanceof Set ? unavailableValues : buildUnavailableDateSet(unavailableValues);
  const dateKey = toDateKey(normalizedDate);
  const {
    availableDateSet,
    availabilityRanges,
    bookedDateSet,
    externalBlockedDateSet,
    hasAvailableDateKeySnapshot,
  } = normalizeAvailabilityContext(availabilityContext);

  if (bookedDateSet.has(dateKey)) {
    return DATE_AVAILABILITY_REASONS.BOOKED;
  }

  if (externalBlockedDateSet.has(dateKey)) {
    return DATE_AVAILABILITY_REASONS.EXTERNAL_BLOCKED;
  }

  if (unavailableDateSet.has(dateKey)) {
    return DATE_AVAILABILITY_REASONS.UNAVAILABLE_OVERRIDE;
  }

  if (availableDateSet.has(dateKey)) {
    return DATE_AVAILABILITY_REASONS.AVAILABLE;
  }

  if (hasAvailableDateKeySnapshot && Array.isArray(availabilityRanges)) {
    return isDateAvailableFromBaseWindow(dateKey, availabilityRanges)
      ? DATE_AVAILABILITY_REASONS.AVAILABLE
      : DATE_AVAILABILITY_REASONS.OUTSIDE_WINDOW;
  }

  return DATE_AVAILABILITY_REASONS.AVAILABLE;
};

export const isUnavailableDate = (value, unavailableValues, availabilityContext) =>
  getDateAvailabilityReason(value, unavailableValues, availabilityContext) !==
  DATE_AVAILABILITY_REASONS.AVAILABLE;

export const getStayRangeAvailabilityIssue = (
  checkInValue,
  checkOutValue,
  unavailableValues,
  availabilityContext
) => {
  const checkInDate = normalizeDateValue(checkInValue);
  const checkOutDate = normalizeDateValue(checkOutValue);
  if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
    return null;
  }

  const unavailableDateSet =
    unavailableValues instanceof Set ? unavailableValues : buildUnavailableDateSet(unavailableValues);
  let firstBlockedReason = null;

  for (
    let cursor = checkInDate;
    cursor < checkOutDate;
    cursor = new Date(cursor.valueOf() + DAY_IN_MS)
  ) {
    const reason = getDateAvailabilityReason(cursor, unavailableDateSet, availabilityContext);
    if (reason === DATE_AVAILABILITY_REASONS.BOOKED) {
      return reason;
    }

    if (reason !== DATE_AVAILABILITY_REASONS.AVAILABLE && !firstBlockedReason) {
      firstBlockedReason = reason;
    }
  }

  return firstBlockedReason;
};

export const hasUnavailableDateInStayRange = (
  checkInValue,
  checkOutValue,
  unavailableValues,
  availabilityContext
) => Boolean(getStayRangeAvailabilityIssue(checkInValue, checkOutValue, unavailableValues, availabilityContext));

export const getFutureDateKey = (offsetDays) => toDateKey(new Date(Date.now() + offsetDays * DAY_IN_MS));

export const addDaysToDateKey = (value, days) => {
  const normalizedDate = normalizeDateValue(value);
  if (!normalizedDate) {
    return "";
  }

  return toDateKey(new Date(normalizedDate.valueOf() + days * DAY_IN_MS));
};
