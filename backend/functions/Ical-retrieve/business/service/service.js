import { BadRequestException } from "../../util/exception/badRequestException.js";
import { Repository } from "../../data/repository.js";

const MAX_ICS_BYTES = 2_000_000;
const MAX_EXPAND_DAYS = 365;

export class Service {
  constructor() {
    this.repository = new Repository();
  }

  async retrieveFromExternalCalendar(calendarUrl) {
    if (!calendarUrl || typeof calendarUrl !== "string") {
      throw new BadRequestException("calendarUrl is required");
    }
    if (!calendarUrl.startsWith("http://") && !calendarUrl.startsWith("https://")) {
      throw new BadRequestException("calendarUrl must start with http:// or https://");
    }

    let icsText;
    let etag = null;
    let lastModified = null;

    try {
      const res = await fetch(calendarUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Domits-Ical-Retrieve/1.0",
          Accept: "text/calendar,*/*",
        },
      });

      if (!res.ok) {
        throw new BadRequestException(`Failed to fetch external calendar (status ${res.status})`);
      }

      etag = res.headers.get("etag");
      lastModified = res.headers.get("last-modified");

      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_ICS_BYTES) {
        throw new BadRequestException("ICS file too large");
      }
      icsText = new TextDecoder("utf-8").decode(buf);
    } catch (e) {
      throw new BadRequestException("Could not download external calendar URL");
    }

    const events = parseIcsToEvents(icsText);
    return { events, meta: { etag, lastModified } };
  }

  async listSources(propertyId) {
    if (!propertyId || typeof propertyId !== "string") {
      throw new BadRequestException("propertyId is required");
    }

    const sources = await this.repository.listSources(propertyId);
    const blockedDates = unionBlockedDatesFromRows(sources);

    return {
      sources: sources.map((r) => ({
        propertyId: r.propertyId,
        sourceId: r.sourceId,
        calendarName: r.calendarName,
        calendarUrl: r.calendarUrl,
        lastSyncAt: r.lastSyncAt,
        updatedAt: r.updatedAt,
        etag: r.etag,
        lastModified: r.lastModified,
      })),
      blockedDates,
    };
  }

  async upsertSource({ propertyId, calendarUrl, calendarName }) {
    if (!propertyId || typeof propertyId !== "string") throw new BadRequestException("propertyId is required");
    if (!calendarUrl || typeof calendarUrl !== "string") throw new BadRequestException("calendarUrl is required");
    if (!calendarName || typeof calendarName !== "string") throw new BadRequestException("calendarName is required");

    const url = calendarUrl.trim();
    const name = calendarName.trim();

    const sourceId = hashSourceId(url);
    const { events, meta } = await this.retrieveFromExternalCalendar(url);
    const blockedDates = buildBlockedDatesFromEvents(events);
    const blockedDatesText = JSON.stringify(blockedDates);

    await this.repository.upsertSource({
      propertyId,
      sourceId,
      calendarName: name,
      calendarUrl: url,
      blockedDatesText,
      lastSyncAt: new Date().toISOString(),
      etag: meta?.etag || null,
      lastModified: meta?.lastModified || null,
    });

    return await this.listSources(propertyId);
  }

  async deleteSource({ propertyId, sourceId }) {
    if (!propertyId || typeof propertyId !== "string") throw new BadRequestException("propertyId is required");
    if (!sourceId || typeof sourceId !== "string") throw new BadRequestException("sourceId is required");

    await this.repository.deleteSource(propertyId, sourceId);
    return await this.listSources(propertyId);
  }

  async refreshAll(propertyId) {
    if (!propertyId || typeof propertyId !== "string") throw new BadRequestException("propertyId is required");

    const sources = await this.repository.listSources(propertyId);

    for (const s of sources) {
      const url = String(s?.calendarUrl || "").trim();
      if (!url) continue;

      try {
        const { events, meta } = await this.retrieveFromExternalCalendar(url);
        const blockedDates = buildBlockedDatesFromEvents(events);
        await this.repository.upsertSource({
          propertyId,
          sourceId: s.sourceId,
          calendarName: s.calendarName || "EXTERNAL",
          calendarUrl: url,
          blockedDatesText: JSON.stringify(blockedDates),
          lastSyncAt: new Date().toISOString(),
          etag: meta?.etag || null,
          lastModified: meta?.lastModified || null,
        });
      } catch {}
    }

    return await this.listSources(propertyId);
  }
}

function hashSourceId(url) {
  const s = String(url || "").trim();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `src_${(h >>> 0).toString(16)}`;
}

