import { DataSource } from "typeorm";
import { Review } from "database/models/Review";
import { Review_Response } from "database/models/Review_Response";
jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { Property } from "database/models/Property";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

describe("public review retrieval", () => {
  let query, controller, property, summary, reviews;
  const request = (query = {}) => ({ pathParameters: { propertyId: "p1" }, queryStringParameters: query });
  beforeEach(() => {
    property = { id: "p1" };
    summary = { score: "4", count: "11" };
    reviews = [{ id: "r1", overall_rating: 4, public_review: "Good stay", created_at: 1000,
      private_feedback: "secret", reviewer_user_id: "private" }];
    query = { getRawOne: jest.fn(async () => summary), getMany: jest.fn(async () => reviews),
      getRawMany: jest.fn(async () => [{ review_id: "r1", key: "comfort", label: "Comfort", rating: "4.5" }]) };
    for (const method of ["where", "andWhere", "innerJoin", "select", "addSelect", "orderBy", "addOrderBy", "offset", "limit"]) {
      query[method] = jest.fn(() => query);
    }
    Database.getInstance.mockResolvedValue({ getRepository: (entity) => entity === Property
      ? { findOne: async () => property } : entity === Review_Response
      ? { find: async () => [{ reviewId: "r1", message: "Thanks", publishedAt: 2000 }] } : { createQueryBuilder: () => query } });
    controller = new Controller({ service: new ReviewService({ repository: new ReviewRepository() }) });
  });
  test("anonymous response uses the path property and excludes private fields", async () => {
    const result = await controller.getPublicReviews(request({ propertyId: "spoofed" }));
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ property_id: "p1", overall_score: 4, review_count: 11,
      next_offset: 10, reviews: [{ id: "r1", rating: 4, text: "Good stay", date: 1000, verified: true, response: { message: "Thanks", publishedAt: 2000 },
        categories: [{ key: "comfort", label: "Comfort", rating: 4.5 }] }] });
    expect(query.where).toHaveBeenCalledWith("review.property_id = :propertyId", { propertyId: "p1" });
    expect(query.andWhere).toHaveBeenCalledWith("review.publication_status = :publicationStatus", { publicationStatus: "PUBLISHED" });
    expect(query.andWhere).toHaveBeenCalledWith("review.verification_status = :verificationStatus", { verificationStatus: "VERIFIED" });
    expect(query.select).toHaveBeenCalledWith(["review.id", "review.overall_rating", "review.public_review", "review.created_at"]);
    expect(query.orderBy).toHaveBeenCalledWith("review.created_at", "DESC");
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(query.andWhere).toHaveBeenCalledWith("review.status = :status", { status: "PUBLISHED" });
    expect(query.andWhere).toHaveBeenCalledWith("review.review_type = :reviewType", { reviewType: "GUEST_TO_PROPERTY" });
  });
  test.each(["-1", "1.5", "", "100001", [], {}])("rejects invalid offset %j", async (offset) => {
    expect((await controller.getPublicReviews(request({ offset }))).statusCode).toBe(400);
    expect(query.getMany).not.toHaveBeenCalled();
  });
  test("rejects a missing property ID", async () => {
    expect((await controller.getPublicReviews({})).statusCode).toBe(400);
  });
  test("handles an empty property and skips category queries", async () => {
    summary = { score: null, count: "0" };
    reviews = [];
    const result = await new ReviewRepository().getPublicReviewPage("p1", 0);
    expect(result).toEqual({ property_id: "p1", overall_score: null, review_count: 0, next_offset: null, reviews: [] });
    expect(query.getRawMany).not.toHaveBeenCalled();
  });
  test("rejects unavailable properties without retrieving review data", async () => {
    property = null;
    expect((await controller.getPublicReviews(request())).statusCode).toBe(404);
    expect(query.getMany).not.toHaveBeenCalled();
  });
});


test("keeps review publication and property visibility parameters independent in generated SQL", async () => {
  const database = new DataSource({ type: "postgres", schema: "main", entities: [Property, Review] });
  await database.buildMetadatas();
  const query = database.getRepository(Review).createQueryBuilder("review");
  jest.spyOn(query, "getRawOne").mockResolvedValue({ score: null, count: "0" });
  jest.spyOn(query, "getMany").mockResolvedValue([]);
  jest.spyOn(database, "getRepository").mockImplementation((entity) => entity === Property
    ? { findOne: async () => ({ id: "p1" }) } : { createQueryBuilder: () => query });
  Database.getInstance.mockResolvedValue(database);
  await new ReviewRepository().getPublicReviewPage("p1", 0);
  expect(query.getParameters()).toMatchObject({ status: "PUBLISHED", propertyStatus: "ACTIVE",
    verificationStatus: "VERIFIED", publicationStatus: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY" });
  expect(query.getQueryAndParameters()[1]).toEqual(expect.arrayContaining(["PUBLISHED", "ACTIVE", "GUEST_TO_PROPERTY"]));
});
