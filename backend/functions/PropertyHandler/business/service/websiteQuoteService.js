import { randomUUID } from "node:crypto";
import { signWebsiteQuoteToken } from "../../.shared/websiteQuoteToken.js";
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

const toCalendarDateInt = (date) =>
  date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();

const CALENDAR_INT_MIN = 19000101;
const CALENDAR_INT_MAX = 21001231;

// Accepts the date representations that reach us from the calendar sources:
// "YYYY-MM-DD" keys, YYYYMMDD ints, and the epoch timestamps the availability
// windows are stored as. Mirrors the booking guard's normalizeValueToCalendarInt,
// with YYYYMMDD-range integers recognized before the epoch interpretation.
const normalizeToCalendarInt = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (DATE_KEY_PATTERN.test(trimmed)) {
      return Number(trimmed.replaceAll("-", ""));
    }
    if (/^\d{8}$/.test(trimmed)) {
      return Number(trimmed);
    }
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }
  const truncated = Math.trunc(numericValue);
  if (truncated >= CALENDAR_INT_MIN && truncated <= CALENDAR_INT_MAX) {
    return truncated;
  }
  const milliseconds = truncated > 1_000_000_000_000 ? truncated : truncated * 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : toCalendarDateInt(date);
};

const calendarIntToDateKey = (calendarInt) => {
  const digits = String(calendarInt).padStart(8, "0");
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
};

const normalizeWindows = (availabilityWindows) =>
  (Array.isArray(availabilityWindows) ? availabilityWindows : [])
    .map((window) => ({
      start: normalizeToCalendarInt(window?.availableStartDate ?? window?.availablestartdate),
      end: normalizeToCalendarInt(window?.availableEndDate ?? window?.availableenddate),
    }))
    .filter((window) => window.start !== null && window.end !== null);

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

export const assertPropertyIsQuotable = (property) => {
  if (property?.status !== "ACTIVE") {
    throw new WebsiteQuoteError(
      WEBSITE_QUOTE_ERROR_CODES.QUOTE_UNAVAILABLE,
      "This property is not bookable right now."
    );
  }
};

// Mirrors the booking Lambda's assertBookingDatesAvailable: a night is bookable
// when it is not blocked (booking, unavailable-override, or external calendar)
// and is either opened by an available-override or inside an availability
// window. A quote that passes here predicts a booking that passes the guard.
export const assertStayNightsAvailable = ({ stayNightKeys, calendarAvailability, availabilityWindows }) => {
  const collectInts = (values) =>
    new Set((Array.isArray(values) ? values : []).map(normalizeToCalendarInt).filter((v) => v !== null));

  const blockedInts = collectInts([
    ...(calendarAvailability?.unavailableDateKeys ?? []),
    ...(calendarAvailability?.externalBlockedDates ?? []),
  ]);
  const openedInts = collectInts(calendarAvailability?.availableDateKeys);
  const windows = normalizeWindows(availabilityWindows);

  const unavailable = new WebsiteQuoteError(
    WEBSITE_QUOTE_ERROR_CODES.UNAVAILABLE_DATES,
    "The selected dates are not available."
  );
  for (const nightKey of stayNightKeys) {
    const nightInt = normalizeToCalendarInt(nightKey);
    if (blockedInts.has(nightInt)) {
      throw unavailable;
    }
    if (openedInts.has(nightInt)) {
      continue;
    }
    if (!windows.some((window) => nightInt >= window.start && nightInt <= window.end)) {
      throw unavailable;
    }
  }

  return ["availability_window"];
};

export const buildQuotePriceBreakdown = ({ pricing, nights }) => {
  const quoteUnavailable = new WebsiteQuoteError(
    WEBSITE_QUOTE_ERROR_CODES.QUOTE_UNAVAILABLE,
    "This property is not bookable right now."
  );

  const roomRate = Number(pricing?.roomRate);
  if (!Number.isFinite(roomRate) || roomRate <= 0) {
    throw quoteUnavailable;
  }
  const cleaning = pricing.cleaning === null || pricing.cleaning === undefined ? 0 : Number(pricing.cleaning);
  if (!Number.isFinite(cleaning) || cleaning < 0) {
    throw quoteUnavailable;
  }

  // Money leaves this service in minor units only. The cleaning fee is flat per
  // stay (open decision D4), and no platform fee, discounts, or taxes are
  // applied in v1 (open decisions D5/D6).
  const nightlyBaseTotal = Math.round(roomRate * 100) * nights;
  const cleaningFee = Math.round(cleaning * 100);

  return {
    currency: "EUR",
    nightlyBaseTotal,
    cleaningFee,
    discounts: [],
    taxes: [],
    fees: [],
    total: nightlyBaseTotal + cleaningFee,
  };
};

