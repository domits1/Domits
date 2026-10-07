
import { randomUUID } from "node:crypto";
import { In, IsNull, Not } from "typeorm";
import Database from "database";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";
import { Property } from "database/models/Property";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { Review_Request } from "database/models/Review_Request";
import { Review_Response } from "database/models/Review_Response";
import { Team_Member } from "database/models/Team_Member";
import { NotFoundException } from "../util/exception/notFoundException.js";
import { ConflictException } from "../util/exception/conflictException.js";

const REVIEW_FIELDS = ["id", "booking_id", "property_id", "title", "overall_rating", "public_review",
  "created_at", "updated_at", "status", "verification_status", "publication_status", "review_type"];

const average = (values) => {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length ? Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length * 10) / 10 : null;
};

// Allowlist public fields independently of repository projections to prevent private-data leaks.
const toPublicReview = (review) => ({
  id: review.id, overallRating: Number(review.overall_rating), title: review.title,
  publicReview: review.public_review, verificationStatus: review.verification_status,
  status: review.status, createdAt: review.created_at, categoryRatings: review.categoryRatings || {},
  response: review.response?.status === "published" && review.response.deletedAt == null
    ? { id: review.response.id, authorRole: review.response.authorRole,
      message: review.response.message, publishedAt: review.response.publishedAt }
    : null,
});

export class ReviewRepository {
  eligibleReviewQuery(database, propertyId) {
    return database.getRepository(Review).createQueryBuilder("review")
      .where(propertyId === undefined ? "1 = 1" : "review.property_id = :propertyId", { propertyId })
      .andWhere("review.verification_status = :verificationStatus", { verificationStatus: "VERIFIED" })
      .andWhere("review.publication_status = :publicationStatus", { publicationStatus: "PUBLISHED" })
      .andWhere("review.status = :status", { status: "PUBLISHED" })
      .andWhere("review.review_type = :reviewType", { reviewType: "GUEST_TO_PROPERTY" })
      .andWhere("review.overall_rating BETWEEN :minimum AND :maximum", { minimum: 1, maximum: 5 })
      .andWhere("review.overall_rating = FLOOR(review.overall_rating)");
  }

  hostResponseQuery(database, username) {
    return this.eligibleReviewQuery(database)
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
        const status = action === "edit" ? existing.status : action === "publish" ? "published" : "draft";
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

  filteredPublicReviewQuery(database, propertyId, filters = {}) {
    const query = this.eligibleReviewQuery(database, propertyId)
      .innerJoin(Property, "property", "property.id = review.property_id AND property.status = :propertyStatus",
        { propertyStatus: "ACTIVE" })
      .andWhere("review.overall_rating BETWEEN :filterMinimum AND :filterMaximum", {
        filterMinimum: filters.minRating ?? 1, filterMaximum: filters.maxRating ?? 5,
      });
    if (filters.start !== undefined) query.andWhere("review.created_at >= :filterStart", { filterStart: filters.start });
    if (filters.endExclusive !== undefined) query.andWhere("review.created_at < :filterEnd", { filterEnd: filters.endExclusive });
    return query;
  }

  async getPublicReviewPage(propertyId, offset, filters = {}) {
    const database = await Database.getInstance();
    const property = await database.getRepository(Property).findOne({
      where: { id: propertyId, status: "ACTIVE" }, select: ["id"],
    });
    if (!property) return null;
    const eligible = () => this.filteredPublicReviewQuery(database, propertyId, filters);
    const summary = await eligible().select("AVG(review.overall_rating)", "score")
      .addSelect("COUNT(*)", "count").getRawOne();
    const page = eligible().select(["review.id", "review.overall_rating", "review.public_review", "review.created_at"]);
    const recent = !filters.sort || filters.sort === "recent";
    if (filters.sort === "highest" || filters.sort === "lowest") {
      page.orderBy("review.overall_rating", filters.sort === "highest" ? "DESC" : "ASC")
        .addOrderBy("review.created_at", "DESC");
    } else {
      page.orderBy("review.created_at", "DESC");
      if (filters.cursor) page.andWhere(
        "(review.created_at < :cursorDate OR (review.created_at = :cursorDate AND review.id < :cursorId))",
        { cursorDate: filters.cursor.date, cursorId: filters.cursor.id });
    }
    // Fetch one extra row to detect another page without applying the cursor to the matching count.
    const rows = await page.addOrderBy("review.id", "DESC").offset(offset).limit(recent ? 11 : 10).getMany();
    const reviews = rows.slice(0, 10), last = reviews[reviews.length - 1];
    const nextCursor = recent && rows.length > 10 ? Buffer.from(JSON.stringify({
      propertyId, date: Number(last.created_at), id: last.id,
    })).toString("base64url") : null;
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
      review_count: count, next_offset: !filters.cursor && offset + 10 < count ? offset + 10 : null,
      next_cursor: nextCursor,
      reviews: reviews.map((review) => ({ id: review.id, rating: review.overall_rating,
        text: review.public_review, date: Number(review.created_at), verified: true,
        response: responses.filter((response) => response.reviewId === review.id)
          .map(({ message, publishedAt }) => ({ message, publishedAt }))[0] || null,
        categories: ratings.filter((rating) => rating.review_id === review.id)
          .map(({ key, label, rating }) => ({ key, label, rating: Number(rating) })) })) };
  }

