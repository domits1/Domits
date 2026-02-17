import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { BookingMapping } from "../../util/mapping/booking.js";
import { isTestMode } from "../../../../util/isTestMode.js";

// Deterministic test booking fixture
const TEST_BOOKING = {
  id: "test-booking-id",
  property_id: "42a335b3-e72e-49ee-bc8d-ed61e9bd35e5",
  guest_id: "test-guest-id-67890",
  status: "Paid",
  check_in_date: "2024-01-01",
  check_out_date: "2024-01-07",
  total_price: 1000,
  currency: "EUR"
};

export class BookingRepository {

  constructor(dynamoDbClient, systemManager) {
    this.dynamoDbClient = dynamoDbClient;
    this.systemManager = systemManager;
  }

  async getBookingById(id) {
    // In TEST mode, return deterministic booking fixture
    if (isTestMode()) {
      return TEST_BOOKING;
    }

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
