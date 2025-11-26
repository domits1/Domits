import Database from "database";
import { Booking } from "database/models/Booking";
import { Property } from "database/models/Property";
import { Stripe_Connected_Accounts } from "database/models/Stripe_Connected_Accounts";

export class Repository {
  async getBookedNights(cognitoUserId, startDate = null, endDate = null) {
    const client = await Database.getInstance();
    let query = client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.hostId = :hostId", { hostId: cognitoUserId });

    if (startDate && endDate) {
      query = query.andWhere(`to_timestamp(booking."arrivaldate" / 1000) BETWEEN :startDate AND :endDate`, {
        startDate,
        endDate,
      });
    }

    const result = await query
      .select(
        `
        SUM(
          DATE_PART('day', to_timestamp(booking."departuredate" / 1000) - to_timestamp(booking."arrivaldate" / 1000))
        ) AS "bookedNights"
      `
      )
      .getRawOne();

    return { bookedNights: Number(result?.bookedNights ?? 0) };
  }

  async getBaseRate(cognitoUserId) {
    const client = await Database.getInstance();

    const result = await client
      .getRepository(Property)
      .createQueryBuilder("p")
      .innerJoin("property_pricing", "pp", "pp.property_id = p.id")
      .where("p.hostId = :hostId", { hostId: cognitoUserId })
      .select(
        `
      p.id AS "propertyId",
      pp.roomRate AS "baseRate"
    `
      )
      .getRawMany();

    return result.map((row) => ({
      propertyId: row.propertyId,
      baseRate: Number(row.baseRate),
    }));
  }

  async getExistingStripeRevenueAccount(cognitoUserId) {
    const client = await Database.getInstance();
    const record = await client
      .getRepository(Stripe_Connected_Accounts)
      .createQueryBuilder("stripe_accounts")
      .where("stripe_accounts.user_id = :user_id", { user_id: cognitoUserId })
      .getOne();

    return record;
  }

  async getAvailableNights(cognitoUserId, startDate = null, endDate = null) {
    const client = await Database.getInstance();

    const now = new Date();
    const year = now.getFullYear();

    const periodStart = startDate ? new Date(startDate) : new Date(year, 0, 1, 0, 0, 0, 0);

    const periodEndExclusive = endDate
      ? new Date(
          new Date(endDate).getFullYear(),
          new Date(endDate).getMonth(),
          new Date(endDate).getDate() + 1, 0, 0, 0, 0)
      : new Date(year + 1, 0, 1, 0, 0, 0, 0);

    const propertyRepo = client.getRepository("property");
    const bookingRepo = client.getRepository("booking");

    const propertyCount = await propertyRepo
      .createQueryBuilder("p")
      .where("p.hostId = :hostId", { hostId: cognitoUserId })
      .getCount();

    if (propertyCount === 0) return { availableNights: 0 };

    const bookedResult = await bookingRepo
      .createQueryBuilder("b")
      .where("b.hostid = :hostId", { hostId: cognitoUserId })
      .andWhere(
        `(
        to_timestamp(b."departuredate" / 1000) > :periodStart
        AND to_timestamp(b."arrivaldate" / 1000) < :periodEndExclusive
      )`,
        { periodStart, periodEndExclusive }
      )
      .select(
        `
      SUM(
        GREATEST(
          0,
          DATE_PART(
            'day',
            LEAST(to_timestamp(b."departuredate" / 1000), :periodEndExclusive)
            - GREATEST(to_timestamp(b."arrivaldate" / 1000), :periodStart)
          )
        )
      ) AS "bookedNights"
    `
      )
      .setParameters({ periodStart, periodEndExclusive })
      .getRawOne();

    const bookedNights = Number(bookedResult?.bookedNights ?? 0);

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const daysInPeriod = (periodEndExclusive - periodStart) / MS_PER_DAY;

    const totalPossibleNights = daysInPeriod * propertyCount;
    const availableNights = totalPossibleNights - bookedNights;

    return { availableNights: Math.max(Math.round(availableNights), 0) };
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

  async getAverageLengthOfStay(cognitoUserId, startDate = null, endDate = null) {
    const client = await Database.getInstance();
    let query = client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.hostId = :hostId", { hostId: cognitoUserId });

    if (startDate && endDate) {
      query = query.andWhere(`to_timestamp(booking."arrivaldate" / 1000) BETWEEN :startDate AND :endDate`, {
        startDate,
        endDate,
      });
    }

    const result = await query
      .select(
        `
        AVG(
          DATE_PART('day', to_timestamp(booking."departuredate" / 1000) - to_timestamp(booking."arrivaldate" / 1000))
        ) AS "averageLengthOfStay"
      `
      )
      .getRawOne();

    return { averageLengthOfStay: Number(result?.averageLengthOfStay ?? 0) };
  }
}