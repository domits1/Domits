jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";

test.each(["week", "month", "year"])("builds UTC %s averages/counts scoped to the owned property and exact date range", async (interval) => {
  // Exercise the real ORM and shared eligibility logic without opening a database connection.
  const database = new DataSource({ type: "postgres", schema: "main", entities: [Property, Review] });
  await database.buildMetadatas();
  const query = database.getRepository(Review).createQueryBuilder("review");
  const rows = [{ period: "2026-01-01", average_score: "4.5", review_count: "2" }];
  jest.spyOn(query, "getRawMany").mockResolvedValue(rows);
  jest.spyOn(database, "getRepository").mockReturnValue({ createQueryBuilder: () => query });
  Database.getInstance.mockResolvedValue(database);
  const result = await new ReviewRepository().getPropertyReviewPerformance("property-1", "host-1", 1000, 2000, interval);
  expect(result).toEqual(rows);
  const [sql] = query.getQueryAndParameters();
  expect(sql).toContain('AVG("review"."overall_rating")');
  expect(sql).toContain('COUNT(*)');
  expect(sql).toContain(`DATE_TRUNC('${interval}'`);
  expect(sql).toContain('TO_TIMESTAMP("review"."created_at" / 1000.0)');
  expect(sql).toContain("AT TIME ZONE 'UTC'");
  expect(sql).toContain("GROUP BY DATE_TRUNC");
  expect(sql).toContain("ORDER BY DATE_TRUNC");
  expect(sql).toContain("ASC");
  for (const field of ["property_id", "verification_status", "publication_status", "status", "review_type"]) {
    expect(sql).toMatch(new RegExp(`"review"\\."${field}" = \\$\\d+`));
  }
  expect(sql).toMatch(/"property"\."hostid" = \$\d+/);
  expect(sql).toContain('"property"."id" = "review"."property_id"');
  expect(sql).toMatch(/"review"\."created_at" >= \$\d+/);
  expect(sql).toMatch(/"review"\."created_at" < \$\d+/);
  expect(query.getParameters()).toMatchObject({ propertyId: "property-1", hostId: "host-1",
    start: 1000, endExclusive: 2000, verificationStatus: "VERIFIED", publicationStatus: "PUBLISHED",
    status: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY", minimum: 1, maximum: 5 });
});
