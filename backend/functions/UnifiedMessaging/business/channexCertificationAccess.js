const normalizeUserId = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

export const parseChannexCertificationUserIds = (value = process.env.CHANNEX_CERTIFICATION_USER_IDS) =>
  String(value || "")
    .split(/[,\s;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const isChannexCertificationUserAllowed = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return false;

  return parseChannexCertificationUserIds().includes(normalizedUserId);
};
