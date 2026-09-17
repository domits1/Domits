const mockIntegrationControllerMethods = {
  checkChannexStatus: jest.fn(),
  checkHoliduStatus: jest.fn(),
  listChannexProperties: jest.fn(),
  listChannexRoomTypes: jest.fn(),
  listChannexRatePlans: jest.fn(),
  listLinkedChannexRoomTypes: jest.fn(),
  listLinkedChannexRatePlans: jest.fn(),
  linkChannexProperty: jest.fn(),
  linkChannexRoomType: jest.fn(),
  linkChannexRatePlan: jest.fn(),
  listChannexBookingRevisions: jest.fn(),
  syncChannexRestrictions: jest.fn(),
  syncChannexFull: jest.fn(),
  syncChannexBookingAvailability: jest.fn(),
  syncChannexCalendarChange: jest.fn(),
  syncChannexCertificationTestCase: jest.fn(),
  cancelChannexCertificationBooking: jest.fn(),
  saveChannexSetupMapping: jest.fn(),
  receiveChannexBookingRevisions: jest.fn(),
  pullLatestChannexBookings: jest.fn(),
  pollLatestChannexBookings: jest.fn(),
  acknowledgeChannexBookingRevisions: jest.fn(),
  connectChannex: jest.fn(),
  disconnectChannex: jest.fn(),
  connectHolidu: jest.fn(),
  disconnectHolidu: jest.fn(),
};

jest.mock("./controller/messageController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("./controller/integrationController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockIntegrationControllerMethods),
}));

jest.mock("../.shared/channelManagement/controller/channelManagementController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockIntegrationControllerMethods),
}));

