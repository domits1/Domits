import { getCanonicalBookingId, getBookingId, getReservationNumber } from "./guestDashboardUtils";

it.each([
  [{ id: "booking-1", paymentid: "payment-1" }, "booking-1"],
  [{ ID: "booking-1" }, "booking-1"],
  [{ bookingId: "booking-1" }, "booking-1"],
  [{ paymentid: "payment-1" }, null],
  [{ paymentId: "payment-1" }, null],
  [null, null],
])("uses only canonical booking identifiers for reviews: %p", (booking, expected) => {
  expect(getCanonicalBookingId(booking)).toBe(expected);
});

// Unpaid bookings carry the backend placeholder "FAILED: " as paymentid, so it must never be shown.
it.each([
  [{ id: "booking-1", paymentid: "FAILED: " }, "booking-1"],
  [{ id: "booking-1", paymentid: "pi_123" }, "booking-1"],
  [{ ID: "booking-1", paymentId: "pi_123" }, "booking-1"],
  [{ bookingId: "booking-1" }, "booking-1"],
  [{ paymentid: "pi_123" }, "-"],
  [null, "-"],
])("shows the canonical booking id as reservation number, never the payment id: %p", (booking, expected) => {
  expect(getReservationNumber(booking)).toBe(expected);
});

it("preserves the existing fallback for unrelated legacy dashboard displays", () => {
  expect(getBookingId({ paymentid: "payment-1" })).toBe("payment-1");
});