export const summarizeAvailabilityWindows = (availabilityWindows) => {
  const windows = normalizeWindows(availabilityWindows);
  if (windows.length === 0) {
    return { bookableFrom: null, bookableUntil: null };
  }
  const earliestStart = Math.min(...windows.map((window) => window.start));
  const latestEnd = Math.max(...windows.map((window) => window.end));
  return { bookableFrom: calendarIntToDateKey(earliestStart), bookableUntil: calendarIntToDateKey(latestEnd) };
};

export const resolveGuestCapacity = (generalDetails) => {
  const row = (Array.isArray(generalDetails) ? generalDetails : []).find((detail) => detail?.detail === "Guests");
  const capacity = Number(row?.value);
  return Number.isInteger(capacity) && capacity > 0 ? capacity : null;
};

const QUOTE_TTL_MS = 30 * 60 * 1000;

export class WebsiteQuoteService {
  // propertyService is required rather than defaulted: the default PropertyService
  // constructor wires twenty repositories, and the composing controller already
  // owns one instance. The secret provider is a function so SSM stays out of
  // the business layer.
  constructor({ propertyService, quoteTokenSecretProvider, clock = () => Date.now() } = {}) {
    if (!propertyService) {
      throw new TypeError("WebsiteQuoteService requires a propertyService.");
    }
    if (typeof quoteTokenSecretProvider !== "function") {
      throw new TypeError("WebsiteQuoteService requires a quoteTokenSecretProvider function.");
    }
    this.propertyService = propertyService;
    this.quoteTokenSecretProvider = quoteTokenSecretProvider;
    this.clock = clock;
  }

  async createQuote({ siteId, propertyId, checkIn, checkOut, guests, currency }) {
    if (currency !== undefined && currency !== null && currency !== "EUR") {
      // D14: the platform prices in EUR only; there is no currency column anywhere.
      throw new WebsiteQuoteError(WEBSITE_QUOTE_ERROR_CODES.QUOTE_UNAVAILABLE, "Only EUR quotes are supported.");
    }

    const now = this.clock();
    const stay = parseQuoteStayDates({ checkIn, checkOut, now });

    let property, generalDetails, restrictionRows, availabilityWindows, pricing, calendarAvailability;
    try {
      [property, generalDetails, restrictionRows, availabilityWindows, pricing, calendarAvailability] =
        await Promise.all([
          this.propertyService.getBasePropertyInfo(propertyId),
          this.propertyService.getGeneralDetails(propertyId),
          this.propertyService.getAvailabilityRestrictions(propertyId),
          this.propertyService.getAvailability(propertyId),
          this.propertyService.getPricing(propertyId),
          this.propertyService.getPublicCalendarAvailability(propertyId),
        ]);
    } catch (error) {
      if (error?.statusCode === 404) {
        throw new WebsiteQuoteError(
          WEBSITE_QUOTE_ERROR_CODES.QUOTE_UNAVAILABLE,
          "This property is not bookable right now."
        );
      }
      throw new WebsiteQuoteError(
        WEBSITE_QUOTE_ERROR_CODES.PRICING_SERVICE_UNAVAILABLE,
        "Live pricing and availability could not be checked. Please try again."
      );
    }

    assertPropertyIsQuotable(property);
    assertQuoteGuestCount({ guests, capacity: resolveGuestCapacity(generalDetails) });

    const restrictions = resolveStayRestrictions(restrictionRows);
    const policiesApplied = [
      ...assertStayRestrictions({ nights: stay.nights, checkInKey: stay.checkInKey, now, restrictions }),
      ...assertStayNightsAvailable({
        stayNightKeys: stay.stayNightKeys,
        calendarAvailability,
        availabilityWindows,
      }),
    ];

    const priceBreakdown = buildQuotePriceBreakdown({ pricing, nights: stay.nights });
    const { bookableFrom, bookableUntil } = summarizeAvailabilityWindows(availabilityWindows);
    const expiresAt = new Date(now + QUOTE_TTL_MS).toISOString();
    const quoteId = `quote_${randomUUID()}`;

    const quoteToken = signWebsiteQuoteToken(
      {
        v: 1,
        quoteId,
        siteId,
        propertyId,
        checkIn: stay.checkInKey,
        checkOut: stay.checkOutKey,
        guests,
        priceBreakdown,
        expiresAt,
      },
      await this.quoteTokenSecretProvider()
    );

    return {
      quoteId,
      siteId,
      propertyId,
      // D3: no property timezone exists anywhere in the platform yet.
      timezone: null,
      checkIn: stay.checkInKey,
      checkOut: stay.checkOutKey,
      nights: stay.nights,
      guestCount: guests,
      availability: {
        isAvailable: true,
        bookableFrom,
        bookableUntil,
        minimumStay: restrictions.minimumStay,
        maximumStay: restrictions.maximumStay,
      },
      priceBreakdown,
      policiesApplied,
      expiresAt,
      quoteToken,
    };
  }
}

