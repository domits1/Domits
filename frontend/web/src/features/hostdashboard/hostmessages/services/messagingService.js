const UNIFIED_MESSAGING_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";
const ACCOMMODATION_API_BASE = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";

export async function getGuestBookingDetails(hostId, guestId) {
  const threadId1 = `${hostId}-${guestId}`;
  const threadId2 = `${guestId}-${hostId}`;
  
  try {
    let response = await fetch(`${UNIFIED_MESSAGING_API}/messages?threadId=${threadId1}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    
    if (!response.ok) {
      response = await fetch(`${UNIFIED_MESSAGING_API}/messages?threadId=${threadId2}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
    }
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.warn("Failed to fetch booking details from UnifiedMessaging:", error);
  }
  
  throw new Error("Failed to fetch booking details");
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


