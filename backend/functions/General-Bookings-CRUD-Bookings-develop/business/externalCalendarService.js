import ExternalCalendarRepository from "../data/externalCalendarRepository.js";
import ConflictException from "../util/exception/ConflictException.js";
import ServiceUnavailableException from "../util/exception/ServiceUnavailableException.js";

const MAX_ICS_BYTES = 2_000_000;
const MAX_EXPAND_DAYS = 365;
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const CALENDAR_PROVIDER = {
  AIRBNB: "airbnb",
  BOOKING: "booking",
  GENERIC: "generic",
};

const normalizeCalendarProvider = (provider) => {
  const normalized = String(provider || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === CALENDAR_PROVIDER.AIRBNB || normalized === CALENDAR_PROVIDER.BOOKING) {
    return normalized;
  }
  return CALENDAR_PROVIDER.GENERIC;
};

const resolveCalendarProvider = ({ calendarProvider, calendarUrl, calendarName }) => {
  const explicitProvider = normalizeCalendarProvider(calendarProvider);
  if (explicitProvider) {
    return explicitProvider;
  }

  const url = String(calendarUrl || "")
    .trim()
    .toLowerCase();
  const name = String(calendarName || "")
    .trim()
    .toLowerCase();
  let hostname = "";
  if (url) {
    try {
      hostname = String(new URL(url).hostname || "").toLowerCase();
    } catch {
      hostname = "";
    }
  }

  if (hostname.includes("airbnb") || url.includes("airbnb") || name.includes("airbnb")) {
    return CALENDAR_PROVIDER.AIRBNB;
  }

  if (hostname.includes("booking.com") || url.includes("booking.com") || name.includes("booking")) {
    return CALENDAR_PROVIDER.BOOKING;
  }

  return CALENDAR_PROVIDER.GENERIC;
};

class ExternalCalendarService {
  constructor() {
    this.repository = new ExternalCalendarRepository();
  }

  async ensureNoExternalConflict({ propertyId, arrivalMs, departureMs }) {
    const sources = await this.repository.listSources(propertyId);
    if (!Array.isArray(sources) || sources.length === 0) {
      return;
    }

    const blockedDates = await this.refreshSourcesAndCollectBlockedDates(propertyId, sources);
    const requestedDateKeys = buildDateRangeKeys(arrivalMs, departureMs);
    const conflictingDate = requestedDateKeys.find((key) => blockedDates.has(key));
    if (conflictingDate) {
      throw new ConflictException("Selected dates are unavailable due to an external booking.");
    }
  }

  async refreshSourcesAndCollectBlockedDates(propertyId, sources) {
    const blockedDates = new Set();

    for (const source of sources) {
      const sourceId = String(source?.sourceId || "").trim();
      const calendarUrl = String(source?.calendarUrl || "").trim();
      if (!sourceId || !calendarUrl) {
        continue;
      }

      try {
        const { events, meta } = await this.retrieveFromExternalCalendar(calendarUrl);
        const sourceBlockedDates = buildBlockedDatesFromEvents(events);
        sourceBlockedDates.forEach((dateKey) => blockedDates.add(dateKey));

        await this.repository.upsertSource({
          propertyId,
          sourceId,
          calendarName: String(source?.calendarName || "EXTERNAL").trim() || "EXTERNAL",
          calendarUrl,
          provider: resolveCalendarProvider({
            calendarProvider: source?.provider,
            calendarUrl,
            calendarName: source?.calendarName,
          }),
          blockedDatesText: JSON.stringify(sourceBlockedDates),
          lastSyncAt: new Date().toISOString(),
          etag: meta?.etag || null,
          lastModified: meta?.lastModified || null,
        });
      } catch (error) {
        console.error(
          `Failed to refresh external calendar for booking guard. propertyId=${propertyId} sourceId=${sourceId}`,
          error?.message || error
        );
        throw new ServiceUnavailableException(
          "Unable to validate external calendar availability right now. Please try again."
        );
      }
    }

    return blockedDates;
  }

