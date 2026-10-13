<<<<<<< HEAD
import { randomInt, randomUUID } from "node:crypto";
=======

import { randomUUID } from "node:crypto";
import { In, IsNull, Not } from "typeorm";
>>>>>>> 6b844362778b4f7f14a2467f70ffd7316b3deede
import Database from "database";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { Review_Request } from "database/models/Review_Request";
<<<<<<< HEAD
=======
import { Review_Response } from "database/models/Review_Response";
>>>>>>> 6b844362778b4f7f14a2467f70ffd7316b3deede

const MAX_TRANSACTION_ATTEMPTS = 3;

const retryTransaction = async (dataSource, callback, attempt = 1) => {
  try {
    return await dataSource.transaction(callback);
  } catch (error) {
    const databaseError = error?.driverError || error;
    if (databaseError?.code !== "40001" || attempt >= MAX_TRANSACTION_ATTEMPTS) {
      throw error;
    }
    const delayMs = 25 * 2 ** (attempt - 1) + randomInt(25);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retryTransaction(dataSource, callback, attempt + 1);
  }
};

<<<<<<< HEAD
=======
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

>>>>>>> 6b844362778b4f7f14a2467f70ffd7316b3deede
export class ReviewRepository {
  async findById(id) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Review).findOne({ where: { id } });
  }

  async findForUser(userId, scope) {
    const dataSource = await Database.getInstance();
    const field = scope === "written" ? "review.reviewer_user_id" : "review.reviewee_user_id";
    const query = dataSource.getRepository(Review).createQueryBuilder("review")
      .where(`${field} = :userId`, { userId })
      .andWhere("review.status <> :deleted", { deleted: "DELETED" })
      .orderBy("review.created_at", "DESC")
      .addOrderBy("review.id", "DESC");
    if (scope === "received") {
      query.andWhere("review.publication_status = :published", { published: "PUBLISHED" })
        .andWhere("review.status <> :draft", { draft: "DRAFT" });
    }
    return query.getMany();
  }

  async softDelete(id, reviewerUserId, updatedAt) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Review).createQueryBuilder().update(Review)
      .set({ status: "DELETED", updated_at: updatedAt })
      .where("id = :id", { id })
      .andWhere("reviewer_user_id = :reviewerUserId", { reviewerUserId })
      .andWhere("status <> :deleted", { deleted: "DELETED" })
      .execute();
  }

  async findPublicForProperty(propertyId, { limit, offset }) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Review).createQueryBuilder("review")
      .select(["review.id", "review.property_id", "review.overall_rating", "review.title",
        "review.public_review", "review.created_at"])
      .where("review.property_id = :propertyId", { propertyId })
      .andWhere("review.review_type = :reviewType", { reviewType: "GUEST_TO_PROPERTY" })
      .andWhere("review.publication_status = :published", { published: "PUBLISHED" })
      .andWhere("review.status NOT IN (:...excluded)", { excluded: ["DELETED", "DRAFT"] })
      .orderBy("review.created_at", "DESC").addOrderBy("review.id", "DESC")
      .skip(offset).take(limit).getMany();
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

<<<<<<< HEAD
=======
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

>>>>>>> 6b844362778b4f7f14a2467f70ffd7316b3deede
  async create(record, categoryRatings = {}) {
    const dataSource = await Database.getInstance();
    return retryTransaction(dataSource, async (manager) => {
      const review = await manager.getRepository(Review).save(record);
      const ratings = Object.entries(categoryRatings).map(([category, rating]) => ({
        id: randomUUID(), reviewId: record.id, category, rating, createdAt: record.created_at,
      }));
      if (ratings.length) await manager.getRepository(Review_Rating).save(ratings);
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

<<<<<<< HEAD
=======
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
>>>>>>> 6b844362778b4f7f14a2467f70ffd7316b3deede
}
