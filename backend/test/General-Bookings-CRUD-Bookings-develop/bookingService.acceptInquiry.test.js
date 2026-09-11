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

const buildService = ({ getBookingByIdResult = { response: BOOKING }, acceptResult = { accepted: true, declinedCount: 0 } } = {}) => {
  const reservationRepository = {
    getBookingById: jest.fn(async () => getBookingByIdResult),
    acceptInquiryWithOverlapDecline: jest.fn(async () => acceptResult),
  };
  const authManager = { authenticateUser: jest.fn(async () => ({ sub: "host-1" })) };
  const service = new BookingService({ reservationRepository, authManager });
  return { service, reservationRepository, authManager };
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
});
