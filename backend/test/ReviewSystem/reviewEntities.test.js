import { CreateReviewCategories20261005 } from "../../ORM/migrations/20261005_create_review_categories.js";
// Mock database access; metadata and SQL generation below use TypeORM without a live connection.
jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));

import { DataSource, In, IsNull, Not } from "typeorm";
import Database from "database";
import { Review } from "../../ORM/models/Review.js";
import { Booking } from "../../ORM/models/Booking.js";
import { Review_Rating } from "../../ORM/models/Review_Rating.js";
import { Review_Category } from "../../ORM/models/Review_Category.js";
import { Review_Request } from "../../ORM/models/Review_Request.js";
import { Review_Response } from "../../ORM/models/Review_Response.js";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { CreateReviews20260930 } from "../../ORM/migrations/20260930_create_reviews.js";

let repositories;
let dataSource;
let repository;
// Give each test fresh repositories and a transaction stub so calls cannot leak between tests.
beforeEach(() => {
  repositories = new Map([Review, Booking, Review_Rating, Review_Category, Review_Request, Review_Response]
    .map((entity) => [entity, { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (record) => record), update: jest.fn().mockResolvedValue({ affected: 1 }) }]));
  const requestInsert = { insert: jest.fn().mockReturnThis(), values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(), execute: jest.fn() };
  repositories.get(Review_Request).createQueryBuilder = jest.fn(() => requestInsert);
  dataSource = { getRepository: jest.fn((entity) => repositories.get(entity)),
    transaction: jest.fn(async (callback) => callback(dataSource)) };
  Database.getInstance.mockResolvedValue(dataSource);
  repository = new ReviewRepository();
});

// Entity contract: verify persisted column names, types, defaults and numeric conversions.
it("builds PostgreSQL metadata and SQL for the established review contract without connecting", async () => {
  const source = new DataSource({ type: "postgres", schema: "main", synchronize: false,
    entities: [Review, Review_Rating, Review_Category, Review_Request, Review_Response] });
  await source.buildMetadatas();
  const metadata = source.getMetadata(Review);
  expect(metadata.tablePath).toBe("main.review");
  expect(metadata.columns.map((column) => column.databaseName)).toEqual([
    "id", "booking_id", "property_id", "host_id", "reviewer_user_id", "reviewee_user_id", "review_type",
    "overall_rating", "title", "public_review", "private_feedback", "verification_status", "publication_status",
    "status", "created_at", "updated_at",
  ]);
  expect(metadata.findColumnWithPropertyName("id")).toMatchObject({ type: "varchar", isGenerated: false });
  expect(metadata.findColumnWithPropertyName("overall_rating")).toMatchObject({ type: "numeric", precision: 2, scale: 1 });
  expect(metadata.findColumnWithPropertyName("title")).toMatchObject({ isNullable: false });
  expect(metadata.findColumnWithPropertyName("public_review")).toMatchObject({ isNullable: false });
  expect(metadata.findColumnWithPropertyName("reviewee_user_id")).toMatchObject({ isNullable: true });
  expect(metadata.findColumnWithPropertyName("status").default).toBe("DRAFT");
  expect(metadata.findColumnWithPropertyName("publication_status").default).toBe("UNPUBLISHED");
  expect(metadata.findColumnWithPropertyName("verification_status").default).toBe("UNVERIFIED");
  const sql = source.getRepository(Review).createQueryBuilder().insert().values({
    id: "review-legacy", booking_id: "booking-1", reviewer_user_id: "guest-1", review_type: "GUEST_TO_PROPERTY",
    title: "Stay", public_review: "Good", overall_rating: 5,
  }).getSql();
  expect(sql).toContain('INSERT INTO "main"."review"');
  expect(sql).not.toMatch(/reservation_id|guest_id/);
  expect(Review.options.columns.created_at.transformer.from("1790000000000")).toBe(1790000000000);
  expect(Review.options.columns.overall_rating.transformer.from("4.5")).toBe(4.5);
});

