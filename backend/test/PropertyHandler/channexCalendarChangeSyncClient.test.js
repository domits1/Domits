import ChannexCalendarChangeSyncClient, {
  CHANNEX_CALENDAR_CHANGE_SYNC_FAILED,
} from "../../functions/PropertyHandler/business/service/channexCalendarChangeSyncClient.js";
import {
  createLambdaMock,
  expectChannexLambdaInvocation,
  expectMissingInternalTokenSkip,
  useChannexLambdaClientTestEnvironment,
} from "../util/channexLambdaClientTestUtils.js";

const CHANNEL_MANAGEMENT_FUNCTION_NAME_ENV = "CHANNEL_MANAGEMENT_FUNCTION_NAME";
const UNIFIED_MESSAGING_FUNCTION_NAME_ENV = "UNIFIED_MESSAGING_FUNCTION_NAME";

describe("ChannexCalendarChangeSyncClient", () => {
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
      syncType: "calendar-change",
      requestCount: 1,
      overallSuccess: true,
    };
    const lambda = createLambdaMock({ body: evidence });
    const client = new ChannexCalendarChangeSyncClient({ lambda });
    const payload = {
      domitsPropertyId: "property-1",
      changedDates: ["2026-06-10"],
      changeTypes: ["availability"],
    };

    await expect(client.syncCalendarChange(payload)).resolves.toEqual(evidence);
    expectChannexLambdaInvocation(lambda, {
      path: "/integrations/channex/calendar-change/sync",
      payload,
      functionName: "ChannelManagement",
    });
  });

  it("falls back to UNIFIED_MESSAGING_FUNCTION_NAME when ChannelManagement env var is absent", async () => {
    process.env[UNIFIED_MESSAGING_FUNCTION_NAME_ENV] = "CustomUnifiedMessaging";
    const evidence = {
      syncType: "calendar-change",
      requestCount: 1,
      overallSuccess: true,
    };
    const lambda = createLambdaMock({ body: evidence });
    const client = new ChannexCalendarChangeSyncClient({ lambda });
    const payload = {
      domitsPropertyId: "property-1",
      changedDates: ["2026-06-10"],
      changeTypes: ["availability"],
    };

    await expect(client.syncCalendarChange(payload)).resolves.toEqual(evidence);
    expectChannexLambdaInvocation(lambda, {
      path: "/integrations/channex/calendar-change/sync",
      payload,
      functionName: "CustomUnifiedMessaging",
    });
  });

  it("falls back to UnifiedMessaging when both function env vars are absent", async () => {
    const evidence = {
      syncType: "calendar-change",
      requestCount: 1,
      overallSuccess: true,
    };
    const lambda = createLambdaMock({ body: evidence });
    const client = new ChannexCalendarChangeSyncClient({ lambda });
    const payload = {
      domitsPropertyId: "property-1",
      changedDates: ["2026-06-10"],
      changeTypes: ["restrictions"],
    };

    await expect(client.syncCalendarChange(payload)).resolves.toEqual(evidence);
    expectChannexLambdaInvocation(lambda, {
      path: "/integrations/channex/calendar-change/sync",
      payload,
      functionName: "UnifiedMessaging",
    });
  });

  it("keeps the existing fallback evidence when Lambda returns an error response", async () => {
    const lambda = createLambdaMock({
      body: { error: "Temporarily unavailable." },
      statusCode: 503,
    });
    const client = new ChannexCalendarChangeSyncClient({ lambda, functionName: "CustomUnifiedMessaging" });
    const payload = { source: "HOST_CALENDAR_OVERRIDES_CHANGED", domitsPropertyId: "property-1" };

    const result = await client.syncCalendarChange(payload);

    expectChannexLambdaInvocation(lambda, {
      path: "/integrations/channex/calendar-change/sync",
      payload,
      functionName: "CustomUnifiedMessaging",
    });
    expect(result).toEqual(
      expect.objectContaining({
        source: "HOST_CALENDAR_OVERRIDES_CHANGED",
        domitsPropertyId: "property-1",
        skipped: false,
        reason: CHANNEX_CALENDAR_CHANGE_SYNC_FAILED,
        overallSuccess: false,
        errors: [
          {
            code: 503,
            message: "Temporarily unavailable.",
            httpStatus: 503,
          },
        ],
      })
    );
  });

  it("does not invoke Lambda when the internal token is missing", async () => {
    const lambda = createLambdaMock();
    const client = new ChannexCalendarChangeSyncClient({ lambda });
    await expectMissingInternalTokenSkip({
      lambda,
      invoke: () =>
        client.syncCalendarChange({ domitsPropertyId: "property-1" }),
    });
  });
});
