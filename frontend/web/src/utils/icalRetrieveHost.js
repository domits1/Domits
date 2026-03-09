import { getAccessToken } from "../services/getAccessToken";

const DEFAULT_ICAL_RETRIEVE_URL =
  "https://eiul3lr63m.execute-api.eu-north-1.amazonaws.com/default/Ical-retrieve";

const ICAL_RETRIEVE_PATH_LOWER = "/ical-retrieve";

const normalizeIcalRetrieveUrl = (value) => {
  let normalized = String(value || "").trim();
  while (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
};

const hasIcalRetrievePath = (url) => url.toLowerCase().endsWith(ICAL_RETRIEVE_PATH_LOWER);

const withIcalPathCase = (url, pathSegment) => {
  if (!hasIcalRetrievePath(url)) {
    return url;
  }
  const prefix = url.slice(0, -ICAL_RETRIEVE_PATH_LOWER.length);
  return `${prefix}/${pathSegment}`;
};

const buildIcalRetrieveCandidates = (value) => {
  const baseUrl = normalizeIcalRetrieveUrl(value);
  if (!baseUrl) {
    return [];
  }

  const candidates = hasIcalRetrievePath(baseUrl)
    ? [
        baseUrl,
        withIcalPathCase(baseUrl, "Ical-retrieve"),
        withIcalPathCase(baseUrl, "ical-retrieve"),
      ]
    : [baseUrl];

  return Array.from(new Set(candidates));
};

const ICAL_RETRIEVE_URL_CANDIDATES = buildIcalRetrieveCandidates(
  process.env.REACT_APP_ICAL_RETRIEVE_URL || DEFAULT_ICAL_RETRIEVE_URL
);
let activeIcalRetrieveUrl = ICAL_RETRIEVE_URL_CANDIDATES[0] || DEFAULT_ICAL_RETRIEVE_URL;

async function callIcalApi(payload) {
  const token = getAccessToken();
  const orderedCandidates = [
    activeIcalRetrieveUrl,
    ...ICAL_RETRIEVE_URL_CANDIDATES.filter((url) => url !== activeIcalRetrieveUrl),
  ].filter(Boolean);
  let lastError = null;

  for (const endpoint of orderedCandidates) {
    try {
      const res = await fetch(endpoint, {
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

        const error = new Error(message);
        error.status = res.status;
        throw error;
      }

      activeIcalRetrieveUrl = endpoint;
      return await res.json();
    } catch (error) {
      lastError = error;
      const shouldTryNext = error instanceof TypeError || Number(error?.status) === 404;
      if (!shouldTryNext) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Unable to reach iCal retrieve endpoint.");
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
