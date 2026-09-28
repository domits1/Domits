// Review lifecycle values track creation, verification, moderation, and publication progress.
// Shared constants keep status handling consistent across services and API layers.
export const REVIEW_STATUSES = Object.freeze({
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  VERIFIED: "VERIFIED",
  PENDING_MODERATION: "PENDING_MODERATION",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
});

// Publication values control whether a review is visible to the public.
// They remain separate from the review's workflow and verification status.
export const REVIEW_PUBLICATION_STATUSES = Object.freeze({
  UNPUBLISHED: "UNPUBLISHED",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
});

// Verification values describe whether a review is tied to a completed stay.
// They are used independently from moderation and publication decisions.
export const REVIEW_VERIFICATION_STATUSES = Object.freeze({
  UNVERIFIED: "UNVERIFIED",
  VERIFIED_STAY: "VERIFIED_STAY",
});
