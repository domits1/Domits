import { DataSource } from "typeorm";
import { Review } from "database/models/Review";
import { Review_Response } from "database/models/Review_Response";
jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { Property } from "database/models/Property";
import { Booking } from "database/models/Booking";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

describe("public review retrieval", () => {
  let query, controller, property, summary, reviews;
  const request = (query = {}) => ({ pathParameters: { propertyId: "p1" }, queryStringParameters: query });
  beforeEach(() => {
    property = { id: "p1" };
    summary = { score: "4", count: "11" };
    reviews = [{ id: "r1", overall_rating: 4, public_review: "Good stay", created_at: 1000,
      private_feedback: "secret", reviewer_user_id: "private" }];
    query = { getRawOne: jest.fn(async () => summary), getMany: jest.fn(async () => reviews),
      getRawMany: jest.fn(async () => [{ review_id: "r1", key: "comfort", label: "Comfort", rating: "4.5" }]) };
    for (const method of ["where", "andWhere", "innerJoin", "select", "addSelect", "orderBy", "addOrderBy", "offset", "limit"]) {
      query[method] = jest.fn(() => query);
    }
    Database.getInstance.mockResolvedValue({ getRepository: (entity) => entity === Property
      ? { findOne: async () => property } : entity === Review_Response
      ? { find: async () => [{ reviewId: "r1", message: "Thanks", publishedAt: 2000 }] } : { createQueryBuilder: () => query } });
    controller = new Controller({ service: new ReviewService({ repository: new ReviewRepository(), now: () => 2000 }) });
  });
  test("anonymous response uses the path property and excludes private fields", async () => {
    const result = await controller.getPublicReviews(request());
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ property_id: "p1", overall_score: 4, review_count: 11,
      next_offset: 10, next_cursor: null, reviews: [{ id: "r1", rating: 4, text: "Good stay", date: 1000, verified: true, response: { message: "Thanks", publishedAt: 2000 },
        categories: [{ key: "comfort", label: "Comfort", rating: 4.5 }] }] });
    expect(query.where).toHaveBeenCalledWith("review.property_id = :propertyId", { propertyId: "p1" });
    expect(query.andWhere).toHaveBeenCalledWith("review.publication_status = :publicationStatus", { publicationStatus: "PUBLISHED" });
    expect(query.andWhere).toHaveBeenCalledWith("review.verification_status = :verificationStatus", { verificationStatus: "VERIFIED" });
    expect(query.select).toHaveBeenCalledWith(["review.id", "review.overall_rating", "review.public_review", "review.created_at"]);
    expect(query.orderBy).toHaveBeenCalledWith("review.created_at", "DESC");
    expect(query.limit).toHaveBeenCalledWith(11);
    expect(query.andWhere).toHaveBeenCalledWith("review.status = :status", { status: "PUBLISHED" });
    expect(query.andWhere).toHaveBeenCalledWith("review.review_type = :reviewType", { reviewType: "GUEST_TO_PROPERTY" });
  });
  test.each(["-1", "1.5", "", "100001", [], {}])("rejects invalid offset %j", async (offset) => {
    expect((await controller.getPublicReviews(request({ offset }))).statusCode).toBe(400);
    expect(query.getMany).not.toHaveBeenCalled();
  });
  test("rejects a missing property ID", async () => {
    expect((await controller.getPublicReviews({})).statusCode).toBe(400);
  });
  test.each([{ minRating: "0" }, { maxRating: "6" }, { minRating: "4.5" },
    { minRating: "5", maxRating: "2" }, { verified: "yes" }, { sort: "unknown" },
    { startDate: "2026-02-30" }, { startDate: "bad" }, { minRating: [] },
    { startDate: "2026-02-01", endDate: "2026-01-01" }, { propertyId: "spoofed" }])(
    "rejects invalid filters %j before querying", async (filters) => {
      expect((await controller.getPublicReviews(request(filters))).statusCode).toBe(400);
      expect(query.getMany).not.toHaveBeenCalled();
    });
  test.each([{ minRating: "4" }, { maxRating: "2" }, { verified: "true" },
    { verified: "false" }, { startDate: "2026-01-01" }, { endDate: "2026-01-31" }, { sort: "lowest" }])(
    "accepts individual filters %j", async (filters) => {
      expect((await controller.getPublicReviews(request(filters))).statusCode).toBe(200);
    });
  test("combines filters for the summary and page with inclusive UTC dates", async () => {
    const result = await controller.getPublicReviews(request({ minRating: "4", maxRating: "5", verified: "true",
      startDate: "2026-01-01", endDate: "2026-01-31", sort: "highest", offset: "10" }));
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({ review_count: 11, next_offset: null });
    expect(query.andWhere.mock.calls.filter(([sql]) => sql.includes(":filterMinimum"))).toHaveLength(2);
    expect(query.andWhere).toHaveBeenCalledWith("review.overall_rating BETWEEN :filterMinimum AND :filterMaximum",
      { filterMinimum: 4, filterMaximum: 5 });
    expect(query.andWhere).toHaveBeenCalledWith("review.created_at >= :filterStart",
      { filterStart: Date.parse("2026-01-01T00:00:00.000Z") });
    expect(query.andWhere).toHaveBeenCalledWith("review.created_at < :filterEnd",
      { filterEnd: Date.parse("2026-02-01T00:00:00.000Z") });
    expect(query.orderBy).toHaveBeenCalledWith("review.overall_rating", "DESC");
    expect(query.offset).toHaveBeenCalledWith(10);
  });
  test("handles an empty property and skips category queries", async () => {
    summary = { score: null, count: "0" };
    reviews = [];
    const result = JSON.parse((await controller.getPublicReviews(request({ minRating: "5" }))).body);
    expect(result).toEqual({ property_id: "p1", overall_score: null, review_count: 0, next_offset: null, next_cursor: null, reviews: [] });
    expect(query.getRawMany).not.toHaveBeenCalled();
  });
  test("rejects unavailable properties without retrieving review data", async () => {
    property = null;
    expect((await controller.getPublicReviews(request())).statusCode).toBe(404);
    expect(query.getMany).not.toHaveBeenCalled();
  });
  test("checks reservation evidence before counts and paging without exposing booking data", async () => {
    const result = await controller.getPublicReviews(request({ minRating: "4", sort: "recent", verified: "true" }));
    expect(result.statusCode).toBe(200);
    expect(query.innerJoin).toHaveBeenCalledWith(Booking, "stay",
      "stay.id = review.booking_id AND stay.guestid = review.reviewer_user_id AND stay.property_id = review.property_id");
    expect(query.andWhere).toHaveBeenCalledWith("LOWER(TRIM(stay.status)) IN (:...stayStatuses)",
      { stayStatuses: ["paid", "confirmed"] });
    expect(query.andWhere.mock.calls.filter(([sql]) => sql.includes(":stayNow"))).toHaveLength(2);
    expect(query.andWhere).toHaveBeenCalledWith("stay.departuredate > 0 AND stay.departuredate <= :stayNow", { stayNow: 2000 });
    const review = JSON.parse(result.body).reviews[0];
    expect(review.verified).toBe(true);
    for (const key of ["booking_id", "reviewer_user_id", "private_feedback", "guestname", "paymentid"]) {
      expect(review).not.toHaveProperty(key);
    }
  });
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  test("returns ten newest reviews and the final visible date/ID as the cursor", async () => {
    reviews = Array.from({ length: 11 }, (_, index) => ({ id: `r${String(11 - index).padStart(2, "0")}`,
      overall_rating: 4, public_review: "Stay", created_at: 1000 }));
    const body = JSON.parse((await controller.getPublicReviews(request({ sort: "recent" }))).body);
    expect(body.reviews).toHaveLength(10);
    expect(body.reviews.map((review) => review.id)).toEqual(reviews.slice(0, 10).map((review) => review.id));
    expect(JSON.parse(Buffer.from(body.next_cursor, "base64url").toString())).toEqual({ propertyId: "p1", date: 1000, id: "r02" });
    expect(query.addOrderBy).toHaveBeenCalledWith("review.id", "DESC");
    expect(query.limit).toHaveBeenCalledWith(11);
  });
  test("uses the cursor only for the page while retaining property/public filters", async () => {
    const body = JSON.parse((await controller.getPublicReviews(request({
      cursor: encode({ propertyId: "p1", date: 1000, id: "r02" }), minRating: "4",
    }))).body);
    expect(body.next_offset).toBeNull();
    expect(query.andWhere).toHaveBeenCalledWith(
      "(review.created_at < :cursorDate OR (review.created_at = :cursorDate AND review.id < :cursorId))",
      { cursorDate: 1000, cursorId: "r02" });
    expect(query.andWhere.mock.calls.filter(([sql]) => sql.includes(":cursorDate"))).toHaveLength(1);
    expect(query.where).toHaveBeenCalledWith("review.property_id = :propertyId", { propertyId: "p1" });
    expect(query.andWhere).toHaveBeenCalledWith("review.status = :status", { status: "PUBLISHED" });
    expect(query.offset).toHaveBeenCalledWith(0);
  });
  test.each(["invalid", encode(null), encode({ propertyId: "p2", date: 1000, id: "r1" }),
    encode({ propertyId: "p1", date: -1, id: "r1" }), encode({ propertyId: "p1", date: 1000, id: "" }),
    encode({ propertyId: "p1", date: "1000", id: "r1" }), "a".repeat(2049)])("rejects invalid cursor %j", async (cursor) => {
    expect((await controller.getPublicReviews(request({ cursor }))).statusCode).toBe(400);
    expect(query.getMany).not.toHaveBeenCalled();
  });
  test.each([{ sort: "highest" }, { offset: "10" }])("rejects mixed pagination %j", async (options) => {
    expect((await controller.getPublicReviews(request({ ...options,
      cursor: encode({ propertyId: "p1", date: 1000, id: "r1" }),
    }))).statusCode).toBe(400);
    expect(query.getMany).not.toHaveBeenCalled();
  });
});


