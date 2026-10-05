
import Database from "database";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";

export class ReviewRepository {
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
