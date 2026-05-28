import {
  calculateRefundAmountCents,
  getRefundPercentage,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/util/refundCalculator.js";
import ReservationController from "../../functions/General-Bookings-CRUD-Bookings-develop/controller/reservationController.js";
import PaymentService from "../../functions/General-Bookings-CRUD-Bookings-develop/business/paymentService.js";

describe("Refund Logic - 10 Test Scenarios", () => {
  const totalPrice = 10000; // €100.00
  const totalPriceCents = totalPrice * 100; // 10,000 cents

  // Test data for all refund policy windows
  const scenarios = [
    {
      name: "Flexible: Cancel 12h before (within 24h window)",
      policy: "flexible",
      hoursBeforeArrival: 12,
      expectedPercentage: 0,
      expectedAmountCents: 0,
    },
    {
      name: "Flexible: Cancel 25h before (outside 24h window)",
      policy: "flexible",
      hoursBeforeArrival: 25,
      expectedPercentage: 1,
      expectedAmountCents: totalPriceCents,
    },
    {
      name: "Moderate: Cancel 3 days before (less than 5 days)",
      policy: "moderate",
      hoursBeforeArrival: 72,
      expectedPercentage: 0.5,
      expectedAmountCents: Math.round(totalPriceCents * 0.5),
    },
    {
      name: "Moderate: Cancel 6 days before (5+ days)",
      policy: "moderate",
      hoursBeforeArrival: 144,
      expectedPercentage: 1,
      expectedAmountCents: totalPriceCents,
    },
    {
      name: "Limited: Cancel 6 days before (less than 7 days)",
      policy: "limited",
      hoursBeforeArrival: 144,
      expectedPercentage: 0,
      expectedAmountCents: 0,
    },
    {
      name: "Limited: Cancel 10 days before (7-14 days)",
      policy: "limited",
      hoursBeforeArrival: 240,
      expectedPercentage: 0.5,
      expectedAmountCents: Math.round(totalPriceCents * 0.5),
    },
    {
      name: "Limited: Cancel 15 days before (14+ days)",
      policy: "limited",
      hoursBeforeArrival: 360,
      expectedPercentage: 1,
      expectedAmountCents: totalPriceCents,
    },
    {
      name: "Firm: Cancel 6 days before (less than 7 days)",
      policy: "firm",
      hoursBeforeArrival: 144,
      expectedPercentage: 0,
      expectedAmountCents: 0,
    },
    {
      name: "Firm: Cancel 25 days before (7-30 days)",
      policy: "firm",
      hoursBeforeArrival: 600,
      expectedPercentage: 0.5,
      expectedAmountCents: Math.round(totalPriceCents * 0.5),
    },
    {
      name: "Firm: Cancel 35 days before (30+ days)",
      policy: "firm",
      hoursBeforeArrival: 840,
      expectedPercentage: 1,
      expectedAmountCents: totalPriceCents,
    },
  ];

  describe("Refund Calculator - getRefundPercentage()", () => {
    scenarios.forEach((scenario) => {
      it(scenario.name, () => {
        const now = new Date();
        const arrivalDate = new Date(now.getTime() + scenario.hoursBeforeArrival * 60 * 60 * 1000);

        const percentage = getRefundPercentage(scenario.policy, arrivalDate, now);

        expect(percentage).toBe(scenario.expectedPercentage);
      });
    });

    it("should throw error for invalid policy", () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      expect(() => {
        getRefundPercentage("invalid_policy", futureDate, now);
      }).toThrow("Unsupported cancellation policy");
    });

    it("should throw error for invalid arrival date", () => {
      expect(() => {
        getRefundPercentage("flexible", "not-a-date", new Date());
      }).toThrow("Invalid arrivalDate");
    });
  });

  describe("Refund Calculator - calculateRefundAmountCents()", () => {
    scenarios.forEach((scenario) => {
      it(`${scenario.name} - calculates correct amount`, () => {
        const now = new Date();
        const arrivalDate = new Date(now.getTime() + scenario.hoursBeforeArrival * 60 * 60 * 1000);

        const amountCents = calculateRefundAmountCents(scenario.policy, arrivalDate, totalPriceCents, now);

        expect(amountCents).toBe(scenario.expectedAmountCents);
      });
    });

    it("should reject negative totalPriceCents", () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      expect(() => {
        calculateRefundAmountCents("flexible", futureDate, -100, now);
      }).toThrow("totalPriceCents must be a non-negative number");
    });

    it("should reject non-finite totalPriceCents", () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      expect(() => {
        calculateRefundAmountCents("flexible", futureDate, Number.NaN, now);
      }).toThrow("totalPriceCents must be a non-negative number");
    });
  });

  describe("Cancellation Flow with Mocked Stripe", () => {
    let controller;
    let mockBookingService;
    let mockStripe;
    const authEvent = { headers: { Authorization: "Bearer test_token" } };
    const bookingDefaults = {
      id: "booking123",
      guestid: "guest123",
      cancellation_policy: "flexible",
      total_price: 100,
      paymentid: "pi_test_123456",
      status: "Confirmed",
    };

    beforeEach(() => {
      mockStripe = {
        paymentIntents: {
          retrieve: jest.fn().mockResolvedValue({
            id: "pi_test_123456",
            currency: "eur",
            status: "succeeded",
          }),
        },
        refunds: {
          create: jest.fn().mockResolvedValue({
            id: "re_test_123456",
            amount: 5000,
            status: "succeeded",
          }),
        },
      };

      mockBookingService = {
        authManager: {
          authenticateUser: jest.fn().mockResolvedValue({ sub: "guest123" }),
        },
        reservationRepository: {
          getBookingById: jest.fn(),
          cancelBookingByGuest: jest.fn().mockResolvedValue({
            response: { id: "booking123", status: "Cancelled" },
            statusCode: 200,
          }),
        },
        priceLabsBookingNotifier: {
          notifyBookingChange: jest.fn().mockResolvedValue({}),
        },
      };

      controller = new ReservationController({
        bookingService: mockBookingService,
        paymentService: new PaymentService(),
      });
      controller.stripe = mockStripe;
    });

    const arrivalDateHoursFromNow = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000);

    const mockBooking = (overrides = {}) => {
      const booking = {
        ...bookingDefaults,
        arrivaldate: arrivalDateHoursFromNow(25),
        ...overrides,
      };
      mockBookingService.reservationRepository.getBookingById.mockResolvedValue({ response: booking });
      return booking;
    };

    const expectCancelRecord = (bookingId, refundInfo) => {
      expect(mockBookingService.reservationRepository.cancelBookingByGuest).toHaveBeenCalledWith(
        bookingId,
        "guest123",
        refundInfo
      );
    };

    it("should process refund successfully for Moderate policy 3 days before", async () => {
      const bookingId = "booking_moderate_3d";
      mockBooking({
        id: bookingId,
        cancellation_policy: "moderate",
        arrivaldate: arrivalDateHoursFromNow(72),
      });

      const result = await controller.cancelBooking(bookingId, authEvent);

      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith("pi_test_123456");

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        {
          payment_intent: "pi_test_123456",
          amount: 5000,
          reason: "requested_by_customer",
        },
        {
          idempotencyKey: "refund-pi_test_123456-5000",
        }
      );

      expectCancelRecord(bookingId, {
        refundedAmount: 5000,
        stripeRefundId: "re_test_123456",
        refundError: null,
      });

      expect(result.statusCode).toBe(200);
    });

    it("should not create a second Stripe refund when the booking already has a refund id", async () => {
      const bookingId = "booking_already_refunded";
      mockBooking({
        id: bookingId,
        paymentid: "pi_test_already_refunded",
        stripe_refund_id: "re_existing_123",
        refunded_amount: 10000,
        status: "Cancelled",
      });

      const result = await controller.cancelBooking(bookingId, authEvent);

      expect(mockStripe.paymentIntents.retrieve).not.toHaveBeenCalled();
      expect(mockStripe.refunds.create).not.toHaveBeenCalled();
      expectCancelRecord(bookingId, {
        refundedAmount: 10000,
        stripeRefundId: "re_existing_123",
        refundError: null,
      });
      expect(result.statusCode).toBe(200);
    });

    it("should not refund a non-EUR PaymentIntent", async () => {
      const bookingId = "booking_usd_payment";
      mockBooking({ id: bookingId, paymentid: "pi_test_usd" });
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: "pi_test_usd",
        currency: "usd",
        status: "succeeded",
      });

      const result = await controller.cancelBooking(bookingId, authEvent);

      expect(mockStripe.refunds.create).not.toHaveBeenCalled();
      expectCancelRecord(bookingId, {
        refundedAmount: 10000,
        stripeRefundId: null,
        refundError: "Cannot refund usd PaymentIntent pi_test_usd; expected eur.",
      });
      expect(result.statusCode).toBe(200);
    });

    it("should not process refund for Flexible policy within 24h", async () => {
      const bookingId = "booking_flexible_12h";
      mockBooking({
        id: bookingId,
        arrivaldate: arrivalDateHoursFromNow(12),
        paymentid: "pi_test_789012",
      });

      const result = await controller.cancelBooking(bookingId, authEvent);

      expect(mockStripe.refunds.create).not.toHaveBeenCalled();
      expectCancelRecord(bookingId, {
        refundedAmount: 0,
        stripeRefundId: null,
        refundError: null,
      });

      expect(result.statusCode).toBe(200);
    });

    it("should handle Stripe API errors gracefully and still cancel booking", async () => {
      const bookingId = "booking_stripe_error";
      mockBooking({ id: bookingId, paymentid: "pi_test_failed" });
      mockStripe.refunds.create.mockRejectedValue(new Error("Card declined"));

      const result = await controller.cancelBooking(bookingId, authEvent);

      expectCancelRecord(bookingId, {
        refundedAmount: 10000,
        stripeRefundId: null,
        refundError: "Card declined",
      });

      expect(result.statusCode).toBe(200);
    });

    it("should handle missing Stripe configuration", async () => {
      const bookingId = "booking_no_stripe";
      mockBooking({ id: bookingId, paymentid: "pi_test_123" });
      controller.stripe = null;

      const result = await controller.cancelBooking(bookingId, authEvent);

      expect(mockStripe.refunds.create).not.toHaveBeenCalled();
      expectCancelRecord(bookingId, {
        refundedAmount: 10000,
        stripeRefundId: null,
        refundError: null,
      });

      expect(result.statusCode).toBe(200);
    });

    it("should handle booking without payment ID", async () => {
      const bookingId = "booking_no_payment";
      mockBooking({ id: bookingId, paymentid: null });

      const result = await controller.cancelBooking(bookingId, authEvent);

      expect(mockStripe.refunds.create).not.toHaveBeenCalled();

      expect(result.statusCode).toBe(200);
    });

    it("should correctly round refund amounts in cents", async () => {
      const bookingId = "booking_rounding";
      const priceInEuros = 33.33;
      const priceInCents = Math.round(priceInEuros * 100);
      mockBooking({
        id: bookingId,
        cancellation_policy: "moderate",
        arrivaldate: arrivalDateHoursFromNow(72),
        total_price: priceInEuros,
        paymentid: "pi_test_odd",
      });

      await controller.cancelBooking(bookingId, authEvent);

      const expectedRefund = Math.round(priceInCents * 0.5);
      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        {
          payment_intent: "pi_test_odd",
          amount: expectedRefund,
          reason: "requested_by_customer",
        },
        {
          idempotencyKey: `refund-pi_test_odd-${expectedRefund}`,
        }
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero-value booking", () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const refund = calculateRefundAmountCents("flexible", futureDate, 0, now);
      expect(refund).toBe(0);
    });

    it("should handle very large booking amounts", () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 150 * 60 * 60 * 1000);
      const largePriceCents = 99999999;

      const refund = calculateRefundAmountCents("moderate", futureDate, largePriceCents, now);
      expect(refund).toBe(largePriceCents);
      expect(refund).toBeLessThanOrEqual(largePriceCents);
    });

    it("should treat cancellation at exact policy threshold as meeting that threshold", () => {
      const now = new Date();
      const exactly5DaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      const percentage = getRefundPercentage("moderate", exactly5DaysLater, now);
      expect(percentage).toBe(1);
    });

    it("should handle cancellation just before threshold", () => {
      const now = new Date();
      const just4DaysAnd59MinsLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 - 60 * 1000);

      const percentage = getRefundPercentage("moderate", just4DaysAnd59MinsLater, now);
      expect(percentage).toBe(0.5);
    });
  });
});
