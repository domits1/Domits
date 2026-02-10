const UNIFIED_MESSAGING_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";
const ACCOMMODATION_API_BASE = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";

export async function getThreadByParticipants({ hostId, guestId }) {
  if (!hostId || !guestId) throw new Error("hostId and guestId are required");

  // Try host view first
  let res = await fetch(`${UNIFIED_MESSAGING_API}/threads?userId=${hostId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (res.ok) {
    const threads = await res.json();
    const match = (Array.isArray(threads) ? threads : []).find(
      (t) => t?.hostId === hostId && t?.guestId === guestId
    );
    if (match) return match;
  }

  // Fallback: guest view
  res = await fetch(`${UNIFIED_MESSAGING_API}/threads?userId=${guestId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (res.ok) {
    const threads = await res.json();
    const match = (Array.isArray(threads) ? threads : []).find(
      (t) => t?.hostId === hostId && t?.guestId === guestId
    );
    if (match) return match;
  }

  return null;
}

export async function getMessagesByThreadId(threadId) {
  if (!threadId) throw new Error("threadId is required");
  const res = await fetch(`${UNIFIED_MESSAGING_API}/messages?threadId=${threadId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Failed to fetch messages: ${res.status} ${t}`);
  }
  return res.json();
}

export async function sendUnifiedMessage({
  senderId,
  recipientId,
  propertyId = null,
  content,
  platform = "DOMITS",
  metadata = {},
  attachments = null,
  threadId = null,
}) {
  if (!senderId || !recipientId) throw new Error("senderId and recipientId are required");
  if (!content?.trim() && !(Array.isArray(attachments) && attachments.length > 0)) {
    throw new Error("Message content cannot be empty (unless sending attachments)");
  }

  const res = await fetch(`${UNIFIED_MESSAGING_API}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      senderId,
      recipientId,
      propertyId,
      content,
      platform,
      metadata,
      attachments,
      threadId,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Failed to send message: ${res.status} ${t}`);
  }

  return res.json();
}

export async function getGuestBookingDetails(hostId, guestId) {
  const thread = await getThreadByParticipants({ hostId, guestId });
  if (!thread?.id) throw new Error("No thread found for host/guest");
  const messages = await getMessagesByThreadId(thread.id);
  return Array.isArray(messages) ? messages : [];
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