const originalTestEnv = process.env.TEST;
const hadTestEnv = Object.hasOwn(process.env, "TEST");
process.env.TEST = "true";

const BookingService = require("../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingService.js").default;
const NotFoundException = require("../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/NotFoundException.js").default;
const Forbidden = require("../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/Forbidden.js").default;
const { BadRequestException } = require("../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/badRequestException.js");

afterAll(() => {
  if (hadTestEnv) {
    process.env.TEST = originalTestEnv;
  } else {
    delete process.env.TEST;
  }
});

const BOOKING = {
  id: "booking-1",
  hostid: "host-1",
  property_id: "property-1",
  arrivaldate: 1000,
  departuredate: 2000,
  status: "Inquiry",
};

const buildService = ({
  getBookingByIdResult = { response: BOOKING },
  acceptResult = { accepted: true, declinedCount: 0 },
  stripeRepository = { getDirectBookingCommission: jest.fn(async () => null) },
} = {}) => {
  const reservationRepository = {
    getBookingById: jest.fn(async () => getBookingByIdResult),
    acceptInquiryWithOverlapDecline: jest.fn(async () => acceptResult),
  };
  const authManager = { authenticateUser: jest.fn(async () => ({ sub: "host-1" })) };
  const service = new BookingService({ reservationRepository, authManager, stripeRepository });
  return { service, reservationRepository, authManager, stripeRepository };
};

describe("BookingService.acceptInquiry", () => {
  test("accepts an inquiry, declines overlaps atomically, and returns the summary", async () => {
    const { service, reservationRepository } = buildService({ acceptResult: { accepted: true, declinedCount: 2 } });

    const result = await service.acceptInquiry("booking-1", "token-1");

    expect(reservationRepository.acceptInquiryWithOverlapDecline).toHaveBeenCalledWith({
      bookingId: "booking-1",
      propertyId: "property-1",
      arrivalDateMs: 1000,
      departureDateMs: 2000,
    });
    expect(result).toEqual({
      bookingId: "booking-1",
      status: "Awaiting Payment",
      hostId: "host-1",
      propertyId: "property-1",
      declinedCount: 2,
      dates: { arrivalDate: 1000, departureDate: 2000 },
    });
  });

  test("checks the Enterprise tier before changing a Standalone Site inquiry and reuses the quote", async () => {
    const commission = {
      rate: 0.045,
      commissionAmountCents: 450,
      annualRevenueCents: 25_010_000,
      year: 2026,
      commissionableAccommodationCents: 10_000,
    };
    const { service, reservationRepository, stripeRepository } = buildService({
      getBookingByIdResult: { response: { ...BOOKING, booking_source: "STANDALONE_SITE" } },
      stripeRepository: { getDirectBookingCommission: jest.fn(async () => commission) },
    });

    const result = await service.acceptInquiry("booking-1", "token-1");

    expect(stripeRepository.getDirectBookingCommission).toHaveBeenCalledWith("booking-1", "host-1");
    expect(stripeRepository.getDirectBookingCommission.mock.invocationCallOrder[0]).toBeLessThan(
      reservationRepository.acceptInquiryWithOverlapDecline.mock.invocationCallOrder[0]
    );
    expect(result.commission).toEqual(commission);
  });

  test("does not accept or decline overlapping inquiries when an Enterprise rate is missing", async () => {
    const enterpriseError = Object.assign(new Error("Enterprise rate required."), {
      code: "DIRECT_BOOKING_ENTERPRISE_RATE_REQUIRED",
      statusCode: 409,
    });
    const { service, reservationRepository } = buildService({
      getBookingByIdResult: { response: { ...BOOKING, booking_source: "STANDALONE_SITE" } },
      stripeRepository: {
        getDirectBookingCommission: jest.fn().mockRejectedValue(enterpriseError),
      },
    });

    await expect(service.acceptInquiry("booking-1", "token-1")).rejects.toMatchObject({
      code: "DIRECT_BOOKING_ENTERPRISE_RATE_REQUIRED",
      statusCode: 409,
    });
    expect(reservationRepository.acceptInquiryWithOverlapDecline).not.toHaveBeenCalled();
  });

  test("throws NotFoundException when the booking does not exist", async () => {
    const { service, reservationRepository } = buildService({ getBookingByIdResult: {} });

    await expect(service.acceptInquiry("booking-1", "token-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(reservationRepository.acceptInquiryWithOverlapDecline).not.toHaveBeenCalled();
  });

  test("throws Forbidden when the authenticated user is not the host", async () => {
    const { service, reservationRepository, authManager } = buildService();
    authManager.authenticateUser.mockResolvedValue({ sub: "someone-else" });

    await expect(service.acceptInquiry("booking-1", "token-1")).rejects.toBeInstanceOf(Forbidden);
    expect(reservationRepository.acceptInquiryWithOverlapDecline).not.toHaveBeenCalled();
  });

  test("throws BadRequestException without calling the repository when the booking is already past Inquiry", async () => {
    const { service, reservationRepository } = buildService({
      getBookingByIdResult: { response: { ...BOOKING, status: "Awaiting Payment" } },
    });

    await expect(service.acceptInquiry("booking-1", "token-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(reservationRepository.acceptInquiryWithOverlapDecline).not.toHaveBeenCalled();
  });

  test("throws BadRequestException when the atomic re-check finds the booking already transitioned (race window)", async () => {
    const { service, reservationRepository } = buildService({ acceptResult: { accepted: false, declinedCount: 0 } });

    await expect(service.acceptInquiry("booking-1", "token-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(reservationRepository.acceptInquiryWithOverlapDecline).toHaveBeenCalledWith({
      bookingId: "booking-1",
      propertyId: "property-1",
      arrivalDateMs: 1000,
      departureDateMs: 2000,
    });
  });

  test("throws a dates-unavailable BadRequestException when an overlap already holds a blocking status", async () => {
    const { service } = buildService({
      acceptResult: { accepted: false, declinedCount: 0, reason: "CONFLICT_EXISTING_BOOKING" },
    });

    await expect(service.acceptInquiry("booking-1", "token-1")).rejects.toMatchObject({
      message: "Dates are no longer available for this booking.",
    });
  });
});
