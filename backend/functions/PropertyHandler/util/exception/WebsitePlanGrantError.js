export const WEBSITE_PLAN_GRANT_ERROR_CODES = Object.freeze({
  PAID_PLAN_ACTIVE: "paid_plan_active",
  CONFLICT: "conflict",
});

const MESSAGES = Object.freeze({
  [WEBSITE_PLAN_GRANT_ERROR_CODES.PAID_PLAN_ACTIVE]:
    "This host pays for a website plan subscription, so a plan cannot be granted.",
  [WEBSITE_PLAN_GRANT_ERROR_CODES.CONFLICT]:
    "The website plan of this host was changed at the same time. Check the current plan and try again.",
});

export class WebsitePlanGrantError extends Error {
  constructor(code, { cause } = {}) {
    super(MESSAGES[code], cause ? { cause } : undefined);
    this.name = "WebsitePlanGrantError";
    this.code = code;
    this.statusCode = 409;
  }
}
