// main.property.status is free text in the database; these are the values the code writes.
// ACTIVE means approved and public.
export const PROPERTY_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
  PENDING_REVIEW: "PENDING_REVIEW",
  REJECTED: "REJECTED",
});

// What a host may ask for. ACTIVE is a request for review, never a direct write.
export const HOST_REQUESTABLE_STATUSES = Object.freeze([
  PROPERTY_STATUS.ACTIVE,
  PROPERTY_STATUS.INACTIVE,
  PROPERTY_STATUS.ARCHIVED,
]);

// Statuses a host can submit for review from. ACTIVE and PENDING_REVIEW are left out on purpose:
// the conditional update must never touch an approved or already submitted property.
export const SUBMITTABLE_FOR_REVIEW_STATUSES = Object.freeze([
  PROPERTY_STATUS.INACTIVE,
  PROPERTY_STATUS.REJECTED,
  PROPERTY_STATUS.ARCHIVED,
]);

export const normalizePropertyStatus = (value) => String(value ?? "").trim().toUpperCase();
