import { PRICING_RESTRICTION_KEYS, createInitialPricingForm } from "../../hostproperty/constants";

export const ADVANCE_NOTICE_RESTRICTION_KEYS = [
  "MinimumAdvanceReservation",
  "MinimumAdvanceNoticeDays",
  "MinimumAdvanceBookingDays",
];
export const DEFAULT_ADVANCE_NOTICE_RESTRICTION_KEY = "MinimumAdvanceReservation";

export const MAX_ADVANCE_NOTICE_RESTRICTION_KEYS = [
  "MaximumAdvanceReservation",
  "MaximumAdvanceNoticeDays",
  "MaximumAdvanceBookingDays",
];
export const DEFAULT_MAX_ADVANCE_NOTICE_RESTRICTION_KEY = "MaximumAdvanceReservation";

export const PREPARATION_TIME_RESTRICTION_KEYS = [
  "PreparationTimeDays",
  "PreparationDays",
  "TurnoverDays",
];
export const DEFAULT_PREPARATION_TIME_RESTRICTION_KEY = "PreparationTimeDays";

export const AVAILABILITY_WINDOW_OPTIONS = [
  { label: "3 months", value: 90 },
  { label: "6 months", value: 180 },
  { label: "9 months", value: 270 },
  { label: "12 months", value: 365 },
  { label: "24 months", value: 730 },
];

export const ICAL_EXPORT_BUCKET = "icalender";
export const ICAL_EXPORT_REGION = "eu-north-1";

export const WEEKEND_PRICE_KEYS = ["weekendRate", "weekendrate", "weekendPrice", "weekendprice"];
export const BOOKING_EXCLUDED_STATUSES = new Set([
  "failed",
  "cancelled",
  "canceled",
  "denied",
  "rejected",
]);
export const SELECTED_PROPERTY_STORAGE_PREFIX = "host-calendar:selected-property";

export const INITIAL_CALENDAR_SYNC_FORM = {
  calendarUrl: "",
  calendarName: "",
  calendarProvider: "auto",
};

export const normalizeCalendarProviderForForm = (value) => {
  const normalized = String(value || "auto")
    .trim()
    .toLowerCase();
  if (normalized === "airbnb" || normalized === "booking" || normalized === "generic") {
    return normalized;
  }
  return "auto";
};

export const getSelectedPropertyStorageKey = (hostId) =>
  `${SELECTED_PROPERTY_STORAGE_PREFIX}:${String(hostId || "").trim()}`;

export const readPersistedSelectedPropertyId = (hostId) => {
  const key = getSelectedPropertyStorageKey(hostId);
  if (!key || typeof window === "undefined" || !window?.localStorage) {
    return "";
  }
  try {
    return String(window.localStorage.getItem(key) || "").trim();
  } catch {
    return "";
  }
};

