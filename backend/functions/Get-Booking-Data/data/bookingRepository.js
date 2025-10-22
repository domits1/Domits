import Database from "database";
import { Booking } from "database/models/Booking";
import "dotenv/config";
  
export default class BookingRepository {
  constructor() {}

  async getBookingByGuestId(cognitoUserId) {
    const client = await Database.getInstance();
    const record = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.guestId = :user_id AND booking.status = :status", { user_id: cognitoUserId, status: "Paid" })
      .getMany();

    return record;
  }
}