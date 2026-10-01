
import Database from "database";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";

export class ReviewRepository {
    // Retrieves the booking associated with the given reservation ID.
    // Returns the matching booking or null when no record exists.
    async findBookingById(reservationId) {
        const dataSource = await Database.getInstance();

        return await dataSource
            .getRepository(Booking)
            .findOne({ where: { id: reservationId } });
    }

    // Persists a review record through the Review repository.
    // Returns the saved review entity.
    async create(record) {
        const dataSource = await Database.getInstance();

        return await dataSource
            .getRepository(Review)
            .save(record);
    }
}