export const persistSelectedPropertyId = (hostId, propertyId) => {
  const key = getSelectedPropertyStorageKey(hostId);
  if (!key || typeof window === "undefined" || !window?.localStorage) {
    return;
  }
  try {
    const normalizedPropertyId = String(propertyId || "").trim();
    if (normalizedPropertyId) {
      window.localStorage.setItem(key, normalizedPropertyId);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {}
};

export const toInteger = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.trunc(numeric);
};

export const toPositiveInteger = (value, fallback = 0) => {
  const parsed = toInteger(value, fallback);
  return parsed > 0 ? parsed : fallback;
};

export const buildRestrictionValueMap = (availabilityRestrictions) =>
  new Map(
    (Array.isArray(availabilityRestrictions) ? availabilityRestrictions : [])
      .map((entry) => {
        const key = String(entry?.restriction || "").trim();
        if (!key) {
          return null;
        }
        return [key, toInteger(entry?.value, 0)];
      })
      .filter(Boolean)
  );

export const readRestrictionValue = (restrictionMap, key, fallback = 0) => {
  if (!restrictionMap.has(key)) {
    return fallback;
  }
  return toInteger(restrictionMap.get(key), fallback);
};

export const readFirstRestrictionValue = (restrictionMap, keys, fallback = 0) => {
  const safeKeys = Array.isArray(keys) ? keys : [];
  for (const key of safeKeys) {
    if (restrictionMap.has(key)) {
      return toInteger(restrictionMap.get(key), fallback);
    }
  }
  return fallback;
};

export const resolveFirstRestrictionKey = (restrictionMap, keys, fallback = null) => {
  const safeKeys = Array.isArray(keys) ? keys : [];
  for (const key of safeKeys) {
    if (restrictionMap.has(key)) {
      return key;
    }
  }
  return fallback;
};

export const readFirstPricingValue = (pricing, keys, fallback = 0) => {
  const safePricing = pricing && typeof pricing === "object" ? pricing : {};
  const safeKeys = Array.isArray(keys) ? keys : [];
  for (const key of safeKeys) {
    if (safePricing[key] !== undefined) {
      const parsed = toInteger(safePricing[key], fallback);
      if (parsed > 0) {
        return parsed;
      }
    }
  }
  return fallback;
};

export const normalizeDateNumber = (value) => {
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

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return Number(`${year}${month}${day}`);
};

export const normalizeAvailabilityRanges = (availability) =>
  (Array.isArray(availability) ? availability : [])
    .map((entry) => {
      const start = normalizeDateNumber(entry?.availableStartDate ?? entry?.availablestartdate);
      const end = normalizeDateNumber(entry?.availableEndDate ?? entry?.availableenddate);
      if (!start || !end) {
        return null;
      }
      return start <= end ? { start, end } : { start: end, end: start };
    })
    .filter(Boolean)
    .sort((left, right) => left.start - right.start);

export const keyToDateNumber = (key) => {
  if (typeof key !== "string") {
    return null;
  }
  const parts = key.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return year * 10000 + month * 100 + day;
};

export const keyToUtcDate = (key) => {
  if (typeof key !== "string") {
    return null;
  }
  const parts = key.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
};

export const utcDateToKey = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const UTC_DAY_IN_MS = 24 * 60 * 60 * 1000;

export const getKeyRangeInclusive = (startKey, endKey) => {
  const startDate = keyToUtcDate(startKey);
  const endDate = keyToUtcDate(endKey);
  if (!startDate || !endDate) {
    return [];
  }

  const from = startDate <= endDate ? startDate : endDate;
  const to = startDate <= endDate ? endDate : startDate;
  const keys = [];

  for (let cursorMs = from.getTime(); cursorMs <= to.getTime(); cursorMs += UTC_DAY_IN_MS) {
    keys.push(utcDateToKey(new Date(cursorMs)));
  }

  return keys;
};

const normalizeStatus = (value) => String(value || "").trim().toUpperCase();

export const resolveStatusTone = (status) => {
  if (normalizeStatus(status) === "ACTIVE") {
    return "ACTIVE";
  }
  if (normalizeStatus(status) === "ARCHIVED") {
    return "ARCHIVED";
  }
  return "INACTIVE";
};

export const normalizeTimestampLike = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    const milliseconds = numeric > 1000000000000 ? numeric : numeric * 1000;
    const parsedDate = new Date(milliseconds);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  const parsedFromString = new Date(String(value));
  if (!Number.isNaN(parsedFromString.getTime())) {
    return parsedFromString;
  }
  return null;
};

export const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const isBookedStatus = (status) =>
  !BOOKING_EXCLUDED_STATUSES.has(String(status || "").trim().toLowerCase());

