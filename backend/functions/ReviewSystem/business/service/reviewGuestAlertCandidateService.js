import { GUEST_ALERT_TYPES } from "../model/reviewAlertRules.js";
import { isPublished } from "../model/reviewRules.js";
import { ReviewAlertWorkRepository } from "../../data/reviewAlertWorkRepository.js";

// Read committed outbox events only; client recipient IDs and timestamps are ignored.
export class ReviewGuestAlertCandidateService {
  constructor({ repository = new ReviewAlertWorkRepository() } = {}) { this.repository = repository; }
  async evaluate({ type, reviewId, responseId } = {}) {
    if (!Object.values(GUEST_ALERT_TYPES).includes(type) || typeof reviewId !== "string" || !reviewId.trim()
      || (type === "HOST_RESPONDED" && (typeof responseId !== "string" || !responseId.trim()))) return [];
    const { event, review, response } = await this.repository.guestContext(type, reviewId, responseId);
    if (!review || event?.phase !== "guest" || event.type !== type || event.reviewId !== reviewId
      || event.responseId !== responseId || event.propertyId !== review.property_id
      || event.recipientUserId !== review.reviewer_user_id || review.review_type !== "GUEST_TO_PROPERTY"
      || review.status === "DELETED") return [];
    if (type === "HOST_RESPONDED") {
      if (!isPublished(review) || response?.status !== "published" || response.authorRole !== "host"
        || response.deletedAt != null || response.publishedAt !== event.eventTimestamp) return [];
    } else if (type === "REVIEW_REJECTED" ? review.status !== "REJECTED" || review.publication_status !== "UNPUBLISHED"
      : type === "REVIEW_PUBLISHED" ? !isPublished(review)
        : !(isPublished(review) || (review.status === "APPROVED" && review.publication_status === "UNPUBLISHED"))) return [];
    const { recipientUserId, propertyId, eventKey, eventTimestamp } = event;
    return [{ type, reviewId, recipientUserId, propertyId, eventKey, eventTimestamp }];
  }
}
