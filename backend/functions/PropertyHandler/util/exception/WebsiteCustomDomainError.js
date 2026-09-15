export const WEBSITE_CUSTOM_DOMAIN_ERROR_CODES = Object.freeze({
  INVALID_DOMAIN: "invalid_domain",
  DOMAIN_TAKEN: "domain_taken",
  DOMAIN_NOT_FOUND: "domain_not_found",
  TENANT_CREATE_FAILED: "tenant_create_failed",
  SYNC_FAILED: "sync_failed",
});

const STATUS_CODE_BY_ERROR_CODE = Object.freeze({
  [WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.INVALID_DOMAIN]: 400,
  [WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN]: 409,
  [WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND]: 404,
  [WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.TENANT_CREATE_FAILED]: 502,
  [WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.SYNC_FAILED]: 502,
});

export class WebsiteCustomDomainError extends Error {
  constructor(code, message, { cause } = {}) {
    const statusCode = STATUS_CODE_BY_ERROR_CODE[code];
    if (!statusCode) {
      throw new TypeError(`Unknown website custom domain error code: ${code}`);
    }
    super(message, cause ? { cause } : undefined);
    this.name = "WebsiteCustomDomainError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
