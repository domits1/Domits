jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
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
