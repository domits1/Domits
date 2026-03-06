import { parseIcsToEvents, toPositiveInteger } from "./basicIcsUtils.js";
import { resolveCalendarProvider } from "./calendarProvider.js";

export const MAX_ICS_BYTES = 2_000_000;
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

export const buildSourceUpsertPayload = ({ propertyId, source, blockedDates, meta }) => {
  const calendarUrl = String(source?.calendarUrl || "").trim();
  const calendarName = String(source?.calendarName || "EXTERNAL").trim() || "EXTERNAL";
  return {
    propertyId,
    sourceId: String(source?.sourceId || "").trim(),
    calendarName,
    calendarUrl,
    provider: resolveCalendarProvider({
      calendarProvider: source?.provider ?? source?.calendarProvider,
      calendarUrl,
      calendarName,
    }),
    blockedDatesText: JSON.stringify(Array.isArray(blockedDates) ? blockedDates : []),
    lastSyncAt: new Date().toISOString(),
    etag: meta?.etag || null,
    lastModified: meta?.lastModified || null,
  };
};

export const fetchExternalCalendar = async ({
  calendarUrl,
  userAgent = "Domits-Ical/1.0",
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
  maxBytes = MAX_ICS_BYTES,
  parseEvents = parseIcsToEvents,
  createHttpError,
}) => {
  const normalizedTimeoutMs = toPositiveInteger(timeoutMs, DEFAULT_FETCH_TIMEOUT_MS);
  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), normalizedTimeoutMs);

  let icsText;
  let etag = null;
  let lastModified = null;

  try {
    const response = await fetch(calendarUrl, {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        Accept: "text/calendar,*/*",
      },
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw createHttpError?.(response.status) || new Error(`Failed to fetch external calendar (status ${response.status})`);
    }

    etag = response.headers.get("etag");
    lastModified = response.headers.get("last-modified");

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      throw new Error("ICS file too large");
    }

    icsText = new TextDecoder("utf-8").decode(buffer);
  } finally {
    clearTimeout(timer);
  }

  return {
    events: parseEvents(icsText),
    meta: {
      etag,
      lastModified,
    },
  };
};
