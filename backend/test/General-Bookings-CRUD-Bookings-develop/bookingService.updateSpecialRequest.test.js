const originalTestEnv = process.env.TEST;
const hadTestEnv = Object.hasOwn(process.env, "TEST");
process.env.TEST = "true";

const BookingService = require("../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingService.js").default;
const { BadRequestException } = require("../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/badRequestException.js");
const ForbiddenModule = require("../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/Forbidden.js");
const NotFoundNotationModule = require("../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/NotFoundException.js");

const Forbidden = ForbiddenModule.default || ForbiddenModule;
const NotFoundException = NotFoundNotationModule.default || NotFoundNotationModule;

afterAll(() => {
  if (hadTestEnv) {
    process.env.TEST = originalTestEnv;
  } else {
    delete process.env.TEST;
  }
});

describe("BookingService.updateSpecialRequest validation and authorization", () => {
  const authToken = "valid-auth-token";
  const guestId = "guest-1";
  const bookingId = "booking-1";

  test("wrong guest (not the booking owner) throws Forbidden", async () => {
    const reservationRepository = {
      getBookingById: jest.fn(async () => ({
        response: { id: bookingId, guestid: "guest-2", status: "Paid" },
      })),
    };
    const authManager = {
      authenticateUser: jest.fn(async () => ({ sub: guestId })),
    };
    const service = new BookingService({ reservationRepository, authManager });

    await expect(service.updateSpecialRequest(bookingId, "Please late check-in", authToken)).rejects.toBeInstanceOf(
      Forbidden
    );
  });

  test("missing/nonexistent bookingId throws NotFoundException", async () => {
    const reservationRepository = {
      getBookingById: jest.fn(async () => ({
        response: null,
      })),
    };
    const authManager = {
      authenticateUser: jest.fn(async () => ({ sub: guestId })),
    };
    const service = new BookingService({ reservationRepository, authManager });

    await expect(service.updateSpecialRequest(bookingId, "Please late check-in", authToken)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  test("valid request succeeds with persisted:true", async () => {
    const specialRequest = "Late check-in around 9pm, please";
    const reservationRepository = {
      getBookingById: jest.fn(async () => ({
        response: { id: bookingId, guestid: guestId, status: "Paid" },
      })),
      updateBookingSpecialRequest: jest.fn(async () => ({
        response: { id: bookingId, special_request: specialRequest },
        statusCode: 200,
        persisted: true,
      })),
    };
    const authManager = {
      authenticateUser: jest.fn(async () => ({ sub: guestId })),
    };
    const service = new BookingService({ reservationRepository, authManager });

    const result = await service.updateSpecialRequest(bookingId, specialRequest, authToken);

    expect(result.persisted).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(reservationRepository.updateBookingSpecialRequest).toHaveBeenCalledWith(bookingId, specialRequest);
  });

  test("non-string special request throws BadRequestException", async () => {
    const authManager = {
      authenticateUser: jest.fn(async () => ({ sub: guestId })),
    };
    const service = new BookingService({ authManager });

    await expect(service.updateSpecialRequest(bookingId, 123, authToken)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateSpecialRequest(bookingId, null, authToken)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateSpecialRequest(bookingId, undefined, authToken)).rejects.toBeInstanceOf(BadRequestException);
  });

  test("special request exceeding 500 characters throws BadRequestException", async () => {
    const longText = "a".repeat(501);
    const authManager = {
      authenticateUser: jest.fn(async () => ({ sub: guestId })),
    };
    const service = new BookingService({ authManager });

    await expect(service.updateSpecialRequest(bookingId, longText, authToken)).rejects.toBeInstanceOf(BadRequestException);
  });

  test("special request at exactly 500 characters succeeds", async () => {
    const textAt500 = "a".repeat(500);
    const reservationRepository = {
      getBookingById: jest.fn(async () => ({
        response: { id: bookingId, guestid: guestId, status: "Paid" },
      })),
      updateBookingSpecialRequest: jest.fn(async () => ({
        response: { id: bookingId, special_request: textAt500 },
        statusCode: 200,
        persisted: true,
      })),
    };
    const authManager = {
      authenticateUser: jest.fn(async () => ({ sub: guestId })),
    };
    const service = new BookingService({ reservationRepository, authManager });

    const result = await service.updateSpecialRequest(bookingId, textAt500, authToken);

    expect(result.persisted).toBe(true);
    expect(reservationRepository.updateBookingSpecialRequest).toHaveBeenCalledWith(bookingId, textAt500);
  });
});
