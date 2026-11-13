import { isPublished } from "./reviewRules.js";

export const ALERT_TYPES = Object.freeze({
  NEW_REVIEW: "NEW_REVIEW", LOW_RATING: "LOW_RATING",
  DECLINING_RATING: "DECLINING_RATING", RESPONSE_OVERDUE: "RESPONSE_OVERDUE",
});
export const DEFAULT_RESPONSE_OVERDUE_HOURS = 72;
const HOUR_MS = 3_600_000;
const id = (value) => typeof value === "string" && value.trim().length > 0;
const timestamp = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function responseOverdueHours(value) {
  const hours = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof hours === "number" && Number.isFinite(hours) && hours > 0
    && Number.isSafeInteger(hours * HOUR_MS) && hours * HOUR_MS > 0
    ? hours : DEFAULT_RESPONSE_OVERDUE_HOURS;
}

function eligible(review) {
  const rating = review?.overall_rating;
  return review && isPublished(review) && review.review_type === "GUEST_TO_PROPERTY"
    && review.deletedAt == null && review.deleted_at == null
    && id(review.id) && id(review.host_id) && id(review.property_id)
    && typeof rating === "number" && rating >= 1 && rating <= 5 && Number.isInteger(rating * 2);
}

function candidate(type, recipientUserId, propertyId, reviewId, eventTimestamp, identity) {
  return { type, recipientUserId, propertyId, ...(reviewId ? { reviewId } : {}),
    eventKey: JSON.stringify([type, recipientUserId, propertyId, reviewId ?? null, ...identity]),
    eventTimestamp };
}

// publishedAt must be the original publication event time in epoch milliseconds.
// Review.updated_at is mutable (including when flagged) and is not a publication clock.
// A missing previousReview represents the initial publication event or a snapshot replay.
export class ReviewAlertRules {
  static newReview({ review, previousReview, publishedAt } = {}) {
    if (!eligible(review) || !timestamp(publishedAt)
      || (previousReview && isPublished(previousReview))) return null;
    return candidate(ALERT_TYPES.NEW_REVIEW, review.host_id, review.property_id,
      review.id, publishedAt, [publishedAt]);
  }

  static lowRating({ review, publishedAt } = {}) {
    if (!eligible(review) || !timestamp(publishedAt) || review.overall_rating > 2) return null;
    return candidate(ALERT_TYPES.LOW_RATING, review.host_id, review.property_id,
      review.id, publishedAt, [publishedAt]);
  }

  static responseOverdue({ review, responses = [], publishedAt, now, overdueHours } = {}) {
    if (!eligible(review) || !timestamp(publishedAt) || !timestamp(now)
      || !Array.isArray(responses)) return null;
    const deadline = publishedAt + responseOverdueHours(overdueHours) * HOUR_MS;
    if (!timestamp(deadline) || now < deadline) return null;
    const answered = responses.some((response) => response?.reviewId === review.id
      && response.authorRole === "host" && response.status === "published"
      && response.deletedAt == null && timestamp(response.publishedAt) && response.publishedAt <= now);
    return answered ? null : candidate(ALERT_TYPES.RESPONSE_OVERDUE, review.host_id,
      review.property_id, review.id, deadline, [publishedAt, deadline]);
  }

  // Consume the existing getPropertyRatingTrendPage result; its SQL applies the
  // configured decline threshold, minimum sample sizes and review eligibility.
  // Window bounds are those passed to that query, not the time of this evaluation.
  static decliningRating({ trend, recipientUserId, previousStart, currentStart, endExclusive } = {}) {
    if (trend?.trend_status !== "DECLINING" || !id(trend.property_id) || !id(recipientUserId)
      || ![previousStart, currentStart, endExclusive].every(timestamp)
      || previousStart >= currentStart || currentStart >= endExclusive) return null;
    return candidate(ALERT_TYPES.DECLINING_RATING, recipientUserId, trend.property_id,
      undefined, endExclusive, [previousStart, currentStart, endExclusive]);
  }

  static evaluateReview(input) {
    return [this.newReview(input), this.lowRating(input), this.responseOverdue(input)].filter(Boolean);
  }
}
