import { getAccessToken } from "../../../services/getAccessToken";

export const API_FETCH_BOOKINGS =
  "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=guest";

export const API_LISTING_DETAILS_BASE =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails";
export const API_BOOKING_DETAILS_BASE =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/booking";

export const buildListingDetailsUrl = (propertyId) =>
  `${API_LISTING_DETAILS_BASE}?property=${encodeURIComponent(propertyId)}`;
export const buildBookingDetailsUrl = (bookingId) =>
  `${API_BOOKING_DETAILS_BASE}?bookingId=${encodeURIComponent(bookingId)}`;

const parseJsonResponse = async (response) =>
  response.json().catch(async () => {
    const fallbackText = await response.text();
    try {
      return JSON.parse(fallbackText);
    } catch {
      return fallbackText;
    }
  });

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
    throw new Error(
      `Fetch failed: ${response.status} ${response.statusText} ${responseText}`.trim()
    );
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
    throw new Error(
      `Fetch failed: ${response.status} ${response.statusText} ${responseText}`.trim()
    );
  }

  return parseJsonResponse(response);
}
