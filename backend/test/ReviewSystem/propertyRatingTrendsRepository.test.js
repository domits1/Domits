jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource, SelectQueryBuilder } from "typeorm";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";

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
    expect(sql).not.toContain("verification_status");
    expect(executed.getParameters()).not.toHaveProperty("verificationStatus");
    for (const field of ["publication_status", "status", "review_type"]) {
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
