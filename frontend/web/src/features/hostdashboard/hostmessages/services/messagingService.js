const BOOKING_DETAILS_API = "https://912b02rvk4.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-GuestBookingDetails";
const ACCOMMODATION_API_BASE = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";

export async function getGuestBookingDetails(hostId, guestId) {
  const response = await fetch(`${BOOKING_DETAILS_API}?hostId=${hostId}&guestId=${guestId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch booking details");
  }
  return response.json();
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


