import ChannexCalendarChangeSyncClient, {
  CHANNEX_CALENDAR_CHANGE_SYNC_FAILED,
} from "../../functions/PropertyHandler/business/service/channexCalendarChangeSyncClient.js";
import {
  createLambdaMock,
  expectChannexLambdaInvocation,
  expectMissingInternalTokenSkip,
  useChannexLambdaClientTestEnvironment,
} from "../util/channexLambdaClientTestUtils.js";

// This client is a transport-only wrapper: it forwards the payload to UnifiedMessaging and
// returns whatever evidence comes back, so these tests only prove forwarding + evidence roundtrip.
// The real rate/min_stay/stop_sell/availability values come from the shared payload builders
// (buildChannexFullSyncAvailabilityPayloadContext, buildChannexFullSyncPayloadContext) that
// calendar-change reuses from the full ARI sync, and those are covered with real data in
// functions/UnifiedMessaging/business/integrationService.channexAri.test.js.
describe("ChannexCalendarChangeSyncClient", () => {
  useChannexLambdaClientTestEnvironment();

  it("invokes UnifiedMessaging with the existing synthetic HTTP event and returns evidence", async () => {
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

  describe("scenario coverage by change type", () => {
    it.each([
      {
        description: "a rate change",
        requestTypes: ["restrictions/rates"],
        payload: {
          domitsPropertyId: "property-1",
          changedDates: ["2026-07-01", "2026-07-02"],
          changeTypes: ["rates"],
        },
      },
      {
        description: "an availability block over a date range",
        requestTypes: ["availability"],
        payload: {
          domitsPropertyId: "property-1",
          dateFrom: "2026-08-01",
          dateTo: "2026-08-07",
          changeTypes: ["availability"],
        },
      },
      {
        description: "a stay restriction change",
        requestTypes: ["restrictions/rates"],
        payload: {
          domitsPropertyId: "property-1",
          changedDates: ["2026-09-01"],
          changeTypes: ["restrictions"],
        },
      },
      {
        // rates and restrictions both fold into the single "restrictions/rates" requestType,
        // so 3 changeTypes collapse into 2 requestTypes — see channexAvailabilitySyncService.js.
        description: "a combined rate, availability and restriction change",
        requestTypes: ["availability", "restrictions/rates"],
        payload: {
          domitsPropertyId: "property-1",
          changedDates: ["2026-09-10"],
          changeTypes: ["rates", "availability", "restrictions"],
        },
      },
    ])("syncs $description and returns the UnifiedMessaging evidence", async ({ requestTypes, payload }) => {
      const evidence = {
        syncType: "calendar-change",
        requestTypes,
        requestCount: requestTypes.length,
        overallSuccess: true,
      };
      const lambda = createLambdaMock({ body: evidence });
      const client = new ChannexCalendarChangeSyncClient({ lambda });

      await expect(client.syncCalendarChange(payload)).resolves.toEqual(evidence);
      expectChannexLambdaInvocation(lambda, {
        path: "/integrations/channex/calendar-change/sync",
        payload,
      });
    });
  });

  describe("downstream invocation resilience", () => {
    it("returns fallback failure evidence when the Lambda invocation itself throws", async () => {
      const invokeError = Object.assign(new Error("Network timeout"), {
        code: "ETIMEDOUT",
      });
      const lambda = { send: jest.fn().mockRejectedValue(invokeError) };
      const client = new ChannexCalendarChangeSyncClient({ lambda });
      const payload = {
        domitsPropertyId: "property-1",
        changedDates: ["2026-06-10"],
        changeTypes: ["rates"],
      };

      const result = await client.syncCalendarChange(payload);

      expect(result).toEqual(
        expect.objectContaining({
          domitsPropertyId: "property-1",
          changedDates: ["2026-06-10"],
          changeTypes: ["rates"],
          skipped: false,
          reason: CHANNEX_CALENDAR_CHANGE_SYNC_FAILED,
          overallSuccess: false,
          errors: [
            {
              code: "ETIMEDOUT",
              message: "Network timeout",
              httpStatus: null,
            },
          ],
        })
      );
    });

    it("returns fallback failure evidence when Lambda reports a FunctionError", async () => {
      const lambda = createLambdaMock({
        body: { error: "Unhandled exception in UnifiedMessaging." },
        statusCode: 200,
        functionError: "Unhandled",
      });
      const client = new ChannexCalendarChangeSyncClient({ lambda });
      const payload = { domitsPropertyId: "property-1", changeTypes: ["availability"] };

      const result = await client.syncCalendarChange(payload);

      expect(result).toEqual(
        expect.objectContaining({
          domitsPropertyId: "property-1",
          skipped: false,
          reason: CHANNEX_CALENDAR_CHANGE_SYNC_FAILED,
          overallSuccess: false,
          errors: [
            {
              code: "Unhandled",
              message: "Unhandled exception in UnifiedMessaging.",
              httpStatus: 200,
            },
          ],
        })
      );
    });

    it("returns fallback failure evidence when the response body is missing on a 2xx status", async () => {
      const lambda = createLambdaMock({ statusCode: 200 });
      const client = new ChannexCalendarChangeSyncClient({ lambda });
      const payload = { domitsPropertyId: "property-1", changeTypes: ["restrictions"] };

      const result = await client.syncCalendarChange(payload);

      expect(result).toEqual(
        expect.objectContaining({
          domitsPropertyId: "property-1",
          skipped: false,
          reason: CHANNEX_CALENDAR_CHANGE_SYNC_FAILED,
          overallSuccess: false,
          errors: [
            {
              code: 200,
              message: "UnifiedMessaging calendar-change sync failed.",
              httpStatus: 200,
            },
          ],
        })
      );
    });
  });
});
