import Database from "database";
import { Booking } from "database/models/Booking";

export class Repository {
  async getRevenue(cognitoUserId) {
    const client = await Database.getInstance();

    const result = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .innerJoin("property", "pt", "pt.id = booking.property_id")
      .innerJoin("property_pricing", "pp", "pp.property_id = pt.id")
      .where("booking.hostId = :hostId", { hostId: cognitoUserId })
      .select(
        `
        SUM(
          (DATE_PART('day', to_timestamp(booking."departuredate" / 1000) - to_timestamp(booking."arrivaldate" / 1000)) * pp.roomRate)
          + pp.cleaning
        ) AS "totalRevenue"
        `
      )
      .getRawOne();

    return { totalRevenue: result.totalRevenue };
  }
}
