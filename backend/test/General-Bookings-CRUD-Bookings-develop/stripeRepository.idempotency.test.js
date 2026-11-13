const originalTestEnv = process.env.TEST;
const originalStripeMode = process.env.STRIPE_MODE;
process.env.TEST = "true";
process.env.STRIPE_MODE = "test";

const stripePaymentIntentCreate = jest.fn().mockResolvedValue({
  id: "pi_booking_1",
  client_secret: "secret_booking_1",
});
const getSystemManagerParameter = jest.fn().mockResolvedValue("sk_test_domits");

jest.doMock("stripe", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: stripePaymentIntentCreate,
    },
  })),
}));

jest.doMock("../../functions/General-Bookings-CRUD-Bookings-develop/data/systemManagerRepository.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getSystemManagerParameter,
  })),
}));

jest.doMock("../../functions/General-Bookings-CRUD-Bookings-develop/util/calcuateTotalRate.js", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    hostCents: 9000,
    platformCents: 1000,
    totalCents: 10000,
  }),
}));

const StripeRepository = require("../../functions/General-Bookings-CRUD-Bookings-develop/data/stripeRepository.js").default;

describe("StripeRepository PaymentIntent idempotency", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalTestEnv === undefined) {
      delete process.env.TEST;
    } else {
      process.env.TEST = originalTestEnv;
    }
    if (originalStripeMode === undefined) {
      delete process.env.STRIPE_MODE;
    } else {
      process.env.STRIPE_MODE = originalStripeMode;
    }
  });

  test("uses a stable idempotency key derived from the booking ID", async () => {
    const repository = new StripeRepository();
    const dates = {
      arrivalDate: 1790899200000,
      departureDate: 1791072000000,
    };

    await expect(repository.createPaymentIntent("acct_live", "property-1", dates, "booking-1")).resolves.toEqual({
      stripePaymentId: "pi_booking_1",
      stripeClientSecret: "secret_booking_1",
      breakdown: {
        customerPays: 10000,
        hostReceives: 9000,
        platformFeeGross: 1000,
      },
    });

    expect(getSystemManagerParameter).toHaveBeenCalledWith("/stripe/keys/secret/test");
    expect(stripePaymentIntentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        transfer_data: { destination: "acct_live" },
        metadata: expect.objectContaining({ bookingId: "booking-1" }),
      }),
      { idempotencyKey: "booking-payment-booking-1" }
    );
  });
});
