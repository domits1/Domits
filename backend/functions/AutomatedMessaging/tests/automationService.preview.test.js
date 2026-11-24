import AutomationService from "../business/automationService.js";
import { APPROVED_VARIABLES } from "../util/constants.js";

const ALL_VARIABLES_TEMPLATE = APPROVED_VARIABLES.map((variable) => `{{${variable}}}`).join(" ");

const context = (patch = {}) => ({
  booking: {
    id: "booking-1",
    hostid: "host-1",
    property_id: "property-1",
    guestname: "Taylor",
    arrivaldate: Date.UTC(2026, 5, 20),
    departuredate: Date.UTC(2026, 5, 23),
    guests: 4,
  },
  property: { id: "property-1", title: "Canal Loft" },
  checkIn: { checkInFrom: "14:00:00", checkOutTill: "10:30:00" },
  location: { street: "Keizersgracht", housenumber: 12, housenumberextension: "A", postalcode: "1015 CJ", city: "Amsterdam" },
  ...patch,
});

const buildService = (bookingContext = context(), automationRepository = {}) =>
  new AutomationService({
    automationRepository,
    deliveryRepository: {},
    bookingContextRepository: {
      hostOwnsProperty: jest.fn(async () => true),
      getBookingContext: jest.fn(async () => bookingContext),
    },
  });

describe("AutomationService.preview with the new variables", () => {
  test("without a booking, shows a sample value for every approved variable", async () => {
    const result = await buildService().preview("host-1", { template: ALL_VARIABLES_TEMPLATE });

    expect(result.missingVariables).toEqual([]);
    expect(result.renderedContent).not.toContain("[Missing:");
    expect(result.approvedVariables).toEqual(APPROVED_VARIABLES);
  });

  test("with a booking, fills the new variables from the booking, the check-in times and the location", async () => {
    const result = await buildService().preview("host-1", {
      template: "{{checkInTime}} {{checkOutTime}} {{propertyAddress}} {{propertyCity}} {{numberOfGuests}}",
      bookingId: "booking-1",
    });

    expect(result.renderedContent).toBe("14:00 10:30 Keizersgracht 12A, 1015 CJ Amsterdam 4");
    expect(result.missingVariables).toEqual([]);
  });

  test("with a booking whose property lacks data, marks the missing values instead of failing", async () => {
    const result = await buildService(context({ checkIn: null, location: null })).preview("host-1", {
      template: "{{checkInTime}} at {{propertyAddress}}",
      bookingId: "booking-1",
    });

    expect(result.renderedContent).toBe("[Missing: checkInTime] at [Missing: propertyAddress]");
    expect(result.missingVariables).toEqual(["checkInTime", "propertyAddress"]);
  });
});

describe("AutomationService.preview schedule", () => {
  const RULE = {
    template: "Hi {{guestName}}",
    triggerType: "CHECK_IN",
    offsetDirection: "BEFORE",
    offsetAmount: 3,
    offsetUnit: "DAYS",
    sendTime: "10:00",
    bookingId: "booking-1",
  };

  let nowSpy;
  beforeEach(() => {
    nowSpy = jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-06-01T00:00:00Z"));
  });
  afterEach(() => nowSpy.mockRestore());

  test("returns when a check-in automation would send for the booking", async () => {
    const result = await buildService().preview("host-1", RULE);

    expect(result.schedule).toEqual({
      scheduledFor: Date.parse("2026-06-17T08:00:00Z"),
      isPast: false,
      timeZone: "Europe/Amsterdam",
    });
  });

  test("uses the check-out time of the property for a check-out automation", async () => {
    const result = await buildService().preview("host-1", {
      ...RULE,
      triggerType: "CHECK_OUT",
      offsetDirection: "AFTER",
      offsetAmount: 0,
      sendTime: undefined,
    });

    expect(result.schedule.scheduledFor).toBe(Date.parse("2026-06-23T08:30:00Z"));
  });

  test("marks a send time that has already passed", async () => {
    nowSpy.mockReturnValue(Date.parse("2026-06-18T00:00:00Z"));

    const result = await buildService().preview("host-1", RULE);

    expect(result.schedule.isPast).toBe(true);
  });

  test("returns no schedule without a booking", async () => {
    const result = await buildService().preview("host-1", { ...RULE, bookingId: undefined });

    expect(result.schedule).toBeNull();
  });

  test("returns no schedule for a booking-paid automation", async () => {
    const result = await buildService().preview("host-1", {
      template: RULE.template,
      bookingId: "booking-1",
      triggerType: "BOOKING_PAID",
      offsetAmount: 2,
      offsetUnit: "HOURS",
    });

    expect(result.schedule).toBeNull();
  });

  test("still renders a booking-paid preview whose schedule fields are not valid for the trigger", async () => {
    const result = await buildService().preview("host-1", {
      template: RULE.template,
      bookingId: "booking-1",
      triggerType: "BOOKING_PAID",
      offsetDirection: "BEFORE",
      sendTime: "10:00",
    });

    expect(result.renderedContent).toBe("Hi Taylor");
    expect(result.schedule).toBeNull();
  });

  test("falls back to the stored rule of the automation for fields the request leaves out", async () => {
    const stored = { id: "automation-1", propertyId: null, template: RULE.template, ...RULE, bookingId: undefined };
    const service = buildService(context(), { getByIdForHost: jest.fn(async () => stored) });

    const result = await service.preview("host-1", { bookingId: "booking-1" }, "automation-1");

    expect(result.schedule.scheduledFor).toBe(Date.parse("2026-06-17T08:00:00Z"));
  });

  test("rejects a rule the scheduler could not calculate", async () => {
    await expect(buildService().preview("host-1", { ...RULE, offsetUnit: "HOURS" })).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
