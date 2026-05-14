import { getAccessToken } from "../../../services/getAccessToken";

const UNIFIED_MESSAGING_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";
const BOOKINGS_API_URL = "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings";

const appendParam = (params, key, value) => {
  if (value === undefined || value === null || value === "") return;
  params.set(key, String(value));
};

const removeTrailingSlashes = (value) => {
  const text = String(value || "");
  let endIndex = text.length;
  while (endIndex > 0 && text[endIndex - 1] === "/") endIndex -= 1;
  return text.slice(0, endIndex);
};

const removeLeadingSlashes = (value) => {
  const text = String(value || "");
  let startIndex = 0;
  while (startIndex < text.length && text[startIndex] === "/") startIndex += 1;
  return text.slice(startIndex);
};

const buildUrl = (path, query = {}) => {
  const normalizedBase = `${removeTrailingSlashes(UNIFIED_MESSAGING_API)}/`;
  const normalizedPath = removeLeadingSlashes(path);
  const url = new URL(normalizedPath, normalizedBase);
  Object.entries(query).forEach(([key, value]) => appendParam(url.searchParams, key, value));
  return url.toString();
};

const readJsonOrText = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const requestChannex = async (path, { method = "GET", query = {}, body } = {}) => {
  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch (error) {
    const wrappedError = new Error(`${method} ${path} failed: ${error?.message || "Network request failed"}`);
    wrappedError.endpoint = path;
    wrappedError.method = method;
    throw wrappedError;
  }
  const data = await readJsonOrText(response);

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && (data.error || data.message)) ||
      (typeof data === "string" ? data : "") ||
      `Channex request failed with status ${response.status}`;
    const error = new Error(`${method} ${path} failed with status ${response.status}: ${message}`);
    error.status = response.status;
    error.endpoint = path;
    error.method = method;
    error.responseBody = data;
    throw error;
  }

  return data;
};

const requestBooking = async ({ method = "PATCH", body } = {}) => {
  const token = getAccessToken();
  if (!token) {
    const error = new Error("Sign in before modifying booking dates.");
    error.endpoint = BOOKINGS_API_URL;
    error.method = method;
    throw error;
  }

  let response;
  try {
    response = await fetch(BOOKINGS_API_URL, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const wrappedError = new Error(`${method} /bookings failed: ${error?.message || "Network request failed"}`);
    wrappedError.endpoint = BOOKINGS_API_URL;
    wrappedError.method = method;
    throw wrappedError;
  }
  const data = await readJsonOrText(response);

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && (data.error || data.message)) ||
      (typeof data === "string" ? data : "") ||
      `Booking request failed with status ${response.status}`;
    const error = new Error(`${method} /bookings failed with status ${response.status}: ${message}`);
    error.status = response.status;
    error.endpoint = BOOKINGS_API_URL;
    error.method = method;
    error.responseBody = data;
    throw error;
  }

  return data;
};

export const getChannexStatus = ({ userId }) =>
  requestChannex("/integrations/channex/status", {
    query: { userId },
  });

export const getChannexAriTargets = ({ userId, domitsPropertyId }) =>
  requestChannex("/integrations/channex/ari-targets", {
    query: { userId, domitsPropertyId },
  });

export const getChannexAriPreview = ({ userId, domitsPropertyId, dateFrom, dateTo }) =>
  requestChannex("/integrations/channex/ari-preview", {
    query: { userId, domitsPropertyId, dateFrom, dateTo },
  });

export const getChannexAriPayloadPreview = ({
  userId,
  domitsPropertyId,
  dateFrom,
  dateTo,
  pageDateFrom,
  pageSizeDays,
}) =>
  requestChannex("/integrations/channex/ari-payload-preview", {
    query: { userId, domitsPropertyId, dateFrom, dateTo, pageDateFrom, pageSizeDays },
  });

export const getLatestChannexSyncEvidence = ({ userId, domitsPropertyId }) =>
  requestChannex("/integrations/channex/sync-evidence/latest", {
    query: { userId, domitsPropertyId },
  });

export const listChannexSyncEvidence = ({
  userId,
  integrationAccountId,
  domitsPropertyId,
  syncType,
  status,
  dateFrom,
  dateTo,
  limit,
}) =>
  requestChannex("/integrations/channex/sync-evidence", {
    query: {
      userId,
      integrationAccountId,
      domitsPropertyId,
      syncType,
      status,
      dateFrom,
      dateTo,
      limit,
    },
  });

export const syncChannexAvailability = ({ userId, domitsPropertyId, dateFrom, dateTo }) =>
  requestChannex("/integrations/channex/sync/availability", {
    method: "POST",
    query: { userId, domitsPropertyId, dateFrom, dateTo },
  });

export const syncChannexRestrictions = ({
  userId,
  domitsPropertyId,
  dateFrom,
  dateTo,
}) =>
  requestChannex("/integrations/channex/sync/restrictions", {
    method: "POST",
    query: { userId, domitsPropertyId, dateFrom, dateTo },
  });

export const syncChannexAri = ({ userId, domitsPropertyId, dateFrom, dateTo }) =>
  requestChannex("/integrations/channex/sync/ari", {
    method: "POST",
    query: { userId, domitsPropertyId, dateFrom, dateTo },
  });

export const syncChannexFull = ({ userId, domitsPropertyId, dateFrom, dateTo }) =>
  requestChannex("/integrations/channex/sync/full", {
    method: "POST",
    query: { userId, domitsPropertyId, dateFrom, dateTo },
  });

export const syncChannexCertificationTestCase = ({ userId, domitsPropertyId, testCaseId }) =>
  requestChannex("/integrations/channex/certification/test-case", {
    method: "POST",
    query: { userId, domitsPropertyId },
    body: { testCaseId },
  });

export const receiveChannexBookingRevisions = ({ userId, domitsPropertyId }) =>
  requestChannex("/integrations/channex/bookings/receive", {
    method: "POST",
    query: { userId, domitsPropertyId },
  });

export const ackChannexBookingRevisions = ({ userId, domitsPropertyId, revisionIds }) =>
  requestChannex("/integrations/channex/bookings/ack", {
    method: "POST",
    query: { userId, domitsPropertyId },
    body: { revisionIds },
  });

export const listChannexBookingRevisions = ({
  userId,
  domitsPropertyId,
  limit,
  includeRawPayload = false,
}) =>
  requestChannex("/integrations/channex/bookings/revisions", {
    query: {
      userId,
      domitsPropertyId,
      limit,
      includeRawPayload: includeRawPayload === true ? "true" : undefined,
    },
  });

export const modifyBookingDates = ({ bookingId, arrivalDate, departureDate }) =>
  requestBooking({
    method: "PATCH",
    body: {
      action: "modify-booking-dates",
      bookingId,
      arrivalDate,
      departureDate,
    },
  });
