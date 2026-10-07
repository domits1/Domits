import { classifyWebhookPullResult } from "../../.shared/channelManagement/utils/channexBookingWebhookClassification.js";

const pulled = (overrides = {}) => ({
  statusCode: 200,
  response: { fetchedCount: 1, ackedCount: 1, unackedCount: 0, errors: [], overallSuccess: true, ...overrides },
});

const feedFailure = (overrides = {}) => ({
  statusCode: 502,
  response: { errorCode: "CHANNEX_BOOKING_FEED_FAILED", providerStatus: "BOOKING_FEED_FAILED", ...overrides },
});

const unackedWith = (error) => pulled({ ackedCount: 0, unackedCount: 1, errors: [error], overallSuccess: false });

// Channex retries only a 5xx, up to 11 times over about 24 hours, and an unacknowledged revision stays in
// the feed. A 503 for a failure that can never succeed would make every later webhook for the property fail,
// so only temporary failures may return 503; anything unclear returns 200 and waits for the next pull.
describe("classifyWebhookPullResult", () => {
  test("every revision stored and acknowledged answers 200 PROCESSED", () => {
    expect(classifyWebhookPullResult(pulled())).toEqual({ statusCode: 200, outcome: "PROCESSED" });
  });

  test("an empty feed answers 200 PROCESSED", () => {
    expect(classifyWebhookPullResult(pulled({ fetchedCount: 0, ackedCount: 0 }))).toEqual({
      statusCode: 200,
      outcome: "PROCESSED",
    });
  });

  test("a pull stopped at the deadline answers 503 so Channex retries the rest", () => {
    expect(classifyWebhookPullResult(pulled({ stoppedAtDeadline: true, overallSuccess: false }))).toEqual({
      statusCode: 503,
      outcome: "DEADLINE_REACHED",
    });
  });

  // The feed returns one page; acknowledged revisions leave the feed, so a retry reads the next batch.
  describe("feed pages", () => {
    test("more revisions waiting than this pull fetched answers 503 MORE_PAGES", () => {
      expect(
        classifyWebhookPullResult(pulled({ fetchedCount: 100, ackedCount: 100, feedMeta: { total: 150, limit: 100 } }))
      ).toEqual({ statusCode: 503, outcome: "MORE_PAGES" });
    });

    test("a pull that fetched every waiting revision answers 200", () => {
      expect(
        classifyWebhookPullResult(pulled({ fetchedCount: 3, ackedCount: 3, feedMeta: { total: 3, limit: 100 } }))
      ).toEqual({ statusCode: 200, outcome: "PROCESSED" });
    });

    test("a pull without feed meta answers as before", () => {
      expect(classifyWebhookPullResult(pulled({ feedMeta: null }))).toEqual({ statusCode: 200, outcome: "PROCESSED" });
    });
  });

  describe("feed failures", () => {
    it.each([
      { description: "rate limited", httpStatus: 429 },
      { description: "a Channex server error", httpStatus: 503 },
      { description: "no response at all", httpStatus: null },
    ])("$description is temporary: 503", ({ httpStatus }) => {
      expect(classifyWebhookPullResult(feedFailure({ httpStatus }))).toEqual({
        statusCode: 503,
        outcome: "FEED_TEMPORARY_FAILURE",
      });
    });

    test("401 means the account's key no longer works: 200 FEED_UNAUTHORIZED", () => {
      expect(classifyWebhookPullResult(feedFailure({ httpStatus: 401, providerStatus: "UNAUTHORIZED" }))).toEqual({
        statusCode: 200,
        outcome: "FEED_UNAUTHORIZED",
      });
    });

    test("another 4xx will not succeed on a retry: 200 FEED_REJECTED", () => {
      expect(classifyWebhookPullResult(feedFailure({ httpStatus: 404 }))).toEqual({
        statusCode: 200,
        outcome: "FEED_REJECTED",
      });
    });

    test("a request refused before calling Channex is not a network failure: 200 FEED_REJECTED", () => {
      expect(
        classifyWebhookPullResult(feedFailure({ httpStatus: null, providerStatus: "INVALID_CREDENTIALS" }))
      ).toEqual({ statusCode: 200, outcome: "FEED_REJECTED" });
    });
  });

  describe("revisions that were not acknowledged", () => {
    it.each([
      { description: "an acknowledgement rate limited", error: { code: "X", stage: "ack", httpStatus: 429 } },
      { description: "an acknowledgement server error", error: { code: "X", stage: "ack", httpStatus: 502 } },
      { description: "an acknowledgement without response", error: { code: "Error", stage: "ack", httpStatus: null } },
      { description: "a DSQL conflict while storing", error: { code: "40001" } },
      { description: "a DSQL OC001 conflict while storing", error: { code: "OC001" } },
      { description: "a dropped database connection", error: { code: "ECONNRESET" } },
      { description: "a DNS lookup failure", error: { code: "ENOTFOUND" } },
      { description: "an aborted connection", error: { code: "ECONNABORTED" } },
      { description: "a Postgres connection exception (08006)", error: { code: "08006" } },
      { description: "a Postgres connection that could not be established (08001)", error: { code: "08001" } },
      { description: "a database server shutting down (57P01)", error: { code: "57P01" } },
      { description: "an AWS SDK timeout", error: { code: "TimeoutError" } },
      // pg raises this without a code; the import stores the error name, so only the message identifies it.
      {
        description: "a connection terminated without a code",
        error: { code: "Error", message: "Connection terminated unexpectedly" },
      },
    ])("$description is temporary: 503", ({ error }) => {
      expect(classifyWebhookPullResult(unackedWith(error))).toEqual({
        statusCode: 503,
        outcome: "REVISION_TEMPORARY_FAILURE",
      });
    });

    it.each([
      { description: "an acknowledgement Channex refused", error: { code: "X", stage: "ack", httpStatus: 422 } },
      { description: "a modification without a linked booking", error: { code: "CHANNEX_MODIFIED_BOOKING_LINK_MISSING" } },
      { description: "a revision not received by the feed", error: { code: "X", stage: "local_lookup", httpStatus: null } },
      { description: "an unknown error", error: { code: "SOMETHING_ELSE" } },
    ])("$description is permanent: 200 REVISIONS_UNACKED", ({ error }) => {
      expect(classifyWebhookPullResult(unackedWith(error))).toEqual({
        statusCode: 200,
        outcome: "REVISIONS_UNACKED",
      });
    });

    test("a skipped revision without an error is permanent: 200 REVISIONS_UNACKED", () => {
      expect(classifyWebhookPullResult(pulled({ ackedCount: 0, unackedCount: 1, overallSuccess: false }))).toEqual({
        statusCode: 200,
        outcome: "REVISIONS_UNACKED",
      });
    });

    test("one temporary failure among permanent ones still answers 503", () => {
      const result = pulled({
        ackedCount: 1,
        unackedCount: 2,
        errors: [{ code: "CHANNEX_MODIFIED_BOOKING_LINK_MISSING" }, { code: "40001" }],
        overallSuccess: false,
      });

      expect(classifyWebhookPullResult(result).statusCode).toBe(503);
    });
  });
});
