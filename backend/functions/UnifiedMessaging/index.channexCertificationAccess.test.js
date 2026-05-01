const mockIntegrationControllerMethods = {
  checkChannexStatus: jest.fn(),
  listChannexBookingRevisions: jest.fn(),
  syncChannexRestrictions: jest.fn(),
  receiveChannexBookingRevisions: jest.fn(),
  acknowledgeChannexBookingRevisions: jest.fn(),
};

jest.mock("./controller/messageController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("./controller/integrationController.js", () => ({
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

const buildEvent = ({ method = "GET", path, query = {}, body = null }) => ({
  httpMethod: method,
  path,
  queryStringParameters: query,
  body,
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
        query: { userId: "allowed-user" },
      })
    );

    expect(response.statusCode).toBe(200);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(parseBody(response)).toEqual({ channel: "CHANNEX", status: "CONNECTED" });
    expect(mockIntegrationControllerMethods.checkChannexStatus).toHaveBeenCalledTimes(1);
  });

  test("not-allowed user gets 403 before Channex status controller logic runs", async () => {
    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/status",
        query: { userId: "not-allowed" },
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

  test("missing userId keeps existing validation path", async () => {
    mockIntegrationControllerMethods.checkChannexStatus.mockResolvedValue({
      statusCode: 400,
      response: { error: "Missing required query param: userId" },
    });

    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/status",
        query: {},
      })
    );

    expect(response.statusCode).toBe(400);
    expect(parseBody(response)).toEqual({ error: "Missing required query param: userId" });
    expect(mockIntegrationControllerMethods.checkChannexStatus).toHaveBeenCalledTimes(1);
  });

  test("booking revisions list endpoint is protected", async () => {
    const response = await handler(
      buildEvent({
        path: "/default/integrations/channex/bookings/revisions",
        query: { userId: "not-allowed", domitsPropertyId: "property-1" },
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods.listChannexBookingRevisions).not.toHaveBeenCalled();
  });

  test("sync restrictions endpoint is protected before side effects run", async () => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/sync/restrictions",
        query: {
          userId: "not-allowed",
          domitsPropertyId: "property-1",
          dateFrom: "2026-05-01",
          dateTo: "2026-05-02",
        },
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods.syncChannexRestrictions).not.toHaveBeenCalled();
  });

  test("receive booking revisions endpoint is protected before side effects run", async () => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/bookings/receive",
        query: { userId: "not-allowed", domitsPropertyId: "property-1" },
      })
    );

    expect(response.statusCode).toBe(403);
    expect(mockIntegrationControllerMethods.receiveChannexBookingRevisions).not.toHaveBeenCalled();
  });

  test("booking ack endpoint is protected before side effects run", async () => {
    const response = await handler(
      buildEvent({
        method: "POST",
        path: "/default/integrations/channex/bookings/ack",
        query: { userId: "not-allowed", domitsPropertyId: "property-1" },
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
        query: { userId: "not-allowed" },
      })
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("");
    expect(response.headers["Access-Control-Allow-Methods"]).toContain("OPTIONS");
    expect(mockIntegrationControllerMethods.syncChannexRestrictions).not.toHaveBeenCalled();
  });
});
