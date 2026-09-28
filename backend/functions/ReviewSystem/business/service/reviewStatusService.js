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
  // Normalize a status value to the expected review lifecycle format.
  // Review: This ensures all status comparisons use the same uppercase canonical values.
  normalize(status) {
    return String(status || "").trim().toUpperCase();
  }

  // Validate that a status is supported by the review lifecycle.
  // Review: This rejects unsupported values before they are used in workflow logic.
  validate(status) {
    const normalizedStatus = this.normalize(status);

    if (!Object.values(REVIEW_STATUSES).includes(normalizedStatus)) {
      throw new BadRequestException("status is not supported.");
    }

    return normalizedStatus;
  }

  // Resolve the initial status for a newly created review.
  // Review: New reviews may only start in draft or submitted state.
  resolveInitialStatus(requestedStatus = REVIEW_STATUSES.SUBMITTED) {
    const status = this.validate(requestedStatus);

    if (![REVIEW_STATUSES.DRAFT, REVIEW_STATUSES.SUBMITTED].includes(status)) {
      throw new BadRequestException("New reviews can only be saved as DRAFT or SUBMITTED.");
    }

    return status;
  }

  // Resolve the next review status for a status change request.
  // Review: This applies the correct author or moderator transition rules for the actor.
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

  // Apply the allowed author-side transition for the review.
  // Review: Authors can only move a review to a limited set of next statuses.
  resolveAuthorTransition(currentStatus, requestedStatus) {
    if (!AUTHOR_TRANSITIONS[currentStatus]?.has(requestedStatus)) {
      throw new BadRequestException("Review status transition is not allowed.");
    }

    return requestedStatus;
  }

  // Apply the allowed moderator-side transition for the review.
  // Review: Moderators can move a review through verification, publication, or rejection states.
  resolveModeratorTransition(currentStatus, requestedStatus) {
    if (!MODERATOR_TRANSITIONS[currentStatus]?.has(requestedStatus)) {
      throw new BadRequestException("Review status transition is not allowed.");
    }

    return requestedStatus;
  }

  // Check whether the user has a moderator role.
  // Review: This centralizes the role-based permission check used by status transitions.
  isModerator(role) {
    return MODERATOR_ROLES.has(String(role || "").trim().toLowerCase());
  }

  // Decide whether the author can still edit review content.
  // Review: Only draft and submitted reviews remain editable by their author.
  canAuthorEditContent(status) {
    return [REVIEW_STATUSES.DRAFT, REVIEW_STATUSES.SUBMITTED].includes(this.validate(status));
  }

  // Derive the verification and publication state from the current review status.
  // Review: This keeps status-related metadata consistent with the lifecycle rules.
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
