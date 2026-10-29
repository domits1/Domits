import { randomInt, randomUUID } from "node:crypto";
import { In, IsNull, Not } from "typeorm";
import Database from "database";
import { Booking } from "database/models/Booking";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { Review_Request } from "database/models/Review_Request";
import { Review_Response } from "database/models/Review_Response";
import { Team_Member } from "database/models/Team_Member";
import { NotFoundException } from "../util/exception/notFoundException.js";
import { ConflictException } from "../util/exception/conflictException.js";
import { ForbiddenException } from "../util/exception/forbiddenException.js";
import {
  assertEligibleBooking,
  assertHostResponseAccess,
} from "../business/reviewRules.js";

const MAX_TRANSACTION_ATTEMPTS = 3;
const REVIEW_REQUEST_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const REVIEW_FIELDS = [
  "id",
  "booking_id",
  "property_id",
  "host_id",
  "reviewer_user_id",
  "reviewee_user_id",
  "review_type",
  "overall_rating",
  "title",
  "public_review",
  "verification_status",
  "publication_status",
  "status",
  "created_at",
  "updated_at",
];

const average = (values) => {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length ? Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length * 10) / 10 : null;
};

const nextTimestamp = (requestedAt, previousAt) =>
  Math.max(requestedAt, Number(previousAt) + 1);

const isMatchingDraft = (review, expectedUpdatedAt) =>
  review?.status === "DRAFT" &&
  review.publication_status === "UNPUBLISHED" &&
  review.updated_at === expectedUpdatedAt;

const buildRatingRecords = (reviewId, categoryRatings, createdAt) =>
  Object.entries(categoryRatings).map(([category, rating]) => ({
    id: randomUUID(),
    reviewId,
    category,
    rating,
    createdAt,
  }));

const toPublicReview = (review) => ({
  id: review.id,
  overallRating: Number(review.overall_rating),
  title: review.title,
  publicReview: review.public_review,
  verificationStatus: review.verification_status,
  status: review.status,
  createdAt: review.created_at,
  categoryRatings: review.categoryRatings || {},
  response:
    review.response?.status === "published" &&
    review.response.deletedAt == null
      ? {
          id: review.response.id,
          authorRole: review.response.authorRole,
          message: review.response.message,
          publishedAt: review.response.publishedAt,
        }
      : null,
});

const retryTransaction = async (dataSource, callback, attempt = 1) => {
  try {
    return await dataSource.transaction(callback);
  } catch (error) {
    const databaseError = error?.driverError || error;

    if (
      databaseError?.code !== "40001" ||
      attempt >= MAX_TRANSACTION_ATTEMPTS
    ) {
      throw error;
    }

    const delayMs = 25 * 2 ** (attempt - 1) + randomInt(25);

    await new Promise((resolve) => setTimeout(resolve, delayMs));

    return retryTransaction(dataSource, callback, attempt + 1);
  }
};

export class ReviewRepository {
  eligibleReviewQuery(database, propertyId) {
    return database.getRepository(Review).createQueryBuilder("review")
      .where(propertyId === undefined ? "1 = 1" : Array.isArray(propertyId) ? "review.property_id IN (:...propertyIds)" : "review.property_id = :propertyId",
        Array.isArray(propertyId) ? { propertyIds: propertyId } : { propertyId })
      .andWhere("review.publication_status = :publicationStatus", { publicationStatus: "PUBLISHED" })
      .andWhere("review.status = :status", { status: "PUBLISHED" })
      .andWhere("review.review_type = :reviewType", { reviewType: "GUEST_TO_PROPERTY" })
      .andWhere("review.overall_rating BETWEEN :minimum AND :maximum", { minimum: 1, maximum: 5 })
      .andWhere("review.overall_rating * 2 = FLOOR(review.overall_rating * 2)");
  }

  hostResponseQuery(database, username) {
    return this.eligibleReviewQuery(database)
      .andWhere("review.verification_status = :verificationStatus", { verificationStatus: "VERIFIED" })
      .innerJoin(Property, "property", "property.id = review.property_id")
      .leftJoin(Team_Member, "member", "member.host_id = property.hostid AND member.member_user_id = :username AND member.status = :active AND member.role = :role",
        { username, active: "active", role: "Property Operations Manager" })
      .andWhere("(property.hostid = :username OR member.id IS NOT NULL)", { username })
      .andWhere("property.status = :propertyStatus", { propertyStatus: "ACTIVE" })
      .andWhere("TRIM(review.public_review) <> ''");
  }

