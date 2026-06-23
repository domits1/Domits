jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("../business/integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationController = require("./integrationController.js").default;

const buildCalendarChangeEvent = ({ token, body = {} } = {}) => ({
  headers: token ? { "x-domits-internal-token": token } : {},
  body: JSON.stringify({
    userId: "host-1",
    domitsPropertyId: "property-1",
    changedDates: ["2026-06-10"],
    changeTypes: ["availability"],
    ...body,
  }),
});

const buildBookingAvailabilityEvent = ({ token, body = {} } = {}) => ({
  headers: token ? { "x-domits-internal-token": token } : {},
  body: JSON.stringify({
    userId: "host-1",
    trigger: "BOOKING_CREATED",
    bookingAfter: {
      id: "booking-1",
      property_id: "property-1",
    },
    ...body,
  }),
});

describe("IntegrationController Channex availability internal guards", () => {
  const originalToken = process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN;
  const originalTestEnv = process.env.TEST;

  const createController = () => {
    const integrationService = {
      syncChannexBookingAvailability: jest.fn().mockResolvedValue({
        statusCode: 200,
        response: {
          syncType: "booking-availability",
          requestCount: 1,
        },
      }),
      syncChannexCalendarChange: jest.fn().mockResolvedValue({
        statusCode: 200,
        response: {
          syncType: "calendar-change",
          requestCount: 1,
        },
      }),
    };
    return {
      controller: new IntegrationController({ integrationService }),
      integrationService,
    };
  };

  beforeEach(() => {
    process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN = "expected-token";
    process.env.TEST = "false";
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN;
    } else {
      process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN = originalToken;
    }
    if (originalTestEnv === undefined) {
      delete process.env.TEST;
    } else {
      process.env.TEST = originalTestEnv;
    }
  });

  test("rejects missing internal token before syncing calendar changes", async () => {
    const { controller, integrationService } = createController();

    const result = await controller.syncChannexCalendarChange(buildCalendarChangeEvent());

    expect(result).toEqual({
      statusCode: 403,
      response: {
        error: "FORBIDDEN",
        message: "Invalid internal calendar-change sync token.",
      },
    });
    expect(integrationService.syncChannexCalendarChange).not.toHaveBeenCalled();
  });

  test("rejects wrong internal token before syncing calendar changes", async () => {
    const { controller, integrationService } = createController();

    const result = await controller.syncChannexCalendarChange(buildCalendarChangeEvent({ token: "wrong-token" }));

    expect(result.statusCode).toBe(403);
    expect(result.response.message).toBe("Invalid internal calendar-change sync token.");
    expect(integrationService.syncChannexCalendarChange).not.toHaveBeenCalled();
  });

  test("accepts matching internal token and forwards calendar change body", async () => {
    const { controller, integrationService } = createController();

    const result = await controller.syncChannexCalendarChange(
      buildCalendarChangeEvent({
        token: "expected-token",
        body: { source: "HOST_CALENDAR_OVERRIDES_CHANGED" },
      })
    );

    expect(result.statusCode).toBe(200);
    expect(result.response).toEqual({
      syncType: "calendar-change",
      requestCount: 1,
    });
    expect(integrationService.syncChannexCalendarChange).toHaveBeenCalledWith({
      userId: "host-1",
      domitsPropertyId: "property-1",
      changedDates: ["2026-06-10"],
      changeTypes: ["availability"],
      source: "HOST_CALENDAR_OVERRIDES_CHANGED",
    });
  });

  test("rejects an invalid token before syncing booking availability", async () => {
    const { controller, integrationService } = createController();

    const result = await controller.syncChannexBookingAvailability(
      buildBookingAvailabilityEvent({ token: "wrong-token" })
    );

    expect(result).toEqual({
      statusCode: 403,
      response: {
        error: "FORBIDDEN",
        message: "Invalid internal booking availability sync token.",
      },
    });
    expect(integrationService.syncChannexBookingAvailability).not.toHaveBeenCalled();
  });

  test("accepts matching internal token and forwards booking availability body", async () => {
    const { controller, integrationService } = createController();
    const event = buildBookingAvailabilityEvent({ token: "expected-token" });

    const result = await controller.syncChannexBookingAvailability(event);

    expect(result.statusCode).toBe(200);
    expect(result.response.syncType).toBe("booking-availability");
    expect(integrationService.syncChannexBookingAvailability).toHaveBeenCalledWith(
      JSON.parse(event.body)
    );
  });
});
