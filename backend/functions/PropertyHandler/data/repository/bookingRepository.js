import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { BookingMapping } from "../../util/mapping/booking.js";

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

}