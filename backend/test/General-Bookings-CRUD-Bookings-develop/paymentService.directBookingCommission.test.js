import { describe, expect, it, jest } from "@jest/globals";
import PaymentService from "../../functions/General-Bookings-CRUD-Bookings-develop/business/paymentService.js";

const NOW = Date.parse("2026-11-10T10:00:00.000Z");
const PERIOD_MS = 365 * 24 * 60 * 60 * 1000;

const buildRepository = (overrides = {}) => ({
  getBookingForPayment: jest.fn().mockResolvedValue({
    id: "booking-1",
    hostid: "host-1",
    booking_source: "STANDALONE_SITE",
    total_price: 810,
    commissionable_amount_cents: 76000,
  }),
  getAnnualDirectBookingRevenueCents: jest.fn().mockResolvedValue(0),
  getStripeAccountId: jest.fn().mockResolvedValue("acct-1"),
  createPaymentIntent: jest.fn().mockResolvedValue({
    stripePaymentId: "pi-1",
    stripeClientSecret: "pi-secret",
    breakdown: { customerPays: 81000 },
  }),
  updatePaymentId: jest.fn().mockResolvedValue(undefined),
  addPaymentToTable: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("PaymentService direct booking volume commission", () => {
  it("uses the standard tier and charges the guest only the quoted website total", async () => {
    const repository = buildRepository();
    const service = new PaymentService(repository, () => NOW);

    await expect(service.create("host-1", "booking-1", "property-1", {
      arrivalDate: "2026-12-01",
      departureDate: "2026-12-05",
    })).resolves.toEqual({ stripeClientSecret: "pi-secret", bookingId: "booking-1" });

    const snapshot = repository.createPaymentIntent.mock.calls[0][4];
    expect(snapshot).toMatchObject({
      customerPaysCents: 81000,
      commissionableAmountCents: 76000,
      commissionRateBps: 490,
      commissionAmountCents: 3724,
      annualRevenueCents: 76000,
      periodStart: NOW - PERIOD_MS,
      periodEnd: NOW,
    });
    expect(repository.updatePaymentId).toHaveBeenCalledWith(
      "booking-1",
      "pi-1",
      81000,
      snapshot
    );
  });

  it("switches to 4.5% when the current reservation crosses €250,000 annual revenue", async () => {
    const repository = buildRepository({
      getAnnualDirectBookingRevenueCents: jest.fn().mockResolvedValue(24_990_000),
    });
    const service = new PaymentService(repository, () => NOW);

    await service.create("host-1", "booking-1", "property-1", { arrivalDate: "2026-12-01", departureDate: "2026-12-05" });

    expect(repository.createPaymentIntent.mock.calls[0][4]).toMatchObject({
      commissionRateBps: 450,
      annualRevenueCents: 25_066_000,
      commissionAmountCents: 3420,
    });
  });

  it("does not apply direct booking pricing to marketplace or OTA bookings", async () => {
    const repository = buildRepository({
      getBookingForPayment: jest.fn().mockResolvedValue({
        id: "booking-1",
        hostid: "host-1",
        booking_source: null,
      }),
    });
    const service = new PaymentService(repository, () => NOW);

    await service.create("host-1", "booking-1", "property-1", { arrivalDate: "2026-12-01", departureDate: "2026-12-05" });

    expect(repository.getAnnualDirectBookingRevenueCents).not.toHaveBeenCalled();
    expect(repository.createPaymentIntent).toHaveBeenCalledWith(
      "acct-1",
      "property-1",
      expect.any(Object),
      "booking-1",
      null
    );
    expect(repository.updatePaymentId).toHaveBeenCalledWith("booking-1", "pi-1", 81000, null);
  });

  it("rejects a missing booking before creating a Stripe PaymentIntent", async () => {
    const repository = buildRepository({
      getBookingForPayment: jest.fn().mockResolvedValue(null),
    });
    const service = new PaymentService(repository, () => NOW);

    await expect(
      service.create("host-1", "missing-booking", "property-1", { arrivalDate: "2026-12-01", departureDate: "2026-12-05" })
    ).rejects.toThrow("Booking not found.");
    expect(repository.createPaymentIntent).not.toHaveBeenCalled();
  });

  it("rejects payment creation by a different host", async () => {
    const repository = buildRepository({
      getBookingForPayment: jest.fn().mockResolvedValue({
        id: "booking-1",
        hostid: "another-host",
        booking_source: "STANDALONE_SITE",
      }),
    });
    const service = new PaymentService(repository, () => NOW);

    await expect(
      service.create("host-1", "booking-1", "property-1", { arrivalDate: "2026-12-01", departureDate: "2026-12-05" })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.createPaymentIntent).not.toHaveBeenCalled();
  });

  it("rejects an Enterprise booking until its custom rate is configured", async () => {
    const repository = buildRepository({
      getAnnualDirectBookingRevenueCents: jest.fn().mockResolvedValue(499_999_999),
    });
    const service = new PaymentService(repository, () => NOW);

    await expect(
      service.create("host-1", "booking-1", "property-1", { arrivalDate: "2026-12-01", departureDate: "2026-12-05" })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "DIRECT_BOOKING_ENTERPRISE_TIER_REQUIRED",
    });
    expect(repository.createPaymentIntent).not.toHaveBeenCalled();
  });
});
