jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
jest.mock("../../functions/ReviewSystem/data/reviewRepositoryShared.js", () => ({
  ...jest.requireActual("../../functions/ReviewSystem/data/reviewRepositoryShared.js"), runTransaction: jest.fn(),
}));
import Database from "database";
import { Review } from "database/models/Review";
import { Review_Response } from "database/models/Review_Response";
import { Review_Alert_Work } from "database/models/Review_Alert_Work";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { HostReviewRepository } from "../../functions/ReviewSystem/data/hostReviewRepository.js";
import { runTransaction } from "../../functions/ReviewSystem/data/reviewRepositoryShared.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";
import { ReviewAlertProcessingService } from "../../functions/ReviewSystem/business/service/reviewAlertProcessingService.js";
import { ReviewAlertNotificationService } from "../../functions/ReviewSystem/business/service/reviewAlertNotificationService.js";
import { ReviewAlertRecipientRepository } from "../../functions/ReviewSystem/data/reviewAlertRecipientRepository.js";
import { ReviewGuestAlertCandidateService } from "../../functions/ReviewSystem/business/service/reviewGuestAlertCandidateService.js";
const now = 1800000000000;
let state, service, worker, invoke, rollback, oldAllowlist, repository, claims;
beforeEach(() => {
  oldAllowlist = process.env.PROPERTY_REVIEW_ADMIN_USER_IDS; process.env.PROPERTY_REVIEW_ADMIN_USER_IDS = "staff";
  state = { review: { id: "r", property_id: "p", reviewer_user_id: "guest-sub", host_id: "host",
    review_type: "GUEST_TO_PROPERTY", status: "PENDING_APPROVAL", publication_status: "UNPUBLISHED",
    verification_status: "VERIFIED", updated_at: now - 1, private_feedback: "SECRET", public_review: "HIDDEN" }, response: null, work: new Map() };
  rollback = false;
  const database = data => ({ getRepository: model => {
    if (model === Review) return { findOne: async ({ where }) => where.id === data.review.id ? { ...data.review } : null,
      update: async (where, changes) => {
        if (where.updated_at !== data.review.updated_at) return { affected: 0 };
        data.review = { ...data.review, ...changes }; return { affected: 1 };
      } };
    if (model === Review_Response) return { findOne: async () => data.response ? { ...data.response } : null,
      save: async value => { data.response = value; return value; } };
    if (model === Review_Alert_Work) return { findOneBy: async ({ id }) => data.work.get(id), createQueryBuilder: () => {
      let row; const query = { insert: () => query, values: value => { row = value; return query; }, onConflict: () => query,
        execute: async () => { if (!data.work.has(row.id)) data.work.set(row.id, row); } }; return query;
    } };
    return { findOneBy: async () => null };
  } });
  Database.getInstance.mockImplementation(async () => database(state));
  runTransaction.mockImplementation(async callback => {
    const working = { review: { ...state.review }, response: state.response && { ...state.response }, work: new Map(state.work) };
    const result = await callback(database(working));
    if (rollback) throw new Error("transaction aborted"); state = working; return result;
  });
  const query = { andWhere: jest.fn().mockReturnThis(), getOne: async () => ({ ...state.review }) };
  jest.spyOn(HostReviewRepository.prototype, "hostResponseQuery").mockReturnValue(query);
  const repo = new ReviewRepository();
  jest.spyOn(repo, "assertPublicationAllowed").mockResolvedValue(); jest.spyOn(repo, "completeReviewRequest").mockResolvedValue();
  jest.spyOn(repo, "hasActiveReviewApproverRole").mockResolvedValue(true); repo.findBookingById = async () => ({});
  claims = new Set(); repository = { createAlertIfMissing: jest.fn(async row => {
    const key = JSON.stringify([row.recipient_user_id, row.event_key]); if (claims.has(key)) return false; claims.add(key); return true;
  }) };
  invoke = jest.fn(async name => name === "GetUserInfo" ? [{ Attributes: [{ Name: "email", Value: "guest@example.com" }] }] : undefined);
  worker = new ReviewAlertProcessingService({ repository: { find: async id => state.work.get(id), advance: jest.fn(),
    due: async () => [...state.work.values()], seed: async () => {} },
    delivery: new ReviewAlertNotificationService({ repository, preferences: { findByUserId: async () => null }, notifier: { invoke } }), now: () => now });
  service = new ReviewService({ repository: repo, alerts: worker, now: () => now });
  jest.spyOn(service, "assertPublicationBooking").mockImplementation(() => {});
  jest.spyOn(service, "validateReviewPayload").mockImplementation(() => {});
  jest.spyOn(worker, "afterAdminEvent").mockResolvedValue(); jest.spyOn(worker, "afterPublication").mockResolvedValue();
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  if (oldAllowlist === undefined) delete process.env.PROPERTY_REVIEW_ADMIN_USER_IDS; else process.env.PROPERTY_REVIEW_ADMIN_USER_IDS = oldAllowlist;
  jest.restoreAllMocks();
});
const statusEvent = type => {
  state.review.status = type === "REVIEW_PUBLISHED" ? "APPROVED" : "PENDING_APPROVAL";
  if (type === "REVIEW_APPROVED") return service.approveReview("staff-sub", "staff", "r", state.review.updated_at);
  if (type === "REVIEW_REJECTED") return service.rejectReview("staff-sub", "staff", "r", state.review.updated_at);
  return service.publishReview("staff-sub", "r", "staff");
};
const guestJob = () => [...state.work.values()].find(row => JSON.parse(row.payload).phase === "guest");
const publishResponse = () => service.saveHostResponse({ userId: "host-sub", username: "host" }, "r", { message: "Thanks" }, "publish");

