export const DEFAULT_REVIEW_QUEUE_LIMIT = 25;
export const MAX_REVIEW_QUEUE_LIMIT = 50;

export const normalizeReviewQueueLimit = (raw) => {
  const isBlank = raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "");
  const parsed = isBlank ? Number.NaN : Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_REVIEW_QUEUE_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_REVIEW_QUEUE_LIMIT);
};
