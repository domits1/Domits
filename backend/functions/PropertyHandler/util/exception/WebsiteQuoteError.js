export const WEBSITE_QUOTE_ERROR_CODES = Object.freeze({
  INVALID_DATE_RANGE: "invalid_date_range",
  INVALID_GUEST_COUNT: "invalid_guest_count",
  UNAVAILABLE_DATES: "unavailable_dates",
  STAY_RESTRICTION_VIOLATION: "stay_restriction_violation",
  QUOTE_UNAVAILABLE: "quote_unavailable",
  PRICING_SERVICE_UNAVAILABLE: "pricing_service_unavailable",
});

const STATUS_CODE_BY_ERROR_CODE = Object.freeze({
  [WEBSITE_QUOTE_ERROR_CODES.INVALID_DATE_RANGE]: 400,
  [WEBSITE_QUOTE_ERROR_CODES.INVALID_GUEST_COUNT]: 400,
  [WEBSITE_QUOTE_ERROR_CODES.UNAVAILABLE_DATES]: 409,
  [WEBSITE_QUOTE_ERROR_CODES.STAY_RESTRICTION_VIOLATION]: 409,
  [WEBSITE_QUOTE_ERROR_CODES.QUOTE_UNAVAILABLE]: 422,
  [WEBSITE_QUOTE_ERROR_CODES.PRICING_SERVICE_UNAVAILABLE]: 503,
});

export class WebsiteQuoteError extends Error {
  constructor(code, message) {
    const statusCode = STATUS_CODE_BY_ERROR_CODE[code];
    if (!statusCode) {
      throw new TypeError(`Unknown website quote error code: ${code}`);
    }
    super(message);
    this.name = "WebsiteQuoteError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
