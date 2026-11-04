jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { ReviewCategory } from "database/models/ReviewCategory";
import { ReviewCategoryRating } from "database/models/ReviewCategoryRating";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";

describe("category aggregation repository", () => {
  let database, query;
  beforeEach(async () => {
    // Build real ORM SQL without opening a database connection.
    database = new DataSource({ type: "postgres", schema: "main",
      entities: [Property, Review, ReviewCategory, ReviewCategoryRating] });
    await database.buildMetadatas();
    query = database.getRepository(ReviewCategory).createQueryBuilder("category");
    jest.spyOn(query, "getRawMany").mockResolvedValue([
      { category_key: "cleanliness", label: "Cleanliness", average_rating: "4.25", rating_count: "2" },
      { category_key: "comfort", label: "Comfort", average_rating: null, rating_count: "0" },
    ]);
    jest.spyOn(database, "getRepository").mockReturnValue({ createQueryBuilder: () => query });
    Database.getInstance.mockResolvedValue(database);
  });
  test("builds property-scoped eligible category aggregation with owner authorization", async () => {
    await new ReviewRepository().getPropertyCategoryRatings("p1", "host-1");
    const [sql, parameters] = query.getQueryAndParameters();
    expect(sql).toContain('"main"."review_rating"');
    expect(sql).toContain('"review"."id" = "rating"."review_id"');
    expect(sql).toMatch(/"review"\."property_id" = \$\d+/);
    expect(sql).toMatch(/"property"\."hostid" = \$\d+/);
    expect(sql).toMatch(/"property"\."id" = \$\d+/);
    expect(sql).not.toContain("verification_status");
    expect(sql).toMatch(/"review"\."publication_status" = \$\d+/);
    expect(sql).toMatch(/"rating"\."rating" BETWEEN \$\d+ AND \$\d+/);
    expect(sql).toContain('"rating"."rating" * 2 = FLOOR("rating"."rating" * 2)');
    expect(sql).toMatch(/"review"\."status" = \$\d+/);
    expect(sql).toMatch(/"review"\."review_type" = \$\d+/);
    expect(sql).toMatch(/"category"\."review_type" = \$\d+/);
    expect(sql).toMatch(/"category"\."is_active" = \$\d+/);
    expect(sql).toContain('AVG("rating"."rating")');
    expect(sql).toContain('ORDER BY "category"."sort_order" ASC');
    expect(sql).toContain('COUNT(*)');
    expect(sql).toContain('GROUP BY "definition"."key"');
    expect(sql).toContain('LOWER(TRIM("rating"."category")) = LOWER(TRIM("definition"."key"))');
    expect(sql).toContain('LOWER(TRIM("rating"."category")) = LOWER(TRIM("definition"."label"))');
    expect(sql).toMatch(/"definition"\."is_active" = \$\d+/);
    expect(sql).toMatch(/"definition"\."review_type" = \$\d+/);
    expect(query.getParameters()).toEqual({ propertyId: "p1", hostId: "host-1",
      published: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY", minimum: 1, maximum: 5, active: true });
    expect(parameters).toEqual(expect.arrayContaining(["p1", "host-1", "PUBLISHED", "GUEST_TO_PROPERTY", 1, 5, true]));
  });
  test("preserves missing categories and converts aggregate numeric strings", async () => {
    const result = await new ReviewRepository().getPropertyCategoryRatings("p1", "host-1");
    expect(query.getQuery()).toContain('LEFT JOIN');
    expect(result).toEqual([
      { category_key: "cleanliness", label: "Cleanliness", average_rating: 4.25, rating_count: 2, sort_order: 0 },
      { category_key: "comfort", label: "Comfort", average_rating: null, rating_count: 0, sort_order: 0 },
    ]);
  });
});
