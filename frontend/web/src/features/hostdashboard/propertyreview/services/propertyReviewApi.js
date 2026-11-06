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
const REQUEST_TIMEOUT_MS = 15000;

export class PropertyReviewApiError extends Error {
  constructor(status, code, message, options) {
    super(message, options);
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

const timeoutError = () =>
  new PropertyReviewApiError(NO_RESPONSE_STATUS, REVIEW_API_ERROR_CODE.UNAVAILABLE, "The request timed out.");

const requestJson = async (path, accessToken, callerSignal) => {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  if (callerSignal?.aborted) controller.abort();
  callerSignal?.addEventListener("abort", forwardAbort);

  try {
    const response = await fetch(`${PROPERTY_API_BASE}${path}`, {
      method: "GET",
      headers: { Authorization: accessToken },
      signal: controller.signal,
    });
    const body = await readJson(response);
    if (timedOut) throw timeoutError();
    return { response, body };
  } catch (error) {
    if (error instanceof PropertyReviewApiError) throw error;
    if (timedOut) throw timeoutError();
    if (error?.name === "AbortError") throw error;
    throw new PropertyReviewApiError(NO_RESPONSE_STATUS, REVIEW_API_ERROR_CODE.NETWORK, "Could not reach the server.", {
      cause: error,
    });
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", forwardAbort);
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

  const { response, body } = await requestJson(path, accessToken, signal);
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
