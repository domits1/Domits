export const WEBSITE_DELETE_CONFLICT_ERROR_CODE = "delete_conflict";

export class WebsiteDeleteConflictError extends Error {
  constructor({ cause } = {}) {
    super(
      "Deleting this website clashed with another change that was being saved at the same time. Wait a moment and delete it again.",
      cause ? { cause } : undefined
    );
    this.name = "WebsiteDeleteConflictError";
    this.code = WEBSITE_DELETE_CONFLICT_ERROR_CODE;
    this.statusCode = 409;
  }
}
