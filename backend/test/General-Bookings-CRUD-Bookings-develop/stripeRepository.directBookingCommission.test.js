process.env.TEST = "true";

const StripeRepository = require("../../functions/General-Bookings-CRUD-Bookings-develop/data/stripeRepository.js").default;

const BOOKING = {
  id: "booking-1",
  hostid: "host-1",
  booking_source: "STANDALONE_SITE",
  commissionable_accommodation_cents: 10_000,
  total_price: 120,
};

const buildDatabase = (revenueCents = 24_999_900) => {
  const aggregateQuery = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ annual_revenue_cents: String(revenueCents) }),
  };
  const bookingRepository = {
    findOneBy: jest.fn().mockResolvedValue(BOOKING),
    createQueryBuilder: jest.fn().mockReturnValue(aggregateQuery),
  };
  return {
    database: { getRepository: jest.fn().mockReturnValue(bookingRepository) },
    bookingRepository,
    aggregateQuery,
  };
};

describe("StripeRepository direct booking commission", () => {
  test("preflights paid annual accommodation revenue and includes the current booking", async () => {
    const { database, bookingRepository, aggregateQuery } = buildDatabase(24_999_900);
    const repository = new StripeRepository({
      databaseProvider: async () => database,
      clock: () => new Date("2026-11-10T12:00:00.000Z"),
      stripeProvider: async () => ({ paymentIntents: { create: jest.fn() } }),
    });

    const result = await repository.getDirectBookingCommission("booking-1", "host-1");

    expect(result).toEqual({
      rate: 0.045,
      commissionAmountCents: 450,
      annualRevenueCents: 25_009_900,
      year: 2026,
      commissionableAccommodationCents: 10_000,
    });
    expect(bookingRepository.findOneBy).toHaveBeenCalledWith({ id: "booking-1" });
    expect(aggregateQuery.where).toHaveBeenCalledWith("booking.hostid = :hostId", { hostId: "host-1" });
    expect(aggregateQuery.andWhere).toHaveBeenCalledWith("booking.status = :status", { status: "Paid" });
    expect(aggregateQuery.andWhere).toHaveBeenCalledWith("booking.createdat >= :yearStart", {
      yearStart: Date.UTC(2026, 0, 1),
    });
    expect(aggregateQuery.andWhere).toHaveBeenCalledWith("booking.createdat < :nextYearStart", {
      nextYearStart: Date.UTC(2027, 0, 1),
    });
    expect(aggregateQuery.andWhere).toHaveBeenCalledWith("booking.id <> :bookingId", { bookingId: "booking-1" });
  });

  test("requires Enterprise configuration before the booking is accepted", async () => {
    const { database } = buildDatabase(499_999_999);
    const repository = new StripeRepository({
      databaseProvider: async () => database,
      clock: () => new Date("2026-11-10T12:00:00.000Z"),
    });

    await expect(repository.getDirectBookingCommission("booking-1", "host-1")).rejects.toMatchObject({
      code: "DIRECT_BOOKING_ENTERPRISE_RATE_REQUIRED",
      statusCode: 409,
    });
  });

  test("reuses the preflight result when creating the Stripe PaymentIntent", async () => {
    const { database } = buildDatabase(24_999_900);
    const createPaymentIntent = jest.fn().mockResolvedValue({
      id: "pi_test",
      client_secret: "pi_test_secret",
    });
    const repository = new StripeRepository({
      databaseProvider: async () => database,
      clock: () => new Date("2026-11-10T12:00:00.000Z"),
      stripeProvider: async () => ({ paymentIntents: { create: createPaymentIntent } }),
    });
    const commission = await repository.getDirectBookingCommission("booking-1", "host-1");

    const result = await repository.createPaymentIntent(
      "acct_host",
      "property-1",
      { arrivalDate: 1000, departureDate: 2000 },
      "booking-1",
      "host-1",
      commission
    );

    expect(createPaymentIntent).toHaveBeenCalledWith(expect.objectContaining({
      amount: 12_000,
      currency: "eur",
      application_fee_amount: 450,
      transfer_data: { destination: "acct_host" },
      metadata: expect.objectContaining({
        bookingSource: "STANDALONE_SITE",
        commissionRate: "0.045",
        commissionAmountCents: "450",
        annualRevenueCents: "25009900",
        commissionYear: "2026",
      }),
    }));
    expect(result.breakdown).toEqual({
      customerPays: 12_000,
      hostReceives: 11_550,
      platformFeeGross: 450,
    });
  });

  test("rejects an invalid persisted accommodation amount instead of treating it as a legacy booking", async () => {
    const database = {
      getRepository: jest.fn().mockReturnValue({
        findOneBy: jest.fn().mockResolvedValue({
          ...BOOKING,
          commissionable_accommodation_cents: -100,
        }),
      }),
    };
    const createPaymentIntent = jest.fn();
    const repository = new StripeRepository({
      databaseProvider: async () => database,
      stripeProvider: async () => ({ paymentIntents: { create: createPaymentIntent } }),
    });

    await expect(repository.createPaymentIntent(
      "acct_host",
      "property-1",
      { arrivalDate: 1000, departureDate: 2000 },
      "booking-1",
      "host-1"
    )).rejects.toThrow("Failed to create payment intent.");
    expect(createPaymentIntent).not.toHaveBeenCalled();
  });
});
