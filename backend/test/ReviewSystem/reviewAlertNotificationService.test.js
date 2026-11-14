jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { ReviewAlertNotificationService } from "../../functions/ReviewSystem/business/service/reviewAlertNotificationService.js";
import { ReviewAlertRecipientRepository } from "../../functions/ReviewSystem/data/reviewAlertRecipientRepository.js";
import { ReviewAlertRepository } from "../../functions/ReviewSystem/data/reviewAlertRepository.js";

const event = { type: "NEW_REVIEW", propertyId: "p1", reviewId: "r1", eventKey: "publication:r1:1",
  eventTimestamp: 1800000000000, overallRating: 2 };
let repository, recipients, preferences, notifier, logger, service;
beforeEach(() => {
  const claimed = new Set();
  repository = { createAlertIfMissing: jest.fn(async row => {
    const key = JSON.stringify([row.recipient_user_id, row.event_key]);
    if (claimed.has(key)) return false;
    claimed.add(key); return true;
  }) };
  recipients = { resolve: jest.fn().mockResolvedValue(["host", "manager"]) };
  preferences = { findByUserId: jest.fn().mockResolvedValue(null) };
  notifier = { invoke: jest.fn(async name => name === "GetUserInfo"
    ? [{ Attributes: [{ Name: "email", Value: "host@example.com" }] }] : undefined) };
  logger = { error: jest.fn() };
  service = new ReviewAlertNotificationService({ repository, recipients, preferences, notifier, logger });
});

test.each(["NEW_REVIEW", "LOW_RATING", "DECLINING_RATING", "RESPONSE_OVERDUE"])("delivers %s with structured safe content", async type => {
  const input = { ...event, type, previousRating: 4, currentRating: 2,
    ...(type === "DECLINING_RATING" ? { reviewId: undefined } : {}) };
  expect((await service.deliver(input)).map(result => result.status)).toEqual(["SENT", "SENT"]);
  expect(repository.createAlertIfMissing).toHaveBeenCalledWith(expect.objectContaining({
    recipient_user_id: "host", property_id: "p1", alert_type: type,
  }));
  const content = JSON.parse(notifier.invoke.mock.calls[1][1].body.body);
  expect(content).toEqual(expect.objectContaining({ alertType: type, propertyId: "p1", overallRating: 2,
    previousRating: 4, currentRating: 2, destination: "https://domits.com/hostdashboard/reviews",
    eventTimestamp: new Date(event.eventTimestamp).toISOString() }));
  expect(notifier.invoke).toHaveBeenCalledWith("GetUserInfo", { UserId: "manager" });
});

test("concurrent duplicate events attempt email once per recipient", async () => {
  await Promise.all([service.deliver(event), service.deliver(event)]);
  expect(notifier.invoke.mock.calls.filter(([name]) => name === "EmailNotificationService")).toHaveLength(2);
  expect((await service.deliver(event)).every(result => result.status === "DUPLICATE")).toBe(true);
});

test("missing recipients or email never invokes email delivery", async () => {
  recipients.resolve.mockResolvedValueOnce([]);
  expect(await service.deliver(event)).toEqual([]);
  expect(repository.createAlertIfMissing).not.toHaveBeenCalled();
  notifier.invoke.mockResolvedValue([]);
  expect((await service.deliver(event)).every(result => result.status === "EMAIL_UNAVAILABLE")).toBe(true);
  expect(notifier.invoke.mock.calls.every(([name]) => name === "GetUserInfo")).toBe(true);
});

test("persistence failures are contained and prevent email", async () => {
  repository.createAlertIfMissing.mockRejectedValue(new Error("database"));
  expect((await service.deliver(event)).every(result => result.status === "FAILED")).toBe(true);
  expect(notifier.invoke).not.toHaveBeenCalled();
  expect(logger.error).toHaveBeenCalledWith("Review alert notification failed", {
    alertType: "NEW_REVIEW", code: "DELIVERY_FAILED",
  });
});

