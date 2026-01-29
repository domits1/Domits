const PREFIX = "domits:ical:v2";

const keySources = (userId) => `${PREFIX}:sources:${String(userId || "").trim()}`;
const keyBlockedExternal = (userId) => `${PREFIX}:blocked:${String(userId || "").trim()}`;
const keyBlockedHost = (userId) => `${PREFIX}:hostBlocked:${String(userId || "").trim()}`;

const isYmd = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

const getStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export function loadIcalSources(userId) {
  const s = getStorage();
  if (!s || !userId) return [];
  try {
    const raw = s.getItem(keySources(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIcalSources(userId, sources) {
  const s = getStorage();
  if (!s || !userId) return;
  try {
    const arr = Array.isArray(sources) ? sources : [];
    s.setItem(keySources(userId), JSON.stringify(arr));
  } catch {}
}

export function loadExternalBlockedDates({ userId }) {
  const s = getStorage();
  if (!s || !userId) return new Set();
  try {
    const raw = s.getItem(keyBlockedExternal(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const dates = Array.isArray(parsed?.dates) ? parsed.dates : Array.isArray(parsed) ? parsed : [];
    return new Set(dates.filter(isYmd));
  } catch {
    return new Set();
  }
}

export function saveExternalBlockedDates({ userId, blockedSet }) {
  const s = getStorage();
  if (!s || !userId) return;
  try {
    const dates = Array.from(blockedSet instanceof Set ? blockedSet : new Set())
      .filter(isYmd)
      .sort();
    s.setItem(
      keyBlockedExternal(userId),
      JSON.stringify({ v: 2, savedAt: new Date().toISOString(), dates })
    );
  } catch {}
}

export function loadHostBlockedDates({ userId }) {
  const s = getStorage();
  if (!s || !userId) return new Set();
  try {
    const raw = s.getItem(keyBlockedHost(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const dates = Array.isArray(parsed?.dates) ? parsed.dates : Array.isArray(parsed) ? parsed : [];
    return new Set(dates.filter(isYmd));
  } catch {
    return new Set();
  }
}

export function saveHostBlockedDates({ userId, blockedSet }) {
  const s = getStorage();
  if (!s || !userId) return;
  try {
    const dates = Array.from(blockedSet instanceof Set ? blockedSet : new Set())
      .filter(isYmd)
      .sort();
    s.setItem(
      keyBlockedHost(userId),
      JSON.stringify({ v: 2, savedAt: new Date().toISOString(), dates })
    );
  } catch {}
}

export function clearAllIcal(userId) {
  const s = getStorage();
  if (!s || !userId) return;
  try {
    s.removeItem(keySources(userId));
    s.removeItem(keyBlockedExternal(userId));
    s.removeItem(keyBlockedHost(userId));
  } catch {}
}