export const buildBookedDateMap = (bookingsPayload) => {
  const source = Array.isArray(bookingsPayload) ? bookingsPayload : [];
  const accumulator = {};

  source.forEach((propertyBookings) => {
    const propertyId = String(
      propertyBookings?.id || propertyBookings?.property_id || propertyBookings?.propertyId || ""
    ).trim();

    if (!propertyId) {
      return;
    }

    const reservations = Array.isArray(propertyBookings?.res?.response)
      ? propertyBookings.res.response
      : [];
    const dateKeys = new Set(accumulator[propertyId] || []);

    reservations.forEach((reservation) => {
      if (!isBookedStatus(reservation?.status)) {
        return;
      }

      const arrival = normalizeTimestampLike(
        reservation?.arrivaldate ?? reservation?.arrivalDate ?? reservation?.arrival_date
      );
      const departure = normalizeTimestampLike(
        reservation?.departuredate ?? reservation?.departureDate ?? reservation?.departure_date
      );
      if (!arrival || !departure) {
        return;
      }

      const from = startOfUtcDay(arrival);
      const toExclusive = startOfUtcDay(departure);
      if (toExclusive <= from) {
        dateKeys.add(utcDateToKey(from));
        return;
      }

      for (
        let cursorMs = from.getTime();
        cursorMs < toExclusive.getTime();
        cursorMs += UTC_DAY_IN_MS
      ) {
        dateKeys.add(utcDateToKey(new Date(cursorMs)));
      }
    });

    accumulator[propertyId] = Array.from(dateKeys);
  });

  return accumulator;
};

export const getListingLabel = (listing) => {
  const title = String(listing?.property?.title || "Untitled listing");
  const city = String(listing?.propertyLocation?.city || listing?.location?.city || "").trim();
  const country = String(listing?.propertyLocation?.country || listing?.location?.country || "").trim();
  const locationSuffix = [city, country].filter(Boolean).join(", ");
  return locationSuffix ? `${title} - ${locationSuffix}` : title;
};

export const buildListingOptions = (accommodations) =>
  (Array.isArray(accommodations) ? accommodations : [])
    .map((listing) => {
      const id = String(listing?.property?.id || "").trim();
      if (!id) {
        return null;
      }
      return {
        value: id,
        label: getListingLabel(listing),
        status: resolveStatusTone(listing?.property?.status),
      };
    })
    .filter(Boolean);

export const buildPricingSnapshot = (propertyDetails) => {
  const defaultPricingForm = createInitialPricingForm();
  const pricing = propertyDetails?.pricing || {};
  const restrictionMap = buildRestrictionValueMap(propertyDetails?.availabilityRestrictions);

  const nightlyRate = toPositiveInteger(
    pricing?.roomRate ?? pricing?.roomrate,
    defaultPricingForm.nightlyRate
  );
  const weekendRate = readFirstPricingValue(pricing, WEEKEND_PRICE_KEYS, nightlyRate);

  const minimumStay = Math.max(
    1,
    readRestrictionValue(
      restrictionMap,
      PRICING_RESTRICTION_KEYS.minimumStay,
      defaultPricingForm.minimumStay
    )
  );

  const maximumStayRaw = Math.max(
    0,
    readRestrictionValue(
      restrictionMap,
      PRICING_RESTRICTION_KEYS.maximumStay,
      defaultPricingForm.maximumStay
    )
  );

  return {
    nightlyRate,
    weekendRate,
    weeklyDiscountPercent: Math.max(
      0,
      readRestrictionValue(restrictionMap, PRICING_RESTRICTION_KEYS.weeklyDiscountPercent, 0)
    ),
    monthlyDiscountPercent: Math.max(
      0,
      readRestrictionValue(restrictionMap, PRICING_RESTRICTION_KEYS.monthlyDiscountPercent, 0)
    ),
    minimumStay,
    maximumStay: maximumStayRaw === 0 ? 0 : Math.max(minimumStay, maximumStayRaw),
    advanceNoticeDays: Math.max(
      0,
      readFirstRestrictionValue(restrictionMap, ADVANCE_NOTICE_RESTRICTION_KEYS, 0)
    ),
    maximumAdvanceDays: Math.max(
      0,
      readFirstRestrictionValue(restrictionMap, MAX_ADVANCE_NOTICE_RESTRICTION_KEYS, 365)
    ),
    preparationTimeDays: Math.max(
      0,
      readFirstRestrictionValue(restrictionMap, PREPARATION_TIME_RESTRICTION_KEYS, 0)
    ),
  };
};

