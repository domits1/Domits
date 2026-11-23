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

const buildService = (bookingContext = context()) =>
  new AutomationService({
    automationRepository: {},
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
