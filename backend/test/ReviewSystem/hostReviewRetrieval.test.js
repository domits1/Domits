jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Review } from "database/models/Review";
import { Booking } from "database/models/Booking";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";
import { eligibleReviewQuery } from "../../functions/ReviewSystem/data/reviewRepositoryShared.js";

describe("host review queries", () => {
  let database, queries, summary, averages, rows, ratings;
  const now = 1800000000000;
  const retrieve = (host = "host", options = {}) => new ReviewRepository()
    .getHostReviewPage(host, { limit: 2, offset: 0, now, ...options });
  beforeAll(async () => {
    database = new DataSource({ type: "postgres", schema: "main", entities: [Review, Booking, Review_Rating, Review_Category] });
    await database.buildMetadatas();
  });
  beforeEach(() => {
    queries = [];
    summary = { score: "4.25", count: "8" };
    averages = [{ key: "communication", score: "4.5" }, { key: "responsiveness", score: "4" }, { key: "hospitality", score: "5" }];
    rows = [3, 2, 1].map(index => ({ id: `r${index}`, overall_rating: 4, title: "Host",
      public_review: "Helpful", created_at: index, private_feedback: "secret", host_id: "internal",
      reviewer_user_id: "private", status: "PUBLISHED", verification_status: "VERIFIED_STAY" }));
    ratings = [{ review_id: "r3", key: "communication", rating: "5" }];
    const realRepository = database.getRepository(Review);
    const build = realRepository.createQueryBuilder.bind(realRepository);
    jest.spyOn(database, "getRepository").mockImplementation(() => ({ createQueryBuilder: () => {
      const query = build("review"), index = queries.length;
      queries.push(query);
      jest.spyOn(query, "getRawOne").mockImplementation(async () => summary);
      jest.spyOn(query, "getRawMany").mockImplementation(async () => index === 1 ? averages : ratings);
      jest.spyOn(query, "getMany").mockImplementation(async () => rows);
      return query;
    } }));
    Database.getInstance.mockResolvedValue(database);
  });
  afterEach(() => jest.restoreAllMocks());

  it("returns full-population aggregates separately from the bounded page", async () => {
    const result = await retrieve("host", { offset: 4 });
    expect(result).toMatchObject({ host_id: "host", overall_score: 4.25, review_count: 8, next_offset: 6,
      category_ratings: { communication: 4.5, responsiveness: 4, hospitality: 5 } });
    expect(result.reviews).toHaveLength(2);
    expect(result.reviews[0]).toEqual({ id: "r3", overall_rating: 4, title: "Host", public_review: "Helpful",
      created_at: 3, category_ratings: { communication: 5 } });
    expect(result.reviews[1].category_ratings).toEqual({});
    expect(queries[0].getQuery()).toContain('AVG("review"."overall_rating")');
    expect(queries[0].getQuery()).toContain("COUNT(*)");
    expect(queries[1].getQuery()).toContain('AVG("rating"."rating")');
    expect(queries[1].getQuery()).toContain('GROUP BY "rating"."category"');
    for (const query of queries.slice(0, 2)) {
      expect(query.expressionMap.limit).toBeUndefined();
      expect(query.expressionMap.offset).toBeUndefined();
    }
  });
  it("applies host, type, publication and completed-stay eligibility to every query", async () => {
    await retrieve();
    expect(queries).toHaveLength(4);
    for (const query of queries) {
      expect(query.getParameters()).toMatchObject({ hostId: "host", reviewType: "GUEST_TO_HOST",
        status: "PUBLISHED", publicationStatus: "PUBLISHED", verified: "VERIFIED_STAY",
        stayStatuses: ["paid", "confirmed"], stayNow: now });
      const sql = query.getQuery();
      for (const clause of ['"review"."host_id" = :hostId', '"review"."reviewee_user_id" = :hostId',
        '"stay"."guestid" = "review"."reviewer_user_id"', '"stay"."hostid" = "review"."host_id"',
        '"stay"."property_id" = "review"."property_id"', '"stay"."guestid" <> "stay"."hostid"',
        '"review"."status" = :status', '"review"."publication_status" = :publicationStatus',
        '"review"."verification_status" = :verified', '"stay"."departuredate" <= :stayNow']) {
        expect(sql.replaceAll('"', '')).toContain(clause.replaceAll('"', ''));
      }
      expect(query.getQueryAndParameters()[1]).not.toContain("GUEST_TO_PROPERTY");
    }
  });
  it.each(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "RESTRICTED", "DELETED"])(
    "only permits published status, excluding %s", async excluded => {
      await retrieve();
      for (const query of queries) {
        expect(query.getParameters().status).toBe("PUBLISHED");
        expect(query.getQueryAndParameters()[1]).not.toContain(excluded);
      }
    });
  it("isolates another host in all query parameters", async () => {
    await retrieve("another-host");
    for (const query of queries) expect(query.getParameters().hostId).toBe("another-host");
  });
  it("uses active host categories and valid ratings without counting joined category rows as reviews", async () => {
    await retrieve();
    expect(queries[0].getQuery()).not.toContain("review_rating");
    for (const query of [queries[1], queries[3]]) {
      expect(query.getParameters()).toMatchObject({ active: true, hostType: "GUEST_TO_HOST",
        hostCategories: ["communication", "responsiveness", "hospitality"] });
      expect(query.getQuery()).toContain('"rating"."rating" BETWEEN 1 AND 5');
    }
    expect(queries[3].getParameters().ids).toEqual(["r3", "r2"]);
  });
  it("returns null averages and no child page query for empty results", async () => {
    summary = { score: null, count: "0" }; averages = []; rows = [];
    expect(await retrieve()).toEqual({ host_id: "host", overall_score: null, review_count: 0,
      category_ratings: { communication: null, responsiveness: null, hospitality: null }, reviews: [], next_offset: null });
    expect(queries).toHaveLength(3);
  });
  it("orders pages by descending timestamp and ID and fetches one extra row", async () => {
    await retrieve("host", { offset: 2 });
    expect(queries[2].expressionMap).toMatchObject({ limit: 3, offset: 2,
      orderBys: { "review.created_at": "DESC", "review.id": "DESC" } });
    rows = rows.slice(0, 2);
    expect((await retrieve()).next_offset).toBeNull();
  });
  it("excludes private and moderation fields in SQL selection and response", async () => {
    const result = await retrieve();
    const pageSql = queries[2].getQuery().split(" FROM ")[0];
    expect(pageSql).not.toMatch(/private_feedback|reviewer_user_id|booking_id|verification_status|publication_status/);
    expect(JSON.stringify(result)).not.toMatch(/secret|private_feedback|reviewer_user_id|verification_status|publication_status/);
  });
  it("preserves the default property aggregation type", () => {
    expect(eligibleReviewQuery(database, "property").getParameters()).toMatchObject({
      reviewType: "GUEST_TO_PROPERTY", propertyId: "property", status: "PUBLISHED" });
  });
});