function unionBlockedDatesFromRows(rows) {
  const out = new Set();
  const arr = Array.isArray(rows) ? rows : [];

  for (const r of arr) {
    const raw = r?.blockedDates;
    if (!raw) continue;

    const parsed = safeParseJson(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    for (const k of list) {
      if (typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k)) out.add(k);
    }
  }

  return Array.from(out);
}

function safeParseJson(v) {
  if (v == null) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return null;
  }
}

const pad = (n) => String(n).padStart(2, "0");

function toYmd(d, useUTC) {
  const dt = d instanceof Date ? d : new Date(d);
  if (useUTC) return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function addDays(d, n, useUTC) {
  const x = new Date(d);
  if (useUTC) x.setUTCDate(x.getUTCDate() + n);
  else x.setDate(x.getDate() + n);
  return x;
}

function parseIcsDate(raw) {
  if (!raw) return { date: null, useUTC: false };
  const v = String(raw).trim();

  if (/^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    return { date: new Date(y, m - 1, d), useUTC: false };
  }

  if (/^\d{8}T\d{6}Z$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    const hh = Number(v.slice(9, 11));
    const mm = Number(v.slice(11, 13));
    const ss = Number(v.slice(13, 15));
    return { date: new Date(Date.UTC(y, m - 1, d, hh, mm, ss)), useUTC: true };
  }

  if (/^\d{8}T\d{6}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    const hh = Number(v.slice(9, 11));
    const mm = Number(v.slice(11, 13));
    const ss = Number(v.slice(13, 15));
    return { date: new Date(y, m - 1, d, hh, mm, ss), useUTC: false };
  }

  const d = new Date(v);
  return { date: isNaN(d.getTime()) ? null : d, useUTC: false };
}

function buildBlockedDatesFromEvents(events) {
  const set = new Set();
  const arr = Array.isArray(events) ? events : [];

  for (const e of arr) {
    const { date: start, useUTC: startUTC } = parseIcsDate(e?.Dtstart);
    const { date: end, useUTC: endUTC } = parseIcsDate(e?.Dtend);

    if (!start) continue;

    if (!end) {
      set.add(toYmd(start, startUTC));
      continue;
    }

    const useUTC = Boolean(startUTC || endUTC);

    const startDay = useUTC
      ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
      : new Date(start.getFullYear(), start.getMonth(), start.getDate());

    const endDay = useUTC
      ? new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
      : new Date(end.getFullYear(), end.getMonth(), end.getDate());

    if (endDay.getTime() <= startDay.getTime()) {
      set.add(toYmd(startDay, useUTC));
      continue;
    }

    let cur = startDay;
    while (cur.getTime() < endDay.getTime()) {
      set.add(toYmd(cur, useUTC));
      cur = addDays(cur, 1, useUTC);
    }
  }

  return Array.from(set);
}

function parseIcsToEvents(icsText) {
  if (!icsText) return [];

  const lines = unfoldLines(icsText);
  const events = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "BEGIN:VEVENT") {
      current = { _params: {} };
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const idx = line.indexOf(":");
    if (idx < 0) continue;

    const left = line.slice(0, idx);
    const value = line.slice(idx + 1);

    const parts = left.split(";");
    const key = (parts[0] || "").trim().toUpperCase();
    const params = {};

    for (let i = 1; i < parts.length; i++) {
      const p = parts[i];
      const eq = p.indexOf("=");
      if (eq > -1) {
        const k = p.slice(0, eq).trim().toUpperCase();
        const v = p.slice(eq + 1).trim();
        params[k] = v;
      } else {
        params[p.trim().toUpperCase()] = true;
      }
    }

    current._params[key] = params;

    switch (key) {
      case "UID":
        current.UID = value;
        break;
      case "DTSTAMP":
        current.Dtstamp = value;
        break;
      case "DTSTART":
        current.Dtstart = value;
        break;
      case "DTEND":
        current.Dtend = value;
        break;
      case "SUMMARY":
        current.Summary = value;
        break;
      case "DESCRIPTION":
        current.Description = value;
        break;
      case "LOCATION":
        current.Location = value;
        break;
      case "STATUS":
        current.Status = value;
        break;
      case "RRULE":
        current.Rrule = value;
        break;
      case "EXDATE":
        current.Exdate = mergeCsvDates(current.Exdate, value);
        break;
      case "RDATE":
        current.Rdate = mergeCsvDates(current.Rdate, value);
        break;
      case "RECURRENCE-ID":
        current.RecurrenceId = value;
        break;
      default:
        break;
    }
  }

  const expanded = expandRecurringEvents(events);
  return expanded.filter((e) => {
    const s = String(e?.Status || "").trim().toUpperCase();
    return s !== "CANCELLED" && s !== "CANCELED";
  });
}

