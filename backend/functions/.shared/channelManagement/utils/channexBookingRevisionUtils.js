export const buildChannexPullIssue = (code, message, extra = {}) => ({
  code,
  message,
  ...extra,
});

export const CHANNEX_BOOKING_CREATED_TRIGGER = "BOOKING_CREATED";
export const CHANNEX_BOOKING_MODIFIED_TRIGGER = "BOOKING_MODIFIED";
export const CHANNEX_BOOKING_CANCELLED_TRIGGER = "BOOKING_CANCELLED";

const requireStr = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const toBookingAvailabilityBridgeBooking = (booking) =>
  booking
    ? {
        id: requireStr(booking.id),
        property_id: requireStr(booking.propertyId),
        hostid: requireStr(booking.hostId),
        guestid: requireStr(booking.guestId),
        guestname: requireStr(booking.guestName),
        arrivaldate: booking.arrivalDateMs,
        departuredate: booking.departureDateMs,
        status: requireStr(booking.status),
        paymentid: requireStr(booking.paymentId),
        bookingtype: requireStr(booking.bookingType),
      }
    : null;
