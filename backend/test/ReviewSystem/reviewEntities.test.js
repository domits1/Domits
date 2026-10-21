import { CreateReviewCategories20261005 } from "../../ORM/migrations/20261005_create_review_categories.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Property } from "../../ORM/models/Property.js";
// Mock database access; metadata and SQL generation below use TypeORM without a live connection.
jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));

import { DataSource, In, IsNull, Not } from "typeorm";
import Database from "database";
import { Review } from "../../ORM/models/Review.js";
import { Booking } from "../../ORM/models/Booking.js";
import { Review_Rating } from "../../ORM/models/Review_Rating.js";
import { Review_Category } from "../../ORM/models/Review_Category.js";
import { Review_Request } from "../../ORM/models/Review_Request.js";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { Review_Response } from "../../ORM/models/Review_Response.js";
import { CreateReviewResponse20261014 } from "../../ORM/migrations/20261014_create_review_response.js";
import { assertReviewResponseSchema } from "../../functions/ReviewSystem/util/assertReviewResponseSchema.js";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

describe("ReviewSystem runtime and deployment preflight", () => {
  it("loads the real handler and shared ORM in a fresh Node process without database mocks", () => {
    const handlerUrl = pathToFileURL(require.resolve("../../functions/ReviewSystem/index.js")).href;
    const tablesUrl = pathToFileURL(require.resolve("../../ORM/util/database/Tables.js")).href;
    const script = `
      const { handler } = await import(${JSON.stringify(handlerUrl)});
      const { Tables } = await import(${JSON.stringify(tablesUrl)});
      const names = Tables.map((table) => table.options.name);
      for (const name of ["Review_Response", "DirectBookingWebsiteRatePlan"]) {
        if (!names.includes(name)) throw new Error("Missing entity: " + name);
      }
      const response = await handler({ httpMethod: "GET", resource: "/reviews" });
      if (response.statusCode !== 401) throw new Error("Unexpected unauthenticated response");
      console.log("Runtime import passed");
    `;
    expect(execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
      encoding: "utf8", timeout: 20000,
    })).toContain("Runtime import passed");
  });

  const columns = [
    ["id", "character varying", "NO"], ["review_id", "character varying", "NO"],
    ["author_id", "character varying", "NO"], ["author_role", "character varying", "NO"],
    ["status", "character varying", "NO"], ["message", "text", "NO"],
    ["created_at", "bigint", "NO"], ["updated_at", "bigint", "NO"],
    ["published_at", "bigint", "YES"], ["deleted_at", "bigint", "YES"],
  ].map(([column_name, data_type, is_nullable]) => ({ column_name, data_type, is_nullable }));

  it("accepts a compatible response table using a read-only parameterized query", async () => {
    const source = { query: jest.fn().mockResolvedValue(columns) };
    await expect(assertReviewResponseSchema(source, "main")).resolves.toBeUndefined();
    expect(source.query).toHaveBeenCalledWith(expect.stringMatching(/^SELECT /), ["main", "review_response"]);
  });

  it.each([[], columns.slice(1), columns.map((column) => column.column_name === "review_id"
    ? { ...column, data_type: "uuid" } : column), columns.map((column) => column.column_name === "message"
    ? { ...column, is_nullable: "YES" } : column)].map((actual) => ({ actual })))("blocks deployment for a missing or incompatible response schema", async ({ actual }) => {
    await expect(assertReviewResponseSchema({ query: async () => actual }, "main")).rejects.toThrow("deployment blocked");
  });
});

