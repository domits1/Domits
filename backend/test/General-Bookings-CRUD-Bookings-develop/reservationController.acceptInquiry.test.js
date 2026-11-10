const originalTestEnv = process.env.TEST;
const hadTestEnv = Object.hasOwn(process.env, "TEST");
process.env.TEST = "true";

const ReservationController = require("../../functions/General-Bookings-CRUD-Bookings-develop/controller/reservationController.js").default;

afterAll(() => {
  if (hadTestEnv) process.env.TEST = originalTestEnv;
  else delete process.env.TEST;
});

describe("ReservationController.acceptInquiry", () => {
  const commission = {
    rate: 0.045,
    commissionAmountCents: 450,
    annualRevenueCents: 25_010_000,
    year: 2026,
    commissionableAccommodationCents: 10_000,
  };
  const preparedAcceptance = {
    bookingId: "booking-1",
    hostId: "host-1",
    propertyId: "property-1",
    dates: { arrivalDate: 1000, departureDate: 2000 },
    commission,
  };

  const buildController = ({ completeResult = {}, createResult = {} } = {}) => {
    const bookingService = {
      prepareInquiryAcceptance: jest.fn().mockResolvedValue(preparedAcceptance),
      completeInquiryAcceptance: jest.fn().mockResolvedValue({
        ...preparedAcceptance,
        status: "Awaiting Payment",
        declinedCount: 0,
      }),
      ...completeResult,
    };
    const paymentService = {
      create: jest.fn().mockResolvedValue({
        stripePaymentId: "pi_test",
        stripeClientSecret: "pi_test_secret",
      }),
      cancel: jest.fn().mockResolvedValue(undefined),
      ...createResult,
    };
    return {
      controller: new ReservationController({ bookingService, paymentService }),
      bookingService,
      paymentService,
    };
  };

  test("creates payment before transitioning the inquiry and omits commission details from the API response", async () => {
    const { controller, bookingService, paymentService } = buildController();

    const result = await controller.acceptInquiry("booking-1", "token-1");

    expect(paymentService.create).toHaveBeenCalledWith(
      "host-1",
      "booking-1",
      "property-1",
      { arrivalDate: 1000, departureDate: 2000 },
      commission
    );
    expect(paymentService.create.mock.invocationCallOrder[0]).toBeLessThan(
      bookingService.completeInquiryAcceptance.mock.invocationCallOrder[0]
    );
    expect(result.statusCode).toBe(200);
    expect(result.response).toMatchObject({
      bookingId: "booking-1",
      stripeClientSecret: "pi_test_secret",
      status: "Awaiting Payment",
    });
    expect(result.response.commission).toBeUndefined();
  });

  test("leaves the inquiry unchanged when Stripe payment setup fails", async () => {
    const { controller, bookingService, paymentService } = buildController({
      createResult: { create: jest.fn().mockRejectedValue(new Error("Stripe unavailable")) },
    });

    await expect(controller.acceptInquiry("booking-1", "token-1")).rejects.toThrow("Stripe unavailable");

    expect(bookingService.completeInquiryAcceptance).not.toHaveBeenCalled();
    expect(paymentService.cancel).not.toHaveBeenCalled();
  });

  test("cancels the unconfirmed PaymentIntent when the inquiry can no longer be accepted", async () => {
    const conflict = Object.assign(new Error("Dates are no longer available."), { statusCode: 400 });
    const { controller, bookingService, paymentService } = buildController({
      completeResult: { completeInquiryAcceptance: jest.fn().mockRejectedValue(conflict) },
    });

    await expect(controller.acceptInquiry("booking-1", "token-1")).rejects.toBe(conflict);

    expect(paymentService.cancel).toHaveBeenCalledWith("pi_test", "booking-1");
  });
});
