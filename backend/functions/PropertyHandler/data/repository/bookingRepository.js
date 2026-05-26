import Database from "database";
import { Booking } from "database/models/Booking";
import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { BookingMapping } from "../../util/mapping/booking.js";
import { buildBlockedDateKeys } from "../../util/calendarAvailability.js";

const NON_BLOCKING_BOOKING_STATUSES = ["Failed", "Declined", "Inquiry", "Cancelled", "Canceled"];

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
