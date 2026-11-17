import { PROPERTY_API_BASE } from "../../hostproperty/constants";

const PUBLIC_WEBSITE_QUOTE_URL = `${PROPERTY_API_BASE}/website/public/quote`;
const QUOTE_SESSION_SOURCE = "standalone_site";
const QUOTE_CURRENCY = "EUR";

export const WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES = Object.freeze({
  NETWORK_ERROR: "network_error",
  PROPERTY_NOT_FOUND: "property_not_found",
  RATE_LIMITED: "rate_limited",
  UNEXPECTED_RESPONSE: "unexpected_response",
});

export class WebsitePublicQuoteError extends Error {
  constructor({ code, message = "", status = 0, requestId = "" }) {
    super(message);
    this.name = "WebsitePublicQuoteError";
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

const toArray = (value) => (Array.isArray(value) ? value : []);
const toAmount = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const normalizePublicWebsiteQuote = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const total = Number(payload.priceBreakdown?.total);
  const hasEssentials =
    Boolean(payload.quoteId) && Boolean(payload.quoteToken) && Boolean(payload.expiresAt) && Number.isFinite(total);
  if (!hasEssentials) {
    return null;
  }

  return {
    quoteId: String(payload.quoteId),
    siteId: String(payload.siteId || ""),
    propertyId: String(payload.propertyId || ""),
    timezone: payload.timezone ?? null,
    checkIn: String(payload.checkIn || ""),
    checkOut: String(payload.checkOut || ""),
    nights: toAmount(payload.nights),
    guestCount: toAmount(payload.guestCount),
    availability: payload.availability && typeof payload.availability === "object" ? payload.availability : null,
    priceBreakdown: {
      currency: String(payload.priceBreakdown.currency || QUOTE_CURRENCY),
      nightlyBaseTotal: toAmount(payload.priceBreakdown.nightlyBaseTotal),
      cleaningFee: toAmount(payload.priceBreakdown.cleaningFee),
      discounts: toArray(payload.priceBreakdown.discounts),
      taxes: toArray(payload.priceBreakdown.taxes),
      fees: toArray(payload.priceBreakdown.fees),
      total,
    },
    policiesApplied: toArray(payload.policiesApplied),
    expiresAt: String(payload.expiresAt),
    quoteToken: String(payload.quoteToken),
  };
};

const postPublicWebsiteQuote = async (
  { propertyId = "", propertyIds, siteId, checkIn, checkOut, guests, sessionId, signal },
  readAnswer
) => {
  let response;
  try {
    response = await fetch(PUBLIC_WEBSITE_QUOTE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal,
      body: JSON.stringify({
        siteId,
        ...(propertyId ? { propertyId } : {}),
        propertyIds,
        checkIn,
        checkOut,
        guests,
        currency: QUOTE_CURRENCY,
        session: { sessionId, source: QUOTE_SESSION_SOURCE },
      }),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    throw new WebsitePublicQuoteError({
      code: WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES.NETWORK_ERROR,
      message: "The quote request could not reach the server.",
    });
  }

  const payload = parseJsonSafely(await response.text());

  if (!response.ok) {
    const errorBody = payload?.error;
    if (errorBody?.code) {
      throw new WebsitePublicQuoteError({
        code: String(errorBody.code),
        message: String(errorBody.message || ""),
        status: response.status,
        requestId: String(errorBody.requestId || ""),
      });
    }
    if (response.status === 429) {
      throw new WebsitePublicQuoteError({
        code: WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES.RATE_LIMITED,
        message: "Too many quote requests.",
        status: response.status,
      });
    }
    throw new WebsitePublicQuoteError({
      code: WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
      message: "The quote service returned an unexpected response.",
      status: response.status,
    });
  }

  const answer = readAnswer(payload, response);
  if (!answer) {
    throw new WebsitePublicQuoteError({
      code: WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
      message: "The quote service returned an unexpected response.",
      status: response.status,
    });
  }

  return answer;
};

const readSingleQuote = (propertyId) => (payload, response) => {
  const quote = normalizePublicWebsiteQuote(payload);
  if (quote && propertyId && quote.propertyId !== propertyId) {
    throw new WebsitePublicQuoteError({
      code: WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES.PROPERTY_NOT_FOUND,
      message: "The quote service did not quote this property.",
      status: response.status,
    });
  }
  return quote;
};

export const requestPublicWebsiteQuote = (request) =>
  postPublicWebsiteQuote(request, readSingleQuote(request.propertyId));

const readText = (value) => (typeof value === "string" ? value : "");

const readQuoteAnswer = (entry, propertyId) => {
  const quote = normalizePublicWebsiteQuote(entry.quote);
  const isQuoteOfProperty = quote?.propertyId === propertyId && quote.priceBreakdown.currency === QUOTE_CURRENCY;
  if (isQuoteOfProperty && Number.isInteger(entry.quote.priceBreakdown.total)) {
    return { quote };
  }

  const code = readText(entry.error?.code) || WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE;
  return { error: { code, message: readText(entry.error?.message) } };
};

const readQuoteAnswers = (payload, siteId) => {
  if (payload?.siteId !== siteId || !Array.isArray(payload.quotes)) {
    return null;
  }

  const answers = new Map();
  payload.quotes.forEach((entry) => {
    const propertyId = readText(entry?.propertyId);
    if (propertyId && !answers.has(propertyId)) {
      answers.set(propertyId, readQuoteAnswer(entry, propertyId));
    }
  });
  return answers;
};

export const requestPublicWebsiteQuotes = (request) =>
  postPublicWebsiteQuote(request, (payload) => readQuoteAnswers(payload, request.siteId));
