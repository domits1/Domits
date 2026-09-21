const {
  MissedRevenueService,
} = require("../../functions/PriceLabs-Integration/business/service/missedRevenueService.js");

const createRepository = ({ connection = { is_active: true }, priceRows = [], bookings = [] } = {}) => ({
  getConnectionByHost: jest.fn(async () => connection),
  getCalendarPriceDataForHost: jest.fn(async () => priceRows),
  getBookingsByHost: jest.fn(async () => bookings),
});

const createService = (opts) => {
  const repository = createRepository(opts);
  return { repository, service: new MissedRevenueService({ repository }) };
};

describe("MissedRevenueService.getMissedRevenue", () => {
  test("returns not connected when the host has no active PriceLabs connection", async () => {
    const { service, repository } = createService({ connection: null });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result).toEqual({ connected: false });
    expect(repository.getCalendarPriceDataForHost).not.toHaveBeenCalled();
  });

  test("sums PriceLabs price for unbooked nights only", async () => {
    const { service } = createService({
      priceRows: [
        { property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 120 },
        { property_id: "prop-1", calendar_date: 20260902, pricelabs_price: 130 },
        { property_id: "prop-1", calendar_date: 20260903, pricelabs_price: 140 },
      ],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-02T00:00:00Z"),
          departuredate: Date.parse("2026-09-03T00:00:00Z"),
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.connected).toBe(true);
    expect(result.grossMissedRevenue).toBe(260);
    expect(result.unbookedNightsWithPriceData).toBe(2);
  });

  test("excludes cancelled bookings from the booked set", async () => {
    const { service } = createService({
      priceRows: [{ property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100 }],
      bookings: [
        {
          property_id: "prop-1",
          status: "cancelled",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.grossMissedRevenue).toBe(100);
    expect(result.unbookedNightsWithPriceData).toBe(1);
  });

  test("counts nights with a calendar row but no PriceLabs price separately from missed revenue", async () => {
    const { service } = createService({
      priceRows: [
        { property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100 },
        { property_id: "prop-1", calendar_date: 20260902, pricelabs_price: null },
      ],
      bookings: [],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.grossMissedRevenue).toBe(100);
    expect(result.unbookedNightsWithPriceData).toBe(1);
    expect(result.unbookedNightsWithoutPriceData).toBe(1);
    expect(result.priceDataCoveragePct).toBeCloseTo(50);
  });

  test("returns zero missed revenue and 0% coverage when there is no calendar price data at all", async () => {
    const { service } = createService({ priceRows: [], bookings: [] });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.grossMissedRevenue).toBe(0);
    expect(result.unbookedNightsWithPriceData).toBe(0);
    expect(result.unbookedNightsWithoutPriceData).toBe(0);
    expect(result.priceDataCoveragePct).toBe(0);
  });

  test("breaks the total down per property", async () => {
    const { service } = createService({
      priceRows: [
        { property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100 },
        { property_id: "prop-2", calendar_date: 20260901, pricelabs_price: 200 },
      ],
      bookings: [],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.byProperty).toEqual(
      expect.arrayContaining([
        { propertyId: "prop-1", missedRevenue: 100, unbookedNightsWithPriceData: 1 },
        { propertyId: "prop-2", missedRevenue: 200, unbookedNightsWithPriceData: 1 },
      ])
    );
  });
});
