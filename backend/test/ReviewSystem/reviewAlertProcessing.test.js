jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
jest.mock("../../functions/ReviewSystem/data/reviewRepositoryShared.js", () => ({
  ...jest.requireActual("../../functions/ReviewSystem/data/reviewRepositoryShared.js"), runTransaction: jest.fn(),
}));
import { ReviewAlertProcessingService } from "../../functions/ReviewSystem/business/service/reviewAlertProcessingService.js";
import { ReviewAlertNotificationService } from "../../functions/ReviewSystem/business/service/reviewAlertNotificationService.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { runTransaction } from "../../functions/ReviewSystem/data/reviewRepositoryShared.js";
import { Review } from "database/models/Review";
import { Review_Alert_Work } from "database/models/Review_Alert_Work";
import { handler } from "../../functions/ReviewSystem/index.js";
import Database from "database";
import { ReviewAlertWorkRepository } from "../../functions/ReviewSystem/data/reviewAlertWorkRepository.js";
import { CreateReviewAlertWork20261115 } from "../../ORM/migrations/20261115_create_review_alert_work.js";
import fs from "node:fs";
import path from "node:path";
const now = 1800000000000, publishedAt = now - 72 * 3600000;
const review = { id: "r1", property_id: "p1", host_id: "h1", review_type: "GUEST_TO_PROPERTY",
  overall_rating: 2, status: "PUBLISHED", publication_status: "PUBLISHED" };
