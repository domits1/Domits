const MAX_EXPAND_DAYS = 365;

export const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

export function parseIcsToEvents(icsText) {
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
      if (current) {
        events.push(current);
      }
      current = null;
      continue;
    }
    if (!current) {
      continue;
    }
    const parsedLine = parseIcsLine(line);
    if (!parsedLine) {
      continue;
    }
    const { key, value } = parsedLine;
    if (key === "DTSTART") {
      current.Dtstart = value;
      continue;
    }
    if (key === "DTEND") {
      current.Dtend = value;
    }
  }

  return events;
}

export function buildBlockedDatesFromEvents(events) {
  const dateKeys = new Set();
  const normalizedEvents = Array.isArray(events) ? events : [];

  for (const event of normalizedEvents) {
    const normalizedRange = normalizeEventDateRange(event);
    if (!normalizedRange) {
      continue;
    }
    if (normalizedRange.singleDateKey) {
      dateKeys.add(normalizedRange.singleDateKey);
      continue;
    }
    appendDateRangeKeys(dateKeys, normalizedRange);
  }

  return Array.from(dateKeys);
}

export function buildDateRangeKeys(arrivalMs, departureMs) {
  const startMs = normalizeTimestampMs(arrivalMs);
  const endMs = normalizeTimestampMs(departureMs);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return [];
  }

  const keys = [];
  const currentDate = new Date(startMs);
  currentDate.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(endMs);
  endDate.setUTCHours(0, 0, 0, 0);

  while (currentDate.getTime() < endDate.getTime()) {
    keys.push(currentDate.toISOString().slice(0, 10));
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return keys;
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
  const rawLines = String(icsText).replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const lines = [];
  for (const line of rawLines) {
    if (!lines.length) {
      lines.push(line);
      continue;
    }
    if (line.startsWith(" ") || line.startsWith("\t")) {
      lines[lines.length - 1] += line.slice(1);
      continue;
    }
    lines.push(line);
  }
  return lines;
}

const pad = (value) => String(value).padStart(2, "0");

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
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  const parsedDate = new Date(value).getTime();
  return Number.isFinite(parsedDate) ? parsedDate : Number.NaN;
}
