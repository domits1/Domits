jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Review } from "../../ORM/models/Review.js";
import { Booking } from "../../ORM/models/Booking.js";
import { Review_Request } from "../../ORM/models/Review_Request.js";
import { DomitsPrivateFeedback20261027 } from "../../ORM/migrations/20261027_domits_private_feedback.js";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

const booking = { id: "booking", guestid: "guest", hostid: "host", property_id: "property",
  status: "Paid", departuredate: 1000 };
const payload = { booking_id: booking.id, overall_rating: 5, title: "Stay", public_review: "Good",
  private_feedback: "Host note", domits_private_feedback: "  Platform\r\nconcern  " };
const review = { id: "review", booking_id: booking.id, property_id: booking.property_id,
  reviewer_user_id: "guest", host_id: "host", status: "DRAFT", private_feedback: "Host note",
  domits_private_feedback: "Platform\nconcern" };
const event = (sub = "guest", groups, body = payload) => ({ pathParameters: { id: review.id },
  body: JSON.stringify(body), requestContext: { authorizer: { claims: { sub, "cognito:groups": groups } } } });
let repository, service, controller;
const originalGroup = process.env.DOMITS_FEEDBACK_STAFF_GROUP;
beforeEach(() => {
  process.env.DOMITS_FEEDBACK_STAFF_GROUP = "DomitsFeedbackStaff";
  repository = { findBookingById: jest.fn().mockResolvedValue(booking),
    findReviewByBookingTypeAndReviewer: jest.fn().mockResolvedValue(null),
    create: jest.fn(async record => record), findById: jest.fn().mockResolvedValue(review),
    findDomitsPrivateFeedbackByReviewId: jest.fn().mockResolvedValue(review) };
  service = new ReviewService({ repository, now: () => 2000 });
  controller = new Controller({ service });
});
afterEach(() => {
  if (originalGroup === undefined) delete process.env.DOMITS_FEEDBACK_STAFF_GROUP;
  else process.env.DOMITS_FEEDBACK_STAFF_GROUP = originalGroup;
  jest.restoreAllMocks();
});

test("submission preserves Host notes, verified identities, and draft behavior", async () => {
  const response = await controller.createReview(event("guest", undefined, { ...payload,
    reviewer_user_id: "spoof", property_id: "spoof", host_id: "spoof" }));
  expect(response.statusCode).toBe(201);
  expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ booking_id: booking.id,
    reviewer_user_id: "guest", property_id: "property", host_id: "host", private_feedback: "Host note",
    domits_private_feedback: "Platform\nconcern", status: "DRAFT", publication_status: "UNPUBLISHED" }), {});
});
test.each([undefined, null, "", " \r\n\t "])("accepts optional blank feedback: %p", async value => {
  await service.createReview("guest", { ...payload, domits_private_feedback: value });
  expect(repository.create.mock.calls[0][0].domits_private_feedback).toBeNull();
});
test.each([false, 42, {}, [], "\u0000", "x".repeat(501)])("rejects unsupported feedback: %p", async value => {
  expect((await controller.createReview(event("guest", undefined,
    { ...payload, domits_private_feedback: value }))).statusCode).toBe(400);
  expect(repository.create).not.toHaveBeenCalled();
});
test("accepts the maximum length and rejects another guest's booking", async () => {
  expect(service.normalizeDomitsPrivateFeedback("x".repeat(500))).toHaveLength(500);
  expect((await controller.createReview(event("other"))).statusCode).toBe(403);
  expect(repository.create).not.toHaveBeenCalled();
});
test.each([["guest", undefined], ["staff", ["DomitsFeedbackStaff"]],
  ["staff", '["DomitsFeedbackStaff"]'], ["staff", "Other,DomitsFeedbackStaff"]])(
  "allows the submitting guest or verified staff: %s %p", async (sub, groups) => {
    const response = await controller.getDomitsPrivateFeedback(event(sub, groups));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ review_id: "review", booking_id: "booking",
      property_id: "property", reviewer_user_id: "guest", domits_private_feedback: "Platform\nconcern" });
  });
