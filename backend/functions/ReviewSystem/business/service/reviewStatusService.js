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

const MODERATOR_ROLES = new Set(["admin", "moderator", "review_moderator", "review moderator"]);

// Review: Enforces author and moderator transitions across the review lifecycle.
class ReviewStatusService {
  // Trims and uppercases a status value for consistent comparisons.
  // Returns an empty string when no status is provided.
  normalize(status) {
    return String(status || "").trim().toUpperCase();
  }

  // Normalizes a value and checks it against supported review statuses.
  // Returns the normalized status or rejects unsupported values.
  validate(status) {
    const normalizedStatus = this.normalize(status);

    if (!Object.values(REVIEW_STATUSES).includes(normalizedStatus)) {
      throw new BadRequestException("status is not supported.");
    }

    return normalizedStatus;
  }

  // Resolves and validates the initial status requested by an author.
  // New reviews may start only as drafts or submitted reviews.
  resolveInitialStatus(requestedStatus = REVIEW_STATUSES.SUBMITTED) {
    const status = this.validate(requestedStatus);

    if (![REVIEW_STATUSES.DRAFT, REVIEW_STATUSES.SUBMITTED].includes(status)) {
      throw new BadRequestException("New reviews can only be saved as DRAFT or SUBMITTED.");
    }

    return status;
  }

  // Validates both states and identifies the actor's transition rules.
  // Delegates the change to author or moderator policy based on identity and role.
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

  // Checks a requested status change against author transition rules.
  // Rejects any transition not explicitly allowed for the current state.
  resolveAuthorTransition(currentStatus, requestedStatus) {
    if (!AUTHOR_TRANSITIONS[currentStatus]?.has(requestedStatus)) {
      throw new BadRequestException("Review status transition is not allowed.");
    }

    return requestedStatus;
  }

  // Checks a requested status change against moderator transition rules.
  // Rejects any transition not explicitly allowed for the current state.
  resolveModeratorTransition(currentStatus, requestedStatus) {
    if (!MODERATOR_TRANSITIONS[currentStatus]?.has(requestedStatus)) {
      throw new BadRequestException("Review status transition is not allowed.");
    }

    return requestedStatus;
  }

  // Checks whether a role belongs to the supported moderator roles.
  // Normalizes casing and whitespace before matching.
  isModerator(role) {
    return MODERATOR_ROLES.has(String(role || "").trim().toLowerCase());
  }

  // Checks whether the review is still in an author-editable state.
  // Validates the status before comparing it to the editable states.
  canAuthorEditContent(status) {
    return [REVIEW_STATUSES.DRAFT, REVIEW_STATUSES.SUBMITTED].includes(this.validate(status));
  }

  // Maps a workflow status to its publication and verification states.
  // Keeps derived state consistent with the review lifecycle.
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
