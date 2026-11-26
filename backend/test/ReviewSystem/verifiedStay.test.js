import { DataSource } from "typeorm";
import Database from "database";
import { Booking } from "database/models/Booking";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { completedStayError } from "../../functions/ReviewSystem/util/verifiedStay.js";

jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));

test.each(["paid", "confirmed", " CONFIRMED "])("accepts a completed %s reservation", (status) => {
  expect(completedStayError({ status, departuredate: 1000 }, 2000)).toBeNull();
});
test.each([{ status: "cancelled", departuredate: 1000 }, { status: "pending", departuredate: 1000 },
  { status: "paid", departuredate: 3000 }, { status: "paid", departuredate: null },
  { status: "paid", departuredate: "invalid" }, { status: "paid", departuredate: 0 }, {}, undefined])(
  "rejects an ineligible reservation %j", (booking) => {
    expect(completedStayError(booking, 2000)).not.toBeNull();
  });
test("keeps score, count and page based on persisted verification after cancellation or refund", async () => {
  const database = new DataSource({ type: "postgres", schema: "main", entities: [Booking, Property, Review] });
  await database.buildMetadatas();
  const queries = [];
  const build = database.getRepository(Review).createQueryBuilder.bind(database.getRepository(Review));
  jest.spyOn(database, "getRepository").mockImplementation((entity) => entity === Property
    ? { findOne: async () => ({ id: "p1" }) } : { createQueryBuilder: () => {
      const query = build("review");
      jest.spyOn(query, "getRawOne").mockResolvedValue({ score: null, count: "0" });
      jest.spyOn(query, "getMany").mockResolvedValue([]);
      queries.push(query);
      return query;
    } });
  Database.getInstance.mockResolvedValue(database);
  await new ReviewRepository().getPublicReviewPage("p1", 0);
  expect(queries).toHaveLength(3);
  for (const query of queries) {
    const sql = query.getQuery();
    expect(sql).not.toContain('"booking"');
    expect(sql).not.toContain('"stay"');
    expect(sql).toContain('"review"."verification_status" = :stayVerification');
    expect(query.getParameters()).toMatchObject({ propertyId: "p1", propertyStatus: "ACTIVE",
      publicationStatus: "PUBLISHED", status: "PUBLISHED",
      reviewType: "GUEST_TO_PROPERTY", stayVerification: "VERIFIED_STAY" });
  }
});
