import BadRequestException from "../../util/exception/badRequestException.js";
import ForbiddenException from "../../util/exception/forbiddenException.js";
import {
  REVIEW_PUBLICATION_STATUSES,
  REVIEW_STATUSES,
  REVIEW_VERIFICATION_STATUSES,
} from "../model/reviewStatus.js";

const AUTHOR_TRANSITIONS = Object.freeze({
  [REVIEW_STATUSES.DRAFT]: new Set([REVIEW_STATUSES.DRAFT, REVIEW_STATUSES.SUBMITTED]),
  [REVIEW_STATUSES.SUBMITTED]: new Set([REVIEW_STATUSES.DRAFT]),
});

const MODERATOR_TRANSITIONS = Object.freeze({
  [REVIEW_STATUSES.SUBMITTED]: new Set([
    REVIEW_STATUSES.VERIFIED,
    REVIEW_STATUSES.PENDING_MODERATION,
    REVIEW_STATUSES.REJECTED,
  ]),
  [REVIEW_STATUSES.VERIFIED]: new Set([
    REVIEW_STATUSES.PENDING_MODERATION,
    REVIEW_STATUSES.PUBLISHED,
    REVIEW_STATUSES.REJECTED,
  ]),
  [REVIEW_STATUSES.PENDING_MODERATION]: new Set([REVIEW_STATUSES.PUBLISHED, REVIEW_STATUSES.REJECTED]),
  [REVIEW_STATUSES.PUBLISHED]: new Set([REVIEW_STATUSES.REJECTED]),
  [REVIEW_STATUSES.REJECTED]: new Set([REVIEW_STATUSES.PENDING_MODERATION]),
});

const MODERATOR_ROLES = new Set(["admin", "moderator", "review_moderator"]);

// Review: Validates lifecycle transitions and derives publication and verification states.
class ReviewStatusService {
  // Normalize a status value before validation or comparison.
  // Review: This keeps all review status checks consistent regardless of incoming casing or whitespace.
  normalize(status) {
    return String(status || "").trim().toUpperCase();
  }

  // Validate that a provided status is supported by the review system.
  // Review: This rejects unsupported values before they can affect workflow or lifecycle logic.
  validate(status) {
    const normalizedStatus = this.normalize(status);

    if (!Object.values(REVIEW_STATUSES).includes(normalizedStatus)) {
      throw new BadRequestException("status is not supported.");
    }

    return normalizedStatus;
  }

  // Resolve the starting status for a newly created review.
  // Review: This allows only draft or submitted values when a review is first created.
  resolveInitialStatus(requestedStatus = REVIEW_STATUSES.SUBMITTED) {
    const status = this.validate(requestedStatus);

    if (![REVIEW_STATUSES.DRAFT, REVIEW_STATUSES.SUBMITTED].includes(status)) {
      throw new BadRequestException("New reviews can only be saved as DRAFT or SUBMITTED.");
    }

    return status;
  }

  // Resolve the next status based on who is updating the review.
  // Review: This enforces author vs. moderator transition rules before changing workflow state.
  resolveUpdateStatus({ currentStatus, requestedStatus, actorUserId, authorUserId, actorRole }) {
    const current = this.validate(currentStatus);
    const requested = this.validate(requestedStatus);

    if (actorUserId === authorUserId) {
      return this.resolveAuthorTransition(current, requested);
    }

    if (this.isModerator(actorRole)) {
      return this.resolveModeratorTransition(current, requested);
    }

    throw new ForbiddenException("You are not allowed to change this review status.");
  }

  // Apply the author’s allowed review status transitions.
  // Review: Authors can only move a review back to draft or keep it submitted while editing.
  resolveAuthorTransition(currentStatus, requestedStatus) {
    if (!AUTHOR_TRANSITIONS[currentStatus]?.has(requestedStatus)) {
      throw new BadRequestException("Review status transition is not allowed.");
    }

    return requestedStatus;
  }

  // Apply the moderator’s allowed review status transitions.
  // Review: Moderators may approve, reject, or move reviews through verification and publication states.
  resolveModeratorTransition(currentStatus, requestedStatus) {
    if (!MODERATOR_TRANSITIONS[currentStatus]?.has(requestedStatus)) {
      throw new BadRequestException("Review status transition is not allowed.");
    }

    return requestedStatus;
  }

  // Detect whether the acting user has moderator privileges.
  // Review: This ensures only assigned admin or moderator roles can trigger moderation transitions.
  isModerator(role) {
    return MODERATOR_ROLES.has(String(role || "").trim().toLowerCase());
  }

  // Check whether the author is allowed to edit review content.
  // Review: Drafts and submitted reviews are editable, but published or rejected states are not.
  canAuthorEditContent(status) {
    return [REVIEW_STATUSES.DRAFT, REVIEW_STATUSES.SUBMITTED].includes(this.validate(status));
  }

  // Derive publication and verification metadata from the current review status.
  // Review: This makes status-specific behavior consistent across the review lifecycle.
  getDerivedStatuses(status) {
    const normalizedStatus = this.validate(status);
    let publicationStatus = REVIEW_PUBLICATION_STATUSES.UNPUBLISHED;

    if (normalizedStatus === REVIEW_STATUSES.PUBLISHED) {
      publicationStatus = REVIEW_PUBLICATION_STATUSES.PUBLISHED;
    } else if (normalizedStatus === REVIEW_STATUSES.REJECTED) {
      publicationStatus = REVIEW_PUBLICATION_STATUSES.REJECTED;
    }

    return {
      verificationStatus: [
        REVIEW_STATUSES.VERIFIED,
        REVIEW_STATUSES.PENDING_MODERATION,
        REVIEW_STATUSES.PUBLISHED,
      ].includes(normalizedStatus)
        ? REVIEW_VERIFICATION_STATUSES.VERIFIED_STAY
        : REVIEW_VERIFICATION_STATUSES.UNVERIFIED,
      publicationStatus,
    };
  }
}

export default ReviewStatusService;
