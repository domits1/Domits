const mockDatabase = {
  getInstance: jest.fn(),
};

jest.mock("database", () => ({
  __esModule: true,
  default: mockDatabase,
  getInstance: mockDatabase.getInstance,
}));

const PropertyRepository =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/data/propertyRepository.js").default;

const createClient = ({ availabilityWindows = [], calendarOverrides = [], schema = "main" } = {}) => ({
  options: { schema },
  query: jest.fn().mockResolvedValueOnce(availabilityWindows).mockResolvedValueOnce(calendarOverrides),
});

describe("PropertyRepository booking calendar availability guard", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("allows booking dates inside the host availability window", async () => {
    const client = createClient({
      availabilityWindows: [{ availablestartdate: 20260615, availableenddate: 20260621 }],
    });
    mockDatabase.getInstance.mockResolvedValue(client);
    const repository = new PropertyRepository();

    await expect(
      repository.assertBookingDatesAvailable({
        propertyId: "property-1",
        arrivalDateMs: Date.parse("2026-06-15T00:00:00.000Z"),
        departureDateMs: Date.parse("2026-06-17T00:00:00.000Z"),
      })
    ).resolves.toBe(true);
  });

  test("queries schema-qualified host availability tables", async () => {
    const client = createClient({
      availabilityWindows: [{ availablestartdate: 20260615, availableenddate: 20260621 }],
    });
    mockDatabase.getInstance.mockResolvedValue(client);
    const repository = new PropertyRepository();

    await repository.assertBookingDatesAvailable({
      propertyId: "property-1",
      arrivalDateMs: Date.parse("2026-06-15T00:00:00.000Z"),
      departureDateMs: Date.parse("2026-06-17T00:00:00.000Z"),
    });

    expect(client.query.mock.calls[0][0]).toContain('FROM "main"."property_availability"');
    expect(client.query.mock.calls[1][0]).toContain('FROM "main"."property_calendar_override"');
  });

  test("rejects host-unavailable calendar override dates", async () => {
    const client = createClient({
      availabilityWindows: [{ availablestartdate: 20260615, availableenddate: 20260621 }],
      calendarOverrides: [{ calendar_date: 20260616, is_available: false }],
    });
    mockDatabase.getInstance.mockResolvedValue(client);
    const repository = new PropertyRepository();

    await expect(
      repository.assertBookingDatesAvailable({
        propertyId: "property-1",
        arrivalDateMs: Date.parse("2026-06-15T00:00:00.000Z"),
        departureDateMs: Date.parse("2026-06-17T00:00:00.000Z"),
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Selected dates are not available.",
    });
  });

  test("excludes checkout date from host availability validation", async () => {
    const client = createClient({
      availabilityWindows: [{ availablestartdate: 20260615, availableenddate: 20260621 }],
      calendarOverrides: [{ calendar_date: 20260617, is_available: false }],
    });
    mockDatabase.getInstance.mockResolvedValue(client);
    const repository = new PropertyRepository();

    await expect(
      repository.assertBookingDatesAvailable({
        propertyId: "property-1",
        arrivalDateMs: Date.parse("2026-06-15T00:00:00.000Z"),
        departureDateMs: Date.parse("2026-06-17T00:00:00.000Z"),
      })
    ).resolves.toBe(true);
  });

  test("allows explicit available override outside the base availability window", async () => {
    const client = createClient({
      availabilityWindows: [{ availablestartdate: 20260618, availableenddate: 20260621 }],
      calendarOverrides: [
        { calendar_date: 20260615, is_available: true },
        { calendar_date: 20260616, is_available: true },
      ],
    });
    mockDatabase.getInstance.mockResolvedValue(client);
    const repository = new PropertyRepository();

    await expect(
      repository.assertBookingDatesAvailable({
        propertyId: "property-1",
        arrivalDateMs: Date.parse("2026-06-15T00:00:00.000Z"),
        departureDateMs: Date.parse("2026-06-17T00:00:00.000Z"),
      })
    ).resolves.toBe(true);
  });
});
