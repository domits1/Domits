jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Review } from "../../ORM/models/Review.js";
import { Review_Flag } from "../../ORM/models/Review_Flag.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

it("authenticates, validates, lists and resolves flags through the moderation scope", async () => {
  const previous = process.env.PROPERTY_REVIEW_ADMIN_USER_IDS;
  process.env.PROPERTY_REVIEW_ADMIN_USER_IDS = "staff";
  const repository = {
    hasActiveReviewApproverRole: jest.fn().mockResolvedValue(false),
    createReviewFlag: jest.fn(async (flag) => flag),
    resolveReviewFlag: jest.fn(async () => ({ status: "RESOLVED" })),
  };
  const source = new DataSource({ type: "postgres", schema: "test", entities: [Review, Review_Flag] });
  await source.buildMetadatas();
  const query = source.getRepository(Review_Flag).createQueryBuilder("flag");
  const row = { id: "flag-1", status: "RESOLVED", title: "Stay", public_review: "Good",
    reason: "SPAM", created_at: "1", updated_at: "2", overall_rating: "4.5" };
  jest.spyOn(query, "getRawMany").mockResolvedValue([row, { ...row, id: "flag-2" }]);
  Database.getInstance.mockResolvedValue({ getRepository: () => ({ createQueryBuilder: () => query }) });
  const service = new ReviewService({ now: () => 10 });
  Object.assign(service.repository, repository);
  const authManager = { getUser: async () => ({ userId: "admin-id", username: "staff" }) };
  const controller = new Controller({ service, authManager });
  const event = { resource: "/reviews", queryStringParameters: { scope: "moderation" },
    body: JSON.stringify({ review_id: "r1", reason: "SPAM", notes: " check ", flag_id: "flag-1" }) };

  try {
    for (const action of ["createReview", "getReviews", "updateReview"]) {
      expect((await controller[action](event)).statusCode).toBe(403);
    }
    expect(repository.createReviewFlag).not.toHaveBeenCalled();
    expect(repository.resolveReviewFlag).not.toHaveBeenCalled();
    repository.hasActiveReviewApproverRole.mockResolvedValue(true);
    expect((await controller.createReview({ ...event, body: '{"review_id":"r1"}' })).statusCode).toBe(400);
    expect((await controller.createReview(event)).statusCode).toBe(201);
    expect(repository.createReviewFlag).toHaveBeenCalledWith(expect.objectContaining({
      review_id: "r1", flagged_by: "admin-id", reason: "SPAM", notes: "check", status: "PENDING", created_at: 10,
    }));
    const result = await controller.getReviews({ ...event, queryStringParameters: {
      ...event.queryStringParameters, status: "RESOLVED", limit: "1", offset: "2",
    } });
    expect(result.headers["Cache-Control"]).toBe("no-store");
    expect(JSON.parse(result.body)).toEqual({ flags: [{ ...row, created_at: 1, updated_at: 2, overall_rating: 4.5 }], next_offset: 3 });
    expect(query.getQuery()).toContain('ORDER BY "flag"."created_at" ASC, "flag"."id" ASC LIMIT 2 OFFSET 2');
    expect(query.getQuery()).not.toContain("private_feedback");
    expect(query.getParameters()).toMatchObject({ status: "RESOLVED" });
    expect((await controller.updateReview(event)).statusCode).toBe(200);
    expect(repository.resolveReviewFlag).toHaveBeenCalledWith("flag-1", "admin-id", 10);
  } finally {
    if (previous === undefined) delete process.env.PROPERTY_REVIEW_ADMIN_USER_IDS;
    else process.env.PROPERTY_REVIEW_ADMIN_USER_IDS = previous;
  }
});
