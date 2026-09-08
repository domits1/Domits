const STORAGE_KEY_PREFIX = "domits_direct_booking_website_booking_request:";

const memoryRecords = new Map();

const cleanText = (value) => String(value || "").trim();

export const resolveBookingIdempotencyStorageKey = (siteId) => `${STORAGE_KEY_PREFIX}${cleanText(siteId)}`;

const createFallbackUuid = () => {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const createIdempotencyKey = () =>
  globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : createFallbackUuid();

const isUsableRecord = (record, quoteId) =>
  Boolean(record) && record.quoteId === quoteId && Boolean(cleanText(record.idempotencyKey));

const readStoredRecord = (storageKey) => {
  try {
    const rawRecord = globalThis.localStorage?.getItem(storageKey);
    return rawRecord ? JSON.parse(rawRecord) : null;
  } catch {
    return null;
  }
};

const writeStoredRecord = (storageKey, record) => {
  try {
    globalThis.localStorage?.setItem(storageKey, JSON.stringify(record));
  } catch {
    return;
  }
};

export const getOrCreateBookingIdempotencyKey = ({ siteId, quoteId }) => {
  const storageKey = resolveBookingIdempotencyStorageKey(siteId);
  const normalizedQuoteId = cleanText(quoteId);

  const storedRecord = readStoredRecord(storageKey);
  if (isUsableRecord(storedRecord, normalizedQuoteId)) {
    memoryRecords.set(storageKey, storedRecord);
    return storedRecord.idempotencyKey;
  }

  const memoryRecord = memoryRecords.get(storageKey);
  if (isUsableRecord(memoryRecord, normalizedQuoteId)) {
    writeStoredRecord(storageKey, memoryRecord);
    return memoryRecord.idempotencyKey;
  }

  const nextRecord = { quoteId: normalizedQuoteId, idempotencyKey: createIdempotencyKey(), createdAt: Date.now() };
  memoryRecords.set(storageKey, nextRecord);
  writeStoredRecord(storageKey, nextRecord);
  return nextRecord.idempotencyKey;
};

export const clearBookingIdempotencyKey = (siteId) => {
  const storageKey = resolveBookingIdempotencyStorageKey(siteId);
  memoryRecords.delete(storageKey);
  try {
    globalThis.localStorage?.removeItem(storageKey);
  } catch {
    return;
  }
};
