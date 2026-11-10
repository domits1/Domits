import { randomUUID } from "node:crypto";
import { findCountryAlpha3 } from "./truviCountries.js";

export const SCREENING_STATUS = {
  Approved: "PASSED",
  Flagged: "FLAGGED",
  Rejected: "FAILED",
};

export const DEFAULT_CHANNEL = "Direct web";

const ALLOWED_EXTENDED_AMOUNTS = [250, 500, 1000, 10000, 50000];

export function toCountryAlpha3(country) {
  const code = findCountryAlpha3(country);
  if (!code) {
    throw new Error(`Unsupported country for Truvi: ${country}`);
  }
  return code;
}

function petsAllowedFromRules(rules = []) {
  return rules.some((r) => r?.rule === "PetsAllowed" && r?.value === true);
}

function toIsoDate(epochMs) {
  return new Date(Number(epochMs)).toISOString().slice(0, 10);
}

function toTruviTimestamp(date) {
  return date.toISOString().slice(0, 22);
}

function splitName(fullName = "") {
  const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    throw new Error("Guest needs a first and a last name");
  }
  const firstName = parts.shift();
  return { firstName, lastName: parts.join(" ") };
}

export function bookingToCreateRequest({
  booking,
  property,
  location,
  rules = [],
  host,
  protection,
  channel = DEFAULT_CHANNEL,
  now = new Date(),
}) {
  if (!ALLOWED_EXTENDED_AMOUNTS.includes(protection.extendedAmount)) {
    throw new Error(`extendedAmount must be one of ${ALLOWED_EXTENDED_AMOUNTS.join(", ")}`);
  }
  if (!booking.guest_email && !booking.guest_phone) {
    throw new Error("Guest needs an email or a phone number");
  }

  const { firstName, lastName } = splitName(booking.guestname);
  const guest = { firstName, lastName };
  if (booking.guest_email) guest.email = booking.guest_email;
  if (booking.guest_phone) guest.telephoneNumber = booking.guest_phone;

  const address = {
    addressLine1: `${location.street} ${location.housenumber}${location.housenumberextension || ""}`,
    town: location.city,
    countryIso: toCountryAlpha3(location.country),
    postcode: location.postalcode,
  };

  return {
    metadata: { timeStamp: toTruviTimestamp(now), echoToken: randomUUID() },
    company: { name: host.name, email: host.email },
    listing: {
      listingId: property.id,
      listingName: property.title,
      petsAllowed: petsAllowedFromRules(rules),
      address,
    },
    reservation: {
      reservationId: booking.id,
      checkIn: toIsoDate(booking.arrivaldate),
      checkOut: toIsoDate(booking.departuredate),
      channel,
      creationDate: toIsoDate(booking.createdat),
    },
    guest,
    protection: { type: "Complete Protection", extendedAmount: protection.extendedAmount },
  };
}

function errorResult(message) {
  return { providerAssessmentId: null, status: "ERROR", flaggedReason: null, error: { status: null, message } };
}

export function mapCreateResponse(response) {
  const verification = response?.verification;
  if (!verification) {
    return errorResult("Truvi response has no verification");
  }

  const { verificationId, status, flaggedReason } = verification;
  const domitsStatus = SCREENING_STATUS[status];
  if (!domitsStatus) {
    return { ...errorResult(`Unknown Truvi status: ${status}`), providerAssessmentId: verificationId ?? null };
  }

  return {
    providerAssessmentId: verificationId,
    status: domitsStatus,
    flaggedReason: flaggedReason ?? null,
  };
}