test("ambiguous email failures retain the claim and never resend", async () => {
  notifier.invoke.mockImplementation(async name => {
    if (name === "GetUserInfo") return [{ Attributes: [{ Name: "email", Value: "a@example.com" }] }];
    throw new Error("private server details");
  });
  expect((await service.deliver(event)).every(result => result.status === "FAILED")).toBe(true);
  await service.deliver(event);
  expect(notifier.invoke.mock.calls.filter(([name]) => name === "EmailNotificationService")).toHaveLength(2);
  expect(JSON.stringify(logger.error.mock.calls)).not.toContain("private server details");
});

test.each(["manager_review_received", "manager_low_review", "owner_negative_review"])("respects %s email preferences", async key => {
  preferences.findByUserId.mockResolvedValue({ preferences: JSON.stringify({ [key]: { email: false } }) });
  const type = key === "manager_review_received" ? "NEW_REVIEW" : "LOW_RATING";
  expect((await service.deliver({ ...event, type })).every(result => result.status === "EMAIL_DISABLED")).toBe(true);
  expect(notifier.invoke).not.toHaveBeenCalled();
});

test("content and logs exclude arbitrary review fields and destinations", async () => {
  await service.deliver({ ...event, private_feedback: "SECRET", public_review: "UNPUBLISHED",
    title: "HIDDEN", destination: "https://evil.example", recipientUserId: "attacker" });
  const output = JSON.stringify([notifier.invoke.mock.calls, logger.error.mock.calls]);
  for (const secret of ["SECRET", "UNPUBLISHED", "HIDDEN", "evil.example", "attacker"]) expect(output).not.toContain(secret);
});

test.each([{ type: "INVALID" }, { propertyId: "p\nInjected" }, { eventTimestamp: NaN }, { reviewId: undefined }])(
  "rejects malformed events %j", async changes => {
    expect(await service.deliver({ ...event, ...changes })).toEqual([]);
    expect(recipients.resolve).not.toHaveBeenCalled();
  });

test("recipient resolver requires published property reviews and active authenticated managers", async () => {
  const property = { findOne: jest.fn().mockResolvedValue({ id: "p1", hostid: "host" }) };
  const review = { findOne: jest.fn().mockResolvedValue(null) };
  const team = { find: jest.fn().mockResolvedValue([{ member_user_id: "manager" }, { member_user_id: null }]) };
  Database.getInstance.mockResolvedValue({ getRepository: model => model === Property ? property : model === Review ? review : team });
  const resolver = new ReviewAlertRecipientRepository();
  expect(await resolver.resolve(event)).toEqual([]);
  expect(team.find).not.toHaveBeenCalled();
  review.findOne.mockResolvedValue({ id: "r1" });
  expect(await resolver.resolve(event)).toEqual(["host", "manager"]);
  expect(review.findOne.mock.calls[0][0].where).toEqual(expect.objectContaining({
    property_id: "p1", status: "PUBLISHED", publication_status: "PUBLISHED",
  }));
  expect(team.find).toHaveBeenCalledWith({ where: {
    host_id: "host", status: "active", role: "Property Operations Manager",
  } });
});

test("real alert repository inserts UNREAD with atomic conflict handling", async () => {
  const query = { insert: jest.fn().mockReturnThis(), values: jest.fn().mockReturnThis(),
    onConflict: jest.fn().mockReturnThis(), returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ raw: [{ id: "a1" }] }) };
  const repo = new ReviewAlertRepository({ getDatabase: async () => ({ getRepository: () => ({ createQueryBuilder: () => query }) }) });
  await repo.createAlertIfMissing({ recipient_user_id: "host", property_id: "p1", alert_type: "NEW_REVIEW", event_key: "key" });
  expect(query.values).toHaveBeenCalledWith(expect.objectContaining({ status: "UNREAD" }));
  expect(query.onConflict).toHaveBeenCalledWith('(\"recipient_user_id\", \"event_key\") DO NOTHING');
});
