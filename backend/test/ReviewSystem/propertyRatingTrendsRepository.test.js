jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource, SelectQueryBuilder } from "typeorm";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";

test("uses the existing score aggregation with ownership, eligibility and exact date bounds", async () => {
  const database = new DataSource({ type: "postgres", schema: "main", entities: [Property, Review] });
  await database.buildMetadatas();
  const query = database.getRepository(Review).createQueryBuilder("review");
  jest.spyOn(query, "getRawOne").mockResolvedValue({ overall_score: "4.5", review_count: "2" });
  jest.spyOn(database, "getRepository").mockReturnValue({ createQueryBuilder: () => query });
  Database.getInstance.mockResolvedValue(database);
  const result = await new ReviewRepository().getPropertyReviewScore("p1", "host-1", { start: 1000, endExclusive: 2000 });
  expect(result).toEqual({ property_id: "p1", overall_score: 4.5, review_count: 2 });
  const sql = query.getQuery();
  expect(sql).toContain('AVG("review"."overall_rating")');
  expect(sql).toContain('COUNT(*)');
  expect(sql).toContain('"property"."id" = "review"."property_id"');
  for (const field of ["property_id", "verification_status", "publication_status", "status", "review_type"]) {
    expect(sql).toMatch(new RegExp(`"review"\\."${field}" = :`));
  }
  expect(sql).toContain('"property"."hostid" = :hostId');
  expect(sql).toContain('"review"."created_at" >= :start');
  expect(sql).toContain('"review"."created_at" < :endExclusive');
  expect(query.getParameters()).toMatchObject({ propertyId: "p1", hostId: "host-1", start: 1000, endExclusive: 2000,
    status: "PUBLISHED", publicationStatus: "PUBLISHED", verificationStatus: "VERIFIED", reviewType: "GUEST_TO_PROPERTY" });
});
test("lists only manager-owned properties with bounded ordered pagination", async () => {
  const find = jest.fn().mockResolvedValue([{ id: "p1" }]);
  Database.getInstance.mockResolvedValue({ getRepository: () => ({ find }) });
  expect(await new ReviewRepository().findManagedProperties("host-1", 25)).toEqual([{ id: "p1" }]);
  expect(find).toHaveBeenCalledWith({ where: { hostid: "host-1" }, select: ["id"], order: { id: "ASC" }, skip: 25, take: 26 });
});

test.each([undefined, "DECLINING"])("aggregates both windows and filters %s before paging in one statement", async (status) => {
  const database = new DataSource({ type: "postgres", schema: "main", entities: [Property, Review] });
  await database.buildMetadatas();
  Database.getInstance.mockResolvedValue(database);
  let executed;
  const read = jest.spyOn(SelectQueryBuilder.prototype, "getRawMany").mockImplementation(async function () {
    executed = this;
    return [{ property_id: "p1", previous_average_rating: "4.5", current_average_rating: "4",
      previous_review_count: "3", current_review_count: "3", trend_status: "DECLINING" }];
  });
  try {
    const rows = await new ReviewRepository().getPropertyRatingTrendPage("host-1", {
      previousStart: 1000, currentStart: 2000, endExclusive: 3000,
      threshold: 0.5, minimumReviews: 3, offset: 25, status, sort: "declining-first",
    });
    expect(read).toHaveBeenCalledTimes(1);
    const sql = executed.getQuery();
    expect(sql).toContain('"property"."hostid" = :hostId');
    expect(sql).toContain("LEFT JOIN");
    for (const field of ["verification_status", "publication_status", "status", "review_type"]) {
      expect(sql).toContain(`"review"."${field}" = :`);
    }
    expect(sql).toContain('"review"."overall_rating" = FLOOR("review"."overall_rating")');
    expect(sql).toContain('"review"."created_at" >= :previousStart');
    expect(sql).toContain('"review"."created_at" < :endExclusive');
    expect(sql).toContain("CASE WHEN");
    expect(sql).toContain("LIMIT 26 OFFSET 25");
    expect(sql).toContain("ORDER BY CASE WHEN trends.trend_status = 'DECLINING'");
    if (status) {
      expect(sql.indexOf("WHERE trends.trend_status = :trendStatus")).toBeLessThan(sql.indexOf("LIMIT 26"));
      expect(executed.getParameters().trendStatus).toBe(status);
    }
    expect(executed.getParameters()).toMatchObject({ hostId: "host-1", previousStart: 1000,
      currentStart: 2000, endExclusive: 3000, minimumReviews: 3, boundary: 0.5 * (1 - 1e-12) });
    expect(rows[0]).toMatchObject({ previous_average_rating: 4.5, current_average_rating: 4,
      previous_review_count: 3, current_review_count: 3 });
  } finally {
    read.mockRestore();
  }
});
