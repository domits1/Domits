
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

const REVIEW_FIELDS = ["id", "booking_id", "property_id", "title", "overall_rating", "public_review",
  "created_at", "updated_at", "status", "verification_status", "publication_status"];

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
  async findManagedProperty(propertyId, hostId) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Property).findOne({
      where: { id: propertyId, hostid: hostId }, select: ["id"],
    });
  }

  async getPropertyReviewScore(propertyId, hostId) {
    const dataSource = await Database.getInstance();
    // Recheck ownership during aggregation in case the property changed owners.
    const result = await dataSource.getRepository(Review).createQueryBuilder("review")
      .innerJoin(Property, "property",
        "property.id = review.property_id AND property.hostid = :hostId", { hostId })
      .select("AVG(review.overall_rating)", "overall_score")
      .addSelect("COUNT(*)", "review_count")
      .where("review.property_id = :propertyId", { propertyId })
      .andWhere("review.verification_status = :verificationStatus", { verificationStatus: "VERIFIED" })
      .andWhere("review.publication_status = :publicationStatus", { publicationStatus: "PUBLISHED" })
      .andWhere("review.status = :status", { status: "PUBLISHED" })
      .andWhere("review.review_type = :reviewType", { reviewType: "GUEST_TO_PROPERTY" })
      .andWhere("review.overall_rating BETWEEN :minimum AND :maximum", { minimum: 1, maximum: 5 })
      .andWhere("review.overall_rating = FLOOR(review.overall_rating)")
      .getRawOne();
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
