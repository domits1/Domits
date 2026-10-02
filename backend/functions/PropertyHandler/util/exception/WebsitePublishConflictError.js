export const WEBSITE_PUBLISH_CONFLICT_ERROR_CODE = "publish_conflict";

export class WebsitePublishConflictError extends Error {
  constructor({ cause } = {}) {
    super(
      "Another publish of this website is still being saved. Wait a moment and publish again.",
      cause ? { cause } : undefined
    );
    this.name = "WebsitePublishConflictError";
    this.code = WEBSITE_PUBLISH_CONFLICT_ERROR_CODE;
    this.statusCode = 409;
  }
}
