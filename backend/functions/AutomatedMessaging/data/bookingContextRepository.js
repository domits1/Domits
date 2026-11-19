import Database from "../.shared/integrations/ORM/index.js";
import { Booking } from "database/models/Booking";
import { Property } from "database/models/Property";
import { Property_Check_In } from "database/models/Property_Check_In";
import { Property_Location } from "database/models/Property_Location";

export default class BookingContextRepository {
  async getBooking(bookingId) {
    const client = await Database.getInstance();
    return client.getRepository(Booking).findOne({ where: { id: bookingId } });
  }

  async getProperty(propertyId) {
    if (!propertyId) return null;
    const client = await Database.getInstance();
    return client.getRepository(Property).findOne({ where: { id: propertyId } });
  }

  async getPropertyCheckIn(propertyId) {
    if (!propertyId) return null;
    const client = await Database.getInstance();
    return client.getRepository(Property_Check_In).findOne({ where: { property_id: propertyId } });
  }

  async getPropertyLocation(propertyId) {
    if (!propertyId) return null;
    const client = await Database.getInstance();
    return client.getRepository(Property_Location).findOne({ where: { property_id: propertyId } });
  }

  async hostOwnsProperty(hostId, propertyId) {
    if (!propertyId) return true;
    const client = await Database.getInstance();
    const count = await client.getRepository(Property).count({ where: { id: propertyId, hostid: hostId } });
    return count === 1;
  }

  async getBookingContext(bookingId) {
    const booking = await this.getBooking(bookingId);
    if (!booking) return null;
    const [property, checkIn, location] = await Promise.all([
      this.getProperty(booking.property_id),
      this.getPropertyCheckIn(booking.property_id),
      this.getPropertyLocation(booking.property_id),
    ]);
    return { booking, property, checkIn, location };
  }
}
