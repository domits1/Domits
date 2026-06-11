import { jest } from "@jest/globals";

import ChannexBookingAvailabilityClient, {
  CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/business/channexBookingAvailabilityClient.js";

const encodeLambdaResponse = (body) =>
  new TextEncoder().encode(
    JSON.stringify({
      statusCode: 200,
      body: JSON.stringify(body),
    })
  );

describe("ChannexBookingAvailabilityClient", () => {
  const originalToken = process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN;

  beforeEach(() => {
    process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN = "internal-token";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN;
    } else {
      process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN = originalToken;
    }
  });

  it("invokes UnifiedMessaging with the existing synthetic HTTP event and returns evidence", async () => {
    const evidence = {
      syncType: "booking-availability",
      bookingId: "booking-1",
      overallSuccess: true,
    };
    const lambda = {
      send: jest.fn().mockResolvedValue({ Payload: encodeLambdaResponse(evidence) }),
    };
    const client = new ChannexBookingAvailabilityClient({ lambda });
    const payload = { trigger: "BOOKING_CREATED", bookingAfter: { id: "booking-1" } };

    await expect(client.syncAvailabilityForBookingChange(payload)).resolves.toEqual(evidence);

    const command = lambda.send.mock.calls[0][0];
    expect(command.input.FunctionName).toBe("UnifiedMessaging");
    expect(JSON.parse(command.input.Payload)).toEqual({
      httpMethod: "POST",
      path: "/integrations/channex/booking-availability/sync",
      headers: { "x-domits-internal-token": "internal-token" },
      queryStringParameters: {},
      body: JSON.stringify(payload),
    });
  });

  it("keeps the existing fallback evidence when Lambda reports a function error", async () => {
    const lambda = {
      send: jest.fn().mockResolvedValue({
        FunctionError: "Unhandled",
        Payload: new TextEncoder().encode(
          JSON.stringify({
            statusCode: 500,
            body: JSON.stringify({ message: "Sync failed." }),
          })
        ),
      }),
    };
    const client = new ChannexBookingAvailabilityClient({ lambda, functionName: "CustomUnifiedMessaging" });

    const result = await client.syncAvailabilityForBookingChange({
      bookingAfter: { id: "booking-1", property_id: "property-1" },
    });

    expect(lambda.send.mock.calls[0][0].input.FunctionName).toBe("CustomUnifiedMessaging");
    expect(result).toEqual(
      expect.objectContaining({
        bookingId: "booking-1",
        domitsPropertyId: "property-1",
        skipped: false,
        reason: CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED,
        overallSuccess: false,
        errors: [
          {
            code: "Unhandled",
            message: "Sync failed.",
            httpStatus: 500,
          },
        ],
      })
    );
  });

  it("does not invoke Lambda when the internal token is missing", async () => {
    delete process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN;
    const lambda = { send: jest.fn() };
    const client = new ChannexBookingAvailabilityClient({ lambda });

    const result = await client.syncAvailabilityForBookingChange({ bookingAfter: { id: "booking-1" } });

    expect(lambda.send).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        skipped: true,
        reason: "CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN_MISSING",
      })
    );
  });
});
