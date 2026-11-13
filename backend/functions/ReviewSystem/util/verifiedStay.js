export const REVIEWABLE_BOOKING_STATUSES = ["paid", "confirmed"];

// Submission and public verification use the same completed-reservation policy.
export const completedStayError = (booking, now) => {
  const status = String(booking?.status || "").trim().toLowerCase();
  if (!REVIEWABLE_BOOKING_STATUSES.includes(status)) return "Only paid or confirmed reservations can be reviewed.";
  const checkoutAt = Number(booking?.departuredate);
  if (!Number.isFinite(checkoutAt) || checkoutAt <= 0 || checkoutAt > now) {
    return "You can only review a reservation after checkout.";
  }
  return null;
};

export const applyCompletedStayConditions = (query, now) => query
  .andWhere("LOWER(TRIM(stay.status)) IN (:...stayStatuses)", { stayStatuses: REVIEWABLE_BOOKING_STATUSES })
  .andWhere("stay.departuredate > 0 AND stay.departuredate <= :stayNow", { stayNow: now });