jest.mock("./controller/ingestionController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("./controller/whatsappWebhookController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

const { handler } = require("./index.js");

const buildEvent = ({ method = "GET", path, query = {}, body = null, sub = null, headers = {} }) => ({
  httpMethod: method,
  path,
  queryStringParameters: query,
  headers,
  body,
  ...(sub ? { requestContext: { authorizer: { claims: { sub } } } } : {}),
});

const parseBody = (response) => JSON.parse(response.body);

describe("UnifiedMessaging Channex certification admin route guard", () => {
  const originalEnv = process.env.CHANNEX_CERTIFICATION_USER_IDS;

  beforeEach(() => {
    process.env.CHANNEX_CERTIFICATION_USER_IDS = "allowed-user";
    Object.values(mockIntegrationControllerMethods).forEach((method) => method.mockReset());
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.CHANNEX_CERTIFICATION_USER_IDS;
    } else {
      process.env.CHANNEX_CERTIFICATION_USER_IDS = originalEnv;
    }
  });

  test("allowed user can call a protected Channex status endpoint", async () => {
    mockIntegrationControllerMethods.checkChannexStatus.mockResolvedValue({
      statusCode: 200,
      response: { channel: "CHANNEX", status: "CONNECTED" },
    });

    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/status",
        sub: "allowed-user",
      })
    );

    expect(response.statusCode).toBe(200);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(parseBody(response)).toEqual({ channel: "CHANNEX", status: "CONNECTED" });
    expect(mockIntegrationControllerMethods.checkChannexStatus).toHaveBeenCalledTimes(1);
  });

  test("Holidu routes continue through the shared channel router", async () => {
    mockIntegrationControllerMethods.checkHoliduStatus.mockResolvedValue({
      statusCode: 200,
      response: { channel: "HOLIDU", status: "CONNECTED" },
    });
    const event = buildEvent({
      path: "/default/integrations/holidu/status",
      sub: "user-1",
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual({
      channel: "HOLIDU",
      status: "CONNECTED",
    });
    expect(mockIntegrationControllerMethods.checkHoliduStatus).toHaveBeenCalledWith(
      expect.objectContaining({ path: event.path, queryStringParameters: { userId: "user-1" } })
    );
  });

  test("not-allowed user gets 403 before Channex status controller logic runs", async () => {
    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/status",
        sub: "not-allowed",
      })
    );

    expect(response.statusCode).toBe(403);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(parseBody(response)).toEqual({
      error: "FORBIDDEN",
      message: "User is not allowed to access Channex certification admin endpoints.",
    });
    expect(mockIntegrationControllerMethods.checkChannexStatus).not.toHaveBeenCalled();
  });

  test("a protected route without a Cognito token gets 401 before controller logic runs", async () => {
    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/status",
        query: { userId: "allowed-user" },
      })
    );

    expect(response.statusCode).toBe(401);
    expect(parseBody(response)).toEqual({ error: "UNAUTHORIZED", message: "Authentication required." });
    expect(mockIntegrationControllerMethods.checkChannexStatus).not.toHaveBeenCalled();
  });

  test("admin access endpoint returns allowed true for allowlisted user", async () => {
    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/admin-access",
        sub: "allowed-user",
      })
    );

    expect(response.statusCode).toBe(200);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(parseBody(response)).toEqual({ allowed: true });
    expect(mockIntegrationControllerMethods.checkChannexStatus).not.toHaveBeenCalled();
  });

  test("admin access endpoint returns allowed false for non-allowlisted user", async () => {
    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/admin-access",
        sub: "not-allowed",
      })
    );

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual({ allowed: false });
    expect(mockIntegrationControllerMethods.checkChannexStatus).not.toHaveBeenCalled();
  });

  test("admin access endpoint without a Cognito token gets 401", async () => {
    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/admin-access",
        query: { userId: "allowed-user" },
      })
    );

    expect(response.statusCode).toBe(401);
    expect(parseBody(response)).toEqual({ error: "UNAUTHORIZED", message: "Authentication required." });
  });

  test("booking revisions list endpoint is protected", async () => {
    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/bookings/revisions",
        sub: "not-allowed",
        query: { domitsPropertyId: "property-1" },
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods.listChannexBookingRevisions).not.toHaveBeenCalled();
  });

  test.each([
    ["GET", "/default/integrations/channex/properties", "listChannexProperties"],
    ["GET", "/default/integrations/channex/room-types", "listChannexRoomTypes"],
    ["GET", "/default/integrations/channex/rate-plans", "listChannexRatePlans"],
    ["GET", "/default/integrations/channex/linked-room-types", "listLinkedChannexRoomTypes"],
    ["GET", "/default/integrations/channex/linked-rate-plans", "listLinkedChannexRatePlans"],
    ["POST", "/default/integrations/channex/properties", "linkChannexProperty"],
    ["POST", "/default/integrations/channex/room-types", "linkChannexRoomType"],
    ["POST", "/default/integrations/channex/rate-plans", "linkChannexRatePlan"],
    ["POST", "/default/integrations/channex/setup/mapping", "saveChannexSetupMapping"],
  ])("%s %s is protected before setup controller logic runs", async (method, path, controllerMethod) => {
    const response = await handler(
      buildEvent({
        method,
        path,
        sub: "not-allowed",
        body: method === "POST" ? "{}" : null,
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods[controllerMethod]).not.toHaveBeenCalled();
  });

  test.each([
    ["/default/integrations/channex/properties", "listChannexProperties"],
    ["/default/integrations/channex/room-types", "listChannexRoomTypes"],
    ["/default/integrations/channex/rate-plans", "listChannexRatePlans"],
  ])("allowed user can call %s", async (path, controllerMethod) => {
    mockIntegrationControllerMethods[controllerMethod].mockResolvedValue({
      statusCode: 200,
      response: { channel: "CHANNEX", status: "CONNECTED" },
    });

    const response = await handler(
      buildEvent({
        path,
        sub: "allowed-user",
        query: {
          externalPropertyId: "external-property-1",
          externalRoomTypeId: "room-type-1",
        },
      })
    );

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual({ channel: "CHANNEX", status: "CONNECTED" });
    expect(mockIntegrationControllerMethods[controllerMethod]).toHaveBeenCalledTimes(1);
  });

  test("allowed user can save Channex setup mapping", async () => {
    mockIntegrationControllerMethods.saveChannexSetupMapping.mockResolvedValue({
      statusCode: 200,
      response: {
        channel: "CHANNEX",
        action: "setup-mapping",
        ready: true,
      },
    });

    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/setup/mapping",
        sub: "allowed-user",
        body: JSON.stringify({
          domitsPropertyId: "domits-property-1",
          externalPropertyId: "external-property-1",
          externalRoomTypeId: "room-type-1",
          externalRatePlanId: "rate-plan-1",
        }),
      })
    );

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual({
      channel: "CHANNEX",
      action: "setup-mapping",
      ready: true,
    });
    expect(mockIntegrationControllerMethods.saveChannexSetupMapping).toHaveBeenCalledTimes(1);
  });

  test("sync restrictions endpoint is protected before side effects run", async () => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/sync/restrictions",
        sub: "not-allowed",
        query: {
          domitsPropertyId: "property-1",
          dateFrom: "2026-05-01",
          dateTo: "2026-05-02",
        },
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods.syncChannexRestrictions).not.toHaveBeenCalled();
  });

  test("full sync debugPing returns before controller or guard side effects", async () => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/sync/full",
        query: {
          userId: "not-allowed",
          domitsPropertyId: "property-1",
          dateFrom: "2026-05-01",
          dateTo: "2026-05-02",
          debugPing: "true",
        },
      })
    );

    expect(response.statusCode).toBe(200);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(parseBody(response)).toEqual({
      ok: true,
      route: "sync/full",
      fullCertificationSyncVersion: "full-sync-v1",
      stage: "debug_ping",
    });
    expect(mockIntegrationControllerMethods.syncChannexFull).not.toHaveBeenCalled();
  });

  test("receive booking revisions endpoint is protected before side effects run", async () => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/bookings/receive",
        sub: "not-allowed",
        query: { domitsPropertyId: "property-1" },
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods.receiveChannexBookingRevisions).not.toHaveBeenCalled();
  });

  test("pull latest Channex bookings endpoint is protected before side effects run", async () => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/bookings/pull",
        sub: "not-allowed",
        query: { domitsPropertyId: "property-1" },
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods.pullLatestChannexBookings).not.toHaveBeenCalled();
  });

  test("direct Channex booking poll event calls polling without HTTP routing", async () => {
    mockIntegrationControllerMethods.pollLatestChannexBookings.mockResolvedValue({
      statusCode: 200,
      response: {
        channel: "CHANNEX",
        action: "poll-latest-bookings",
        enabled: true,
      },
    });

    const event = {
      source: "domits.channex.booking-poll",
      detail: {
        action: "CHANNEX_BOOKING_POLL",
        enabled: true,
      },
    };
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual({
      channel: "CHANNEX",
      action: "poll-latest-bookings",
      enabled: true,
    });
    expect(mockIntegrationControllerMethods.pollLatestChannexBookings).toHaveBeenCalledWith(event);
    expect(mockIntegrationControllerMethods.pullLatestChannexBookings).not.toHaveBeenCalled();
  });

  test("internal Channex calendar-change sync route calls controller without admin guard", async () => {
    mockIntegrationControllerMethods.syncChannexCalendarChange.mockResolvedValue({
      statusCode: 200,
      response: {
        syncType: "calendar-change",
        requestCount: 1,
      },
    });

    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/calendar-change/sync",
        body: JSON.stringify({
          userId: "host-1",
          domitsPropertyId: "property-1",
          changedDates: ["2026-06-10"],
          changeTypes: ["availability"],
        }),
      })
    );

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual({
      syncType: "calendar-change",
      requestCount: 1,
    });
    expect(mockIntegrationControllerMethods.syncChannexCalendarChange).toHaveBeenCalledTimes(1);
  });

  test("certification test-case endpoint is protected before side effects run", async () => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/certification/test-case",
        sub: "not-allowed",
        query: { domitsPropertyId: "property-1" },
        body: JSON.stringify({ testCaseId: "2" }),
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods.syncChannexCertificationTestCase).not.toHaveBeenCalled();
  });

  test("certification cancel booking endpoint is protected before side effects run", async () => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/certification/cancel-booking",
        sub: "not-allowed",
        query: { domitsPropertyId: "property-1" },
        body: JSON.stringify({ bookingId: "booking-1" }),
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods.cancelChannexCertificationBooking).not.toHaveBeenCalled();
  });

  test("allowed user can call certification cancel booking endpoint", async () => {
    mockIntegrationControllerMethods.cancelChannexCertificationBooking.mockResolvedValue({
      statusCode: 200,
      response: {
        channel: "CHANNEX",
        action: "certification-cancel-booking",
        bookingId: "booking-1",
      },
    });

    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/certification/cancel-booking",
        sub: "allowed-user",
        query: { domitsPropertyId: "property-1" },
        body: JSON.stringify({ bookingId: "booking-1" }),
      })
    );

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual({
      channel: "CHANNEX",
      action: "certification-cancel-booking",
      bookingId: "booking-1",
    });
    expect(mockIntegrationControllerMethods.cancelChannexCertificationBooking).toHaveBeenCalledTimes(1);
  });

  test("booking ack endpoint is protected before side effects run", async () => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/bookings/ack",
        sub: "not-allowed",
        query: { domitsPropertyId: "property-1" },
        body: JSON.stringify({ revisionIds: ["revision-1"] }),
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods.acknowledgeChannexBookingRevisions).not.toHaveBeenCalled();
  });

  test("OPTIONS preflight is not blocked by the guard", async () => {
    const response = await handler(
      buildEvent({
        method: "OPTIONS",
        path: "/default/integrations/channex/sync/restrictions",
        sub: "not-allowed",
      })
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("");
    expect(response.headers["Access-Control-Allow-Methods"]).toContain("OPTIONS");
    expect(mockIntegrationControllerMethods.syncChannexRestrictions).not.toHaveBeenCalled();
  });
});

