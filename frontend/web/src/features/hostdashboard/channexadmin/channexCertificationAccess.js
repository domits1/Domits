export const CHANNEX_CERTIFICATION_ADMIN_ROUTE = "admin/channex-certification";

const getAllowedChannexCertificationUserIds = () =>
  String(process.env.REACT_APP_CHANNEX_CERTIFICATION_USER_IDS || "")
    .split(/[,\s;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const isChannexCertificationUser = (userId) =>
  Boolean(userId) && getAllowedChannexCertificationUserIds().includes(String(userId).trim());
