export const REVIEWABLE_BOOKING_STATUSES = ["paid", "confirmed"];

export const completedStayError = (booking, now) => {
  const status = String(booking?.status || "").trim().toLowerCase();
  if (!REVIEWABLE_BOOKING_STATUSES.includes(status)) return "Only paid or confirmed reservations can be reviewed.";
  const checkoutAt = Number(booking?.departuredate);
  if (!Number.isFinite(checkoutAt) || checkoutAt <= 0 || checkoutAt > now) {
    return "You can only review a reservation after checkout.";
  }
  return null;
};
