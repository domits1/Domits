jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource, SelectQueryBuilder, InsertQueryBuilder, UpdateQueryBuilder } from "typeorm";
import { Property } from "database/models/Property";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";
import { Review_Request } from "database/models/Review_Request";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { handler } from "../../functions/ReviewSystem/index.js";
import { ReviewRequestNotifier } from "../../functions/ReviewSystem/business/service/reviewRequestNotifier.js";
const invitationRepository = { getDetails: jest.fn().mockResolvedValue({ propertyTitle: "Canal Loft", city: "Amsterdam" }) };
const notifierOptions = { repository: invitationRepository };
const now = 1800000000000;
const booking = { id: "b1", guestid: "g1", hostid: "h1", property_id: "p1", departuredate: now - 1, status: "paid" };
let repository, notifier, service;
beforeEach(() => {
  process.env.REVIEW_REQUEST_START_AT = String(now - 1000);
  repository = {
    getReviewSchedule: jest.fn().mockResolvedValue({ enabled: true, delayHours: 0 }),
    findReviewRequestCandidates: jest.fn().mockResolvedValue([booking]),
    claimReviewRequest: jest.fn().mockResolvedValue({ id: "r1" }),
    findBookingById: jest.fn().mockResolvedValue(booking),
    findReviewByBookingTypeAndReviewer: jest.fn().mockResolvedValue(null),
    finishReviewRequest: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  notifier = { send: jest.fn().mockResolvedValue(undefined) };
  service = new ReviewService({ repository, notifier, now: () => now });
});
afterEach(() => { delete process.env.REVIEW_REQUEST_START_AT; jest.restoreAllMocks(); });
test.each(["paid", "confirmed"])("sends for completed %s bookings", async status => {
  repository.findBookingById.mockResolvedValue({ ...booking, status });
  expect((await service.processReviewRequests())[0].status).toBe("SENT");
  expect(notifier.send).toHaveBeenCalledWith({ ...booking, status });
  expect(repository.findReviewByBookingTypeAndReviewer).toHaveBeenCalledWith({
    booking_id: "b1", reviewer_user_id: "g1", review_type: "GUEST_TO_PROPERTY",
  });
});
test.each([{ status: "cancelled" }, { departuredate: null }, { departuredate: "invalid" },
  { departuredate: now + 1 }, { departuredate: 0 }, { departuredate: -1 }, { departuredate: 1.5 }, { property_id: "other" }, { guestid: "" }])("skips invalid booking %j", async changes => {
  repository.findBookingById.mockResolvedValue({ ...booking, ...changes });
  expect((await service.processReviewRequests())[0].status).toBe("CANCELLED");
  expect(notifier.send).not.toHaveBeenCalled();
});
test("does not send when a review exists or another worker won the claim", async () => {
  repository.findReviewByBookingTypeAndReviewer.mockResolvedValue({ id: "existing" });
  await service.processReviewRequests();
  repository.claimReviewRequest.mockResolvedValue(null);
  expect((await service.processReviewRequests())[0].status).toBe("SKIPPED");
  expect(notifier.send).not.toHaveBeenCalled();
});
test("tracks delivery failures and exposes acknowledgement failures", async () => {
  notifier.send.mockRejectedValue(new Error("delivery"));
  expect((await service.processReviewRequests())[0].status).toBe("FAILED");
  expect(repository.finishReviewRequest).toHaveBeenCalledWith("r1", "FAILED", now);
  repository.finishReviewRequest.mockRejectedValue(new Error("database"));
  await expect(service.processReviewRequests()).resolves.toEqual([
    { bookingId: "b1", status: "RECONCILIATION_REQUIRED" },
  ]);
});
test("integrates repository claims, email delivery and acknowledgement without duplicate sends", async () => {
  const db = new DataSource({ type: "postgres", schema: "main", entities: [Booking, Review, Review_Request, Property] });
  await db.buildMetadatas();
  Database.getInstance.mockResolvedValue(db);
  let claimed = false;
  jest.spyOn(InsertQueryBuilder.prototype, "execute").mockResolvedValue({});
  jest.spyOn(db.getRepository(Review_Request), "findOne").mockResolvedValue({ id: "r1" });
  jest.spyOn(UpdateQueryBuilder.prototype, "execute").mockImplementation(async function () {
    if (this.getQuery().includes('"claimed_at" =')) {
      expect(this.getQuery()).toContain('"claimed_at" IS NULL AND "last_sent_at" IS NULL');
      const affected = claimed ? 0 : 1; claimed = true; return { affected };
    }
    return { affected: 1 };
  });
  const response = body => ({ Payload: Buffer.from(JSON.stringify({ statusCode: 200, body })) });
  const client = { send: jest.fn().mockResolvedValueOnce(response(JSON.stringify([
    { Attributes: [{ Name: "email", Value: "guest@example.com" }] },
  ]))).mockResolvedValueOnce(response("Email sent")) };
  const real = new ReviewRepository();
  real.getReviewSchedule = repository.getReviewSchedule;
  real.findBookingById = repository.findBookingById;
  real.findReviewByBookingTypeAndReviewer = repository.findReviewByBookingTypeAndReviewer;
  service = new ReviewService({ repository: real, notifier: new ReviewRequestNotifier(client, notifierOptions), now: () => now });
  const results = await Promise.all([service.processReviewRequest(booking), service.processReviewRequest(booking)]);
  expect(results.map(result => result.status).sort()).toEqual(["SENT", "SKIPPED"]);
  const payload = JSON.parse(Buffer.from(client.send.mock.calls[1][0].input.Payload).toString());
  expect(payload.body.htmlBody).toContain("Canal Loft");
  expect(payload.body.htmlBody).toContain("Share your experience");
  expect(payload.body.toEmail).toBe("guest@example.com");
  expect(payload.body.body).toContain("/review?bookingId=b1");
  const query = jest.spyOn(SelectQueryBuilder.prototype, "getMany").mockResolvedValue([]);
  await real.findReviewRequestCandidates(now);
  expect(query.mock.instances[0].getQuery()).toContain('"existing"."id" IS NULL');
  expect(query.mock.instances[0].getQuery()).toContain('"schedule"."review_requests_enabled" = TRUE');
  expect(query.mock.instances[0].getQuery()).toContain('"stay"."departuredate" + "schedule"."review_request_delay_hours" * 3600000 <= :scheduleNow');
  expect(query.mock.instances[0].getParameters()).toMatchObject({ stayStatuses: ["paid", "confirmed"], stayNow: now });
});
test("rejects email Lambda failures and missing addresses", async () => {
  const client = { send: jest.fn().mockResolvedValue({ FunctionError: "Unhandled", Payload: Buffer.from("{}") }) };
  await expect(new ReviewRequestNotifier(client, notifierOptions).send(booking)).rejects.toThrow("dependency failed");
});
test("dispatches scheduled events without affecting HTTP routes", async () => {
  const run = jest.spyOn(ReviewService.prototype, "processReviewRequests").mockResolvedValue([]);
  expect((await handler({ source: "aws.events", "detail-type": "Scheduled Event",
    resources: ["arn:aws:events:eu-north-1:123456789012:rule/domits-review-requests"] })).statusCode).toBe(200);
  expect(run).toHaveBeenCalledTimes(1);
});
test("does not deliver without an email or after a failed email response", async () => {
  const payload = body => ({ Payload: Buffer.from(JSON.stringify({ statusCode: 200, body })) });
  const missing = { send: jest.fn().mockResolvedValue(payload("[]")) };
  await expect(new ReviewRequestNotifier(missing).send(booking)).rejects.toThrow("email is unavailable");
  expect(missing.send).toHaveBeenCalledTimes(1);
  const failed = { send: jest.fn().mockResolvedValueOnce(payload(JSON.stringify([
    { Attributes: [{ Name: "email", Value: "guest@example.com" }] },
  ]))).mockResolvedValueOnce({ Payload: Buffer.from('{"statusCode":500}') }) };
  await expect(new ReviewRequestNotifier(failed, notifierOptions).send(booking)).rejects.toThrow("dependency failed");
});

test("continues the batch after a claim or acknowledgement failure", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  repository.findReviewRequestCandidates.mockResolvedValue([booking, { ...booking, id: "b2" }]);
  repository.claimReviewRequest.mockRejectedValueOnce(new Error("database"));
  const result = await service.processReviewRequests();
  expect(result.map(row => row.status)).toEqual(["RECONCILIATION_REQUIRED", "SENT"]);
  expect(notifier.send).toHaveBeenCalledTimes(1);
});