  async getPropertyReviewPerformance(propertyId, hostId, start, endExclusive, interval = "month") {
    // Fixed expressions keep the requested interval out of SQL interpolation.
    const expressions = {
      week: "DATE_TRUNC('week', TO_TIMESTAMP(review.created_at / 1000.0) AT TIME ZONE 'UTC')",
      month: "DATE_TRUNC('month', TO_TIMESTAMP(review.created_at / 1000.0) AT TIME ZONE 'UTC')",
      year: "DATE_TRUNC('year', TO_TIMESTAMP(review.created_at / 1000.0) AT TIME ZONE 'UTC')",
    };
    if (!["week", "month", "year"].includes(interval)) throw new TypeError("Unsupported review interval.");
    const period = expressions[interval];
    const database = await Database.getInstance();
    // Recheck property ownership during aggregation, using the shared eligibility filters.
    return this.eligibleReviewQuery(database, propertyId)
      .innerJoin(Property, "property",
        "property.id = review.property_id AND property.hostid = :hostId", { hostId })
      .andWhere("review.created_at >= :start", { start })
      .andWhere("review.created_at < :endExclusive", { endExclusive })
      .select(`TO_CHAR(${period}, 'YYYY-MM-DD')`, "period")
      .addSelect("AVG(review.overall_rating)", "average_score")
      .addSelect("COUNT(*)", "review_count")
      .groupBy(period).orderBy(period, "ASC").getRawMany();
  }

  async getPropertyCategoryRatings(propertyId, hostId) {
    const database = await Database.getInstance();
    const rows = await database.getRepository(Review_Category).createQueryBuilder("category")
      .innerJoin(Property, "property", "property.id = :propertyId AND property.hostid = :hostId")
      .leftJoin((query) => query
        .select("rating.category", "category_key")
        .addSelect("AVG(rating.rating)", "average_rating")
        .addSelect("COUNT(*)", "rating_count")
        .from(Review_Rating, "rating")
        .innerJoin(Review, "review", "review.id = rating.reviewId")
        .where("review.property_id = :propertyId")
        .andWhere("review.verification_status = :verified")
        .andWhere("review.publication_status = :published")
        .andWhere("review.status = :published")
        .andWhere("review.review_type = :reviewType")
        .andWhere("rating.rating BETWEEN :minimum AND :maximum")
        .andWhere("rating.rating * 2 = FLOOR(rating.rating * 2)")
        .groupBy("rating.category"),
      "aggregate", "aggregate.category_key = category.key")
      .select("category.key", "category_key")
      .addSelect("category.label", "label")
      .addSelect("aggregate.average_rating", "average_rating")
      .addSelect("COALESCE(aggregate.rating_count, 0)", "rating_count")
      .where("category.isActive = :active")
      .andWhere("category.reviewType = :reviewType")
      .setParameters({ propertyId, hostId, verified: "VERIFIED", published: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY",
        minimum: 1, maximum: 5, active: true })
      .orderBy("category.key", "ASC").getRawMany();
    return rows.map((row) => ({ category_key: row.category_key, label: row.label,
      average_rating: Number(row.rating_count) === 0 ? null : Number(row.average_rating),
      rating_count: Number(row.rating_count) }));
  }

