// Reads the env on every call so tests and Lambda config changes never see a stale list.
export const parseReviewAdminUserIds = (value = process.env.PROPERTY_REVIEW_ADMIN_USER_IDS) =>
  String(value || "")
    .split(/[,\s;]+/)
    .filter(Boolean);

// Fail closed: a missing or empty allowlist means nobody can review properties.
export const isReviewAdmin = (userId) => {
  if (typeof userId !== "string") {
    return false;
  }

  const normalizedUserId = userId.trim();
  return normalizedUserId !== "" && parseReviewAdminUserIds().includes(normalizedUserId);
};
