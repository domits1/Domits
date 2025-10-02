import Database from "database";
import { Booking } from "database/models/Booking";
import { Property } from "database/models/Property";
import { Property_Availability } from "database/models/Property_Availability";

export class Repository {
  async getTotalRevenue(cognitoUserId) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .innerJoin("property_pricing", "pp", "pp.property_id = booking.property_id")
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

    return { totalRevenue: Number(result?.totalRevenue ?? 0) };
  }

  async getBookedNights(cognitoUserId) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.hostId = :hostId", { hostId: cognitoUserId })
      .select(
        `
        SUM(DATE_PART('day',
          to_timestamp(booking."departuredate" / 1000) - to_timestamp(booking."arrivaldate" / 1000)
        )) AS "bookedNights"
      `
      )
      .getRawOne();

    return { bookedNights: Number(result?.bookedNights ?? 0) };
  }

  async getAvailableNights(cognitoUserId) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Property_Availability)
      .createQueryBuilder("pa")
      .innerJoin("property", "p", "p.id = pa.property_id")
      .where("p.hostId = :hostId", { hostId: cognitoUserId })
      .select(
        `
        SUM(DATE_PART('day',
          to_timestamp(pa."availableenddate" / 1000) - to_timestamp(pa."availablestartdate" / 1000)
        )) AS "availableNights"
      `
      )
      .getRawOne();

    return { availableNights: Number(result?.availableNights ?? 0) };
  }

  async getProperties(cognitoUserId) {
    const client = await Database.getInstance();
    const count = await client
      .getRepository(Property)
      .createQueryBuilder("p")
      .where("p.hostId = :hostId", { hostId: cognitoUserId })
      .getCount();

    return { propertyCount: count };
  }

}
