export const LISTING_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
  PENDING_REVIEW: "PENDING_REVIEW",
  REJECTED: "REJECTED",
});

const STATUS_LABELS = Object.freeze({
  [LISTING_STATUS.ACTIVE]: "Live",
  [LISTING_STATUS.INACTIVE]: "Drafted",
  [LISTING_STATUS.ARCHIVED]: "Archived",
  [LISTING_STATUS.PENDING_REVIEW]: "Pending review",
  [LISTING_STATUS.REJECTED]: "Rejected",
});

const STATUS_TONES = Object.freeze({
  [LISTING_STATUS.ACTIVE]: "live",
  [LISTING_STATUS.INACTIVE]: "draft",
  [LISTING_STATUS.ARCHIVED]: "archived",
  [LISTING_STATUS.PENDING_REVIEW]: "pending",
  [LISTING_STATUS.REJECTED]: "rejected",
});

// Unknown or missing statuses are treated as drafts, matching how the listings page has always grouped them.
export const normalizeListingStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  return STATUS_LABELS[normalizedStatus] ? normalizedStatus : LISTING_STATUS.INACTIVE;
};

export const getListingStatusLabel = (status) => STATUS_LABELS[normalizeListingStatus(status)];

export const getListingStatusTone = (status) => STATUS_TONES[normalizeListingStatus(status)];

export const getStatusChangeMessage = (status) => {
  switch (normalizeListingStatus(status)) {
    case LISTING_STATUS.PENDING_REVIEW:
      return "Submitted for review.";
    case LISTING_STATUS.ACTIVE:
      return "Listing moved to Live.";
    case LISTING_STATUS.ARCHIVED:
      return "Listing moved to Archived.";
    default:
      return "Listing moved to Draft.";
  }
};

export const isSubmittedForReview = (status) => normalizeListingStatus(status) === LISTING_STATUS.PENDING_REVIEW;
