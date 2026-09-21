// Without TEST=true the ORM targets the live schema and the default repositories reach SSM,
// which crashes the Jest worker before the suite finishes.
const originalTestEnv = process.env.TEST;
const hadTestEnv = Object.hasOwn(process.env, "TEST");
process.env.TEST = "true";

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

afterAll(() => {
  if (hadTestEnv) {
    process.env.TEST = originalTestEnv;
  } else {
    delete process.env.TEST;
  }
});

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

const buildService = ({ booking = buildBooking(), userSub = HOST_ID } = {}) => {
  const reservationRepository = {
    getBookingById: jest
      .fn()
      .mockResolvedValue(booking ? { response: booking } : { message: "No bookings found", statusCode: 204 }),
    updateBookingStatus: jest.fn(),
  };
  const authManager = { authenticateUser: jest.fn().mockResolvedValue({ sub: userSub }) };
  const service = new BookingService({ reservationRepository, authManager });

  return { service, reservationRepository, authManager };
};

describe("BookingService.declineInquiry", () => {
  it.each([
    {
      scenario: "the booking does not exist",
      overrides: { booking: null },
      expectedError: NotFoundException,
    },
    {
      scenario: "the caller is not the host",
      overrides: { userSub: "someone-else" },
      expectedError: Forbidden,
    },
    {
      scenario: "the booking is no longer in Inquiry status",
      overrides: { booking: buildBooking({ status: "Paid" }) },
      expectedError: BadRequestException,
    },
  ])("rejects without writing when $scenario", async ({ overrides, expectedError }) => {
    const { service, reservationRepository } = buildService(overrides);

    await expect(service.declineInquiry(INQUIRY_ID, "Bearer token")).rejects.toThrow(expectedError);

    expect(reservationRepository.updateBookingStatus).not.toHaveBeenCalled();
  });

  it("sets only the declined booking to Declined", async () => {
    const { service, reservationRepository } = buildService();

    const result = await service.declineInquiry(INQUIRY_ID, "Bearer token");

    expect(result).toEqual({ bookingId: INQUIRY_ID, status: "Declined" });
    expect(reservationRepository.updateBookingStatus).toHaveBeenCalledTimes(1);
    expect(reservationRepository.updateBookingStatus).toHaveBeenCalledWith(INQUIRY_ID, "Declined");
  });
});