  async findResponseEligibleReviews(username) {
    const database = await Database.getInstance();
    const reviews = await this.hostResponseQuery(database, username)
      .select(REVIEW_FIELDS.map((field) => `review.${field}`)).orderBy("review.created_at", "DESC").getMany();
    return this.attachPublicDetails(database, reviews);
  }

  async saveHostResponse(user, reviewId, message, action, now) {
    try {
      const database = await Database.getInstance();
      return await database.transaction(async (manager) => {
        const review = await this.hostResponseQuery(manager, user.username).andWhere("review.id = :reviewId", { reviewId }).getOne();
        if (!review) throw new NotFoundException("An eligible review you can respond to was not found.");
        const repository = manager.getRepository(Review_Response);
        const existing = await repository.findOne({ where: { reviewId } });
        if (action === "edit" && (!existing || existing.deletedAt != null)) throw new NotFoundException("Host response not found.");
        if (action === "draft" && existing?.status === "published") throw new ConflictException("A published response cannot become a draft.");
        let status = "draft";
        if (action === "edit") {
          status = existing.status;
        } else if (action === "publish") {
          status = "published";
        }
        const saved = await repository.save({ ...existing, id: existing?.id || randomUUID(), reviewId,
          authorId: user.userId, authorRole: "host", message, status, createdAt: existing?.createdAt ?? now,
          updatedAt: now, publishedAt: status === "published" ? existing?.publishedAt ?? now : null, deletedAt: null });
        return { id: saved.id, message: saved.message, status: saved.status, createdAt: saved.createdAt,
          updatedAt: saved.updatedAt, publishedAt: saved.publishedAt };
      });
    } catch (error) {
      const cause = error.driverError || error;
      if (cause.code === "23505" && String(cause.constraint || cause.message).includes("review_response_review_unique")) {
        throw new ConflictException("A response already exists. Reload the review before editing.");
      }
      throw error;
    }
  }

  async getPublicReviewPage(propertyId, offset) {
    const database = await Database.getInstance();
    const property = await database.getRepository(Property).findOne({
      where: { id: propertyId, status: "ACTIVE" }, select: ["id"],
    });
    if (!property) return null;
    const eligible = () => this.eligibleReviewQuery(database, propertyId)
      .innerJoin(Property, "property", "property.id = review.property_id AND property.status = :propertyStatus",
        { propertyStatus: "ACTIVE" });
    const summary = await eligible().select("AVG(review.overall_rating)", "score")
      .addSelect("COUNT(*)", "count").getRawOne();
    const reviews = await eligible()
      .select(["review.id", "review.overall_rating", "review.public_review", "review.created_at", "review.verification_status"])
      .orderBy("review.created_at", "DESC").addOrderBy("review.id", "DESC")
      .offset(offset).limit(10).getMany();
    const ids = reviews.map((review) => review.id);
    const ratings = ids.length ? await database.getRepository(Review_Rating).createQueryBuilder("rating")
      .innerJoin(Review_Category, "category", "category.key = rating.category AND category.isActive = :active AND category.reviewType = :reviewType",
        { active: true, reviewType: "GUEST_TO_PROPERTY" })
      .select("rating.reviewId", "review_id").addSelect("category.key", "key")
      .addSelect("category.label", "label").addSelect("rating.rating", "rating")
      .where("rating.reviewId IN (:...ids)", { ids })
      .andWhere("rating.rating BETWEEN 1 AND 5")
      .andWhere("rating.rating * 2 = FLOOR(rating.rating * 2)").getRawMany() : [];
    const count = Number(summary.count);
    const responses = ids.length ? await database.getRepository(Review_Response).find({
      where: { reviewId: In(ids), status: "published", deletedAt: IsNull() },
      select: ["reviewId", "message", "publishedAt"],
    }) : [];
    return { property_id: propertyId, overall_score: count ? Number(summary.score) : null,
      review_count: count, next_offset: offset + 10 < count ? offset + 10 : null,
      reviews: reviews.map((review) => ({ id: review.id, rating: review.overall_rating,
        text: review.public_review, date: Number(review.created_at), verified: review.verification_status === "VERIFIED_STAY",
        response: responses.filter((response) => response.reviewId === review.id)
          .map(({ message, publishedAt }) => ({ message, publishedAt }))[0] || null,
        categories: ratings.filter((rating) => rating.review_id === review.id)
          .map(({ key, label, rating }) => ({ key, label, rating: Number(rating) })) })) };
  }

