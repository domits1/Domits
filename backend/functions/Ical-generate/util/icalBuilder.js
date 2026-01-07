const CRLF = "\r\n";

const escapeText = (v) => {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
};

const foldLine = (line) => {
  const max = 70;
  if (line.length <= max) return line;

  let out = "";
  let i = 0;

  while (i < line.length) {
    const chunk = line.slice(i, i + max);
    out += (i === 0 ? chunk : CRLF + " " + chunk);
    i += max;
  }

  return out;
};

const toIcsDateTimeUtc = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");

  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
};

export const buildIcs = ({
  events = [],
  prodId = "-//Domits/Domits Calendar//v1.0//EN",
  calendarName = "Domits",
} = {}) => {
  const lines = [];

  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push(`PRODID:${prodId}`);
  lines.push(foldLine(`X-WR-CALNAME:${escapeText(calendarName)}`));
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");

  for (const e of events) {
    const uid = e.uid || e.UID || e.id || `${Math.random()}@domits`;
    const dtstamp = e.dtstamp || e.Dtstamp || new Date().toISOString();
    const dtstart = e.dtstart || e.Dtstart;
    const dtend = e.dtend || e.Dtend;

    const summary = e.summary || e.Summary || "Blocked";
    const description = e.description || e.Description || "";
    const location = e.location || e.Location || "";
    const status = e.status || e.Status || "";

    const dtstartIcs = toIcsDateTimeUtc(dtstart);
    if (!dtstartIcs) continue; // zonder DTSTART is een event useless

    const dtendIcs = dtend ? toIcsDateTimeUtc(dtend) : "";

    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${escapeText(uid)}`));
    lines.push(`DTSTAMP:${toIcsDateTimeUtc(dtstamp)}`);
    lines.push(`DTSTART:${dtstartIcs}`);
    if (dtendIcs) lines.push(`DTEND:${dtendIcs}`);
    lines.push(foldLine(`SUMMARY:${escapeText(summary)}`));
    if (description) lines.push(foldLine(`DESCRIPTION:${escapeText(description)}`));
    if (location) lines.push(foldLine(`LOCATION:${escapeText(location)}`));
    if (status) lines.push(`STATUS:${escapeText(status)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join(CRLF) + CRLF;
};