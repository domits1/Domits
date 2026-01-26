import { getAccessToken, getCognitoUserId } from "../services/getAccessToken";

const ICAL_GENERATE_URL = "https://rphw3xutc9.execute-api.eu-north-1.amazonaws.com/default/Ical-generate";

async function callGenerateApi(payload) {
  const token = getAccessToken();

  const res = await fetch(ICAL_GENERATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {}
    throw new Error(message);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return await res.json();

  const icsText = await res.text();
  return { icsText };
}

function addDaysYmd(ymd, n) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function toIsoMiddayUtc(ymd) {
  return `${ymd}T12:00:00.000Z`;
}

export function buildExportEvents({ selections, propertyId, prices }) {
  const blockedKeys = new Set([
    ...(selections?.blocked ? Array.from(selections.blocked) : []),
    ...(selections?.booked ? Array.from(selections.booked) : []),
    ...(selections?.maintenance ? Array.from(selections.maintenance) : []),
  ]);

  const events = [];
  for (const day of blockedKeys) {
    const endDay = addDaysYmd(day, 1);
    const price = prices?.[day];

    events.push({
      UID: `domits_${propertyId}_${day}`,
      Dtstamp: new Date().toISOString(),
      Dtstart: toIsoMiddayUtc(day),
      Dtend: toIsoMiddayUtc(endDay),
      Summary: "Blocked",
      Description: price != null ? `Price: ${price}` : "",
      Location: "",
      Status: "CONFIRMED",
    });
  }

  return events;
}

export async function generateExportUrl({ propertyId, calendarName, selections, prices }) {
  const ownerId = getCognitoUserId() || "public";
  const events = buildExportEvents({ selections, propertyId, prices });

  const data = await callGenerateApi({
    ownerId,
    filename: `domits-${propertyId}.ics`,
    calendarName: calendarName || "Domits",
    events,
    returnUrl: true,
  });

  if (data?.url) return data.url;

  if (data?.icsText) {
    const blob = new Blob([data.icsText], { type: "text/calendar" });
    return URL.createObjectURL(blob);
  }

  throw new Error("No export URL returned");
}