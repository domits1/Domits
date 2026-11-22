jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
jest.mock("../../functions/ReviewSystem/data/reviewRepositoryShared.js", () => ({
  ...jest.requireActual("../../functions/ReviewSystem/data/reviewRepositoryShared.js"), runTransaction: jest.fn(),
}));
import Database from "database";
import { Review } from "database/models/Review";
import { Review_Flag } from "database/models/Review_Flag";
import { Review_Alert_Work } from "database/models/Review_Alert_Work";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { runTransaction } from "../../functions/ReviewSystem/data/reviewRepositoryShared.js";
import { ReviewAlertProcessingService } from "../../functions/ReviewSystem/business/service/reviewAlertProcessingService.js";
import { ReviewAlertNotificationService } from "../../functions/ReviewSystem/business/service/reviewAlertNotificationService.js";
import { ReviewAdminAlertCandidateService } from "../../functions/ReviewSystem/business/service/reviewAdminAlertCandidateService.js";
import { adminReviewAlertWorkId } from "../../functions/ReviewSystem/data/reviewAlertWorkRepository.js";
const now = 1800000000000;
let previousAllowlist;
let review, flag, jobs, members, query, reviews, flags, repo, invoke, alerts, worker, rollback;
beforeEach(() => {
  previousAllowlist = process.env.PROPERTY_REVIEW_ADMIN_USER_IDS;
  process.env.PROPERTY_REVIEW_ADMIN_USER_IDS = "admin admin2";
  review = { id: "r", property_id: "p", review_type: "GUEST_TO_PROPERTY", status: "DRAFT",
    publication_status: "UNPUBLISHED", updated_at: now - 1, private_feedback: "SECRET", public_review: "HIDDEN" };
  flag = null; jobs = new Map(); rollback = false;
  members = ["admin", "admin2"].map(member_user_id => ({ member_user_id, status: "active", role: "General Manager" }));
  reviews = { findOne: jest.fn(async () => review), findOneBy: jest.fn(async () => review),
    update: jest.fn(async (where, updates) => {
      if (where.updated_at !== review.updated_at) return { affected: 0 };
      review = { ...review, ...updates }; return { affected: 1 };
    }) };
  flags = { findOne: jest.fn(async () => flag), findOneBy: jest.fn(async () => flag), insert: jest.fn(async value => { flag = value; }) };
  const database = { getRepository: model => model === Review ? reviews : model === Review_Flag ? flags : model === Review_Alert_Work
    ? { findOneBy: async ({ id }) => jobs.get(id) } : { find: async () => members } };
  Database.getInstance.mockResolvedValue(database);
  runTransaction.mockImplementation(async callback => {
    let staged;
    query = { insert: jest.fn().mockReturnThis(), values: jest.fn(value => { staged = value; return query; }),
      onConflict: jest.fn().mockReturnThis(), execute: jest.fn(async () => {}) };
    const result = await callback({ getRepository: model => model === Review_Alert_Work
      ? { createQueryBuilder: () => query } : database.getRepository(model) });
    if (rollback) throw new Error("transaction aborted");
    if (staged && !jobs.has(staged.id)) jobs.set(staged.id, staged);
    return result;
  });
  repo = new ReviewRepository(); jest.spyOn(repo, "assertPublicationAllowed").mockResolvedValue();
  const claims = new Set(); alerts = { createAlertIfMissing: jest.fn(async row => {
    const key = JSON.stringify([row.recipient_user_id, row.event_key]);
    if (claims.has(key)) return false; claims.add(key); return true;
  }) };
  invoke = jest.fn(async name => name === "GetUserInfo" ? [{ Attributes: [{ Name: "email", Value: "admin@example.com" }] }] : undefined);
  worker = new ReviewAlertProcessingService({ repository: { advance: jest.fn(), due: async () => [...jobs.values()], seed: async () => {} },
    delivery: new ReviewAlertNotificationService({ repository: alerts, preferences: { findByUserId: async () => null }, notifier: { invoke } }), now: () => now });
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  if (previousAllowlist === undefined) delete process.env.PROPERTY_REVIEW_ADMIN_USER_IDS;
  else process.env.PROPERTY_REVIEW_ADMIN_USER_IDS = previousAllowlist;
  jest.restoreAllMocks();
});
const transition = (from, to) => repo.publishDraft({ reviewId: "r", from, to, expectedUpdatedAt: review.updated_at,
  updatedAt: now, authorize: async () => true });
