const originalTestEnv = process.env.TEST;
const hadTestEnv = Object.hasOwn(process.env, "TEST");
process.env.TEST = "true";

const BookingService = require("../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingService.js").default;

afterAll(() => {
  if (hadTestEnv) {
    process.env.TEST = originalTestEnv;
  } else {
    delete process.env.TEST;
  }
});

describe("BookingService booking-paid outbox", () => {
  test("Paid transition creates one outbox event when confirmation is retried", async () => {
    const reservationRepository = {
      getBookingByPaymentId: jest
        .fn()
        .mockResolvedValueOnce({ id: "booking-1", status: "Awaiting Payment" })
        .mockResolvedValueOnce({ id: "booking-1", status: "Paid" }),
      markBookingPaidWithOutbox: jest.fn(async () => true),
    };
    const service = new BookingService({
      reservationRepository,
      stripeRepository: { getPaymentIntentByPaymentId: jest.fn(async () => ({ status: "succeeded" })) },
    });

    await service.confirmPayment("payment-1");
    await service.confirmPayment("payment-1");

    expect(reservationRepository.markBookingPaidWithOutbox).toHaveBeenCalledTimes(1);
    expect(reservationRepository.markBookingPaidWithOutbox).toHaveBeenCalledWith("booking-1");
  });

  test("reports a payment transition only to the request that changes the booking", async () => {
    const reservationRepository = {
      getBookingByPaymentId: jest.fn().mockResolvedValue({ id: "booking-1", status: "Awaiting Payment" }),
      markBookingPaidWithOutbox: jest.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false),
    };
    const service = new BookingService({
      reservationRepository,
      stripeRepository: { getPaymentIntentByPaymentId: jest.fn(async () => ({ status: "succeeded" })) },
    });

    const results = await Promise.all([
      service.confirmPayment("payment-1"),
      service.confirmPayment("payment-1"),
    ]);

    expect(reservationRepository.markBookingPaidWithOutbox).toHaveBeenCalledTimes(2);
    expect(results.filter((result) => result.newlyPaid)).toHaveLength(1);
    expect(results.filter((result) => !result.newlyPaid)).toHaveLength(1);
    expect(results.every((result) => result.paymentConfirmed)).toBe(true);
  });
});
