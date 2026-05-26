import Database from "database";
import { Booking } from "database/models/Booking";
import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { BookingMapping } from "../../util/mapping/booking.js";

const NON_BLOCKING_BOOKING_STATUSES = ["Failed", "Declined", "Inquiry", "Cancelled", "Canceled"];
const UTC_DAY_IN_MS = 24 * 60 * 60 * 1000;

const normalizeTimestampLike = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    const milliseconds = numericValue > 1000000000000 ? numericValue : numericValue * 1000;
    const parsedDate = new Date(milliseconds);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  const parsedDate = new Date(String(value || ""));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const toUtcDateKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;

const buildBlockedDateKeys = (bookings) => {
  const blockedDateKeys = new Set();

  (Array.isArray(bookings) ? bookings : []).forEach((booking) => {
    const arrival = normalizeTimestampLike(booking?.arrivaldate);
    const departure = normalizeTimestampLike(booking?.departuredate);

    if (!arrival || !departure) {
      return;
    }

    const start = startOfUtcDay(arrival);
    const endExclusive = startOfUtcDay(departure);

    if (endExclusive <= start) {
      blockedDateKeys.add(toUtcDateKey(start));
      return;
    }

    for (let cursor = start.getTime(); cursor < endExclusive.getTime(); cursor += UTC_DAY_IN_MS) {
      blockedDateKeys.add(toUtcDateKey(new Date(cursor)));
    }
  });

  return Array.from(blockedDateKeys).sort((leftDateKey, rightDateKey) =>
    leftDateKey.localeCompare(rightDateKey)
  );
};

export class BookingRepository {

  constructor(dynamoDbClient, systemManager) {
    this.dynamoDbClient = dynamoDbClient;
    this.systemManager = systemManager;
  }

  async getBookingById(id) {
    const params = new GetItemCommand({
      "TableName": "booking-develop",
      "Key": {
        "id": {
          "S": id,
        },
      },
    });
    const result = await this.dynamoDbClient.send(params);
    return result.Item ? BookingMapping.mapDatabaseEntryToBooking(result.Item) : null;
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