// Reminder fields: preserve nullable timestamps/counts and map camelCase writes to live columns.
it("maps live nullable reminder columns and generates request SQL without connecting", async () => {
  const source = new DataSource({ type: "postgres", schema: "main", synchronize: false, entities: [Review_Request] });
  await source.buildMetadatas();
  const metadata = source.getMetadata(Review_Request);
  for (const [property, column, type] of [
    ["lastSentAt", "last_sent_at", "bigint"],
    ["nextSendAt", "next_send_at", "bigint"],
    ["claimedAt", "claimed_at", "bigint"],
    ["sendCount", "send_count", "int"],
  ]) {
    const mapped = metadata.findColumnWithPropertyName(property);
    expect(mapped).toMatchObject({ databaseName: column, type, isNullable: true });
    expect(mapped.default).toBeUndefined();
    if (type === "bigint") {
      expect(mapped.transformer.from("1790000000000")).toBe(1790000000000);
      expect(mapped.transformer.from(null)).toBeNull();
      expect(mapped.transformer.to(null)).toBeNull();
      expect(mapped.transformer.to(1790000000000)).toBe(1790000000000);
    }
  }
  const [sql, parameters] = source.getRepository(Review_Request).createQueryBuilder().update().set({
    lastSentAt: 1790000000000, nextSendAt: 1790000060000, claimedAt: null, sendCount: 0,
  }).where("id = :id", { id: "request-1" }).getQueryAndParameters();
  expect(sql).toContain('UPDATE "main"."review_request"');
  for (const column of ["last_sent_at", "next_send_at", "claimed_at", "send_count"]) {
    expect(sql).toContain(`"${column}" =`);
  }
  expect(parameters).toEqual([1790000000000, 1790000060000, null, 0, "request-1"]);
});

// Repository reads: use Booking.id, the complete duplicate key and type-scoped active categories.
it("looks up Booking.id and the complete review uniqueness key", async () => {
  await repository.findBookingById("booking-1");
  expect(repositories.get(Booking).findOne).toHaveBeenCalledWith({ where: { id: "booking-1" } });
  const key = { booking_id: "booking-1", review_type: "GUEST_TO_PROPERTY", reviewer_user_id: "guest-1" };
  await repository.findReviewByBookingTypeAndReviewer(key);
  expect(repositories.get(Review).findOne).toHaveBeenCalledWith({ where: key, select: ["id"] });
});

it("loads active categories by review type", async () => {
  repositories.get(Review_Category).find.mockResolvedValue([{ key: "cleanliness" }]);
  expect(await repository.findActiveCategoryKeys("GUEST_TO_PROPERTY")).toEqual(new Set(["cleanliness"]));
  expect(repositories.get(Review_Category).find).toHaveBeenCalledWith({
    where: { reviewType: "GUEST_TO_PROPERTY", isActive: true }, select: ["key"],
  });
});

// Deletion: enforce reviewer ownership, retain related records and hide rejected reviews on reload.
it("soft deletes only the author while retaining supporting records", async () => {
  await repository.deleteOwnReview("legacy-review", "guest-1", 123);
  expect(repositories.get(Review).update).toHaveBeenCalledWith({ id: "legacy-review", reviewer_user_id: "guest-1" }, {
    status: "REJECTED", publication_status: "REJECTED", updated_at: 123,
  });
  for (const entity of [Review_Rating, Review_Request, Review_Response]) {
    expect(repositories.get(entity).update).not.toHaveBeenCalled();
  }
});

it("keeps soft-deleted reviews out of dashboard lists after reloading", async () => {
  await repository.findReviews({ reviewer_user_id: "guest-1" });
  expect(repositories.get(Review).find.mock.calls[0][0].where).toEqual({
    reviewer_user_id: "guest-1", status: Not("REJECTED"),
  });
});

