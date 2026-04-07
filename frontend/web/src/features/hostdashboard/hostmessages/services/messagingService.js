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
  fileUrls = [],
  hostId = null,
  guestId = null,
  metadata = { isAutomated: false },
  platform = "DOMITS",
  integrationAccountId = null,
  externalThreadId = null,
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`UnifiedMessaging /send failed: ${res.status} ${txt}`);
  }

  return res.json();
}