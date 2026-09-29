import { CHANNEX_ARI_CHANGE_TYPE, CHANNEX_ARI_OUTBOX_DEFAULTS } from "./channexAriOutboxConstants.js";

const TYPE_ORDER = [
  CHANNEX_ARI_CHANGE_TYPE.AVAILABILITY,
  CHANNEX_ARI_CHANGE_TYPE.RATES,
  CHANNEX_ARI_CHANGE_TYPE.RESTRICTIONS,
];
const DAY_MS = 24 * 60 * 60 * 1000;

const dateIntToUtcMs = (value) =>
  Date.UTC(Math.floor(value / 10000), Math.floor((value % 10000) / 100) - 1, value % 100);

export const expandDateRange = (dateFrom, dateTo) => {
  const dates = [];
  for (let cursor = dateIntToUtcMs(dateFrom); cursor <= dateIntToUtcMs(dateTo); cursor += DAY_MS) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return dates;
};

// The pipeline applies one set of change types to every date it receives, so a
// call may only combine types that changed on exactly the same dates. Otherwise a
// date where only the minimum stay changed would also receive a price (design D9).
export const groupChangesForSend = (rows) => {
  const datesByType = new Map();
  for (const row of rows) {
    const dates = expandDateRange(row.dateFrom, row.dateTo);
    for (const type of row.changeTypes) {
      if (!datesByType.has(type)) datesByType.set(type, new Set());
      for (const date of dates) datesByType.get(type).add(date);
    }
  }

  const groups = new Map();
  for (const type of TYPE_ORDER) {
    if (!datesByType.has(type)) continue;
    for (const changedDates of splitIntoSpans([...datesByType.get(type)].sort())) {
      const key = changedDates.join(",");
      if (!groups.has(key)) groups.set(key, { changeTypes: [], changedDates });
      groups.get(key).changeTypes.push(type);
    }
  }
  return [...groups.values()];
};

// The sync pipeline refuses a call whose first and last date are more than 500 days
// apart (channexAriExecutionUtils.js:161), so dates far apart go out in separate calls.
const MAX_SPAN_DAYS = 500;

const splitIntoSpans = (sortedDates) => {
  const spans = [];
  for (const date of sortedDates) {
    const current = spans.at(-1);
    const withinSpan = current && (Date.parse(date) - Date.parse(current[0])) / DAY_MS < MAX_SPAN_DAYS;
    if (withinSpan) current.push(date);
    else spans.push([date]);
  }
  return spans;
};

export const OUTCOME = Object.freeze({
  PROCESSED: "PROCESSED",
  SKIPPED: "SKIPPED",
  FAILED: "FAILED",
  RETRY: "RETRY",
});

const OUTCOME_SEVERITY = [OUTCOME.SKIPPED, OUTCOME.FAILED, OUTCOME.RETRY, OUTCOME.PROCESSED];

const isTemporary = (httpStatus) =>
  httpStatus === null || httpStatus === undefined || httpStatus === 429 || httpStatus >= 500;

// A provider call in the 2xx range is accepted even when Channex reports warnings as a
// failure (providerClient.js:156 sets success: false but httpStatus stays 200).
const isAccepted = (httpStatus) => httpStatus >= 200 && httpStatus < 300;

// These errorCodes mean the pipeline never reached the provider: a local exception with no
// results (channexAvailabilitySyncService.js:636-643) or a secret that could not be read
// (channexAriExecutionService.js:149-156). Neither is the provider rejecting the request, so
// both are worth retrying rather than failing outright.

