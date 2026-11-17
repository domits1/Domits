export const WEBSITE_CONTACT_ERROR_CODES = Object.freeze({
  INVALID_REQUEST: "invalid_request",
  SITE_NOT_FOUND: "site_not_found",
  PROPERTY_NOT_FOUND: "property_not_found",
  RATE_LIMITED: "rate_limited",
  CONTACT_UNAVAILABLE: "contact_unavailable",
  MESSAGE_NOT_SENT: "message_not_sent",
  INTERNAL_ERROR: "internal_error",
});

const STATUS_CODE_BY_ERROR_CODE = Object.freeze({
  [WEBSITE_CONTACT_ERROR_CODES.INVALID_REQUEST]: 400,
  [WEBSITE_CONTACT_ERROR_CODES.SITE_NOT_FOUND]: 404,
  [WEBSITE_CONTACT_ERROR_CODES.PROPERTY_NOT_FOUND]: 404,
  [WEBSITE_CONTACT_ERROR_CODES.RATE_LIMITED]: 429,
  [WEBSITE_CONTACT_ERROR_CODES.CONTACT_UNAVAILABLE]: 503,
  [WEBSITE_CONTACT_ERROR_CODES.MESSAGE_NOT_SENT]: 503,
  [WEBSITE_CONTACT_ERROR_CODES.INTERNAL_ERROR]: 500,
});

export class WebsiteContactError extends Error {
  constructor(code, message, field = null) {
    const statusCode = STATUS_CODE_BY_ERROR_CODE[code];
    if (!statusCode) {
      throw new TypeError(`Unknown website contact error code: ${code}`);
    }
    super(message);
    this.name = "WebsiteContactError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
  }
}
