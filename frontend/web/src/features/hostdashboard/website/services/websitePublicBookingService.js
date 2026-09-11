const DEFAULT_BOOKINGS_API_BASE = "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development";
const BOOKING_SESSION_SOURCE = "standalone_site";

const stripTrailingSlashes = (value) => {
  let normalized = String(value || "");
  while (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
};

export const DIRECT_BOOKING_WEBSITE_BOOKINGS_API_BASE = stripTrailingSlashes(
  process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_BOOKINGS_API_BASE || DEFAULT_BOOKINGS_API_BASE
);

export const WEBSITE_PUBLIC_BOOKING_CLIENT_ERROR_CODES = Object.freeze({
  NETWORK_ERROR: "network_error",
  RATE_LIMITED: "rate_limited",
  UNEXPECTED_RESPONSE: "unexpected_response",
});

export class WebsitePublicBookingError extends Error {
  constructor({ code, message = "", status = 0, requestId = "" }) {
    super(message);
    this.name = "WebsitePublicBookingError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export const buildPublicSiteBookingsUrl = (siteId) =>
  `${DIRECT_BOOKING_WEBSITE_BOOKINGS_API_BASE}/public/sites/${encodeURIComponent(String(siteId || "").trim())}/bookings`;

const parseJsonSafely = (rawBody) => {
  try {
    return rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return null;
  }
};

const unexpectedResponse = (status) =>
  new WebsitePublicBookingError({
    code: WEBSITE_PUBLIC_BOOKING_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
    message: "The booking service returned an unexpected response.",
    status,
  });

const normalizePublicSiteBooking = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const publicBookingRef = String(payload.publicBookingRef || "").trim();
  const total = Number(payload.total);
  if (!publicBookingRef || !Number.isFinite(total)) {
    return null;
  }

  return {
    publicBookingRef,
    status: String(payload.status || ""),
    siteId: String(payload.siteId || ""),
    checkIn: String(payload.checkIn || ""),
    checkOut: String(payload.checkOut || ""),
    guests: Number.isFinite(Number(payload.guests)) ? Number(payload.guests) : 0,
    total,
    currency: String(payload.currency || "EUR"),
  };
};

export const requestPublicSiteBooking = async ({ siteId, quoteToken, guest, sessionId, idempotencyKey, signal }) => {
  let response;
  try {
    response = await fetch(buildPublicSiteBookingsUrl(siteId), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      cache: "no-store",
      signal,
      body: JSON.stringify({
        quoteToken,
        guest: { name: guest?.name, email: guest?.email },
        session: { sessionId, source: BOOKING_SESSION_SOURCE },
      }),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    throw new WebsitePublicBookingError({
      code: WEBSITE_PUBLIC_BOOKING_CLIENT_ERROR_CODES.NETWORK_ERROR,
      message: "The booking request could not reach the server.",
    });
  }

  const payload = parseJsonSafely(await response.text());

  if (!response.ok) {
    const errorBody = payload?.error;
    if (errorBody?.code) {
      throw new WebsitePublicBookingError({
        code: String(errorBody.code),
        message: String(errorBody.message || ""),
        status: response.status,
        requestId: String(errorBody.requestId || ""),
      });
    }
    if (response.status === 429) {
      throw new WebsitePublicBookingError({
        code: WEBSITE_PUBLIC_BOOKING_CLIENT_ERROR_CODES.RATE_LIMITED,
        message: "Too many booking requests.",
        status: response.status,
      });
    }
    throw unexpectedResponse(response.status);
  }

  const booking = normalizePublicSiteBooking(payload);
  if (!booking) {
    throw unexpectedResponse(response.status);
  }

  return booking;
};
