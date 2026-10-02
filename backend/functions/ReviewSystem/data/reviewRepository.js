
import Database from "database";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";

export class ReviewRepository {
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
      .where("id = :id AND guest_id = :guestId", { id, guestId })
      .andWhere("updated_at = :previousUpdatedAt", { previousUpdatedAt })
      .andWhere("created_at <= :timestamp AND created_at > :cutoff", {
        timestamp, cutoff: timestamp - editWindowMs,
      })
      .execute();
    return { affected: result.affected, updated_at: updatedAt };
  }

  async findBookingById(reservationId) {
    const dataSource = await Database.getInstance();

    return await dataSource
      .getRepository(Booking)
      .findOne({ where: { id: reservationId } });
  }

  async findReviews(where) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Review).find({ where, order: { created_at: "DESC", id: "DESC" },
      select: ["id", "reservation_id", "property_id", "overall_rating", "public_review", "created_at", "publication_status"] });
  }

  async deleteOwnReview(id, guest_id) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Review).delete({ id, guest_id });
  }

  async create(record) {
    const dataSource = await Database.getInstance();

    return await dataSource
      .getRepository(Review)
      .save(record);
  }
}
