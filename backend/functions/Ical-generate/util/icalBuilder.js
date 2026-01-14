const CRLF = "\r\n";

const escapeText = (value) => {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
};

const foldLine = (line) => {
  const maxLineLength = 70;
  if (line.length <= maxLineLength) return line;

  let foldedLine = "";
  let offset = 0;

  while (offset < line.length) {
    const chunk = line.slice(offset, offset + maxLineLength);
    foldedLine += offset === 0 ? chunk : CRLF + " " + chunk;
    offset += maxLineLength;
  }

  return foldedLine;
};

const toIcsDateTimeUtc = (input) => {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
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

  for (const event of events) {
    const uid = event.uid || event.UID || event.id || `${Math.random()}@domits`;
    const dtstamp = event.dtstamp || event.Dtstamp || new Date().toISOString();
    const dtstart = event.dtstart || event.Dtstart;
    const dtend = event.dtend || event.Dtend;

    const summary = event.summary || event.Summary || "Blocked";
    const description = event.description || event.Description || "";
    const location = event.location || event.Location || "";
    const status = event.status || event.Status || "";

    const dtstartIcs = toIcsDateTimeUtc(dtstart);
    if (!dtstartIcs) continue;

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