const createFlag = () => repo.createReviewFlag({ id: "f", review_id: "r", status: "PENDING", created_at: now, updated_at: now, notes: "PRIVATE" });

test.each([["DRAFT", "PENDING_APPROVAL", "REVIEW_PENDING_APPROVAL"],
  ["PENDING_APPROVAL", "APPROVED", "REVIEW_PENDING_PUBLICATION"], ["flag", "APPROVED", "REVIEW_FLAGGED"]])(
  "%s enqueues committed work and delivers separate safe administrator alerts", async (from, to, type) => {
    review.status = from === "flag" ? to : from;
    if (from === "flag") await createFlag(); else await transition(from, to);
    expect(invoke).not.toHaveBeenCalled();
    const [job] = [...jobs.values()]; const payload = JSON.parse(job.payload);
    expect(payload).toMatchObject({ phase: "admin", type, reviewId: "r", eventTimestamp: now });
    expect(job.id).toBe(adminReviewAlertWorkId(type, "r", payload.flagId));
    // A subsequent flag/edit of updated_at cannot alter the persisted transition event time.
    review.updated_at = now + 500;
    await Promise.all([worker.process(job), worker.process(job)]); await worker.process(job);
    const emails = invoke.mock.calls.filter(([name]) => name === "EmailNotificationService");
    expect(emails).toHaveLength(2);
    const recipients = new Set(alerts.createAlertIfMissing.mock.calls.map(([row]) => row.recipient_user_id));
    expect([...recipients].sort()).toEqual(["admin", "admin2"]);
    const output = JSON.stringify(emails);
    expect(output).toContain(new Date(now).toISOString());
    for (const secret of ["SECRET", "HIDDEN", "PRIVATE"]) expect(output).not.toContain(secret);
    expect(output).toContain("/hostdashboard/admin/review-approval");
  });

test.each(["submission", "approval", "flag"])("%s rollback makes no durable event available to delivery", async action => {
  rollback = true;
  review.status = action === "submission" ? "DRAFT" : "PENDING_APPROVAL";
  await expect(action === "flag" ? createFlag() : transition(review.status, action === "submission" ? "PENDING_APPROVAL" : "APPROVED"))
    .rejects.toThrow("transaction aborted");
  await worker.run(); expect(jobs.size).toBe(0); expect(invoke).not.toHaveBeenCalled();
});

test("failed optimistic updates, invalid transitions and failed flag writes enqueue nothing", async () => {
  reviews.update.mockResolvedValue({ affected: 0 });
  expect(await transition("DRAFT", "PENDING_APPROVAL")).toBeNull(); expect(jobs.size).toBe(0);
  reviews.update.mockResolvedValue({ affected: 1 });
  await expect(transition("DRAFT", "APPROVED")).rejects.toThrow("Invalid review transition");
  review.status = "APPROVED"; flags.insert.mockRejectedValue(new Error("flag insert failed"));
  await expect(createFlag()).rejects.toThrow("flag insert failed"); expect(jobs.size).toBe(0);
});

test("revalidation excludes revoked administrators and completed workflows", async () => {
  await transition("DRAFT", "PENDING_APPROVAL"); const [job] = [...jobs.values()];
  members[0].status = "inactive"; members[1].role = "unrelated";
  await worker.process(job); expect(invoke).not.toHaveBeenCalled();
  members[0].status = "active"; review.status = "REJECTED";
  await worker.process(job); expect(invoke).not.toHaveBeenCalled();
});

test("delivery failure preserves committed moderation and logs safely without resending claimed emails", async () => {
  await transition("DRAFT", "PENDING_APPROVAL"); const [job] = [...jobs.values()];
  invoke.mockImplementation(async name => {
    if (name === "GetUserInfo") return [{ Attributes: [{ Name: "email", Value: "admin@example.com" }] }];
    throw new Error("SECRET email failure");
  });
  await worker.process(job);
  expect(review.status).toBe("PENDING_APPROVAL");
  expect(worker.repository.advance).toHaveBeenLastCalledWith(job, JSON.parse(job.payload), now + 60000);
  const attempts = invoke.mock.calls.length; await worker.process(job); expect(invoke).toHaveBeenCalledTimes(attempts);
  expect(console.error).toHaveBeenCalled(); expect(JSON.stringify(console.error.mock.calls)).not.toContain("SECRET");
});