  async getPropertyReviewPerformance(propertyId, hostId, start, endExclusive, interval = "month") {
    const expressions = {
      week: "DATE_TRUNC('week', TO_TIMESTAMP(review.created_at / 1000.0) AT TIME ZONE 'UTC')",
      month: "DATE_TRUNC('month', TO_TIMESTAMP(review.created_at / 1000.0) AT TIME ZONE 'UTC')",
      year: "DATE_TRUNC('year', TO_TIMESTAMP(review.created_at / 1000.0) AT TIME ZONE 'UTC')",
    };
    if (!["week", "month", "year"].includes(interval)) throw new TypeError("Unsupported review interval.");
    const period = expressions[interval];
    const database = await Database.getInstance();
    return this.eligibleReviewQuery(database, propertyId)
      .innerJoin(Property, "property",
        "property.id = review.property_id AND property.hostid = :hostId", { hostId })
      .andWhere("review.created_at >= :start", { start })
      .andWhere("review.created_at < :endExclusive", { endExclusive })
      .select(`TO_CHAR(${period}, 'YYYY-MM-DD')`, "period")
      .addSelect("AVG(review.overall_rating)", "average_score")
      .addSelect("COUNT(*)", "review_count")
      .addSelect("COUNT(CASE WHEN ROUND(review.overall_rating) = 1 THEN 1 END)", "stars_1")
      .addSelect("COUNT(CASE WHEN ROUND(review.overall_rating) = 2 THEN 1 END)", "stars_2")
      .addSelect("COUNT(CASE WHEN ROUND(review.overall_rating) = 3 THEN 1 END)", "stars_3")
      .addSelect("COUNT(CASE WHEN ROUND(review.overall_rating) = 4 THEN 1 END)", "stars_4")
      .addSelect("COUNT(CASE WHEN ROUND(review.overall_rating) = 5 THEN 1 END)", "stars_5")
      .groupBy(period).orderBy(period, "ASC").getRawMany();
  }

  async getPropertyCategoryRatings(propertyId, hostId) {
    const database = await Database.getInstance();
    const rows = await database.getRepository(Review_Category).createQueryBuilder("category")
      .innerJoin(Property, "property", "property.id = :propertyId AND property.hostid = :hostId")
      .leftJoin((query) => query
        .select("definition.key", "category_key")
        .addSelect("AVG(rating.rating)", "average_rating")
        .addSelect("COUNT(*)", "rating_count")
        .from(Review_Rating, "rating")
        .innerJoin(Review_Category, "definition",
          `(LOWER(TRIM(rating.category)) = LOWER(TRIM(definition.key))
            OR LOWER(TRIM(rating.category)) = LOWER(TRIM(definition.label)))
            AND definition.isActive = :active AND definition.reviewType = :reviewType`)
        .innerJoin(Review, "review", "review.id = rating.reviewId")
        .where("review.property_id = :propertyId")
        .andWhere("review.publication_status = :published")
        .andWhere("review.status = :published")
        .andWhere("review.review_type = :reviewType")
        .andWhere("rating.rating BETWEEN :minimum AND :maximum")
        .andWhere("rating.rating * 2 = FLOOR(rating.rating * 2)")
        .groupBy("definition.key"),
      "aggregate", "aggregate.category_key = category.key")
      .select("category.key", "category_key")
      .addSelect("category.label", "label")
      .addSelect("aggregate.average_rating", "average_rating")
      .addSelect("category.sortOrder", "sort_order")
      .addSelect("COALESCE(aggregate.rating_count, 0)", "rating_count")
      .where("category.isActive = :active")
      .andWhere("category.reviewType = :reviewType")
      .setParameters({ propertyId, hostId, published: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY",
        minimum: 1, maximum: 5, active: true })
      .orderBy("category.sortOrder", "ASC").addOrderBy("category.key", "ASC").getRawMany();
    return rows.map((row) => ({ category_key: row.category_key, label: row.label,
      average_rating: Number(row.rating_count) === 0 ? null : Number(row.average_rating),
      rating_count: Number(row.rating_count), sort_order: Number(row.sort_order ?? 0) }));
  }

