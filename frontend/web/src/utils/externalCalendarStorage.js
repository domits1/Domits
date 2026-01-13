const STORAGE_PREFIX = "domits:externalBlockedDates:v1";

const makeKey = ({ userId, propertyId }) =>
  `${STORAGE_PREFIX}:${String(userId)}:${String(propertyId)}`;

const normalizeYmd = (v) => {
  const s = String(v || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const getStorage = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export function saveExternalBlockedDates({ userId, propertyId, blockedSet }) {
  if (!userId || !propertyId) return;

  const storage = getStorage();
  if (!storage) return;

  const set = blockedSet instanceof Set ? blockedSet : new Set();
  const arr = Array.from(set).map(normalizeYmd).filter(Boolean);
  const uniqueSorted = Array.from(new Set(arr)).sort();

  const payload = {
    v: 1,
    savedAt: new Date().toISOString(),
    dates: uniqueSorted,
  };

  try {
    storage.setItem(makeKey({ userId, propertyId }), JSON.stringify(payload));
  } catch (e) {
    console.error("Failed to save external blocked dates:", e);
  }
}

export function loadExternalBlockedDates({ userId, propertyId }) {
  if (!userId || !propertyId) return new Set();

  const storage = getStorage();
  if (!storage) return new Set();

  try {
    const raw = storage.getItem(makeKey({ userId, propertyId }));
    if (!raw) return new Set();

    const parsed = JSON.parse(raw);

    const dates = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.dates)
      ? parsed.dates
      : [];

    const cleaned = dates.map(normalizeYmd).filter(Boolean);
    return new Set(cleaned);
  } catch (e) {
    console.error("Failed to load external blocked dates:", e);
    return new Set();
  }
}

export function clearExternalBlockedDates({ userId, propertyId }) {
  if (!userId || !propertyId) return;

  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(makeKey({ userId, propertyId }));
  } catch (e) {
    console.error("Failed to clear external blocked dates:", e);
  }
}