const mockMessageControllerMethods = {
  getMessages: jest.fn(),
};
const mockIntegrationControllerMethods = {
  checkChannexStatus: jest.fn(),
  checkHoliduStatus: jest.fn(),
  syncChannexBookingAvailability: jest.fn(),
  syncChannexCalendarChange: jest.fn(),
  pollLatestChannexBookings: jest.fn(),
};

jest.mock("../UnifiedMessaging/controller/messageController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockMessageControllerMethods),
}));

jest.mock("../UnifiedMessaging/controller/integrationController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockIntegrationControllerMethods),
}));

jest.mock("../UnifiedMessaging/controller/ingestionController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../UnifiedMessaging/controller/whatsappWebhookController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

const { handler } = require("./index.js");

const allControllerMethods = [
  ...Object.values(mockMessageControllerMethods),
  ...Object.values(mockIntegrationControllerMethods),
];

const buildHttpEvent = ({ method = "GET", path, query = {}, body = null, headers = {} }) => ({
  httpMethod: method,
  path,
  queryStringParameters: query,
  headers,
  body,
});

const parseBody = (response) => JSON.parse(response.body);

describe("ChannelManagement handler contracts", () => {
  beforeEach(() => {
    allControllerMethods.forEach((method) => method.mockReset());
  });

  test.each([
    [
      "/default/integrations/channex/status",
      mockIntegrationControllerMethods.checkChannexStatus,
      { channel: "CHANNEX", status: "CONNECTED" },
    ],
    [
      "/default/integrations/holidu/status",
      mockIntegrationControllerMethods.checkHoliduStatus,
      { channel: "HOLIDU", status: "CONNECTED" },
    ],
  ])("GET %s delegates through the existing integration controller", async (path, controllerMethod, body) => {
    controllerMethod.mockResolvedValue({ statusCode: 200, response: body });
    const event = buildHttpEvent({ path });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(parseBody(response)).toEqual(body);
    expect(controllerMethod).toHaveBeenCalledWith(event);
    expect(mockIntegrationControllerMethods.pollLatestChannexBookings).not.toHaveBeenCalled();
  });

  test.each([
    [
      "/integrations/channex/booking-availability/sync",
      mockIntegrationControllerMethods.syncChannexBookingAvailability,
      { syncType: "booking-availability", overallSuccess: true },
    ],
    [
      "/integrations/channex/calendar-change/sync",
      mockIntegrationControllerMethods.syncChannexCalendarChange,
      { syncType: "calendar-change", overallSuccess: true },
    ],
  ])("POST %s preserves the direct invocation contract", async (path, controllerMethod, evidence) => {
    controllerMethod.mockResolvedValue({ statusCode: 200, response: evidence });
    const event = buildHttpEvent({
      method: "POST",
      path,
      headers: { "x-domits-internal-token": "internal-token" },
      body: JSON.stringify({ domitsPropertyId: "property-1" }),
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual(evidence);
    expect(controllerMethod).toHaveBeenCalledWith(event);
    expect(mockIntegrationControllerMethods.pollLatestChannexBookings).not.toHaveBeenCalled();
  });

  test("explicit EventBridge polling preserves the existing disabled response", async () => {
    const disabledResponse = {
      channel: "CHANNEX",
      action: "poll-latest-bookings",
      enabled: false,
      calledProvider: false,
      overallSuccess: true,
    };
    mockIntegrationControllerMethods.pollLatestChannexBookings.mockResolvedValue({
      statusCode: 200,
      response: disabledResponse,
    });
    const event = {
      source: "domits.channex.booking-poll",
      action: "CHANNEX_BOOKING_POLL",
      enabled: true,
      trigger: "EVENTBRIDGE_POLL",
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual(disabledResponse);
    expect(mockIntegrationControllerMethods.pollLatestChannexBookings).toHaveBeenCalledWith(event);
  });

  test("unsupported messaging routes return 404 without invoking messaging or polling", async () => {
    const response = await handler(
      buildHttpEvent({
        path: "/default/messages",
      })
    );

    expect(response.statusCode).toBe(404);
    expect(parseBody(response)).toBe("Not Found");
    expect(mockMessageControllerMethods.getMessages).not.toHaveBeenCalled();
    expect(mockIntegrationControllerMethods.pollLatestChannexBookings).not.toHaveBeenCalled();
  });
});
