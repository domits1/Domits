jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Booking } from "database/models/Booking";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Response } from "database/models/Review_Response";
import { Team_Member } from "database/models/Team_Member";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";

const type = "GUEST_TO_RESERVATION";
const id = "12345678-1234-1234-1234-123456789abc";
const event = (query, claims = { sub: "guest" }) => ({
  httpMethod: "GET", resource: "/reviews", queryStringParameters: query,
  requestContext: { authorizer: { claims } },
});
const guestQuery = { scope: "guest-history", review_type: type };
const managerQuery = { scope: "reservation-history", propertyId: "property" };
const managerClaims = { sub: "manager-sub", "cognito:username": "manager" };
const review = {
  id, booking_id: "booking", review_type: type, reviewer_user_id: "guest", host_id: "host",
  property_id: "property", status: "PUBLISHED", publication_status: "PUBLISHED",
  overall_rating: 4, public_review: "Helpful booking updates", created_at: 200, updated_at: 201,
  private_feedback: "hidden", domits_private_feedback: "hidden",
  reservation: { id: "booking", arrivaldate: 100, departuredate: 150, status: "Paid", guestname: "hidden", paymentid: "hidden" },
};
const context = { review_type: type, booking_id: "booking",
  reservation: { arrival_at: 100, departure_at: 150, status: "Paid" } };

describe("reservation review history API", () => {
  let repository, controller;
  beforeEach(() => {
    repository = {
      findGuestReviewHistory: jest.fn().mockResolvedValue([review]),
      findManagedReservationHistory: jest.fn().mockResolvedValue([review]),
    };
    controller = new Controller({ service: new ReviewService({ repository, now: () => 300 }) });
  });

  test("uses authenticated guest identity and filters an owned history page", async () => {
    repository.findGuestReviewHistory.mockResolvedValue(Array(11).fill(review));
    const response = await controller.getReviews(event({ ...guestQuery, offset: "10" }));
    expect(response.statusCode).toBe(200);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(repository.findGuestReviewHistory).toHaveBeenCalledWith("guest", { offset: 10, reviewType: type });
    const body = JSON.parse(response.body);
    expect(body.next_offset).toBe(20);
    expect(body.reviews).toHaveLength(10);
    expect(body.reviews[0]).toMatchObject(context);
    expect(body.reviews[0].reservation).toEqual(context.reservation);
    for (const key of ["private_feedback", "domits_private_feedback", "reviewer_user_id", "host_id"]) {
      expect(body.reviews[0]).not.toHaveProperty(key);
    }
  });

  test("requires ownership for detail and retains a review when booking context is unavailable", async () => {
    const detail = { ...event({ view: "history", review_type: type }), pathParameters: { id } };
    repository.findGuestReviewHistory.mockResolvedValueOnce([{ ...review, status: "REJECTED", reservation: null }]);
    const owned = await controller.getReviewById(detail);
    expect(owned.statusCode).toBe(200);
    expect(JSON.parse(owned.body)).toMatchObject({ booking_id: "booking", status: "REJECTED", reservation: null });
    repository.findGuestReviewHistory.mockResolvedValueOnce([]);
    const other = { ...detail, requestContext: event({}, { sub: "other" }).requestContext };
    expect((await controller.getReviewById(other)).statusCode).toBe(404);
    expect(repository.findGuestReviewHistory).toHaveBeenLastCalledWith("other", { id, reviewType: type });
  });

  test.each([{ review_type: "GUEST_TO_HOST" }, { guestId: "other" }, { offset: "-1" }])(
    "rejects invalid or untrusted guest filters %j", async (filters) => {
      expect((await controller.getReviews(event({ ...guestQuery, ...filters }))).statusCode).toBe(400);
      expect(repository.findGuestReviewHistory).not.toHaveBeenCalled();
    }
  );

  test("uses the verified staff identity and requested property for read-only history", async () => {
    const response = await controller.getReviews(event({ ...managerQuery, review_type: type, offset: "10" }, managerClaims));
    expect(response.statusCode).toBe(200);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(JSON.parse(response.body)).toMatchObject({ reviews: [{ ...context, can_edit: false }], next_offset: null });
    expect(repository.findManagedReservationHistory).toHaveBeenCalledWith("manager", "property", { offset: 10, now: 300 });
  });

  test("denies missing credentials or username and conceals unrelated properties", async () => {
    expect((await controller.getReviews(event(managerQuery, {}))).statusCode).toBe(401);
    expect((await controller.getReviews(event(managerQuery))).statusCode).toBe(403);
    expect((await controller.getReviews(event({ ...managerQuery, username: "manager" }, managerClaims))).statusCode).toBe(400);
    expect(repository.findManagedReservationHistory).not.toHaveBeenCalled();
    repository.findManagedReservationHistory.mockResolvedValueOnce([]);
    const response = await controller.getReviews(event(managerQuery, { ...managerClaims, "cognito:username": "unrelated" }));
    expect(JSON.parse(response.body)).toEqual({ reviews: [], next_offset: null });
  });
});

