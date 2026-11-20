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
test("verifies score, count and page through completed booking evidence without requiring stored verification", async () => {
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
  await new ReviewRepository().getPublicReviewPage("p1", 0, { verificationNow: 2000 });
  expect(queries).toHaveLength(3);
  for (const query of queries) {
    const sql = query.getQuery();
    expect(sql).toContain('INNER JOIN "main"."booking"');
    for (const [bookingField, reviewField] of [["id", "booking_id"], ["guestid", "reviewer_user_id"], ["property_id", "property_id"]]) {
      expect(sql).toContain(`"stay"."${bookingField}" = "review"."${reviewField}"`);
    }
    expect(sql).toContain("<= :stayNow");
    expect(sql).toContain('"stay"."departuredate" > 0');
    expect(sql).not.toContain("verification_status");
    expect(query.getParameters()).toMatchObject({ propertyId: "p1", propertyStatus: "ACTIVE",
      publicationStatus: "PUBLISHED", status: "PUBLISHED",
      reviewType: "GUEST_TO_PROPERTY", stayStatuses: ["paid", "confirmed"], stayNow: 2000 });
  }
});
