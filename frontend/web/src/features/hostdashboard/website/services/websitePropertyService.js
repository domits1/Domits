import { getAccessToken } from "../../../../services/getAccessToken";
import { dbListIcalSources } from "../../../../utils/icalRetrieveHost";
import {
  fetchUserProfileById,
  getEmptyUserProfile,
} from "../../services/fetchUserProfileById";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { getApiErrorMessage } from "../../hostproperty/utils/hostPropertyUtils";
import {
  fetchWebsiteHostWhatsApp,
  getEmptyWebsiteHostWhatsApp,
} from "./websiteHostMessagingService";

const buildSinglePropertyUrl = (propertyId) =>
  `${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`;
const buildCalendarOverridesUrl = (propertyId) =>
  `${PROPERTY_API_BASE}/calendar/overrides?propertyId=${encodeURIComponent(propertyId)}`;
const BOOKING_BLOCKED_DATES_API_URL =
  "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings";
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HOST_PROFILE_PROMISE_CACHE = new Map();
const UTC_DAY_IN_MS = 24 * 60 * 60 * 1000;

const normalizeTimestamp = (value) => {
  if (value == null || value === "") {
    return null;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }

  const parsedDate = new Date(String(value));
  const parsedTimestamp = parsedDate.getTime();
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : null;
};

const normalizeBlockedDates = (blockedDates) =>
  (Array.isArray(blockedDates) ? blockedDates : [])
    .map((dateKey) => String(dateKey || "").trim())
    .filter((dateKey) => DATE_KEY_PATTERN.test(dateKey));

const normalizeOverrideDateKey = (value) => {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    const normalizedValue = String(Math.trunc(numericValue));
    if (/^\d{8}$/.test(normalizedValue)) {
      return `${normalizedValue.slice(0, 4)}-${normalizedValue.slice(4, 6)}-${normalizedValue.slice(6, 8)}`;
    }
  }

  const stringValue = String(value || "").trim();
  return DATE_KEY_PATTERN.test(stringValue) ? stringValue : "";
};

const normalizeTimestampLike = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    const milliseconds = numericValue > 1000000000000 ? numericValue : numericValue * 1000;
    const parsedDate = new Date(milliseconds);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  const parsedDate = new Date(String(value || ""));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const toUtcDateKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;

const buildAcceptedBookingDateKeys = (bookingsPayload) => {
  const blockedDateKeys = new Set();

  (Array.isArray(bookingsPayload) ? bookingsPayload : []).forEach((booking) => {
    const arrival = normalizeTimestampLike(
      booking?.arrivaldate ?? booking?.arrivalDate ?? booking?.arrival_date ?? booking?.StartDate
    );
    const departure = normalizeTimestampLike(
      booking?.departuredate ?? booking?.departureDate ?? booking?.departure_date ?? booking?.EndDate
    );

    if (!arrival || !departure) {
      return;
    }

    const start = startOfUtcDay(arrival);
    const endExclusive = startOfUtcDay(departure);

    if (endExclusive <= start) {
      blockedDateKeys.add(toUtcDateKey(start));
      return;
    }

    for (let cursor = start.getTime(); cursor < endExclusive.getTime(); cursor += UTC_DAY_IN_MS) {
      blockedDateKeys.add(toUtcDateKey(new Date(cursor)));
    }
  });

  return Array.from(blockedDateKeys);
};

const parseAcceptedBookingsPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.body)) {
    return payload.body;
  }

  if (typeof payload?.body === "string") {
    try {
      const parsedPayload = JSON.parse(payload.body);
      return Array.isArray(parsedPayload) ? parsedPayload : [];
    } catch {
      return [];
    }
  }

  return [];
};

