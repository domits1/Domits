const mockChannelManagementControllerMethods = {
  connectHolidu: jest.fn(),
  checkChannexStatus: jest.fn(),
  checkHoliduStatus: jest.fn(),
  disconnectHolidu: jest.fn(),
  connectChannex: jest.fn(),
  disconnectChannex: jest.fn(),
  listChannexProperties: jest.fn(),
  listChannexRoomTypes: jest.fn(),
  listChannexRatePlans: jest.fn(),
  listLinkedChannexRoomTypes: jest.fn(),
  listLinkedChannexRatePlans: jest.fn(),
  getChannexAriTargets: jest.fn(),
  previewChannexAri: jest.fn(),
  previewChannexAriPayloads: jest.fn(),
  getLatestChannexSyncEvidenceSummary: jest.fn(),
  getChannexSyncEvidence: jest.fn(),
  listChannexSyncEvidence: jest.fn(),
  listChannexBookingRevisions: jest.fn(),
  saveChannexSetupMapping: jest.fn(),
  receiveChannexBookingRevisions: jest.fn(),
  pullLatestChannexBookings: jest.fn(),
  acknowledgeChannexBookingRevisions: jest.fn(),
  syncChannexBookingAvailability: jest.fn(),
  syncChannexCalendarChange: jest.fn(),
  syncChannexAvailability: jest.fn(),
  syncChannexRestrictions: jest.fn(),
  syncChannexAri: jest.fn(),
  syncChannexFull: jest.fn(),
  syncChannexCertificationTestCase: jest.fn(),
  cancelChannexCertificationBooking: jest.fn(),
  linkChannexRatePlan: jest.fn(),
  linkChannexRoomType: jest.fn(),
  linkChannexProperty: jest.fn(),
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
    ["POST", "/default/integrations/holidu/connect", "connectHolidu"],
    ["GET", "/default/integrations/holidu/status", "checkHoliduStatus"],
    ["POST", "/default/integrations/holidu/disconnect", "disconnectHolidu"],
    ["POST", "/default/integrations/channex/connect", "connectChannex"],
    ["GET", "/default/integrations/channex/status", "checkChannexStatus"],
    ["GET", "/default/integrations/channex/properties", "listChannexProperties"],
    ["POST", "/default/integrations/channex/properties", "linkChannexProperty"],
    ["GET", "/default/integrations/channex/room-types", "listChannexRoomTypes"],
    ["POST", "/default/integrations/channex/room-types", "linkChannexRoomType"],
    ["GET", "/default/integrations/channex/rate-plans", "listChannexRatePlans"],
    ["POST", "/default/integrations/channex/rate-plans", "linkChannexRatePlan"],
    ["GET", "/default/integrations/channex/linked-room-types", "listLinkedChannexRoomTypes"],
    ["GET", "/default/integrations/channex/linked-rate-plans", "listLinkedChannexRatePlans"],
    ["GET", "/default/integrations/channex/ari-targets", "getChannexAriTargets"],
    ["GET", "/default/integrations/channex/ari-preview", "previewChannexAri"],
    ["GET", "/default/integrations/channex/ari-payload-preview", "previewChannexAriPayloads"],
    ["GET", "/default/integrations/channex/sync-evidence", "listChannexSyncEvidence"],
    ["GET", "/default/integrations/channex/sync-evidence/latest", "getLatestChannexSyncEvidenceSummary"],
    ["GET", "/default/integrations/channex/sync-evidence/evidence-1", "getChannexSyncEvidence"],
    ["GET", "/default/integrations/channex/bookings/revisions", "listChannexBookingRevisions"],
    ["POST", "/default/integrations/channex/setup/mapping", "saveChannexSetupMapping"],
    ["POST", "/default/integrations/channex/bookings/receive", "receiveChannexBookingRevisions"],
    ["POST", "/default/integrations/channex/bookings/pull", "pullLatestChannexBookings"],
    ["POST", "/default/integrations/channex/bookings/ack", "acknowledgeChannexBookingRevisions"],
    ["POST", "/default/integrations/channex/booking-availability/sync", "syncChannexBookingAvailability"],
    ["POST", "/default/integrations/channex/calendar-change/sync", "syncChannexCalendarChange"],
    ["POST", "/default/integrations/channex/sync/availability", "syncChannexAvailability"],
    ["POST", "/default/integrations/channex/sync/restrictions", "syncChannexRestrictions"],
    ["POST", "/default/integrations/channex/sync/ari", "syncChannexAri"],
    ["POST", "/default/integrations/channex/sync/full", "syncChannexFull"],
    ["POST", "/default/integrations/channex/certification/test-case", "syncChannexCertificationTestCase"],
    [
      "POST",
      "/default/integrations/channex/certification/cancel-booking",
      "cancelChannexCertificationBooking",
    ],
    ["POST", "/default/integrations/channex/disconnect", "disconnectChannex"],
  ])("%s %s is handled by ChannelManagement", async (method, path, controllerMethod) => {
    const responseBody = { route: controllerMethod };
    mockChannelManagementControllerMethods[controllerMethod].mockResolvedValue({
      statusCode: 200,
      response: responseBody,
    });
    const event = buildHttpEvent({
      method,
      path,
      body: method === "POST" ? "{}" : null,
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual(responseBody);
    expect(mockChannelManagementControllerMethods[controllerMethod]).toHaveBeenCalledWith(event);
    expect(mockChannelManagementControllerMethods.pollLatestChannexBookings).not.toHaveBeenCalled();
  });

  test("admin access is handled inside ChannelManagement without controller side effects", async () => {
    const response = await handler(
      buildHttpEvent({
        path: "/default/integrations/channex/admin-access",
        query: { userId: "not-allowlisted" },
      })
    );

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual({ allowed: false });
    allControllerMethods.forEach((method) => expect(method).not.toHaveBeenCalled());
  });

  test.each([
    ["POST", "/default/send"],
    ["GET", "/default/threads"],
    ["GET", "/default/messages"],
    ["GET", "/default/webhooks/whatsapp"],
    ["POST", "/default/webhooks/whatsapp"],
    ["POST", "/default/integrations/whatsapp/connect/start"],
    ["POST", "/default/integrations/whatsapp/ingest/messages"],
    ["GET", "/default/integrations"],
  ])("%s %s is not owned by ChannelManagement", async (method, path) => {
    const response = await handler(
      buildHttpEvent({
        method,
        path,
        body: method === "POST" ? "{}" : null,
      })
    );

    expect(response.statusCode).toBe(404);
    expect(parseBody(response)).toBe("Not Found");
    allControllerMethods.forEach((controllerMethod) => expect(controllerMethod).not.toHaveBeenCalled());
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
