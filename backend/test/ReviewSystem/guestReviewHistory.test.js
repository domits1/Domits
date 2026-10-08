jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Review } from "database/models/Review";
import { Property } from "database/models/Property";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Response } from "database/models/Review_Response";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

const id = "12345678-1234-1234-1234-123456789abc", now = 2000;
const event = (query = {}, guestId = "guest-1") => ({ httpMethod: "GET", resource: "/reviews",
  queryStringParameters: { scope: "guest-history", ...query },
  requestContext: { authorizer: { claims: { sub: guestId } } } });

describe("guest history service and authenticated controller", () => {
  let review, repository, service, controller;
  beforeEach(() => {
    review = { id, reviewer_user_id: "guest-1", booking_id: "booking-1", property_id: "property-1",
      property_name: "Guest House", title: "Great stay", overall_rating: 5, public_review: "Lovely property",
      created_at: 1500, updated_at: 1500, status: "DRAFT", publication_status: "UNPUBLISHED",
      verification_status: "UNVERIFIED", categoryRatings: { cleanliness: 5 },
      response: { message: "Thank you!", publishedAt: 1700, authorId: "host-private-id" } };
    repository = { findGuestReviewHistory: jest.fn().mockResolvedValue([review]),
      findReviewById: jest.fn().mockResolvedValue(review), updateEditableReview: jest.fn() };
    service = new ReviewService({ repository, now: () => now, editWindowMs: 1000 });
    controller = new Controller({ service });
  });
  test("uses the authenticated guest and returns only history fields", async () => {
    const result = await controller.manageReviews(event());
    expect(result.statusCode).toBe(200);
    expect(repository.findGuestReviewHistory).toHaveBeenCalledWith("guest-1", { offset: 0 });
    const item = JSON.parse(result.body).reviews[0];
    expect(item).toMatchObject({ property_name: "Guest House", overall_rating: 5, public_review: "Lovely property",
      created_at: 1500, status: "DRAFT", category_ratings: { cleanliness: 5 },
      response: { message: "Thank you!", published_at: 1700 }, can_edit: true });
    for (const key of ["booking_id", "reviewer_user_id", "private_feedback"]) expect(item).not.toHaveProperty(key);
    expect(item.response).not.toHaveProperty("authorId");
  });
  test("denies unauthenticated retrieval before reading data", async () => {
    const result = await controller.manageReviews({ httpMethod: "GET", resource: "/reviews",
      queryStringParameters: { scope: "guest-history" } });
    expect(result.statusCode).toBe(401);
    expect(repository.findGuestReviewHistory).not.toHaveBeenCalled();
  });
  test.each(["PUBLISHED", "DRAFT", "REJECTED"])("preserves status %s", async (status) => {
    review.status = status;
    expect((await service.getGuestReviewHistory("guest-1")).reviews[0].status).toBe(status);
  });
  test("returns ten rows and a continuation offset", async () => {
    repository.findGuestReviewHistory.mockResolvedValue(Array.from({ length: 11 }, (_, index) => ({ ...review, id: `r${index}` })));
    const result = await service.getGuestReviewHistory("guest-1", { offset: "10" });
    expect(result.reviews).toHaveLength(10);
    expect(result.next_offset).toBe(20);
    expect(repository.findGuestReviewHistory).toHaveBeenCalledWith("guest-1", { offset: 10 });
  });
  test("returns an empty history", async () => {
    repository.findGuestReviewHistory.mockResolvedValue([]);
    expect(await service.getGuestReviewHistory("guest-1")).toEqual({ reviews: [], next_offset: null });
  });
  test.each(["-1", "1.5", "", "100001", [], {}])("rejects offset %j", async (offset) => {
    expect((await controller.manageReviews(event({ offset }))).statusCode).toBe(400);
    expect(repository.findGuestReviewHistory).not.toHaveBeenCalled();
  });
  test("rejects client-provided guest identities", async () => {
    expect((await controller.manageReviews(event({ guestId: "guest-2" }))).statusCode).toBe(400);
    expect(repository.findGuestReviewHistory).not.toHaveBeenCalled();
  });
  test("reads expired details without allowing edits", async () => {
    review.created_at = 1000;
    const result = await controller.manageReviews({ ...event(), resource: "/reviews/{id}", pathParameters: { id },
      queryStringParameters: { view: "history" } });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).can_edit).toBe(false);
    await expect(service.updateReview("guest-1", id, { overall_rating: 4, public_review: "Updated", updated_at: 1500 }))
      .rejects.toThrow("editing period");
    expect(repository.updateEditableReview).not.toHaveBeenCalled();
  });
  test("conceals inaccessible details and denies editing another guest's review", async () => {
    repository.findGuestReviewHistory.mockResolvedValue([]);
    await expect(service.getGuestReviewDetail("guest-2", id)).rejects.toThrow("Review not found");
    expect(repository.findGuestReviewHistory).toHaveBeenCalledWith("guest-2", { id });
    await expect(service.updateReview("guest-2", id, {})).rejects.toThrow("own reviews");
    expect(repository.updateEditableReview).not.toHaveBeenCalled();
  });
  test("disables editing without configured policy", async () => {
    service.editWindowMs = 0;
    expect((await service.getGuestReviewHistory("guest-1")).reviews[0])
      .toMatchObject({ can_edit: false, edit_expires_at: null });
  });
  test("rejects invalid detail IDs and query modes", async () => {
    await expect(service.getGuestReviewDetail("guest-1", "bad")).rejects.toThrow("valid review ID");
    expect((await controller.manageReviews({ ...event(), resource: "/reviews/{id}", pathParameters: { id },
      queryStringParameters: { view: "other" } })).statusCode).toBe(400);
    expect(repository.findGuestReviewHistory).not.toHaveBeenCalled();
  });
});

