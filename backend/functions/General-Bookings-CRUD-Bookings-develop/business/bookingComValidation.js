import TypeException from "../util/exception/TypeException.js";

const ISO_4217_REGEX = /^[A-Z]{3}$/;

/**
 * Simple helper to parse a date string and return epoch ms, or NaN.
 *
 * @param {string|undefined|null} value
 * @returns {number}
 */
function parseDateToMs(value) {
  if (!value) {
    return Number.NaN;
  }
  const date = new Date(value);
  return date.getTime();
}

/**
 * Validate that the given value is a plausible ISO 4217 currency code.
 *
 * @param {string|undefined|null} value
 * @returns {boolean}
 */
function isValidCurrency(value) {
  if (!value || typeof value !== "string") {
    return false;
  }
  return ISO_4217_REGEX.test(value.toUpperCase());
}

/**
 * Validate a raw Booking.com payload and either return it (for mapping)
 * or throw a TypeException with details when invalid.
 *
 * Note: This performs minimal, Booking.com-specific checks required by
 * the canonical mapping layer. It intentionally does not try to fully
 * validate the entire Booking.com schema.
 *
 * @param {any} payload
 * @returns {any} - The same payload, for caller convenience.
 * @throws {TypeException}
 */
export function validateBookingComPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    throw new TypeException("Booking.com payload must be a non-null object.");
  }

  // reservation_id
  if (!payload.reservation_id && !payload.id) {
    errors.push("Missing required field: reservation_id.");
  }

  // arrival/departure dates
  const arrivalRaw = payload.arrival_date;
  const departureRaw = payload.departure_date;

  if (!arrivalRaw) {
    errors.push("Missing required field: arrival_date.");
  }
  if (!departureRaw) {
    errors.push("Missing required field: departure_date.");
  }

  const arrivalMs = parseDateToMs(arrivalRaw);
  const departureMs = parseDateToMs(departureRaw);

  if (!Number.isNaN(arrivalMs) && !Number.isNaN(departureMs)) {
    if (arrivalMs >= departureMs) {
      errors.push("arrival_date must be before departure_date.");
    }
  } else {
    if (Number.isNaN(arrivalMs)) {
      errors.push("arrival_date is not a valid date.");
    }
    if (Number.isNaN(departureMs)) {
      errors.push("departure_date is not a valid date.");
    }
  }

  // status (present but not necessarily within known set)
  if (!payload.status) {
    errors.push("Missing required field: status.");
  }

  // price & currency
  const total =
    payload.total_price ??
    payload.total_price_including_tax ??
    payload.total ??
    payload.price;

  if (total === undefined || total === null || total === "") {
    errors.push("Missing required price field: total_price / total / price.");
  } else if (Number.isNaN(Number(total))) {
    errors.push("Price field must be numeric.");
  }

  const currency =
    payload.currency_code ??
    payload.charged_currency ??
    payload.currency ??
    null;

  if (!currency) {
    errors.push(
      "Missing required currency field: currency_code / charged_currency / currency."
    );
  } else if (!isValidCurrency(currency)) {
    errors.push(
      `Currency '${currency}' is not a valid ISO 4217 code (expected 3-letter uppercase).`
    );
  }

  if (errors.length > 0) {
    const error = new TypeException("Invalid Booking.com payload.");
    error.details = { errors };
    throw error;
  }

  return payload;
}

export default validateBookingComPayload;

