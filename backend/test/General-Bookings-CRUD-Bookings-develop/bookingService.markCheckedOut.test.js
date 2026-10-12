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
  status: "Paid",
  checked_out_at: null,
};

const buildService = ({
  getBookingByIdResult = { response: BOOKING },
  markCheckedOutResult = true,
  getPropertyByIdResult = { title: "Villa Sunshine" },
} = {}) => {
  const reservationRepository = {
    getBookingById: jest.fn(async () => getBookingByIdResult),
    markBookingCheckedOut: jest.fn(async () => markCheckedOutResult),
  };
  const propertyRepository = {
    getPropertyById: jest.fn(async () => getPropertyByIdResult),
  };
  const authManager = { authenticateUser: jest.fn(async () => ({ sub: "host-1" })) };
  const taskAutomationNotifier = { notifyTaskCreation: jest.fn() };
  const service = new BookingService({ reservationRepository, propertyRepository, authManager, taskAutomationNotifier });
  return { service, reservationRepository, propertyRepository, authManager, taskAutomationNotifier };
};

describe("BookingService.markCheckedOut", () => {
  test("marks the booking checked out and creates a cleaning task", async () => {
    const { service, reservationRepository, taskAutomationNotifier } = buildService();

    const result = await service.markCheckedOut("booking-1", "token-1");

    expect(reservationRepository.markBookingCheckedOut).toHaveBeenCalledWith("booking-1");
    expect(taskAutomationNotifier.notifyTaskCreation).toHaveBeenCalledWith(
      "host-1",
      expect.objectContaining({
        title: "Clean the property",
        type: "Cleaning",
        property_id: "property-1",
        property_snapshot_label: "Villa Sunshine",
        source: "automation",
      })
    );
    expect(result).toEqual({ bookingId: "booking-1" });
  });

  test("throws NotFoundException when the booking does not exist", async () => {
    const { service, reservationRepository } = buildService({ getBookingByIdResult: {} });

    await expect(service.markCheckedOut("booking-1", "token-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(reservationRepository.markBookingCheckedOut).not.toHaveBeenCalled();
  });

  test("throws Forbidden when the authenticated user is not the host", async () => {
    const { service, reservationRepository, authManager } = buildService();
    authManager.authenticateUser.mockResolvedValue({ sub: "someone-else" });

    await expect(service.markCheckedOut("booking-1", "token-1")).rejects.toBeInstanceOf(Forbidden);
    expect(reservationRepository.markBookingCheckedOut).not.toHaveBeenCalled();
  });

  test("throws BadRequestException when the booking is not Paid", async () => {
    const { service, reservationRepository } = buildService({
      getBookingByIdResult: { response: { ...BOOKING, status: "Awaiting Payment" } },
    });

    await expect(service.markCheckedOut("booking-1", "token-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(reservationRepository.markBookingCheckedOut).not.toHaveBeenCalled();
  });

  test("throws BadRequestException when the booking was already checked out", async () => {
    const { service, reservationRepository } = buildService({
      getBookingByIdResult: { response: { ...BOOKING, checked_out_at: 123 } },
    });

    await expect(service.markCheckedOut("booking-1", "token-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(reservationRepository.markBookingCheckedOut).not.toHaveBeenCalled();
  });

  test("throws BadRequestException when the atomic update finds it already checked out (race window)", async () => {
    const { service, taskAutomationNotifier } = buildService({ markCheckedOutResult: false });

    await expect(service.markCheckedOut("booking-1", "token-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(taskAutomationNotifier.notifyTaskCreation).not.toHaveBeenCalled();
  });
});
