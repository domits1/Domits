import { isDsqlConflict } from "../../dsqlRetry.js";

// Channex retries a webhook only after a 5xx, up to 11 times over about 24 hours, and an unacknowledged
// revision stays in the feed. A 503 for a failure that can never succeed would make every later webhook
// for the property fail, so only temporary failures answer 503. Anything unclear answers 200: the
// revision waits in the feed for the next pull, and Channex warns after 30 minutes.
const NETWORK_ERROR_CODES = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "EPIPE"]);
const NETWORK_FAILURE_PROVIDER_STATUSES = new Set(["BOOKING_FEED_FAILED"]);

const isTemporaryHttpStatus = (httpStatus) => httpStatus === 429 || httpStatus >= 500;

const isTemporaryFeedFailure = ({ httpStatus, providerStatus }) =>
  isTemporaryHttpStatus(httpStatus) ||
  (httpStatus === null && NETWORK_FAILURE_PROVIDER_STATUSES.has(providerStatus));

// An acknowledgement without an HTTP status never reached Channex, so it is a network failure.
const isTemporaryAckFailure = (issue) =>
  issue.stage === "ack" && (issue.httpStatus === null || isTemporaryHttpStatus(issue.httpStatus));

export const isTemporaryError = (error) => isDsqlConflict(error) || NETWORK_ERROR_CODES.has(error?.code);

const isTemporaryRevisionIssue = (issue) => isTemporaryAckFailure(issue) || isTemporaryError(issue);

const classifyFeedFailure = (response) => {
  if (isTemporaryFeedFailure(response)) return { statusCode: 503, outcome: "FEED_TEMPORARY_FAILURE" };
  if (response.httpStatus === 401) return { statusCode: 200, outcome: "FEED_UNAUTHORIZED" };
  return { statusCode: 200, outcome: "FEED_REJECTED" };
};

export const classifyWebhookPullResult = (pullResult) => {
  const response = pullResult?.response || {};
  if (pullResult?.statusCode !== 200) return classifyFeedFailure(response);
  if (response.stoppedAtDeadline) return { statusCode: 503, outcome: "DEADLINE_REACHED" };

  const errors = Array.isArray(response.errors) ? response.errors : [];
  if (errors.some(isTemporaryRevisionIssue)) return { statusCode: 503, outcome: "REVISION_TEMPORARY_FAILURE" };
  // Acknowledged revisions leave the feed, so Channex's retry reads the next page.
  if (Number(response.feedMeta?.total) > Number(response.fetchedCount)) return { statusCode: 503, outcome: "MORE_PAGES" };
  if (response.unackedCount > 0) return { statusCode: 200, outcome: "REVISIONS_UNACKED" };
  return { statusCode: 200, outcome: "PROCESSED" };
};
