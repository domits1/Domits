import { getAccessToken } from "../services/getAccessToken";

const DEFAULT_ICAL_RETRIEVE_URL =
  "https://eiul3lr63m.execute-api.eu-north-1.amazonaws.com/default/ical-retrieve";
const ICAL_RETRIEVE_URL =
  String(process.env.REACT_APP_ICAL_RETRIEVE_URL || DEFAULT_ICAL_RETRIEVE_URL).trim();

async function callIcalApi(payload) {
  const token = getAccessToken();

  const res = await fetch(ICAL_RETRIEVE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
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

  return await res.json();
}

export async function retrieveExternalCalendar(calendarUrl) {
  const data = await callIcalApi({ action: "RETRIEVE_EXTERNAL", calendarUrl });
  return data.events || [];
}

export async function dbListIcalSources(propertyId) {
  const data = await callIcalApi({ action: "LIST_SOURCES", propertyId });
  return {
    sources: Array.isArray(data.sources) ? data.sources : [],
    blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
  };
}

export async function dbUpsertIcalSource({ propertyId, calendarUrl, calendarName, calendarProvider }) {
  const data = await callIcalApi({
    action: "UPSERT_SOURCE",
    propertyId,
    calendarUrl,
    calendarName,
    ...(calendarProvider ? { calendarProvider } : {}),
  });
  return {
    sources: Array.isArray(data.sources) ? data.sources : [],
    blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
  };
}

export async function dbDeleteIcalSource({ propertyId, sourceId }) {
  const data = await callIcalApi({ action: "DELETE_SOURCE", propertyId, sourceId });
  return {
    sources: Array.isArray(data.sources) ? data.sources : [],
    blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
  };
}

export async function dbRefreshIcalSource({ propertyId, sourceId }) {
  const data = await callIcalApi({ action: "REFRESH_SOURCE", propertyId, sourceId });
  return {
    sources: Array.isArray(data.sources) ? data.sources : [],
    blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
  };
}

export async function dbRefreshAllIcalSources(propertyId) {
  const data = await callIcalApi({ action: "REFRESH_ALL", propertyId });
  return {
    sources: Array.isArray(data.sources) ? data.sources : [],
    blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
  };
}
