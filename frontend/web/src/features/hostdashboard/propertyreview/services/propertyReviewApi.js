import { PROPERTY_API_BASE } from "../../../../services/propertyApiConfig";
import { getAccessToken } from "../../../../services/getAccessToken";

export const REVIEW_API_ERROR_CODE = Object.freeze({
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_CURSOR: "INVALID_CURSOR",
  UNAVAILABLE: "UNAVAILABLE",
  SERVER: "SERVER",
  NETWORK: "NETWORK",
});

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const UNAVAILABLE_STATUSES = new Set([429, 502, 503, 504]);
const NO_RESPONSE_STATUS = 0;

export class PropertyReviewApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "PropertyReviewApiError";
    this.status = status;
    this.code = code;
  }
}

const codeForStatus = (status) => {
  if (status === HTTP_UNAUTHORIZED) return REVIEW_API_ERROR_CODE.UNAUTHENTICATED;
  if (status === HTTP_FORBIDDEN) return REVIEW_API_ERROR_CODE.FORBIDDEN;
  if (status === HTTP_BAD_REQUEST) return REVIEW_API_ERROR_CODE.INVALID_CURSOR;
  if (UNAVAILABLE_STATUSES.has(status)) return REVIEW_API_ERROR_CODE.UNAVAILABLE;
  return REVIEW_API_ERROR_CODE.SERVER;
};

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const failureMessage = (body, status) =>
  typeof body?.message === "string" ? body.message : `Property review request failed with status ${status}`;

const sendRequest = async (path, accessToken, signal) => {
  try {
    return await fetch(`${PROPERTY_API_BASE}${path}`, {
      method: "GET",
      headers: { Authorization: accessToken },
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new PropertyReviewApiError(NO_RESPONSE_STATUS, REVIEW_API_ERROR_CODE.NETWORK, "Could not reach the server.");
  }
};

export const requestPropertyReview = async (path, { signal } = {}) => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new PropertyReviewApiError(
      HTTP_UNAUTHORIZED,
      REVIEW_API_ERROR_CODE.UNAUTHENTICATED,
      "You must be logged in."
    );
  }

  const response = await sendRequest(path, accessToken, signal);
  const body = await readJson(response);
  if (!response.ok) {
    throw new PropertyReviewApiError(
      response.status,
      codeForStatus(response.status),
      failureMessage(body, response.status)
    );
  }
  if (body === null) {
    throw new PropertyReviewApiError(
      response.status,
      REVIEW_API_ERROR_CODE.SERVER,
      "The server returned an unreadable response."
    );
  }
  return body;
};

export const fetchReviewQueue = async ({ cursor, limit, signal } = {}) => {
  const params = [];
  if (cursor) params.push(`cursor=${encodeURIComponent(cursor)}`);
  if (limit) params.push(`limit=${encodeURIComponent(limit)}`);
  const query = params.length > 0 ? `?${params.join("&")}` : "";

  const body = await requestPropertyReview(`/review/queue${query}`, { signal });
  return {
    properties: Array.isArray(body.properties) ? body.properties : [],
    nextCursor: body.nextCursor ?? null,
  };
};
