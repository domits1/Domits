import { getAccessToken } from "../../../../services/getAccessToken";
import { dbListIcalSources } from "../../../../utils/icalRetrieveHost";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { getApiErrorMessage } from "../../hostproperty/utils/hostPropertyUtils";

const buildSinglePropertyUrl = (propertyId) =>
  `${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`;
const buildCalendarOverridesUrl = (propertyId) =>
  `${PROPERTY_API_BASE}/calendar/overrides?propertyId=${encodeURIComponent(propertyId)}`;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

const normalizeUnavailableDates = (overridesPayload) =>
  (Array.isArray(overridesPayload?.overrides) ? overridesPayload.overrides : [])
    .filter((override) => override?.isAvailable === false)
    .map((override) => normalizeOverrideDateKey(override?.date ?? override?.calendarDate))
    .filter(Boolean);

const mergeWebsiteCalendarAvailability = (propertyDetails, calendarSourcesPayload, overridesPayload) => {
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

  try {
    const [calendarSourcesPayload, overridesPayload] = await Promise.all([
      dbListIcalSources(normalizedPropertyId).catch(() => null),
      fetch(buildCalendarOverridesUrl(normalizedPropertyId), {
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
        .catch(() => null),
    ]);
    return mergeWebsiteCalendarAvailability(propertyDetails, calendarSourcesPayload, overridesPayload);
  } catch {
    return propertyDetails;
  }
};
