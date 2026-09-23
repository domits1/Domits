const EDITABLE_REVIEW_STATUSES = new Set(["DRAFT", "SUBMITTED"]);
const REVIEW_EDIT_WINDOW_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Review: Guest content remains editable only in draft or submitted workflow states.
export const isEditableReviewStatus = (status) => {
  return EDITABLE_REVIEW_STATUSES.has(String(status || "").trim().toUpperCase());
};

export const isWithinReviewEditWindow = (review) => {
  const timestamp = Number(review?.createdAt || review?.updatedAt || 0);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return false;
  }

  return Date.now() - timestamp <= REVIEW_EDIT_WINDOW_DAYS * DAY_IN_MS;
};

export const canEditReview = (review) => {
  // Review: Combines lifecycle and time-window rules used by the history and form screens.
  return isEditableReviewStatus(review?.status) && isWithinReviewEditWindow(review);
};
