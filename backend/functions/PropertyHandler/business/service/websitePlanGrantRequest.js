export const WEBSITE_PLAN_GRANT_MAX_DAYS = 366;
const MAX_GRANT_MS = WEBSITE_PLAN_GRANT_MAX_DAYS * 24 * 60 * 60 * 1000;
const ACCOUNT_ID_MAX_LENGTH = 255;
const REASON_MAX_LENGTH = 500;
const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

const invalidGrant = (message) => Object.assign(new Error(message), { statusCode: 400 });

const readText = (value, maxLength) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 && text.length <= maxLength ? text : null;
};

const isCalendarDate = ([, year, month, day]) => {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day);
};

const readEffectiveUntil = (value, nowMs) => {
  const match = typeof value === "string" ? ISO_DATE_TIME.exec(value) : null;
  if (!match || !isCalendarDate(match)) {
    throw invalidGrant("effectiveUntil must be a date and time with a time zone, such as 2027-05-01T00:00:00Z.");
  }
  const untilMs = Date.parse(value);
  if (untilMs <= nowMs) {
    throw invalidGrant("effectiveUntil must be in the future.");
  }
  if (untilMs - nowMs > MAX_GRANT_MS) {
    throw invalidGrant(`effectiveUntil must be at most ${WEBSITE_PLAN_GRANT_MAX_DAYS} days from now.`);
  }
  return new Date(untilMs);
};

export const readWebsitePlanGrantRequest = (request, nowMs) => {
  const { actorId, accountId, effectiveUntil, reason } = request ?? {};
  const actor = readText(actorId, ACCOUNT_ID_MAX_LENGTH);
  if (!actor) throw invalidGrant("actorId is required.");
  const account = readText(accountId, ACCOUNT_ID_MAX_LENGTH);
  if (!account) throw invalidGrant(`accountId must be 1 to ${ACCOUNT_ID_MAX_LENGTH} characters.`);
  const grantReason = readText(reason, REASON_MAX_LENGTH);
  if (!grantReason) throw invalidGrant(`reason must be 1 to ${REASON_MAX_LENGTH} characters.`);
  return {
    actorId: actor,
    accountId: account,
    effectiveUntil: readEffectiveUntil(effectiveUntil, nowMs),
    reason: grantReason,
  };
};
