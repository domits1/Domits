import { randomUUID } from "node:crypto";
import Database from "database";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { Review_Request } from "database/models/Review_Request";

const MAX_TRANSACTION_ATTEMPTS = 3;

const retryTransaction = async (dataSource, callback) => {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt++) {
    try {
      return await dataSource.transaction(callback);
    } catch (error) {
      const databaseError = error?.driverError || error;
      if (databaseError?.code !== "40001" || attempt === MAX_TRANSACTION_ATTEMPTS) {
        throw error;
      }

      // Replay all writes in a new transaction after the failed attempt rolls back.
      const delayMs = 25 * 2 ** (attempt - 1) + Math.floor(Math.random() * 25);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

export class ReviewRepository {
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

}
