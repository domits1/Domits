const UNIFIED_MESSAGING_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";
const ACCOMMODATION_API_BASE = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";
const GUEST_BOOKINGS_API =
  "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=guest";
const BOOKING_DETAILS_API_BASE =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/booking";

export class MessagingAuthenticationError extends Error {
  constructor(message = "Authentication token is required.") {
    super(message);
    this.name = "MessagingAuthenticationError";
    this.code = "AUTH_TOKEN_REQUIRED";
  }
}

export const requireMessagingToken = (token) => {
  const normalized = String(token || "").trim();
  if (!normalized) throw new MessagingAuthenticationError();
  return normalized;
};

const buildAuthHeaders = (token = null, { requireAuth = false } = {}) => {
  const normalizedToken = requireAuth ? requireMessagingToken(token) : String(token || "").trim();

  return {
    "Content-Type": "application/json",
    ...(normalizedToken ? { Authorization: `Bearer ${normalizedToken}` } : {}),
  };
};

const buildRawAuthHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: requireMessagingToken(token),
});

const parseJsonResponse = async (response) => {
  const text = await response.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const normalizeBookingsResponse = (bookingData) => {
  if (Array.isArray(bookingData)) return bookingData;
  if (Array.isArray(bookingData?.data)) return bookingData.data;
  if (Array.isArray(bookingData?.response)) return bookingData.response;
  if (typeof bookingData?.body === "string") {
    try {
      const parsed = JSON.parse(bookingData.body);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.response)) return parsed.response;
      if (Array.isArray(parsed?.data)) return parsed.data;
    } catch {
      return [];
    }
  }
  return [];
};

const getBookingId = (booking) =>
  booking?.id || booking?.ID || booking?.bookingId || booking?.booking_id || booking?.paymentid || booking?.paymentId || null;

export const getBookingPropertyId = (booking) =>
  booking?.property_id || booking?.propertyId || booking?.PropertyID || booking?.property?.id || booking?.property?.ID || null;

export async function getGuestBookingDetailsByBookingId({ bookingId, guestId = null, token = null }) {
  if (!bookingId) throw new Error("bookingId is required.");
  const authToken = requireMessagingToken(token);

  const requestUrl = new URL(GUEST_BOOKINGS_API);
  if (guestId) requestUrl.searchParams.set("guestId", guestId);

  const bookingsResponse = await fetch(requestUrl.toString(), {
    method: "GET",
    headers: buildRawAuthHeaders(authToken),
  });

  if (!bookingsResponse.ok) {
    throw new Error(`Failed to fetch guest bookings: ${bookingsResponse.status}`);
  }

  const bookingsPayload = await parseJsonResponse(bookingsResponse);
  const booking = normalizeBookingsResponse(bookingsPayload).find(
    (candidate) => String(getBookingId(candidate) || "") === String(bookingId)
  );

  if (!booking) {
    throw new Error("Booking not found.");
  }

  const accommodation = await getAccommodationByBookingId(bookingId, authToken);
  return { bookingDetails: booking, accommodation };
}

export async function getGuestBookingDetails(hostId, guestId, token = null, { bookingId = null } = {}) {
  const { bookingDetails } = await getGuestBookingDetailsByBookingId({ bookingId, guestId, token });
  return bookingDetails;
}

export async function getAccommodationByBookingId(bookingId, token) {
  const authToken = requireMessagingToken(token);
  const response = await fetch(`${BOOKING_DETAILS_API_BASE}?bookingId=${encodeURIComponent(bookingId)}`, {
    method: "GET",
    headers: buildRawAuthHeaders(authToken),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch booking accommodation");
  }

  return parseJsonResponse(response);
}

export async function getAccommodationByPropertyId(accommodationEndpoint, propertyId, token) {
  const response = await fetch(`${ACCOMMODATION_API_BASE}/${accommodationEndpoint}?property=${propertyId}`, {
    method: "GET",
    headers: {
      Authorization: token,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch accommodation");
  }
  return response.json();
}

const guessFileType = (url = "") => {
  const lower = String(url).toLowerCase();
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif")
  ) {
    return "image";
  }
  if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) {
    return "video";
  }
  if (lower.endsWith(".pdf")) {
    return "document";
  }
  return "file";
};

export async function sendUnifiedMessage({
  senderId,
  recipientId,
  content,
  propertyId = null,
  threadId = null,
  bookingId = null,
  fileUrls = [],
  hostId = null,
  guestId = null,
  metadata = { isAutomated: false },
  platform = "DOMITS",
  integrationAccountId = null,
  externalThreadId = null,
  token = null,
}) {
  const attachments =
    Array.isArray(fileUrls) && fileUrls.length > 0
      ? fileUrls.map((url) => ({
          url,
          type: guessFileType(url),
          name: null,
        }))
      : null;

  const payload = {
    senderId,
    recipientId,
    propertyId,
    threadId,
    bookingId,
    hostId,
    guestId,
    content,
    platform,
    metadata,
    attachments,
    integrationAccountId,
    externalThreadId,
  };

  const res = await fetch(`${UNIFIED_MESSAGING_API}/send`, {
    method: "POST",
    headers: buildAuthHeaders(token, { requireAuth: true }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`UnifiedMessaging /send failed: ${res.status} ${txt}`);
  }

  return res.json();
}
