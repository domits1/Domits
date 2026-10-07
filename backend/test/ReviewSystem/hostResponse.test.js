jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Review } from "database/models/Review";
import { Property } from "database/models/Property";
import { Team_Member } from "database/models/Team_Member";
import { Review_Response } from "database/models/Review_Response";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";
const user = { userId: "host-sub", username: "host-1" };
describe("host response", () => {
  let query, responses, repository, service;
  beforeEach(async () => {
    const database = new DataSource({ type: "postgres", schema: "main", entities: [Review, Property, Team_Member] });
    await database.buildMetadatas();
    query = database.getRepository(Review).createQueryBuilder("review");
    jest.spyOn(query, "getOne").mockResolvedValue({ id: "r1" });
    responses = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn(async (record) => record) };
    const manager = { getRepository: (entity) => entity === Review_Response ? responses : { createQueryBuilder: () => query } };
    Database.getInstance.mockResolvedValue({ transaction: (work) => work(manager) });
    repository = new ReviewRepository();
    service = new ReviewService({ repository, now: () => 1000 });
  });
  test("publishes normalized literal text linked to the trusted actor and review", async () => {
    const saved = await service.saveHostResponse(user, "r1", { message: " <b>Thanks</b>\r\nagain " }, "publish");
    expect(saved).toMatchObject({ status: "published", message: "<b>Thanks</b>\nagain", createdAt: 1000, publishedAt: 1000 });
    expect(responses.save).toHaveBeenCalledWith(expect.objectContaining({ reviewId: "r1", authorId: "host-sub", updatedAt: 1000 }));
    expect(query.getQuery()).toContain('"property"."hostid" = :username OR "member"."id" IS NOT NULL');
    for (const field of ["verification_status", "publication_status", "status", "review_type"]) {
      expect(query.getQuery()).toContain(`"review"."${field}" = :`);
    }
    expect(query.getParameters()).toMatchObject({ username: "host-1", active: "active", role: "Property Operations Manager",
      reviewId: "r1", propertyStatus: "ACTIVE", status: "PUBLISHED", publicationStatus: "PUBLISHED", verificationStatus: "VERIFIED", reviewType: "GUEST_TO_PROPERTY" });
  });
  test("edits the existing response without changing its original timestamps or ID", async () => {
    responses.findOne.mockResolvedValue({ id: "response-1", status: "published", createdAt: 100, publishedAt: 200 });
    expect(await service.saveHostResponse(user, "r1", { message: "Updated" }, "edit"))
      .toMatchObject({ id: "response-1", createdAt: 100, publishedAt: 200, updatedAt: 1000 });
  });
  test.each(["unrelated host", "inactive membership", "hidden review", "rejected review", "draft review", "private feedback"])(
    "rejects %s when the authorized eligibility query finds no review", async () => {
    query.getOne.mockResolvedValue(null);
    await expect(service.saveHostResponse(user, "r1", { message: "Thanks" }, "publish")).rejects.toMatchObject({ statusCode: 404 });
    expect(responses.save).not.toHaveBeenCalled();
  });
  test("converts the live unique constraint race into a conflict", async () => {
    responses.save.mockRejectedValue({ driverError: { code: "23505", constraint: "review_response_review_unique_main" } });
    await expect(service.saveHostResponse(user, "r1", { message: "Thanks" }, "publish")).rejects.toMatchObject({ statusCode: 409 });
  });
  test.each(["", " ", null, 42, "x".repeat(501), "bad\u0000text"])("rejects invalid content %j", async (message) => {
    await expect(service.saveHostResponse(user, "r1", { message }, "publish")).rejects.toMatchObject({ statusCode: 400 });
    expect(responses.save).not.toHaveBeenCalled();
  });
  test("rejects spoofed fields and missing host identity", async () => {
    await expect(service.saveHostResponse(user, "r1", { message: "Thanks", authorId: "other" }, "publish")).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.saveHostResponse({}, "r1", { message: "Thanks" }, "publish")).rejects.toMatchObject({ statusCode: 401 });
    expect((await new Controller({ service }).saveHostResponse({ resource: "/reviews/{id}/response", body: "{}" })).statusCode).toBe(401);
  });
  test("saves drafts but does not downgrade a published response", async () => {
    expect(await service.saveHostResponse(user, "r1", { message: "Thanks" }, "draft")).toMatchObject({ status: "draft", publishedAt: null });
    responses.findOne.mockResolvedValue({ status: "published" });
    await expect(service.saveHostResponse(user, "r1", { message: "Thanks" }, "draft")).rejects.toMatchObject({ statusCode: 409 });
  });
});
