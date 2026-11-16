const originalTestEnv = process.env.TEST;
const originalStripeMode = process.env.STRIPE_MODE;
process.env.TEST = "true";
process.env.STRIPE_MODE = "test";

let currentRate = {
  hostCents: 9000,
  platformCents: 1000,
  totalCents: 10000,
};
const idempotencyResults = new Map();
let nextPaymentIntentNumber = 1;
const stripePaymentIntentCreate = jest.fn(async (parameters, options) => {
  const cached = idempotencyResults.get(options.idempotencyKey);
  if (cached) {
    if (cached.error) throw cached.error;
    return cached.paymentIntent;
  }

  if (parameters.transfer_data.destination === "acct_incomplete") {
    const error = new Error("No such account: acct_incomplete");
    idempotencyResults.set(options.idempotencyKey, { error });
    throw error;
  }

  const id = "pi_booking_" + nextPaymentIntentNumber++;
  const paymentIntent = {
    id,
    client_secret: "secret_" + id,
  };
  idempotencyResults.set(options.idempotencyKey, { paymentIntent });
  return paymentIntent;
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
  default: jest.fn().mockImplementation(async () => currentRate),
}));

const StripeRepository = require("../../functions/General-Bookings-CRUD-Bookings-develop/data/stripeRepository.js").default;

describe("StripeRepository PaymentIntent idempotency", () => {
  afterEach(() => {
    jest.clearAllMocks();
    idempotencyResults.clear();
    nextPaymentIntentNumber = 1;
    currentRate = {
      hostCents: 9000,
      platformCents: 1000,
      totalCents: 10000,
    };
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

  test("uses a stable key for identical PaymentIntent request parameters", async () => {
    const repository = new StripeRepository();
    const dates = {
      arrivalDate: 1790899200000,
      departureDate: 1791072000000,
    };

    const first = await repository.createPaymentIntent("acct_live", "property-1", dates, "booking-1");
    const second = await repository.createPaymentIntent("acct_live", "property-1", dates, "booking-1");

    expect(first.stripePaymentId).toBe(second.stripePaymentId);
    expect(first.stripeClientSecret).toBe(second.stripeClientSecret);
    expect(stripePaymentIntentCreate).toHaveBeenCalledTimes(2);
    expect(stripePaymentIntentCreate.mock.calls[0][1].idempotencyKey).toBe(
      stripePaymentIntentCreate.mock.calls[1][1].idempotencyKey
    );
    expect(getSystemManagerParameter).toHaveBeenCalledWith("/stripe/keys/secret/test");
  });

  test("uses a new key after the connected account changes and when the amount changes", async () => {
    const repository = new StripeRepository();
    const dates = {
      arrivalDate: 1790899200000,
      departureDate: 1791072000000,
    };

    await expect(
      repository.createPaymentIntent("acct_incomplete", "property-1", dates, "booking-1")
    ).rejects.toThrow("No such account: acct_incomplete");
    const failedKey = stripePaymentIntentCreate.mock.calls[0][1].idempotencyKey;

    await expect(
      repository.createPaymentIntent("acct_incomplete", "property-1", dates, "booking-1")
    ).rejects.toThrow("No such account: acct_incomplete");
    expect(stripePaymentIntentCreate.mock.calls[1][1].idempotencyKey).toBe(failedKey);

    const repaired = await repository.createPaymentIntent("acct_reconnected", "property-1", dates, "booking-1");
    const repairedKey = stripePaymentIntentCreate.mock.calls[2][1].idempotencyKey;

    expect(repairedKey).not.toBe(failedKey);
    expect(repaired.stripePaymentId).toBeTruthy();

    const duplicate = await repository.createPaymentIntent("acct_reconnected", "property-1", dates, "booking-1");
    expect(stripePaymentIntentCreate.mock.calls[3][1].idempotencyKey).toBe(repairedKey);
    expect(duplicate.stripePaymentId).toBe(repaired.stripePaymentId);

    currentRate = {
      hostCents: 10800,
      platformCents: 1200,
      totalCents: 12000,
    };
    const repriced = await repository.createPaymentIntent("acct_reconnected", "property-1", dates, "booking-1");
    const repricedKey = stripePaymentIntentCreate.mock.calls[4][1].idempotencyKey;

    expect(repricedKey).not.toBe(repairedKey);
    expect(stripePaymentIntentCreate.mock.calls[4][0]).toMatchObject({
      amount: 12000,
      application_fee_amount: 1200,
    });
    expect(repriced.stripePaymentId).not.toBe(repaired.stripePaymentId);
  });
});
