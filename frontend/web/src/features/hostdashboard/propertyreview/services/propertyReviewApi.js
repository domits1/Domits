import { PROPERTY_API_BASE } from "../../../../services/propertyApiConfig";
import { getAccessToken } from "../../../../services/getAccessToken";

export const REVIEW_API_ERROR_CODE = Object.freeze({
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  INVALID_CURSOR: "INVALID_CURSOR",
  BAD_REQUEST: "BAD_REQUEST",
  STALE_REVIEW: "STALE_REVIEW",
  WRONG_STATUS: "WRONG_STATUS",
  UNAVAILABLE: "UNAVAILABLE",
  SERVER: "SERVER",
  NETWORK: "NETWORK",
});

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_METHOD_GET = "GET";
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

const CONFLICT_CODES = Object.freeze({
  stale_review: REVIEW_API_ERROR_CODE.STALE_REVIEW,
  wrong_status: REVIEW_API_ERROR_CODE.WRONG_STATUS,
});

const codeForStatus = (status, method, body) => {
  if (status === HTTP_UNAUTHORIZED) return REVIEW_API_ERROR_CODE.UNAUTHENTICATED;
  if (status === HTTP_FORBIDDEN) return REVIEW_API_ERROR_CODE.FORBIDDEN;
  if (status === HTTP_NOT_FOUND) return REVIEW_API_ERROR_CODE.NOT_FOUND;
  if (status === HTTP_BAD_REQUEST) {
    return method === HTTP_METHOD_GET ? REVIEW_API_ERROR_CODE.INVALID_CURSOR : REVIEW_API_ERROR_CODE.BAD_REQUEST;
  }
  if (status === HTTP_CONFLICT) return CONFLICT_CODES[body?.code] ?? REVIEW_API_ERROR_CODE.SERVER;
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

const requestJson = async (path, accessToken, callerSignal, { method, body: payload }) => {
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
    const hasPayload = payload !== undefined;
    const headers = { Authorization: accessToken };
    if (hasPayload) headers["Content-Type"] = "application/json";
    const response = await fetch(`${PROPERTY_API_BASE}${path}`, {
      method,
      headers,
      ...(hasPayload && { body: JSON.stringify(payload) }),
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

export const requestPropertyReview = async (path, { signal, method = HTTP_METHOD_GET, body: payload } = {}) => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new PropertyReviewApiError(
      HTTP_UNAUTHORIZED,
      REVIEW_API_ERROR_CODE.UNAUTHENTICATED,
      "You must be logged in."
    );
  }

  const { response, body } = await requestJson(path, accessToken, signal, { method, body: payload });
  if (!response.ok) {
    throw new PropertyReviewApiError(
      response.status,
      codeForStatus(response.status, method, body),
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

export const fetchReviewDetail = (propertyId, { signal } = {}) =>
  requestPropertyReview(`/review/detail?propertyId=${encodeURIComponent(propertyId)}`, { signal });

export const approveListing = (propertyId, updatedAt) =>
  requestPropertyReview("/review/approve", { method: "POST", body: { propertyId, updatedAt } });
