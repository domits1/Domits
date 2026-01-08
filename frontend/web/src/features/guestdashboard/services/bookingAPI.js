import { getAccessToken } from "../../../services/getAccessToken";

export const API_FETCH_BOOKINGS =
  "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=guest";

export const API_LISTING_DETAILS_BASE =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails";

export const buildListingDetailsUrl = (propertyId) =>
  `${API_LISTING_DETAILS_BASE}?property=${encodeURIComponent(propertyId)}`;

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

  const bookingData = await response.json().catch(async () => {
    const fallbackText = await response.text();
    try {
      return JSON.parse(fallbackText);
    } catch {
      return fallbackText;
    }
  });

  return bookingData;
}
