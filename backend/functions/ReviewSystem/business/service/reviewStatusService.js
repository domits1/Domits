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
  // Normalize a review status value before comparing or validating it.
  // Review: This keeps status checks consistent regardless of casing or extra whitespace.
  normalize(status) {
    return String(status || "").trim().toUpperCase();
  }

  // Validate that a review status is supported by the workflow.
  // Review: This blocks invalid or unknown statuses before they can affect transitions.
  validate(status) {
    const normalizedStatus = this.normalize(status);

    if (!Object.values(REVIEW_STATUSES).includes(normalizedStatus)) {
      throw new BadRequestException("status is not supported.");
    }

    return normalizedStatus;
  }

  // Resolve the starting status for a new review.
  // Review: New reviews can only start as draft or submitted, never in a later lifecycle state.
  resolveInitialStatus(requestedStatus = REVIEW_STATUSES.SUBMITTED) {
    const status = this.validate(requestedStatus);

    if (![REVIEW_STATUSES.DRAFT, REVIEW_STATUSES.SUBMITTED].includes(status)) {
      throw new BadRequestException("New reviews can only be saved as DRAFT or SUBMITTED.");
    }

    return status;
  }

  // Resolve the next review status for a status change request.
  // Review: This enforces the correct transition rules for authors versus moderators.
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
  // Review: This prevents authors from moving reviews beyond the supported editing lifecycle.
  resolveAuthorTransition(currentStatus, requestedStatus) {
    if (!AUTHOR_TRANSITIONS[currentStatus]?.has(requestedStatus)) {
      throw new BadRequestException("Review status transition is not allowed.");
    }

    return requestedStatus;
  }

  // Apply the moderator’s allowed review status transitions.
  // Review: This keeps moderation actions inside the valid status graph for review approval flows.
  resolveModeratorTransition(currentStatus, requestedStatus) {
    if (!MODERATOR_TRANSITIONS[currentStatus]?.has(requestedStatus)) {
      throw new BadRequestException("Review status transition is not allowed.");
    }

    return requestedStatus;
  }

  // Check whether the acting user has moderator permissions.
  // Review: This ensures only trusted moderator roles can trigger moderation transitions.
  isModerator(role) {
    return MODERATOR_ROLES.has(String(role || "").trim().toLowerCase());
  }

  // Check whether the author is allowed to continue editing review content.
  // Review: Only draft and submitted reviews remain editable by their author.
  canAuthorEditContent(status) {
    return [REVIEW_STATUSES.DRAFT, REVIEW_STATUSES.SUBMITTED].includes(this.validate(status));
  }

  // Derive the publication and verification metadata for a review.
  // Review: This creates the status-specific metadata that downstream logic depends on.
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