describe("Channel routes take the user from the Cognito token", () => {
  const originalEnv = process.env.CHANNEX_CERTIFICATION_USER_IDS;
  const credentialRoutes = [
    ["/default/integrations/channex/connect", "connectChannex"],
    ["/default/integrations/channex/disconnect", "disconnectChannex"],
    ["/default/integrations/holidu/connect", "connectHolidu"],
    ["/default/integrations/holidu/disconnect", "disconnectHolidu"],
  ];

  beforeEach(() => {
    process.env.CHANNEX_CERTIFICATION_USER_IDS = "allowed-user";
    Object.values(mockIntegrationControllerMethods).forEach((method) => method.mockReset());
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.CHANNEX_CERTIFICATION_USER_IDS;
    } else {
      process.env.CHANNEX_CERTIFICATION_USER_IDS = originalEnv;
    }
  });

  test.each(credentialRoutes)("POST %s acts for the token user, not the userId in the body", async (path, controllerMethod) => {
    mockIntegrationControllerMethods[controllerMethod].mockResolvedValue({ statusCode: 200, response: { ok: true } });

    const response = await handler(
      buildEvent({
        method: "POST",
        path,
        sub: "allowed-user",
        body: JSON.stringify({ userId: "victim-user", credentials: { apiKey: "key-1" } }),
      })
    );

    expect(response.statusCode).toBe(200);
    const forwardedEvent = mockIntegrationControllerMethods[controllerMethod].mock.calls[0][0];
    expect(JSON.parse(forwardedEvent.body)).toEqual({ userId: "allowed-user", credentials: { apiKey: "key-1" } });
  });

  test.each(credentialRoutes)("POST %s without a Cognito token is rejected before the controller runs", async (path, controllerMethod) => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path,
        body: JSON.stringify({ userId: "victim-user", credentials: { apiKey: "key-1" } }),
      })
    );

    expect(response.statusCode).toBe(401);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(parseBody(response)).toEqual({ error: "UNAUTHORIZED", message: "Authentication required." });
    expect(mockIntegrationControllerMethods[controllerMethod]).not.toHaveBeenCalled();
  });

  test.each([
    ["/default/integrations/channex/connect", "connectChannex"],
    ["/default/integrations/channex/disconnect", "disconnectChannex"],
  ])("POST %s refuses a token user who is not allowlisted", async (path, controllerMethod) => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path,
        sub: "not-allowed",
        body: JSON.stringify({ credentials: { apiKey: "key-1" } }),
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods[controllerMethod]).not.toHaveBeenCalled();
  });

  test("an admin route refuses a token user who is not allowlisted, whatever userId the query names", async () => {
    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/status",
        sub: "not-allowed",
        query: { userId: "allowed-user" },
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods.checkChannexStatus).not.toHaveBeenCalled();
  });

  test("an admin route refuses a request that leaves the userId out of the query", async () => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/setup/mapping",
        sub: "not-allowed",
        body: JSON.stringify({ domitsPropertyId: "property-1" }),
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods.saveChannexSetupMapping).not.toHaveBeenCalled();
  });

  test("an admin route forwards the token user as the query userId", async () => {
    mockIntegrationControllerMethods.checkChannexStatus.mockResolvedValue({ statusCode: 200, response: { ok: true } });

    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/status",
        sub: "allowed-user",
        query: { userId: "someone-else", domitsPropertyId: "property-1" },
      })
    );

    expect(response.statusCode).toBe(200);
    const forwardedEvent = mockIntegrationControllerMethods.checkChannexStatus.mock.calls[0][0];
    expect(forwardedEvent.queryStringParameters).toEqual({ userId: "allowed-user", domitsPropertyId: "property-1" });
  });

  test("admin access answers for the token user, not the userId in the query", async () => {
    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/admin-access",
        sub: "not-allowed",
        query: { userId: "allowed-user" },
      })
    );

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual({ allowed: false });
  });

  test("internal booking-availability sync still runs without a Cognito token", async () => {
    mockIntegrationControllerMethods.syncChannexBookingAvailability.mockResolvedValue({
      statusCode: 200,
      response: { syncType: "booking-availability" },
    });

    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/booking-availability/sync",
        headers: { "x-domits-internal-token": "internal-token" },
        body: JSON.stringify({ userId: "host-1", domitsPropertyId: "property-1" }),
      })
    );

    expect(response.statusCode).toBe(200);
    const forwardedEvent = mockIntegrationControllerMethods.syncChannexBookingAvailability.mock.calls[0][0];
    expect(JSON.parse(forwardedEvent.body)).toEqual({ userId: "host-1", domitsPropertyId: "property-1" });
  });
});
