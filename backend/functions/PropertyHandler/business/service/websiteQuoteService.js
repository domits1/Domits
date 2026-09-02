import {
  WebsiteQuoteError,
  WEBSITE_QUOTE_ERROR_CODES,
} from "../../util/exception/WebsiteQuoteError.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Engine cap, not a property restriction: keeps a public endpoint from expanding
// an arbitrary date range into an unbounded night list.
const MAX_QUOTE_NIGHTS = 366;

const RESTRICTION_FIELD_BY_NAME = Object.freeze({
  MinimumStay: "minimumStay",
  MaximumStay: "maximumStay",
  MinimumAdvanceReservation: "minimumAdvanceDays",
  MaximumAdvanceReservation: "maximumAdvanceDays",
});

const invalidDateRange = (message) =>
  new WebsiteQuoteError(WEBSITE_QUOTE_ERROR_CODES.INVALID_DATE_RANGE, message);

const parseIsoDateKeyToUtcMs = (value) => {
  if (typeof value !== "string" || !DATE_KEY_PATTERN.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsedMs = Date.UTC(year, month - 1, day);
  const parsed = new Date(parsedMs);
  const isRealCalendarDate =
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  return isRealCalendarDate ? parsedMs : null;
};

const toDateKey = (utcMs) => new Date(utcMs).toISOString().slice(0, 10);

// The quote engine compares calendar dates in UTC, matching the booking guard
// (assertBookingDatesAvailable) it must predict. Property-local timezones are
// an open decision (D3); when one lands, both sides move together.
const startOfUtcDayMs = (nowMs) => {
  const now = new Date(nowMs);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};

export const parseQuoteStayDates = ({ checkIn, checkOut, now }) => {
  const checkInMs = parseIsoDateKeyToUtcMs(checkIn);
  const checkOutMs = parseIsoDateKeyToUtcMs(checkOut);
  if (checkInMs === null || checkOutMs === null) {
    throw invalidDateRange("checkIn and checkOut must be valid ISO dates (YYYY-MM-DD).");
  }
  if (checkOutMs <= checkInMs) {
    throw invalidDateRange("checkOut must be after checkIn.");
  }
  if (checkInMs < startOfUtcDayMs(now)) {
    throw invalidDateRange("checkIn must not be in the past.");
  }

  const nights = Math.round((checkOutMs - checkInMs) / DAY_MS);
  if (nights > MAX_QUOTE_NIGHTS) {
    throw invalidDateRange(`Stays longer than ${MAX_QUOTE_NIGHTS} nights cannot be quoted.`);
  }

  const stayNightKeys = [];
  for (let cursor = checkInMs; cursor < checkOutMs; cursor += DAY_MS) {
    stayNightKeys.push(toDateKey(cursor));
  }

  return { checkInKey: checkIn, checkOutKey: checkOut, checkInMs, checkOutMs, nights, stayNightKeys };
};

export const assertQuoteGuestCount = ({ guests, capacity }) => {
  if (!Number.isInteger(guests) || guests < 1) {
    throw new WebsiteQuoteError(
      WEBSITE_QUOTE_ERROR_CODES.INVALID_GUEST_COUNT,
      "guests must be a whole number of at least 1."
    );
  }
  const hasCapacity = Number.isInteger(capacity) && capacity > 0;
  if (hasCapacity && guests > capacity) {
    throw new WebsiteQuoteError(
      WEBSITE_QUOTE_ERROR_CODES.INVALID_GUEST_COUNT,
      `This property sleeps at most ${capacity} guests.`
    );
  }
};

export const resolveStayRestrictions = (restrictionRows) => {
  const restrictions = {
    minimumStay: null,
    maximumStay: null,
    minimumAdvanceDays: null,
    maximumAdvanceDays: null,
  };
  for (const row of Array.isArray(restrictionRows) ? restrictionRows : []) {
    const field = RESTRICTION_FIELD_BY_NAME[row?.restriction];
    if (!field) {
      continue;
    }
    const value = Number(row.value);
    if (Number.isFinite(value) && value > 0) {
      restrictions[field] = value;
    }
  }
  return restrictions;
};

export const assertStayRestrictions = ({ nights, checkInKey, now, restrictions }) => {
  const applied = [];
  const violation = (message) =>
    new WebsiteQuoteError(WEBSITE_QUOTE_ERROR_CODES.STAY_RESTRICTION_VIOLATION, message);

  if (restrictions.minimumStay !== null) {
    if (nights < restrictions.minimumStay) {
      throw violation(`This property requires a stay of at least ${restrictions.minimumStay} nights.`);
    }
    applied.push("minimum_stay");
  }
  if (restrictions.maximumStay !== null) {
    if (nights > restrictions.maximumStay) {
      throw violation(`This property allows a stay of at most ${restrictions.maximumStay} nights.`);
    }
    applied.push("maximum_stay");
  }

  const checkInMs = parseIsoDateKeyToUtcMs(checkInKey);
  if (checkInMs === null) {
    // Misuse guard: NaN advance days would silently skip the advance checks.
    throw new TypeError(`assertStayRestrictions needs a parsed check-in key, got: ${checkInKey}`);
  }
  const advanceDays = Math.round((checkInMs - startOfUtcDayMs(now)) / DAY_MS);
  if (restrictions.minimumAdvanceDays !== null) {
    if (advanceDays < restrictions.minimumAdvanceDays) {
      throw violation(
        `This property must be booked at least ${restrictions.minimumAdvanceDays} days before check-in.`
      );
    }
    applied.push("minimum_advance_reservation");
  }
  if (restrictions.maximumAdvanceDays !== null) {
    if (advanceDays > restrictions.maximumAdvanceDays) {
      throw violation(
        `This property can be booked at most ${restrictions.maximumAdvanceDays} days before check-in.`
      );
    }
    applied.push("maximum_advance_reservation");
  }

  return applied;
};