// Creation: verify the repository groups related writes and leaves existing requests untouched.
it("persists review, category ratings and draft request in one transaction", async () => {
  const record = { id: "r1", booking_id: "b1", property_id: "p1", host_id: "h1", reviewer_user_id: "g1",
    review_type: "GUEST_TO_PROPERTY", created_at: 123, updated_at: 123, private_feedback: "Host only" };
  expect(await repository.create(record, { cleanliness: 4.5 })).toEqual(record);
  expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  expect(repositories.get(Review).save).toHaveBeenCalledWith(record);
  expect(repositories.get(Review_Rating).save).toHaveBeenCalledWith([expect.objectContaining({
    reviewId: "r1", category: "cleanliness", rating: 4.5,
  })]);
  const requestInsert = repositories.get(Review_Request).createQueryBuilder.mock.results[0].value;
  expect(requestInsert.values).toHaveBeenCalledWith(expect.objectContaining({
    bookingId: "b1", reviewType: "GUEST_TO_PROPERTY", guestId: "g1", status: "OPEN", completedAt: null,
  }));
  // Do not overwrite existing request IDs, completion status or timing fields.
  expect(requestInsert.orIgnore).toHaveBeenCalledTimes(1);
});

// Public output: check scores, filtering and published responses while excluding private data.
it("returns public ratings, averages and published responses without private fields", async () => {
  repositories.get(Review).find.mockResolvedValue([
    { id: "r1", overall_rating: 5, public_review: "Good", title: "Stay", created_at: 1,
      status: "PUBLISHED", verification_status: "VERIFIED_STAY", private_feedback: "secret", reviewer_user_id: "private" },
    { id: "r2", overall_rating: 3, public_review: "Okay", title: "Stay", created_at: 2, status: "PUBLISHED" },
  ]);
  repositories.get(Review_Rating).find.mockResolvedValue([
    { reviewId: "r1", category: "cleanliness", rating: "5.0" },
    { reviewId: "r2", category: "cleanliness", rating: "3.0" },
  ]);
  repositories.get(Review_Response).find.mockResolvedValue([
    { id: "response1", reviewId: "r1", status: "published", authorRole: "host", message: "Thanks", publishedAt: 5 },
    { id: "response2", reviewId: "r2", status: "draft", message: "Hidden" },
  ]);
  const result = await repository.findPublicPropertyReviews("p1", { sort: "highest" });
  expect(repositories.get(Review).find.mock.calls[0][0].where).toEqual({ property_id: "p1",
    review_type: "GUEST_TO_PROPERTY", status: "PUBLISHED", publication_status: "PUBLISHED" });
  expect(repositories.get(Review).find.mock.calls[0][0].select).not.toContain("private_feedback");
  expect(repositories.get(Review_Response).find).toHaveBeenCalledWith({ where: {
    reviewId: In(["r1", "r2"]), status: "published", deletedAt: IsNull(),
  } });
  expect(result).toMatchObject({ totalReviews: 2, overallRating: 4, categoryRatings: { cleanliness: 4 } });
  expect(result.reviews.map((review) => review.id)).toEqual(["r1", "r2"]);
  expect(result.reviews[0].response).toMatchObject({ message: "Thanks" });
  expect(result.reviews[1].response).toBeNull();
  expect(JSON.stringify(result)).not.toMatch(/secret|private_feedback|reviewer_user_id|Hidden/);
  expect((await repository.findPublicPropertyReviews("p1", { verifiedOnly: true })).totalReviews).toBe(1);
  expect((await repository.findPublicPropertyReviews("p1", { category: "missing" })).totalReviews).toBe(0);
  expect((await repository.findPublicPropertyReviews("p1", { sort: "lowest" })).reviews[0].id).toBe("r2");
});

it("returns empty public aggregates without querying child tables", async () => {
  expect(await repository.findPublicPropertyReviews("p1")).toEqual({ reviews: [], totalReviews: 0,
    overallRating: null, categoryRatings: {} });
  expect(repositories.get(Review_Rating).find).not.toHaveBeenCalled();
});

// Migration safety: a mocked runner must receive no SQL from either retired migration method.
it("keeps both directions of the retired migration inert", async () => {
  const runner = { query: jest.fn() };
  await new CreateReviews20260930().up(runner);
  await new CreateReviews20260930().down(runner);
  await new CreateReviewCategories20261005().up(runner);
  await new CreateReviewCategories20261005().down(runner);
  expect(runner.query).not.toHaveBeenCalled();
});
