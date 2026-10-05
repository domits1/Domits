jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { ReviewCategory } from "database/models/ReviewCategory";
import { ReviewCategoryRating } from "database/models/ReviewCategoryRating";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

describe("public review retrieval", () => {
  let database, queries, controller, summary, reviews, property;
  const request = (query = {}) => ({ queryStringParameters: { propertyId: "p1", ...query } });
  beforeEach(async () => {
    database = new DataSource({ type: "postgres", schema: "main",
      entities: [Property, Review, ReviewCategory, ReviewCategoryRating] });
    await database.buildMetadatas();
    queries = [];
    property = { id: "p1" };
    summary = { score: "4", count: "11" };
    reviews = [{ id: "r1", overall_rating: 4, public_review: "Good stay", created_at: 1000,
      private_feedback: "secret", guest_id: "private" }];
    const getRepository = database.getRepository.bind(database);
    jest.spyOn(database, "getRepository").mockImplementation((entity) => {
      const repository = getRepository(entity);
      if (entity === Property) jest.spyOn(repository, "findOne").mockImplementation(async () => property);
      jest.spyOn(repository, "createQueryBuilder").mockImplementation((alias) => {
        const query = database.createQueryBuilder(entity, alias);
        jest.spyOn(query, "getRawOne").mockImplementation(async () => summary);
        jest.spyOn(query, "getMany").mockImplementation(async () => reviews);
        jest.spyOn(query, "getRawMany").mockResolvedValue([
          { review_id: "r1", key: "comfort", label: "Comfort", rating: "4.5" },
        ]);
        queries.push(query);
        return query;
      });
      return repository;
    });
    Database.getInstance.mockResolvedValue(database);
    controller = new Controller({ service: new ReviewService({ repository: new ReviewRepository() }) });
  });
  test("anonymous response has summary, categories, verification, and no private fields", async () => {
    const result = await controller.getPublicReviews(request());
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ property_id: "p1", overall_score: 4, review_count: 11,
      next_offset: 10, reviews: [{ id: "r1", rating: 4, text: "Good stay", date: 1000, verified: true,
        categories: [{ key: "comfort", label: "Comfort", rating: 4.5 }] }] });
    const [sql, parameters] = queries[1].getQueryAndParameters();
    expect(sql).not.toMatch(/private_feedback|guest_id|reservation_id/);
    expect(sql).toContain('ORDER BY "review_created_at" DESC, "review_id" DESC LIMIT 10');
    expect(queries[1].getParameters()).toMatchObject({ propertyId: "p1",
      verificationStatus: "verified", publicationStatus: "published", status: "ACTIVE" });
    expect(parameters).toEqual(expect.arrayContaining(["p1", "verified", "published", "ACTIVE"]));
    expect(sql).toMatch(/"review"\."property_id" = \$\d+/);
    expect(sql).toMatch(/"review"\."publication_status" = \$\d+/);
    expect(sql).toMatch(/"review"\."verification_status" = \$\d+/);
  });
  test.each(["-1", "1.5", "", "100001", [], {}])("rejects invalid offset %j", async (offset) => {
    expect((await controller.getPublicReviews(request({ offset }))).statusCode).toBe(400);
    expect(queries).toHaveLength(0);
  });
  test("rejects a missing property ID", async () => {
    expect((await controller.getPublicReviews({})).statusCode).toBe(400);
  });
  test("handles an empty property and skips category queries", async () => {
    summary = { score: null, count: "0" };
    reviews = [];
    const result = await new ReviewRepository().getPublicReviewPage("p1", 0);
    expect(result).toEqual({ property_id: "p1", overall_score: null, review_count: 0, next_offset: null, reviews: [] });
    expect(queries).toHaveLength(2);
  });
  test("rejects unavailable properties without retrieving review data", async () => {
    property = null;
    expect((await controller.getPublicReviews(request({ propertyId: "other" }))).statusCode).toBe(404);
    expect(queries).toHaveLength(0);
  });
});
