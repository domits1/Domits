import { Repository } from "../../data/repository.js";

const MAX_ICS_BYTES = 2_000_000;
const MAX_EXPAND_DAYS = 365;
const DEFAULT_SYNC_INTERVAL_MINUTES = 2;
const DEFAULT_SYNC_BATCH_LIMIT = 500;
const DEFAULT_SYNC_CONCURRENCY = 8;
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const CALENDAR_PROVIDER = {
  AIRBNB: "airbnb",
  BOOKING: "booking",
  GENERIC: "generic",
};

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
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

const isDueForSync = (lastSyncAt, cutoffMs) => {
  const rawValue = String(lastSyncAt || "").trim();
  if (!rawValue) {
    return true;
  }

  const parsedTimestamp = Date.parse(rawValue);
  if (!Number.isFinite(parsedTimestamp)) {
    return true;
  }

  return parsedTimestamp <= cutoffMs;
};

export class Service {
  constructor() {
    this.repository = new Repository();
  }

  getConfig(event = {}) {
    const eventIntervalMinutes = toPositiveInteger(event?.syncIntervalMinutes, null);
    const eventLimit = toPositiveInteger(event?.limit, null);
    const eventConcurrency = toPositiveInteger(event?.concurrency, null);

    return {
      syncIntervalMinutes:
        eventIntervalMinutes ||
        toPositiveInteger(process.env.SYNC_INTERVAL_MINUTES, DEFAULT_SYNC_INTERVAL_MINUTES),
      batchLimit: eventLimit || toPositiveInteger(process.env.SYNC_BATCH_LIMIT, DEFAULT_SYNC_BATCH_LIMIT),
      concurrency: eventConcurrency || toPositiveInteger(process.env.SYNC_CONCURRENCY, DEFAULT_SYNC_CONCURRENCY),
      fetchTimeoutMs: toPositiveInteger(process.env.SYNC_FETCH_TIMEOUT_MS, DEFAULT_FETCH_TIMEOUT_MS),
    };
  }

  async runScheduledSync(event = {}) {
    const config = this.getConfig(event);
    const nowMs = Date.now();
    const cutoffMs = nowMs - config.syncIntervalMinutes * 60 * 1000;

    const allSources = await this.repository.listSources(config.batchLimit);
    const forceSync = event?.force === true;
    const dueSources = forceSync ? allSources : allSources.filter((source) => isDueForSync(source?.lastSyncAt, cutoffMs));

    const syncResults = await runWithConcurrency(dueSources, config.concurrency, async (source) => {
      try {
        await this.refreshSingleSource(source, config.fetchTimeoutMs);
        return { sourceId: source.sourceId, propertyId: source.propertyId, ok: true };
      } catch (error) {
        console.error(
          `Ical-sync-scheduler source refresh failed: propertyId=${source?.propertyId} sourceId=${source?.sourceId}`,
          error?.message || error
        );
        return { sourceId: source.sourceId, propertyId: source.propertyId, ok: false };
      }
    });

    const succeeded = syncResults.filter((result) => result?.ok).length;
    const failed = syncResults.length - succeeded;

    return {
      ok: true,
      config: {
        syncIntervalMinutes: config.syncIntervalMinutes,
        batchLimit: config.batchLimit,
        concurrency: config.concurrency,
      },
      scanned: allSources.length,
      due: dueSources.length,
      synced: syncResults.length,
      succeeded,
      failed,
      at: new Date(nowMs).toISOString(),
    };
  }

  async refreshSingleSource(source, fetchTimeoutMs) {
    const propertyId = String(source?.propertyId || "").trim();
    const sourceId = String(source?.sourceId || "").trim();
    const calendarUrl = String(source?.calendarUrl || "").trim();
    if (!propertyId || !sourceId || !calendarUrl) {
      return;
    }

    const { events, meta } = await this.retrieveFromExternalCalendar(calendarUrl, fetchTimeoutMs);
    const blockedDates = buildBlockedDatesFromEvents(events);
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
      blockedDatesText: JSON.stringify(blockedDates),
      lastSyncAt: new Date().toISOString(),
      etag: meta?.etag || null,
      lastModified: meta?.lastModified || null,
    });
  }

  async retrieveFromExternalCalendar(calendarUrl, timeoutMs) {
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
          "User-Agent": "Domits-Ical-Sync-Scheduler/1.0",
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

async function runWithConcurrency(items, concurrency, worker) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const queue = [...items];
  const results = [];
  const workerCount = Math.max(1, Math.min(concurrency, queue.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) {
        continue;
      }
      const result = await worker(item);
      results.push(result);
    }
  });

  await Promise.all(workers);
  return results;
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
  const raw = String(icsText).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
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

