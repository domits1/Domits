import BadRequestException from "../../util/exception/badRequestException.js";
import ForbiddenException from "../../util/exception/forbiddenException.js";
import {
  REVIEW_PUBLICATION_STATUSES,
  REVIEW_STATUSES,
  REVIEW_VERIFICATION_STATUSES,
} from "./reviewStatus.js";

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

const MODERATOR_ROLES = new Set(["admin", "moderator", "review_moderator", "review moderator"]);

// Review: Enforces author and moderator transitions across the review lifecycle.
class ReviewStatusService {
  // Review: Keep status comparisons consistent even when callers use mixed casing.
  normalize(status) {
    return String(status || "").trim().toUpperCase();
  }

  // Review: Reject statuses that are not part of the review workflow.
  validate(status) {
    const normalizedStatus = this.normalize(status);

    if (!Object.values(REVIEW_STATUSES).includes(normalizedStatus)) {
      throw new BadRequestException("status is not supported.");
    }

    return normalizedStatus;
  }

  // Review: Limit newly created reviews to the two states an author can choose.
  resolveInitialStatus(requestedStatus = REVIEW_STATUSES.SUBMITTED) {
    const status = this.validate(requestedStatus);

    if (![REVIEW_STATUSES.DRAFT, REVIEW_STATUSES.SUBMITTED].includes(status)) {
      throw new BadRequestException("New reviews can only be saved as DRAFT or SUBMITTED.");
    }

    return status;
  }

  // Review: Route a status change through the author or moderator rules.
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

  // Review: Apply the narrower transitions available to the review author.
  resolveAuthorTransition(currentStatus, requestedStatus) {
    if (!AUTHOR_TRANSITIONS[currentStatus]?.has(requestedStatus)) {
      throw new BadRequestException("Review status transition is not allowed.");
    }

    return requestedStatus;
  }

  // Review: Apply the broader transitions available to moderators.
  resolveModeratorTransition(currentStatus, requestedStatus) {
    if (!MODERATOR_TRANSITIONS[currentStatus]?.has(requestedStatus)) {
      throw new BadRequestException("Review status transition is not allowed.");
    }

    return requestedStatus;
  }

  // Review: Identify roles that are allowed to moderate reviews.
  isModerator(role) {
    return MODERATOR_ROLES.has(String(role || "").trim().toLowerCase());
  }

  // Review: Tell callers whether the author may still edit review content.
  canAuthorEditContent(status) {
    return [REVIEW_STATUSES.DRAFT, REVIEW_STATUSES.SUBMITTED].includes(this.validate(status));
  }

  // Review: Derive publication and verification states from the workflow status.
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
