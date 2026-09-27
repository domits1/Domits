import { randomUUID } from "node:crypto";

// Review: Produces verification evidence and moderation signals for submitted reviews.
export default class ReviewVerificationService {
  // Review: Check the review text and recent activity before trusting the booking match.
  evaluate({ review, booking, now, recentReviews = [] }) {
    const text = `${review.title || ""} ${review.publicReview || ""}`.trim();
    const signals = [];
    if (/https?:\/\/|www\./i.test(text)) signals.push("EXTERNAL_LINK");
    if (/(.)\1{9,}/u.test(text)) signals.push("REPEATED_CHARACTERS");
    if (text.length < 20) signals.push("VERY_SHORT_REVIEW");
    const otherReviews = recentReviews.filter((previous) => previous.id !== review.id);
    const normalizedReview = String(review.publicReview || "").trim().toLowerCase();
    if (normalizedReview && otherReviews.some((previous) => String(previous.publicReview || "").trim().toLowerCase() === normalizedReview)) {
      signals.push("DUPLICATE_CONTENT");
    }
    if (otherReviews.filter((previous) => Number(previous.createdAt) >= now - 24 * 60 * 60 * 1000).length >= 3) {
      signals.push("HIGH_SUBMISSION_VELOCITY");
    }
    const status = signals.length ? "NEEDS_REVIEW" : "VERIFIED_STAY";
    return {
      id: randomUUID(), reviewId: review.id, bookingId: booking.id,
      status, method: "BOOKING_MATCH",
      evidenceJson: JSON.stringify({
        bookingId: booking.id, guestId: booking.guestid,
        propertyId: booking.property_id, checkoutAt: Number(booking.departuredate), signals,
      }),
      verifiedAt: status === "VERIFIED_STAY" ? now : null,
      createdAt: now, updatedAt: now,
    };
  }
}
