import { sendUnifiedMessage } from "../../hostmessages/services/messagingService";

const VISITOR_ID_STORAGE_KEY = "domits_standalone_visitor_id";

const cleanText = (value) => String(value || "").trim();

const createVisitorId = () => {
  if (globalThis.crypto?.randomUUID) {
    return `visitor-${globalThis.crypto.randomUUID()}`;
  }

  return `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getOrCreateVisitorId = () => {
  const storage = globalThis.localStorage;
  if (!storage) {
    return createVisitorId();
  }

  const existingVisitorId = cleanText(storage.getItem(VISITOR_ID_STORAGE_KEY));
  if (existingVisitorId) {
    return existingVisitorId;
  }

  const nextVisitorId = createVisitorId();
  storage.setItem(VISITOR_ID_STORAGE_KEY, nextVisitorId);
  return nextVisitorId;
};

export const sendWebsiteContactMessage = async ({ model, name, email, message }) => {
  const hostId = cleanText(model?.source?.hostId);
  const propertyId = cleanText(model?.source?.propertyId);
  const content = cleanText(message);

  if (!hostId) {
    throw new Error("This website does not have a host contact target yet.");
  }

  if (!content) {
    throw new Error("Write a message before sending.");
  }

  const visitorId = getOrCreateVisitorId();
  const visitorName = cleanText(name) || "Website visitor";
  const visitorEmail = cleanText(email);
  const threadId = [hostId, visitorId, propertyId].filter(Boolean).join("_");
  const contactContext = [
    `From: ${visitorName}`,
    visitorEmail ? `Email: ${visitorEmail}` : "",
    propertyId ? `Property: ${propertyId}` : "",
  ].filter(Boolean);

  return sendUnifiedMessage({
    senderId: visitorId,
    recipientId: hostId,
    content: `${content}\n\n${contactContext.join("\n")}`.trim(),
    propertyId: propertyId || null,
    threadId,
    hostId,
    guestId: visitorId,
    metadata: {
      isAutomated: false,
      source: "STANDALONE_WEBSITE_WIDGET",
      visitorName,
      visitorEmail: visitorEmail || null,
    },
    platform: "DOMITS",
  });
};
