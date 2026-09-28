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
  test("rejects a range longer than 366 days even when called directly, bypassing the controller", async () => {
    const { service, repository } = createService();

    await expect(service.getMissedRevenue("host-1", "2025-01-01", "2026-12-31")).rejects.toEqual(
      expect.objectContaining({ status: 400 })
    );
    expect(repository.getCalendarPriceDataForHost).not.toHaveBeenCalled();
  });

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

  test.each([
    ["Confirmed", true],
    ["CONFIRMED", true],
    ["confirmed", true],
    ["Accepted", true],
    ["Paid", true],
    ["Completed", true],
    ["cancelled", false],
    ["Inquiry", false],
    ["Awaiting Payment", false],
  ])('a booking with status %p blocks the night from missed revenue: %s', async (status, blocksNight) => {
    const { service } = createService({
      priceRows: [{ property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100 }],
      bookings: [
        {
          property_id: "prop-1",
          status,
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.grossMissedRevenue).toBe(blocksNight ? 0 : 100);
    expect(result.unbookedNightsWithPriceData).toBe(blocksNight ? 0 : 1);
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

  test("labels the amount as EUR, matching the other PriceLabs insights", async () => {
    const { service } = createService({
      priceRows: [{ property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100 }],
      bookings: [],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.currency).toBe("EUR");
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
        {
          propertyId: "prop-1",
          missedRevenue: 100,
          unbookedNightsWithPriceData: 1,
          actualRevenue: 0,
          potentialRevenue: 100,
          potentialOccupiedNights: 1,
        },
        {
          propertyId: "prop-2",
          missedRevenue: 200,
          unbookedNightsWithPriceData: 1,
          actualRevenue: 0,
          potentialRevenue: 200,
          potentialOccupiedNights: 1,
        },
      ])
    );
  });

  test("breaks actual and potential revenue down per property", async () => {
    const { service } = createService({
      priceRows: [
        { property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100 },
        { property_id: "prop-2", calendar_date: 20260901, pricelabs_price: 200 },
      ],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-02T00:00:00Z"),
          departuredate: Date.parse("2026-09-03T00:00:00Z"),
          total_price: 150,
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    const prop1 = result.byProperty.find((p) => p.propertyId === "prop-1");
    const prop2 = result.byProperty.find((p) => p.propertyId === "prop-2");

    expect(prop1.actualRevenue).toBe(150);
    expect(prop1.potentialRevenue).toBe(100);
    expect(prop1.potentialOccupiedNights).toBe(1);

    expect(prop2.actualRevenue).toBe(0);
    expect(prop2.potentialRevenue).toBe(200);
    expect(prop2.potentialOccupiedNights).toBe(1);
  });

  test.each([
    ["a night the host blocked (is_available false)", { is_available: false }, { is_available: true }],
    ["a stop-sell night", { stop_sell: true }, { stop_sell: false }],
    ["a night the host told PriceLabs to ignore", { pricelabs_ignored: true }, { pricelabs_ignored: false }],
    ["a night for a DRAFT property", { property_status: "DRAFT" }, { property_status: "ACTIVE" }],
    ["a night for an INACTIVE property", { property_status: "INACTIVE" }, { property_status: "ACTIVE" }],
    ["a night for an ARCHIVED property", { property_status: "ARCHIVED" }, { property_status: "ACTIVE" }],
  ])("excludes %s from missed revenue", async (_description, excludedFlags, sellableFlags) => {
    const { service } = createService({
      priceRows: [
        { property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100, ...excludedFlags },
        { property_id: "prop-1", calendar_date: 20260902, pricelabs_price: 100, ...sellableFlags },
      ],
      bookings: [],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.grossMissedRevenue).toBe(100);
    expect(result.unbookedNightsWithPriceData).toBe(1);
  });

  test("sums actual revenue from a booking wholly inside the range", async () => {
    const { service } = createService({
      priceRows: [],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-03T00:00:00Z"), // 2 nights
          total_price: 200,
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.actualRevenue).toBe(200);
  });

  test("prorates actual revenue for a booking that spans the range boundary", async () => {
    const { service } = createService({
      priceRows: [],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          // 10-night booking, 2026-08-30 -> 2026-09-09, total_price=1000 => 100/night.
          // Range 2026-09-01 -> 2026-09-02 is inclusive on both ends (matches
          // validateDateRange/defaultMonthRange), so only those 2 nights count.
          arrivaldate: Date.parse("2026-08-30T00:00:00Z"),
          departuredate: Date.parse("2026-09-09T00:00:00Z"),
          total_price: 1000,
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-02");

    expect(result.actualRevenue).toBe(200);
  });

  test("contributes zero actual revenue for a booking wholly outside the range", async () => {
    const { service } = createService({
      priceRows: [],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-08-01T00:00:00Z"),
          departuredate: Date.parse("2026-08-03T00:00:00Z"),
          total_price: 200,
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.actualRevenue).toBe(0);
  });

  test("nets actual revenue against refunded_amount, converting cents to euros", async () => {
    const { service } = createService({
      priceRows: [],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
          total_price: 300,
          refunded_amount: 10000, // cents => 100 EUR
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.actualRevenue).toBe(200);
  });

  test("treats a null total_price as zero actual revenue without throwing", async () => {
    const { service } = createService({
      priceRows: [],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
          total_price: null,
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.actualRevenue).toBe(0);
  });

  test.each([
    ["Confirmed", true],
    ["Accepted", true],
    ["Paid", true],
    ["Completed", true],
    ["cancelled", false],
    ["Inquiry", false],
    ["Awaiting Payment", false],
  ])("a booking with status %p contributes to actual revenue: %s", async (status, contributes) => {
    const { service } = createService({
      priceRows: [],
      bookings: [
        {
          property_id: "prop-1",
          status,
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
          total_price: 100,
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.actualRevenue).toBe(contributes ? 100 : 0);
  });

  test("clamps actual revenue at zero when a refund exceeds the booking's total_price", async () => {
    const { service } = createService({
      priceRows: [],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
          total_price: 100,
          refunded_amount: 20000, // cents => 200 EUR, exceeds total_price
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.actualRevenue).toBe(0);
  });

  test("sums actual revenue from two overlapping bookings on the same property/night without deduping", async () => {
    const { service } = createService({
      priceRows: [],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
          total_price: 100,
        },
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
          total_price: 150,
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.actualRevenue).toBe(250);
  });

  test("potential revenue counts every sellable night, booked or unbooked, at pricelabs_price", async () => {
    const { service } = createService({
      priceRows: [
        { property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100 },
        { property_id: "prop-1", calendar_date: 20260902, pricelabs_price: 150 },
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

    expect(result.potentialRevenue).toBe(250);
    expect(result.potentialOccupiedNights).toBe(2);
  });

  test("potential revenue includes a booked night even when its row has is_available: false", async () => {
    const { service } = createService({
      priceRows: [{ property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100, is_available: false }],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.potentialRevenue).toBe(100);
    expect(result.potentialOccupiedNights).toBe(1);
  });

  test("potential revenue excludes a host-blocked, never-booked night with is_available: false", async () => {
    const { service } = createService({
      priceRows: [{ property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100, is_available: false }],
      bookings: [],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.potentialRevenue).toBe(0);
    expect(result.potentialOccupiedNights).toBe(0);
  });

  test.each([
    ["a stop-sell night", { stop_sell: true }, { stop_sell: false }],
    ["a night the host told PriceLabs to ignore", { pricelabs_ignored: true }, { pricelabs_ignored: false }],
    ["a night for a DRAFT property", { property_status: "DRAFT" }, { property_status: "ACTIVE" }],
    ["a night for an INACTIVE property", { property_status: "INACTIVE" }, { property_status: "ACTIVE" }],
    ["a night for an ARCHIVED property", { property_status: "ARCHIVED" }, { property_status: "ACTIVE" }],
  ])("excludes %s from potential revenue", async (_description, excludedFlags, sellableFlags) => {
    const { service } = createService({
      priceRows: [
        { property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100, ...excludedFlags },
        { property_id: "prop-1", calendar_date: 20260902, pricelabs_price: 100, ...sellableFlags },
      ],
      bookings: [],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.potentialRevenue).toBe(100);
    expect(result.potentialOccupiedNights).toBe(1);
  });

  test("tracks a potential night with a calendar row but no PriceLabs price separately from potential revenue", async () => {
    const { service } = createService({
      priceRows: [
        { property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100 },
        { property_id: "prop-1", calendar_date: 20260902, pricelabs_price: null },
      ],
      bookings: [],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.potentialRevenue).toBe(100);
    expect(result.potentialOccupiedNights).toBe(2);
    expect(result.potentialNightsWithPriceData).toBe(1);
    expect(result.potentialNightsWithoutPriceData).toBe(1);
  });

  test("computes revenue efficiency as actual revenue over potential revenue", async () => {
    const { service } = createService({
      priceRows: [{ property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100 }],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
          total_price: 25,
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    // actualRevenue=25, potentialRevenue=100 => 25%
    expect(result.revenueEfficiencyPct).toBeCloseTo(25);
  });

  test("revenue efficiency ignores actual revenue from a property with no priced potential nights, but actualRevenue keeps it", async () => {
    const { service } = createService({
      priceRows: [{ property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100 }],
      bookings: [
        {
          property_id: "prop-2",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
          total_price: 25,
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.actualRevenue).toBe(25);
    expect(result.revenueEfficiencyPct).toBe(0);
  });

  test("revenue efficiency only counts booked nights that have a priced calendar row, so partial coverage cannot exceed the real ratio", async () => {
    const { service } = createService({
      priceRows: [{ property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100 }],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-03T00:00:00Z"),
          total_price: 200,
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    // Night 2 has no calendar row: it is in actualRevenue (200) but not in potential (100).
    expect(result.actualRevenue).toBe(200);
    expect(result.revenueEfficiencyPct).toBeCloseTo(100);
  });

  test("revenue efficiency excludes a booked night that potential revenue excludes (stop-sell)", async () => {
    const { service } = createService({
      priceRows: [
        { property_id: "prop-1", calendar_date: 20260901, pricelabs_price: 100, stop_sell: true },
        { property_id: "prop-1", calendar_date: 20260902, pricelabs_price: 100 },
      ],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
          total_price: 100,
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.potentialRevenue).toBe(100);
    expect(result.revenueEfficiencyPct).toBe(0);
  });

  test("revenue efficiency is null, not 0, when potential revenue is 0", async () => {
    const { service } = createService({ priceRows: [], bookings: [] });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.revenueEfficiencyPct).toBeNull();
  });

  test("revenue efficiency is null for a host who earned money but has no priced potential nights", async () => {
    const { service } = createService({
      priceRows: [],
      bookings: [
        {
          property_id: "prop-1",
          status: "confirmed",
          arrivaldate: Date.parse("2026-09-01T00:00:00Z"),
          departuredate: Date.parse("2026-09-02T00:00:00Z"),
          total_price: 100,
        },
      ],
    });

    const result = await service.getMissedRevenue("host-1", "2026-09-01", "2026-09-30");

    expect(result.actualRevenue).toBe(100);
    expect(result.revenueEfficiencyPct).toBeNull();
  });
});
