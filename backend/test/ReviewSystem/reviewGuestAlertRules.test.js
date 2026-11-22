jest.mock("database", () => ({ __esModule: true, default: {} }));
import { ReviewAlertRules as Rules, GUEST_ALERT_TYPES } from "../../functions/ReviewSystem/business/model/reviewAlertRules.js";
import { ReviewAlertRepository } from "../../functions/ReviewSystem/data/reviewAlertRepository.js";

const time = 1800000000000;
const pending = Object.freeze({ id: "r1", property_id: "p1", reviewer_user_id: "guest-sub", host_id: "host-username",
  review_type: "GUEST_TO_PROPERTY", status: "PENDING_APPROVAL", publication_status: "UNPUBLISHED", updated_at: time - 1 });
const published = Object.freeze({ ...pending, status: "PUBLISHED", publication_status: "PUBLISHED" });
const response = Object.freeze({ id: "response-1", reviewId: "r1", authorRole: "host", status: "published",
  publishedAt: time, deletedAt: null, updatedAt: time });
const input = type => ({ type, previousReview: pending,
  review: type === "HOST_RESPONDED" || type === "REVIEW_PUBLISHED" ? published
    : { ...pending, status: type === "REVIEW_REJECTED" ? "REJECTED" : "APPROVED" },
  ...(type === "REVIEW_PUBLISHED" ? { previousReview: { ...pending, status: "APPROVED" } } : {}),
  response, eventTimestamp: time });

it.each(Object.values(GUEST_ALERT_TYPES))("normalizes %s for the actual review author only", type => {
  const value = input(type);
  const result = Rules.guest({ ...value, recipientUserId: "attacker", guestId: "other",
    review: { ...value.review, private_feedback: "SECRET", domits_private_feedback: "INTERNAL", public_review: "TEXT" } });
  expect(result).toEqual([{ type, recipientUserId: "guest-sub", propertyId: "p1", reviewId: "r1",
    eventTimestamp: time, eventKey: expect.any(String) }]);
  for (const forbidden of ["SECRET", "INTERNAL", "TEXT", "attacker", "other"]) expect(JSON.stringify(result)).not.toContain(forbidden);
  expect(Rules.guest(value)).toEqual(result);
});

it.each(Object.values(GUEST_ALERT_TYPES))("keeps %s keys stable across replay, edits and mutable clocks", type => {
  const value = input(type);
  const [first] = Rules.guest(value);
  const [replay] = Rules.guest({ ...value, now: time + 99999,
    review: { ...value.review, updated_at: time + 500, title: "edit" },
    response: { ...response, updatedAt: time + 500, message: "edit" } });
  expect(replay).toEqual(first);
  const other = { ...value, review: { ...value.review, reviewer_user_id: "second-guest" },
    previousReview: { ...value.previousReview, reviewer_user_id: "second-guest" } };
  expect(Rules.guest(other)[0].eventKey).not.toBe(first.eventKey);
});

it("separates approval from publication and rejection event identities", () => {
  const approval = Rules.guest(input("REVIEW_APPROVED"));
  const publication = Rules.guest(input("REVIEW_PUBLISHED"));
  const rejection = Rules.guest(input("REVIEW_REJECTED"));
  expect(new Set([approval[0].eventKey, publication[0].eventKey, rejection[0].eventKey]).size).toBe(3);
  expect(Rules.guest({ ...input("REVIEW_PUBLISHED"), review: input("REVIEW_APPROVED").review })).toEqual([]);
  expect(Rules.guest({ ...input("REVIEW_APPROVED"), review: published })).toEqual([]);
});

it.each(Object.values(GUEST_ALERT_TYPES))("rejects invalid ownership or review data for %s", type => {
  for (const change of [{ reviewer_user_id: "" }, { reviewer_user_id: null }, { reviewer_user_id: " guest " },
    { reviewer_user_id: "x".repeat(256) }, { id: null }, { property_id: "" },
    { review_type: "HOST_TO_GUEST" }, { deletedAt: 0 }, { deleted_at: time }]) {
    const value = input(type);
    expect(Rules.guest({ ...value, review: { ...value.review, ...change } })).toEqual([]);
  }
  expect(Rules.guest({ ...input(type), review: null })).toEqual([]);
});

