import ChannelManagementController from "../../.shared/channelManagement/controller/channelManagementController.js";

const SECRET_HEADER_VALUE = "the-secret-value-from-the-header";

const buildController = ({ secretValid = true, verifyError = null, serviceResult } = {}) => {
  const channelManagementApiService = {
    verifyChannexBookingWebhookSecret: jest.fn(async () => {
      if (verifyError) throw verifyError;
      return secretValid;
    }),
    receiveChannexBookingWebhook: jest.fn(async () => serviceResult ?? { statusCode: 200, outcome: "PROCESSED" }),
  };
  return { controller: new ChannelManagementController({ channelManagementApiService }), channelManagementApiService };
};

const webhookEvent = (body = { event: "booking", property_id: "channex-1", payload: { booking_id: "b-1" } }) => ({
  httpMethod: "POST",
  path: "/default/webhooks/channex/bookings",
  headers: { "X-Channex-Webhook-Secret": SECRET_HEADER_VALUE },
  body: typeof body === "string" ? body : JSON.stringify(body),
  requestContext: { requestId: "request-1", identity: { sourceIp: "203.0.113.7" } },
});

describe("ChannelManagementController.receiveChannexBookingWebhook", () => {
  let errorLog;
  let infoLog;

  beforeEach(() => {
    errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
    infoLog = jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // The secret header is the only authentication on this route, so it is checked before anything else.
  test("answers 401 and reads nothing when the secret is wrong", async () => {
    const { controller, channelManagementApiService } = buildController({ secretValid: false });

    const result = await controller.receiveChannexBookingWebhook(webhookEvent());

    expect(result.statusCode).toBe(401);
    expect(channelManagementApiService.receiveChannexBookingWebhook).not.toHaveBeenCalled();
  });

  // Channex treats a 401 as delivered and does not retry, so a misconfigured secret must be visible.
  test("logs a rejected secret as an error without the header value", async () => {
    const { controller } = buildController({ secretValid: false });

    await controller.receiveChannexBookingWebhook(webhookEvent());

    expect(errorLog).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(errorLog.mock.calls);
    expect(logged).toContain("CHANNEX_BOOKING_WEBHOOK_SECRET_REJECTED");
    expect(logged).toContain("request-1");
    expect(logged).toContain("203.0.113.7");
    expect(logged).not.toContain(SECRET_HEADER_VALUE);
  });

  test("answers 503 when the webhook secret cannot be read, so Channex retries", async () => {
    const { controller, channelManagementApiService } = buildController({
      verifyError: new Error("Channex webhook secret is not configured."),
    });

    const result = await controller.receiveChannexBookingWebhook(webhookEvent());

    expect(result.statusCode).toBe(503);
    expect(channelManagementApiService.receiveChannexBookingWebhook).not.toHaveBeenCalled();
  });

  // A badly stored secret makes every webhook answer 503; without a log line nobody sees why.
  test("logs an unreadable webhook secret as an error with the reason", async () => {
    const { controller } = buildController({ verifyError: new Error("Channex webhook secret is not configured.") });

    await controller.receiveChannexBookingWebhook(webhookEvent());

    expect(errorLog).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(errorLog.mock.calls);
    expect(logged).toContain("CHANNEX_BOOKING_WEBHOOK_SECRET_UNAVAILABLE");
    expect(logged).toContain("request-1");
    expect(logged).toContain("Channex webhook secret is not configured.");
    expect(logged).not.toContain(SECRET_HEADER_VALUE);
  });

  test("answers 400 for a body that is not JSON", async () => {
    const { controller } = buildController();

    const result = await controller.receiveChannexBookingWebhook(webhookEvent("not json"));

    expect(result.statusCode).toBe(400);
  });

  test("answers 400 when the body has no property_id", async () => {
    const { controller, channelManagementApiService } = buildController();

    const result = await controller.receiveChannexBookingWebhook(webhookEvent({ event: "booking" }));

    expect(result.statusCode).toBe(400);
    expect(channelManagementApiService.receiveChannexBookingWebhook).not.toHaveBeenCalled();
  });

  it.each(["message", "booking_unmapped_room", "ari"])("answers 200 ignored for a %s event", async (eventName) => {
    const { controller, channelManagementApiService } = buildController();

    const result = await controller.receiveChannexBookingWebhook(
      webhookEvent({ event: eventName, property_id: "channex-1" })
    );

    expect(result).toEqual({ statusCode: 200, response: { outcome: "IGNORED" } });
    expect(channelManagementApiService.receiveChannexBookingWebhook).not.toHaveBeenCalled();
  });

  it.each(["booking", "booking_new", "booking_modification", "booking_cancellation"])(
    "passes a %s event's property id to the service and answers with its status",
    async (eventName) => {
      const { controller, channelManagementApiService } = buildController({
        serviceResult: { statusCode: 503, outcome: "LOCKED", domitsPropertyId: "property-1" },
      });

      const result = await controller.receiveChannexBookingWebhook(
        webhookEvent({ event: eventName, property_id: "channex-1" })
      );

      expect(channelManagementApiService.receiveChannexBookingWebhook).toHaveBeenCalledWith({
        externalPropertyId: "channex-1",
        requestId: "request-1",
      });
      expect(result).toEqual({ statusCode: 503, response: { outcome: "LOCKED" } });
    }
  );

  test("writes one log line per processed webhook without the secret", async () => {
    const { controller } = buildController({
      serviceResult: {
        statusCode: 200,
        outcome: "PROCESSED",
        domitsPropertyId: "property-1",
        fetchedCount: 2,
        ackedCount: 2,
        unackedCount: 0,
        feedMeta: { page: 1, total: 2 },
      },
    });

    await controller.receiveChannexBookingWebhook(webhookEvent());

    expect(infoLog).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(infoLog.mock.calls[0][0]);
    expect(logged).toMatchObject({
      event: "CHANNEX_BOOKING_WEBHOOK",
      requestId: "request-1",
      externalPropertyId: "channex-1",
      domitsPropertyId: "property-1",
      fetchedCount: 2,
      ackedCount: 2,
      unackedCount: 0,
      feedMeta: { page: 1, total: 2 },
      outcome: "PROCESSED",
      statusCode: 200,
    });
    expect(infoLog.mock.calls[0][0]).not.toContain(SECRET_HEADER_VALUE);
  });
});
