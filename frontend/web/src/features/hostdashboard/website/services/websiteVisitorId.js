const DIRECT_BOOKING_WEBSITE_VISITOR_ID_STORAGE_KEY = "domits_direct_booking_website_visitor_id";
const LEGACY_STANDALONE_VISITOR_ID_STORAGE_KEY = "domits_standalone_visitor_id";

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

// Anonymous, per-browser identity for public direct booking website visitors.
// It is a correlation id for quote sessions, never an authenticated identity.
export const getOrCreateVisitorId = () => {
  let storage = null;
  try {
    storage = globalThis.localStorage;
  } catch {
    storage = null;
  }
  if (!storage) {
    return createVisitorId();
  }

  const existingVisitorId = cleanText(
    storage.getItem(DIRECT_BOOKING_WEBSITE_VISITOR_ID_STORAGE_KEY) ||
      storage.getItem(LEGACY_STANDALONE_VISITOR_ID_STORAGE_KEY)
  );
  if (existingVisitorId) {
    storage.setItem(DIRECT_BOOKING_WEBSITE_VISITOR_ID_STORAGE_KEY, existingVisitorId);
    return existingVisitorId;
  }

  const nextVisitorId = createVisitorId();
  storage.setItem(DIRECT_BOOKING_WEBSITE_VISITOR_ID_STORAGE_KEY, nextVisitorId);
  return nextVisitorId;
};
