import Database from "../.shared/integrations/ORM/index.js";
import { Booking } from "database/models/Booking";

const normalizeBooking = (booking) => {
  if (!booking) return null;

  return {
    ...booking,
    id: booking.id,
    guestid: booking.guestid || booking.guestId || booking.guest_id || null,
    hostid: booking.hostid || booking.hostId || booking.host_id || null,
    property_id: booking.property_id || booking.propertyId || null,
  };
};

class BookingRepository {
  async getBookingById(bookingId) {
    if (!bookingId) return null;

    const client = await Database.getInstance();
    const booking = await client.getRepository(Booking).findOne({ where: { id: bookingId } });
    return normalizeBooking(booking);
  }

  async findBookingsForGuestHostProperty({ guestId, hostId, propertyId }) {
    if (!guestId || !hostId || !propertyId) return [];

    const client = await Database.getInstance();
    const bookings = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.guestid = :guestId", { guestId })
      .andWhere("booking.hostid = :hostId", { hostId })
      .andWhere("booking.property_id = :propertyId", { propertyId })
      .getMany();

    return bookings.map(normalizeBooking).filter(Boolean);
  }

  async findBookingsForGuestHost({ guestId, hostId }) {
    if (!guestId || !hostId) return [];

    const client = await Database.getInstance();
    const bookings = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.guestid = :guestId", { guestId })
      .andWhere("booking.hostid = :hostId", { hostId })
      .getMany();

    return bookings.map(normalizeBooking).filter(Boolean);
  }
}

export default BookingRepository;
