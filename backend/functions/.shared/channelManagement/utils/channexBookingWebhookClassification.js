import { isDsqlConflict } from "../../dsqlRetry.js";

// Channex retries a webhook only after a 5xx, up to 11 times over about 24 hours, and an unacknowledged
// revision stays in the feed. A 503 for a failure that can never succeed would make every later webhook
// for the property fail, so only temporary failures answer 503. Anything unclear answers 200: the
// revision waits in the feed for the next pull, and Channex warns after 30 minutes.
const NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "EPIPE",
  "ENOTFOUND",
  "ECONNABORTED",
  "TimeoutError",
  // Postgres: the database server is shutting down.
  "57P01",
]);
// Postgres SQLSTATE class 08: connection exceptions (08000, 08001, 08006, ...).
const POSTGRES_CONNECTION_EXCEPTION = /^08[0-9A-Z]{3}$/;
// pg raises this without a code, so only the message identifies it.
const CONNECTION_TERMINATED_MESSAGE = /connection terminated unexpectedly/i;
// With a null httpStatus, the provider uses this status for a feed request that never got a response.
const NO_RESPONSE_PROVIDER_STATUS = "BOOKING_FEED_FAILED";

const isTemporaryHttpStatus = (httpStatus) => httpStatus === 429 || httpStatus >= 500;

const isTemporaryFeedFailure = ({ httpStatus, providerStatus }) =>
  isTemporaryHttpStatus(httpStatus) ||
  (httpStatus === null && providerStatus === NO_RESPONSE_PROVIDER_STATUS);

// An acknowledgement without an HTTP status never reached Channex, so it is a network failure.
const isTemporaryAckFailure = (issue) =>
  issue.stage === "ack" && (issue.httpStatus === null || isTemporaryHttpStatus(issue.httpStatus));

const isTemporaryError = (error) => {
  const code = String(error?.code ?? "");
  return (
    isDsqlConflict(error) ||
    NETWORK_ERROR_CODES.has(code) ||
    POSTGRES_CONNECTION_EXCEPTION.test(code) ||
    CONNECTION_TERMINATED_MESSAGE.test(String(error?.message ?? ""))
  );
};

const isTemporaryRevisionIssue = (issue) => isTemporaryAckFailure(issue) || isTemporaryError(issue);

// An unacknowledged revision without a temporary error will fail the same way on the next delivery.
export const isPermanentlyUnacknowledged = (item) =>
  Boolean(item?.unacked) && !(Array.isArray(item.errors) ? item.errors : []).some(isTemporaryRevisionIssue);

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
  // A later page could not be read; acknowledged revisions left the feed, so Channex's retry continues there.
  if (response.morePages) return { statusCode: 503, outcome: "MORE_PAGES" };
  if (response.unackedCount > 0) return { statusCode: 200, outcome: "REVISIONS_UNACKED" };
  return { statusCode: 200, outcome: "PROCESSED" };
};
