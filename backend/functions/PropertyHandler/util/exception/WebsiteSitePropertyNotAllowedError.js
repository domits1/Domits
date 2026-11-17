export const WEBSITE_SITE_PROPERTY_NOT_ALLOWED_ERROR_CODE = "site_property_not_active";

export class WebsiteSitePropertyNotAllowedError extends Error {
  constructor() {
    super("Every property on your website must be yours, approved and live on Domits before you can publish it.");
    this.name = "WebsiteSitePropertyNotAllowedError";
    this.code = WEBSITE_SITE_PROPERTY_NOT_ALLOWED_ERROR_CODE;
    this.statusCode = 400;
  }
}
