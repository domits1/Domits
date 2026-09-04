import ChannexBookingAvailabilityClient, {
  CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/business/channexBookingAvailabilityClient.js";
import {
  createLambdaMock,
  expectChannexLambdaInvocation,
  expectMissingInternalTokenSkip,
  useChannexLambdaClientTestEnvironment,
} from "../util/channexLambdaClientTestUtils.js";

const CHANNEL_MANAGEMENT_FUNCTION_NAME_ENV = "CHANNEL_MANAGEMENT_FUNCTION_NAME";
const UNIFIED_MESSAGING_FUNCTION_NAME_ENV = "UNIFIED_MESSAGING_FUNCTION_NAME";

describe("ChannexBookingAvailabilityClient", () => {
  useChannexLambdaClientTestEnvironment();
  const originalChannelManagementFunctionName = process.env[CHANNEL_MANAGEMENT_FUNCTION_NAME_ENV];
  const originalUnifiedMessagingFunctionName = process.env[UNIFIED_MESSAGING_FUNCTION_NAME_ENV];

  beforeEach(() => {
    delete process.env[CHANNEL_MANAGEMENT_FUNCTION_NAME_ENV];
    delete process.env[UNIFIED_MESSAGING_FUNCTION_NAME_ENV];
  });

  afterAll(() => {
    if (originalChannelManagementFunctionName === undefined) {
      delete process.env[CHANNEL_MANAGEMENT_FUNCTION_NAME_ENV];
    } else {
      process.env[CHANNEL_MANAGEMENT_FUNCTION_NAME_ENV] = originalChannelManagementFunctionName;
    }

    if (originalUnifiedMessagingFunctionName === undefined) {
      delete process.env[UNIFIED_MESSAGING_FUNCTION_NAME_ENV];
    } else {
      process.env[UNIFIED_MESSAGING_FUNCTION_NAME_ENV] = originalUnifiedMessagingFunctionName;
    }
  });

  it("uses ChannelManagement when CHANNEL_MANAGEMENT_FUNCTION_NAME is set", async () => {
    process.env[CHANNEL_MANAGEMENT_FUNCTION_NAME_ENV] = "ChannelManagement";
    process.env[UNIFIED_MESSAGING_FUNCTION_NAME_ENV] = "UnifiedMessaging";
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
      functionName: "ChannelManagement",
    });
  });

  it("falls back to UNIFIED_MESSAGING_FUNCTION_NAME when ChannelManagement env var is absent", async () => {
    process.env[UNIFIED_MESSAGING_FUNCTION_NAME_ENV] = "CustomUnifiedMessaging";
    const evidence = {
      syncType: "booking-availability",
      bookingId: "booking-1",
      overallSuccess: true,
    };
    const lambda = createLambdaMock({ body: evidence });
    const client = new ChannexBookingAvailabilityClient({ lambda });
    const payload = { trigger: "BOOKING_MODIFIED", bookingAfter: { id: "booking-1" } };

    await expect(client.syncAvailabilityForBookingChange(payload)).resolves.toEqual(evidence);
    expectChannexLambdaInvocation(lambda, {
      path: "/integrations/channex/booking-availability/sync",
      payload,
      functionName: "CustomUnifiedMessaging",
    });
  });

  it("falls back to UnifiedMessaging when both function env vars are absent", async () => {
    const evidence = {
      syncType: "booking-availability",
      bookingId: "booking-1",
      overallSuccess: true,
    };
    const lambda = createLambdaMock({ body: evidence });
    const client = new ChannexBookingAvailabilityClient({ lambda });
    const payload = { trigger: "BOOKING_CANCELLED", bookingAfter: { id: "booking-1" } };

    await expect(client.syncAvailabilityForBookingChange(payload)).resolves.toEqual(evidence);
    expectChannexLambdaInvocation(lambda, {
      path: "/integrations/channex/booking-availability/sync",
      payload,
      functionName: "UnifiedMessaging",
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