export const mergeAvailabilityRestrictions = (existingRestrictions, updates) => {
  const existing = Array.isArray(existingRestrictions) ? existingRestrictions : [];
  const nextByRestriction = new Map(
    existing
      .map((entry) => {
        const restriction = String(entry?.restriction || "").trim();
        if (!restriction) {
          return null;
        }
        return [
          restriction,
          {
            ...entry,
            restriction,
            value: toInteger(entry?.value, 0),
          },
        ];
      })
      .filter(Boolean)
  );

  (Array.isArray(updates) ? updates : []).forEach((entry) => {
    const restriction = String(entry?.restriction || "").trim();
    if (!restriction) {
      return;
    }
    nextByRestriction.set(restriction, {
      ...(nextByRestriction.get(restriction) || {}),
      restriction,
      value: Math.max(0, toInteger(entry?.value, 0)),
    });
  });

  return Array.from(nextByRestriction.values());
};

const clampInteger = (value, fallback, minimum, maximum) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const truncated = Math.trunc(numeric);
  if (truncated < minimum) {
    return minimum;
  }
  if (truncated > maximum) {
    return maximum;
  }
  return truncated;
};

export const normalizeAvailabilitySettingsForm = (form) => {
  const minimumStay = clampInteger(form?.minimumStay, 1, 1, 365);
  const maximumStayRaw = clampInteger(form?.maximumStay, 0, 0, 365);
  const maximumStay = maximumStayRaw === 0 ? 0 : Math.max(minimumStay, maximumStayRaw);
  const advanceNoticeDays = clampInteger(form?.advanceNoticeDays, 0, 0, 365);
  const preparationTimeDays = clampInteger(form?.preparationTimeDays, 0, 0, 30);
  const availabilityWindowDays = clampInteger(form?.availabilityWindowDays, 365, 1, 730);

  return {
    minimumStay,
    maximumStay,
    advanceNoticeDays,
    preparationTimeDays,
    availabilityWindowDays,
  };
};

export const buildComparablePricingSettings = (form) => ({
  nightlyRate: toInteger(form?.nightlyRate, 0),
  weeklyDiscountEnabled: Boolean(form?.weeklyDiscountEnabled),
  weeklyDiscountPercent: Boolean(form?.weeklyDiscountEnabled)
    ? Math.max(0, toInteger(form?.weeklyDiscountPercent, 0))
    : 0,
  monthlyDiscountEnabled: Boolean(form?.monthlyDiscountEnabled),
  monthlyDiscountPercent: Boolean(form?.monthlyDiscountEnabled)
    ? Math.max(0, toInteger(form?.monthlyDiscountPercent, 0))
    : 0,
});

export const getAvailabilityWindowOptionsWithCurrent = (currentValue) => {
  const normalizedCurrentValue = Number(currentValue);
  if (!Number.isFinite(normalizedCurrentValue)) {
    return AVAILABILITY_WINDOW_OPTIONS;
  }
  const hasCurrentValue = AVAILABILITY_WINDOW_OPTIONS.some(
    (option) => option.value === Math.trunc(normalizedCurrentValue)
  );
  if (hasCurrentValue) {
    return AVAILABILITY_WINDOW_OPTIONS;
  }

  const currentDays = Math.max(1, Math.trunc(normalizedCurrentValue));
  return [
    ...AVAILABILITY_WINDOW_OPTIONS,
    {
      label: currentDays === 1 ? "1 day" : `${currentDays} days`,
      value: currentDays,
    },
  ].sort((left, right) => left.value - right.value);
};
