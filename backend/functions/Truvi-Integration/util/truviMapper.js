import { randomUUID } from "crypto";

export const SCREENING_STATUS = {
  Approved: "PASSED",
  Flagged: "FLAGGED",
  Rejected: "FAILED",
};

const ALLOWED_EXTENDED_AMOUNTS = [250, 500, 1000, 10000, 50000];

function toIsoDate(epochMs) {
  return new Date(Number(epochMs)).toISOString().slice(0, 10);
}

function toTruviTimestamp(date) {
  return date.toISOString().slice(0, 22);
}

function splitName(fullName = "") {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() || "";
  return { firstName, lastName: parts.join(" ") };
}

export function bookingToCreateRequest({ booking, property, location, host, protection, now = new Date() }) {
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
    countryIso: location.countryIso,
    postcode: location.postalcode,
  };

  return {
    metadata: { timeStamp: toTruviTimestamp(now), echoToken: randomUUID() },
    company: { name: host.name, email: host.email },
    listing: {
      listingId: property.id,
      listingName: property.title,
      petsAllowed: Boolean(property.petsAllowed),
      address,
    },
    reservation: {
      reservationId: booking.id,
      checkIn: toIsoDate(booking.arrivaldate),
      checkOut: toIsoDate(booking.departuredate),
      channel: "Direct web",
      creationDate: toIsoDate(booking.createdat),
    },
    guest,
    protection: { type: "Complete Protection", extendedAmount: protection.extendedAmount },
  };
}

export function mapCreateResponse(response) {
  const { verificationId, status, flaggedReason } = response.verification;
  return {
    providerAssessmentId: verificationId,
    status: SCREENING_STATUS[status] ?? "ERROR",
    flaggedReason: flaggedReason ?? null,
  };
}