  async retrieveFromExternalCalendar(calendarUrl) {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), DEFAULT_FETCH_TIMEOUT_MS);

    let icsText;
    let etag = null;
    let lastModified = null;

    try {
      const response = await fetch(calendarUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Domits-Booking-External-Calendar-Guard/1.0",
          Accept: "text/calendar,*/*",
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch external calendar (status ${response.status})`);
      }

      etag = response.headers.get("etag");
      lastModified = response.headers.get("last-modified");

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_ICS_BYTES) {
        throw new Error("ICS file too large");
      }

      icsText = new TextDecoder("utf-8").decode(buffer);
    } finally {
      clearTimeout(timer);
    }

    return {
      events: parseIcsToEvents(icsText),
      meta: {
        etag,
        lastModified,
      },
    };
  }
}

function parseIcsToEvents(icsText) {
  if (!icsText) return [];

  const lines = unfoldLines(icsText);
  const events = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      pushCurrentEvent(events, current);
      current = null;
      continue;
    }
    if (!current) {
      continue;
    }
    applyIcsEventLine(current, line);
  }

  return events;
}

function pushCurrentEvent(events, currentEvent) {
  if (currentEvent) {
    events.push(currentEvent);
  }
}

function applyIcsEventLine(currentEvent, line) {
  const parsedLine = parseIcsLine(line);
  if (!parsedLine) {
    return;
  }
  const { key, value } = parsedLine;
  if (key === "DTSTART") {
    currentEvent.Dtstart = value;
    return;
  }
  if (key === "DTEND") {
    currentEvent.Dtend = value;
  }
}

function parseIcsLine(line) {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex === -1) {
    return null;
  }
  const left = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1).trim();
  const key = left.split(";")[0].trim().toUpperCase();
  return { key, value };
}

function unfoldLines(icsText) {
  const raw = String(icsText).replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const out = [];
  for (const line of raw) {
    if (!out.length) {
      out.push(line);
      continue;
    }
    if (line.startsWith(" ") || line.startsWith("\t")) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

const pad = (n) => String(n).padStart(2, "0");

function toYmd(date, useUtc) {
  if (useUtc) {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date, days, useUtc) {
  const output = new Date(date);
  if (useUtc) {
    output.setUTCDate(output.getUTCDate() + days);
    return output;
  }
  output.setDate(output.getDate() + days);
  return output;
}

function startOfDay(date, useUtc) {
  if (useUtc) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseIcsDate(raw) {
  if (!raw) return { date: null, useUtc: false };
  const value = String(raw).trim();

  if (/^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    return { date: new Date(year, month - 1, day), useUtc: false };
  }

  if (/^\d{8}T\d{6}Z$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    const hour = Number(value.slice(9, 11));
    const minute = Number(value.slice(11, 13));
    const second = Number(value.slice(13, 15));
    return { date: new Date(Date.UTC(year, month - 1, day, hour, minute, second)), useUtc: true };
  }

  if (/^\d{8}T\d{6}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    const hour = Number(value.slice(9, 11));
    const minute = Number(value.slice(11, 13));
    const second = Number(value.slice(13, 15));
    return { date: new Date(year, month - 1, day, hour, minute, second), useUtc: false };
  }

  const parsed = new Date(value);
  return { date: Number.isNaN(parsed.getTime()) ? null : parsed, useUtc: false };
}

function buildBlockedDatesFromEvents(events) {
  const set = new Set();
  const normalizedEvents = Array.isArray(events) ? events : [];

  for (const event of normalizedEvents) {
    const normalizedRange = normalizeEventDateRange(event);
    if (!normalizedRange) {
      continue;
    }
    if (normalizedRange.singleDateKey) {
      set.add(normalizedRange.singleDateKey);
      continue;
    }
    appendDateRangeKeys(set, normalizedRange);
  }

  return Array.from(set);
}

function normalizeEventDateRange(event) {
  const { date: startDate, useUtc: startUtc } = parseIcsDate(event?.Dtstart);
  if (!startDate) {
    return null;
  }

  const { date: endDate, useUtc: endUtc } = parseIcsDate(event?.Dtend);
  if (!endDate) {
    return {
      singleDateKey: toYmd(startDate, startUtc),
    };
  }

  const useUtc = Boolean(startUtc || endUtc);
  const startDay = startOfDay(startDate, useUtc);
  const endDay = startOfDay(endDate, useUtc);
  if (endDay.getTime() <= startDay.getTime()) {
    return {
      singleDateKey: toYmd(startDay, useUtc),
    };
  }

  return {
    startDay,
    endDay,
    useUtc,
  };
}

function appendDateRangeKeys(targetSet, normalizedRange) {
  let currentDate = normalizedRange.startDay;
  let safeCounter = 0;
  while (currentDate.getTime() < normalizedRange.endDay.getTime()) {
    targetSet.add(toYmd(currentDate, normalizedRange.useUtc));
    currentDate = addDays(currentDate, 1, normalizedRange.useUtc);
    safeCounter += 1;
    if (safeCounter > MAX_EXPAND_DAYS) {
      break;
    }
  }
}

function normalizeTimestampMs(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsedInt = Number(value);
    return Number.isFinite(parsedInt) ? parsedInt : Number.NaN;
  }
  const parsedDate = new Date(value).getTime();
  return Number.isFinite(parsedDate) ? parsedDate : Number.NaN;
}

function buildDateRangeKeys(arrivalMs, departureMs) {
  const startMs = normalizeTimestampMs(arrivalMs);
  const endMs = normalizeTimestampMs(departureMs);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return [];
  }

  const keys = [];
  const current = new Date(startMs);
  current.setUTCHours(0, 0, 0, 0);
  const end = new Date(endMs);
  end.setUTCHours(0, 0, 0, 0);

  while (current.getTime() < end.getTime()) {
    keys.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return keys;
}

export default ExternalCalendarService;

