import { sendUnifiedMessage } from "../../hostmessages/services/messagingService";

const VISITOR_ID_STORAGE_KEY = "domits_standalone_visitor_id";

const cleanText = (value) => String(value || "").trim();

let fallbackVisitorIdSequence = 0;

const createRandomVisitorSegment = () => {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    fallbackVisitorIdSequence += 1;
    return `${Date.now()}-${fallbackVisitorIdSequence}`;
  }

  const randomBytes = new Uint32Array(4);
  cryptoApi.getRandomValues(randomBytes);
  return Array.from(randomBytes, (value) => value.toString(16).padStart(8, "0")).join("");
};

const createVisitorId = () => {
  if (globalThis.crypto?.randomUUID) {
    return `visitor-${globalThis.crypto.randomUUID()}`;
  }

  return `visitor-${createRandomVisitorSegment()}`;
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
