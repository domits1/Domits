import ChannexBookingAvailabilityClient, {
  CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/business/channexBookingAvailabilityClient.js";
import {
  createLambdaMock,
  expectChannexLambdaInvocation,
  expectMissingInternalTokenSkip,
  useChannexLambdaClientTestEnvironment,
} from "../util/channexLambdaClientTestUtils.js";

describe("ChannexBookingAvailabilityClient", () => {
  useChannexLambdaClientTestEnvironment();

  it("invokes UnifiedMessaging with the existing synthetic HTTP event and returns evidence", async () => {
    const evidence = {
      syncType: "booking-availability",
      bookingId: "booking-1",
      overallSuccess: true,
    };
    const lambda = createLambdaMock({ body: evidence });
    const client = new ChannexBookingAvailabilityClient({ lambda });
    const payload = { trigger: "BOOKING_CREATED", bookingAfter: { id: "booking-1" } };

    await expect(client.syncAvailabilityForBookingChange(payload)).resolves.toEqual(evidence);
    expectChannexLambdaInvocation(lambda, {
      path: "/integrations/channex/booking-availability/sync",
      payload,
    });
  });

  it("keeps the existing fallback evidence when Lambda reports a function error", async () => {
    const lambda = createLambdaMock({
      body: { message: "Sync failed." },
      statusCode: 500,
      functionError: "Unhandled",
    });
    const client = new ChannexBookingAvailabilityClient({ lambda, functionName: "CustomUnifiedMessaging" });
    const payload = {
      bookingAfter: { id: "booking-1", property_id: "property-1" },
    };

    const result = await client.syncAvailabilityForBookingChange(payload);

    expectChannexLambdaInvocation(lambda, {
      path: "/integrations/channex/booking-availability/sync",
      payload,
      functionName: "CustomUnifiedMessaging",
    });
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
    const lambda = createLambdaMock();
    const client = new ChannexBookingAvailabilityClient({ lambda });
    await expectMissingInternalTokenSkip({
      lambda,
      invoke: () =>
        client.syncAvailabilityForBookingChange({
          bookingAfter: { id: "booking-1" },
        }),
    });
  });
});
