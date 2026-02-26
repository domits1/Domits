import {
  ReservationStatus,
  CancellationType,
  Channel,
  BOOKING_COM_MAPPING_VERSION,
} from "../../business/bookingComCanonicalModel.js";
import { validateBookingComPayload } from "../../business/bookingComValidation.js";

/**
 * Normalize raw Booking.com reservation status to canonical ReservationStatus.
 *
 * @param {string} rawStatus
 * @returns {string}
 */
export function normalizeBookingComStatus(rawStatus) {
  if (!rawStatus || typeof rawStatus !== "string") {
    return ReservationStatus.UNKNOWN;
  }

  const normalized = rawStatus.toUpperCase().trim();

  switch (normalized) {
    case "BOOKED":
    case "CONFIRMED":
      return ReservationStatus.CONFIRMED;
    case "CANCELLED":
    case "CANCELLED_BY_GUEST":
    case "CANCELLED_BY_PARTNER":
      return ReservationStatus.CANCELLED;
    case "NO_SHOW":
      return ReservationStatus.NO_SHOW;
    case "PENDING":
    case "ON_REQUEST":
      return ReservationStatus.PENDING;
    default:
      return ReservationStatus.UNKNOWN;
  }
}

/**
 * Convert a Booking.com date string (often YYYY-MM-DD or ISO) to ISO 8601.
 *
 * @param {string|undefined|null} value
 * @returns {string}
 */
function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

/**
 * Safely coerce a numeric-like value to number or null.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

/**
 * Build canonical units from Booking.com payload.
 *
 * @param {any} payload
 * @param {string[]} warnings
 * @returns {Array<object>}
 */
function buildCanonicalUnits(payload, warnings) {
  const units = [];
  const rooms = Array.isArray(payload.rooms) ? payload.rooms : Array.isArray(payload.units) ? payload.units : [];

  for (const room of rooms) {
    units.push({
      externalId: room.id ?? room.room_id ?? null,
      name: room.name ?? room.room_name ?? null,
      occupancy: typeof room.occupancy === "number" ? room.occupancy : toNumberOrNull(room.occupancy),
      raw: room,
    });
  }

  if (units.length === 0) {
    // Minimal placeholder to keep shape predictable; not an error.
    warnings.push("No units/rooms provided in Booking.com payload; units array left empty.");
  }

  return units;
}

/**
 * Build canonical rate plan(s) from Booking.com payload.
 *
 * @param {any} payload
 * @param {string[]} warnings
 * @returns {{ primaryRatePlan: object|null, ratePlans: Array<object> }}
 */
function buildCanonicalRatePlans(payload, warnings) {
  const ratePlans = [];
  const rawRatePlans = Array.isArray(payload.rate_plans) ? payload.rate_plans : Array.isArray(payload.ratePlans) ? payload.ratePlans : [];

  for (const rp of rawRatePlans) {
    const type = rp.type ? String(rp.type).toUpperCase() : "UNKNOWN";
    ratePlans.push({
      externalId: rp.id ?? rp.rate_plan_id ?? null,
      name: rp.name ?? rp.rate_plan_name ?? null,
      type,
      raw: rp,
    });
  }

  if (ratePlans.length === 0 && (payload.rate_plan_id || payload.ratePlanId)) {
    // Construct a minimal rate plan from top-level fields.
    ratePlans.push({
      externalId: payload.rate_plan_id ?? payload.ratePlanId ?? null,
      name: payload.rate_plan_name ?? null,
      type: "UNKNOWN",
      raw: undefined,
    });
    warnings.push("Rate plan details not provided as array; constructed minimal UNKNOWN rate plan.");
  }

  const primaryRatePlan = ratePlans.length > 0 ? ratePlans[0] : null;

  return { primaryRatePlan, ratePlans };
}

/**
 * Build minimal availability windows from check-in/check-out and units.
 *
 * @param {string} checkInIso
 * @param {string} checkOutIso
 * @param {Array<object>} units
 * @returns {Array<object>}
 */
function buildAvailabilityWindows(checkInIso, checkOutIso, units) {
  if (!checkInIso || !checkOutIso) {
    return [];
  }

  if (!Array.isArray(units) || units.length === 0) {
    return [
      {
        startDate: checkInIso,
        endDate: checkOutIso,
        unitExternalId: null,
        raw: undefined,
      },
    ];
  }

  return units.map((unit) => ({
    startDate: checkInIso,
    endDate: checkOutIso,
    unitExternalId: unit.externalId ?? null,
    raw: undefined,
  }));
}

/**
 * Build canonical cancellation from Booking.com payload (if present).
 *
 * @param {any} payload
 * @param {string[]} warnings
 * @returns {object|null}
 */
function buildCanonicalCancellation(payload, warnings) {
  const rawCancellation = payload.cancellation ?? payload.cancellation_details ?? null;
  if (!rawCancellation && !payload.cancellation_type && !payload.cancelled) {
    return null;
  }

  const isPartial =
    rawCancellation?.partial === true ||
    rawCancellation?.type === "PARTIAL" ||
    payload.cancellation_type === "PARTIAL" ||
    Array.isArray(rawCancellation?.line_items);

  const type = isPartial ? CancellationType.PARTIAL : CancellationType.FULL;

  if (isPartial) {
    warnings.push("Detected partial cancellation in Booking.com payload.");
  }

  const effective =
    rawCancellation?.effective_date ??
    rawCancellation?.cancelled_at ??
    payload.cancellation_effective_date ??
    payload.updated_at ??
    payload.arrival_date;

  const reason =
    rawCancellation?.reason ??
    rawCancellation?.reason_code ??
    payload.cancellation_reason ??
    null;

  return {
    type,
    effectiveDate: toIsoDate(effective),
    reason,
    raw: rawCancellation ?? payload.cancellation ?? undefined,
  };
}

