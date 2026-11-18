jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const { Service } = require("../../functions/property-owners/business/service/service.js");
const { NotFoundException } = require("../../functions/property-owners/util/exception/notFoundException.js");

const OWNER_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const PERIOD_START = Date.UTC(2026, 10, 1);
const PERIOD_END = Date.UTC(2026, 11, 1);
const QUERY = {
  action: "financial-data",
  id: OWNER_ID,
  period_start_ms: String(PERIOD_START),
  period_end_ms: String(PERIOD_END),
  limit: "2",
  offset: "4",
};

const createService = ({
  owner = { id: OWNER_ID, host_id: "host-1", owner_type: "individual", status: "active", email: "private@example.com" },
  assignments = [],
  bookings = [],
  invoices = [],
} = {}) => {
  const repository = {
    findOwnerByIdAndHost: jest.fn(async () => owner),
    findAssignmentsByOwnerAndHostForPeriod: jest.fn(async () => assignments),
    findBookingFinancialCandidates: jest.fn(async () => bookings),
    findInvoiceFinancialSnapshots: jest.fn(async () => invoices),
  };
  return { repository, service: new Service({ repository }) };
};

describe("Service.getFinancialSourceData", () => {
  test("resolves empty currency from the stored Channex EUR price and warns only when no price was stored", async () => {
    const assignments = [{ owner_id: OWNER_ID, property_id: "property-1" }];
    const bookings = [
      {
        id: "direct-null-currency",
        property_id: "property-1",
        bookingtype: "direct",
        currency: null,
        total_price: 120,
        createdat: PERIOD_START,
      },
      {
        id: "direct-empty-currency",
        property_id: "property-1",
        bookingtype: "direct",
        currency: "",
        total_price: 150,
        createdat: PERIOD_START + 1,
      },
      {
        id: "channex-eur-price",
        property_id: "property-1",
        bookingtype: "channex",
        currency: null,
        total_price: 250,
        createdat: PERIOD_START + 2,
      },
      {
        id: "channex-zero-eur-price",
        property_id: "property-1",
        bookingtype: "channex",
        currency: "",
        total_price: 0,
        createdat: PERIOD_START + 3,
      },
      {
        id: "channex-unknown-price",
        property_id: "property-1",
        bookingtype: "channex",
        currency: null,
        total_price: null,
        createdat: PERIOD_START + 4,
      },
    ];
    const { service } = createService({ assignments, bookings });

    const result = await service.getFinancialSourceData("host-1", { ...QUERY, limit: "5" });

    expect(result.bookingCandidates.map(({ bookingId, currency }) => ({ bookingId, currency }))).toEqual([
      { bookingId: "direct-null-currency", currency: "EUR" },
      { bookingId: "direct-empty-currency", currency: "EUR" },
      { bookingId: "channex-eur-price", currency: "EUR" },
      { bookingId: "channex-zero-eur-price", currency: "EUR" },
      { bookingId: "channex-unknown-price", currency: null },
    ]);
    expect(result.dataQuality.missingCurrencyBookingIds).toEqual(["channex-unknown-price"]);
    expect(result.dataQuality.missingChannexCurrencyBookingIds).toEqual(["channex-unknown-price"]);
  });

  test("returns historical ownership, raw booking fields and linked invoice snapshots without calculating totals", async () => {
    const assignments = [
      {
        owner_id: OWNER_ID,
        property_id: "property-1",
        ownership_basis_points: 6000,
        effective_from: PERIOD_START - 86400000,
        effective_to: PERIOD_START + 86400000,
      },
      {
        owner_id: OWNER_ID,
        property_id: "property-1",
        ownership_basis_points: 4000,
        effective_from: PERIOD_START + 86400000,
        effective_to: null,
      },
    ];
    const bookings = [
      {
        id: "booking-1",
        property_id: "property-1",
        bookingtype: "channex",
        booking_source: "booking.com",
        status: "Paid",
        createdat: PERIOD_START + 1000,
        arrivaldate: PERIOD_START + 5000,
        departuredate: PERIOD_START + 86400000,
        checked_out_at: null,
        cancelled_at: null,
        total_price: 250,
        currency: null,
        paymentid: "pi_123",
        refunded_amount: 0,
        stripe_refund_id: null,
        refund_status: null,
      },
      {
        id: "booking-2",
        property_id: "property-1",
        bookingtype: "direct",
        booking_source: null,
        status: "Cancelled",
        createdat: PERIOD_START + 2000,
        arrivaldate: PERIOD_START + 6000,
        departuredate: PERIOD_START + 172800000,
        checked_out_at: null,
        cancelled_at: PERIOD_START + 3000,
        total_price: 100,
        currency: "EUR",
        paymentid: "pi_456",
        refunded_amount: "5000",
        stripe_refund_id: "re_123",
        refund_status: "succeeded",
      },
      { id: "booking-3", property_id: "property-1", bookingtype: "direct", total_price: 75 },
    ];
    const invoices = [{
      id: "invoice-1",
      invoice_number: "INV-2026-000001",
      booking_id: "booking-1",
      property_id: "property-1",
      arrival_date: PERIOD_START,
      departure_date: PERIOD_END,
      gross_amount: "250.00",
      commission_amount: "25.00",
      net_amount: "225.00",
      status: "finalized",
      created_at: PERIOD_START,
    }];
    const { repository, service } = createService({ assignments, bookings, invoices });

    const result = await service.getFinancialSourceData("host-1", QUERY);

    expect(repository.findOwnerByIdAndHost).toHaveBeenCalledWith(OWNER_ID, "host-1");
    expect(repository.findAssignmentsByOwnerAndHostForPeriod).toHaveBeenCalledWith(
      OWNER_ID,
      "host-1",
      PERIOD_START,
      PERIOD_END
    );
    expect(repository.findBookingFinancialCandidates).toHaveBeenCalledWith({
      hostId: "host-1",
      propertyIds: ["property-1"],
      periodStartMs: PERIOD_START,
      periodEndMs: PERIOD_END,
      limit: 2,
      offset: 4,
    });
    expect(repository.findInvoiceFinancialSnapshots).toHaveBeenCalledWith(["booking-1", "booking-2"], "host-1");
    expect(result.owner).toEqual({ id: OWNER_ID, owner_type: "individual", status: "active" });
    expect(result.owner).not.toHaveProperty("email");
    expect(result.ownershipAssignments).toEqual([
      {
        ownerId: OWNER_ID,
        propertyId: "property-1",
        ownershipBasisPoints: 6000,
        effectiveFromMs: PERIOD_START - 86400000,
        effectiveToMs: PERIOD_START + 86400000,
      },
      {
        ownerId: OWNER_ID,
        propertyId: "property-1",
        ownershipBasisPoints: 4000,
        effectiveFromMs: PERIOD_START + 86400000,
        effectiveToMs: null,
      },
    ]);
    expect(result.bookingCandidates).toHaveLength(2);
    expect(result.bookingCandidates[0]).toMatchObject({
      bookingId: "booking-1",
      rawTotalPrice: 250,
      currency: "EUR",
      paymentReference: "pi_123",
    });
    expect(result.bookingCandidates[1]).toMatchObject({
      bookingId: "booking-2",
      rawRefundedAmount: "5000",
      stripeRefundId: "re_123",
      refundStatus: "succeeded",
    });
    expect(result.invoiceSnapshots).toEqual([{
      invoiceId: "invoice-1",
      invoiceNumber: "INV-2026-000001",
      bookingId: "booking-1",
      propertyId: "property-1",
      arrivalDateMs: PERIOD_START,
      departureDateMs: PERIOD_END,
      grossAmount: "250.00",
      commissionAmount: "25.00",
      netAmount: "225.00",
      status: "finalized",
      createdAtMs: PERIOD_START,
    }]);
    expect(result).not.toHaveProperty("totals");
    expect(result).not.toHaveProperty("netOwnerEarnings");
    expect(result.pagination).toEqual({ limit: 2, offset: 4, returned: 2, hasMore: true, nextOffset: 6 });
    expect(result.dataQuality.missingCurrencyBookingIds).toEqual([]);
    expect(result.dataQuality.missingChannexCurrencyBookingIds).toEqual([]);
    expect(result.dataQuality.limitations.join(" ")).toMatch(/accounting-period attribution policy has not been selected/i);
  });

  test("does not query bookings or invoices when the owner has no ownership periods in the window", async () => {
    const { repository, service } = createService({ assignments: [] });

    const result = await service.getFinancialSourceData("host-1", QUERY);

    expect(result.ownershipAssignments).toEqual([]);
    expect(result.bookingCandidates).toEqual([]);
    expect(result.invoiceSnapshots).toEqual([]);
    expect(repository.findBookingFinancialCandidates).not.toHaveBeenCalled();
    expect(repository.findInvoiceFinancialSnapshots).not.toHaveBeenCalled();
    expect(result.pagination).toEqual({ limit: 2, offset: 4, returned: 0, hasMore: false, nextOffset: null });
  });

  test("returns 404 when the owner does not belong to the authenticated host", async () => {
    const { repository, service } = createService({ owner: null });

    await expect(service.getFinancialSourceData("host-1", QUERY)).rejects.toThrow(NotFoundException);
    expect(repository.findAssignmentsByOwnerAndHostForPeriod).not.toHaveBeenCalled();
  });
});
