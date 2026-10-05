
import Database from "database";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";
import { Property } from "database/models/Property";
import { ReviewCategory } from "database/models/ReviewCategory";
import { ReviewCategoryRating } from "database/models/ReviewCategoryRating";

export class ReviewRepository {
  eligibleReviewQuery(database, propertyId) {
    return database.getRepository(Review).createQueryBuilder("review")
      .where("review.property_id = :propertyId", { propertyId })
      .andWhere("review.verification_status = :verificationStatus", { verificationStatus: "verified" })
      .andWhere("review.publication_status = :publicationStatus", { publicationStatus: "published" })
      .andWhere("review.overall_rating BETWEEN :minimum AND :maximum", { minimum: 1, maximum: 5 })
      .andWhere("review.overall_rating = FLOOR(review.overall_rating)");
  }

  async getPublicReviewPage(propertyId, offset) {
    const database = await Database.getInstance();
    const property = await database.getRepository(Property).findOne({
      where: { id: propertyId, status: "ACTIVE" }, select: ["id"],
    });
    if (!property) return null;
    const eligible = () => this.eligibleReviewQuery(database, propertyId)
      .innerJoin(Property, "property", "property.id = review.property_id AND property.status = :status",
        { status: "ACTIVE" });
    const summary = await eligible().select("AVG(review.overall_rating)", "score")
      .addSelect("COUNT(*)", "count").getRawOne();
    const reviews = await eligible()
      .select(["review.id", "review.overall_rating", "review.public_review", "review.created_at"])
      .orderBy("review.created_at", "DESC").addOrderBy("review.id", "DESC")
      .offset(offset).limit(10).getMany();
    const ids = reviews.map((review) => review.id);
    const ratings = ids.length ? await database.getRepository(ReviewCategoryRating).createQueryBuilder("rating")
      .innerJoin(ReviewCategory, "category", "category.key = rating.category_key AND category.active = :active",
        { active: true })
      .select("rating.review_id", "review_id").addSelect("category.key", "key")
      .addSelect("category.label", "label").addSelect("rating.rating", "rating")
      .where("rating.review_id IN (:...ids)", { ids })
      .andWhere("rating.rating BETWEEN 1 AND 5")
      .andWhere("rating.rating * 2 = FLOOR(rating.rating * 2)").getRawMany() : [];
    const count = Number(summary.count);
    return { property_id: propertyId, overall_score: count ? Number(summary.score) : null,
      review_count: count, next_offset: offset + 10 < count ? offset + 10 : null,
      reviews: reviews.map((review) => ({ id: review.id, rating: review.overall_rating,
        text: review.public_review, date: Number(review.created_at), verified: true,
        categories: ratings.filter((rating) => rating.review_id === review.id)
          .map(({ key, label, rating }) => ({ key, label, rating: Number(rating) })) })) };
  }

  async getPropertyCategoryRatings(propertyId, hostId) {
    const database = await Database.getInstance();
    const rows = await database.getRepository(ReviewCategory).createQueryBuilder("category")
      .innerJoin(Property, "property", "property.id = :propertyId AND property.hostid = :hostId")
      .leftJoin((query) => query
        .select("rating.category_key", "category_key")
        .addSelect("AVG(rating.rating)", "average_rating")
        .addSelect("COUNT(*)", "rating_count")
        .from(ReviewCategoryRating, "rating")
        .innerJoin(Review, "review", "review.id = rating.review_id")
        .where("review.property_id = :propertyId")
        .andWhere("review.verification_status = :verified")
        .andWhere("review.publication_status = :published")
        .andWhere("rating.rating BETWEEN :minimum AND :maximum")
        .andWhere("rating.rating * 2 = FLOOR(rating.rating * 2)")
        .groupBy("rating.category_key"),
      "aggregate", "aggregate.category_key = category.key")
      .select("category.key", "category_key")
      .addSelect("category.label", "label")
      .addSelect("aggregate.average_rating", "average_rating")
      .addSelect("COALESCE(aggregate.rating_count, 0)", "rating_count")
      .where("category.active = :active")
      .setParameters({ propertyId, hostId, verified: "verified", published: "published",
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

  async getPropertyReviewScore(propertyId, hostId) {
    const dataSource = await Database.getInstance();
    // Recheck ownership during aggregation in case the property changed owners.
    const result = await this.eligibleReviewQuery(dataSource, propertyId)
      .innerJoin(Property, "property",
        "property.id = review.property_id AND property.hostid = :hostId", { hostId })
      .select("AVG(review.overall_rating)", "overall_score")
      .addSelect("COUNT(*)", "review_count")
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