it.each(["REVIEW_APPROVED", "REVIEW_REJECTED", "REVIEW_PUBLISHED"])("validates %s committed before/after snapshots", type => {
  const value = input(type);
  for (const before of [undefined, null, value.review, { ...value.previousReview, id: "unrelated" },
    { ...value.previousReview, property_id: "other-property" }, { ...value.previousReview, reviewer_user_id: "attacker" },
    { ...value.previousReview, review_type: "HOST_TO_GUEST" }, { ...value.previousReview, status: "DRAFT" },
    { ...value.previousReview, status: "DELETED" }, { ...value.previousReview, publication_status: "PUBLISHED" }]) {
    expect(Rules.guest({ ...value, previousReview: before })).toEqual([]);
  }
  for (const review of [null, value.previousReview, { ...value.review, status: "DRAFT" },
    { ...value.review, status: "DELETED" }, { ...value.review, publication_status: "INVALID" }]) {
    expect(Rules.guest({ ...value, review })).toEqual([]);
  }
});

it("recognizes rejection of an approved unpublished review without accepting rejection of a public review", () => {
  const value = input("REVIEW_REJECTED");
  expect(Rules.guest({ ...value, previousReview: { ...pending, status: "APPROVED" } })).toHaveLength(1);
  expect(Rules.guest({ ...value, previousReview: published })).toEqual([]);
});

it.each([undefined, null, NaN, Infinity, -1, "1800000000000", 1.5, 8640000000000001])("rejects invalid event timestamp %s", eventTimestamp => {
  for (const type of ["REVIEW_APPROVED", "REVIEW_REJECTED", "REVIEW_PUBLISHED"]) {
    expect(Rules.guest({ ...input(type), eventTimestamp })).toEqual([]);
  }
  expect(Rules.guest({ ...input("HOST_RESPONDED"), response: { ...response, publishedAt: eventTimestamp } })).toEqual([]);
});

it("notifies for first host response publication or a committed draft-to-published response", () => {
  const value = input("HOST_RESPONDED");
  expect(Rules.guest({ ...value, eventTimestamp: 0 })[0].eventTimestamp).toBe(response.publishedAt);
  expect(Rules.guest({ ...value, previousResponse: { ...response, status: "draft", publishedAt: null } })).toHaveLength(1);
  expect(Rules.guest({ ...value, response: { ...response, id: "response-2" } })[0].eventKey)
    .not.toBe(Rules.guest(value)[0].eventKey);
});

it("excludes draft, deleted, unrelated, non-host and failed response publications", () => {
  const value = input("HOST_RESPONDED");
  for (const current of [null, undefined, { ...response, id: "" }, { ...response, reviewId: "other" },
    { ...response, authorRole: "guest" }, { ...response, status: "draft" },
    { ...response, deletedAt: 0 }, { ...response, deleted_at: time }]) {
    expect(Rules.guest({ ...value, response: current })).toEqual([]);
  }
  for (const before of [response, { ...response, status: "draft", id: "unrelated", publishedAt: null },
    { ...response, status: "draft", reviewId: "other", publishedAt: null },
    { ...response, status: "draft", publishedAt: null, deletedAt: time }]) {
    expect(Rules.guest({ ...value, previousResponse: before })).toEqual([]);
  }
  for (const state of ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "DELETED"]) {
    expect(Rules.guest({ ...value, review: { ...published, status: state } })).toEqual([]);
  }
  expect(Rules.guest({ ...value, review: { ...published, publication_status: "UNPUBLISHED" } })).toEqual([]);
});

it("rejects unsupported events without running host or administrator rules", () => {
  expect(Rules.guest()).toEqual([]);
  for (const type of ["NEW_REVIEW", "REVIEW_PENDING_APPROVAL", "INVALID", undefined]) expect(Rules.guest({ ...input("REVIEW_APPROVED"), type })).toEqual([]);
});

it.each(Object.values(GUEST_ALERT_TYPES))("existing alert repository supports %s and its atomic duplicate claim", async alert_type => {
  const query = { insert: jest.fn().mockReturnThis(), values: jest.fn().mockReturnThis(),
    onConflict: jest.fn().mockReturnThis(), returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValueOnce({ raw: [{ id: "alert" }] }).mockResolvedValue({ raw: [] }) };
  const repository = new ReviewAlertRepository({ getDatabase: async () => ({ getRepository: () => ({ createQueryBuilder: () => query }) }) });
  const event = Rules.guest(input(alert_type))[0];
  const row = { recipient_user_id: event.recipientUserId, property_id: event.propertyId, review_id: event.reviewId,
    alert_type, event_key: "bounded-hash-of-candidate-key" };
  expect(await repository.createAlertIfMissing(row)).toBe(true);
  expect(await repository.createAlertIfMissing(row)).toBe(false);
  expect(query.onConflict).toHaveBeenCalledWith('("recipient_user_id", "event_key") DO NOTHING');
});