test("does not overwrite completion when acknowledging an in-flight email", async () => {
  const record = { id: "r1", status: "COMPLETED", completedAt: now - 1 };
  const update = jest.fn(async (where, fields) => {
    const matches = typeof where.status === "string" ? record.status === where.status : where.status._value.includes(record.status);
    if (matches) Object.assign(record, fields);
    return { affected: matches ? 1 : 0 };
  });
  Database.getInstance.mockResolvedValue({ getRepository: () => ({ update }) });
  await new ReviewRepository().finishReviewRequest("r1", "SENT", now);
  expect(record).toEqual({ id: "r1", status: "COMPLETED", completedAt: now - 1, lastSentAt: now });
});

test.each([undefined, "", "invalid", "0", "-1", "1.5"])("fails closed with invalid rollout configuration %s", async startAt => {
  if (startAt === undefined) delete process.env.REVIEW_REQUEST_START_AT;
  else process.env.REVIEW_REQUEST_START_AT = startAt;
  const db = new DataSource({ type: "postgres", schema: "main", entities: [Booking, Review, Review_Request, Property] });
  await db.buildMetadatas();
  Database.getInstance.mockResolvedValue(db);
  await expect(new ReviewRepository().findReviewRequestCandidates(now)).rejects.toThrow("REVIEW_REQUEST_START_AT");
});

test.each([now - 1000, now - 40 * 86400000])("limits candidates to rollout and recent checkouts: %s", async startAt => {
  process.env.REVIEW_REQUEST_START_AT = String(startAt);
  const db = new DataSource({ type: "postgres", schema: "main", entities: [Booking, Review, Review_Request, Property] });
  await db.buildMetadatas();
  Database.getInstance.mockResolvedValue(db);
  const getMany = jest.spyOn(SelectQueryBuilder.prototype, "getMany").mockResolvedValue([]);
  await new ReviewRepository().findReviewRequestCandidates(now);
  const query = getMany.mock.instances[0];
  expect(query.getQuery()).toContain('"stay"."departuredate" >=');
  expect(query.getParameters().requestCutoff).toBe(Math.max(startAt, now - 30 * 86400000));
});

test.each([
  ["TRANSPORT_FAILED", () => Promise.reject(new Error("transport"))],
  ["INVALID_RESPONSE", async () => ({ Payload: Buffer.from("invalid") })],
  ["FUNCTION_FAILED", async () => ({ FunctionError: "Unhandled" })],
  ["UNSUCCESSFUL_RESPONSE", async () => ({ Payload: Buffer.from('{"statusCode":500}') })],
])("identifies dependency failure %s", async (code, send) => {
  await expect(new ReviewRequestNotifier({ send }).invoke("GetUserInfo", {})).rejects.toMatchObject({
    code: `GetUserInfo_${code}`, dependency: "GetUserInfo",
  });
});
