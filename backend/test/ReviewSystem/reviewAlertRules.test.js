import { ReviewAlertRules as Rules, responseOverdueHours } from "../../functions/ReviewSystem/business/model/reviewAlertRules.js";

const HOUR = 3_600_000;
const publishedAt = 1_800_000_000_000;
const review = Object.freeze({ id: "review-1", host_id: "host-1", property_id: "property-1",
  review_type: "GUEST_TO_PROPERTY", overall_rating: 2, status: "PUBLISHED", publication_status: "PUBLISHED" });
const input = (overrides = {}) => ({ review, publishedAt, now: publishedAt + 72 * HOUR, ...overrides });
const response = (overrides = {}) => ({ reviewId: review.id, authorRole: "host", status: "published",
  publishedAt: publishedAt + HOUR, deletedAt: null, ...overrides });
const trendInput = (overrides = {}) => ({ trend: { property_id: review.property_id, trend_status: "DECLINING" },
  recipientUserId: review.host_id, previousStart: publishedAt - 48 * HOUR,
  currentStart: publishedAt - 24 * HOUR, endExclusive: publishedAt, ...overrides });

describe("ReviewAlertRules", () => {
  test("normalizes candidates and identifies a publication transition", () => {
    const alert = Rules.newReview(input({ previousReview: { ...review, status: "APPROVED", publication_status: "UNPUBLISHED" } }));
    expect(alert).toEqual({ type: "NEW_REVIEW", recipientUserId: "host-1", propertyId: "property-1",
      reviewId: "review-1", eventTimestamp: publishedAt, eventKey: expect.any(String) });
    expect(Rules.newReview(input({ previousReview: review }))).toBeNull();
  });

  test.each([
    { status: "APPROVED" }, { status: "DRAFT" }, { status: "DELETED" }, { status: "REJECTED" },
    { publication_status: "UNPUBLISHED" }, { publication_status: undefined },
    { review_type: "HOST_TO_GUEST" }, { review_type: undefined }, { deletedAt: 0 }, { deleted_at: publishedAt },
    { host_id: "" }, { property_id: null }, { id: undefined },
    { overall_rating: null }, { overall_rating: undefined }, { overall_rating: NaN },
    { overall_rating: 0 }, { overall_rating: 6 }, { overall_rating: "2" }, { overall_rating: 1.1 },
  ])("excludes ineligible reviews: %j", (changes) => {
    expect(Rules.evaluateReview(input({ review: { ...review, ...changes } }))).toEqual([]);
  });

  test.each([[1, true], [1.5, true], [2, true], [2.5, false], [3, false], [5, false]])(
    "uses the overall low-rating boundary for %s", (rating, low) => {
      const result = Rules.lowRating(input({ review: { ...review, overall_rating: rating,
        categoryRatings: { cleanliness: 1 } } }));
      expect(Boolean(result)).toBe(low);
    });

  test.each([undefined, null, "", " ", 0, -1, NaN, Infinity, "invalid", true, {}, 1e20, 1e-20])(
    "falls back to 72 hours for invalid configuration %p", (overdueHours) => {
      expect(responseOverdueHours(overdueHours)).toBe(72);
      expect(Rules.responseOverdue(input({ overdueHours })).eventTimestamp).toBe(publishedAt + 72 * HOUR);
    });

  test.each([24, "24", 0.5])("supports configurable hours %p", (overdueHours) => {
    const deadline = publishedAt + Number(overdueHours) * HOUR;
    expect(Rules.responseOverdue(input({ overdueHours, now: deadline - 1 }))).toBeNull();
    expect(Rules.responseOverdue(input({ overdueHours, now: deadline })).eventTimestamp).toBe(deadline);
  });

  test("includes the exact default overdue boundary", () => {
    expect(Rules.responseOverdue(input({ now: publishedAt + 72 * HOUR - 1 }))).toBeNull();
    expect(Rules.responseOverdue(input()).type).toBe("RESPONSE_OVERDUE");
  });

  test("a published host response suppresses overdue alerts, including after the deadline", () => {
    expect(Rules.responseOverdue(input({ responses: [response()] }))).toBeNull();
    expect(Rules.responseOverdue(input({ now: publishedAt + 74 * HOUR,
      responses: [response({ publishedAt: publishedAt + 73 * HOUR })] }))).toBeNull();
  });

  test.each([
    { status: "draft" }, { status: "deleted" }, { deletedAt: 0 }, { deletedAt: publishedAt },
    { publishedAt: null }, { publishedAt: undefined }, { publishedAt: NaN },
    { publishedAt: publishedAt + 73 * HOUR }, { reviewId: "other" }, { authorRole: "guest" },
  ])("does not count unpublished, deleted or unrelated responses: %j", (changes) => {
    expect(Rules.responseOverdue(input({ responses: [null, response(changes)] })).type).toBe("RESPONSE_OVERDUE");
  });

  test.each([undefined, null, NaN, Infinity, -1, "1800000000000"])("rejects invalid event clocks %p", (value) => {
    expect(Rules.evaluateReview(input({ publishedAt: value }))).toEqual([]);
    expect(Rules.responseOverdue(input({ now: value }))).toBeNull();
  });

  test("does not substitute mutable update or creation times for publication time", () => {
    expect(Rules.evaluateReview({ review: { ...review, updated_at: publishedAt, created_at: publishedAt },
      now: publishedAt + 100 * HOUR })).toEqual([]);
    expect(Rules.evaluateReview()).toEqual([]);
    expect(Rules.decliningRating()).toBeNull();
  });

  test("reuses the existing decline classification without recalculating thresholds", () => {
    const result = Rules.decliningRating(trendInput());
    expect(result).toEqual({ type: "DECLINING_RATING", recipientUserId: "host-1", propertyId: "property-1",
      eventTimestamp: publishedAt, eventKey: expect.any(String) });
    expect(result).not.toHaveProperty("reviewId");
  });

  test.each(["STABLE", "IMPROVING", "INSUFFICIENT_DATA", undefined])("does not alert for trend %p", (trend_status) => {
    expect(Rules.decliningRating(trendInput({ trend: { property_id: review.property_id, trend_status } }))).toBeNull();
  });

  test.each([{ recipientUserId: "" }, { trend: null }, { previousStart: null },
    { currentStart: publishedAt }, { endExclusive: undefined }])("rejects incomplete decline context %j", (changes) => {
    expect(Rules.decliningRating(trendInput(changes))).toBeNull();
  });

  test("keys and event times remain stable on replay and later evaluations", () => {
    const first = Rules.evaluateReview(input());
    expect(first).toHaveLength(3);
    expect(new Set(first.map((alert) => alert.eventKey)).size).toBe(3);
    expect(Rules.evaluateReview(input({ now: publishedAt + 100 * HOUR,
      review: { ...review, updated_at: publishedAt + HOUR } }))).toEqual(first);
    expect(Rules.decliningRating(trendInput())).toEqual(Rules.decliningRating(trendInput()));
    expect(Rules.decliningRating(trendInput({ endExclusive: publishedAt + HOUR })).eventKey)
      .not.toBe(Rules.decliningRating(trendInput()).eventKey);
    expect(Rules.newReview(input({ publishedAt: publishedAt + 1 })).eventKey).not.toBe(first[0].eventKey);
    expect(Rules.newReview(input({ review: { ...review, host_id: "other" } })).eventKey).not.toBe(first[0].eventKey);
  });
});