test.each(["REVIEW_APPROVED", "REVIEW_REJECTED", "REVIEW_PUBLISHED"])("%s persists and emails only the committed review author", async type => {
  await statusEvent(type);
  expect(repository.createAlertIfMissing).toHaveBeenCalledWith(expect.objectContaining({ recipient_user_id: "guest-sub", alert_type: type }));
  expect(state.work.size).toBe(type === "REVIEW_REJECTED" ? 1 : 2);
  expect(invoke).toHaveBeenCalledWith("GetUserInfo", { UserId: "guest-sub" });
  const output = JSON.stringify([invoke.mock.calls, guestJob()]);
  for (const secret of ["SECRET", "HIDDEN"]) expect(output).not.toContain(secret);
  const job = guestJob(); await Promise.all([worker.process(job), worker.process(job)]);
  expect(invoke.mock.calls.filter(([name]) => name === "EmailNotificationService")).toHaveLength(1);
});

test("approval and publication generate separate durable events and preserve host/admin hooks", async () => {
  await statusEvent("REVIEW_APPROVED"); await service.publishReview("staff-sub", "r", "staff");
  expect(claims.size).toBe(2); expect(worker.afterAdminEvent).toHaveBeenCalledWith("REVIEW_PENDING_PUBLICATION", "r", undefined);
  expect(worker.afterPublication).toHaveBeenCalled();
});

test.each(["REVIEW_APPROVED", "REVIEW_REJECTED", "REVIEW_PUBLISHED"])("%s rollback produces no alert or visible queue job", async type => {
  rollback = true; await expect(statusEvent(type)).rejects.toThrow("transaction aborted");
  expect(state.work.size).toBe(0); expect(invoke).not.toHaveBeenCalled();
});

test("draft response and failed publication do not notify; restored draft publishes once", async () => {
  state.review.status = state.review.publication_status = "PUBLISHED";
  await service.saveHostResponse({ userId: "host-sub", username: "host" }, "r", { message: "draft" }, "draft");
  expect(guestJob()).toBeUndefined();
  state.response = { ...state.response, status: "deleted", deletedAt: now - 1 };
  rollback = true; await expect(publishResponse()).rejects.toThrow("transaction aborted"); expect(invoke).not.toHaveBeenCalled();
  rollback = false; await publishResponse(); const job = guestJob(); await publishResponse(); await worker.process(job);
  expect(repository.createAlertIfMissing).toHaveBeenCalledWith(expect.objectContaining({ alert_type: "HOST_RESPONDED", recipient_user_id: "guest-sub" }));
  expect(invoke.mock.calls.filter(([name]) => name === "EmailNotificationService")).toHaveLength(1);
});

test("fresh delivery rejects deleted responses, spoofed recipients and changed review ownership", async () => {
  state.review.status = state.review.publication_status = "PUBLISHED"; await publishResponse();
  const payload = JSON.parse(guestJob().payload), resolver = new ReviewAlertRecipientRepository();
  expect(await resolver.resolve({ ...payload, recipientUserId: "attacker" })).toEqual([]);
  state.response.deletedAt = now;
  expect(await new ReviewGuestAlertCandidateService().evaluate(payload)).toEqual([]);
  state.response.deletedAt = null; state.review.reviewer_user_id = "different-guest";
  expect(await resolver.resolve(payload)).toEqual([]);
});

test("concurrent first delivery claims one alert; dependency failures preserve committed moderation", async () => {
  jest.spyOn(service, "notifyGuest").mockResolvedValue(); await statusEvent("REVIEW_APPROVED");
  const job = guestJob(); invoke.mockRejectedValue(new Error("SECRET transport failure"));
  await Promise.all([worker.process(job), worker.process(job)]);
  expect(claims.size).toBe(1); expect(state.review.status).toBe("APPROVED");
  expect(worker.repository.advance).toHaveBeenCalledWith(job, JSON.parse(job.payload), now + 60000);
  expect(JSON.stringify(console.error.mock.calls)).not.toContain("SECRET");
});

test("reject action uses the existing PATCH endpoint and enforces administrator authorization and version", async () => {
  const controller = new Controller({ service, authManager: { getUser: async () => ({ userId: "staff-sub", username: "staff" }) } });
  const request = { httpMethod: "PATCH", resource: "/reviews/{id}", pathParameters: { id: "r" },
    queryStringParameters: { action: "reject" }, body: JSON.stringify({ updated_at: now - 1 }) };
  const success = await controller.updateReview(request); expect(success.statusCode).toBe(200); expect(state.review.status).toBe("REJECTED");
  state.review.status = "PENDING_APPROVAL";
  expect((await controller.updateReview(request)).statusCode).toBe(409);
  request.body = JSON.stringify({ updated_at: state.review.updated_at, recipientUserId: "attacker" });
  expect((await controller.updateReview(request)).statusCode).toBe(400);
  await expect(service.rejectReview("guest-sub", "guest", "r", now)).rejects.toMatchObject({ statusCode: 403 });
  expect(state.review.status).toBe("PENDING_APPROVAL");
});


import { ReviewAlertService } from "../../functions/ReviewSystem/business/service/reviewAlertService.js";
test("existing alert API presents guest alerts with a guest review destination", async () => {
  const api = new ReviewAlertService({ repository: { getAlertsForRecipient: async recipient => [{
    id: "alert", recipient_user_id: recipient, alert_type: "REVIEW_APPROVED", private_feedback: "SECRET" }], countUnreadForRecipient: async () => 1 } });
  const result = await api.list("guest-sub");
  expect(result.alerts[0].display.destination).toBe("/guestdashboard/reviews");
  expect(JSON.stringify(result)).not.toContain("SECRET");
});