const fetchAcceptedBookingDateKeys = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    return [];
  }

  const response = await fetch(
    `${BOOKING_BLOCKED_DATES_API_URL}?readType=blockedDates&property_Id=${encodeURIComponent(
      normalizedPropertyId
    )}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  const bookings = parseAcceptedBookingsPayload(payload);

  return buildAcceptedBookingDateKeys(bookings);
};

const normalizeHostId = (value) => String(value || "").trim();
const normalizePropertyId = (value) => String(value || "").trim();

const resolveWebsiteHostId = (propertyDetails, summaryProperty = null) =>
  [
    propertyDetails?.hostProfile?.userId,
    propertyDetails?.hostProfile?.sub,
    propertyDetails?.host?.userId,
    propertyDetails?.host?.sub,
    propertyDetails?.property?.hostId,
    propertyDetails?.property?.host_id,
    summaryProperty?.hostId,
  ]
    .map((value) => normalizeHostId(value))
    .find(Boolean) || "";

const resolveWebsitePropertyId = (propertyDetails, summaryProperty = null) =>
  [
    propertyDetails?.property?.id,
    propertyDetails?.property?.ID,
    propertyDetails?.id,
    propertyDetails?.ID,
    summaryProperty?.property?.id,
    summaryProperty?.property?.ID,
    summaryProperty?.id,
    summaryProperty?.ID,
    summaryProperty?.value,
  ]
    .map((value) => normalizePropertyId(value))
    .find(Boolean) || "";

const normalizeWebsiteHostProfile = (hostProfile, fallbackHostId = "") => {
  const normalizedHostId =
    normalizeHostId(hostProfile?.userId || hostProfile?.sub) || normalizeHostId(fallbackHostId) || null;
  const normalizedGivenName = String(hostProfile?.givenName || hostProfile?.name || "").trim();
  const normalizedProfileImage = String(
    hostProfile?.profileImage || hostProfile?.picture || hostProfile?.image || ""
  ).trim();

  return {
    ...getEmptyUserProfile(normalizedHostId),
    givenName: normalizedGivenName || null,
    profileImage: normalizedProfileImage || null,
    userId: normalizedHostId,
    whatsapp:
      hostProfile?.whatsapp && typeof hostProfile.whatsapp === "object"
        ? {
            ...getEmptyWebsiteHostWhatsApp(),
            ...hostProfile.whatsapp,
          }
        : getEmptyWebsiteHostWhatsApp(),
  };
};

const fetchWebsiteHostProfile = async (hostId) => {
  const normalizedHostId = normalizeHostId(hostId);
  if (!normalizedHostId) {
    return getEmptyUserProfile(null);
  }

  if (!HOST_PROFILE_PROMISE_CACHE.has(normalizedHostId)) {
    HOST_PROFILE_PROMISE_CACHE.set(
      normalizedHostId,
      fetchUserProfileById(normalizedHostId)
        .then((hostProfile) => normalizeWebsiteHostProfile(hostProfile, normalizedHostId))
        .catch(() => getEmptyUserProfile(normalizedHostId))
    );
  }

  return HOST_PROFILE_PROMISE_CACHE.get(normalizedHostId);
};

const normalizeUnavailableDates = (overridesPayload) =>
  (Array.isArray(overridesPayload?.overrides) ? overridesPayload.overrides : [])
    .filter((override) => override?.isAvailable === false)
    .map((override) => normalizeOverrideDateKey(override?.date ?? override?.calendarDate))
    .filter(Boolean);

const mergeWebsiteCalendarAvailability = (
  propertyDetails,
  calendarSourcesPayload,
  overridesPayload,
  acceptedBookingDateKeys = []
) => {
  const existingAvailability =
    propertyDetails?.calendarAvailability && typeof propertyDetails.calendarAvailability === "object"
      ? propertyDetails.calendarAvailability
      : {};
  const syncedSources = Array.isArray(calendarSourcesPayload?.sources) ? calendarSourcesPayload.sources : [];
  const mergedBlockedDateSet = new Set([
    ...normalizeBlockedDates(existingAvailability.externalBlockedDates),
    ...normalizeBlockedDates(calendarSourcesPayload?.blockedDates),
  ]);
  const mergedBlockedDates = Array.from(mergedBlockedDateSet).sort((leftDateKey, rightDateKey) =>
    leftDateKey.localeCompare(rightDateKey)
  );
  const mergedUnavailableDateSet = new Set([
    ...normalizeBlockedDates(existingAvailability.unavailableDateKeys),
    ...normalizeBlockedDates(acceptedBookingDateKeys),
    ...normalizeUnavailableDates(overridesPayload),
  ]);
  const mergedUnavailableDates = Array.from(mergedUnavailableDateSet).sort((leftDateKey, rightDateKey) =>
    leftDateKey.localeCompare(rightDateKey)
  );
  const existingSyncSourceCount = Math.max(0, Number(existingAvailability.syncedSourceCount || 0));
  const mergedSyncSourceCount = Math.max(existingSyncSourceCount, syncedSources.length);
  const existingLastSyncAt = normalizeTimestamp(existingAvailability.lastSyncAt);
  const sourceLastSyncAt = syncedSources.reduce((latestTimestamp, source) => {
    const candidateTimestamp = normalizeTimestamp(source?.lastSyncAt || source?.updatedAt);
    if (!candidateTimestamp) {
      return latestTimestamp;
    }

    return latestTimestamp && latestTimestamp > candidateTimestamp ? latestTimestamp : candidateTimestamp;
  }, null);
  const mergedLastSyncAt =
    existingLastSyncAt && sourceLastSyncAt
      ? Math.max(existingLastSyncAt, sourceLastSyncAt)
      : existingLastSyncAt || sourceLastSyncAt;

  return {
    ...propertyDetails,
    calendarAvailability: {
      ...existingAvailability,
      externalBlockedDates: mergedBlockedDates,
      unavailableDateKeys: mergedUnavailableDates,
      hasExternalCalendarSync:
        existingAvailability.hasExternalCalendarSync === true || mergedSyncSourceCount > 0,
      syncedSourceCount: mergedSyncSourceCount,
      lastSyncAt: mergedLastSyncAt,
      syncSources:
        Array.isArray(existingAvailability.syncSources) && existingAvailability.syncSources.length > 0
          ? existingAvailability.syncSources
          : syncedSources,
    },
  };
};

export const attachWebsiteHostProfile = async (propertyDetails, summaryProperty = null) => {
  const normalizedPropertyDetails =
    propertyDetails && typeof propertyDetails === "object" ? propertyDetails : {};
  const hostId = resolveWebsiteHostId(normalizedPropertyDetails, summaryProperty);
  const hostProfilePromise =
    normalizedPropertyDetails.hostProfile && typeof normalizedPropertyDetails.hostProfile === "object"
      ? Promise.resolve(normalizeWebsiteHostProfile(normalizedPropertyDetails.hostProfile, hostId))
      : fetchWebsiteHostProfile(hostId);

  const [hostProfile, whatsapp] = await Promise.all([
    hostProfilePromise,
    fetchWebsiteHostWhatsApp(hostId),
  ]);

  return {
    ...normalizedPropertyDetails,
    hostProfile: {
      ...hostProfile,
      whatsapp,
    },
  };
};

const fetchWebsiteCalendarOverrides = async (propertyId, accessToken) => {
  if (!propertyId || !accessToken) {
    return null;
  }

  return fetch(buildCalendarOverridesUrl(propertyId), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: accessToken,
    },
  })
    .then(async (overrideResponse) => {
      if (!overrideResponse.ok) {
        return null;
      }
      return overrideResponse.json();
    })
    .catch(() => null);
};

export const enrichWebsitePropertyDetails = async (propertyDetails, summaryProperty = null) => {
  const normalizedPropertyDetails =
    propertyDetails && typeof propertyDetails === "object" ? propertyDetails : {};
  const normalizedPropertyId = resolveWebsitePropertyId(normalizedPropertyDetails, summaryProperty);
  const accessToken = getAccessToken();
  let nextPropertyDetails = normalizedPropertyDetails;

  try {
    const [calendarSourcesPayload, overridesPayload, acceptedBookingDateKeys] = await Promise.all([
      normalizedPropertyId && accessToken ? dbListIcalSources(normalizedPropertyId).catch(() => null) : null,
      fetchWebsiteCalendarOverrides(normalizedPropertyId, accessToken),
      normalizedPropertyId ? fetchAcceptedBookingDateKeys(normalizedPropertyId).catch(() => []) : [],
    ]);

    nextPropertyDetails = mergeWebsiteCalendarAvailability(
      normalizedPropertyDetails,
      calendarSourcesPayload,
      overridesPayload,
      acceptedBookingDateKeys
    );
  } catch {}

  return attachWebsiteHostProfile(nextPropertyDetails, summaryProperty);
};

export const fetchWebsitePropertyDetails = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Select a listing before building a website preview.");
  }

  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("You must be signed in to build a website preview.");
  }

  const response = await fetch(buildSinglePropertyUrl(normalizedPropertyId), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: accessToken,
    },
  });

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not load the selected listing for website preview."
    );
    throw new Error(errorMessage);
  }

  const propertyDetails = await response.json();
  return enrichWebsitePropertyDetails(propertyDetails);
};
