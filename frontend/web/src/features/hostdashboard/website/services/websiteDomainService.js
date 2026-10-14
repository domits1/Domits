import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { buildAuthorizedHeaders } from "./websiteSiteService";

const WEBSITE_DOMAINS_URL = `${PROPERTY_API_BASE}/website/domains`;
const WEBSITE_DOMAIN_VERIFY_URL = `${WEBSITE_DOMAINS_URL}/verify`;
const WEBSITE_DOMAIN_PRIMARY_URL = `${WEBSITE_DOMAINS_URL}/primary`;
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
  let rawBody;
  try {
    response = await fetch(url, { method, cache: "no-store", headers, body });
    rawBody = await response.text();
  } catch {
    throw new WebsiteDomainError({
      code: WEBSITE_DOMAIN_CLIENT_ERROR_CODES.NETWORK_ERROR,
      message: "The domain request could not reach the server.",
    });
  }

  const payload = parseJsonSafely(rawBody);
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

const requireDomainView = (payload, fallbackMessage) => {
  if (!payload.domain || typeof payload.domain !== "object") {
    throw new WebsiteDomainError({
      code: WEBSITE_DOMAIN_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
      message: fallbackMessage,
      status: 200,
    });
  }
  return payload.domain;
};

export const connectWebsiteDomain = async ({ siteId, domain }) => {
  const fallbackMessage = "We could not connect this domain.";
  const payload = await sendWebsiteDomainRequest(
    WEBSITE_DOMAINS_URL,
    { method: "POST", body: JSON.stringify({ siteId, domain }) },
    fallbackMessage
  );
  return requireDomainView(payload, fallbackMessage);
};

const requireDomainList = (payload, fallbackMessage) => {
  if (!Array.isArray(payload.domains)) {
    throw new WebsiteDomainError({
      code: WEBSITE_DOMAIN_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
      message: fallbackMessage,
      status: 200,
    });
  }
  return payload.domains;
};

export const verifyWebsiteDomain = async (siteId) => {
  const fallbackMessage = "We could not check this domain.";
  const payload = await sendWebsiteDomainRequest(
    WEBSITE_DOMAIN_VERIFY_URL,
    { method: "POST", body: JSON.stringify({ siteId }) },
    fallbackMessage
  );
  return requireDomainList(payload, fallbackMessage);
};

export const removeWebsiteDomain = async ({ siteId, domain }) => {
  const fallbackMessage = "We could not remove this domain.";
  const payload = await sendWebsiteDomainRequest(
    `${WEBSITE_DOMAINS_URL}?siteId=${encodeURIComponent(siteId)}&domain=${encodeURIComponent(domain)}`,
    { method: "DELETE" },
    fallbackMessage
  );
  return requireDomainList(payload, fallbackMessage);
};

export const promoteWebsiteDomain = async ({ siteId, domain }) => {
  const fallbackMessage = "We could not make this domain the main address.";
  const payload = await sendWebsiteDomainRequest(
    WEBSITE_DOMAIN_PRIMARY_URL,
    { method: "POST", body: JSON.stringify({ siteId, domain }) },
    fallbackMessage
  );
  return requireDomainList(payload, fallbackMessage);
};
