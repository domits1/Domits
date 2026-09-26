// Review: Shared lifecycle values keep service, repository, and API status handling consistent.
export const REVIEW_STATUSES = Object.freeze({
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  VERIFIED: "VERIFIED",
  PENDING_MODERATION: "PENDING_MODERATION",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
});

export const REVIEW_PUBLICATION_STATUSES = Object.freeze({
  UNPUBLISHED: "UNPUBLISHED",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
});

export const REVIEW_VERIFICATION_STATUSES = Object.freeze({
  UNVERIFIED: "UNVERIFIED",
  VERIFIED_STAY: "VERIFIED_STAY",
});
