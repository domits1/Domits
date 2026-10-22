import { getCanonicalBookingId, getBookingId } from "./guestDashboardUtils";

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

it("preserves the existing fallback for unrelated legacy dashboard displays", () => {
  expect(getBookingId({ paymentid: "payment-1" })).toBe("payment-1");
});
