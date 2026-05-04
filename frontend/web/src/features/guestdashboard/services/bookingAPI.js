import { getAccessToken } from "../../../services/getAccessToken";

export const API_FETCH_BOOKINGS =
  "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=guest";
export const API_BOOKINGS_BASE =
  process.env.REACT_APP_BOOKINGS_API_BASE ||
  "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings";

export const API_LISTING_DETAILS_BASE =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails";
export const API_BOOKING_DETAILS_BASE =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/booking";

export const buildListingDetailsUrl = (propertyId) =>
  `${API_LISTING_DETAILS_BASE}?property=${encodeURIComponent(propertyId)}`;
export const buildBookingDetailsUrl = (bookingId) =>
  `${API_BOOKING_DETAILS_BASE}?bookingId=${encodeURIComponent(bookingId)}`;
export const buildCancelBookingUrl = (bookingId) => `${API_BOOKINGS_BASE}/${encodeURIComponent(bookingId)}/cancel`;

const parseJsonResponse = async (response) => {
  const responseText = await response.text().catch(() => "");

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
};

/**
 * Fetch guest bookings
 */
export async function getGuestBookings(guestId) {
  const requestUrl = new URL(API_FETCH_BOOKINGS);
  requestUrl.searchParams.set("guestId", guestId);

  const response = await fetch(requestUrl.toString(), {
    method: "GET",
    headers: {
      Authorization: await getAccessToken(),
    },
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(`Fetch failed: ${response.status} ${response.statusText} ${responseText}`.trim());
  }

  return parseJsonResponse(response);
}

export async function getGuestBookingPropertyDetails(bookingId) {
  const response = await fetch(buildBookingDetailsUrl(bookingId), {
    method: "GET",
    headers: {
      Authorization: getAccessToken(),
    },
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(`Fetch failed: ${response.status} ${response.statusText} ${responseText}`.trim());
  }

  return parseJsonResponse(response);
}

export async function cancelGuestBooking(bookingId) {
  if (!bookingId) {
    throw new Error("Booking id is required to cancel a booking.");
  }

  const response = await fetch(buildCancelBookingUrl(bookingId), {
    method: "PATCH",
    headers: {
      Authorization: await getAccessToken(),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(`Cancel booking failed: ${response.status} ${response.statusText} ${responseText}`.trim());
  }

  return parseJsonResponse(response);
}