describe("guest history repository query", () => {
  test.each([undefined, id])("scopes list/detail %s to the guest and enriches owned history", async (reviewId) => {
    const database = new DataSource({ type: "postgres", schema: "main", entities: [Review, Property] });
    await database.buildMetadatas();
    const query = database.getRepository(Review).createQueryBuilder("review");
    jest.spyOn(query, "getMany").mockResolvedValue([{ id, property_id: "p1", status: "REJECTED" }]);
    const responses = { find: jest.fn().mockResolvedValue([{ reviewId: id, message: "Public reply" }]) };
    jest.spyOn(database, "getRepository").mockImplementation((entity) => {
      if (entity === Review) return { createQueryBuilder: () => query };
      if (entity === Property) return { find: async () => [{ id: "p1", title: "Guest House" }] };
      if (entity === Review_Response) return responses;
      if (entity === Review_Rating) return { find: async () => [{ reviewId: id, category: "cleanliness", rating: 5 }] };
      throw new Error("Unexpected entity");
    });
    Database.getInstance.mockResolvedValue(database);
    const result = await new ReviewRepository().findGuestReviewHistory("guest-1", { id: reviewId });
    expect(query.getParameters()).toMatchObject({ guestId: "guest-1", reviewType: "GUEST_TO_PROPERTY" });
    const sql = query.getQuery();
    expect(sql).toContain('"review"."reviewer_user_id" = :guestId');
    expect(sql).not.toContain(":status");
    expect(sql).toContain('ORDER BY "review_created_at" DESC, "review_id" DESC');
    expect(query.expressionMap.limit).toBe(reviewId === undefined ? 11 : 1);
    if (reviewId) expect(query.getParameters().id).toBe(id);
    expect(result[0]).toMatchObject({ property_name: "Guest House", status: "REJECTED", categoryRatings: { cleanliness: 5 } });
    expect(responses.find.mock.calls[0][0].where).toMatchObject({ status: "published", deletedAt: expect.anything() });
  });
});
