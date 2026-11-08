jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { In } from "typeorm";
import { Review } from "database/models/Review";
import { Booking } from "database/models/Booking";
import { Property } from "database/models/Property";
import { Property_Location } from "database/models/Property_Location";
import { Property_Image } from "database/models/Property_Image";
import { Property_Image_Variant } from "database/models/Property_Image_Variant";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";

describe("pending review details for the approval queue", () => {
  let repositories;

  beforeEach(() => {
    repositories = new Map([Review, Booking, Property, Property_Location, Property_Image, Property_Image_Variant]
      .map((entity) => [entity, { find: jest.fn().mockResolvedValue([]) }]));
    Database.getInstance.mockResolvedValue({ getRepository: jest.fn((entity) => repositories.get(entity)) });
  });

  it("attaches property title, location, first thumbnail and the reviewer's booking name", async () => {
    repositories.get(Review).find.mockResolvedValue([
      { id: "r1", property_id: "p1", booking_id: "b1", reviewer_user_id: "guest-1" },
      { id: "r2", property_id: "p2", booking_id: "b2", reviewer_user_id: "guest-2" },
    ]);
    repositories.get(Property).find.mockResolvedValue([{ id: "p1", title: "Riverside Apartment" }]);
    repositories.get(Property_Location).find.mockResolvedValue([
      { property_id: "p1", city: "Amsterdam", country: "Netherlands" },
    ]);
    repositories.get(Property_Image).find.mockResolvedValue([
      { id: "i1", property_id: "p1", sort_order: 0 },
      { id: "i2", property_id: "p1", sort_order: 1 },
    ]);
    repositories.get(Property_Image_Variant).find.mockResolvedValue([
      { image_id: "i1", variant: "web", s3_key: "images/p1/web" },
      { image_id: "i1", variant: "thumb", s3_key: "images/p1/thumb" },
    ]);
    repositories.get(Booking).find.mockResolvedValue([
      { id: "b1", guestid: "guest-1", guestname: " Jessica Smith " },
      { id: "b2", guestid: "someone-else", guestname: "Not the reviewer" },
    ]);

    const [withDetails, withoutDetails] = await new ReviewRepository().findPendingReviews();

    expect(withDetails).toMatchObject({ property_title: "Riverside Apartment", property_city: "Amsterdam",
      property_country: "Netherlands", property_image_key: "images/p1/thumb", guest_name: "Jessica Smith" });
    expect(withoutDetails).toMatchObject({ property_title: null, property_city: null, property_country: null,
      property_image_key: null, guest_name: null });
    expect(repositories.get(Property_Image).find).toHaveBeenCalledWith(expect.objectContaining({
      where: { property_id: In(["p1", "p2"]), status: "READY" }, order: { sort_order: "ASC" } }));
    expect(repositories.get(Property_Image_Variant).find).toHaveBeenCalledWith(expect.objectContaining({
      where: { image_id: In(["i1"]), variant: In(["thumb", "web"]) } }));
  });

  it("falls back to the web variant when a property image has no thumbnail", async () => {
    repositories.get(Review).find.mockResolvedValue([{ id: "r1", property_id: "p1", booking_id: "b1" }]);
    repositories.get(Property_Image).find.mockResolvedValue([{ id: "i1", property_id: "p1", sort_order: 0 }]);
    repositories.get(Property_Image_Variant).find.mockResolvedValue([
      { image_id: "i1", variant: "web", s3_key: "images/p1/web" },
    ]);

    const [review] = await new ReviewRepository().findPendingReviews();

    expect(review.property_image_key).toBe("images/p1/web");
  });

  it("skips detail queries when nothing is pending", async () => {
    expect(await new ReviewRepository().findPendingReviews()).toEqual([]);
    for (const entity of [Booking, Property, Property_Location, Property_Image, Property_Image_Variant]) {
      expect(repositories.get(entity).find).not.toHaveBeenCalled();
    }
  });

  it("returns the queue details to approvers without host ids or private feedback", async () => {
    const previous = process.env.PROPERTY_REVIEW_ADMIN_USER_IDS;
    process.env.PROPERTY_REVIEW_ADMIN_USER_IDS = "admin";
    try {
      const repository = {
        hasActiveReviewApproverRole: jest.fn().mockResolvedValue(true),
        findPendingReviews: jest.fn().mockResolvedValue([{ id: "r1", booking_id: "b1", property_id: "p1",
          host_id: "host-1", reviewer_user_id: "guest-1", review_type: "GUEST_TO_PROPERTY", overall_rating: "5.0",
          title: "Great stay!", public_review: "Clean", private_feedback: "secret", status: "PENDING_APPROVAL",
          publication_status: "UNPUBLISHED", verification_status: "VERIFIED", created_at: 1, updated_at: 2,
          property_title: "Riverside Apartment", property_city: "Amsterdam", property_country: "Netherlands",
          property_image_key: "images/p1/thumb", guest_name: "Jessica Smith" }]),
      };

      const [review] = await new ReviewService({ repository }).getPendingReviews("staff", "admin");

      expect(review).toMatchObject({ id: "r1", overall_rating: 5, property_title: "Riverside Apartment",
        property_city: "Amsterdam", property_country: "Netherlands", property_image_key: "images/p1/thumb",
        guest_name: "Jessica Smith" });
      expect(JSON.stringify(review)).not.toMatch(/secret|private_feedback|host_id/);
    } finally {
      if (previous === undefined) delete process.env.PROPERTY_REVIEW_ADMIN_USER_IDS;
      else process.env.PROPERTY_REVIEW_ADMIN_USER_IDS = previous;
    }
  });
});