describe("reservation history SQL", () => {
  let database, query, repository;
  beforeEach(async () => {
    database = new DataSource({ type: "postgres", schema: "main", entities: [Review, Booking, Property, Team_Member] });
    await database.buildMetadatas();
    query = database.getRepository(Review).createQueryBuilder("review");
    jest.spyOn(database, "getRepository").mockImplementation((entity) => {
      if (entity === Review) return { createQueryBuilder: () => query };
      if ([Property, Review_Rating, Review_Response].includes(entity)) return { find: async () => [] };
      throw new Error("Unexpected entity");
    });
    Database.getInstance.mockResolvedValue(database);
    repository = new ReviewRepository();
  });

  test.each([true, false])("selects only matching booking context and hydrates it (%s)", async (hasBooking) => {
    jest.spyOn(query, "loadRawResults").mockResolvedValue([{
      review_id: id, review_booking_id: "booking", review_property_id: "property", review_review_type: type,
      stay_id: hasBooking ? "booking" : null, stay_arrivaldate: hasBooking ? "100" : null,
      stay_departuredate: hasBooking ? "150" : null, stay_status: hasBooking ? "Paid" : null,
    }]);
    const [row] = await repository.findGuestReviewHistory("guest", { reviewType: type, offset: 10 });
    expect(row.reservation).toEqual(hasBooking ? {
      id: "booking", arrivaldate: 100, departuredate: 150, status: "Paid",
    } : null);
    expect(query.getParameters()).toMatchObject({ guestId: "guest", reviewType: type, deletedStatus: "DELETED" });
    const sql = query.getQuery();
    expect(sql).toContain('LEFT JOIN "main"."booking"');
    expect(sql).toContain('"stay"."guestid" = "review"."reviewer_user_id"');
    expect(sql).toContain('"stay"."property_id" = "review"."property_id"');
    expect(sql).toContain('"stay"."hostid" = "review"."host_id"');
    expect(sql).not.toMatch(/guestname|paymentid|private_feedback/);
    expect(sql).toContain('ORDER BY "review_created_at" DESC, "review_id" DESC LIMIT 11 OFFSET 10');
  });

  test("applies property, team role, booking and publication eligibility before paging", async () => {
    jest.spyOn(query, "getMany").mockResolvedValue([]);
    expect(await repository.findManagedReservationHistory("manager", "property", { offset: 10, now: 300 })).toEqual([]);
    expect(query.getParameters()).toMatchObject({ username: "manager", propertyId: "property", reviewType: type,
      active: "active", role: "Property Operations Manager", status: "PUBLISHED", publicationStatus: "PUBLISHED",
      verified: "VERIFIED_STAY", stayStatuses: ["paid", "confirmed"], stayNow: 300 });
    const sql = query.getQuery();
    expect(sql).toContain('SELECT DISTINCT');
    expect(sql).toContain('"member"."host_id" = "property"."hostid"');
    expect(sql).toContain('"member"."member_user_id" = :username');
    expect(sql).toContain('"member"."status" = :active AND "member"."role" = :role');
    expect(sql).toContain('("property"."hostid" = :username OR "member"."id" IS NOT NULL)');
    expect(sql).toContain('"property"."hostid" = "review"."host_id"');
    expect(sql).toContain('INNER JOIN "main"."booking"');
    expect(sql).toContain('"stay"."departuredate" <= :stayNow');
    expect(sql).toContain('LIMIT 11 OFFSET 10');
  });
});
