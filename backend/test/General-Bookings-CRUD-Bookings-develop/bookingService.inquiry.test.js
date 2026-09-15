jest.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  InvokeCommand: jest.fn().mockImplementation((input) => input),
}));

const BookingService =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingService.js").default;
const Forbidden = require("../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/Forbidden.js").default;
const NotFoundException =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/NotFoundException.js").default;
const {
  BadRequestException,
} = require("../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/badRequestException.js");

const HOST_ID = "host-1";
const INQUIRY_ID = "inquiry-1";

const buildBooking = (overrides = {}) => ({
  id: INQUIRY_ID,
  hostid: HOST_ID,
  property_id: "property-1",
  status: "Inquiry",
  arrivaldate: Date.parse("2026-06-15T00:00:00.000Z"),
  departuredate: Date.parse("2026-06-17T00:00:00.000Z"),
  ...overrides,
});

const buildService = ({ booking = buildBooking(), overlapping = [], userSub = HOST_ID } = {}) => {
  const reservationRepository = {
    getBookingById: jest
      .fn()
      .mockResolvedValue(booking ? { response: booking } : { message: "No bookings found", statusCode: 204 }),
    updateBookingStatus: jest.fn(),
    getOverlappingInquiries: jest.fn().mockResolvedValue(overlapping),
  };
  const authManager = { authenticateUser: jest.fn().mockResolvedValue({ sub: userSub }) };
  const service = new BookingService({ reservationRepository, authManager });

  return { service, reservationRepository, authManager };
};

describe("BookingService inquiry conflict resolution", () => {
  describe("guard clauses shared by acceptInquiry and declineInquiry", () => {
    it.each([
      {
        method: "acceptInquiry",
        scenario: "the booking does not exist",
        overrides: { booking: null },
        expectedError: NotFoundException,
      },
      {
        method: "acceptInquiry",
        scenario: "the caller is not the host",
        overrides: { userSub: "someone-else" },
        expectedError: Forbidden,
      },
      {
        method: "acceptInquiry",
        scenario: "the booking is no longer in Inquiry status",
        overrides: { booking: buildBooking({ status: "Paid" }) },
        expectedError: BadRequestException,
      },
      {
        method: "declineInquiry",
        scenario: "the booking does not exist",
        overrides: { booking: null },
        expectedError: NotFoundException,
      },
      {
        method: "declineInquiry",
        scenario: "the caller is not the host",
        overrides: { userSub: "someone-else" },
        expectedError: Forbidden,
      },
      {
        method: "declineInquiry",
        scenario: "the booking is no longer in Inquiry status",
        overrides: { booking: buildBooking({ status: "Paid" }) },
        expectedError: BadRequestException,
      },
    ])("$method rejects when $scenario", async ({ method, overrides, expectedError }) => {
      const { service, reservationRepository } = buildService(overrides);

      await expect(service[method](INQUIRY_ID, "Bearer token")).rejects.toThrow(expectedError);

      expect(reservationRepository.updateBookingStatus).not.toHaveBeenCalled();
      expect(reservationRepository.getOverlappingInquiries).not.toHaveBeenCalled();
    });
  });

  describe("acceptInquiry resolves competing inquiries automatically", () => {
    it("declines every overlapping inquiry and reports how many were declined", async () => {
      const overlapping = [{ id: "inquiry-2" }, { id: "inquiry-3" }];
      const { service, reservationRepository } = buildService({ overlapping });

      const result = await service.acceptInquiry(INQUIRY_ID, "Bearer token");

      expect(reservationRepository.updateBookingStatus).toHaveBeenCalledWith(INQUIRY_ID, "Awaiting Payment");
      expect(reservationRepository.updateBookingStatus).toHaveBeenCalledWith("inquiry-2", "Declined");
      expect(reservationRepository.updateBookingStatus).toHaveBeenCalledWith("inquiry-3", "Declined");
      expect(result).toEqual(
        expect.objectContaining({
          bookingId: INQUIRY_ID,
          status: "Awaiting Payment",
          declinedCount: 2,
        })
      );
    });

    it("excludes the accepted inquiry from the overlap search so it cannot decline itself", async () => {
      const booking = buildBooking();
      const { service, reservationRepository } = buildService({ booking });

      await service.acceptInquiry(INQUIRY_ID, "Bearer token");

      expect(reservationRepository.getOverlappingInquiries).toHaveBeenCalledWith({
        propertyId: booking.property_id,
        arrivalDateMs: booking.arrivaldate,
        departureDateMs: booking.departuredate,
        excludeBookingId: INQUIRY_ID,
      });
    });

    it("reports zero declines when no other inquiry overlaps the accepted dates", async () => {
      const { service, reservationRepository } = buildService({ overlapping: [] });

      const result = await service.acceptInquiry(INQUIRY_ID, "Bearer token");

      expect(result.declinedCount).toBe(0);
      expect(reservationRepository.updateBookingStatus).toHaveBeenCalledTimes(1);
      expect(reservationRepository.updateBookingStatus).toHaveBeenCalledWith(INQUIRY_ID, "Awaiting Payment");
    });

    it("leaves the accepted booking committed even when the overlap search fails", async () => {
      const { service, reservationRepository } = buildService();
      reservationRepository.getOverlappingInquiries.mockRejectedValue(new Error("connection reset"));

      await expect(service.acceptInquiry(INQUIRY_ID, "Bearer token")).rejects.toThrow("connection reset");

      expect(reservationRepository.updateBookingStatus).toHaveBeenCalledTimes(1);
      expect(reservationRepository.updateBookingStatus).toHaveBeenCalledWith(INQUIRY_ID, "Awaiting Payment");
    });
  });

  describe("declineInquiry only touches the declined booking", () => {
    it("sets the booking to Declined without searching for overlapping inquiries", async () => {
      const { service, reservationRepository } = buildService();

      const result = await service.declineInquiry(INQUIRY_ID, "Bearer token");

      expect(result).toEqual({ bookingId: INQUIRY_ID, status: "Declined" });
      expect(reservationRepository.updateBookingStatus).toHaveBeenCalledTimes(1);
      expect(reservationRepository.updateBookingStatus).toHaveBeenCalledWith(INQUIRY_ID, "Declined");
      expect(reservationRepository.getOverlappingInquiries).not.toHaveBeenCalled();
    });
  });
});
