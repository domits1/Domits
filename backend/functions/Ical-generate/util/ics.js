const pad = (n) => String(n).padStart(2, "0");
const toUTC = (x) => {
  const d = x instanceof Date ? x : new Date(x);
  return d.getUTCFullYear() + pad(d.getUTCMonth()+1) + pad(d.getUTCDate())
       + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z";
};
const esc = (s) => String(s).replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
const fold = (line) => {
  if (line.length <= 73) return line;
  let out = [], i = 0;
  while (i < line.length) { out.push((i? " ":"") + line.slice(i, i+73)); i += 73; }
  return out.join("\r\n");
};

export function buildICS(events) {
  const head = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Domits//iCal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ].join("\r\n");

  const vevents = events.map(e => [
    "BEGIN:VEVENT",
    `UID:${e.UID}`,
    `DTSTAMP:${toUTC(e.Dtstamp)}`,
    `DTSTART:${toUTC(e.Dtstart)}`,
    `DTEND:${toUTC(e.Dtend)}`,
    e.Summary ? `SUMMARY:${esc(e.Summary)}` : null,
    e.Location ? `LOCATION:${esc(e.Location)}` : null,
    `STATUS:${(e.Status || "CONFIRMED").toUpperCase()}`,
    "END:VEVENT"
  ].filter(Boolean).map(fold).join("\r\n")).join("\r\n");

  return head + "\r\n" + vevents + "\r\nEND:VCALENDAR\r\n";
}

export function icsKeyForOwner(ownerId, prefix = "availability") {
  const safeOwner = String(ownerId || "public").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safePrefix = String(prefix || "availability").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `host/${safeOwner}/${safePrefix}.ics`;
}