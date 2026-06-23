const mockChannelManagementControllerMethods = {
  checkChannexStatus: jest.fn(),
  checkHoliduStatus: jest.fn(),
  syncChannexBookingAvailability: jest.fn(),
  syncChannexCalendarChange: jest.fn(),
  pollLatestChannexBookings: jest.fn(),
};

jest.mock("../.shared/channelManagement/controller/channelManagementController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockChannelManagementControllerMethods),
}));

const { handler } = require("./index.js");

const allControllerMethods = Object.values(mockChannelManagementControllerMethods);

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

  test("entry point has no UnifiedMessaging dependency", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

    expect(source).not.toContain("UnifiedMessaging");
    expect(source).not.toContain("unifiedMessagingHandler");
  });

  test.each([
    [
      "/default/integrations/channex/status",
      mockChannelManagementControllerMethods.checkChannexStatus,
      { channel: "CHANNEX", status: "CONNECTED" },
    ],
    [
      "/default/integrations/holidu/status",
      mockChannelManagementControllerMethods.checkHoliduStatus,
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
    expect(mockChannelManagementControllerMethods.pollLatestChannexBookings).not.toHaveBeenCalled();
  });

  test.each([
    [
      "/integrations/channex/booking-availability/sync",
      mockChannelManagementControllerMethods.syncChannexBookingAvailability,
      { syncType: "booking-availability", overallSuccess: true },
    ],
    [
      "/integrations/channex/calendar-change/sync",
      mockChannelManagementControllerMethods.syncChannexCalendarChange,
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
    expect(mockChannelManagementControllerMethods.pollLatestChannexBookings).not.toHaveBeenCalled();
  });

  test("explicit EventBridge polling preserves the existing disabled response", async () => {
    const disabledResponse = {
      channel: "CHANNEX",
      action: "poll-latest-bookings",
      enabled: false,
      calledProvider: false,
      overallSuccess: true,
    };
    mockChannelManagementControllerMethods.pollLatestChannexBookings.mockResolvedValue({
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
    expect(mockChannelManagementControllerMethods.pollLatestChannexBookings).toHaveBeenCalledWith(event);
  });

  test("unsupported channel routes return a clean 404 without invoking polling", async () => {
    const response = await handler(
      buildHttpEvent({
        path: "/default/integrations/channex/unsupported",
      })
    );

    expect(response.statusCode).toBe(404);
    expect(parseBody(response)).toBe("Not Found");
    expect(mockChannelManagementControllerMethods.pollLatestChannexBookings).not.toHaveBeenCalled();
  });
});
const fs = require("node:fs");
const path = require("node:path");
