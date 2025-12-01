import { getAccessToken } from "../../../services/getAccessToken";

const API_BASE = "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings";

const API_LISTING_DETAILS =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails";

export async function getGuestBookings(guestId) {
  const requestUrl = new URL(`${API_BASE}?readType=guest`);
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

  const BookingData = await response.json().catch(async () => {
    const fallbackText = await response.text();
    try {
      return JSON.parse(fallbackText);
    } catch {
      return fallbackText;
    }
  });

  return BookingData;
}

export async function getBookingByPaymentId(paymentId) {
  const response = await fetch(`${API_BASE}?readType=paymentId&paymentID=${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      Authorization: await getAccessToken(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch booking: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function getPropertyDetails(propertyId) {
  const response = await fetch(`${API_LISTING_DETAILS}?property=${encodeURIComponent(propertyId)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch property details: ${response.statusText}`);
  }

  return response.json();
}
