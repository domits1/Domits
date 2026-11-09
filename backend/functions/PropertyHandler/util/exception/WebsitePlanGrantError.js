export const WEBSITE_PLAN_GRANT_ERROR_CODES = Object.freeze({
  PAID_PLAN_ACTIVE: "paid_plan_active",
  CONFLICT: "conflict",
  NOT_GRANTED: "not_granted",
});

const CONFLICT_MESSAGE =
  "The website plan of this host was changed at the same time. Check the current plan and try again.";

const MESSAGES = Object.freeze({
  [WEBSITE_PLAN_GRANT_ERROR_CODES.PAID_PLAN_ACTIVE]:
    "This host pays for a website plan subscription, so a plan cannot be granted.",
  [WEBSITE_PLAN_GRANT_ERROR_CODES.CONFLICT]: CONFLICT_MESSAGE,
});

const REVOKE_MESSAGES = Object.freeze({
  [WEBSITE_PLAN_GRANT_ERROR_CODES.PAID_PLAN_ACTIVE]:
    "This host pays for a website plan subscription, so the plan cannot be revoked.",
  [WEBSITE_PLAN_GRANT_ERROR_CODES.NOT_GRANTED]: "This host has no running Elite grant, so there is nothing to revoke.",
  [WEBSITE_PLAN_GRANT_ERROR_CODES.CONFLICT]: CONFLICT_MESSAGE,
});

export class WebsitePlanGrantError extends Error {
  constructor(code, { cause, message = MESSAGES[code] } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "WebsitePlanGrantError";
    this.code = code;
    this.statusCode = 409;
  }
}

export class WebsitePlanRevokeError extends WebsitePlanGrantError {
  constructor(code, { cause } = {}) {
    super(code, { cause, message: REVOKE_MESSAGES[code] });
    this.name = "WebsitePlanRevokeError";
  }
}