describe("host review read scopes", () => {
  let repository, controller;
  const request = (query, guest = "host") => ({ queryStringParameters: query,
    requestContext: { authorizer: { claims: { sub: guest } } } });
  beforeEach(() => {
    repository = { getHostReviewPage: jest.fn().mockResolvedValue({ host_id: "host", reviews: [] }) };
    controller = new Controller({ service: new ReviewService({ repository, now: () => 123 }) });
  });
  it("allows anonymous access only to the public scope", async () => {
    expect((await controller.getReviews({ queryStringParameters: { scope: "host-public", hostId: "host" } })).statusCode).toBe(200);
    expect(repository.getHostReviewPage).toHaveBeenCalledWith("host", { limit: 20, offset: 0, now: 123 });
    expect((await controller.getReviews({ queryStringParameters: { scope: "host-dashboard" } })).statusCode).toBe(401);
  });
  it("binds dashboard retrieval to the verified subject", async () => {
    expect((await controller.getReviews(request({ scope: "host-dashboard", limit: "10", offset: "20" }, "owner"))).statusCode).toBe(200);
    expect(repository.getHostReviewPage).toHaveBeenCalledWith("owner", { limit: 10, offset: 20, now: 123 });
  });
  it.each([{ hostId: "other" }, { username: "other" }, { reviewId: "other" }, { limit: "101" },
    { limit: "0" }, { offset: "-1" }, { offset: "100001" }, { offset: "1.5" }])(
    "rejects dashboard ownership overrides or invalid pagination: %o", async query => {
      expect((await controller.getReviews(request({ scope: "host-dashboard", ...query }))).statusCode).toBe(400);
      expect(repository.getHostReviewPage).not.toHaveBeenCalled();
    });
  it.each([{ hostId: "" }, { hostId: "x".repeat(256) }, { hostId: [] }, { sort: "highest" }])(
    "rejects invalid public requests: %o", async query => {
      expect((await controller.getReviews(request({ scope: "host-public", hostId: "host", ...query }))).statusCode).toBe(400);
    });
});
