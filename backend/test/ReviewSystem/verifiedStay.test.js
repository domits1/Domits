import { DataSource } from "typeorm";
import { Booking } from "database/models/Booking";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { completedStayError } from "../../functions/ReviewSystem/util/verifiedStay.js";

test.each(["paid", "confirmed", " CONFIRMED "])("accepts a completed %s reservation", (status) => {
  expect(completedStayError({ status, departuredate: 1000 }, 2000)).toBeNull();
});
test.each([{ status: "cancelled", departuredate: 1000 }, { status: "pending", departuredate: 1000 },
  { status: "paid", departuredate: 3000 }, { status: "paid", departuredate: null },
  { status: "paid", departuredate: "invalid" }, { status: "paid", departuredate: 0 }, {}, undefined])(
  "rejects an ineligible reservation %j", (booking) => {
    expect(completedStayError(booking, 2000)).not.toBeNull();
  });
test("requires a matching reservation, guest, property, and stored public verification", async () => {
  const database = new DataSource({ type: "postgres", schema: "main", entities: [Booking, Property, Review] });
  await database.buildMetadatas();
  const query = new ReviewRepository().filteredPublicReviewQuery(database, "p1", { verificationNow: 2000 });
  const sql = query.getQuery();
  expect(sql).toContain('INNER JOIN "main"."booking"');
  for (const [bookingField, reviewField] of [["id", "booking_id"], ["guestid", "reviewer_user_id"], ["property_id", "property_id"]]) {
    expect(sql).toContain(`"stay"."${bookingField}" = "review"."${reviewField}"`);
  }
  expect(sql).toContain("<= :stayNow");
  expect(query.getParameters()).toMatchObject({ propertyId: "p1", propertyStatus: "ACTIVE",
    verificationStatus: "VERIFIED", publicationStatus: "PUBLISHED", status: "PUBLISHED",
    reviewType: "GUEST_TO_PROPERTY", stayStatuses: ["paid", "confirmed"], stayNow: 2000 });
});