  async findManagedProperty(propertyId, hostId) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Property).findOne({
      where: { id: propertyId, hostid: hostId }, select: ["id"],
    });
  }

  async getPropertyRatingHistory(hostId, propertyIds, { endExclusive, days }) {
    if (!propertyIds.length) return [];
    const database = await Database.getInstance();
    const periodMs = days * 86400000;
    const start = endExclusive - 6 * periodMs;
    const boundaries = Object.fromEntries([1, 2, 3, 4, 5].map((index) => [`historyBoundary${index}`, start + index * periodMs]));
    const bucket = `CASE ${[1, 2, 3, 4, 5].map((index) =>
      `WHEN review.created_at < :historyBoundary${index} THEN ${index - 1}`).join(" ")} ELSE 5 END`;
    const rows = await this.eligibleReviewQuery(database, propertyIds)
      .innerJoin(Property, "property", "property.id = review.property_id AND property.hostid = :hostId", { hostId })
      .andWhere("review.created_at >= :historyStart AND review.created_at < :historyEnd", { historyStart: start, historyEnd: endExclusive })
      .select("review.property_id", "property_id")
      .addSelect(bucket, "period_index")
      .addSelect("AVG(review.overall_rating)", "average_rating")
      .addSelect("COUNT(*)", "review_count")
      .setParameters(boundaries)
      .groupBy("review.property_id").addGroupBy(bucket).getRawMany();
    return rows.map((row) => ({ ...row, period_index: Number(row.period_index),
      average_rating: Number(row.average_rating), review_count: Number(row.review_count) }));
  }

  async getPropertyRatingTrendPage(hostId, options) {
    const database = await Database.getInstance();
    const aggregates = database.getRepository(Property).createQueryBuilder("property")
      .leftJoin(Review, "review", `review.property_id = property.id
        AND review.publication_status = :publicationStatus AND review.status = :publishedStatus
        AND review.review_type = :reviewType AND review.overall_rating BETWEEN 1 AND 5
        AND review.overall_rating * 2 = FLOOR(review.overall_rating * 2)
        AND review.created_at >= :previousStart AND review.created_at < :endExclusive`)
      .where("property.hostid = :hostId")
      .select("property.id", "property_id")
      .addSelect("AVG(CASE WHEN review.created_at < :currentStart THEN review.overall_rating END)", "previous_average_rating")
      .addSelect("AVG(CASE WHEN review.created_at >= :currentStart THEN review.overall_rating END)", "current_average_rating")
      .addSelect("COUNT(CASE WHEN review.created_at < :currentStart THEN 1 END)", "previous_review_count")
      .addSelect("COUNT(CASE WHEN review.created_at >= :currentStart THEN 1 END)", "current_review_count")
      .groupBy("property.id");
    const classified = database.createQueryBuilder().from(`(${aggregates.getQuery()})`, "scores")
      .select("scores.*")
      .addSelect(`CASE WHEN previous_review_count < :minimumReviews OR current_review_count < :minimumReviews
          OR previous_average_rating IS NULL OR current_average_rating IS NULL THEN 'INSUFFICIENT_DATA'
        WHEN current_average_rating - previous_average_rating <= :declineBoundary THEN 'DECLINING'
        WHEN current_average_rating - previous_average_rating >= :boundary THEN 'IMPROVING'
        ELSE 'STABLE' END`, "trend_status");
    const page = database.createQueryBuilder().from(`(${classified.getQuery()})`, "trends")
      .select("trends.*")
      .addSelect("CASE WHEN trends.trend_status = 'INSUFFICIENT_DATA' THEN NULL ELSE current_average_rating - previous_average_rating END", "rating_change")
      .setParameters({ hostId, previousStart: options.previousStart, currentStart: options.currentStart,
        endExclusive: options.endExclusive, minimumReviews: options.minimumReviews,
        boundary: options.threshold * (1 - 1e-12),
        declineBoundary: -options.threshold * (1 - 1e-12),
        publicationStatus: "PUBLISHED", publishedStatus: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY" });
    if (options.status !== undefined) page.where("trends.trend_status = :trendStatus", { trendStatus: options.status });
    if (options.sort === "declining-first") {
      page.orderBy("CASE WHEN trends.trend_status = 'DECLINING' THEN 0 ELSE 1 END", "ASC");
    }
    const rows = await page.addOrderBy("trends.property_id", "ASC").offset(options.offset).limit(26).getRawMany();
    return rows.map((row) => ({ ...row,
      rating_change: row.rating_change == null ? null : Number(row.rating_change),
      previous_average_rating: row.previous_average_rating == null ? null : Number(row.previous_average_rating),
      current_average_rating: row.current_average_rating == null ? null : Number(row.current_average_rating),
      previous_review_count: Number(row.previous_review_count), current_review_count: Number(row.current_review_count) }));
  }

  async getPropertyReviewScore(propertyId, hostId) {
    const dataSource = await Database.getInstance();
    const query = dataSource.getRepository(Review).createQueryBuilder("review")
      .where("review.property_id = :propertyId", { propertyId })
      .andWhere("review.publication_status = :publicationStatus", { publicationStatus: "PUBLISHED" })
      .andWhere("review.status = :status", { status: "PUBLISHED" })
      .andWhere("review.review_type = :reviewType", { reviewType: "GUEST_TO_PROPERTY" })
      .andWhere("review.overall_rating BETWEEN :minimum AND :maximum", { minimum: 1, maximum: 5 })
      .andWhere("review.overall_rating * 2 = FLOOR(review.overall_rating * 2)")
      .innerJoin(Property, "property",
        "property.id = review.property_id AND property.hostid = :hostId", { hostId })
      .select("AVG(review.overall_rating)", "overall_score")
      .addSelect("COUNT(*)", "review_count");
    const result = await query.getRawOne();
    const reviewCount = Number(result.review_count);
    return { property_id: propertyId,
      overall_score: reviewCount === 0 || result.overall_score == null ? null : Math.round(Number(result.overall_score) * 10) / 10, review_count: reviewCount };
  }

  async findReviewById(id) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Review).findOne({ where: { id } });
  }

  async updateEditableReview({ id, guestId, previousUpdatedAt, editWindowMs,
    now, overallRating, publicReview }) {
    const dataSource = await Database.getInstance();
    const timestamp = now();
    const updatedAt = Math.max(timestamp, previousUpdatedAt + 1);
    // Check ownership, the original deadline, and version in the same write.
    const result = await dataSource.getRepository(Review).createQueryBuilder()
      .update(Review)
      .set({ overall_rating: overallRating, public_review: publicReview, updated_at: updatedAt,
        status: "DRAFT", publication_status: "UNPUBLISHED" })
      .where("id = :id AND reviewer_user_id = :guestId", { id, guestId })
      .andWhere("updated_at = :previousUpdatedAt", { previousUpdatedAt })
      .andWhere("created_at <= :timestamp AND created_at > :cutoff", {
        timestamp, cutoff: timestamp - editWindowMs,
      })
      .andWhere("status NOT IN (:...excluded)", { excluded: ["DELETED", "REJECTED"] })
      .execute();
    return { affected: result.affected, updated_at: updatedAt };
  }

  // Creation

  // Create a review and persist its rating breakdown.
  // This keeps the review record, category ratings, and request state in one transactional unit.
  async create(record, categoryRatings = {}) {
    return this.runTransaction(async (manager) => {
      const review = await this.saveReview(manager, record);

      await this.saveCategoryRatings(
        manager,
        record.id,
        categoryRatings,
        record.created_at
      );

      await this.createReviewRequestIfMissing(manager, record);

      return review;
    });
  }

  async saveReview(manager, record) {
    return manager.getRepository(Review).save(record);
  }

  async saveCategoryRatings(
    manager,
    reviewId,
    categoryRatings,
    createdAt
  ) {
    const ratings = buildRatingRecords(
      reviewId,
      categoryRatings,
      createdAt
    );

    if (!ratings.length) return;

    await manager.getRepository(Review_Rating).save(ratings);
  }

  async createReviewRequestIfMissing(manager, record) {
    // Preserve existing request status, identity, and timing.
    await manager
      .getRepository(Review_Request)
      .createQueryBuilder()
      .insert()
      .values({
        id: randomUUID(),
        bookingId: record.booking_id,
        propertyId: record.property_id,
        hostId: record.host_id,
        guestId: record.reviewer_user_id,
        reviewType: record.review_type,
        status: "OPEN",
        requestedAt: record.created_at,
        expiresAt:
          record.created_at + REVIEW_REQUEST_DURATION_MS,
        completedAt: null,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      })
      .orIgnore()
      .execute();
  }

  async createResponse(record) {
    return this.mutateResponse(
      record.reviewId,
      record.authorId,
      record.updatedAt,
      async (responses) => {
        const existing = await responses.findOne({
          where: {
            reviewId: record.reviewId,
            deletedAt: IsNull(),
          },
        });

        if (existing) {
          throw new ConflictException(
            "This review already has a response."
          );
        }

        return responses.save(record);
      }
    );
  }

  // Reads

  async findById(id) {
    const dataSource = await Database.getInstance();

    return dataSource.getRepository(Review).findOne({
      where: { id },
    });
  }

  async findBookingById(bookingId) {
    const dataSource = await Database.getInstance();

    return dataSource.getRepository(Booking).findOne({
      where: { id: bookingId },
    });
  }

  async findReviewByBookingTypeAndReviewer(key) {
    const dataSource = await Database.getInstance();

    return dataSource.getRepository(Review).findOne({
      where: key,
      select: ["id"],
    });
  }

  async findActiveCategoryKeys(reviewType) {
    const dataSource = await Database.getInstance();

    return this.loadActiveCategoryKeys(dataSource, reviewType);
  }

  async loadActiveCategoryKeys(manager, reviewType) {
    const categories = await manager
      .getRepository(Review_Category)
      .find({
        where: { reviewType, isActive: true },
        select: ["key"],
      });

    return new Set(categories.map((category) => category.key));
  }

  // Load a user's review list for the chosen scope.
  // This gives the profile views a single source of truth for written and received reviews.
  async findForUser(userId, scope) {
    const dataSource = await Database.getInstance();
    const field =
      scope === "written"
        ? "review.reviewer_user_id"
        : "review.reviewee_user_id";

    const query = dataSource
      .getRepository(Review)
      .createQueryBuilder("review")
      .where(`${field} = :userId`, { userId })
      .andWhere("review.status NOT IN (:...excluded)", {
        excluded: ["DELETED", "REJECTED"],
      })
      .orderBy("review.created_at", "DESC")
      .addOrderBy("review.id", "DESC");

    if (scope === "received") {
      query
        .andWhere("review.publication_status = :published", {
          published: "PUBLISHED",
        })
        .andWhere("review.status = :publishedStatus", {
          publishedStatus: "PUBLISHED",
        });
    }

    const reviews = await query.getMany();
    if (scope !== "received" || !reviews.length) return reviews;
    const bookings = await dataSource.getRepository(Booking).find({
      where: { id: In([...new Set(reviews.map((review) => review.booking_id))]) },
      select: ["id", "guestid", "guestname"],
    });
    const byId = new Map(bookings.map((booking) => [booking.id, booking]));
    return reviews.map((review) => {
      const booking = byId.get(review.booking_id);
      return { ...review, guest_name: booking?.guestid === review.reviewer_user_id
        ? booking.guestname?.trim() || null : null };
    });
  }

  async findReviews(where) {
    const dataSource = await Database.getInstance();

    const visibleWhere = (Array.isArray(where) ? where : [where]).map(
      (filter) => ({
        ...filter,
        status: filter.status ?? Not("REJECTED"),
      })
    );

    const reviews = await dataSource.getRepository(Review).find({
      where: Array.isArray(where) ? visibleWhere : visibleWhere[0],
      order: { created_at: "DESC", id: "DESC" },
      select: REVIEW_FIELDS,
    });

    return this.attachPublicDetails(dataSource, reviews);
  }

  // Fetch the published review feed for a property.
  // This supports the public property page without exposing unpublished or hidden review content.
  async findPublicForProperty(propertyId, { limit, offset }) {
    const dataSource = await Database.getInstance();

    const reviews = await dataSource
      .getRepository(Review)
      .createQueryBuilder("review")
      .select([
        "review.id",
        "review.property_id",
        "review.overall_rating",
        "review.title",
        "review.public_review",
        "review.created_at",
      ])
      .where("review.property_id = :propertyId", { propertyId })
      .andWhere("review.review_type = :reviewType", {
        reviewType: "GUEST_TO_PROPERTY",
      })
      .andWhere("review.publication_status = :published", {
        published: "PUBLISHED",
      })
      .andWhere("review.status = :publishedStatus", {
        publishedStatus: "PUBLISHED",
      })
      .orderBy("review.created_at", "DESC")
      .addOrderBy("review.id", "DESC")
      .skip(offset)
      .take(limit)
      .getMany();

    return this.attachPublicDetails(dataSource, reviews);
  }

  async findPublicPropertyReviews(
    propertyId,
    {
      sort = "recent",
      verifiedOnly = false,
      category = null,
    } = {}
  ) {
    const reviews = await this.findReviews({
      property_id: propertyId,
      review_type: "GUEST_TO_PROPERTY",
      status: "PUBLISHED",
      publication_status: "PUBLISHED",
    });

    const filtered = this.filterPublicReviews(
      reviews,
      verifiedOnly,
      category
    );

    this.sortPublicReviews(filtered, sort);

    return this.buildPublicSummary(filtered);
  }

  // Updates

  // Update a draft review without overwriting someone else's changes.
  // This protects the optimistic concurrency flow and ensures category edits stay synchronized.
  async updateDraft({
    reviewId,
    reviewerUserId,
    expectedUpdatedAt,
    fields,
    categoryRatings,
  }) {
    return this.runTransaction(async (manager) => {
      const reviews = manager.getRepository(Review);
      const current = await reviews.findOne({
        where: { id: reviewId },
      });

      if (
        !isMatchingDraft(current, expectedUpdatedAt) ||
        current.reviewer_user_id !== reviewerUserId
      ) {
        return null;
      }

      const updates = {
        ...fields,
        updated_at: nextTimestamp(
          fields.updated_at,
          current.updated_at
        ),
      };

      const result = await reviews.update(
        {
          id: reviewId,
          reviewer_user_id: reviewerUserId,
          status: "DRAFT",
          publication_status: "UNPUBLISHED",
          updated_at: expectedUpdatedAt,
        },
        updates
      );

      if (result.affected !== 1) return null;

      if (categoryRatings !== undefined) {
        await this.replaceCategoryRatings(
          manager,
          current,
          categoryRatings,
          updates.updated_at
        );
      }

      return { ...current, ...updates };
    });
  }

  async replaceCategoryRatings(
    manager,
    review,
    categoryRatings,
    updatedAt
  ) {
    const supported = await this.loadActiveCategoryKeys(
      manager,
      review.review_type
    );

    if (
      Object.keys(categoryRatings).some(
        (key) => !supported.has(key)
      )
    ) {
      throw new ConflictException(
        "Rating categories changed. Reload before editing."
      );
    }

    await manager.getRepository(Review_Rating).delete({
      reviewId: review.id,
    });

    await this.saveCategoryRatings(
      manager,
      review.id,
      categoryRatings,
      updatedAt
    );
  }

  async updateResponse({
    reviewId,
    authorId,
    message,
    updatedAt,
  }) {
    return this.mutateResponse(
      reviewId,
      authorId,
      updatedAt,
      async (responses) => {
        const current = await responses.findOne({
          where: {
            reviewId,
            authorId,
            deletedAt: IsNull(),
          },
        });

        if (!current) return null;

        return this.saveResponseUpdate(
          responses,
          current,
          message,
          updatedAt
        );
      }
    );
  }

  async saveResponseUpdate(
    responses,
    current,
    message,
    updatedAt
  ) {
    const changes = {
      message,
      updatedAt: nextTimestamp(updatedAt, current.updatedAt),
    };

    const result = await responses.update(
      {
        id: current.id,
        authorId: current.authorId,
        deletedAt: IsNull(),
        updatedAt: current.updatedAt,
      },
      changes
    );

    return result.affected === 1
      ? { ...current, ...changes }
      : null;
  }

  // Deletion

  async softDelete(id, reviewerUserId, updatedAt) {
    const dataSource = await Database.getInstance();

    return dataSource
      .getRepository(Review)
      .createQueryBuilder()
      .update(Review)
      .set({ status: "DELETED", updated_at: updatedAt })
      .where("id = :id", { id })
      .andWhere("reviewer_user_id = :reviewerUserId", {
        reviewerUserId,
      })
      .andWhere("status NOT IN (:...excluded)", {
        excluded: ["DELETED", "REJECTED"],
      })
      .execute();
  }

  async deleteOwnReview(id, reviewerUserId, now) {
    const dataSource = await Database.getInstance();

    return dataSource.getRepository(Review).update(
      { id, reviewer_user_id: reviewerUserId },
      {
        status: "REJECTED",
        publication_status: "REJECTED",
        updated_at: now,
      }
    );
  }

  async softDeleteResponse({ reviewId, authorId, deletedAt }) {
    return this.mutateResponse(
      reviewId,
      authorId,
      deletedAt,
      async (responses) => {
        const result = await responses.update(
          {
            reviewId,
            authorId,
            deletedAt: IsNull(),
          },
          {
            status: "deleted",
            deletedAt,
            updatedAt: deletedAt,
          }
        );

        return result.affected === 1;
      }
    );
  }

  // Publication

  // Publish a draft review after the eligibility checks pass.
  // This finalizes the review and closes the request lifecycle only when the booking is still valid.
  async publishDraft({
    reviewId,
    expectedUpdatedAt,
    updatedAt,
    authorize,
  }) {
    return this.runTransaction(async (manager) => {
      const reviews = manager.getRepository(Review);
      const review = await reviews.findOne({
        where: { id: reviewId },
      });

      if (!isMatchingDraft(review, expectedUpdatedAt)) {
        return null;
      }

      await this.assertPublicationAllowed(
        manager,
        review,
        updatedAt,
        authorize
      );

      const timestamp = nextTimestamp(
        updatedAt,
        review.updated_at
      );

      const updates = {
        status: "PUBLISHED",
        publication_status: "PUBLISHED",
        updated_at: timestamp,
      };

      const result = await reviews.update(
        {
          id: reviewId,
          status: "DRAFT",
          publication_status: "UNPUBLISHED",
          updated_at: expectedUpdatedAt,
        },
        updates
      );

      if (result.affected !== 1) return null;

      await this.completeReviewRequest(
        manager,
        review,
        timestamp
      );

      return { ...review, ...updates };
    });
  }

  async assertPublicationAllowed(
    manager,
    review,
    updatedAt,
    authorize
  ) {
    if (
      typeof authorize !== "function" ||
      !(await authorize(review))
    ) {
      throw new ForbiddenException(
        "You cannot publish this review."
      );
    }

    const booking = await manager.getRepository(Booking).findOne({
      where: { id: review.booking_id },
    });

    assertEligibleBooking(
      booking,
      review.reviewer_user_id,
      updatedAt
    );

    if (
      String(booking.property_id) !== String(review.property_id) ||
      String(booking.hostid) !== String(review.host_id)
    ) {
      throw new ConflictException(
        "The reservation is no longer eligible for publication."
      );
    }
  }

  async completeReviewRequest(manager, review, timestamp) {
    await manager.getRepository(Review_Request).update(
      {
        bookingId: review.booking_id,
        reviewType: review.review_type,
        guestId: review.reviewer_user_id,
        status: "OPEN",
      },
      {
        status: "COMPLETED",
        completedAt: timestamp,
        updatedAt: timestamp,
        nextSendAt: null,
        claimedAt: null,
      }
    );
  }

  // Shared transaction helpers

  async runTransaction(callback) {
    const dataSource = await Database.getInstance();

    return retryTransaction(dataSource, callback);
  }

  async mutateResponse(reviewId, authorId, timestamp, callback) {
    return this.runTransaction(async (manager) => {
      await this.touchResponseParent(
        manager,
        reviewId,
        authorId,
        timestamp
      );

      return callback(manager.getRepository(Review_Response));
    });
  }

  async touchResponseParent(
    manager,
    reviewId,
    authorId,
    timestamp
  ) {
    const reviews = manager.getRepository(Review);
    const review = await reviews.findOne({
      where: { id: reviewId },
    });

    assertHostResponseAccess(review, authorId);

    // A shared parent write serializes concurrent response mutations.
    const result = await reviews.update(
      {
        id: reviewId,
        host_id: authorId,
        status: "PUBLISHED",
        publication_status: "PUBLISHED",
        updated_at: review.updated_at,
      },
      {
        updated_at: nextTimestamp(timestamp, review.updated_at),
      }
    );

    if (result.affected !== 1) {
      throw new ConflictException(
        "Review changed. Retry your response."
      );
    }
  }

  // Public review details and summaries

  async attachPublicDetails(dataSource, reviews) {
    if (!reviews.length) return reviews;

    const reviewIds = reviews.map((review) => review.id);

    const [ratings, responses] = await Promise.all([
      dataSource.getRepository(Review_Rating).find({
        where: { reviewId: In(reviewIds) },
      }),
      dataSource.getRepository(Review_Response).find({
        where: {
          reviewId: In(reviewIds),
          status: "published",
          deletedAt: IsNull(),
        },
      }),
    ]);

    const ratingsByReview = this.groupRatings(ratings);
    const responsesByReview = new Map(
      responses.map((response) => [response.reviewId, response])
    );

    return reviews.map((review) => ({
      ...review,
      categoryRatings: ratingsByReview.get(review.id) || {},
      response: responsesByReview.get(review.id) || null,
    }));
  }

  groupRatings(ratings) {
    const grouped = new Map();

    for (const rating of ratings) {
      if (!grouped.has(rating.reviewId)) {
        grouped.set(rating.reviewId, Object.create(null));
      }

      grouped.get(rating.reviewId)[rating.category] =
        Number(rating.rating);
    }

    return grouped;
  }

  filterPublicReviews(reviews, verifiedOnly, category) {
    return reviews.filter(
      (review) =>
        (!verifiedOnly ||
          review.verification_status === "VERIFIED_STAY") &&
        (!category ||
          review.categoryRatings?.[category] !== undefined)
    );
  }

  sortPublicReviews(reviews, sort) {
    reviews.sort((a, b) => {
      let ratingOrder = 0;

      if (sort === "highest") {
        ratingOrder =
          Number(b.overall_rating) - Number(a.overall_rating);
      } else if (sort === "lowest") {
        ratingOrder =
          Number(a.overall_rating) - Number(b.overall_rating);
      }

      return (
        ratingOrder ||
        Number(b.created_at) - Number(a.created_at) ||
        b.id.localeCompare(a.id)
      );
    });
  }

  buildPublicSummary(reviews) {
    return {
      reviews: reviews.map(toPublicReview),
      totalReviews: reviews.length,
      overallRating: average(
        reviews.map((review) => review.overall_rating)
      ),
      categoryRatings: this.calculateCategoryAverages(reviews),
    };
  }

  calculateCategoryAverages(reviews) {
    const categories = new Map();

    for (const review of reviews) {
      for (const [key, rating] of Object.entries(
        review.categoryRatings || {}
      )) {
        if (!categories.has(key)) categories.set(key, []);

        categories.get(key).push(rating);
      }
    }

    return Object.fromEntries(
      [...categories].map(([key, ratings]) => [
        key,
        average(ratings),
      ])
    );
  }
}