export const classifySyncResponse = (result) => {
  const body = result?.response || {};
  if (body.ready === false) return { outcome: OUTCOME.SKIPPED, reason: "NOT_MAPPED", taskIds: [] };

  const results = (body.steps || []).flatMap((step) => step.results || []);

  if (results.length && results.every((item) => isAccepted(item.httpStatus))) {
    return { outcome: OUTCOME.PROCESSED, reason: null, taskIds: body.taskIds || [] };
  }

  const failed = results.filter((item) => !isAccepted(item.httpStatus));

  if (failed.length) {
    const auth = failed.find((item) => item.httpStatus === 401 || item.httpStatus === 403);
    if (auth) return { outcome: OUTCOME.FAILED, reason: auth.errorCode || "CHANNEX_UNAUTHORIZED", taskIds: [] };

    const temporary = failed.filter((item) => isTemporary(item.httpStatus));
    if (temporary.length) {
      // One answer can hold several refused calls; waiting for the longest Retry-After
      // respects every one of them.
      const retryAfterMs = Math.max(0, ...temporary.map((item) => item.retryAfterMs || 0));
      return {
        outcome: OUTCOME.RETRY,
        reason: temporary[0].errorCode || "CHANNEX_TEMPORARY",
        taskIds: [],
        retryAfterMs: retryAfterMs || null,
      };
    }

    return { outcome: OUTCOME.FAILED, reason: failed[0].errorCode || "CHANNEX_REJECTED", taskIds: [] };
  }

  // No provider call failed, but the pipeline stopped earlier (for example missing credentials).
  if (result?.statusCode >= 400) {
    // No provider call failed, so the problem was ours: a 5xx is a database or network
    // blip and is safe to retry, as is a secret that could not be read. Anything else,
    // such as a Channex account that needs reconnecting, will not fix itself.
    const temporary = result.statusCode >= 500 || body.errorCode === "CHANNEX_SECRET_READ_FAILED";
    return {
      outcome: temporary ? OUTCOME.RETRY : OUTCOME.FAILED,
      reason: body.errorCode || "CHANNEX_SYNC_FAILED",
      taskIds: [],
    };
  }

  if (body.calledProvider === false) {
    return { outcome: OUTCOME.FAILED, reason: "CHANNEX_NOTHING_SENT", taskIds: [] };
  }

  return { outcome: OUTCOME.PROCESSED, reason: null, taskIds: body.taskIds || [] };
};

// A property can need several calls. If they disagree, the worst outcome applies to
// all its rows: resending a change that already went out is harmless (design D1).
export const worstOutcome = (outcomes) =>
  OUTCOME_SEVERITY.find((outcome) => outcomes.includes(outcome)) || OUTCOME.PROCESSED;

// Stop starting new properties while there is still time to finish the one that is
// running; with less than the reserve left, start nothing instead of being cut off.
export const outboxTimeBudgetMs = (remainingTimeMs) => {
  const maxBudgetMs = 45_000;
  const reserveMs = 20_000;
  if (!Number.isFinite(remainingTimeMs)) return maxBudgetMs;
  return Math.max(0, Math.min(maxBudgetMs, remainingTimeMs - reserveMs));
};

// 1, 2, 4, 8, 16, 32 minutes, then capped at an hour, plus up to 10% jitter so
// many properties hit by the same Channex outage do not all retry together.
export const nextRetryDelayMs = (attempt, random = Math.random) => {
  const { RETRY_BASE_MS, RETRY_CAP_MS, RETRY_JITTER } = CHANNEX_ARI_OUTBOX_DEFAULTS;
  const delay = Math.min(RETRY_CAP_MS, RETRY_BASE_MS * 2 ** (Math.max(1, attempt) - 1));
  return Math.round(delay * (1 + RETRY_JITTER * random()));
};

// The Channex endpoint a change type goes to; each has its own rate limit.
export const callTypeOf = (changeType) =>
  changeType === CHANNEX_ARI_CHANGE_TYPE.AVAILABILITY ? "availability" : "restrictions";

export const sharesCallType = (changeTypesA, changeTypesB) => {
  const callTypes = new Set(changeTypesA.map(callTypeOf));
  return changeTypesB.some((type) => callTypes.has(callTypeOf(type)));
};
