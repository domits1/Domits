jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";

describe("property score repository", () => {
  let query, propertyRepository, repository;
  beforeEach(() => {
    query = { getRawOne: jest.fn().mockResolvedValue({ overall_score: "4.5", review_count: "2" }) };
    for (const method of ["innerJoin", "select", "addSelect", "where", "andWhere"]) {
      query[method] = jest.fn(() => query);
    }
    propertyRepository = { findOne: jest.fn().mockResolvedValue({ id: "property-1" }) };
    Database.getInstance.mockResolvedValue({ getRepository: (entity) => {
      if (entity === Property) return propertyRepository;
      if (entity === Review) return { createQueryBuilder: () => query };
      throw new Error("Unexpected entity");
    } });
    repository = new ReviewRepository();
  });
  test("scopes property access to its current owner", async () => {
    await repository.findManagedProperty("property-1", "host-1");
    expect(propertyRepository.findOne).toHaveBeenCalledWith({
      where: { id: "property-1", hostid: "host-1" }, select: ["id"],
    });
    expect(query.getRawOne).not.toHaveBeenCalled();
  });
  test("averages only valid verified published ratings for the requested owned property", async () => {
    const result = await repository.getPropertyReviewScore("property-1", "host-1");
    expect(query.innerJoin).toHaveBeenCalledWith(Property, "property",
      "property.id = review.property_id AND property.hostid = :hostId", { hostId: "host-1" });
    expect(query.where).toHaveBeenCalledWith("review.property_id = :propertyId", { propertyId: "property-1" });
    expect(query.andWhere.mock.calls).toEqual([
      ["review.verification_status = :verificationStatus", { verificationStatus: "VERIFIED" }],
      ["review.publication_status = :publicationStatus", { publicationStatus: "PUBLISHED" }],
      ["review.status = :status", { status: "PUBLISHED" }],
      ["review.review_type = :reviewType", { reviewType: "GUEST_TO_PROPERTY" }],
      ["review.overall_rating BETWEEN :minimum AND :maximum", { minimum: 1, maximum: 5 }],
      ["review.overall_rating = FLOOR(review.overall_rating)"],
    ]);
    expect(query.select).toHaveBeenCalledWith("AVG(review.overall_rating)", "overall_score");
    expect(query.addSelect).toHaveBeenCalledWith("COUNT(*)", "review_count");
    expect(result).toEqual({ property_id: "property-1", overall_score: 4.5, review_count: 2 });
  });
  test("does not convert an absent average into a zero score", async () => {
    query.getRawOne.mockResolvedValue({ overall_score: null, review_count: "0" });
    await expect(repository.getPropertyReviewScore("property-1", "host-1")).resolves.toEqual({
      property_id: "property-1", overall_score: null, review_count: 0,
    });
  });
  test("preserves average precision", async () => {
    query.getRawOne.mockResolvedValue({ overall_score: "4.333333333333333", review_count: "3" });
    const result = await repository.getPropertyReviewScore("property-1", "host-1");
    expect(result.overall_score).toBeCloseTo(13 / 3, 12);
    expect(result.review_count).toBe(3);
  });
});