test("keeps review publication and property visibility parameters independent in generated SQL", async () => {
  const database = new DataSource({ type: "postgres", schema: "main", entities: [Property, Review, Booking] });
  await database.buildMetadatas();
  const query = database.getRepository(Review).createQueryBuilder("review");
  jest.spyOn(query, "getRawOne").mockResolvedValue({ score: null, count: "0" });
  jest.spyOn(query, "getMany").mockResolvedValue([]);
  jest.spyOn(database, "getRepository").mockImplementation((entity) => entity === Property
    ? { findOne: async () => ({ id: "p1" }) } : { createQueryBuilder: () => query });
  Database.getInstance.mockResolvedValue(database);
  await new ReviewRepository().getPublicReviewPage("p1", 0, { minRating: 4, maxRating: 5, start: 1000, endExclusive: 2000,
    cursor: { date: 1500, id: "r2" } });
  expect(query.getParameters()).toMatchObject({ status: "PUBLISHED", propertyStatus: "ACTIVE",
    verificationStatus: "VERIFIED", publicationStatus: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY",
    propertyId: "p1", filterMinimum: 4, filterMaximum: 5, filterStart: 1000, filterEnd: 2000 });
  expect(query.getQuery()).toContain(">= :filterStart");
  expect(query.getQuery()).toContain("< :filterEnd");
  expect(query.getParameters()).toMatchObject({ cursorDate: 1500, cursorId: "r2" });
  expect(query.getQuery()).toContain("< :cursorId");
  expect(query.getQueryAndParameters()[1]).toEqual(expect.arrayContaining(["PUBLISHED", "ACTIVE", "GUEST_TO_PROPERTY"]));
});
