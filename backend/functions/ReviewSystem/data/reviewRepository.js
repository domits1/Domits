
import Database from "database";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";
import { Property } from "database/models/Property";

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
      .andWhere("review.verification_status = :verificationStatus", { verificationStatus: "verified" })
      .andWhere("review.publication_status = :publicationStatus", { publicationStatus: "published" })
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