test.each([["host", ["Host"]], ["other", undefined], ["staff", "[invalid"],
  ["staff", ["DomitsFeedbackStaffExtra"]]])("denies unauthorized callers: %s %p", async (sub, groups) => {
  const request = event(sub, groups);
  request.requestContext.authorizer.claims["custom:group"] = "DomitsFeedbackStaff";
  request.queryStringParameters = { isAuthorizedStaff: "true" };
  expect((await controller.getDomitsPrivateFeedback(request)).statusCode).toBe(403);
});
test("fails closed without configuration or authentication", async () => {
  delete process.env.DOMITS_FEEDBACK_STAFF_GROUP;
  expect((await controller.getDomitsPrivateFeedback(event("staff", ["DomitsFeedbackStaff"]))).statusCode).toBe(403);
  expect((await controller.getDomitsPrivateFeedback({})).statusCode).toBe(401);
});
test.each([null, { ...review, status: "DELETED" }, { ...review, status: "REJECTED" }])(
  "rejects missing or hidden reviews: %p", async value => {
    repository.findDomitsPrivateFeedbackByReviewId.mockResolvedValue(value);
    expect((await controller.getDomitsPrivateFeedback(event())).statusCode).toBe(404);
  });
test("Host private feedback and ordinary review responses exclude Domits feedback", async () => {
  const hostResponse = await controller.getPrivateFeedback(event("host"));
  expect(JSON.parse(hostResponse.body)).toEqual({ review_id: "review", private_feedback: "Host note" });
  expect(JSON.stringify(await service.getReviewById("guest", "review"))).not.toMatch(/domits_private_feedback|Platform/);
});
test("real ORM default queries omit Domits feedback; dedicated reads explicitly select it", async () => {
  const db = new DataSource({ type: "postgres", entities: [Review] });
  await db.buildMetadatas();
  expect(db.getRepository(Review).createQueryBuilder("review").getSql()).not.toContain("domits_private_feedback");
  const query = db.getRepository(Review).createQueryBuilder("review");
  jest.spyOn(query, "getOne").mockResolvedValue(review);
  jest.spyOn(db.getRepository(Review), "createQueryBuilder").mockReturnValue(query);
  Database.getInstance.mockResolvedValue(db);
  expect(await new ReviewRepository().findDomitsPrivateFeedbackByReviewId("review")).toEqual(review);
  expect(query.getSql()).toContain('"review"."domits_private_feedback"');
  expect(query.getParameters()).toEqual({ reviewId: "review" });
});
test("service and repository persist feedback in the review transaction", async () => {
  const insert = { insert: jest.fn().mockReturnThis(), values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(), execute: jest.fn() };
  const rows = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn(async row => row) };
  const db = { getRepository: entity => entity === Booking ? { findOne: async () => booking }
    : entity === Review_Request ? { createQueryBuilder: () => insert } : rows };
  db.transaction = jest.fn(callback => callback(db));
  Database.getInstance.mockResolvedValue(db);
  const result = await new ReviewService({ repository: new ReviewRepository(), now: () => 2000 })
    .createReview("guest", payload);
  expect(db.transaction).toHaveBeenCalledTimes(1);
  expect(rows.save).toHaveBeenCalledWith(expect.objectContaining({ domits_private_feedback: "Platform\nconcern" }));
  expect(result.booking_id).toBe("booking");
});
test("migration adds and removes only the nullable feedback column in both schemas", async () => {
  const runner = { query: jest.fn() };
  const migration = new DomitsPrivateFeedback20261027();
  await migration.up(runner);
  await migration.down(runner);
  expect(runner.query.mock.calls.map(([sql]) => sql)).toEqual(["test", "main"].map(schema =>
    `ALTER TABLE ${schema}.review ADD COLUMN IF NOT EXISTS domits_private_feedback TEXT NULL`).concat(
    ["test", "main"].map(schema => `ALTER TABLE ${schema}.review DROP COLUMN IF EXISTS domits_private_feedback`)));
});
