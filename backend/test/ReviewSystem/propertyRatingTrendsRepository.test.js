jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource, SelectQueryBuilder } from "typeorm";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { execFileSync } from "node:child_process";

test.each([undefined, "DECLINING"])("aggregates both windows and filters %s before paging in one statement", async (status) => {
  const database = new DataSource({ type: "postgres", schema: "main", entities: [Property, Review] });
  await database.buildMetadatas();
  Database.getInstance.mockResolvedValue(database);
  let executed;
  const read = jest.spyOn(SelectQueryBuilder.prototype, "getRawMany").mockImplementation(async function () {
    executed = this;
    return [{ property_id: "p1", previous_average_rating: "4.5", current_average_rating: "4",
      previous_review_count: "3", current_review_count: "3", trend_status: "DECLINING", rating_change: "-0.5" }];
  });
  try {
    const rows = await new ReviewRepository().getPropertyRatingTrendPage("host-1", {
      previousStart: 1000, currentStart: 2000, endExclusive: 3000,
      threshold: 0.5, minimumReviews: 3, offset: 25, status, sort: "declining-first",
    });
    expect(read).toHaveBeenCalledTimes(1);
    const sql = executed.getQuery();
    // The production PostgreSQL parser rejects unary minus on an unknown bind parameter (42725).
    const [parameterizedSql, parameters] = executed.getQueryAndParameters();
    expect(parameterizedSql).not.toMatch(/-\s*\$\d+/);
    const declineParameter = parameterizedSql.match(/<= \$(\d+) THEN 'DECLINING'/);
    expect(declineParameter).not.toBeNull();
    expect(parameters[Number(declineParameter[1]) - 1]).toBe(-0.5 * (1 - 1e-12));
    if (status === undefined) {
      const classification = sql.match(/CASE WHEN previous_review_count[\s\S]*?END/)[0];
      const cases = [
        [4.5, 4, 3, 3, 0.5, "DECLINING"],
        [4, 4.5, 3, 3, 0.5, "IMPROVING"],
        [4, 4.25, 3, 3, 0.5, "STABLE"],
        [4, 4, 3, 3, 0.5, "STABLE"],
        [null, 4, 0, 3, 0.5, "INSUFFICIENT_DATA"],
        [4.5, 4, 2, 3, 0.5, "INSUFFICIENT_DATA"],
        [4.5, null, 3, 0, 0.5, "INSUFFICIENT_DATA"],
        [4.3, 4, 3, 3, 0.3, "DECLINING"],
        [4, 4.3, 3, 3, 0.3, "IMPROVING"],
        [4.299999, 4, 3, 3, 0.3, "STABLE"],
        [4, 4.299999, 3, 3, 0.3, "STABLE"],
      ];
      const output = execFileSync(process.execPath, ["--input-type=module", "-e", `
        import { DatabaseSync } from "node:sqlite";
        const { classification, cases } = JSON.parse(process.argv[1]);
        const database = new DatabaseSync(":memory:");
        const statement = database.prepare("WITH scores(previous_average_rating, current_average_rating, previous_review_count, current_review_count) AS (VALUES (:previous, :current, :previousCount, :currentCount)) SELECT " + classification + " AS status FROM scores");
        console.log(JSON.stringify(cases.map(([previous, current, previousCount, currentCount, threshold]) =>
          statement.get({ previous, current, previousCount, currentCount, minimumReviews: 3,
            boundary: threshold * (1 - 1e-12), declineBoundary: -threshold * (1 - 1e-12) }).status)));
        database.close();
      `, JSON.stringify({ classification, cases })], { encoding: "utf8" });
      expect(JSON.parse(output)).toEqual(cases.map((row) => row[5]));
    }
    expect(sql).toContain('"property"."hostid" = :hostId');
    expect(sql).toContain("LEFT JOIN");
    expect(sql).not.toContain("verification_status");
    expect(executed.getParameters()).not.toHaveProperty("verificationStatus");
    for (const field of ["publication_status", "status", "review_type"]) {
      expect(sql).toContain(`"review"."${field}" = :`);
    }
    expect(sql).toContain('"review"."overall_rating" * 2 = FLOOR("review"."overall_rating" * 2)');
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
      currentStart: 2000, endExclusive: 3000, minimumReviews: 3, boundary: 0.5 * (1 - 1e-12),
      declineBoundary: -0.5 * (1 - 1e-12) });
    expect(rows[0]).toMatchObject({ previous_average_rating: 4.5, current_average_rating: 4,
      previous_review_count: 3, current_review_count: 3, trend_status: "DECLINING", rating_change: -0.5 });
  } finally {
    read.mockRestore();
  }
});

test("batches history for page properties with ownership, eligibility and exact bucket boundaries", async () => {
  const database = new DataSource({ type: "postgres", schema: "main", entities: [Property, Review] });
  await database.buildMetadatas();
  Database.getInstance.mockResolvedValue(database);
  let executed;
  const read = jest.spyOn(SelectQueryBuilder.prototype, "getRawMany").mockImplementation(async function () {
    executed = this;
    return [{ property_id: "p1", period_index: "5", average_rating: "3.5", review_count: "2" }];
  });
  try {
    const repository = new ReviewRepository();
    expect(await repository.getPropertyRatingHistory("host-1", [], { days: 7, endExclusive: 4000000000 })).toEqual([]);
    expect(read).not.toHaveBeenCalled();
    const rows = await repository.getPropertyRatingHistory("host-1", ["p1", "p2"], { days: 7, endExclusive: 4000000000 });
    expect(read).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([{ property_id: "p1", period_index: 5, average_rating: 3.5, review_count: 2 }]);
    const sql = executed.getQuery();
    expect(sql).toContain('"review"."property_id" IN (:...propertyIds)');
    expect(sql).toContain('"property"."hostid" = :hostId');
    expect(sql).toContain('"review"."overall_rating" * 2 = FLOOR("review"."overall_rating" * 2)');
    expect(sql).toContain('"review"."created_at" >= :historyStart');
    expect(sql).toContain('"review"."created_at" < :historyEnd');
    expect(sql).toContain('GROUP BY "review"."property_id", CASE');
    const parameters = executed.getParameters();
    expect(parameters).toMatchObject({ propertyIds: ["p1", "p2"], hostId: "host-1",
      historyStart: 371200000, historyEnd: 4000000000,
      status: "PUBLISHED", publicationStatus: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY" });
    const bucket = sql.match(/CASE WHEN[\s\S]*?ELSE 5 END/)[0];
    const boundaries = Object.fromEntries(Object.entries(parameters).filter(([key]) => key.startsWith("historyBoundary")));
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", `
      import { DatabaseSync } from "node:sqlite";
      const database = new DatabaseSync(":memory:");
      const { bucket, boundaries, start } = JSON.parse(process.argv[1]);
      const statement = database.prepare("WITH review(created_at) AS (VALUES (:timestamp)) SELECT " + bucket + " AS bucket FROM review");
      const values = [start, ...Object.values(boundaries).flatMap((boundary) => [boundary - 1, boundary])];
      console.log(JSON.stringify(values.map((timestamp) => statement.get({ ...boundaries, timestamp }).bucket)));
      database.close();
    `, JSON.stringify({ bucket, boundaries, start: parameters.historyStart })], { encoding: "utf8" });
    expect(JSON.parse(output)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
  } finally { read.mockRestore(); }
});