function mergeCsvDates(prev, value) {
  const a = Array.isArray(prev) ? prev : prev ? [prev] : [];
  const b = String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return a.concat(b);
}

function unfoldLines(icsText) {
  const rawLines = icsText.split(/\r?\n/);
  const result = [];

  for (const line of rawLines) {
    if (!line) continue;
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (result.length === 0) result.push(line.trimStart());
      else result[result.length - 1] += line.slice(1);
    } else {
      result.push(line);
    }
  }
  return result;
}

function parseIcsDateUTC(raw, params = {}) {
  if (!raw) return null;
  const v = String(raw).trim();

  const valueType = String(params.VALUE || "").toUpperCase();

  if (valueType === "DATE" || /^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  }

  if (/^\d{8}T\d{6}Z$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    const hh = Number(v.slice(9, 11));
    const mm = Number(v.slice(11, 13));
    const ss = Number(v.slice(13, 15));
    return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  }

  if (/^\d{8}T\d{6}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    const hh = Number(v.slice(9, 11));
    const mm = Number(v.slice(11, 13));
    const ss = Number(v.slice(13, 15));
    return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  }

  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function ymdUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysUTC(date, n) {
  const x = new Date(date);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function parseRrule(rrule) {
  const out = {};
  const parts = String(rrule || "").split(";").map((x) => x.trim()).filter(Boolean);
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (!k || v == null) continue;
    out[k.toUpperCase()] = v;
  }
  return out;
}

function expandRecurringEvents(events) {
  const base = Array.isArray(events) ? events : [];
  const now = new Date();
  const windowEnd = addDaysUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), MAX_EXPAND_DAYS);

  const out = [];

  for (const e of base) {
    if (!e?.Rrule) {
      out.push(e);
      continue;
    }

    const paramsStart = e?._params?.DTSTART || {};
    const paramsEnd = e?._params?.DTEND || {};

    const start = parseIcsDateUTC(e.Dtstart, paramsStart);
    const end = parseIcsDateUTC(e.Dtend, paramsEnd);

    if (!start) {
      out.push(e);
      continue;
    }

    const rule = parseRrule(e.Rrule);
    const freq = String(rule.FREQ || "").toUpperCase();
    const interval = Math.max(1, Number(rule.INTERVAL || 1));
    const count = rule.COUNT ? Math.max(0, Number(rule.COUNT)) : null;

    let until = null;
    if (rule.UNTIL) until = parseIcsDateUTC(rule.UNTIL, {});

    const exdates = new Set(
      (Array.isArray(e.Exdate) ? e.Exdate : e.Exdate ? [e.Exdate] : [])
        .map((x) => parseIcsDateUTC(x, {}))
        .filter(Boolean)
        .map(ymdUTC)
    );

    const rdates = (Array.isArray(e.Rdate) ? e.Rdate : e.Rdate ? [e.Rdate] : [])
      .map((x) => parseIcsDateUTC(x, {}))
      .filter(Boolean);

    const pushInstance = (s, ed) => {
      const k = ymdUTC(s);
      if (exdates.has(k)) return;
      out.push({ ...e, Dtstart: toIcsUtcString(s), Dtend: ed ? toIcsUtcString(ed) : e.Dtend });
    };

    for (const rd of rdates) {
      const rdEnd = end ? shiftEnd(start, end, rd) : null;
      pushInstance(rd, rdEnd);
    }

    let generated = 0;
    let cur = new Date(start);

    while (cur.getTime() <= windowEnd.getTime()) {
      if (until && cur.getTime() > until.getTime()) break;
      if (count != null && generated >= count) break;

      const curEnd = end ? shiftEnd(start, end, cur) : null;
      pushInstance(cur, curEnd);

      generated++;

      if (freq === "DAILY") cur = addDaysUTC(cur, interval);
      else if (freq === "WEEKLY") cur = addDaysUTC(cur, 7 * interval);
      else if (freq === "MONTHLY") cur = addMonthsUTC(cur, interval);
      else if (freq === "YEARLY") cur = addYearsUTC(cur, interval);
      else break;
    }
  }

  return out;
}

function shiftEnd(baseStart, baseEnd, newStart) {
  const dur = baseEnd.getTime() - baseStart.getTime();
  return new Date(newStart.getTime() + dur);
}

function addMonthsUTC(date, n) {
  const x = new Date(date);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
}

function addYearsUTC(date, n) {
  const x = new Date(date);
  x.setUTCFullYear(x.getUTCFullYear() + n);
  return x;
}

function toIcsUtcString(date) {
  const y = String(date.getUTCFullYear()).padStart(4, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}