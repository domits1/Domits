import Database from "database";
import { Booking } from "database/models/Booking";
import { buildBlockedDateKeys } from "../../util/calendarAvailability.js";

const NON_BLOCKING_BOOKING_STATUSES = ["Failed", "Declined", "Inquiry", "Cancelled", "Canceled"];

export class BookingRepository {

  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async getBookingById(id) {
    const client = await Database.getInstance();
    const booking = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .select(["booking.guestid", "booking.status", "booking.property_id"])
      .where("booking.id = :id", { id })
      .getOne();

    if (!booking) {
      return null;
    }

    return {
      guestId: booking.guestid,
      status: booking.status,
      property_id: booking.property_id,
    };
  }

  async getBlockedDateKeysByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const bookings = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .select(["booking.arrivaldate", "booking.departuredate"])
      .where("booking.property_id = :propertyId", { propertyId })
      .andWhere("booking.status NOT IN (:...excludedStatuses)", {
        excludedStatuses: NON_BLOCKING_BOOKING_STATUSES,
      })
      .getMany();

    return buildBlockedDateKeys(bookings);
  }

}