/**
 * Build canonical financial transaction from Booking.com payload.
 *
 * @param {any} payload
 * @param {string[]} warnings
 * @returns {object}
 */
function buildCanonicalFinancial(payload, warnings) {
  const totalAmount = toNumberOrNull(
    payload.total_price ??
      payload.total_price_including_tax ??
      payload.total ??
      payload.price
  );

  const taxAmount = toNumberOrNull(
    payload.tax_amount ??
      payload.taxes_total ??
      payload.total_tax_amount
  );

  const feesAmount = toNumberOrNull(
    payload.fees_amount ??
      payload.fee_total ??
      payload.extra_fees
  );

  const chargedCurrency =
    payload.currency_code ??
    payload.charged_currency ??
    payload.currency ??
    null;

  const originalCurrency =
    payload.original_currency ??
    payload.base_currency ??
    null;

  const originalAmount = toNumberOrNull(
    payload.original_amount ??
      payload.base_price
  );

  const multiCurrency =
    !!chargedCurrency &&
    !!originalCurrency &&
    chargedCurrency !== originalCurrency;

  if (multiCurrency) {
    warnings.push(
      "Multi-currency reservation detected; original and charged currencies differ."
    );
  }

  return {
    totalAmount,
    currency: chargedCurrency ?? null,
    taxAmount,
    feesAmount,
    multiCurrency,
    originalCurrency: originalCurrency ?? null,
    originalAmount,
    raw: payload.pricing ?? undefined,
  };
}

/**
 * Construct canonical guest from Booking.com payload.
 *
 * @param {any} payload
 * @param {string[]} warnings
 * @returns {object}
 */
function buildCanonicalGuest(payload, warnings) {
  const rawGuest = payload.guest ?? payload.primary_guest ?? null;
  const guestName =
    payload.guest_name ??
    rawGuest?.name ??
    rawGuest?.full_name ??
    payload.guest_full_name ??
    null;

  const email =
    payload.guest_email ??
    rawGuest?.email ??
    null;

  const phone =
    payload.guest_phone ??
    rawGuest?.phone ??
    rawGuest?.telephone ??
    null;

  const country =
    payload.guest_country ??
    rawGuest?.country ??
    rawGuest?.country_code ??
    null;

  let fullName = guestName;
  if (!fullName) {
    fullName = "Unknown Guest";
    warnings.push(
      "Missing guest_name in Booking.com payload; defaulted fullName to 'Unknown Guest'."
    );
  }

  return {
    fullName,
    email: email ?? null,
    phone: phone ?? null,
    country: country ?? null,
    raw: rawGuest ?? undefined,
  };
}

/**
 * Pure mapper from a (validated) Booking.com payload to canonical mapping.
 * This does not perform IO and is safe to unit-test.
 *
 * @param {any} validatedPayload - Output of validateBookingComPayload
 * @param {{ version?: string }} [options]
 * @returns {import("../../business/bookingComCanonicalModel.js").CanonicalBookingComMapping}
 */
export function mapBookingComPayloadToCanonical(validatedPayload, options = {}) {
  const payload = validatedPayload;
  const warnings = [];

  const version = options.version || BOOKING_COM_MAPPING_VERSION;
  const externalId =
    String(payload.reservation_id ?? payload.id ?? "").trim();

  const checkInIso = toIsoDate(payload.arrival_date);
  const checkOutIso = toIsoDate(payload.departure_date);

  const status = normalizeBookingComStatus(payload.status);

  const guest = buildCanonicalGuest(payload, warnings);
  const units = buildCanonicalUnits(payload, warnings);
  const { primaryRatePlan, ratePlans } = buildCanonicalRatePlans(
    payload,
    warnings
  );
  const availabilityWindows = buildAvailabilityWindows(
    checkInIso,
    checkOutIso,
    units
  );
  const financialTransaction = buildCanonicalFinancial(payload, warnings);
  const cancellation = buildCanonicalCancellation(payload, warnings);

  const createdAtIso = toIsoDate(
    payload.created_at ?? payload.creation_date ?? payload.arrival_date
  );
  const updatedAtIso = toIsoDate(
    payload.updated_at ?? payload.modification_date ?? createdAtIso
  );

  const meta = { warnings };

  const reservation = {
    externalId,
    channel: Channel.BOOKING_COM,
    version,
    propertyId: null,
    bookingId: null,
    checkInDate: checkInIso,
    checkOutDate: checkOutIso,
    status,
    units,
    ratePlan: primaryRatePlan,
    availabilityWindows,
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
    meta,
  };

  return {
    reservation,
    guest,
    financialTransaction,
    cancellation,
    property: payload.property ?? undefined,
    units,
    ratePlans,
    availabilityWindows,
    meta,
  };
}

/**
 * Convenience helper to validate and then map a raw Booking.com payload.
 * This keeps the mapper itself pure while giving callers a single entry-point.
 *
 * @param {any} rawPayload
 * @param {{ version?: string }} [options]
 * @returns {import("../../business/bookingComCanonicalModel.js").CanonicalBookingComMapping}
 */
export function validateAndMapBookingComPayload(rawPayload, options = {}) {
  const validated = validateBookingComPayload(rawPayload);
  return mapBookingComPayloadToCanonical(validated, options);
}

