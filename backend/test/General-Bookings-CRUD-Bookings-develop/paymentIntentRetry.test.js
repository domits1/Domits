const originalTestEnv = process.env.TEST;
const hadTestEnv = Object.hasOwn(process.env, "TEST");
process.env.TEST = "true";

const BookingService = require("../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingService.js").default;
const PaymentService = require("../../functions/General-Bookings-CRUD-Bookings-develop/business/paymentService.js").default;
const ReservationController = require("../../functions/General-Bookings-CRUD-Bookings-develop/controller/reservationController.js").default;

describe("Inquiry payment setup recovery", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (hadTestEnv) {
      process.env.TEST = originalTestEnv;
    } else {
      delete process.env.TEST;
    }
  });

  test("only the guest can request a retry for an Awaiting Payment booking", async () => {
    const booking = {
      id: "booking-1",
      guestid: "guest-1",
      hostid: "host-1",
      property_id: "property-1",
      status: "Awaiting Payment",
      paymentid: "FAILED: ",
      arrivaldate: 1790899200000,
      departuredate: 1791072000000,
    };
    const reservationRepository = {
      getBookingById: jest.fn().mockResolvedValue({ response: booking }),
    };
    const authManager = {
      authenticateUser: jest.fn().mockResolvedValue({ sub: "guest-1" }),
    };
    const service = new BookingService({ reservationRepository, authManager });

    await expect(service.getPaymentRetryDetails("booking-1", "Bearer guest-token")).resolves.toEqual({
      bookingId: "booking-1",
      hostId: "host-1",
      propertyId: "property-1",
      dates: {
        arrivalDate: booking.arrivaldate,
        departureDate: booking.departuredate,
      },
      paymentId: null,
    });

    authManager.authenticateUser.mockResolvedValue({ sub: "another-guest" });
    await expect(service.getPaymentRetryDetails("booking-1", "Bearer other-token")).rejects.toThrow(
      "Only the guest of this booking may retry payment setup."
    );
  });

  test("rejects retry when the booking is no longer Awaiting Payment", async () => {
    const service = new BookingService({
      reservationRepository: {
        getBookingById: jest.fn().mockResolvedValue({
          response: {
            id: "booking-1",
            guestid: "guest-1",
            status: "Paid",
          },
        }),
      },
      authManager: {
        authenticateUser: jest.fn().mockResolvedValue({ sub: "guest-1" }),
      },
    });

    await expect(service.getPaymentRetryDetails("booking-1", "Bearer guest-token")).rejects.toThrow(
      "Payment setup can only be retried for bookings awaiting payment."
    );
  });

  test("persists the payment record before replacing the booking placeholder", async () => {
    const stripeRepository = {
      getStripeAccountId: jest.fn().mockResolvedValue("acct_live"),
      createPaymentIntent: jest.fn().mockResolvedValue({
        stripePaymentId: "pi_new",
        stripeClientSecret: "secret_new",
        breakdown: { customerPays: 12500 },
      }),
      addPaymentToTable: jest.fn().mockResolvedValue(undefined),
      updatePaymentId: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PaymentService({ stripeRepository });

    await expect(service.create("host-1", "booking-1", "property-1", {
      arrivalDate: 1790899200000,
      departureDate: 1791072000000,
    })).resolves.toEqual({
      stripeClientSecret: "secret_new",
      bookingId: "booking-1",
    });

    expect(stripeRepository.addPaymentToTable).toHaveBeenCalledWith({
      stripePaymentId: "pi_new",
      stripeClientSecret: "secret_new",
      breakdown: { customerPays: 12500 },
    });
    expect(stripeRepository.addPaymentToTable.mock.invocationCallOrder[0]).toBeLessThan(
      stripeRepository.updatePaymentId.mock.invocationCallOrder[0]
    );
  });

  test("reuses an existing PaymentIntent instead of creating another one", async () => {
    const stripeRepository = {
      getPaymentIntentByPaymentId: jest.fn().mockResolvedValue({
        id: "pi_existing",
        client_secret: "secret_existing",
      }),
      addPaymentToTable: jest.fn().mockResolvedValue(undefined),
      getStripeAccountId: jest.fn(),
      createPaymentIntent: jest.fn(),
      updatePaymentId: jest.fn(),
    };
    const service = new PaymentService({ stripeRepository });

    await expect(service.create("host-1", "booking-1", "property-1", {
      arrivalDate: 1790899200000,
      departureDate: 1791072000000,
    }, "pi_existing")).resolves.toEqual({
      stripeClientSecret: "secret_existing",
      bookingId: "booking-1",
    });

    expect(stripeRepository.getPaymentIntentByPaymentId).toHaveBeenCalledWith("pi_existing");
    expect(stripeRepository.addPaymentToTable).toHaveBeenCalledWith({
      stripePaymentId: "pi_existing",
      stripeClientSecret: "secret_existing",
    });
    expect(stripeRepository.createPaymentIntent).not.toHaveBeenCalled();
    expect(stripeRepository.updatePaymentId).not.toHaveBeenCalled();
  });

  test("returns a failed payment setup response without undoing inquiry acceptance", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const bookingService = {
      acceptInquiry: jest.fn().mockResolvedValue({
        bookingId: "booking-1",
        status: "Awaiting Payment",
        hostId: "host-1",
        propertyId: "property-1",
        dates: { arrivalDate: 1790899200000, departureDate: 1791072000000 },
      }),
    };
    const paymentService = {
      create: jest.fn().mockRejectedValue(new Error("Stripe destination is unavailable.")),
    };
    const controller = new ReservationController({ bookingService, paymentService });

    const response = await controller.acceptInquiry("booking-1", "Bearer host-token");

    expect(response.statusCode).toBe(502);
    expect(response.response).toMatchObject({
      bookingId: "booking-1",
      status: "Awaiting Payment",
      paymentSetupFailed: true,
    });
    expect(response.response.message).toContain("guest can retry");
    expect(bookingService.acceptInquiry).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  test("retry action returns the client secret for the authenticated guest", async () => {
    const booking = {
      bookingId: "booking-1",
      hostId: "host-1",
      propertyId: "property-1",
      dates: { arrivalDate: 1790899200000, departureDate: 1791072000000 },
      paymentId: null,
    };
    const bookingService = {
      getPaymentRetryDetails: jest.fn().mockResolvedValue(booking),
    };
    const paymentService = {
      create: jest.fn().mockResolvedValue({ stripeClientSecret: "secret_retry" }),
    };
    const controller = new ReservationController({ bookingService, paymentService });

    const response = await controller.patch({
      headers: { Authorization: "Bearer guest-token" },
      body: JSON.stringify({ action: "retry-payment-setup", bookingId: "booking-1" }),
    });

    expect(response.statusCode).toBe(200);
    expect(response.response).toEqual({
      bookingId: "booking-1",
      stripeClientSecret: "secret_retry",
    });
    expect(paymentService.create).toHaveBeenCalledWith(
      "host-1",
      "booking-1",
      "property-1",
      booking.dates,
      null
    );
  });
});