describe('Review entities and creation persistence', () => {
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

  // Entity contract: verify persisted column names, types, defaults and numeric conversions!!
  it("builds PostgreSQL metadata and SQL for the established review contract without connecting", async () => {
    const source = new DataSource({ type: "postgres", schema: "main", synchronize: false,
      entities: [Review, Review_Rating, Review_Category, Review_Request] });
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

  it("retries the complete transaction after a serialization conflict", async () => {
    const conflict = Object.assign(new Error("Serialization conflict"), {
      driverError: { code: "40001" },
    });
    repositories.get(Review_Rating).save.mockRejectedValueOnce(conflict);
    const record = {
      id: "retry-review", booking_id: "booking-1", property_id: "property-1",
      host_id: "host-1", reviewer_user_id: "guest-1", review_type: "GUEST_TO_PROPERTY",
      created_at: 123, updated_at: 123,
    };

    await expect(repository.create(record, { cleanliness: 4 })).resolves.toEqual(record);

    expect(dataSource.transaction).toHaveBeenCalledTimes(2);
    expect(repositories.get(Review).save).toHaveBeenCalledTimes(2);
    expect(repositories.get(Review_Rating).save).toHaveBeenCalledTimes(2);
    const requestInsert = repositories.get(Review_Request).createQueryBuilder.mock.results[0].value;
    expect(requestInsert.execute).toHaveBeenCalledTimes(1);
  });

  it("stops after three transaction attempts", async () => {
    const conflict = Object.assign(new Error("Serialization conflict"), { code: "40001" });
    dataSource.transaction.mockRejectedValue(conflict);

    await expect(repository.create({ id: "retry-review" })).rejects.toBe(conflict);

    expect(dataSource.transaction).toHaveBeenCalledTimes(3);
  });

  it.each(["23505", "23502", "08006"])(
    "does not retry non-serialization database errors: %s", async (code) => {
      const error = Object.assign(new Error("Database failure"), { driverError: { code } });
      dataSource.transaction.mockRejectedValue(error);

      await expect(repository.create({ id: "retry-review" })).rejects.toBe(error);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    }
  );



});

describe('Review transactional writes', () => {
  const now = 1790000000000;
  const draft = { id: "r1", booking_id: "b1", property_id: "p1", host_id: "host", reviewer_user_id: "guest",
    review_type: "GUEST_TO_PROPERTY", status: "DRAFT", publication_status: "UNPUBLISHED", verification_status: "UNVERIFIED",
    title: "Stay", public_review: "Good", private_feedback: "secret", overall_rating: 5, updated_at: now - 10 };
  let committed;
  let active;
  let source;
  let repository;
  let repositories;

  const matches = (record, where) => Object.entries(where).every(([key, value]) => {
    if (value && typeof value === "object" && value._type === "isNull") return record[key] == null;
    if (value && typeof value === "object" && value._type === "in") return value._value.includes(record[key]);
    if (value && typeof value === "object" && value._type === "not") return record[key] !== value._value;
    return record[key] === value;
  });

  beforeEach(() => {
    committed = new Map([
      [Review, [{ ...draft }]],
      [Booking, [{ id: "b1", guestid: "guest", hostid: "host", property_id: "p1", status: "Paid", departuredate: now - 100 }]],
      [Review_Rating, [{ id: "old-rating", reviewId: "r1", category: "cleanliness", rating: 2 }]],
      [Review_Category, [{ key: "cleanliness", reviewType: "GUEST_TO_PROPERTY", isActive: true }]],
      [Review_Request, [{ id: "request", bookingId: "b1", guestId: "guest", reviewType: "GUEST_TO_PROPERTY",
        status: "OPEN", nextSendAt: now + 100, claimedAt: now - 100 }]],
      [Review_Response, []],
    ]);
    active = committed;
    repositories = new Map([...committed.keys()].map((entity) => [entity, {
      findOne: jest.fn(async ({ where }) => active.get(entity).find((row) => matches(row, where)) ?? null),
      find: jest.fn(async ({ where }) => active.get(entity).filter((row) => matches(row, where))),
      update: jest.fn(async (where, fields) => {
        const rows = active.get(entity).filter((row) => matches(row, where));
        rows.forEach((row) => Object.assign(row, fields));
        return { affected: rows.length };
      }),
      delete: jest.fn(async (where) => {
        active.set(entity, active.get(entity).filter((row) => !matches(row, where)));
      }),
      save: jest.fn(async (records) => {
        const values = Array.isArray(records) ? records : [records];
        active.get(entity).push(...values);
        return records;
      }),
    }]));
    // Model commit/rollback separately from the transaction's working data.
    source = {
      getRepository: (entity) => repositories.get(entity),
      transaction: jest.fn(async (callback) => {
        active = new Map([...committed].map(([entity, rows]) => [entity, rows.map((row) => ({ ...row }))]));
        try {
          const result = await callback(source);
          committed = active;
          return result;
        } finally {
          active = committed;
        }
      }),
    };
    Database.getInstance.mockResolvedValue(source);
    repository = new ReviewRepository();
  });

  it("scores a created unverified review only after publication and excludes it after service deletion", async () => {
    committed.set(Review, []);
    committed.set(Property, [{ id: "p1", hostid: "host" }]);
    repositories.set(Property, { findOne: async ({ where }) =>
      active.get(Property).find((row) => matches(row, where)) ?? null });
    repositories.get(Review_Request).createQueryBuilder = () => {
      const insert = { insert: () => insert, values: () => insert, orIgnore: () => insert,
        execute: async () => ({}) };
      return insert;
    };
    repositories.get(Review).createQueryBuilder = () => {
      const filters = [];
      let fields;
      let owner;
      const query = {
        innerJoin: (_entity, _alias, _sql, parameters) => { owner = parameters.hostId; return query; },
        select: () => query, addSelect: () => query, update: () => query,
        set: (values) => { fields = values; return query; },
        where: (sql, parameters) => { filters.push([sql, parameters]); return query; },
        andWhere: (sql, parameters) => { filters.push([sql, parameters]); return query; },
        getRawOne: async () => {
          const rows = active.get(Review).filter((row) =>
            active.get(Property).some((property) => property.id === row.property_id && property.hostid === owner) &&
            filters.every(([sql, parameters]) => {
              if (sql.includes("BETWEEN")) return row.overall_rating >= parameters.minimum && row.overall_rating <= parameters.maximum;
              if (sql.includes("FLOOR")) return Number.isInteger(row.overall_rating);
              const field = sql.match(/review\.(\w+)/)[1];
              return row[field] === Object.values(parameters)[0];
            }));
          return { overall_score: rows.length ? rows.reduce((sum, row) => sum + row.overall_rating, 0) / rows.length : null,
            review_count: String(rows.length) };
        },
        execute: async () => {
          const rows = active.get(Review).filter((row) => filters.every(([sql, parameters]) => {
            if (sql.includes("NOT IN")) return !parameters.excluded.includes(row.status);
            const field = sql.split(" = ")[0];
            return row[field] === Object.values(parameters)[0];
          }));
          rows.forEach((row) => Object.assign(row, fields));
          return { affected: rows.length };
        },
      };
      return query;
    };
    const service = new ReviewService({ repository, now: () => now });
    const review = await service.createReview("guest", { booking_id: "b1", overall_rating: 5,
      title: "Stay", public_review: "Good" });
    expect(review.verification_status).toBe("UNVERIFIED");
    const empty = { property_id: "p1", overall_score: null, review_count: 0 };
    expect(await service.getPropertyReviewScore("host", "p1")).toEqual(empty);
    await service.publishReview("guest", review.id);
    expect(await service.getPropertyReviewScore("host", "p1")).toEqual({
      property_id: "p1", overall_score: 5, review_count: 1,
    });
    await service.deleteReview("guest", review.id);
    expect(committed.get(Review)[0].status).toBe("DELETED");
    expect(await service.getPropertyReviewScore("host", "p1")).toEqual(empty);
  });

  it("updates a draft and replaces ratings atomically while advancing its version", async () => {
    const result = await repository.updateDraft({ reviewId: "r1", reviewerUserId: "guest", expectedUpdatedAt: draft.updated_at,
      fields: { title: "Better", updated_at: draft.updated_at }, categoryRatings: { cleanliness: 5 } });
    expect(result.updated_at).toBe(draft.updated_at + 1);
    expect(committed.get(Review)[0].title).toBe("Better");
    expect(committed.get(Review_Rating)).toEqual([expect.objectContaining({ category: "cleanliness", rating: 5 })]);
  });

  it("rejects stale draft versions and author mismatches without changing ratings", async () => {
    for (const args of [{ reviewerUserId: "other", expectedUpdatedAt: draft.updated_at },
      { reviewerUserId: "guest", expectedUpdatedAt: 1 }]) {
      expect(await repository.updateDraft({ reviewId: "r1", ...args, fields: { title: "Spoof", updated_at: now },
        categoryRatings: {} })).toBeNull();
    }
    expect(committed.get(Review)[0].title).toBe("Stay");
    expect(committed.get(Review_Rating)).toHaveLength(1);
  });

  it("rolls back a draft edit if a category becomes inactive before the transaction", async () => {
    committed.get(Review_Category)[0].isActive = false;
    await expect(repository.updateDraft({ reviewId: "r1", reviewerUserId: "guest", expectedUpdatedAt: draft.updated_at,
      fields: { title: "Changed", updated_at: now }, categoryRatings: { cleanliness: 5 } })).rejects.toMatchObject({ statusCode: 409 });
    expect(committed.get(Review)[0].title).toBe("Stay");
    expect(committed.get(Review_Rating)[0].rating).toBe(2);
  });

  const responseRecord = () => ({ id: "response", reviewId: "r1", authorId: "host", authorRole: "host",
    status: "published", message: "Thanks", createdAt: now, updatedAt: now, publishedAt: now, deletedAt: null });
  const publishParent = () => Object.assign(committed.get(Review)[0], { status: "PUBLISHED", publication_status: "PUBLISHED" });

  it("prevents duplicate active responses and retains deleted responses when recreating", async () => {
    publishParent();
    await repository.createResponse(responseRecord());
    const version = committed.get(Review)[0].updated_at;
    await expect(repository.createResponse({ ...responseRecord(), id: "duplicate" })).rejects.toMatchObject({ statusCode: 409 });
    expect(committed.get(Review)[0].updated_at).toBe(version);
    expect(committed.get(Review_Response)).toHaveLength(1);
    expect(await repository.softDeleteResponse({ reviewId: "r1", authorId: "host", deletedAt: now + 1 })).toBe(true);
    await repository.createResponse({ ...responseRecord(), id: "replacement", updatedAt: now + 2 });
    expect(committed.get(Review_Response)).toHaveLength(2);
    expect(committed.get(Review_Response).filter((row) => row.deletedAt == null)).toHaveLength(1);
  });

  it("rechecks host identity and publication state inside response transactions", async () => {
    await expect(repository.createResponse(responseRecord())).rejects.toMatchObject({ statusCode: 409 });
    publishParent();
    await expect(repository.createResponse({ ...responseRecord(), authorId: "other" })).rejects.toMatchObject({ statusCode: 403 });
    expect(committed.get(Review_Response)).toHaveLength(0);
  });

  it("updates only the response author's active record and preserves its publication time", async () => {
    publishParent();
    await repository.createResponse(responseRecord());
    const updated = await repository.updateResponse({ reviewId: "r1", authorId: "host", message: "Changed", updatedAt: now + 5 });
    expect(updated).toMatchObject({ message: "Changed", publishedAt: now });
    await repository.softDeleteResponse({ reviewId: "r1", authorId: "host", deletedAt: now + 10 });
    expect(await repository.updateResponse({ reviewId: "r1", authorId: "host", message: "Hidden", updatedAt: now + 20 })).toBeNull();
    expect(committed.get(Review_Response)[0].message).toBe("Changed");
  });

  it("retries a serialization failure without leaving a duplicate response", async () => {
    publishParent();
    const responses = repositories.get(Review_Response);
    const save = responses.save.getMockImplementation();
    responses.save.mockImplementationOnce(async (record) => {
      await save(record);
      throw Object.assign(new Error("Concurrent response"), { code: "40001" });
    });
    await repository.createResponse(responseRecord());
    expect(source.transaction).toHaveBeenCalledTimes(2);
    expect(committed.get(Review_Response)).toHaveLength(1);
  });

  it("publishes and completes the matching request in one transaction without upgrading verification", async () => {
    const result = await repository.publishDraft({ reviewId: "r1", expectedUpdatedAt: draft.updated_at,
      updatedAt: now, authorize: async () => true });
    expect(result).toMatchObject({ status: "PUBLISHED", publication_status: "PUBLISHED", verification_status: "UNVERIFIED" });
    expect(committed.get(Review_Request)[0]).toMatchObject({ status: "COMPLETED", completedAt: now, nextSendAt: null, claimedAt: null });
  });

  it("rechecks publication policy and booking eligibility before committing", async () => {
    await expect(repository.publishDraft({ reviewId: "r1", expectedUpdatedAt: draft.updated_at,
      updatedAt: now, authorize: async () => false })).rejects.toMatchObject({ statusCode: 403 });
    committed.get(Booking)[0].status = "Cancelled";
    await expect(repository.publishDraft({ reviewId: "r1", expectedUpdatedAt: draft.updated_at,
      updatedAt: now, authorize: async () => true })).rejects.toMatchObject({ statusCode: 400 });
    expect(committed.get(Review)[0].status).toBe("DRAFT");
    expect(committed.get(Review_Request)[0].status).toBe("OPEN");
  });

  it("rolls back publication if request completion fails", async () => {
    repositories.get(Review_Request).update.mockRejectedValue(new Error("Request failure"));
    await expect(repository.publishDraft({ reviewId: "r1", expectedUpdatedAt: draft.updated_at,
      updatedAt: now, authorize: async () => true })).rejects.toThrow("Request failure");
    expect(committed.get(Review)[0].status).toBe("DRAFT");
  });

  it("loads ratings and visible responses through a public allowlist", async () => {
    publishParent();
    await repository.createResponse(responseRecord());
    const result = await repository.findPublicPropertyReviews("p1");
    expect(result.reviews[0]).toMatchObject({ overallRating: 5, categoryRatings: { cleanliness: 2 }, response: { message: "Thanks" } });
    expect(JSON.stringify(result)).not.toMatch(/secret|private_feedback|reviewer_user_id/);
  });

  it("provisions the response model in both schemas without changing live data", async () => {
    const runner = { query: jest.fn() };
    await new CreateReviewResponse20261014().up(runner);
    expect(runner.query).toHaveBeenCalledTimes(4);
    for (const schema of ["main", "test"]) {
      expect(runner.query).toHaveBeenCalledWith(expect.stringContaining(`CREATE TABLE IF NOT EXISTS ${schema}.review_response`));
    }
    const columns = Review_Response.options.columns;
    for (const column of Object.values(columns)) {
      expect(runner.query.mock.calls[0][0]).toContain(column.name ?? Object.entries(columns).find(([, value]) => value === column)[0]);
    }
  });
});
