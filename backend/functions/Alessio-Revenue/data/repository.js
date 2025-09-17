import Database from "database";
import { Booking } from "database/models/Booking";

export class Repository {
  async getRevenue() {
    const client = await Database.getInstance();
    const response = await client

      .getRepository(Booking)
      .createQueryBuilder("booking")
      .innerJoin("property", "pt", "pt.id = booking.property_id")
      .innerJoin("payment", "py", "py.stripepaymentid = booking.paymentid")
      .where("booking.hostId = :hostId", { hostId: "0f5cc159-c8b2-48f3-bf75-114a10a1d6b3" })
      .getMany();

    return response;
  }
}
