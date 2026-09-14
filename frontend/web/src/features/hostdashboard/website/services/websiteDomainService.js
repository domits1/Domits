import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { buildAuthorizedHeaders } from "./websiteSiteService";

const WEBSITE_DOMAINS_URL = `${PROPERTY_API_BASE}/website/domains`;
const WEBSITE_DOMAIN_VERIFY_URL = `${WEBSITE_DOMAINS_URL}/verify`;
const JSON_CONTENT_TYPE = "application/json";

export const WEBSITE_DOMAIN_CLIENT_ERROR_CODES = Object.freeze({
  NETWORK_ERROR: "network_error",
  UNAUTHORIZED: "unauthorized",
  UNEXPECTED_RESPONSE: "unexpected_response",
});

export class WebsiteDomainError extends Error {
  constructor({ code, message = "", status = 0, requestId = "" }) {
    super(message);
    this.name = "WebsiteDomainError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

const parseJsonSafely = (rawBody) => {
  try {
    return rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return null;
  }
};

const buildDomainRequestHeaders = (contentType) => {
  try {
    return buildAuthorizedHeaders(contentType);
  } catch (error) {
    throw new WebsiteDomainError({
      code: WEBSITE_DOMAIN_CLIENT_ERROR_CODES.UNAUTHORIZED,
      message: error?.message || "You must be signed in to manage domains.",
      status: 401,
    });
  }
};

const sendWebsiteDomainRequest = async (url, { method, body = null }, fallbackMessage) => {
  const headers = buildDomainRequestHeaders(body ? JSON_CONTENT_TYPE : null);
  let response;
  try {
    response = await fetch(url, { method, cache: "no-store", headers, body });
  } catch {
    throw new WebsiteDomainError({
      code: WEBSITE_DOMAIN_CLIENT_ERROR_CODES.NETWORK_ERROR,
      message: "The domain request could not reach the server.",
    });
  }

  const payload = parseJsonSafely(await response.text());
  if (!response.ok) {
    const errorBody = payload?.error;
    throw new WebsiteDomainError({
      code: String(errorBody?.code || WEBSITE_DOMAIN_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE),
      message: String(errorBody?.message || fallbackMessage),
      status: response.status,
      requestId: String(errorBody?.requestId || ""),
    });
  }
  if (!payload || typeof payload !== "object") {
    throw new WebsiteDomainError({
      code: WEBSITE_DOMAIN_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
      message: fallbackMessage,
      status: response.status,
    });
  }

  return payload;
};

export const fetchWebsiteDomains = async (siteId) => {
  const payload = await sendWebsiteDomainRequest(
    `${WEBSITE_DOMAINS_URL}?siteId=${encodeURIComponent(siteId)}`,
    { method: "GET" },
    "We could not load the domains for this website."
  );
  return Array.isArray(payload.domains) ? payload.domains : [];
};

export const connectWebsiteDomain = async ({ siteId, domain }) => {
  const payload = await sendWebsiteDomainRequest(
    WEBSITE_DOMAINS_URL,
    { method: "POST", body: JSON.stringify({ siteId, domain }) },
    "We could not connect this domain."
  );
  return payload.domain || null;
};

export const verifyWebsiteDomain = async (siteId) => {
  const payload = await sendWebsiteDomainRequest(
    WEBSITE_DOMAIN_VERIFY_URL,
    { method: "POST", body: JSON.stringify({ siteId }) },
    "We could not check this domain."
  );
  return payload.domain || null;
};
