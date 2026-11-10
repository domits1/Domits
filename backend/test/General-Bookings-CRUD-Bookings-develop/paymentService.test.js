process.env.TEST = "true";

const PaymentService = require("../../functions/General-Bookings-CRUD-Bookings-develop/business/paymentService.js").default;

describe("PaymentService.create", () => {
  test("passes the preflight commission into Stripe and persists the applied commission", async () => {
    const commission = {
      rate: 0.045,
      amountCents: 450,
      annualRevenueCents: 25_010_000,
      year: 2026,
      commissionableAccommodationCents: 10_000,
    };
    const stripeRepository = {
      getStripeAccountId: jest.fn().mockResolvedValue("acct_host"),
      createPaymentIntent: jest.fn().mockResolvedValue({
        stripePaymentId: "pi_test",
        stripeClientSecret: "pi_test_secret",
        breakdown: { customerPays: 20_000, hostReceives: 19_550, platformFeeGross: 450 },
        commission: {
          rate: commission.rate,
          amountCents: commission.commissionAmountCents,
          annualRevenueCents: commission.annualRevenueCents,
          year: commission.year,
        },
      }),
      updatePaymentId: jest.fn().mockResolvedValue(undefined),
      addPaymentToTable: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PaymentService({ stripeRepository });

    const result = await service.create(
      "host-1",
      "booking-1",
      "property-1",
      { arrivalDate: 1000, departureDate: 2000 },
      commission
    );

    expect(stripeRepository.createPaymentIntent).toHaveBeenCalledWith(
      "acct_host",
      "property-1",
      { arrivalDate: 1000, departureDate: 2000 },
      "booking-1",
      "host-1",
      commission
    );
    expect(stripeRepository.updatePaymentId).toHaveBeenCalledWith(
      "booking-1",
      "pi_test",
      20_000,
      expect.objectContaining({ rate: 0.045, amountCents: 450, year: 2026 })
    );
    expect(result).toEqual({ stripeClientSecret: "pi_test_secret", bookingId: "booking-1" });
  });
});
