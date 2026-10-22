export function safeReviewDestination(value) {
  if (typeof value !== "string") return null;
  try {
    const destination = new URL(value, window.location.origin);
    if (destination.origin !== window.location.origin || destination.pathname !== "/review" ||
        !["bookingId", "reservationId", "reviewId"].some(key => destination.searchParams.get(key)?.trim())) {
      return null;
    }
    return `${destination.pathname}${destination.search}`;
  } catch {
    return null;
  }
}
