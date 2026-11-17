export const WEBSITE_PUBLISH_NOT_ALLOWED_ERROR_CODE = "listing_not_active";

export class WebsitePublishNotAllowedError extends Error {
  constructor() {
    super("Your listing must be approved and live on Domits before you can publish its website.");
    this.name = "WebsitePublishNotAllowedError";
    this.code = WEBSITE_PUBLISH_NOT_ALLOWED_ERROR_CODE;
    this.statusCode = 400;
  }
}
