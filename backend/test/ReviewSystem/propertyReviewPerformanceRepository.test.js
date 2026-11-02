jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { execFileSync } from "node:child_process";

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
  if (interval === "month") {
    const eligibility = query.expressionMap.wheres.map(({ condition }) => condition)
      .filter((condition) => condition.includes("overall_rating")).join(" AND ");
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", `
      import { DatabaseSync } from "node:sqlite";
      const database = new DatabaseSync(":memory:");
      const eligibility = process.argv[1];
      const result = database.prepare("WITH review(overall_rating) AS (VALUES (2.5),(3.5),(4.5),(5),(0),(6),(3.2)) SELECT COUNT(*) AS count, AVG(overall_rating) AS average, SUM(CASE WHEN ROUND(overall_rating) = 5 THEN 1 ELSE 0 END) AS stars5 FROM review WHERE " + eligibility).get({ minimum: 1, maximum: 5 });
      console.log(JSON.stringify(result));
      database.close();
    `, eligibility], { encoding: "utf8" });
    expect(JSON.parse(output)).toEqual({ count: 4, average: 3.875, stars5: 2 });
  }
  expect(sql).toContain('AVG("review"."overall_rating")');
  expect(sql).toContain('COUNT(*)');
  expect(sql).toContain('"review"."overall_rating" * 2 = FLOOR("review"."overall_rating" * 2)');
  for (const stars of [1, 2, 3, 4, 5]) {
    expect(sql).toContain(`COUNT(CASE WHEN ROUND("review"."overall_rating") = ${stars} THEN 1 END)`);
  }
  expect(sql).toContain(`DATE_TRUNC('${interval}'`);
  expect(sql).toContain('TO_TIMESTAMP("review"."created_at" / 1000.0)');
  expect(sql).toContain("AT TIME ZONE 'UTC'");
  expect(sql).toContain("GROUP BY DATE_TRUNC");
  expect(sql).toContain("ORDER BY DATE_TRUNC");
  expect(sql).toContain("ASC");
  expect(sql).not.toContain("verification_status");
  for (const field of ["property_id", "publication_status", "status", "review_type"]) {
    expect(sql).toMatch(new RegExp(`"review"\\."${field}" = \\$\\d+`));
  }
  expect(sql).toMatch(/"property"\."hostid" = \$\d+/);
  expect(sql).toContain('"property"."id" = "review"."property_id"');
  expect(sql).toMatch(/"review"\."created_at" >= \$\d+/);
  expect(sql).toMatch(/"review"\."created_at" < \$\d+/);
  expect(query.getParameters()).toMatchObject({ propertyId: "property-1", hostId: "host-1",
    start: 1000, endExclusive: 2000, publicationStatus: "PUBLISHED",
    status: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY", minimum: 1, maximum: 5 });
});
