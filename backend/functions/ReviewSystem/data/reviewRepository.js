import { randomInt, randomUUID } from "node:crypto";
import Database from "database";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { Review_Request } from "database/models/Review_Request";

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

}