const job = phase => ({ id: "r1", version: 0, payload: JSON.stringify({ reviewId: "r1", publishedAt, phase }) });
let repository, delivery, service, sent;
beforeEach(() => {
  process.env.REVIEW_DECLINE_THRESHOLD = "0.5"; process.env.REVIEW_TREND_MIN_REVIEWS = "3";
  sent = [];
  repository = { context: jest.fn().mockResolvedValue({ review, responses: [] }), advance: jest.fn(),
    find: jest.fn().mockResolvedValue(job("publication")), seed: jest.fn(), due: jest.fn().mockResolvedValue([]),
    nextHost: jest.fn().mockResolvedValue("h1"), trend: jest.fn().mockResolvedValue([]) };
  delivery = { deliver: jest.fn(async (event, { isEligible }) => {
    if (await isEligible()) { sent.push(event); return [{ status: "SENT" }]; }
    return [{ status: "INELIGIBLE" }];
  }) };
  service = new ReviewAlertProcessingService({ repository, delivery, now: () => now });
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { delete process.env.REVIEW_DECLINE_THRESHOLD; delete process.env.REVIEW_TREND_MIN_REVIEWS;
  delete process.env.REVIEW_RESPONSE_OVERDUE_HOURS; jest.restoreAllMocks(); });

test.each([1, 2, 3, 5])("publication creates appropriate alerts for rating %s", async overall_rating => {
  repository.context.mockResolvedValue({ review: { ...review, overall_rating }, responses: [] });
  await service.afterPublication(review);
  expect(sent.map(event => event.type)).toEqual(overall_rating <= 2 ? ["NEW_REVIEW", "LOW_RATING"] : ["NEW_REVIEW"]);
  expect(sent[0]).toMatchObject({ eventTimestamp: publishedAt, overallRating: overall_rating });
});
test.each(["DRAFT", "REJECTED", "DELETED", "PENDING_APPROVAL", "APPROVED"])("does not alert for %s", async status => {
  repository.context.mockResolvedValue({ review: { ...review, status }, responses: [] });
  await service.process(job("publication")); expect(sent).toEqual([]);
});
test("overdue defaults to 72h and ignores drafts/deleted replies but honors published replies", async () => {
  await service.process(job("overdue")); expect(sent.map(event => event.type)).toEqual(["RESPONSE_OVERDUE"]);
  for (const response of [{ status: "draft" }, { status: "published", deletedAt: now }, { status: "published" }]) {
    sent = []; repository.context.mockResolvedValue({ review, responses: [{ reviewId: "r1", authorRole: "host", publishedAt: now - 1, ...response }] });
    await service.process(job("overdue")); expect(sent.length).toBe(response.status === "published" && !response.deletedAt ? 0 : 1);
  }
  process.env.REVIEW_RESPONSE_OVERDUE_HOURS = "96"; sent = [];
  repository.context.mockResolvedValue({ review, responses: [] }); await service.process(job("overdue")); expect(sent).toEqual([]);
  expect(repository.advance).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), publishedAt + 96 * 3600000);
});
test("rechecks replies immediately before persistence", async () => {
  repository.context.mockResolvedValueOnce({ review, responses: [] }).mockResolvedValue({ review, responses: [
    { reviewId: "r1", authorRole: "host", status: "published", publishedAt: now, deletedAt: null },
  ] });
  await service.process(job("overdue")); expect(sent).toEqual([]);
});
test("replays and concurrent executions use the real delivery insert claim", async () => {
  const keys = new Set(), invoke = jest.fn(async () => [{ Attributes: [{ Name: "email", Value: "h@example.com" }] }]);
  service.delivery = new ReviewAlertNotificationService({ recipients: { resolve: async () => ["h1"] },
    repository: { createAlertIfMissing: async row => { if (keys.has(row.event_key)) return false; keys.add(row.event_key); return true; } },
    preferences: { findByUserId: async () => null }, notifier: { invoke } });
  await Promise.all([service.process(job("publication")), service.process(job("publication"))]);
  await service.process(job("publication")); expect(keys.size).toBe(2);
  expect(invoke.mock.calls.filter(([name]) => name === "EmailNotificationService")).toHaveLength(2);
});
test("decline scan reuses policy, stable windows and rechecks the property", async () => {
  const trend = { property_id: "p1", trend_status: "DECLINING", previous_average_rating: 4, current_average_rating: 3 };
  repository.trend.mockResolvedValue([trend]);
  await service.process({ id: "trend", version: 0, payload: JSON.stringify({ end: now, afterHost: "" }) });
  expect(sent[0]).toMatchObject({ type: "DECLINING_RATING", previousRating: 4, currentRating: 3 });
  expect(repository.trend).toHaveBeenCalledWith("h1", expect.objectContaining({ threshold: 0.5, minimumReviews: 3, propertyId: "p1", offset: 0 }));
  sent = []; repository.trend.mockResolvedValue([{ ...trend, trend_status: "STABLE" }]);
  await service.process({ id: "trend", version: 0, payload: JSON.stringify({ end: now, afterHost: "" }) }); expect(sent).toEqual([]);
});
test("failures preserve durable work and publication success", async () => {
  delivery.deliver.mockRejectedValue(new Error("timeout")); await service.process(job("publication"));
  expect(repository.advance).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ phase: "publication" }), now + 60000);
  const published = { ...review, updated_at: now };
  const alerts = { afterPublication: jest.fn().mockRejectedValue(new Error("delivery")) };
  const reviews = new ReviewService({ repository: { findBookingById: async () => ({}) , publishDraft: async () => published }, alerts });
  jest.spyOn(reviews, "assertPublicationBooking").mockImplementation(() => {});
  jest.spyOn(reviews, "validateReviewPayload").mockImplementation(() => {});
  await expect(reviews.changePublicationState({ ...review, status: "APPROVED", publication_status: "UNPUBLISHED", verification_status: "VERIFIED" }, "APPROVED", "PUBLISHED", async () => true)).resolves.toMatchObject({ status: "PUBLISHED" });
  expect(alerts.afterPublication).toHaveBeenCalledWith(published);
});
test("publication writes durable work inside the same transaction, after the conditional update", async () => {
  const draft = { ...review, status: "APPROVED", publication_status: "UNPUBLISHED", updated_at: now - 1 };
  const reviews = { findOne: async () => draft, update: jest.fn().mockResolvedValue({ affected: 1 }) };
  const insert = { insert: jest.fn().mockReturnThis(), values: jest.fn().mockReturnThis(), onConflict: jest.fn().mockReturnThis(), execute: jest.fn() };
  const manager = { getRepository: model => model === Review ? reviews : model === Review_Alert_Work ? { createQueryBuilder: () => insert } : { findOneBy: async () => null } };
  runTransaction.mockImplementation(callback => callback(manager));
  const repo = new ReviewRepository(); jest.spyOn(repo, "assertPublicationAllowed").mockResolvedValue(); jest.spyOn(repo, "completeReviewRequest").mockResolvedValue();
  await repo.publishDraft({ reviewId: "r1", expectedUpdatedAt: now - 1, updatedAt: now, authorize: async () => true });
  expect(insert.values).toHaveBeenCalledWith({ id: "r1", payload: JSON.stringify({ reviewId: "r1", publishedAt: now, phase: "publication" }), due_at: now, version: 0 });
  reviews.update.mockResolvedValue({ affected: 0 }); insert.execute.mockClear();
  expect(await repo.publishDraft({ reviewId: "r1", expectedUpdatedAt: now - 1, updatedAt: now })).toBeNull(); expect(insert.execute).not.toHaveBeenCalled();
});
test("alert schedule is separate from invitations and processes a bounded repository batch", async () => {
  repository.due.mockResolvedValue([job("publication")]); await service.run(); expect(sent.length).toBe(2);
  const run = jest.spyOn(ReviewAlertProcessingService.prototype, "run").mockResolvedValue({ processed: 0 });
  const invites = jest.spyOn(ReviewService.prototype, "processReviewRequests").mockResolvedValue([]);
  const event = name => ({ source: "aws.events", "detail-type": "Scheduled Event", resources: [`arn:aws:events:eu-north-1:123:rule/${name}`] });
  expect((await handler(event("domits-review-alerts"))).statusCode).toBe(200); expect(run).toHaveBeenCalledTimes(1); expect(invites).not.toHaveBeenCalled();
  await handler(event("domits-review-requests")); expect(invites).toHaveBeenCalledTimes(1);
});
test("queue bounds reads and advances only the version it evaluated", async () => {
  const store = { find: jest.fn(), update: jest.fn() }; Database.getInstance.mockResolvedValue({ getRepository: () => store });
  const repo = new ReviewAlertWorkRepository(); await repo.due(now); await repo.advance(job("publication"), { phase: "overdue" }, null);
  expect(store.find).toHaveBeenCalledWith(expect.objectContaining({ take: 25, order: { due_at: "ASC", id: "ASC" } }));
  expect(store.update).toHaveBeenCalledWith({ id: "r1", version: 0 }, { version: 1, due_at: null, payload: '{"phase":"overdue"}' });
});
test("scan persists a property cursor after a bounded page", async () => {
  const rows = Array.from({ length: 26 }, (_, i) => ({ property_id: `p${String(i).padStart(2, "0")}`, trend_status: "DECLINING" }));
  repository.trend.mockImplementation(async (_, options) => options.propertyId ? rows.filter(row => row.property_id === options.propertyId) : rows);
  const work = { id: "trend", version: 2, payload: JSON.stringify({ end: now, afterHost: "" }) };
  await service.process(work); expect(sent).toHaveLength(25);
  expect(repository.advance).toHaveBeenLastCalledWith(work, { end: now, afterHost: "", host: "h1", afterProperty: "p24" }, now + 1);
});
test("migration waits for DSQL index readiness in both schemas", async () => {
  const query = jest.fn(async sql => sql.includes("CREATE INDEX") ? [{ job_id: "job" }] : [{ ready: true }]);
  await new CreateReviewAlertWork20261115().up({ connection: { options: { host: "db.dsql.example" } }, query });
  expect(query.mock.calls.filter(([sql]) => sql.includes("CREATE TABLE"))).toHaveLength(2);
  expect(query).toHaveBeenCalledWith("SELECT sys.wait_for_job($1) AS ready", ["job"]);
});
test("EventBridge and IAM are scoped to the alert worker and notification dependencies", () => {
  const { Resources: r } = JSON.parse(fs.readFileSync(path.join(__dirname, "../../infrastructure/review-alert-processing/template.json"), "utf8"));
  expect(r.Schedule.Properties).toMatchObject({ Name: "domits-review-alerts", ScheduleExpression: "rate(1 minute)" });
  expect(r.Permission.Properties).toMatchObject({ Principal: "events.amazonaws.com", SourceArn: { "Fn::GetAtt": ["Schedule", "Arn"] } });
  expect(r.EmailInvocation.Properties.PolicyDocument.Statement[0].Resource.map(value => value["Fn::Sub"]))
    .toEqual(["GetUserInfo", "EmailNotificationService"].map(name => `arn:\${AWS::Partition}:lambda:\${AWS::Region}:\${AWS::AccountId}:function:${name}`));
});