  async findManagedProperty(propertyId, hostId) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Property).findOne({
      where: { id: propertyId, hostid: hostId }, select: ["id"],
    });
  }

  async findManagedProperties(hostId, offset) {
    const database = await Database.getInstance();
    return database.getRepository(Property).find({ where: { hostid: hostId }, select: ["id"],
      order: { id: "ASC" }, skip: offset, take: 26 });
  }

  async getPropertyReviewScore(propertyId, hostId, range) {
    const dataSource = await Database.getInstance();
    // Recheck ownership during aggregation in case the property changed owners.
    const query = this.eligibleReviewQuery(dataSource, propertyId)
      .innerJoin(Property, "property",
        "property.id = review.property_id AND property.hostid = :hostId", { hostId })
      .select("AVG(review.overall_rating)", "overall_score")
      .addSelect("COUNT(*)", "review_count");
    if (range) {
      query.andWhere("review.created_at >= :start", { start: range.start })
        .andWhere("review.created_at < :endExclusive", { endExclusive: range.endExclusive });
    }
    const result = await query.getRawOne();
    const reviewCount = Number(result.review_count);
    return { property_id: propertyId,
      overall_score: reviewCount === 0 ? null : Number(result.overall_score), review_count: reviewCount };
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
      .set({ overall_rating: overallRating, public_review: publicReview, updated_at: updatedAt })
      .where("id = :id AND reviewer_user_id = :guestId", { id, guestId })
      .andWhere("updated_at = :previousUpdatedAt", { previousUpdatedAt })
      .andWhere("created_at <= :timestamp AND created_at > :cutoff", {
        timestamp, cutoff: timestamp - editWindowMs,
      })
      .execute();
    return { affected: result.affected, updated_at: updatedAt };
  }

  async findBookingById(bookingId) {

    const dataSource = await Database.getInstance();

    return await dataSource
      .getRepository(Booking)
      .findOne({ where: { id: bookingId } });
  }

  async findReviewByBookingTypeAndReviewer(key) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Review).findOne({ where: key, select: ["id"] });
  }

  async findActiveCategoryKeys(reviewType) {
    const dataSource = await Database.getInstance();
    const categories = await dataSource.getRepository(Review_Category).find({
      where: { reviewType, isActive: true }, select: ["key"],
    });
    return new Set(categories.map((category) => category.key));
  }

  async findReviews(where) {
    const dataSource = await Database.getInstance();
    const visibleWhere = (Array.isArray(where) ? where : [where]).map((filter) => ({
      ...filter, status: filter.status ?? Not("REJECTED"),
    }));
    const reviews = await dataSource.getRepository(Review).find({
      where: Array.isArray(where) ? visibleWhere : visibleWhere[0], order: { created_at: "DESC", id: "DESC" },
      select: REVIEW_FIELDS });
    return this.attachPublicDetails(dataSource, reviews);
  }

  async deleteOwnReview(id, reviewerUserId, now) {
    const dataSource = await Database.getInstance();
    // Preserve ratings, responses, feedback and audit records, as in the established workflow.
    return dataSource.getRepository(Review).update({ id, reviewer_user_id: reviewerUserId }, {
      status: "REJECTED", publication_status: "REJECTED", updated_at: now,
    });
  }

  async create(record, categoryRatings = {}) {
    const dataSource = await Database.getInstance();
    return dataSource.transaction(async (manager) => {
      const review = await manager.getRepository(Review).save(record);
      const ratings = Object.entries(categoryRatings).map(([category, rating]) => ({
        id: randomUUID(), reviewId: record.id, category, rating, createdAt: record.created_at,
      }));
      if (ratings.length) await manager.getRepository(Review_Rating).save(ratings);
      // Drafts leave their review request open and do not claim verified-stay evidence.
      await manager.getRepository(Review_Request).createQueryBuilder().insert().values({
        id: randomUUID(), bookingId: record.booking_id, propertyId: record.property_id,
        hostId: record.host_id, guestId: record.reviewer_user_id, reviewType: record.review_type,
        status: "OPEN", requestedAt: record.created_at,
        expiresAt: record.created_at + 30 * 24 * 60 * 60 * 1000,
        completedAt: null, createdAt: record.created_at, updatedAt: record.updated_at,
      }).orIgnore().execute();
      return review;
    });
  }

  async attachPublicDetails(dataSource, reviews) {
    if (!reviews.length) return reviews;
    const reviewIds = reviews.map((review) => review.id);
    const [ratings, responses] = await Promise.all([
      dataSource.getRepository(Review_Rating).find({ where: { reviewId: In(reviewIds) } }),
      dataSource.getRepository(Review_Response).find({
        where: { reviewId: In(reviewIds), status: "published", deletedAt: IsNull() },
      }),
    ]);
    return reviews.map((review) => ({ ...review,
      categoryRatings: Object.fromEntries(ratings.filter((rating) => rating.reviewId === review.id)
        .map((rating) => [rating.category, Number(rating.rating)])),
      response: responses.find((response) => response.reviewId === review.id) || null,
    }));
  }

  async findPublicPropertyReviews(propertyId, { sort = "recent", verifiedOnly = false, category = null } = {}) {
    const reviews = await this.findReviews({ property_id: propertyId, review_type: "GUEST_TO_PROPERTY",
      status: "PUBLISHED", publication_status: "PUBLISHED" });
    const filtered = reviews.filter((review) => (!verifiedOnly || review.verification_status === "VERIFIED_STAY") &&
      (!category || review.categoryRatings?.[category] !== undefined));
    filtered.sort((a, b) => {
      const ratingOrder = sort === "highest" ? Number(b.overall_rating) - Number(a.overall_rating)
        : sort === "lowest" ? Number(a.overall_rating) - Number(b.overall_rating) : 0;
      return ratingOrder || Number(b.created_at) - Number(a.created_at) || b.id.localeCompare(a.id);
    });
    const categories = {};
    for (const review of filtered) {
      for (const [key, rating] of Object.entries(review.categoryRatings || {})) {
        (categories[key] ||= []).push(rating);
      }
    }
    return { reviews: filtered.map(toPublicReview), totalReviews: filtered.length,
      overallRating: average(filtered.map((review) => review.overall_rating)),
      categoryRatings: Object.fromEntries(Object.entries(categories).map(([key, ratings]) => [key, average(ratings)])),
    };
  }
}
