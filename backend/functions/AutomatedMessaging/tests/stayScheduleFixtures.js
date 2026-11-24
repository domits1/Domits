import SchedulingService from "../business/schedulingService.js";

export const NOW = Date.parse("2026-06-01T00:00:00Z");

export const PAID_BOOKING = {
  id: "booking-1",
  hostid: "host-1",
  property_id: "property-1",
  status: "Paid",
  arrivaldate: Date.parse("2026-06-20T00:00:00Z"),
  departuredate: Date.parse("2026-06-23T00:00:00Z"),
};

export const CHECK_IN_ROW = { checkInFrom: "15:00:00", checkOutTill: "11:00:00" };

export const buildSchedulingService = ({
  booking = PAID_BOOKING,
  checkIn = CHECK_IN_ROW,
  outboxRepository = {},
  automationRepository,
  deliveryRepository,
}) => {
  const bookingContextRepository = {
    getBooking: jest.fn(async () => booking),
    getPropertyCheckIn: jest.fn(async () => checkIn),
  };
  const service = new SchedulingService({
    outboxRepository,
    automationRepository,
    deliveryRepository,
    bookingContextRepository,
    clock: () => NOW,
  });
  return { service, bookingContextRepository };
};
