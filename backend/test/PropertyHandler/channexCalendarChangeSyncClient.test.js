import { jest } from "@jest/globals";

import ChannexCalendarChangeSyncClient, {
  CHANNEX_CALENDAR_CHANGE_SYNC_FAILED,
} from "../../functions/PropertyHandler/business/service/channexCalendarChangeSyncClient.js";

const encodeLambdaResponse = (body) =>
  new TextEncoder().encode(
    JSON.stringify({
      statusCode: 200,
      body: JSON.stringify(body),
    })
  );

describe("ChannexCalendarChangeSyncClient", () => {
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
      syncType: "calendar-change",
      requestCount: 1,
      overallSuccess: true,
    };
    const lambda = {
      send: jest.fn().mockResolvedValue({ Payload: encodeLambdaResponse(evidence) }),
    };
    const client = new ChannexCalendarChangeSyncClient({ lambda });
    const payload = {
      domitsPropertyId: "property-1",
      changedDates: ["2026-06-10"],
      changeTypes: ["availability"],
    };

    await expect(client.syncCalendarChange(payload)).resolves.toEqual(evidence);

    const command = lambda.send.mock.calls[0][0];
    expect(command.input.FunctionName).toBe("UnifiedMessaging");
    expect(JSON.parse(command.input.Payload)).toEqual({
      httpMethod: "POST",
      path: "/integrations/channex/calendar-change/sync",
      headers: { "x-domits-internal-token": "internal-token" },
      queryStringParameters: {},
      body: JSON.stringify(payload),
    });
  });

  it("keeps the existing fallback evidence when Lambda returns an error response", async () => {
    const lambda = {
      send: jest.fn().mockResolvedValue({
        Payload: new TextEncoder().encode(
          JSON.stringify({
            statusCode: 503,
            body: JSON.stringify({ error: "Temporarily unavailable." }),
          })
        ),
      }),
    };
    const client = new ChannexCalendarChangeSyncClient({ lambda, functionName: "CustomUnifiedMessaging" });
    const payload = { source: "HOST_CALENDAR_OVERRIDES_CHANGED", domitsPropertyId: "property-1" };

    const result = await client.syncCalendarChange(payload);

    expect(lambda.send.mock.calls[0][0].input.FunctionName).toBe("CustomUnifiedMessaging");
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
    delete process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN;
    const lambda = { send: jest.fn() };
    const client = new ChannexCalendarChangeSyncClient({ lambda });

    const result = await client.syncCalendarChange({ domitsPropertyId: "property-1" });

    expect(lambda.send).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        skipped: true,
        reason: "CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN_MISSING",
      })
    );
  });
});