test("database lookup failure retains work; arbitrary timestamps cannot override persisted events", async () => {
  await transition("DRAFT", "PENDING_APPROVAL"); const [job] = [...jobs.values()];
  const candidates = new ReviewAdminAlertCandidateService();
  expect((await candidates.evaluate({ ...JSON.parse(job.payload), eventTimestamp: 0 }))[0].eventTimestamp).toBe(now);
  reviews.findOne.mockRejectedValue(new Error("database unavailable"));
  await worker.process(job);
  expect(worker.repository.advance).toHaveBeenLastCalledWith(job, JSON.parse(job.payload), now + 60000);
  expect(invoke).not.toHaveBeenCalled();
});


test("concurrent submissions queue one stable event and retries cannot resubmit", async () => {
  const results = await Promise.all([transition("DRAFT", "PENDING_APPROVAL"), transition("DRAFT", "PENDING_APPROVAL")]);
  expect(results.filter(Boolean)).toHaveLength(1); expect(jobs.size).toBe(1);
  expect([...jobs.keys()]).toEqual([adminReviewAlertWorkId("REVIEW_PENDING_APPROVAL", "r")]);
  expect(await transition("DRAFT", "PENDING_APPROVAL")).toBeNull();
});

import { ReviewAlertRecipientRepository } from "../../functions/ReviewSystem/data/reviewAlertRecipientRepository.js";
test("delivery rejects forged property, recipient, timestamp and key against persisted work", async () => {
  await transition("DRAFT", "PENDING_APPROVAL");
  const event = (await new ReviewAdminAlertCandidateService().evaluate({ type: "REVIEW_PENDING_APPROVAL", reviewId: "r" }))[0];
  const recipients = new ReviewAlertRecipientRepository();
  for (const changes of [{ propertyId: "other" }, { recipientUserId: "attacker" }, { eventKey: "fake" }, { eventTimestamp: 0 }]) {
    expect(await recipients.resolve({ ...event, ...changes })).toEqual([]);
  }
  expect(await recipients.resolve(event)).toEqual(["admin"]);
});

test("immutable approval timestamp survives later flag updates", async () => {
  await transition("DRAFT", "PENDING_APPROVAL");
  review.updated_at = now + 10000;
  const event = (await new ReviewAdminAlertCandidateService().evaluate({ type: "REVIEW_PENDING_APPROVAL", reviewId: "r" }))[0];
  expect(event.eventTimestamp).toBe(now);
});

import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
test.each(["submission", "approval", "flag"])("%s attempts delivery only after commit; failures preserve workflow success", async action => {
  review.status = action === "submission" ? "DRAFT" : "PENDING_APPROVAL";
  review.verification_status = "VERIFIED";
  repo.findBookingById = async () => ({});
  worker.repository.find = jest.fn(async id => jobs.get(id));
  const service = new ReviewService({ repository: repo, alerts: worker, now: () => now });
  jest.spyOn(service, "assertPublicationBooking").mockImplementation(() => {});
  jest.spyOn(service, "validateReviewPayload").mockImplementation(() => {});
  jest.spyOn(service, "assertReviewApprover").mockResolvedValue();
  invoke.mockImplementation(async name => {
    expect(jobs.size).toBe(1); // Outbox becomes visible only after runTransaction resolves.
    if (name === "GetUserInfo") return [{ Attributes: [{ Name: "email", Value: "admin@example.com" }] }];
    throw new Error("email unavailable");
  });
  const operation = () => action === "flag" ? service.flagReview("admin", "admin", { review_id: "r", reason: "SPAM" })
    : service.changePublicationState(review, review.status, action === "submission" ? "PENDING_APPROVAL" : "APPROVED", async () => true);
  rollback = true;
  await expect(operation()).rejects.toThrow("transaction aborted");
  expect(invoke).not.toHaveBeenCalled(); expect(worker.repository.find).not.toHaveBeenCalled();
  rollback = false; review.status = action === "submission" ? "DRAFT" : "PENDING_APPROVAL"; flag = null;
  await expect(operation()).resolves.toBeDefined();
  expect(invoke.mock.calls.filter(([name]) => name === "EmailNotificationService")).toHaveLength(2);
  expect(worker.repository.advance).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ phase: "admin" }), now + 60000);
});
